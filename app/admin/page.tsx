"use client"

import { AuthGuard } from "@/components/auth/auth-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { Users, Briefcase, Bell, BarChart3, Shield, FolderTree, CreditCard } from "lucide-react"
import Link from "next/link"
import { useTranslations } from "next-intl"

export const dynamic = "force-dynamic"
export const runtime = "edge"

export default function AdminDashboard() {
  const t = useTranslations("Admin")
  const { profile } = useAuth()

  return (
    <AuthGuard requireAdmin={true}>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-6">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-gray-900">{t("Dashboard.title")}</h1>
                <p className="text-gray-600 mt-2">{t("Dashboard.welcome", { name: profile?.full_name || profile?.email })}</p>
              </div>
              <Badge className="bg-red-100 text-red-800 border-red-200">
                <Shield className="h-3 w-3 mr-1" />
                {t("Header.administrator")}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* User Management */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  {t("Sidebar.users")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{t("Dashboard.cards.usersDesc")}</p>
                <Link href="/admin/users">
                  <Button variant="outline" className="w-full">
                    {t("Dashboard.cards.manageUsers")}
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Gig Management */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-green-600" />
                  {t("Sidebar.gigs")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{t("Dashboard.cards.gigsDesc")}</p>
                <Link href="/admin/gigs">
                  <Button variant="outline" className="w-full">
                    {t("Dashboard.cards.manageGigs")}
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Categories */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderTree className="h-5 w-5 text-yellow-600" />
                  {t("Sidebar.categories")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{t("Dashboard.cards.categoriesDesc")}</p>
                <Link href="/admin/categories">
                  <Button variant="outline" className="w-full">
                    {t("Dashboard.cards.manageCategories")}
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Analytics */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  {t("Sidebar.analytics")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{t("Dashboard.cards.analyticsDesc")}</p>
                <Link href="/admin/analytics">
                  <Button variant="outline" className="w-full">
                    {t("Dashboard.cards.viewAnalytics")}
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-orange-600" />
                  {t("Sidebar.notifications")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{t("Dashboard.cards.notificationsDesc")}</p>
                <Link href="/admin/notifications">
                  <Button variant="outline" className="w-full">
                    {t("Dashboard.cards.manageNotifications")}
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Finance */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-emerald-600" />
                  {t("Sidebar.finance")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{t("Dashboard.cards.financeDesc")}</p>
                <Link href="/admin/finance">
                  <Button variant="outline" className="w-full">
                    {t("Dashboard.cards.manageFinance")}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
