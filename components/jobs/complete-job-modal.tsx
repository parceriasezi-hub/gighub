
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle, Upload, X, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { JobCompletionService } from "@/lib/jobs/job-completion-service"
import Image from "next/image"

// Note: In a real app, integrate a file upload service (e.g. Supabase Storage). 
// For this demo, we might simulate or assume URLs are pasted or simple dummy upload logic.
// Let's assume we handle file selection and "mock" upload to get a URL for the prototype if Storage bucket setup is complex.
// Actually, we should try to support real upload if buckets exist, but to be safe and quick:
// I'll add a simple URL input OR file input that just logs for now if no bucket bucket ready.
// Wait, '20240105_storage_buckets.sql' exists. 'gig-attachments' bucket likely exists.

interface CompleteJobModalProps {
    gigId: string
    gigTitle: string
    onSuccess: () => void
}

export function CompleteJobModal({ gigId, gigTitle, onSuccess }: CompleteJobModalProps) {
    const { user } = useAuth()
    const { toast } = useToast()

    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [description, setDescription] = useState("")
    const [attachments, setAttachments] = useState<string[]>([])

    // Handling file upload simulation for speed, or basic URL input
    const [tempUrl, setTempUrl] = useState("")

    const handleSubmit = async () => {
        if (!user) return
        if (!description.trim()) {
            toast({ title: "Erro", description: "Por favor descreva o trabalho realizado.", variant: "destructive" })
            return
        }

        setLoading(true)

        try {
            const result = await JobCompletionService.submitCompletion({
                gigId,
                providerId: user.id,
                description,
                attachments
            })

            if (result.success) {
                toast({
                    title: "Sucesso!",
                    description: "Trabalho marcado como concluído. Aguardando aprovação do cliente."
                })
                setOpen(false)
                onSuccess()
            } else {
                toast({ title: "Erro", description: result.error, variant: "destructive" })
            }
        } catch (err) {
            toast({ title: "Erro", description: "Ocorreu um erro ao enviar.", variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    const addAttachment = () => {
        if (tempUrl) {
            setAttachments([...attachments, tempUrl])
            setTempUrl("")
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Concluir Job
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Concluir Trabalho</DialogTitle>
                    <DialogDescription>
                        Envie os comprovativos do trabalho realizado para o cliente aprovar o pagamento.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="description">Descrição do que foi feito</Label>
                        <Textarea
                            id="description"
                            placeholder="Descreva as tarefas realizadas e resultados alcançados..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label>Fotos / Comprovativos (URLs)</Label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="https://..."
                                value={tempUrl}
                                onChange={(e) => setTempUrl(e.target.value)}
                            />
                            <Button type="button" variant="secondary" onClick={addAttachment}>Adicionar</Button>
                        </div>

                        {attachments.length > 0 && (
                            <div className="flex gap-2 flex-wrap mt-2">
                                {attachments.map((url, idx) => (
                                    <div key={idx} className="relative group border rounded p-1">
                                        <div className="h-16 w-16 bg-gray-100 flex items-center justify-center overflow-hidden">
                                            {url.match(/\.(jpeg|jpg|gif|png)$/) != null ? (
                                                <img src={url} alt="Proof" className="object-cover h-full w-full" />
                                            ) : (
                                                <span className="text-xs text-gray-500">File</span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 h-4 w-4 flex items-center justify-center text-[10px]"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <p className="text-[10px] text-gray-400">
                            * Para demonstração, insira URLs de imagens. Em produção, usaríamos upload direto.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Enviar para Aprovação
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
