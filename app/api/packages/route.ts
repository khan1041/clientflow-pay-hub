

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_PACKAGES = [
  {
    slug: "starter-automation",
    name: "Starter Automation",
    description: "Automated lead capture + instant AI follow-up",
    priceInCents: 49900,
    billingType: "ONE_TIME",
    ghlTag: "pkg-starter-automation",
    isPopular: false,
  },
  {
    slug: "growth-pipeline",
    name: "Growth Pipeline",
    description: "Multi-channel AI booking, CRM sync & SLA alerts",
    priceInCents: 99900,
    billingType: "ONE_TIME",
    ghlTag: "pkg-growth-pipeline",
    isPopular: true,
  },
];

const PACKAGE_FEATURES: Record<string, string[]> = {
  "starter-automation": [
    "Webhook & CRM lead intake",
    "AI qualification & instant reply",
    "Email/SMS notification routing",
  ],
  "growth-pipeline": [
    "Everything in Starter Automation",
    "GoHighLevel / CRM stage automation",
    "Custom onboarding roadmap & webhook logs",
  ],
};

export async function GET() {
  try {
    let rows = await prisma.servicePackage.findMany({
      orderBy: { priceInCents: "asc" },
    });

    if (rows.length === 0) {
      await prisma.servicePackage.createMany({
        data: DEFAULT_PACKAGES,
        skipDuplicates: true,
      });

      rows = await prisma.servicePackage.findMany({
        orderBy: { priceInCents: "asc" },
      });
    }

    const packages = rows.map((pkg, index) => ({
      ...pkg,
      tagline: pkg.description,
      priceCents: pkg.priceInCents,
      billingInterval: pkg.billingType.toLowerCase(),
      features: PACKAGE_FEATURES[pkg.slug] ?? [pkg.description],
      isFeatured: pkg.isPopular,
      sortOrder: index + 1,
    }));

    return NextResponse.json({ packages }, { status: 200 });
  } catch (error) {
    console.error("GET /api/packages error:", error);
    return NextResponse.json(
      {
        error: "Failed to load packages",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}