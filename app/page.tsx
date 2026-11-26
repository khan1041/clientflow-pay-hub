


import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col">
      {/* Navbar */}
      <header className="border-b border-neutral-800 bg-neutral-950">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-emerald-700/60 bg-emerald-950/60">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5 12.5L9.5 17L19 7.5"
                  stroke="#34D399"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="text-base font-semibold tracking-tight text-white">
              ClientFlow Pay
            </span>
          </Link>

          <nav className="flex items-center gap-3">
            <Link
              href="/checkout"
              className="rounded-md px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-900 hover:text-white transition"
            >
              Checkout
            </Link>
            <Link
              href="/admin"
              className="rounded-md border border-neutral-800 bg-neutral-900 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 transition"
            >
              Admin Login
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-16">
        <div className="max-w-xl">
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Client Billing & Onboarding Portal
          </h1>
          <p className="mt-2.5 text-sm leading-relaxed text-neutral-400">
            Select a service package to complete payment via Stripe, or sign in
            to the admin dashboard to manage orders, CRM sync, and onboarding
            plans.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Client Checkout Card */}
          <div className="flex flex-col justify-between rounded-lg border border-neutral-800 bg-neutral-950 p-6">
            <div>
              <div className="flex items-center gap-2.5 text-emerald-400">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    x="2.5"
                    y="5"
                    width="19"
                    height="14"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M2.5 10H21.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                </svg>
                <span className="text-xs font-medium uppercase tracking-wider">
                  Client Portal
                </span>
              </div>

              <h2 className="mt-3 text-lg font-medium text-white">
                Package Checkout
              </h2>
              <p className="mt-1.5 text-sm text-neutral-400">
                Choose a service plan or monthly retainer, apply a promo code if
                available, and pay securely through Stripe.
              </p>
            </div>

            <div className="mt-6">
              <Link
                href="/checkout"
                className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition"
              >
                Go to Checkout
              </Link>
            </div>
          </div>

          {/* Admin Panel Card */}
          <div className="flex flex-col justify-between rounded-lg border border-neutral-800 bg-neutral-950 p-6">
            <div>
              <div className="flex items-center gap-2.5 text-neutral-300">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    x="4"
                    y="11"
                    width="16"
                    height="10"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M8 11V7a4 4 0 1 1 8 0v4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="text-xs font-medium uppercase tracking-wider">
                  Internal Access
                </span>
              </div>

              <h2 className="mt-3 text-lg font-medium text-white">
                Admin Dashboard
              </h2>
              <p className="mt-1.5 text-sm text-neutral-400">
                View paid orders, check GoHighLevel contact sync status, review
                AI onboarding roadmaps, and inspect webhook logs.
              </p>
            </div>

            <div className="mt-6">
              <Link
                href="/admin"
                className="inline-flex items-center justify-center rounded-md border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-100 hover:bg-neutral-800 transition"
              >
                Open Dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 py-4 text-center text-xs text-neutral-500">
        ClientFlow Pay © 2026
      </footer>
    </div>
  );
}