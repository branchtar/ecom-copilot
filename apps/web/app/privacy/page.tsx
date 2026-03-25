export const metadata = {
  title: "Privacy Policy | Ecom Navigation",
  description: "Privacy Policy for Ecom Navigation."
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Privacy Policy</h1>
        <p className="mt-4 text-slate-600">
          Ecom Navigation provides marketplace connectivity, analytics, and workflow automation for e-commerce sellers.
        </p>

        <div className="mt-10 space-y-8 text-slate-700">
          <section>
            <h2 className="text-2xl font-semibold text-slate-900">Information We Collect</h2>
            <p className="mt-3">
              We may collect account information, contact details, marketplace connection details, and data required to
              provide analytics, integrations, and automation features.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900">How We Use Information</h2>
            <p className="mt-3">
              We use information to operate Ecom Navigation, connect marketplace accounts, provide dashboards and
              analytics, improve product functionality, maintain security, and communicate with users about their account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900">Data Sharing</h2>
            <p className="mt-3">
              We do not sell personal information. We may share data with service providers and platform partners only as
              needed to operate Ecom Navigation, comply with legal obligations, or protect the security of our service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900">Data Security</h2>
            <p className="mt-3">
              We use reasonable administrative, technical, and organizational safeguards to protect the information we
              process. No method of transmission or storage is completely secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900">Contact</h2>
            <p className="mt-3">
              For privacy questions, contact us through the Support page at <span className="font-medium">/support</span>.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}