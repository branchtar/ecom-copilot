import Link from "next/link";

export default function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-medium text-slate-800">Ecom Navigation</p>
          <p>Amazon seller analytics, marketplace connections, and workflow automation.</p>
        </div>

        <nav className="flex items-center gap-4">
          <Link className="hover:text-slate-900 underline-offset-4 hover:underline" href="/privacy">
            Privacy
          </Link>
          <Link className="hover:text-slate-900 underline-offset-4 hover:underline" href="/terms">
            Terms
          </Link>
          <Link className="hover:text-slate-900 underline-offset-4 hover:underline" href="/support">
            Support
          </Link>
                  <Link className="hover:text-slate-900 underline-offset-4 hover:underline" href="/docs/ecom-navigation-wholesale">
            Wholesale Setup
          </Link>
        </nav>
      </div>
    </footer>
  );
}
