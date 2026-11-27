


"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface PackageItem {
  id: string;
  name: string;
  slug?: string;
  description?: string | null;
  price?: number | string;
  priceInCents?: number;
  billingType?: string | null;
  interval?: string | null;
}

interface AddonItem {
  id: string;
  name: string;
  description?: string | null;
  price: number | string;
}

const FALLBACK_PACKAGES: PackageItem[] = [
  {
    id: "monthly-automation-retainer",
    slug: "monthly-automation-retainer",
    name: "Monthly AI & CRM Optimization Retainer",
    description:
      "Ongoing workflow monitoring, prompt tuning, webhook reliability checks, and priority CRM support.",
    price: 399,
    billingType: "SUBSCRIPTION",
  },
  {
    id: "ai-lead-engine-starter",
    slug: "ai-lead-engine-starter",
    name: "AI Lead Capture & CRM Starter",
    description:
      "Automated lead intake, instant AI qualification, and GoHighLevel pipeline routing for growing teams.",
    price: 499,
    billingType: "ONE_TIME",
  },
  {
    id: "clientflow-growth-system",
    slug: "clientflow-growth-system",
    name: "ClientFlow Growth & Onboarding System",
    description:
      "Full payment-to-onboarding automation with Stripe webhooks, AI roadmap generation, and GHL workflow triggers.",
    price: 999,
    billingType: "ONE_TIME",
  },
];

const FALLBACK_ADDONS: AddonItem[] = [
  {
    id: "addon-voice",
    name: "AI Voice Lead Qualifier",
    price: 199,
  },
  {
    id: "addon-snapshot",
    name: "Custom GHL Pipeline Snapshot",
    price: 149,
  },
  {
    id: "addon-webhook",
    name: "Webhook Stress Test & SLA Setup",
    price: 99,
  },
];

