import type { Metadata } from "next";
import { Geist, Instrument_Sans, Rajdhani, Nunito } from "next/font/google";
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
      <head />
      <body className={`${geist.variable} ${instrumentSans.variable} ${rajdhani.variable} ${nunito.variable} font-sans antialiased bg-[var(--bg)] text-[var(--text)]`} suppressHydrationWarning>
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
