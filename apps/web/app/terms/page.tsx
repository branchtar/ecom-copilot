export const metadata = {
  title: "Terms of Service | Ecom Navigation",
  description: "Terms of Service for Ecom Navigation and Ecom Navigation Wholesale.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
          Ecom Navigation
        </p>

        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
          Terms of Service
        </h1>

        <p className="mt-4 text-slate-600">
          These Terms of Service describe the basic terms for using Ecom Navigation
          software, including Ecom Navigation Wholesale. By using our software, you
          agree to use it responsibly and in accordance with applicable laws,
          platform rules, and your own business obligations.
        </p>

        <div className="mt-10 space-y-8 text-slate-700">
          <section>
            <h2 className="text-2xl font-semibold text-slate-900">Product purpose</h2>
            <p className="mt-3">
              Ecom Navigation provides software tools for e-commerce operations,
              marketplace connections, analytics, workflow automation, and Shopify
              wholesale application workflows.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900">Merchant responsibilities</h2>
            <p className="mt-3">
              Merchants remain responsible for their own business operations,
              pricing, taxes, customer relationships, wholesale eligibility
              decisions, fulfillment, refunds, compliance, and communications with
              their customers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900">No guaranteed results</h2>
            <p className="mt-3">
              Ecom Navigation software is a workflow and management tool. We do
              not guarantee sales, revenue, profit, buyer approval outcomes,
              marketplace performance, or business results.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900">Wholesale workflows</h2>
            <p className="mt-3">
              Ecom Navigation Wholesale helps Shopify merchants collect wholesale
              applications, review applicants, provide approved buyer portal
              access, and receive wholesale invoice or order requests. Merchants
              are responsible for reviewing requests, confirming pricing and
              availability, collecting payment through appropriate channels, and
              fulfilling accepted orders.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900">Notifications</h2>
            <p className="mt-3">
              Email notifications may be used for operational workflows. Optional
              SMS notifications may be available when properly configured. If SMS
              is not configured or approved, the core wholesale application,
              approval, portal, and invoice/order request workflows continue to
              function.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900">Acceptable use</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Do not use the software for unlawful, misleading, abusive, or fraudulent activity.</li>
              <li>Do not attempt to bypass security controls or access data you are not authorized to access.</li>
              <li>Do not use the software to send spam or unauthorized communications.</li>
              <li>Do not misuse applicant, buyer, customer, or marketplace data.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900">Support</h2>
            <p className="mt-3">
              For support, contact{" "}
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
