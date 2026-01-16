"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase/client"
import Link from "next/link"
import {
  Plus,
  Briefcase,
  TrendingUp,
  Users,
  Euro,
  Star,
  MessageSquare,
  Eye,
  MapPin,
  User,
  CreditCard,
  BarChart3,
  Activity,
  CheckCircle,
  AlertCircle,
  Zap,
  Bell,
} from "lucide-react"
import { EmergencyAI } from "@/components/voice/emergency-ai"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"

interface DashboardStats {
  totalGigs: number
  activeGigs: number
  totalEarnings: number
  pendingPayments: number
  totalViews: number
  responseRate: number
}

interface RecentActivity {
  id: string
  type: "gig_created" | "response_received" | "payment_received" | "review_received"
  title: string
  description: string
  timestamp: string
  icon: any
  color: string
}

export default function DashboardPage() {
  const t = useTranslations("Dashboard")
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false)
  const [stats, setStats] = useState<DashboardStats>({
    totalGigs: 0,
    activeGigs: 0,
    totalEarnings: 0,
    pendingPayments: 0,
    totalViews: 0,
    responseRate: 0,
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [featuredGigs, setFeaturedGigs] = useState<any[]>([])

  useEffect(() => {
    if (user && !loading) {
      loadDashboardData()
    }
  }, [user, loading])

  const loadDashboardData = async () => {
    try {
      // Load gig statistics
      const { data: gigs } = await supabase.from("gigs").select("*").eq("author_id", user?.id)

      const totalGigs = gigs?.length || 0
      const activeGigs = gigs?.filter((g) => g.status === "approved").length || 0

      // Load featured gigs
      const { data: featured } = await supabase
        .from("gigs")
        .select("*")
        .eq("status", "approved")
        .limit(3)
        .order("created_at", { ascending: false })

      setStats({
        totalGigs,
        activeGigs,
        totalEarnings: 0,
        pendingPayments: 0,
        totalViews: 0,
        responseRate: 0,
      })

      setFeaturedGigs(featured || [])

      // Load real notifications for recent activity
      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user?.id)
        .eq("user_type", "client")
        .order("created_at", { ascending: false })
        .limit(5)

      if (notifications) {
        const activity = notifications.map(n => ({
          id: n.id,
          type: n.type as any,
          title: n.title,
          description: n.message,
          timestamp: new Date(n.created_at).toLocaleString(),
          icon: n.type.includes('gig') ? Briefcase : n.type.includes('response') ? MessageSquare : n.type.includes('payment') ? CreditCard : Bell,
          color: n.type.includes('gig') ? "text-blue-600" : n.type.includes('response') ? "text-green-600" : "text-gray-600",
        }))
        setRecentActivity(activity)
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error)
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return t("greetings.morning")
    if (hour < 18) return t("greetings.afternoon")
    return t("greetings.evening")
  }

  const handleEmergencySuccess = (requestId: string) => {
    toast({
      title: t("emergencyBroadcasted.title"),
      description: t("emergencyBroadcasted.description"),
    })
    router.push(`/dashboard/emergency/${requestId}`)
  }

  const getQuickActions = () => {
    if (profile?.role === "admin") {
      return [
        { href: "/dashboard/create-gig", icon: Plus, label: t("quickActions.createGig"), color: "bg-blue-600" },
        { href: "/admin/users", icon: Users, label: t("quickActions.manageUsers"), color: "bg-purple-600" },
        { href: "/admin/gigs", icon: Briefcase, label: t("quickActions.manageGigs"), color: "bg-green-600" },
        { href: "/admin/analytics", icon: BarChart3, label: t("quickActions.analytics"), color: "bg-orange-600" },
      ]
    }

    if (profile?.is_provider) {
      return [
        { href: "/dashboard/create-gig", icon: Plus, label: t("quickActions.createGig"), color: "bg-blue-600" },
        { href: "/dashboard/jobs", icon: Briefcase, label: t("quickActions.myJobs"), color: "bg-green-600" },
        { href: "/dashboard/payments", icon: CreditCard, label: t("quickActions.payments"), color: "bg-purple-600" },
        { href: "/dashboard/analytics", icon: BarChart3, label: t("quickActions.statistics"), color: "bg-orange-600" },
      ]
    }

    return [
      { href: "/dashboard/create-gig", icon: Plus, label: t("quickActions.createGig"), color: "bg-blue-600" },
      { href: "/dashboard/become-provider", icon: Star, label: t("quickActions.becomeProvider"), color: "bg-yellow-600" },
      { href: "/dashboard/messages", icon: MessageSquare, label: t("quickActions.messages"), color: "bg-green-600" },
      { href: "/dashboard/profile", icon: User, label: t("quickActions.completeProfile"), color: "bg-purple-600" },
    ]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t("loading")}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header de Boas-vindas */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {getGreeting()}, {profile?.full_name || "User"}!
          </h1>
          <p className="text-gray-600 mt-1">
            {profile?.role === "admin"
              ? t("roleDesc.admin")
              : profile?.is_provider
                ? t("roleDesc.provider")
                : t("roleDesc.client")}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {profile?.role !== 'admin' && (
            <Button
              variant="destructive"
              onClick={() => setIsEmergencyOpen(true)}
              className="bg-red-600 hover:bg-red-700 font-bold animate-pulse shadow-lg shadow-red-100"
            >
              <Zap className="mr-2 h-4 w-4 fill-current" />
              {t("emergency")}
            </Button>
          )}
          <Badge className={cn(
            "uppercase font-bold text-[10px] px-2 py-1 border",
            profile?.plan === 'pro' || profile?.plan === 'unlimited'
              ? "bg-yellow-50 text-yellow-700 border-yellow-200"
              : "bg-gray-50 text-gray-700 border-gray-200"
          )}>
            {profile?.plan === 'pro' ? 'Pro' : (profile?.plan === 'unlimited' ? 'Ilimitado' : 'Gratuito')}
          </Badge>
        </div>
      </div>



      {/* Ações Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t("quickActions.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {getQuickActions().map((action, index) => (
              <Link key={index} href={action.href}>
                <Button
                  className={`w-full h-20 flex flex-col items-center justify-center space-y-2 ${action.color} hover:opacity-90`}
                >
                  <action.icon className="h-6 w-6" />
                  <span className="text-sm font-medium">{action.label}</span>
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t("stats.totalGigs")}</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalGigs}</p>
              </div>
              <Briefcase className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t("stats.activeGigs")}</p>
                <p className="text-3xl font-bold text-green-600">{stats.activeGigs}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t("stats.views")}</p>
                <p className="text-3xl font-bold text-purple-600">{stats.totalViews}</p>
              </div>
              <Eye className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t("stats.responseRate")}</p>
                <p className="text-3xl font-bold text-orange-600">{stats.responseRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Atividade Recente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {t("activity.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`p-2 rounded-full bg-gray-100 ${activity.color}`}>
                    <activity.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-sm text-gray-600">{activity.description}</p>
                    <p className="text-xs text-gray-400 mt-1">{activity.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <Link href="/dashboard/notifications">
              <Button variant="outline" className="w-full bg-transparent">
                {t("activity.viewAll")}
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Gigs em Destaque */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              {t("featured.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {featuredGigs.length > 0 ? (
                featuredGigs.map((gig) => (
                  <div key={gig.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <h3 className="font-medium text-gray-900 mb-2">{gig.title}</h3>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {gig.location}
                        </span>
                        <span className="flex items-center">
                          <Euro className="h-4 w-4 mr-1" />
                          {Number(gig.price).toFixed(2)}
                        </span>
                      </div>
                      <Badge variant="secondary">{gig.category}</Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">{t("featured.noFound")}</p>
                  <Link href="/dashboard/create-gig">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      {t("featured.createFirst")}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
            {featuredGigs.length > 0 && (
              <>
                <Separator className="my-4" />
                <Link href="/dashboard/my-gigs">
                  <Button variant="outline" className="w-full bg-transparent">
                    {t("featured.viewAll")}
                  </Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <EmergencyAI
        isOpen={isEmergencyOpen}
        onClose={() => setIsEmergencyOpen(false)}
        onSuccess={handleEmergencySuccess}
      />
    </div>
  )
}
