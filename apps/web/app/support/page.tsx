export const metadata = {
  title: "Support | Ecom Navigation",
  description: "Support information for Ecom Navigation."
};

export default function SupportPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Support</h1>
        <p className="mt-4 text-slate-600">
          Ecom Navigation helps sellers connect marketplace accounts, monitor performance, and automate operations.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900">General Support</h2>
            <p className="mt-3 text-slate-700">
              For product questions, account help, or onboarding support, contact:
            </p>
            <p className="mt-4 font-medium text-slate-900">support@ecomnavigation.com</p>
          </section>

          <section className="rounded-2xl border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900">Response Scope</h2>
            <p className="mt-3 text-slate-700">
              Support includes marketplace connection questions, onboarding, account access issues, and basic product guidance.
            </p>
          </section>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900">About Ecom Navigation</h2>
          <p className="mt-3 text-slate-700">
            Ecom Navigation is an e-commerce operations platform designed to help sellers connect marketplace data,
            monitor analytics, and streamline supplier-driven workflows from one dashboard.
          </p>
        </div>
      </div>
    </main>
  );
}
