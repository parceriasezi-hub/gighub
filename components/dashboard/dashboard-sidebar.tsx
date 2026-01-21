"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    Home,
    MessageSquare,
    User,
    PlusCircle,
    Settings,
    Briefcase,
    Menu,
    X,
    LogOut
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/ui/logo"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { EmergencyService } from "@/lib/emergency/emergency-service"
import { toast } from "@/hooks/use-toast"
import { Zap } from "lucide-react"
import { useEmergencyHeartbeat } from "@/hooks/use-emergency-heartbeat"
import { useTranslations } from "next-intl"

import { DashboardNav } from "./dashboard-nav"
import { OrgSwitcher } from "./org-switcher"

export function DashboardSidebar() {
    const t = useTranslations("Sidebar")
    useEmergencyHeartbeat()
    const pathname = usePathname()
    const router = useRouter()
    const { user, profile, signOut, refreshProfile } = useAuth()
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
    const [viewMode, setViewMode] = useState<"client" | "provider">(
        pathname?.includes("/dashboard/provider") ? "provider" : "client"
    )

    const isProvider = (profile?.role === "provider" || profile?.is_provider === true) && profile?.provider_status === 'approved'

    // Sync viewMode with pathname
    useEffect(() => {
        if (pathname?.includes("/dashboard/provider")) {
            setViewMode("provider")
        } else {
            setViewMode("client")
        }
    }, [pathname])

    const hasEmergencyFeature = (profile?.plan === 'pro' || profile?.plan === 'unlimited')

    const toggleOnlineStatus = async (checked: boolean) => {
        if (!user) return

        setIsUpdatingStatus(true)
        try {
            // Get current location if going online
            let location = undefined
            if (checked) {
                try {
                    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                        gridNavigator.geolocation.getCurrentPosition(resolve, reject)
                    })
                    location = { lat: pos.coords.latitude, lng: pos.coords.longitude }
                } catch (err) {
                    console.warn("⚠️ Geolocation blocked or failed", err)
                    toast({
                        title: t("locationNeeded.title"),
                        description: t("locationNeeded.description"),
                        variant: "destructive"
                    })
                }
            }

            const { error } = await EmergencyService.updateProviderStatus(user.id, checked, location)
            if (error) throw error

            await refreshProfile()
            toast({
                title: checked ? t("statusUpdated.online.title") : t("statusUpdated.offline.title"),
                description: checked ? t("statusUpdated.online.description") : t("statusUpdated.offline.description"),
            })
        } catch (err: any) {
            console.error("❌ Failed to update status:", err)
            toast({
                title: t("error.title"),
                description: err.message || t("error.failedStatus"),
                variant: "destructive"
            })
        } finally {
            setIsUpdatingStatus(false)
        }
    }

    // Helper for geolocation (navigator)
    const gridNavigator = typeof window !== 'undefined' ? window.navigator : {} as any

    return (
        <>
            {/* Sidebar */}
            <aside
                className={cn(
                    "hidden lg:flex flex-col w-64 bg-white border-r h-full overflow-hidden"
                )}
            >
                <div className="flex flex-col h-full">

                    {/* Logo & Status */}
                    <div className="p-6 border-b space-y-4">
                        <Logo />

                        <OrgSwitcher />

                        {/* View Toggle for Providers */}
                        {isProvider ? (
                            <div className="bg-gray-100 p-1 rounded-lg grid grid-cols-2 gap-1">
                                <button
                                    onClick={() => {
                                        setViewMode("client")
                                        router.push("/dashboard")
                                    }}
                                    className={cn(
                                        "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                                        viewMode === "client"
                                            ? "bg-white text-gray-900 shadow-sm"
                                            : "text-gray-500 hover:text-gray-900"
                                    )}
                                >
                                    {t("client")}
                                </button>
                                <button
                                    onClick={() => {
                                        setViewMode("provider")
                                        router.push("/dashboard/provider")
                                    }}
                                    className={cn(
                                        "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                                        viewMode === "provider"
                                            ? "bg-white text-gray-900 shadow-sm"
                                            : "text-gray-500 hover:text-gray-900"
                                    )}
                                >
                                    {t("provider")}
                                </button>
                            </div>
                        ) : (
                            <Button
                                variant="default"
                                size="sm"
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md transition-all group"
                                onClick={() => router.push("/dashboard/provider/onboarding")}
                            >
                                <Briefcase className="mr-2 h-4 w-4 group-hover:animate-bounce" />
                                {t("becomeProvider") || "Tornar-se Prestador"}
                            </Button>
                        )}

                        {isProvider && viewMode === "provider" && (
                            <div className="flex flex-col space-y-2 pt-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={cn(
                                            "w-2 h-2 rounded-full",
                                            profile?.is_online ? "bg-green-500 animate-pulse" : "bg-gray-300"
                                        )} />
                                        <Label htmlFor="online-toggle" className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            {profile?.is_online ? t("online") : t("offline")}
                                        </Label>
                                    </div>
                                    <Switch
                                        id="online-toggle"
                                        checked={profile?.is_online || false}
                                        onCheckedChange={toggleOnlineStatus}
                                        disabled={isUpdatingStatus}
                                    />
                                </div>
                                {hasEmergencyFeature && profile?.is_online && (
                                    <Badge variant="outline" className="w-fit bg-red-50 text-red-600 border-red-100 flex items-center gap-1 py-1">
                                        <Zap className="h-3 w-3 fill-current" />
                                        {t("emergencyReady")}
                                    </Badge>
                                )}
                            </div>
                        )}
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-tighter">{t("navigation")}</p>
                    </div>

                    {/* Navigation */}
                    <div className="flex-1 py-4 overflow-y-auto">
                        <DashboardNav viewMode={viewMode} />
                    </div>

                    {/* Logout */}
                    <div className="p-4 border-t">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={signOut}
                            className="w-full justify-start text-gray-600 hover:text-red-600 hover:bg-red-50"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            {t("logout")}
                        </Button>
                    </div>
                </div>
            </aside>
        </>
    )
}
