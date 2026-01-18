"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Cookie } from "lucide-react"
import Link from "next/link"
import { useTranslations } from "next-intl"

export function CookieConsentBanner() {
    const [showBanner, setShowBanner] = useState(false)
    const t = useTranslations("CookieConsent")

    useEffect(() => {
        // Check if user has already accepted/declined
        const consent = localStorage.getItem("gighub-cookie-consent")
        if (!consent) {
            // Small delay for better UX on load
            const timer = setTimeout(() => setShowBanner(true), 1000)
            return () => clearTimeout(timer)
        }
    }, [])

    const handleAccept = () => {
        localStorage.setItem("gighub-cookie-consent", "accepted")
        setShowBanner(false)
    }

    const handleDecline = () => {
        localStorage.setItem("gighub-cookie-consent", "declined")
        setShowBanner(false)
    }

    if (!showBanner) return null

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 bg-transparent pointer-events-none">
            <Card className="max-w-4xl mx-auto shadow-2xl border-indigo-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 pointer-events-auto overflow-hidden animate-in slide-in-from-bottom-20 duration-500">
                <div className="p-6 md:flex items-center gap-6">
                    <div className="flex-shrink-0 mb-4 md:mb-0">
                        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                            <Cookie className="h-6 w-6" />
                        </div>
                    </div>

                    <div className="flex-1 space-y-2 mb-4 md:mb-0">
                        <h3 className="font-semibold text-lg text-gray-900">{t("title")}</h3>
                        <p className="text-gray-600 text-sm leading-relaxed">
                            {t("description")}{" "}
                            <Link href="/legal/cookies" className="text-indigo-600 hover:underline font-medium">{t("policyLink")}</Link>.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 min-w-fit">
                        <Button variant="outline" onClick={handleDecline} className="w-full sm:w-auto">
                            {t("reject")}
                        </Button>
                        <Button onClick={handleAccept} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700">
                            {t("acceptAll")}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    )
}
