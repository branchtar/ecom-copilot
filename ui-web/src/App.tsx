import Pricing from "./pages/Pricing";
import React, { useState } from "react";
import DashboardPage from "./pages/DashboardPage";
import SuppliersPage from "./pages/SuppliersPage";
import ApiConnectionsPage from "./pages/ApiConnectionsPage";
import PlaceholderPage from "./components/PlaceholderPage";

type NavKey =
  | "dashboard"
  | "suppliers"
  | "emails"
  | "marketplaces"
  | "settings"
  | "api";

const App: React.FC = () => {
  const [active, setActive] = useState<NavKey>("dashboard");

  const renderPage = () => {
    if (active === "dashboard") return <DashboardPage />;
    if (active === "suppliers") return <SuppliersPage />;
    if (active === "api") return <ApiConnectionsPage />;
    if (active === "emails")
      return (
        <PlaceholderPage
          title="Emails"
          body="Local email automation and templates for marketplaces."
        />
      );
    if (active === "marketplaces")
      return (
        <PlaceholderPage
          title="Marketplaces"
          body="High-level marketplace settings, like which channels are live."
        />
      );
    if (active === "settings")
      return (
        <PlaceholderPage
          title="Settings"
          body="Global settings for Ecom Copilot."
        />
      );
    return null;
  };

  const topTitle =
    active === "dashboard"
      ? "Dashboard"
      : active === "suppliers"
      ? "Suppliers"
      : active === "emails"
      ? "Emails"
      : active === "marketplaces"
      ? "Marketplaces"
      : active === "settings"
      ? "Settings / API"
      : "API Connections";

  return (
    <div className="min-h-screen flex bg-slate-100 text-slate-900">
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col">
        <div className="px-6 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-brand-500 flex items-center justify-center text-white font-bold">
              EC
            </div>
            <div>
              <div className="text-sm uppercase tracking-wide text-slate-400">
                Ecom Copilot
              </div>
              <div className="text-xs text-slate-400 truncate">
                Bwaaack Ã¢â‚¬Â¢ Copy and Paste
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 text-sm">
          <button
            className={
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg " +
              (active === "dashboard"
                ? "bg-slate-800 text-white font-medium"
                : "text-slate-200 hover:bg-slate-800")
            }
            onClick={() => setActive("dashboard")}
          >
            <span>Dashboard</span>
          </button>
          <button
            className={
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg " +
              (active === "suppliers"
                ? "bg-slate-800 text-white font-medium"
                : "text-slate-200 hover:bg-slate-800")
            }
            onClick={() => setActive("suppliers")}
          >
            <span>Suppliers</span>
          </button>
          <button
            className={
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg " +
              (active === "emails"
                ? "bg-slate-800 text-white font-medium"
                : "text-slate-200 hover:bg-slate-800")
            }
            onClick={() => setActive("emails")}
          >
            <span>Emails</span>
          </button>
          <button
            className={
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg " +
              (active === "marketplaces"
                ? "bg-slate-800 text-white font-medium"
                : "text-slate-200 hover:bg-slate-800")
            }
            onClick={() => setActive("marketplaces")}
          >
            <span>Marketplaces</span>
          </button>
          <button
            className={
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg " +
              (active === "settings"
                ? "bg-slate-800 text-white font-medium"
                : "text-slate-200 hover:bg-slate-800")
            }
            onClick={() => setActive("settings")}
          >
            <span>Settings</span>
          </button>
          <button
            className={
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg " +
              (active === "api"
                ? "bg-slate-800 text-white font-medium"
                : "text-slate-200 hover:bg-slate-800")
            }
            onClick={() => setActive("api")}
          >
            <span>API Connections</span>
          </button>
        </nav>

        <div className="px-4 py-3 border-t border-slate-800 text-xs text-slate-400">
          Local build Ã¢â‚¬Â¢ {new Date().getFullYear()}
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        <header className="h-16 px-8 border-b border-slate-200 bg-white flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide">
              {topTitle}
            </div>
            <div className="text-lg font-semibold">Welcome back, Kyle!</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center bg-slate-100 rounded-full px-3 py-1 text-xs text-slate-500">
              <span className="mr-2">Ã°Å¸â€Â</span> Search (coming soon)
            </div>
            <div className="h-8 w-8 rounded-full bg-slate-300 flex items-center justify-center text-xs font-semibold">
              K
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 overflow-auto space-y-6">{renderPage()}</div>
      </main>
    </div>
  );
};

export default App;
