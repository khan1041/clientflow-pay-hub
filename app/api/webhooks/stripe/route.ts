
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { generateOnboardingPlan } from "@/lib/openai-onboarding";
import { syncOrderToGoHighLevel } from "@/lib/ghl-sync";

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    if (stripe && webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } else {
      event = JSON.parse(rawBody) as Stripe.Event;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid webhook signature";
    await prisma.webhookLog.create({
      data: {
        source: "STRIPE",
        eventType: "signature_verification",
        status: "FAILED",
        errorDetail: message,
      },
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;

    if (!orderId) {
      await prisma.webhookLog.create({
        data: {
          source: "STRIPE",
          eventType: event.type,
          status: "IGNORED",
          payload: JSON.stringify({ sessionId: session.id }),
          errorDetail: "Missing orderId in session metadata",
        },
      });
      return NextResponse.json({ received: true, ignored: true });
    }

    const existingOrder = await prisma.clientOrder.findUnique({
      where: { id: orderId },
      include: { package: true },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const amountUsd = `$${(existingOrder.amountInCents / 100).toFixed(2)}`;

    const aiPlan = await generateOnboardingPlan({
      clientName: existingOrder.clientName,
      businessName: existingOrder.businessName,
      businessGoal: existingOrder.businessGoal,
      packageName: existingOrder.package.name,
      addOnNames: existingOrder.addOnNames,
      amountFormatted: amountUsd,
    });

    const ghlResult = await syncOrderToGoHighLevel({
      orderId: existingOrder.id,
      clientName: existingOrder.clientName,
      clientEmail: existingOrder.clientEmail,
      clientPhone: existingOrder.clientPhone,
      businessName: existingOrder.businessName,
      businessGoal: existingOrder.businessGoal,
      packageName: existingOrder.package.name,
      ghlTag: existingOrder.package.ghlTag,
      amountPaidUsd: amountUsd,
      aiOnboardingPlan: aiPlan.clientPlan,
    });

    await prisma.clientOrder.update({
      where: { id: existingOrder.id },
      data: {
        paymentStatus: "PAID",
        stripeSessionId: session.id,
        stripePaymentId:
          typeof session.payment_intent === "string" ? session.payment_intent : null,
        aiOnboardingPlan: aiPlan.clientPlan,
        aiInternalSteps: aiPlan.internalSteps,
        ghlSyncStatus: ghlResult.success ? "SYNCED" : "FAILED",
        ghlContactId: ghlResult.contactId,
        ghlErrorMessage: ghlResult.errorMessage,
      },
    });

    await prisma.webhookLog.create({
      data: {
        source: "STRIPE",
        eventType: event.type,
        status: "SUCCESS",
        orderId: existingOrder.id,
        payload: JSON.stringify({
          sessionId: session.id,
          aiProvider: aiPlan.providerUsed,
          ghlSynced: ghlResult.success,
        }),
      },
    });

    return NextResponse.json({
      received: true,
      orderId: existingOrder.id,
      ghlSynced: ghlResult.success,
    });
  }

  await prisma.webhookLog.create({
    data: {
      source: "STRIPE",
      eventType: event.type,
      status: "IGNORED",
    },
  });

  return NextResponse.json({ received: true });
}




