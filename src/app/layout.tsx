import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/hooks/useAuth";
import { I18nProvider } from "@/i18n/I18nProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kak Yah Madina",
  description: "POS and restaurant management for Kak Yah Nasi Kandar",
  applicationName: "Kak Yah Madina",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Kak Yah",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#b23a1e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <I18nProvider>
          <AuthProvider>
            <LanguageSwitcher />
            {children}
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
