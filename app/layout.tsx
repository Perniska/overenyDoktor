import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PrivacyBanner from "@/components/privacy/PrivacyBanner";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "OverenýDoktor",
  description: "Digitálny ekosystém pre hodnotenie zdravotnej starostlivosti",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sk" className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
            {children}
          </main>
          <PrivacyBanner />
          <Footer />
        </div>
      </body>
    </html>
  );
}