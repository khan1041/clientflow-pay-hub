

"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface OrderRecord {
  id: string;
  clientName?: string;
  customerName?: string;
  name?: string;
  clientEmail?: string;
  customerEmail?: string;
  email?: string;
  packageName?: string;
  package?: {
    name?: string | null;
    slug?: string | null;
    ghlTag?: string | null;
    priceInCents?: number | null;
    price?: number | string | null;
  } | null;
  amountInCents?: number | string | null;
  totalCents?: number | string | null;
  amountPaidCents?: number | string | null;
  priceInCents?: number | string | null;
  amount?: number | string | null;
  totalAmount?: number | string | null;
  price?: number | string | null;
  status?: string | null;
  paymentStatus?: string | null;
  ghlSynced?: boolean | null;
  ghlSyncStatus?: string | null;
  onboardingPlan?: string | null;
  aiOnboardingPlan?: string | null;
  createdAt?: string;
}

interface WebhookLogRecord {
  id: string;
  source?: string | null;
  event?: string | null;
  eventType?: string | null;
  status?: string | null;
  orderId?: string | null;
  createdAt?: string;
}

function getClientName(order: OrderRecord): string {
  return (
    order.clientName ||
    order.customerName ||
    order.name ||
    "Unknown Client"
  );
}

function getClientEmail(order: OrderRecord): string {
  return order.clientEmail || order.customerEmail || order.email || "";
}

function getPackageTitle(order: OrderRecord): string {
  return order.package?.name || order.packageName || "Standard Package";
}

