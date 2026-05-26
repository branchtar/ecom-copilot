import "./globals.css";
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
          <div style={{ maxWidth: 1440, margin: "0 auto" }}>
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}