import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/contexts/auth-context"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { CookieConsentBanner } from "@/components/shared/cookie-consent-banner"
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

const inter = Inter({ subsets: ["latin"] })



export const metadata: Metadata = {
  title: "GigHub - Freelance Platform",
  description: "Connect with skilled professionals for your projects",
  manifest: "/manifest.json",
  icons: {
    icon: "/gighub-logo.png",
    shortcut: "/gighub-logo.png",
    apple: "/gighub-logo.png",
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={inter.className}>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <AuthProvider>
              {children}
              <Toaster />
              <CookieConsentBanner />
            </AuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
