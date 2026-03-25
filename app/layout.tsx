import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "@/app/components/session-provider";
import { RoleProvider } from "@/app/components/role-provider";
import { ToastProvider } from "@/app/components/ui/toast";
import { AppShell } from "@/app/components/layout/app-shell";
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
        <div className="fixed left-0 right-0 top-0 z-50 h-1 bg-hg-blue" />
        <div className="pt-1">
          <SessionProvider>
            <RoleProvider>
              <ToastProvider>
                <AppShell>{children}</AppShell>
              </ToastProvider>
            </RoleProvider>
          </SessionProvider>
        </div>
      </body>
    </html>
  );
}
