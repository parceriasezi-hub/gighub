"use client"

export const runtime = "edge"
export const dynamic = "force-dynamic"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTriangle } from "@/components/ui/alert"
import { useAuth } from "@/contexts/auth-context"
import { Loader2, ArrowLeft, MapPin, Clock, Euro, User, Mail, Lock, Phone, CheckCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import type { Database } from "@/lib/supabase/database.types"
import { ContactViewButton } from "@/components/gigs/contact-view-button"
import { CreateProposalModal } from "@/components/proposals/create-proposal-modal"
import { ChatInterface } from "@/components/chat/chat-interface"
import { ContactViewService } from "@/lib/monetization/contact-view-service"

type Gig = Database["public"]["Tables"]["gigs"]["Row"]
type GigResponse = Database["public"]["Tables"]["gig_responses"]["Row"]

export default function GigDetailsPage() {
  const { user, profile, refreshProfile } = useAuth()
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const gigId = params.id as string

  const [gig, setGig] = useState<Gig | null>(null)
  const [gigResponses, setGigResponses] = useState<GigResponse[]>([])
  const [authorProfile, setAuthorProfile] = useState<any>(null)
  const [contactDetails, setContactDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState(false)
  const [hasResponded, setHasResponded] = useState(false)
  const [showContactInfo, setShowContactInfo] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }
    fetchGigDetails()
  }, [user, gigId])

  const fetchGigDetails = async () => {
    try {
      // Buscar detalhes do gig
      const { data: gigData, error: gigError } = await supabase.from("gigs").select("*").eq("id", gigId).single()

      if (gigError) {
        console.error("Error fetching gig:", gigError)
        toast({
          title: "Erro",
          description: "Gig não encontrada",
          variant: "destructive",
        })
        router.push("/dashboard")
        return
      }

      setGig(gigData)

      // Buscar perfil do autor usando RPC
      const { data: authorData } = await supabase.rpc("get_profile_by_id", {
        user_id: gigData.author_id,
      })

      setAuthorProfile(authorData)

      // Buscar respostas do gig
      const { data: responsesData } = await supabase.from("gig_responses").select("*").eq("gig_id", gigId)

      setGigResponses(responsesData || [])

      // Verificar se o usuário já respondeu
      if (user) {
        const userResponse = responsesData?.find((r) => r.responder_id === user.id)
        setHasResponded(!!userResponse)
        setShowContactInfo(!!userResponse)

        if (userResponse) {
          // Tentar buscar detalhes desbloqueados
          const contactResult = await ContactViewService.viewContact(user.id, gigId)
          if (contactResult.success) {
            setContactDetails(contactResult.contactInfo)
          }
        }
      }
    } catch (err) {
      console.error("Error:", err)
      toast({
        title: "Erro",
        description: "Erro ao carregar detalhes do biskate",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRespond = async () => {
    if (!user || !profile || !gig) return

    // Verificar se pode responder usando a função RPC
    const { data: canRespond } = await supabase.rpc("can_user_respond", { user_id: user.id })

    if (!canRespond) {
      toast({
        title: "Limite atingido",
        description: "Você atingiu o limite de respostas do seu plano. Faça upgrade para continuar.",
        variant: "destructive",
      })
      return
    }

    // Verificar se é o próprio autor
    if (gig.author_id === user.id) {
      toast({
        title: "Ação não permitida",
        description: "Você não pode responder à sua própria gig",
        variant: "destructive",
      })
      return
    }

    setResponding(true)

    try {
      // Criar resposta
      const { error: responseError } = await supabase.from("gig_responses").insert({
        gig_id: gigId,
        responder_id: user.id,
      })

      if (responseError) {
        toast({
          title: "Erro",
          description: responseError.message,
          variant: "destructive",
        })
        setResponding(false)
        return
      }

      // Atualizar contador de respostas e registar visualização via serviço
      // Isto garante que o contacto fica desbloqueado
      const viewResult = await ContactViewService.viewContact(user.id, gigId)

      if (!viewResult.success) {
        console.warn("Aviso: Falha ao registar visualização de contacto após resposta", viewResult.error)
      } else {
        setContactDetails(viewResult.contactInfo)
      }

      // Atualizar estado local
      setHasResponded(true)
      setShowContactInfo(true)
      await refreshProfile()
      await fetchGigDetails()

      toast({
        title: "Resposta enviada!",
        description: "Sua resposta foi enviada com sucesso. Agora você pode ver as informações de contacto.",
      })
    } catch (err) {
      console.error("Error responding to gig:", err)
      toast({
        title: "Erro",
        description: "Erro ao enviar resposta",
        variant: "destructive",
      })
    } finally {
      setResponding(false)
    }
  }

  const getMaxResponses = (plan: string) => {
    switch (plan) {
      case "free":
        return 1
      case "essential":
        return 50
      case "pro":
        return 150
      case "unlimited":
        return Number.POSITIVE_INFINITY
      default:
        return 0
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            Pendente
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Aprovado
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Rejeitado
          </Badge>
        )
      case "in_progress":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Em Progresso
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
            Concluído
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            Cancelado
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (!gig) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card>
          <CardContent className="p-8">
            <p className="text-center text-gray-500">Gig não encontrada</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <div className="ml-4">
              <div className="text-2xl font-bold text-indigo-600">
                GIG<span className="text-orange-500">H</span>UB
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Gig Details */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl mb-2">{gig.title}</CardTitle>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(gig.status)}
                    {gig.is_premium && (
                      <Badge className="bg-orange-100 text-orange-800 border-orange-200">Premium</Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-green-600">€{Number(gig.price).toFixed(2)}</div>
                  <div className="text-sm text-gray-500">Preço proposto</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Descrição</h3>
                <p className="text-gray-700 leading-relaxed">{gig.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-500">Localização</div>
                    <div className="font-medium">{gig.location}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-500">Tempo Estimado</div>
                    <div className="font-medium">{gig.estimated_time}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Euro className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-500">Categoria</div>
                    <div className="font-medium">{gig.category}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information - Novo sistema de monetização */}
          {gig.status === "approved" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Informações de Contacto
                </CardTitle>
              </CardHeader>
              <CardContent>
                {gig.author_id === user?.id ? (
                  // Se é o próprio autor, mostrar as próprias informações
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <User className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">Nome</div>
                        <div className="font-medium">{profile?.full_name || "Não informado"}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">Email</div>
                        <div className="font-medium">{user?.email}</div>
                      </div>
                    </div>
                  </div>
                ) : showContactInfo && contactDetails ? (
                  // MOSTRAR CONTACTO DESBLOQUEADO INLINE
                  <div className="space-y-4">
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        Contacto desbloqueado com sucesso!
                      </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      <div className="flex items-start space-x-3">
                        <div className="bg-indigo-100 p-2 rounded-full">
                          <User className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 font-medium">Nome Completo</p>
                          <p className="font-semibold text-gray-900">{contactDetails.fullName}</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="bg-indigo-100 p-2 rounded-full">
                          <Mail className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 font-medium">Email</p>
                          <p className="font-semibold text-gray-900">{contactDetails.email}</p>
                        </div>
                      </div>

                      {contactDetails.phone && (
                        <div className="flex items-start space-x-3">
                          <div className="bg-indigo-100 p-2 rounded-full">
                            <Phone className="h-5 w-5 text-indigo-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 font-medium">Telefone</p>
                            <p className="font-semibold text-gray-900">{contactDetails.phone}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  // Se não é o autor, mostrar botão de visualização
                  <div className="text-center space-y-4">
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <Lock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <h3 className="font-medium text-lg mb-2">Contacto Protegido</h3>
                      <p className="text-gray-600 text-sm mb-4">
                        Para proteger a privacidade, as informações de contacto estão ocultas. Clique no botão abaixo
                        para revelar os dados de contacto.
                      </p>
                      <ContactViewButton
                        gigId={gigId}
                        gigTitle={gig.title}
                        authorName={authorProfile?.full_name || "Cliente"}
                        size="lg"
                      />
                    </div>

                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        💡 <strong>Como funciona:</strong> Ao revelar o contacto, você consumirá 1 crédito do seu plano.
                        Após a revelação, você terá acesso permanente a estas informações para este gig.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Proposal Section */}
          {gig.status === "approved" && (
            <Card>
              <CardHeader>
                <CardTitle>Enviar Proposta Profissional</CardTitle>
              </CardHeader>
              <CardContent>
                {hasResponded ? (
                  <Alert>
                    <AlertDescription>
                      ✅ Você já enviou uma proposta para esta gig. Use o chat abaixo para negociar os detalhes.
                    </AlertDescription>
                  </Alert>
                ) : gig.author_id === user?.id ? (
                  <Alert>
                    <AlertDescription>
                      Esta é a sua própria gig. Você não pode enviar propostas para ela.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    <Alert>
                      <AlertDescription>
                        💡 <strong>Sistema de Propostas:</strong> Envie uma proposta detalhada com preço, prazo e
                        entregáveis. O cliente poderá aceitar, rejeitar ou fazer uma contraproposta.
                      </AlertDescription>
                    </Alert>

                    <CreateProposalModal
                      gig={gig}
                      onProposalCreated={() => {
                        setHasResponded(true)
                        fetchGigDetails()
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Chat Section - Mostrar apenas se já respondeu */}
          {hasResponded && gig.status === "approved" && authorProfile && (
            <Card>
              <CardHeader>
                <CardTitle>Negociação</CardTitle>
              </CardHeader>
              <CardContent>
                <ChatInterface
                  conversationId={`${gigId}-${user?.id}`}
                  gigTitle={gig.title}
                  otherParticipant={{
                    id: gig.author_id,
                    name: authorProfile.full_name || "Cliente",
                    avatar: authorProfile.avatar_url || undefined,
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* Responses Count */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {gigResponses.length} {gigResponses.length === 1 ? "resposta" : "respostas"} recebidas
                </span>
                {gig.author_id === user?.id && (
                  <Link href={`/dashboard/gigs/${gigId}/responses`}>
                    <Button variant="outline" size="sm">
                      Ver Respostas
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
