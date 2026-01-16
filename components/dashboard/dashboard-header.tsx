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
import { usePathname, useRouter } from "next/navigation"
import { Menu, User, Settings, LogOut, Circle, Briefcase, Zap } from "lucide-react"
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

  const router = useRouter()
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

  const displayName = (isProviderMode || profile?.role === "provider" || profile?.is_provider === true)
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
                  <div className="p-4 border-b flex flex-col gap-4">
                    <div className="flex justify-center">
                      <Logo href="/dashboard" />
                    </div>

                    {/* Mobile Client/Provider Toggle */}
                    {(profile?.role === "provider" || profile?.is_provider === true) && (
                      <div className="flex flex-col gap-2 bg-gray-50/50 p-2 rounded-xl border border-gray-100">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Modo de Visualização</span>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="ghost"
                            onClick={() => {
                              router.push("/dashboard")
                              setMobileMenuOpen(false)
                            }}
                            className={cn(
                              "h-14 flex flex-col items-center justify-center gap-1 rounded-xl transition-all border-2",
                              !isProviderMode
                                ? "bg-white text-blue-600 border-blue-100 shadow-sm"
                                : "bg-transparent text-gray-400 border-transparent hover:bg-gray-100"
                            )}
                          >
                            <User className={cn("h-5 w-5", !isProviderMode ? "fill-current" : "")} />
                            <span className="text-[10px] font-bold leading-none">Painel de Cliente</span>
                          </Button>

                          <Button
                            variant="ghost"
                            onClick={() => {
                              router.push("/dashboard/provider")
                              setMobileMenuOpen(false)
                            }}
                            className={cn(
                              "h-14 flex flex-col items-center justify-center gap-1 rounded-xl transition-all border-2",
                              isProviderMode
                                ? "bg-white text-purple-600 border-purple-100 shadow-sm"
                                : "bg-transparent text-gray-400 border-transparent hover:bg-gray-100"
                            )}
                          >
                            <Briefcase className={cn("h-5 w-5", isProviderMode ? "fill-current" : "")} />
                            <span className="text-[10px] font-bold leading-none">Painel de Prestador</span>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <DashboardNav viewMode={mode as any} />
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
                    <div className="flex items-center gap-2 mt-1">
                      {/* Subscription Badge */}
                      <div className={cn(
                        "text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border flex items-center gap-1",
                        profile?.plan === 'pro' || profile?.plan === 'unlimited'
                          ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                          : "bg-gray-50 text-gray-700 border-gray-200"
                      )}>
                        {(profile?.plan === 'pro' || profile?.plan === 'unlimited') && <Zap className="h-3 w-3 fill-current" />}
                        {profile?.plan === 'pro' ? 'Pro' : (profile?.plan === 'unlimited' ? 'Ilimitado' : 'Gratuito')}
                      </div>
                    </div>
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
