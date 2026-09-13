import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "REC Guardian | Zero-Knowledge Anti-Fraud Mesh & DLT Platform",
  description: "AI-Powered Renewable Energy Certificate Fraud Detection, Provenance Explorer & Hyperledger Fabric Integrity Suite",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-slate-50 text-slate-900 dark:bg-[#0b1326] dark:text-[#dae2fd] min-h-screen antialiased selection:bg-emerald-500/20 selection:text-emerald-700 dark:selection:bg-[#45f1bf]/20 dark:selection:text-[#45f1bf]">
        {children}
      </body>
    </html>
  );
}
