import type { Metadata } from "next";
import { Geist, Instrument_Sans, Rajdhani, Nunito, Fraunces } from "next/font/google";
import "./globals.css";
import { RecoveryHashRedirect } from "@/components/auth/RecoveryHashRedirect";

const geist = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "DetailOps",
  description: "CRM for mobile auto detailers — customers, jobs, vehicles, scheduling",
  icons: { icon: [{ url: "/api/icon?v=5", type: "image/svg+xml" }] },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={`${geist.variable} ${instrumentSans.variable} ${rajdhani.variable} ${nunito.variable} ${fraunces.variable} font-sans antialiased bg-[var(--bg)] text-[var(--text)]`} suppressHydrationWarning>
        {/* Redirect password-reset links that land on / or /login to /auth/callback before React hydrates.
            Handles: hash (#access_token, #type=recovery, #code=), query (token_hash, code). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  var p = window.location.pathname;
  var h = window.location.hash || '';
  var q = window.location.search || '';
  var hasRecoveryHash = h.indexOf('type=recovery') !== -1 || h.indexOf('access_token') !== -1 || h.indexOf('code=') !== -1;
  var hasRecoveryQuery = q.indexOf('token_hash') !== -1 || q.indexOf('code=') !== -1;
  if ((p === '/' || p === '/login') && (hasRecoveryHash || hasRecoveryQuery)) {
    window.location.replace('/auth/callback' + q + h);
    return;
  }
  // Inside the native app, the marketing landing page should never be shown.
  // Redirect / to /login so the app always starts at the product.
  var isNativeApp = !!(window.Capacitor);
  if (isNativeApp && p === '/') {
    window.location.replace('/login');
  }
})();
            `.trim(),
          }}
        />
        <RecoveryHashRedirect />
        {children}
      </body>
    </html>
  );
}
