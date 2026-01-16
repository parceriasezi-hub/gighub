"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { ProposalService } from "@/lib/proposals/proposal-service"
import { Plus, X, FileText, Clock, Euro, Package } from "lucide-react"
import type { Database } from "@/lib/supabase/database.types"

type Gig = Database["public"]["Tables"]["gigs"]["Row"]
type ProposalTemplate = Database["public"]["Tables"]["proposal_templates"]["Row"]

interface CreateProposalModalProps {
  gig: Gig
  onProposalCreated?: () => void
  trigger?: React.ReactNode
}

export function CreateProposalModal({ gig, onProposalCreated, trigger }: CreateProposalModalProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState<ProposalTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")

  const [formData, setFormData] = useState({
    proposal_title: "",
    proposal_description: "",
    proposed_price: gig.price || 0,
    timeline_days: 7,
    deliverables: [""],
    terms_conditions: "",
    expires_at: "",
  })

  useEffect(() => {
    if (open && user) {
      loadTemplates()
    }
  }, [open, user])

  const loadTemplates = async () => {
    if (!user) return

    const { data, error } = await ProposalService.getProviderTemplates(user.id)
    if (!error && data) {
      setTemplates(data)
    }
  }

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId)
    if (template) {
      setFormData({
        proposal_title: template.title,
        proposal_description: template.description,
        proposed_price: gig.price || 0,
        timeline_days: 7,
        deliverables: (template.deliverables as string[]) || [""],
        terms_conditions: template.terms_conditions || "",
        expires_at: "",
      })
      setSelectedTemplate(templateId)
    }
  }

  const handleDeliverableChange = (index: number, value: string) => {
    const newDeliverables = [...formData.deliverables]
    newDeliverables[index] = value
    setFormData({ ...formData, deliverables: newDeliverables })
  }

  const addDeliverable = () => {
    setFormData({
      ...formData,
      deliverables: [...formData.deliverables, ""],
    })
  }

  const removeDeliverable = (index: number) => {
    if (formData.deliverables.length > 1) {
      const newDeliverables = formData.deliverables.filter((_, i) => i !== index)
      setFormData({ ...formData, deliverables: newDeliverables })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)

    try {
      // Validações
      if (!formData.proposal_title.trim()) {
        toast({
          title: "Erro",
          description: "Título da proposta é obrigatório",
          variant: "destructive",
        })
        return
      }

      if (!formData.proposal_description.trim()) {
        toast({
          title: "Erro",
          description: "Descrição da proposta é obrigatória",
          variant: "destructive",
        })
        return
      }

      if (formData.proposed_price <= 0) {
        toast({
          title: "Erro",
          description: "Preço deve ser maior que zero",
          variant: "destructive",
        })
        return
      }

      // Filtrar entregáveis vazios
      const deliverables = formData.deliverables.filter((d) => d.trim())

      if (deliverables.length === 0) {
        toast({
          title: "Erro",
          description: "Pelo menos um entregável é obrigatório",
          variant: "destructive",
        })
        return
      }

      const proposalData = {
        gig_id: gig.id,
        proposal_title: formData.proposal_title.trim(),
        proposal_description: formData.proposal_description.trim(),
        proposed_price: formData.proposed_price,
        timeline_days: formData.timeline_days,
        deliverables,
        terms_conditions: formData.terms_conditions.trim(),
        expires_at: formData.expires_at || undefined,
      }

      const { data, error } = await ProposalService.createProposal(proposalData, user.id)

      if (error) {
        toast({
          title: "Erro",
          description: error.message || "Não foi possível enviar a proposta",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Sucesso!",
        description: "Proposta enviada com sucesso",
      })

      setOpen(false)
      onProposalCreated?.()

      // Reset form
      setFormData({
        proposal_title: "",
        proposal_description: "",
        proposed_price: gig.price || 0,
        timeline_days: 7,
        deliverables: [""],
        terms_conditions: "",
        expires_at: "",
      })
      setSelectedTemplate("")
    } catch (err) {
      console.error("Erro ao criar proposta:", err)
      toast({
        title: "Erro",
        description: "Erro inesperado ao enviar proposta",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="w-full">
            <FileText className="h-4 w-4 mr-2" />
            Enviar Proposta
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Proposta Profissional</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Informações do Gig */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Detalhes do Biskate</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h3 className="font-medium text-sm">{gig.title}</h3>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-3">{gig.description}</p>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Orçamento:</span>
                  <span className="font-medium text-green-600">€{gig.price?.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Localização:</span>
                  <span className="font-medium">{gig.location}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Categoria:</span>
                  <Badge variant="outline" className="text-xs">
                    {gig.category}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Templates */}
            {templates.length > 0 && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-sm">Templates Salvos</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Usar template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Formulário da Proposta */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Título */}
              <div>
                <Label htmlFor="title">Título da Proposta *</Label>
                <Input
                  id="title"
                  value={formData.proposal_title}
                  onChange={(e) => setFormData({ ...formData, proposal_title: e.target.value })}
                  placeholder="Ex: Desenvolvimento completo do seu website"
                  required
                />
              </div>

              {/* Descrição */}
              <div>
                <Label htmlFor="description">Descrição Detalhada *</Label>
                <Textarea
                  id="description"
                  value={formData.proposal_description}
                  onChange={(e) => setFormData({ ...formData, proposal_description: e.target.value })}
                  placeholder="Descreva como vai executar o trabalho, sua experiência relevante, metodologia..."
                  rows={4}
                  required
                />
              </div>

              {/* Preço e Timeline */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">
                    <Euro className="h-4 w-4 inline mr-1" />
                    Preço Proposto (€) *
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.proposed_price}
                    onChange={(e) => setFormData({ ...formData, proposed_price: Number.parseFloat(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="timeline">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Prazo (dias) *
                  </Label>
                  <Input
                    id="timeline"
                    type="number"
                    min="1"
                    value={formData.timeline_days}
                    onChange={(e) => setFormData({ ...formData, timeline_days: Number.parseInt(e.target.value) })}
                    required
                  />
                </div>
              </div>

              {/* Entregáveis */}
              <div>
                <Label>
                  <Package className="h-4 w-4 inline mr-1" />
                  Entregáveis *
                </Label>
                <div className="space-y-2 mt-2">
                  {formData.deliverables.map((deliverable, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={deliverable}
                        onChange={(e) => handleDeliverableChange(index, e.target.value)}
                        placeholder={`Entregável ${index + 1}`}
                        required
                      />
                      {formData.deliverables.length > 1 && (
                        <Button type="button" variant="outline" size="sm" onClick={() => removeDeliverable(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addDeliverable}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar Entregável
                  </Button>
                </div>
              </div>

              {/* Termos e Condições */}
              <div>
                <Label htmlFor="terms">Termos e Condições</Label>
                <Textarea
                  id="terms"
                  value={formData.terms_conditions}
                  onChange={(e) => setFormData({ ...formData, terms_conditions: e.target.value })}
                  placeholder="Condições de pagamento, revisões incluídas, garantias..."
                  rows={3}
                />
              </div>

              {/* Data de Expiração */}
              <div>
                <Label htmlFor="expires">Data de Expiração (Opcional)</Label>
                <Input
                  id="expires"
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                />
              </div>

              {/* Botões */}
              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Enviando..." : "Enviar Proposta"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
