


import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { generateOnboardingPlan } from "@/lib/openai-onboarding";

async function triggerN8nOnboarding(payload: {
  orderId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  businessName: string | null;
  businessGoal: string | null;
  packageName: string;
  addOnNames: string | null;
  amount: string;
  amountInCents: number;
  notes: string | null;
  aiOnboardingPlan: string;
}) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;

  if (!webhookUrl) {
    return {
      success: false,
      onboardingPlan: null as string | null,
      errorMessage: "N8N_WEBHOOK_URL is not configured",
    };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return {
        success: false,
        onboardingPlan: null as string | null,
        errorMessage: `n8n webhook returned ${response.status}: ${errorText || response.statusText}`,
      };
    }

    let responseData: Record<string, unknown> | null = null;
    try {
      responseData = (await response.json()) as Record<string, unknown>;
    } catch {
      responseData = null;
    }

    const returnedPlan =
      responseData && typeof responseData.onboardingPlan === "string"
        ? responseData.onboardingPlan
        : null;

    return {
      success: true,
      onboardingPlan: returnedPlan,
      errorMessage: null as string | null,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to reach n8n webhook";
    return {
      success: false,
      onboardingPlan: null as string | null,
      errorMessage: message,
    };
  }
}

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
    const message =
      err instanceof Error ? err.message : "Invalid webhook signature";
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

    const amountFormatted = (existingOrder.amountInCents / 100).toFixed(2);
    const amountUsd = `$${amountFormatted}`;

    const aiPlan = await generateOnboardingPlan({
      clientName: existingOrder.clientName,
      businessName: existingOrder.businessName,
      businessGoal: existingOrder.businessGoal,
      packageName: existingOrder.package.name,
      addOnNames: existingOrder.addOnNames,
      amountFormatted: amountUsd,
    });

    const n8nResult = await triggerN8nOnboarding({
      orderId: existingOrder.id,
      clientName: existingOrder.clientName,
      clientEmail: existingOrder.clientEmail,
      clientPhone: existingOrder.clientPhone,
      businessName: existingOrder.businessName,
      businessGoal: existingOrder.businessGoal,
      packageName: existingOrder.package.name,
      addOnNames: existingOrder.addOnNames,
      amount: amountFormatted,
      amountInCents: existingOrder.amountInCents,
      notes: existingOrder.businessGoal,
      aiOnboardingPlan: aiPlan.clientPlan,
    });

    const finalOnboardingPlan = n8nResult.onboardingPlan || aiPlan.clientPlan;

    await prisma.clientOrder.update({
      where: { id: existingOrder.id },
      data: {
        paymentStatus: "PAID",
        stripeSessionId: session.id,
        stripePaymentId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : null,
        aiOnboardingPlan: finalOnboardingPlan,
        aiInternalSteps: aiPlan.internalSteps,
        ghlSyncStatus: n8nResult.success ? "SYNCED" : "FAILED",
        ghlErrorMessage: n8nResult.errorMessage,
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
          n8nSynced: n8nResult.success,
        }),
      },
    });

    return NextResponse.json({
      received: true,
      orderId: existingOrder.id,
      n8nSynced: n8nResult.success,
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