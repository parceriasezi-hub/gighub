"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/ui/logo"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { DashboardNav } from "./dashboard-nav"
import { NotificationsDropdown } from "@/components/notifications/notifications-dropdown"
import { usePathname } from "next/navigation"
import { Menu, User, Settings, LogOut, Circle } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

export function DashboardHeader() {
  const t = useTranslations("Header")
  const { user, profile, signOut, refreshProfile } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(false)

  useEffect(() => {
    if (profile) {
      setIsOnline(profile.is_online || false)
    }
  }, [profile])

  const pathname = usePathname()
  const isProviderMode = pathname?.startsWith("/dashboard/provider")
  const mode = isProviderMode ? "provider" : "client"

  const handleSignOut = async () => {
    await signOut()
  }

  const toggleOnlineStatus = async (checked: boolean) => {
    setIsOnline(checked) // Optimistic update

    try {
      if (!user?.id) return;

      await supabase.from('profiles').update({
        is_online: checked,
        last_active: new Date().toISOString()
      }).eq('id', user.id)

      await refreshProfile()
    } catch (error) {
      console.error("Error toggling online status:", error)
      setIsOnline(!checked) // Revert on error
    }
  }

  const displayName = isProviderMode
    ? (profile?.provider_full_name || profile?.full_name || user?.email?.split("@")[0] || t("providerProfile"))
    : (profile?.full_name || user?.email?.split("@")[0] || t("clientProfile"))

  const displayAvatar = isProviderMode
    ? (profile?.provider_avatar_url || profile?.avatar_url || "")
    : (profile?.avatar_url || "")

  const userInitials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo e menu mobile */}
          <div className="flex items-center">
            {/* Menu hambúrguer - apenas mobile */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="lg:hidden mr-2">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b flex justify-center">
                    <Logo href="/dashboard" />
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <DashboardNav />
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <Logo href="/dashboard" className="lg:hidden" />
          </div>

          {/* Ações do utilizador */}
          <div className="flex items-center space-x-4">
            {/* Notificações */}
            <NotificationsDropdown mode={mode as any} />

            {/* Menu do utilizador */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={displayAvatar} alt={displayName} />
                      <AvatarFallback>{userInitials}</AvatarFallback>
                    </Avatar>
                    {/* Green Dot Indicator */}
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white" />
                    )}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {displayName}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {isProviderMode ? t("providerProfile") : (profile?.role === 'admin' ? t("adminProfile") : (profile?.role === 'provider' ? t("providerProfile") : t("clientProfile")))}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* Online Toggle */}
                <div className="flex items-center justify-between px-2 py-2">
                  <Label htmlFor="online-mode" className="text-sm cursor-pointer">{t("onlineStatus")}</Label>
                  <Switch
                    id="online-mode"
                    checked={isOnline}
                    onCheckedChange={toggleOnlineStatus}
                    className="scale-75"
                  />
                </div>
                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Link href={isProviderMode ? "/dashboard/provider/profile" : "/dashboard/profile"} className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    <span>{t("profile")}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={isProviderMode ? "/dashboard/provider/settings" : "/dashboard/settings"} className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>{t("settings")}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t("logout")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
