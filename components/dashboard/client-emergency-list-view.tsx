
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Loader2, MapPin, Clock, ArrowRight, AlertTriangle, CheckCircle2, Zap } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

interface EmergencyRequest {
    id: string
    category: string
    description: string
    status: string
    address: string
    created_at: string
}

export function ClientEmergencyListView() {
    const router = useRouter()
    const { user } = useAuth()
    const supabase = createClient()
    const [requests, setRequests] = useState<EmergencyRequest[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!user) return
        fetchMyEmergencies()

        const channel = supabase
            .channel("client_emergencies_management")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "emergency_requests",
                    filter: `client_id=eq.${user.id}`
                },
                () => {
                    fetchMyEmergencies()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user])

    const fetchMyEmergencies = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from("emergency_requests")
                .select("*")
                .eq("client_id", user?.id)
                .order("created_at", { ascending: false })

            if (error) throw error
            setRequests(data || [])
        } catch (err) {
            console.error("Error fetching client emergencies:", err)
        } finally {
            setLoading(false)
        }
    }

    const activeRequests = requests.filter(r => ['pending', 'accepted', 'in_progress'].includes(r.status))
    const pastRequests = requests.filter(r => ['completed', 'cancelled'].includes(r.status))

    const RequestCard = ({ req }: { req: EmergencyRequest }) => (
        <Card
            key={req.id}
            className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer border-blue-100"
            onClick={() => router.push(`/dashboard/emergency/${req.id}`)}
        >
            <CardHeader className="bg-blue-50/50 pb-3">
                <div className="flex justify-between items-start">
                    <Badge
                        variant={req.status === 'pending' ? "destructive" : "default"}
                        className={cn(
                            req.status === 'pending' && "bg-red-600 animate-pulse",
                            req.status === 'in_progress' && "bg-green-600",
                            req.status === 'accepted' && "bg-blue-600"
                        )}
                    >
                        {req.status === 'pending' ? "À PROCURA..." :
                            req.status === 'in_progress' ? "EM CURSO" :
                                req.status === 'accepted' ? "PROFISSIONAL A CAMINHO" :
                                    req.status.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(req.created_at).toLocaleDateString()} {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
                <CardTitle className="text-xl mt-2">{req.category}</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
                <p className="text-sm text-gray-600 line-clamp-2">{req.description || "Sem descrição adicional."}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 text-blue-500" />
                    <span className="truncate">{req.address}</span>
                </div>

                <Button
                    className={cn(
                        "w-full font-bold",
                        ['pending', 'accepted', 'in_progress'].includes(req.status) ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                    )}
                >
                    {['pending', 'accepted', 'in_progress'].includes(req.status) ? "ACOMPANHAR EM TEMPO REAL" : "VER DETALHES"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </CardContent>
        </Card>
    )

    if (loading && requests.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                <p className="text-muted-foreground">A carregar o seu histórico de emergências...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">As Minhas Emergências</h2>
                    <p className="text-muted-foreground font-medium">Faça a gestão dos seus pedidos de serviço urgentes e acompanhe em tempo real.</p>
                </div>
                {activeRequests.length === 0 && (
                    <Button
                        onClick={() => router.push('/dashboard')}
                        className="bg-red-600 hover:bg-red-700 font-bold shadow-lg shadow-red-100"
                    >
                        <Zap className="mr-2 h-4 w-4 fill-current" />
                        NOVA EMERGÊNCIA
                    </Button>
                )}
            </div>

            <Tabs defaultValue="active" className="w-full">
                <TabsList className="bg-gray-100 p-1 rounded-xl h-auto flex-wrap mb-6">
                    <TabsTrigger value="active" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold uppercase text-xs tracking-wider">
                        Ativas ({activeRequests.length})
                    </TabsTrigger>
                    <TabsTrigger value="history" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold uppercase text-xs tracking-wider">
                        Histórico ({pastRequests.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="mt-0">
                    {activeRequests.length === 0 ? (
                        <EmptyState
                            message="Não tem nenhuma emergência ativa de momento."
                            description="Se precisar de ajuda urgente, utilize o botão de Emergência no dashboard."
                        />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {activeRequests.map(req => <RequestCard key={req.id} req={req} />)}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="history" className="mt-0">
                    {pastRequests.length === 0 ? (
                        <EmptyState
                            message="Ainda não tem histórico de emergências."
                            description="Todos os seus pedidos concluídos aparecerão aqui para consulta futura."
                        />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {pastRequests.map(req => <RequestCard key={req.id} req={req} />)}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}

function EmptyState({ message, description }: { message: string, description: string }) {
    return (
        <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-6 w-6 text-blue-400" />
                </div>
                <CardTitle className="text-lg">{message}</CardTitle>
                <CardDescription>
                    {description}
                </CardDescription>
            </CardContent>
        </Card>
    )
}
