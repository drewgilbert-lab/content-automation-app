import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { RoleProvider } from "@/app/components/role-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Content Engine",
  description: "AI-powered content operations platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <RoleProvider>
          {children}
        </RoleProvider>
      </body>
    </html>
  );
}
