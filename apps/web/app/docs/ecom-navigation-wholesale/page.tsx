export const metadata = {
  title: "Ecom Navigation Wholesale Setup Guide | Ecom Navigation",
  description:
    "Setup guide for Ecom Navigation Wholesale, a Shopify wholesale application and buyer portal app.",
};

export default function WholesaleSetupGuidePage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
          Ecom Navigation Wholesale
        </p>

        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
          Setup Guide
        </h1>

        <p className="mt-4 text-slate-600">
          Ecom Navigation Wholesale helps Shopify merchants collect wholesale
          applications, approve qualified buyers, provide protected buyer portal
          access, and receive wholesale invoice or order requests.
        </p>

        <div className="mt-10 space-y-8 text-slate-700">
          <section>
            <h2 className="text-2xl font-semibold text-slate-900">1. Install and open the app</h2>
            <p className="mt-3">
              Install Ecom Navigation Wholesale from Shopify and open it from
              Shopify Admin. The app is managed from the merchant&apos;s Shopify
              Admin area.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900">2. Configure wholesale settings</h2>
            <p className="mt-3">
              Review app settings for the wholesale application workflow,
              notifications, and portal behavior. Add the support or notification
              email addresses that should receive operational alerts.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900">3. Share the wholesale application</h2>
            <p className="mt-3">
              Link customers or prospective wholesale buyers to the wholesale
              application page. Applicants can submit business and contact details
              for merchant review.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900">4. Review applications</h2>
            <p className="mt-3">
              Submitted wholesale applications appear in the app admin area. The
              merchant can review applicant details and decide whether to approve
              or reject the applicant.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900">5. Approve qualified buyers</h2>
            <p className="mt-3">
              When an applicant is approved, the merchant can create portal access
              for the approved buyer and send the buyer instructions to set a
              password.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900">6. Buyer sets password and logs in</h2>
            <p className="mt-3">
              Approved buyers can set a password and log into the protected
              wholesale portal.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900">7. Buyer submits invoice/order request</h2>
            <p className="mt-3">
              Buyers can submit a wholesale invoice or order request through the
              portal. The merchant receives and reviews the request from the app
              admin area.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900">8. Merchant follows up</h2>
            <p className="mt-3">
              The merchant reviews the request, confirms details, and follows up
              with the buyer according to the merchant&apos;s own sales, payment,
              tax, and fulfillment process.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900">Notifications</h2>
            <p className="mt-3">
              Email notifications are used for key workflows. Optional SMS
              notifications may be enabled when configured. SMS is not required
              for the core wholesale application, approval, portal, or
              invoice/order request workflows.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900">Need help?</h2>
            <p className="mt-3">
              Contact{" "}
              <a className="font-semibold text-blue-700 hover:underline" href="mailto:support@ecomnavigation.com">
                support@ecomnavigation.com
              </a>
              .
            </p>
          </section>
        </div>

        <p className="mt-10 text-sm text-slate-500">Last updated: May 26, 2026</p>
      </div>
    </main>
  );
}
