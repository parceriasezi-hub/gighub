
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle, XCircle, AlertTriangle, ExternalLink, Loader2 } from "lucide-react"
import { JobCompletionService } from "@/lib/jobs/job-completion-service"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

interface ReviewCompletionSectionProps {
    gigId: string
    gigTitle: string
    onStatusChange: () => void
}

export function ReviewCompletionSection({ gigId, gigTitle, onStatusChange }: ReviewCompletionSectionProps) {
    const { user } = useAuth()
    const { toast } = useToast()

    const [completion, setCompletion] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(false)
    const [rejectReason, setRejectReason] = useState("")
    const [rejectOpen, setRejectOpen] = useState(false)

    useEffect(() => {
        fetchCompletion()
    }, [gigId])

    const fetchCompletion = async () => {
        try {
            const data = await JobCompletionService.getActiveCompletion(gigId)
            setCompletion(data)
        } catch (err) {
            console.error("Error loading completion:", err)
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async () => {
        if (!user || !completion) return
        setProcessing(true)
        try {
            const result = await JobCompletionService.approveCompletion(completion.id, user.id)
            if (result.success) {
                toast({
                    title: "Trabalho Aprovado!",
                    description: "O pagamento foi liberado para o profissional."
                })
                fetchCompletion()
                onStatusChange()
            } else {
                toast({ title: "Erro", description: result.error, variant: "destructive" })
            }
        } finally {
            setProcessing(false)
        }
    }

    const handleReject = async () => {
        if (!user || !completion) return
        if (!rejectReason.trim()) {
            toast({ title: "Erro", description: "Indique o motivo da rejeição.", variant: "destructive" })
            return
        }
        setProcessing(true)
        try {
            const result = await JobCompletionService.rejectCompletion(completion.id, user.id, rejectReason)
            if (result.success) {
                toast({
                    title: "Trabalho Rejeitado",
                    description: "O profissional foi notificado para fazer correções."
                })
                setRejectOpen(false)
                fetchCompletion()
                onStatusChange()
            } else {
                toast({ title: "Erro", description: result.error, variant: "destructive" })
            }
        } finally {
            setProcessing(false)
        }
    }

    if (loading) return null // Or skeleton

    if (!completion) return null // No completion request found

    return (
        <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                    <CardTitle>Revisão de Conclusão</CardTitle>
                </div>
                <CardDescription>
                    O profissional marcou este trabalho como concluído. Revise os detalhes abaixo.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {completion.status === "pending" && (
                    <Alert className="bg-white border-blue-200">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        <AlertTitle>Ação Necessária</AlertTitle>
                        <AlertDescription>
                            Por favor aprove para liberar o pagamento ou solicite correções.
                        </AlertDescription>
                    </Alert>
                )}

                {completion.status === "approved" && (
                    <Alert className="bg-green-100 border-green-200">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertTitle className="text-green-800">Aprovado</AlertTitle>
                        <AlertDescription className="text-green-700">
                            Você aprovou este trabalho em {new Date(completion.reviewed_at!).toLocaleDateString()}.
                        </AlertDescription>
                    </Alert>
                )}

                <div className="bg-white p-4 rounded-lg border space-y-3">
                    <h4 className="font-medium text-sm text-gray-700">Descrição do Trabalho:</h4>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded text-sm italic">
                        "{completion.description}"
                    </p>

                    {completion.attachments && completion.attachments.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm text-gray-700">Comprovativos:</h4>
                            <div className="flex flex-wrap gap-2">
                                {completion.attachments.map((url: string, idx: number) => (
                                    <a
                                        key={idx}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block h-20 w-20 border rounded overflow-hidden hover:opacity-80 transition-opacity relative group"
                                    >
                                        <img src={url} alt="Proof" className="h-full w-full object-cover" />
                                        <ExternalLink className="absolute bottom-1 right-1 h-3 w-3 text-white drop-shadow-md opacity-0 group-hover:opacity-100" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {completion.status === "pending" && (
                    <div className="flex gap-3 pt-2">
                        <Button
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            onClick={handleApprove}
                            disabled={processing}
                        >
                            {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                            Aprovar e Pagar
                        </Button>

                        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Rejeitar
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Rejeitar Conclusão</DialogTitle>
                                    <DialogDescription>
                                        Explique ao profissional o que precisa ser corrigido ou melhorado.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="py-2">
                                    <Textarea
                                        placeholder="Motivo da rejeição..."
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                        rows={4}
                                    />
                                </div>
                                <DialogFooter>
                                    <Button variant="ghost" onClick={() => setRejectOpen(false)}>Cancelar</Button>
                                    <Button variant="destructive" onClick={handleReject} disabled={processing}>
                                        Confirmar Rejeição
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
