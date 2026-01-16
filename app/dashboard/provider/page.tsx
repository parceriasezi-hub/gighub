"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, TrendingUp, Users, Star, DollarSign, AlertCircle, CheckCircle, Zap } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

interface ProviderStats {
  totalGigs: number
  activeGigs: number
  totalResponses: number
  averageRating: number
  totalEarnings: number
  completedJobs: number
}

export default function ProviderDashboard() {
  const { profile, loading: authLoading } = useAuth()
  const [activities, setActivities] = useState<any[]>([])
  const [stats, setStats] = useState<ProviderStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && profile?.id) {
      fetchProviderData()
    }
  }, [authLoading, profile?.id])

  const fetchProviderData = async () => {
    if (!profile?.id) return

    try {
      setLoading(true)
      setError(null)

      const supabase = createClient()

      // Fetch gigs statistics
      const { data: gigsData, error: gigsError } = await supabase
        .from("gigs")
        .select("id, status, price")
        .eq("user_id", profile.id)

      if (gigsError) {
        console.error("Error fetching gigs:", gigsError)
        throw new Error(`Erro ao buscar gigs: ${gigsError.message}`)
      }

      // Fetch responses statistics
      const { data: responsesData, error: responsesError } = await supabase
        .from("gig_responses")
        .select("id, status")
        .eq("provider_id", profile.id)

      if (responsesError) {
        console.error("Error fetching responses:", responsesError)
        throw new Error(`Erro ao buscar respostas: ${responsesError.message}`)
      }

      // Calculate statistics
      const totalGigs = gigsData?.length || 0
      const activeGigs = gigsData?.filter((gig) => gig.status === "active").length || 0
      const totalResponses = responsesData?.length || 0
      const completedJobs = responsesData?.filter((response) => response.status === "completed").length || 0
      const totalEarnings = gigsData?.reduce((sum, gig) => sum + (gig.price || 0), 0) || 0

      setStats({
        totalGigs,
        activeGigs,
        totalResponses,
        averageRating: profile.rating || 0,
        totalEarnings: profile.total_earnings || 0,
        completedJobs,
      })

      // Fetch provider notifications
      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", profile.id)
        .eq("user_type", "provider")
        .order("created_at", { ascending: false })
        .limit(5)

      if (notifications) {
        setActivities(notifications.map(n => ({
          id: n.id,
          title: n.title,
          message: n.message,
          created_at: n.created_at,
          type: n.type
        })))
      }
    } catch (err) {
      console.error("Error fetching provider data:", err)
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchProviderData} className="mt-4">
          Tentar Novamente
        </Button>
      </div>
    )
  }

  if (!profile?.is_provider) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Torne-se um Prestador</CardTitle>
            <CardDescription>Comece a oferecer os seus serviços na plataforma Biskate</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Para aceder ao painel de prestador, precisa primeiro de ativar o seu perfil de prestador.
            </p>
            <Link href="/dashboard/become-provider">
              <Button>Tornar-me Prestador</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getProviderStatusBadge = () => {
    const status = profile?.provider_status || "pending"
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Aprovado
          </Badge>
        )
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pendente
          </Badge>
        )
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Rejeitado
          </Badge>
        )
      default:
        return <Badge className="bg-gray-100 text-gray-800">Desconhecido</Badge>
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Painel do Prestador</h1>
          <p className="text-muted-foreground">Gerencie os seus serviços e acompanhe o seu desempenho</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Subscription Badge */}
          <Badge className={cn(
            "uppercase font-bold text-[10px] px-2 py-1 flex items-center gap-1 border",
            profile?.plan === 'pro' || profile?.plan === 'unlimited'
              ? "bg-yellow-50 text-yellow-700 border-yellow-200"
              : "bg-gray-50 text-gray-700 border-gray-200"
          )}>
            {(profile?.plan === 'pro' || profile?.plan === 'unlimited') && <Zap className="h-3 w-3 fill-current" />}
            {profile?.plan === 'pro' ? 'Pro' : (profile?.plan === 'unlimited' ? 'Ilimitado' : 'Gratuito')}
          </Badge>

          {/* Status Badge (Keep for internal info but smaller) */}
          <div className="text-[10px] text-gray-400 font-medium">
            (Status: {profile?.provider_status === 'approved' ? '✓ Ativo' : '⚠ Pendente'})
          </div>
        </div>
      </div>

      {profile?.provider_status !== "approved" && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {profile?.provider_status === "pending"
              ? "O seu perfil de prestador está pendente de aprovação. Será notificado quando for aprovado."
              : "O seu perfil de prestador precisa de aprovação para começar a receber trabalhos."}
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Gigs</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalGigs || 0}</div>
            <p className="text-xs text-muted-foreground">{stats?.activeGigs || 0} ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Respostas Enviadas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalResponses || 0}</div>
            <p className="text-xs text-muted-foreground">{stats?.completedJobs || 0} concluídos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avaliação Média</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.averageRating || 0}</div>
            <p className="text-xs text-muted-foreground">de 5 estrelas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganhos Totais</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats?.totalEarnings || 0}</div>
            <p className="text-xs text-muted-foreground">este mês</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different sections */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="responses">Respostas</TabsTrigger>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Atividade Recente</CardTitle>
              </CardHeader>
              <CardContent>
                {activities.length > 0 ? (
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3">
                        <div className="p-2 rounded-full bg-blue-50 text-blue-600">
                          <CheckCircle className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                          <p className="text-sm text-gray-500 line-clamp-2">{activity.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(activity.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma atividade recente para mostrar.</p>
                )}
              </CardContent>
              <div className="p-4 border-t">
                <Link href="/dashboard/provider/notifications">
                  <Button variant="outline" className="w-full">
                    Ver Toda a Atividade
                  </Button>
                </Link>
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Próximos Passos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Perfil de prestador criado</span>
                </div>
                <div className="flex items-center space-x-2">
                  {profile?.provider_status === "approved" ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  )}
                  <span className="text-sm">
                    {profile?.provider_status === "approved" ? "Aprovação concluída" : "Aguardar aprovação"}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {profile?.provider_status === "approved" ? (
                    <AlertCircle className="h-4 w-4 text-blue-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-gray-400" />
                  )}
                  <span className={cn("text-sm", profile?.provider_status === "approved" ? "font-medium text-blue-600" : "text-muted-foreground")}>
                    Começar a responder a gigs
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>



        <TabsContent value="responses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Minhas Respostas</CardTitle>
              <CardDescription>Respostas enviadas para gigs de outros utilizadores</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Ainda não enviou nenhuma resposta.
                <Link href="/dashboard/gigs" className="text-primary hover:underline ml-1">
                  Explorar gigs disponíveis
                </Link>
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Perfil do Prestador</CardTitle>
              <CardDescription>Configure o seu perfil profissional</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Status:</label>
                  <div className="mt-1">{getProviderStatusBadge()}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Nome:</label>
                  <p className="text-sm text-muted-foreground">{profile?.full_name || "Não definido"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Email:</label>
                  <p className="text-sm text-muted-foreground">{profile?.email}</p>
                </div>
                <Link href="/dashboard/profile">
                  <Button variant="outline">Editar Perfil</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