function getPackagePrice(pkg?: PackageItem): number {
  if (!pkg) return 0;
  if (typeof pkg.priceInCents === "number" && Number.isFinite(pkg.priceInCents)) {
    return pkg.priceInCents / 100;
  }
  if (typeof pkg.price === "number") {
    return Number.isFinite(pkg.price) ? pkg.price : 0;
  }
  if (typeof pkg.price === "string") {
    const parsed = parseFloat(pkg.price);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toNumber(val: number | string | undefined | null): number {
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;
  if (typeof val === "string") {
    const parsed = parseFloat(val);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export default function CheckoutPage() {
  const [packages, setPackages] = useState<PackageItem[]>(FALLBACK_PACKAGES);
  const [addons] = useState<AddonItem[]>(FALLBACK_ADDONS);
  const [selectedPackageId, setSelectedPackageId] = useState<string>(
    FALLBACK_PACKAGES[0].id
  );
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [goal, setGoal] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadPackages() {
      try {
        const res = await fetch("/api/packages");
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.packages;

        if (!active || !Array.isArray(list) || list.length === 0) return;

        setPackages(list);
        setSelectedPackageId((prev) =>
          list.some((p: PackageItem) => p.id === prev || p.slug === prev)
            ? prev
            : list[0].id
        );
      } catch {
        // Keep fallback packages if API fails
      }
    }

    loadPackages();

    return () => {
      active = false;
    };
  }, []);

  function toggleAddon(id: string) {
    setSelectedAddonIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function handleApplyPromo(e: React.FormEvent) {
    e.preventDefault();
    const code = promoCode.trim().toUpperCase();

    if (!code) {
      setAppliedPromo(null);
      setPromoMessage("Enter a promo code to apply.");
      return;
    }

    if (code === "CLIENT10") {
      setAppliedPromo(code);
      setPromoMessage("10% discount applied.");
    } else {
      setAppliedPromo(null);
      setPromoMessage("Invalid promo code.");
    }
  }

  const selectedPackage =
    packages.find(
      (p) => p.id === selectedPackageId || p.slug === selectedPackageId
    ) || packages[0];

  const packagePrice = getPackagePrice(selectedPackage);
  const addonsTotal = addons
    .filter((a) => selectedAddonIds.includes(a.id))
    .reduce((sum, a) => sum + toNumber(a.price), 0);

  const subtotal = packagePrice + addonsTotal;
  const discountAmount = appliedPromo === "CLIENT10" ? subtotal * 0.1 : 0;
  const totalDue = Math.max(0, subtotal - discountAmount);

  const isMonthly =
    selectedPackage?.billingType?.toUpperCase() === "SUBSCRIPTION" ||
    selectedPackage?.billingType?.toLowerCase() === "monthly" ||
    selectedPackage?.interval?.toLowerCase() === "month";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim() || !email.trim()) {
      setErrorMessage("Full name and work email are required.");
      return;
    }

    const packageIdentifier = selectedPackage?.slug || selectedPackage?.id;
    if (!packageIdentifier) {
      setErrorMessage("Please select a service package.");
      return;
    }

    const selectedAddonObjects = addons.filter((a) =>
      selectedAddonIds.includes(a.id)
    );

    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: packageIdentifier,
          packageName: selectedPackage.name,
          addOnNames: selectedAddonObjects.map((a) => a.name),
          addOnTotalCents: Math.round(addonsTotal * 100),
          discountPercent: appliedPromo === "CLIENT10" ? 10 : 0,
          clientName: fullName.trim(),
          clientEmail: email.trim(),
          clientPhone: phone.trim(),
          businessName: businessName.trim(),
          businessGoal: goal.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data?.error || "Could not start checkout session.");
        setSubmitting(false);
        return;
      }

      const redirectUrl = data?.checkoutUrl || data?.url;

      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }

      setErrorMessage(
        "Checkout session created, but no redirect URL was returned."
      );
    } catch {
      setErrorMessage("Network error while creating checkout session.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-neutral-100">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-950">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3.5">
            <Link
              href="/"
              className="rounded border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white"
            >
              ← Home
            </Link>
            <div>
              <h1 className="text-base font-semibold text-white">
                Client Checkout
              </h1>
              <p className="text-xs text-neutral-400">
                Package selection and onboarding details
              </p>
            </div>
          </div>

          <Link
            href="/admin"
            className="rounded border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white"
          >
            Admin
          </Link>
        </div>
      </header>

      {/* Main Layout */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-8 lg:grid-cols-12"
        >
          {/* Left Column: Packages, Add-ons & Promo */}
          <div className="space-y-8 lg:col-span-7">
            {/* 1. Packages */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-white">
                1. Select Package
              </h2>

              <div className="space-y-2.5">
                {packages.map((pkg) => {
                  const active = pkg.id === selectedPackage?.id;
                  const price = getPackagePrice(pkg);
                  const monthly =
                    pkg.billingType?.toUpperCase() === "SUBSCRIPTION" ||
                    pkg.billingType?.toLowerCase() === "monthly" ||
                    pkg.interval?.toLowerCase() === "month";

                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => setSelectedPackageId(pkg.id)}
                      className={`w-full rounded-lg border p-4 text-left transition-colors ${
                        active
                          ? "border-emerald-600/80 bg-neutral-900"
                          : "border-neutral-800 bg-neutral-950 hover:border-neutral-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-white">
                            {pkg.name}
                          </div>
                          {pkg.description && (
                            <p className="mt-1 text-xs leading-relaxed text-neutral-400">
                              {pkg.description}
                            </p>
                          )}
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="text-sm font-semibold text-emerald-400">
                            ${price.toFixed(2)}
                          </div>
                          <div className="text-[11px] text-neutral-500">
                            {monthly ? "/ month" : "one-time"}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 2. Optional Add-ons */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-white">
                2. Optional Add-ons
              </h2>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {addons.map((addon) => {
                  const checked = selectedAddonIds.includes(addon.id);
                  const price = toNumber(addon.price);

                  return (
                    <button
                      key={addon.id}
                      type="button"
                      onClick={() => toggleAddon(addon.id)}
                      className={`flex flex-col justify-between rounded-lg border p-3.5 text-left transition-colors ${
                        checked
                          ? "border-emerald-600/80 bg-neutral-900"
                          : "border-neutral-800 bg-neutral-950 hover:border-neutral-700"
                      }`}
                    >
                      <div className="text-xs font-medium leading-snug text-white">
                        {addon.name}
                      </div>
                      <div className="mt-2.5 text-xs font-semibold text-emerald-400">
                        +${price.toFixed(2)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Promo Code */}
            <section className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
              <label
                htmlFor="promo-code"
                className="block text-xs font-medium text-neutral-300"
              >
                Promo Code
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="promo-code"
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Enter code (e.g. CLIENT10)"
                  className="w-full rounded border border-neutral-800 bg-black px-3 py-2 text-sm text-white placeholder-neutral-600 focus:border-neutral-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  className="shrink-0 rounded border border-neutral-700 bg-neutral-900 px-4 py-2 text-xs font-medium text-neutral-200 hover:bg-neutral-800"
                >
                  Apply
                </button>
              </div>
              {promoMessage && (
                <p
                  className={`mt-2 text-xs ${
                    appliedPromo ? "text-emerald-400" : "text-neutral-400"
                  }`}
                >
                  {promoMessage}
                </p>
              )}
            </section>
          </div>

          {/* Right Column: Client Intake & Order Summary */}
          <div className="lg:col-span-5">
            <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6">
              <h2 className="text-base font-semibold text-white">
                3. Client Details
              </h2>

              <div className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="full-name"
                    className="block text-xs font-medium text-neutral-300"
                  >
                    Full Name
                  </label>
                  <input
                    id="full-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your name"
                    className="mt-1.5 w-full rounded border border-neutral-800 bg-black px-3 py-2 text-sm text-white placeholder-neutral-600 focus:border-neutral-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="work-email"
                    className="block text-xs font-medium text-neutral-300"
                  >
                    Work Email
                  </label>
                  <input
                    id="work-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="mt-1.5 w-full rounded border border-neutral-800 bg-black px-3 py-2 text-sm text-white placeholder-neutral-600 focus:border-neutral-600 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-xs font-medium text-neutral-300"
                    >
                      Phone
                    </label>
                    <input
                      id="phone"
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Phone number"
                      className="mt-1.5 w-full rounded border border-neutral-800 bg-black px-3 py-2 text-sm text-white placeholder-neutral-600 focus:border-neutral-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="business-name"
                      className="block text-xs font-medium text-neutral-300"
                    >
                      Business Name
                    </label>
                    <input
                      id="business-name"
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Company or agency"
                      className="mt-1.5 w-full rounded border border-neutral-800 bg-black px-3 py-2 text-sm text-white placeholder-neutral-600 focus:border-neutral-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="automation-goal"
                    className="block text-xs font-medium text-neutral-300"
                  >
                    Onboarding / Automation Notes
                  </label>
                  <textarea
                    id="automation-goal"
                    rows={3}
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="Describe your workflow or CRM setup requirements..."
                    className="mt-1.5 w-full rounded border border-neutral-800 bg-black px-3 py-2 text-sm text-white placeholder-neutral-600 focus:border-neutral-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Totals */}
              <div className="mt-6 space-y-2 border-t border-neutral-800 pt-4 text-sm">
                <div className="flex items-center justify-between text-neutral-400">
                  <span>Selected Plan</span>
                  <span className="text-neutral-200">
                    ${packagePrice.toFixed(2)}
                    {isMonthly ? "/mo" : ""}
                  </span>
                </div>

                {addonsTotal > 0 && (
                  <div className="flex items-center justify-between text-neutral-400">
                    <span>Add-ons</span>
                    <span className="text-neutral-200">
                      +${addonsTotal.toFixed(2)}
                    </span>
                  </div>
                )}

                {discountAmount > 0 && (
                  <div className="flex items-center justify-between text-emerald-400">
                    <span>Discount ({appliedPromo})</span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-neutral-800 pt-3 text-base font-semibold text-white">
                  <span>Total Due</span>
                  <span className="text-emerald-400">
                    ${totalDue.toFixed(2)}
                  </span>
                </div>
              </div>

              {errorMessage && (
                <div className="mt-4 rounded border border-red-900/70 bg-red-950/40 px-3 py-2 text-xs text-red-300">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-6 w-full rounded bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting
                  ? "Redirecting to Stripe..."
                  : `Proceed to Checkout ($${totalDue.toFixed(2)})`}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
