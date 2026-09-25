import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AuthProvider from "@/components/AuthProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Realprosys — KPR Scheme Generator",
  description: "Generate jadwal pembayaran KPR/KPA dengan mudah",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id">
      <body className={`${geistSans.variable} min-h-full antialiased bg-slate-50`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