function toNumeric(val: unknown): number | null {
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "string" && val.trim() !== "") {
    const parsed = parseFloat(val);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getOrderAmount(order: OrderRecord): number {
  const centsRaw =
    toNumeric(order.amountInCents) ??
    toNumeric(order.totalCents) ??
    toNumeric(order.amountPaidCents) ??
    toNumeric(order.priceInCents);

  if (centsRaw !== null) {
    return centsRaw / 100;
  }

  const dollarRaw =
    toNumeric(order.amount) ??
    toNumeric(order.totalAmount) ??
    toNumeric(order.price);

  if (dollarRaw !== null) {
    return dollarRaw;
  }

  const pkgCents = toNumeric(order.package?.priceInCents);
  if (pkgCents !== null) {
    return pkgCents / 100;
  }

  const pkgDollar = toNumeric(order.package?.price);
  if (pkgDollar !== null) {
    return pkgDollar;
  }

  return 0;
}

function getPaymentStatus(order: OrderRecord): string {
  const rawStatus = (order.status || order.paymentStatus || "PENDING").toUpperCase();
  return rawStatus;
}

function isOrderPaid(order: OrderRecord): boolean {
  const st = getPaymentStatus(order);
  return st === "PAID" || st === "COMPLETED" || st === "SUCCEEDED";
}

function isOrderSynced(order: OrderRecord): boolean {
  if (typeof order.ghlSynced === "boolean") return order.ghlSynced;
  const syncSt = (order.ghlSyncStatus || "").toUpperCase();
  return syncSt === "SYNCED" || syncSt === "SUCCESS" || syncSt === "COMPLETED";
}

function getOnboardingText(order: OrderRecord): string {
  return order.onboardingPlan || order.aiOnboardingPlan || "";
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [logs, setLogs] = useState<WebhookLogRecord[]>([]);
  const [adminEmail, setAdminEmail] = useState("admin@clientflowpay.local");
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const [sessionRes, ordersRes] = await Promise.all([
        fetch("/api/auth/session"),
        fetch("/api/orders"),
      ]);

      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        if (sessionData?.user?.email) {
          setAdminEmail(sessionData.user.email);
        }
      }

      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setOrders(Array.isArray(data) ? data : data.orders || []);
        setLogs(data.webhookLogs || []);
      }
    } catch (error) {
      console.error("Failed to load admin data:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

  const paidOrders = orders.filter((o) => isOrderPaid(o));
  const totalRevenue = paidOrders.reduce((sum, o) => sum + getOrderAmount(o), 0);
  const syncedCount = orders.filter((o) => isOrderSynced(o)).length;

  return (
    <div className="min-h-screen bg-black text-neutral-100">
      {/* Top Bar */}
      <header className="border-b border-neutral-800 bg-neutral-950">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="rounded border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white"
            >
              ← Home
            </Link>
            <div>
              <h1 className="text-base font-semibold text-white">
                Orders & Sync Dashboard
              </h1>
              <p className="text-xs text-neutral-400">
                Logged in as {adminEmail}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/checkout"
              className="rounded border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-800"
            >
              Checkout
            </Link>
            <button
              onClick={loadDashboardData}
              className="rounded border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-800"
            >
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="rounded border border-red-900/60 bg-red-950/40 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-950/70"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        {/* Summary Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-5">
            <p className="text-xs font-medium text-neutral-400">Paid Revenue</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              ${totalRevenue.toFixed(2)}
            </p>
          </div>

          <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-5">
            <p className="text-xs font-medium text-neutral-400">Total Orders</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {orders.length}
            </p>
          </div>

          <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-5">
            <p className="text-xs font-medium text-neutral-400">GHL CRM Synced</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {syncedCount} / {orders.length}
            </p>
          </div>
        </section>

        {/* Client Orders Table */}
        <section className="rounded-lg border border-neutral-800 bg-neutral-950">
          <div className="border-b border-neutral-800 px-5 py-4">
            <h2 className="text-sm font-semibold text-white">Client Orders</h2>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-neutral-400">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="p-6 text-sm text-neutral-400">No orders found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-900/60 text-xs font-medium text-neutral-400">
                    <th className="px-5 py-3">Client</th>
                    <th className="px-5 py-3">Package</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Payment</th>
                    <th className="px-5 py-3">CRM Sync</th>
                    <th className="px-5 py-3 text-right">Onboarding Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/80">
                  {orders.map((order) => {
                    const clientName = getClientName(order);
                    const clientEmail = getClientEmail(order);
                    const packageTitle = getPackageTitle(order);
                    const amount = getOrderAmount(order);
                    const paymentStatus = getPaymentStatus(order);
                    const paid = isOrderPaid(order);
                    const synced = isOrderSynced(order);
                    const onboardingNote = getOnboardingText(order);
                    const isExpanded = expandedOrderId === order.id;

                    return (
                      <Fragment key={order.id}>
                        <tr className="hover:bg-neutral-900/40 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="font-medium text-white">
                              {clientName}
                            </div>
                            {clientEmail && (
                              <div className="text-xs text-neutral-400">
                                {clientEmail}
                              </div>
                            )}
                          </td>

                          <td className="px-5 py-3.5 text-neutral-300">
                            {packageTitle}
                          </td>

                          <td className="px-5 py-3.5 font-medium text-white">
                            ${amount.toFixed(2)}
                          </td>

                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                                paid
                                  ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                                  : "bg-neutral-900 text-neutral-400 border border-neutral-700"
                              }`}
                            >
                              {paymentStatus}
                            </span>
                          </td>

                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                                synced
                                  ? "bg-blue-950 text-blue-300 border border-blue-800/60"
                                  : "bg-neutral-900 text-neutral-400 border border-neutral-700"
                              }`}
                            >
                              {synced ? "SYNCED" : "PENDING"}
                            </span>
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            {onboardingNote ? (
                              <button
                                onClick={() =>
                                  setExpandedOrderId(isExpanded ? null : order.id)
                                }
                                className="text-xs font-medium text-neutral-300 underline underline-offset-4 hover:text-white"
                              >
                                {isExpanded ? "Hide Note" : "View Note"}
                              </button>
                            ) : (
                              <span className="text-xs text-neutral-600">—</span>
                            )}
                          </td>
                        </tr>

                        {isExpanded && onboardingNote && (
                          <tr className="bg-neutral-900/50">
                            <td colSpan={6} className="px-5 py-3.5">
                              <div className="rounded border border-neutral-800 bg-black p-3 text-xs leading-relaxed text-neutral-300">
                                <span className="font-semibold text-neutral-200">
                                  Onboarding Note:{" "}
                                </span>
                                {onboardingNote}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Webhook Logs Table */}
        <section className="rounded-lg border border-neutral-800 bg-neutral-950">
          <div className="border-b border-neutral-800 px-5 py-4">
            <h2 className="text-sm font-semibold text-white">Webhook Logs</h2>
          </div>

          {logs.length === 0 ? (
            <div className="p-6 text-sm text-neutral-400">
              No webhook events logged yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-900/60 text-xs font-medium text-neutral-400">
                    <th className="px-5 py-3">Source</th>
                    <th className="px-5 py-3">Event</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Order ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/80">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-neutral-900/40">
                      <td className="px-5 py-3 text-xs font-medium text-neutral-200">
                        {log.source || "STRIPE"}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-neutral-300">
                        {log.event || log.eventType || "—"}
                      </td>
                      <td className="px-5 py-3 text-xs font-medium text-emerald-400">
                        {log.status || "—"}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-neutral-400">
                        {log.orderId || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}