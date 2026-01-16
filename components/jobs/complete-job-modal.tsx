
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
import { createClient } from "@/lib/supabase/client"

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

    const [uploading, setUploading] = useState(false)
    const supabase = createClient()

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return

        setUploading(true)
        const files = Array.from(e.target.files)
        const newAttachments: string[] = []
        const MAX_SIZE = 5 * 1024 * 1024 // 5MB

        try {
            for (const file of files) {
                if (file.size > MAX_SIZE) {
                    toast({
                        title: "Ficheiro muito grande",
                        description: `O ficheiro ${file.name} excede 5MB.`,
                        variant: "destructive"
                    })
                    continue
                }

                const fileExt = file.name.split('.').pop()
                const fileName = `${user?.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

                const { error: uploadError } = await supabase.storage
                    .from('gig-attachments')
                    .upload(fileName, file)

                if (uploadError) {
                    console.error('Upload error:', uploadError)
                    toast({
                        title: "Erro no upload",
                        description: `Falha ao enviar ${file.name}.`,
                        variant: "destructive"
                    })
                    continue
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('gig-attachments')
                    .getPublicUrl(fileName)

                newAttachments.push(publicUrl)
            }

            if (newAttachments.length > 0) {
                setAttachments(prev => [...prev, ...newAttachments])
                toast({
                    title: "Upload concluído",
                    description: `${newAttachments.length} foto(s) adicionada(s).`
                })
            }
        } catch (error) {
            console.error('Upload process error:', error)
            toast({ title: "Erro", description: "Ocorreu um erro ao processar as imagens.", variant: "destructive" })
        } finally {
            setUploading(false)
            // Reset input
            e.target.value = ''
        }
    }

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index))
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
                        <Label>Fotos / Comprovativos</Label>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <Input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    id="file-upload"
                                />
                                <Label htmlFor="file-upload" className="cursor-pointer flex items-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                                    <Upload className="h-4 w-4" />
                                    Selecionar Fotos
                                </Label>
                                <span className="text-xs text-muted-foreground">
                                    {uploading ? "A enviar..." : "Máx: 5MB por ficheiro"}
                                </span>
                            </div>

                            {/* Upload Progress */}
                            {uploading && (
                                <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-primary h-full animate-progress-indeterminate origin-left" />
                                </div>
                            )}

                            {/* Preview Grid */}
                            {attachments.length > 0 && (
                                <div className="grid grid-cols-3 gap-2 mt-2">
                                    {attachments.map((url, idx) => (
                                        <div key={idx} className="relative group aspect-square border rounded-lg overflow-hidden bg-gray-100">
                                            <Image
                                                src={url}
                                                alt={`Proof ${idx + 1}`}
                                                fill
                                                className="object-cover"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeAttachment(idx)}
                                                className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white rounded-full p-1 opacity-100 transition-opacity"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
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
