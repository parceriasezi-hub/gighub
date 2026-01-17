"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { useTranslations } from "next-intl"
import {
  Home,
  Briefcase,
  MessageSquare,
  Bell,
  User,
  Settings,
  BarChart3,
  Users,
  Shield,
  CreditCard,
  Building,
  Zap,
  Search,
  LifeBuoy,
  AlertTriangle,
} from "lucide-react"

const navigation = [
  { nameKey: "overview", href: "/dashboard", icon: Home },
  { nameKey: "emergencies", href: "/dashboard/emergency", icon: AlertTriangle },
  { nameKey: "myGigs", href: "/dashboard/my-gigs", icon: Briefcase },
  { nameKey: "messages", href: "/dashboard/messages", icon: MessageSquare },
  { nameKey: "notifications", href: "/dashboard/notifications", icon: Bell },
  { nameKey: "clientProfile", href: "/dashboard/profile", icon: User },
  { nameKey: "payments", href: "/dashboard/payments", icon: CreditCard },
  { nameKey: "billing", href: "/dashboard/billing", icon: CreditCard },
  { nameKey: "settings", href: "/dashboard/settings", icon: Settings },
  { nameKey: "support", href: "/dashboard/support", icon: LifeBuoy },
]

const providerNavigation = [
  { nameKey: "providerDashboard", href: "/dashboard/provider", icon: Zap },
  { nameKey: "emergencies", href: "/dashboard/provider/emergency", icon: AlertTriangle },
  { nameKey: "gigOpportunities", href: "/dashboard/provider/gigs", icon: Search },
  { nameKey: "providerProfile", href: "/dashboard/provider/profile", icon: User },
  { nameKey: "notifications", href: "/dashboard/provider/notifications", icon: Bell },
  { nameKey: "payments", href: "/dashboard/provider/payments", icon: CreditCard },
  { nameKey: "billingAndPlans", href: "/dashboard/provider/billing", icon: CreditCard },
  { nameKey: "settings", href: "/dashboard/provider/settings", icon: Settings },
]

const becomeProviderNavigation = [
  { nameKey: "becomeProvider", href: "/dashboard/become-provider", icon: Building },
]

const adminNavigation = [
  { nameKey: "adminDashboard", href: "/admin", icon: Shield },
  { nameKey: "users", href: "/admin/users", icon: Users },
  { nameKey: "gigs", href: "/admin/gigs", icon: Briefcase },
  { nameKey: "analytics", href: "/admin/analytics", icon: BarChart3 },
  { nameKey: "adminSettings", href: "/admin/settings", icon: Settings },
]

export function DashboardNav({ viewMode = "client" }: { viewMode?: "client" | "provider" }) {
  const t = useTranslations("Navigation")
  const pathname = usePathname()
  const { user, profile } = useAuth()

  const isAdmin = profile?.role === "admin"
  const isProvider = (profile?.role === "provider" || profile?.is_provider === true) && profile?.provider_status === 'approved'
  const isPendingProvider = profile?.role === "provider_pending"

  // If Admin, show Admin Navigation
  if (isAdmin) {
    return (
      <nav className="space-y-1 px-2">
        <div className="space-y-1">
          {adminNavigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.nameKey}
                href={item.href}
                className={cn(
                  "group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive ? "bg-red-100 text-red-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0",
                    isActive ? "text-red-500" : "text-gray-400 group-hover:text-gray-500",
                  )}
                />
                {t(item.nameKey)}
              </Link>
            )
          })}
        </div>

        {/* User Info */}
        <div className="pt-4 border-t border-gray-200 mt-auto">
          <div className="px-3 py-2">
            <p className="text-[10px] text-gray-400 uppercase font-semibold">{t('loggedAs')}</p>
            <p className="text-xs text-gray-600 truncate">{user?.email}</p>
            <p className="text-xs font-medium text-gray-900 capitalize italic">{profile?.role?.replace('_', ' ') || "User"}</p>
          </div>
        </div>
      </nav>
    )
  }

  // Determine which navigation to show based on viewMode
  return (
    <nav className="space-y-1 px-2">
      {/* Client Mode */}
      {viewMode === "client" && (
        <>
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.nameKey}
                  href={item.href}
                  className={cn(
                    "group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5 flex-shrink-0",
                      isActive ? "text-blue-500" : "text-gray-400 group-hover:text-gray-500",
                    )}
                  />
                  {t(item.nameKey)}
                </Link>
              )
            })}
          </div>

          {/* Become Provider / Pending - Only in Client View and if not Provider */}
          {!isProvider && !isAdmin && (
            <div className="pt-4">
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('opportunities')}</h3>
              <div className="mt-1 space-y-1">
                {isPendingProvider ? (
                  <div className="px-3 py-2 text-xs bg-yellow-50 text-yellow-700 rounded-md">
                    {t('pendingReview')}
                  </div>
                ) : (
                  becomeProviderNavigation.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.nameKey}
                        href={item.href}
                        className={cn(
                          "group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors",
                          isActive ? "bg-indigo-100 text-indigo-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                        )}
                      >
                        <item.icon
                          className={cn(
                            "mr-3 h-5 w-5 flex-shrink-0",
                            isActive ? "text-indigo-500" : "text-gray-400 group-hover:text-gray-500",
                          )}
                        />
                        {t(item.nameKey)}
                      </Link>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Provider Mode */}
      {viewMode === "provider" && isProvider && (
        <div className="space-y-1">
          {providerNavigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.nameKey}
                href={item.href}
                className={cn(
                  "group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive ? "bg-green-100 text-green-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0",
                    isActive ? "text-green-500" : "text-gray-400 group-hover:text-gray-500",
                  )}
                />
                {t(item.nameKey)}
              </Link>
            )
          })}
        </div>
      )}

      {/* User Info */}
      <div className="pt-4 border-t border-gray-200 mt-auto">
        <div className="px-3 py-2">
          <p className="text-[10px] text-gray-400 uppercase font-semibold">{t('loggedAs')}</p>
          <p className="text-xs text-gray-600 truncate">{user?.email}</p>
          <p className="text-xs font-medium text-gray-900 capitalize italic">{profile?.role?.replace('_', ' ') || "User"}</p>
        </div>
      </div>
    </nav>
  )
}
