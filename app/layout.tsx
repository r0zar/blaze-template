import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./tour.css";
import FloatingElements from "@/components/FloatingElements";
import NavButton from "@/components/NavButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Blaze Subnet Demo | Scale Bitcoin with Layer 2",
  description: "Experience the power of Blaze subnets - a Layer 2 scaling solution for Bitcoin. Process transactions instantly with minimal fees while maintaining security.",
  openGraph: {
    title: "Blaze Subnet Demo | Scale Bitcoin with Layer 2",
    description: "Experience the power of Blaze subnets - a Layer 2 scaling solution for Bitcoin. Process transactions instantly with minimal fees while maintaining security.",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gradient-to-b from-background to-background/90 relative overflow-x-hidden`}
      >
        <div className="mesh-gradient fixed inset-0 -z-10 opacity-10" />
        {/* Floating Elements with transaction success state */}
        <FloatingElements />

        {/* Navigation Menu */}
        <NavButton />

        <div className="relative z-0">
          {children}
        </div>
      </body>
    </html>
  );
}
