
"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowLeft, MapPin, Clock, Euro, MessageSquare, Calendar } from "lucide-react"
import Link from "next/link"
import { ReviewCompletionSection } from "@/components/jobs/review-completion-section"

export default function ClientGigDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const { user } = useAuth()
    const gigId = params.id as string

    const [gig, setGig] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (user && gigId) {
            fetchGigDetails()
        }
    }, [user, gigId])

    const fetchGigDetails = async () => {
        try {
            const { data, error } = await supabase
                .from("gigs")
                .select("*")
                .eq("id", gigId)
                .single()

            if (error) throw error

            // Verify ownership
            if (data.author_id !== user?.id) {
                router.push("/dashboard/my-gigs")
                return
            }

            setGig(data)
        } catch (err) {
            console.error("Error fetching gig:", err)
            router.push("/dashboard/my-gigs")
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    if (!gig) return null

    return (
        <div className="container mx-auto p-6 max-w-4xl space-y-6">
            <Link href="/dashboard/my-gigs">
                <Button variant="ghost" size="sm" className="mb-4">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar para Meus Gigs
                </Button>
            </Link>

            {/* Review Section (Top Priority if Pending) */}
            <ReviewCompletionSection
                gigId={gigId}
                gigTitle={gig.title}
                onStatusChange={fetchGigDetails}
            />

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-2xl mb-1">{gig.title}</CardTitle>
                            <CardDescription className="flex items-center gap-2">
                                <Badge>{gig.status}</Badge>
                                <span>{new Date(gig.created_at).toLocaleDateString()}</span>
                            </CardDescription>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-green-600">€{gig.price}</div>
                            <div className="text-sm text-gray-500">Orçamento</div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex gap-6 text-sm text-gray-600">
                        <div className="flex items-center"><MapPin className="h-4 w-4 mr-1" /> {gig.location || "Remoto"}</div>
                        <div className="flex items-center"><Clock className="h-4 w-4 mr-1" /> {gig.estimated_duration} {gig.duration_unit}</div>
                        <div className="flex items-center"><Badge variant="outline">{gig.category}</Badge></div>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-2">Descrição</h3>
                        <p className="text-gray-700 whitespace-pre-wrap">{gig.description}</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Propostas Recebidas
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-6 text-gray-500">
                        <p>Gerencie as propostas na aba <Link href={`/dashboard/gigs/${gigId}/responses`} className="text-blue-600 underline">Respostas</Link></p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
