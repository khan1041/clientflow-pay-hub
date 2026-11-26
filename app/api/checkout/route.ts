


import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { ensureDefaultPackages } from "@/lib/seed-packages";

interface CheckoutRequestBody {
  packageId: string;
  packageName?: string;
  addOnNames?: string[];
  addOnTotalCents?: number;
  discountPercent?: number;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  businessName?: string;
  businessGoal?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CheckoutRequestBody;

    if (!body.packageId || !body.clientName || !body.clientEmail) {
      return NextResponse.json(
        { error: "packageId, clientName, and clientEmail are required." },
        { status: 400 }
      );
    }

    const packages = await ensureDefaultPackages();
    const normalizedId = body.packageId.trim().toLowerCase();
    const normalizedName = body.packageName?.trim().toLowerCase();

    const selectedPkg =
      packages.find((p) => p.id.toLowerCase() === normalizedId) ||
      packages.find((p) => p.slug?.toLowerCase() === normalizedId) ||
      (normalizedName
        ? packages.find((p) => p.name.toLowerCase() === normalizedName)
        : undefined) ||
      packages.find((p) =>
        p.name.toLowerCase().includes(normalizedId.replace(/^pkg-/, ""))
      );

    if (!selectedPkg) {
      return NextResponse.json(
        { error: "Service package not found." },
        { status: 404 }
      );
    }

    const addOns = Array.isArray(body.addOnNames) ? body.addOnNames : [];
    const addOnCents = Math.max(0, Number(body.addOnTotalCents || 0));
    const discountPct = Math.min(
      50,
      Math.max(0, Number(body.discountPercent || 0))
    );

    const subtotalCents = selectedPkg.priceInCents + addOnCents;
    const discountCents = Math.round((subtotalCents * discountPct) / 100);
    const finalAmountCents = Math.max(100, subtotalCents - discountCents);

    const order = await prisma.clientOrder.create({
      data: {
        clientName: body.clientName.trim(),
        clientEmail: body.clientEmail.trim().toLowerCase(),
        clientPhone: body.clientPhone?.trim() || null,
        businessName: body.businessName?.trim() || null,
        businessGoal: body.businessGoal?.trim() || null,
        packageId: selectedPkg.id,
        addOnNames: addOns,
        amountInCents: finalAmountCents,
        discountInCents: discountCents,
        currency: "usd",
        paymentStatus: "PENDING",
        ghlSyncStatus: "PENDING",
      },
    });

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      req.nextUrl.origin ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

    if (!stripe) {
      return NextResponse.json({
        orderId: order.id,
        checkoutUrl: `${appUrl}/?orderId=${order.id}&mockCheckout=true`,
        mode: "mock",
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode:
        selectedPkg.billingType === "SUBSCRIPTION"
          ? "subscription"
          : "payment",
      customer_email: order.clientEmail,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: selectedPkg.name,
              description:
                addOns.length > 0
                  ? `${selectedPkg.description} | Add-ons: ${addOns.join(", ")}`
                  : selectedPkg.description,
            },
            unit_amount: finalAmountCents,
            ...(selectedPkg.billingType === "SUBSCRIPTION"
              ? { recurring: { interval: "month" } }
              : {}),
          },
          quantity: 1,
        },
      ],
      metadata: {
        orderId: order.id,
      },
      success_url: `${appUrl}/?payment=success&orderId=${order.id}`,
      cancel_url: `${appUrl}/?payment=cancelled&orderId=${order.id}`,
    });

    await prisma.clientOrder.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id },
    });

    return NextResponse.json({
      orderId: order.id,
      checkoutUrl: session.url,
      mode: "stripe",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to initiate checkout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}