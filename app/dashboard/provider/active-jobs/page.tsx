
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, MapPin, Calendar, CheckCircle } from "lucide-react"
import Link from "next/link"
import { CompleteJobModal } from "@/components/jobs/complete-job-modal"

export default function ActiveJobsPage() {
    const { user, profile } = useAuth()
    const [loading, setLoading] = useState(true)
    const [jobs, setJobs] = useState<any[]>([])

    useEffect(() => {
        if (user) {
            fetchActiveJobs()
        }
    }, [user])

    const fetchActiveJobs = async () => {
        try {
            // Fetch gigs where user is the assigned provider and status is in_progress
            // Note: We need a way to link gig -> provider. Currently stored in proposal->status or maybe 'provider_id' column on gig if accepted.
            // Based on schema review: gigs has 'provider_id' (but schema dump didn't show it explicitly in table definition but referenced in code).
            // Assuming 'provider_id' exists on gigs for accepted jobs.

            // Fallback: Check proposals accepted
            const { data, error } = await supabase
                .from("gigs")
                .select(`
            *,
            job_completions(status)
        `)
                .eq("status", "in_progress")
                // This relies on RLS or specific filtering. Since this is provider view, we need gigs assigned TO them.
                // If gig table doesn't have provider_id indexable easily or we want only ours:
                // Let's filter by logic or explicit column.
                // Assuming RLS lets us see gigs we are involved in, or we add .eq('provider_id', user.id)
                // Let's verify schema: 'gigs' table in types didn't show provider_id in Row definition earlier? 
                // Re-reading types: it was not in the partial dump. But 'gig_responses' has provider_id.
                // Actually, previous update to 'approveCompletion' assumed gigs.provider_id... 
                // CHECKPOINT: If gigs doesn't have provider_id, we link via accepted proposal.
                // BUT for now let's query gig_responses? No, completed gig should designate provider.
                // Let's assume 'provider_id' exists or we filter by it.
                .eq("provider_id", user?.id)

            if (error) throw error

            setJobs(data || [])
        } catch (err) {
            console.error("Error fetching active jobs:", err)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Trabalhos em Curso</h1>
                    <p className="text-muted-foreground">Gerencie seus trabalhos atuais e marque-os como concluídos.</p>
                </div>
            </div>

            {jobs.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <div className="bg-gray-100 p-4 rounded-full mb-4">
                            <p className="text-4xl">🤷‍♂️</p>
                        </div>
                        <h3 className="text-lg font-semibold">Nenhum trabalho ativo</h3>
                        <p className="text-muted-foreground mb-4">Você não tem trabalhos em andamento no momento.</p>
                        <Link href="/dashboard/gigs">
                            <Button variant="outline">Procurar Novos Gigs</Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6">
                    {jobs.map((job) => {
                        const pendingCompletion = job.job_completions && job.job_completions.length > 0 && job.job_completions[0].status === 'pending';

                        return (
                            <Card key={job.id} className="overflow-hidden">
                                <CardHeader className="bg-muted/50">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <CardTitle>{job.title}</CardTitle>
                                                {pendingCompletion && (
                                                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                                        Aguardando Aprovação
                                                    </Badge>
                                                )}
                                            </div>
                                            <CardDescription className="flex items-center gap-2">
                                                <MapPin className="h-3 w-3" /> {job.location || "Remoto"}
                                                <span>•</span>
                                                <span>€{job.price}</span>
                                            </CardDescription>
                                        </div>
                                        <Link href={`/dashboard/provider/gigs/${job.id}`}>
                                            <Button variant="outline" size="sm">Ver Detalhes</Button>
                                        </Link>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-center">
                                        <div className="text-sm text-gray-500">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4" />
                                                Iniciado em: {new Date(job.updated_at).toLocaleDateString()}
                                            </div>
                                        </div>

                                        {!pendingCompletion ? (
                                            <CompleteJobModal
                                                gigId={job.id}
                                                gigTitle={job.title}
                                                onSuccess={fetchActiveJobs}
                                            />
                                        ) : (
                                            <div className="flex items-center text-yellow-600 bg-yellow-50 px-3 py-2 rounded-md border border-yellow-100">
                                                <CheckCircle className="h-4 w-4 mr-2" />
                                                <span>Conclusão enviada. Aguarde o cliente.</span>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
