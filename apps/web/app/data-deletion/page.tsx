export const metadata = {
  title: "User Data Deletion | Ecom Navigation",
  description:
    "Data deletion instructions for Ecom Navigation, including how to request deletion of data associated with a connected Meta (Facebook or Instagram) account.",
};

export default function DataDeletionPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
          Ecom Navigation
        </p>

        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
          User Data Deletion
        </h1>

        <p className="mt-4 text-slate-600">
          These are the data deletion instructions for Ecom Navigation. You may request
          deletion of data associated with your Ecom Navigation account, including data
          associated with any connected Meta service account (Facebook or Instagram).
          This page explains how to disconnect a Meta integration, how to submit a
          deletion request, and what information we need in order to locate your account.
        </p>

        <div className="mt-10 space-y-8 text-slate-700">
          <section>
            <h2 className="text-2xl font-semibold text-slate-900">What you can request</h2>
            <p className="mt-3">
              You can ask us to delete the data Ecom Navigation holds for your account.
              This includes account and contact details you provided, marketplace and
              platform connection records, and data we received from a connected Meta
              service account in order to provide analytics, integrations, and workflow
              features.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900">
              Disconnecting or revoking the Meta integration
            </h2>
            <p className="mt-3">
              If you connected a Meta service account (Facebook or Instagram) to Ecom
              Navigation, you can remove our access directly from Meta at any time. On
              Facebook, open <span className="font-medium">Settings &amp; privacy</span>{" "}
              &rarr; <span className="font-medium">Settings</span> &rarr;{" "}
              <span className="font-medium">Apps and Websites</span>, select Ecom
              Navigation, and choose to remove it. On Instagram, open{" "}
              <span className="font-medium">Settings</span> &rarr;{" "}
              <span className="font-medium">Website Permissions</span> &rarr;{" "}
              <span className="font-medium">Apps and Websites</span> and remove Ecom
              Navigation.
            </p>
            <p className="mt-3">
              Revoking access at Meta stops any further data from being shared with Ecom
              Navigation. It does not by itself delete data we already hold. To have that
              data deleted, submit a deletion request using the steps below.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900">
              How to request deletion
            </h2>
            <ol className="mt-3 list-decimal space-y-2 pl-6">
              <li>
                If a Meta service account is connected, revoke Ecom Navigation&rsquo;s
                access from your Facebook or Instagram settings as described above.
              </li>
              <li>
                Send an email to{" "}
                <a
                  className="font-semibold text-blue-700 hover:underline"
                  href="mailto:support@ecomnavigation.com?subject=Data%20Deletion%20Request"
                >
                  support@ecomnavigation.com
                </a>{" "}
                with the subject line{" "}
                <span className="font-medium">Data Deletion Request</span>.
              </li>
              <li>
                Include the account information listed in the next section so we can
                locate your records.
              </li>
              <li>
                State whether you want your entire Ecom Navigation account deleted, or
                only the data associated with your connected Meta service account.
              </li>
              <li>
                Send the request from the email address associated with your Ecom
                Navigation account. We may need to contact you at that address to confirm
                the request before we act on it.
              </li>
            </ol>
            <p className="mt-3">
              You can also reach us through the{" "}
              <a className="font-semibold text-blue-700 hover:underline" href="/support">
                Support page
              </a>
              . We process deletion requests as part of normal support handling and will
              confirm by email once your request has been completed.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900">
              Information we need &mdash; and what never to send
            </h2>
            <p className="mt-3">
              To locate your request, please include the email address on your Ecom
              Navigation account, your business or workspace name if you use one, and the
              name of the connected platform the request relates to (for example Facebook
              or Instagram). If you know the public username or page name of the connected
              Meta account, that helps us match the correct records.
            </p>
            <p className="mt-3">
              <span className="font-semibold text-slate-900">
                Never send passwords, access tokens, API keys, one-time codes, or any
                other credentials.
              </span>{" "}
              We will never ask you for them, and we do not need them to delete your data.
              If you have already shared a credential with anyone, change it immediately
              on the platform it belongs to.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900">
              Records that may be retained
            </h2>
            <p className="mt-3">
              After a deletion request is completed, a limited set of records may remain
              where we are required or permitted to keep them &mdash; for example for
              security and abuse prevention, fraud prevention, accounting and billing
              records, or other legal and compliance obligations. Any records retained for
              these reasons are kept only for those purposes and are not used to provide
              product features to you.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900">Related policies</h2>
            <p className="mt-3">
              For more detail on what we collect and how we handle it, see our{" "}
              <a
                className="font-semibold text-blue-700 hover:underline"
                href="https://www.ecomnavigation.com/privacy"
              >
                Privacy Policy
              </a>{" "}
              and our{" "}
              <a
                className="font-semibold text-blue-700 hover:underline"
                href="https://www.ecomnavigation.com/terms"
              >
                Terms of Service
              </a>
              .
            </p>
          </section>
        </div>

        <p className="mt-10 text-sm text-slate-500">Last updated: October 18, 2026</p>
      </div>
    </main>
  );
}
