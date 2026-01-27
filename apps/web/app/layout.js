import Providers from "./providers";

export const metadata = {
  title: "Ecom Copilot",
  description: "Marketplace integrations dashboard"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial", margin: 0 }}>
        <Providers>
          <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}