import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "REC Guardian | Forensic Intelligence Platform",
  description: "AI-Powered Renewable Energy Certificate Fraud Detection & Forensic Intelligence Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
