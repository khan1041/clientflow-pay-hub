
import { prisma } from "./prisma";

const DEFAULT_PACKAGES = [
  {
    slug: "ai-lead-engine-starter",
    name: "AI Lead Capture & CRM Starter",
    description:
      "Automated lead intake, instant AI qualification, and GoHighLevel pipeline routing for growing teams.",
    priceInCents: 49900,
    billingType: "ONE_TIME",
    ghlTag: "clientflow-starter-paid",
    isPopular: false,
  },
  {
    slug: "clientflow-growth-system",
    name: "ClientFlow Growth & Onboarding System",
    description:
      "Full payment-to-onboarding automation with Stripe webhooks, AI roadmap generation, and GHL workflow triggers.",
    priceInCents: 99900,
    billingType: "ONE_TIME",
    ghlTag: "clientflow-growth-paid",
    isPopular: true,
  },
  {
    slug: "monthly-automation-retainer",
    name: "Monthly AI & CRM Optimization Retainer",
    description:
      "Ongoing workflow monitoring, prompt tuning, webhook reliability checks, and priority CRM support.",
    priceInCents: 39900,
    billingType: "SUBSCRIPTION",
    ghlTag: "clientflow-retainer-active",
    isPopular: false,
  },
];

export async function ensureDefaultPackages() {
  for (const pkg of DEFAULT_PACKAGES) {
    await prisma.servicePackage.upsert({
      where: { slug: pkg.slug },
      update: {},
      create: pkg,
    });
  }

  return prisma.servicePackage.findMany({
    orderBy: { priceInCents: "asc" },
  });
}
