"use client"

import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/database.types"
import { NotificationTriggers } from "@/lib/notifications/notification-triggers"
import { PlanLimitsService } from "@/lib/monetization/plan-limits-service"
import { ContactViewService } from "@/lib/monetization/contact-view-service"

type GigResponse = Database["public"]["Tables"]["gig_responses"]["Row"]
type ProposalTemplate = Database["public"]["Tables"]["proposal_templates"]["Row"]
type Conversation = Database["public"]["Tables"]["conversations"]["Row"]
type Message = Database["public"]["Tables"]["messages"]["Row"]
type Negotiation = Database["public"]["Tables"]["negotiations"]["Row"]

export interface ProposalData {
  gig_id: string
  proposal_title: string
  proposal_description: string
  proposed_price: number
  timeline_days: number
  deliverables: string[]
  terms_conditions?: string
  attachments?: any[]
  expires_at?: string
}

export interface CounterProposalData extends ProposalData {
  parent_proposal_id: string
  is_counter_proposal: true
}

export class ProposalService {
  /**
   * Criar uma nova proposta
   */
  static async createProposal(
    data: ProposalData,
    providerId: string,
  ): Promise<{ data: GigResponse | null; error: any }> {
    try {
      console.log("📝 Criando proposta:", data.proposal_title)

      // 1. Verificar e Consumir Quotas
      // Verificar quota de propostas
      const canPropose = await PlanLimitsService.canPerformAction(providerId, "proposal")
      if (!canPropose.allowed) {
        return { data: null, error: { message: "Limite de propostas atingido. Faça upgrade do seu plano." } }
      }

      // Verificar quota de visualização de contacto (necessário para responder)
      // Nota: Algumas lógicas podem permitir proposta sem ver contacto, mas o requisito diz que contacto deve ficar disponível.
      const canView = await ContactViewService.canViewContact(providerId, data.gig_id)

      // Se ainda não viu, precisa de crédito
      if (canView.canView && !canView.reason?.includes("already_viewed")) {
        // Se não tem crédito para ver, bloqueia? Ou avisa? 
        // Assumindo bloqueio pois o user quer "contact/respond... so does the rest of data"
        if (canView.reason === "insufficient_credits") {
          return { data: null, error: { message: "Créditos insuficientes para desbloquear contacto." } }
        }
      }

      // Consumir quota de proposta
      const consumedProposal = await PlanLimitsService.consumeQuota(providerId, "proposal", data.gig_id, "gigs")
      if (!consumedProposal.success) {
        return { data: null, error: { message: consumedProposal.error || "Erro ao processar quota de proposta" } }
      }

      // Desbloquear Contacto (Consumir quota de visualização se necessário)
      // Isto garante que o chat e dados ficam disponíveis
      await ContactViewService.viewContact(providerId, data.gig_id)

      const proposalData = {
        gig_id: data.gig_id,
        responder_id: providerId,
        proposal_title: data.proposal_title,
        proposal_description: data.proposal_description,
        proposed_price: data.proposed_price,
        timeline_days: data.timeline_days,
        deliverables: data.deliverables,
        terms_conditions: data.terms_conditions,
        attachments: data.attachments || [],
        expires_at: data.expires_at,
        status: "pending",
        created_at: new Date().toISOString(),
      }

      const { data: proposal, error } = await supabase.from("gig_responses").insert(proposalData).select().single()

      if (error) {
        console.error("❌ Erro ao criar proposta:", error)
        return { data: null, error }
      }

      console.log("✅ Proposta criada:", proposal.id)

      // Criar conversa automaticamente
      await this.createConversation(data.gig_id, providerId)

      // Disparar Notificação para o autor do Gig
      try {
        // Buscar informações do Gig e do autor
        const { data: gigData } = await supabase
          .from("gigs")
          .select("title, author_id")
          .eq("id", data.gig_id)
          .single()

        if (gigData) {
          // Buscar nome do proponente
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", providerId)
            .single()

          await NotificationTriggers.triggerResponseReceived(
            proposal.id,
            data.gig_id,
            gigData.title,
            gigData.author_id,
            profile?.full_name || "Alguém"
          )
        }
      } catch (err) {
        console.warn("⚠️ Falha ao disparar notificação de proposta:", err)
      }

      return { data: proposal, error: null }
    } catch (err) {
      console.error("❌ Erro inesperado:", err)
      return { data: null, error: err }
    }
  }

  /**
   * Criar contraproposta
   */
  static async createCounterProposal(
    data: CounterProposalData,
    userId: string,
  ): Promise<{ data: GigResponse | null; error: any }> {
    try {
      console.log("🔄 Criando contraproposta para:", data.parent_proposal_id)

      const counterProposalData = {
        gig_id: data.gig_id,
        responder_id: userId,
        proposal_title: data.proposal_title,
        proposal_description: data.proposal_description,
        proposed_price: data.proposed_price,
        timeline_days: data.timeline_days,
        deliverables: data.deliverables,
        terms_conditions: data.terms_conditions,
        attachments: data.attachments || [],
        expires_at: data.expires_at,
        is_counter_proposal: true,
        parent_proposal_id: data.parent_proposal_id,
        status: "pending",
        created_at: new Date().toISOString(),
      }

      const { data: counterProposal, error } = await supabase
        .from("gig_responses")
        .insert(counterProposalData)
        .select()
        .single()

      if (error) {
        console.error("❌ Erro ao criar contraproposta:", error)
        return { data: null, error }
      }

      console.log("✅ Contraproposta criada:", counterProposal.id)
      return { data: counterProposal, error: null }
    } catch (err) {
      console.error("❌ Erro inesperado:", err)
      return { data: null, error: err }
    }
  }

  /**
   * Aceitar proposta
   */
  static async acceptProposal(proposalId: string, userId: string): Promise<{ error: any }> {
    try {
      console.log("✅ Aceitando proposta:", proposalId)

      const { error } = await supabase
        .from("gig_responses")
        .update({
          status: "accepted",
          updated_at: new Date().toISOString(),
        })
        .eq("id", proposalId)

      if (error) {
        console.error("❌ Erro ao aceitar proposta:", error)
        return { error }
      }

      // Atualizar gig para "in_progress"
      const { data: proposal } = await supabase
        .from("gig_responses")
        .select("gig_id, responder_id")
        .eq("id", proposalId)
        .single()

      if (proposal) {
        await supabase
          .from("gigs")
          .update({
            status: "in_progress",
            updated_at: new Date().toISOString(),
          })
          .eq("id", proposal.gig_id)

        // Disparar Notificação para o proponente
        try {
          const { data: gig } = await supabase.from("gigs").select("title").eq("id", proposal.gig_id).single()
          const { data: clientProfile } = await supabase.from("profiles").select("full_name").eq("id", userId).single()

          if (gig) {
            await NotificationTriggers.triggerResponseAccepted(
              proposalId,
              proposal.gig_id,
              gig.title,
              proposal.responder_id,
              clientProfile?.full_name || "O cliente"
            )
          }
        } catch (err) {
          console.warn("⚠️ Falha ao disparar notificação de aceite:", err)
        }
      }

      console.log("✅ Proposta aceita com sucesso")
      return { error: null }
    } catch (err) {
      console.error("❌ Erro inesperado:", err)
      return { error: err }
    }
  }

  /**
   * Rejeitar proposta
   */
  static async rejectProposal(proposalId: string, reason?: string): Promise<{ error: any }> {
    try {
      console.log("❌ Rejeitando proposta:", proposalId)

      const { error } = await supabase
        .from("gig_responses")
        .update({
          status: "rejected",
          message: reason || "Proposta rejeitada",
          updated_at: new Date().toISOString(),
        })
        .eq("id", proposalId)

      if (error) {
        console.error("❌ Erro ao rejeitar proposta:", error)
        return { error }
      }

      // Disparar Notificação para o proponente
      try {
        const { data: proposal } = await supabase
          .from("gig_responses")
          .select("gig_id, responder_id, client_id")
          .eq("id", proposalId)
          .single()

        if (proposal) {
          const { data: gig } = await supabase.from("gigs").select("title").eq("id", proposal.gig_id).single()
          const { data: clientProfile } = await supabase.from("profiles").select("full_name").eq("id", proposal.client_id).single()

          if (gig) {
            await NotificationTriggers.triggerResponseRejected(
              proposalId,
              proposal.gig_id,
              gig.title,
              proposal.responder_id,
              clientProfile?.full_name || "O cliente",
              reason
            )
          }
        }
      } catch (err) {
        console.warn("⚠️ Falha ao disparar notificação de rejeição:", err)
      }

      console.log("✅ Proposta rejeitada")
      return { error: null }
    } catch (err) {
      console.error("❌ Erro inesperado:", err)
      return { error: err }
    }
  }

  /**
   * Buscar propostas de um gig
   */
  static async getGigProposals(gigId: string): Promise<{ data: GigResponse[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from("gig_responses")
        .select(`
          *,
          profiles:responder_id (
            full_name,
            avatar_url,
            rating
          )
        `)
        .eq("gig_id", gigId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("❌ Erro ao buscar propostas:", error)
        return { data: [], error }
      }

      return { data: data || [], error: null }
    } catch (err) {
      console.error("❌ Erro inesperado:", err)
      return { data: [], error: err }
    }
  }

  /**
   * Criar conversa
   */
  static async createConversation(
    gigId: string,
    providerId: string,
  ): Promise<{ data: Conversation | null; error: any }> {
    try {
      // Buscar o autor do gig
      const { data: gig } = await supabase.from("gigs").select("author_id").eq("id", gigId).single()

      if (!gig) {
        return { data: null, error: { message: "Gig não encontrado" } }
      }

      const conversationData = {
        gig_id: gigId,
        client_id: gig.author_id,
        provider_id: providerId,
        status: "active",
        created_at: new Date().toISOString(),
      }

      const { data: conversation, error } = await supabase
        .from("conversations")
        .upsert(conversationData, {
          onConflict: "gig_id,client_id,provider_id",
        })
        .select()
        .single()

      if (error) {
        console.error("❌ Erro ao criar conversa:", error)
        return { data: null, error }
      }

      return { data: conversation, error: null }
    } catch (err) {
      console.error("❌ Erro inesperado:", err)
      return { data: null, error: err }
    }
  }

  /**
   * Enviar mensagem
   */
  static async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    messageType: "text" | "image" | "file" | "proposal" | "system" = "text",
    attachments?: any[],
  ): Promise<{ data: Message | null; error: any }> {
    try {
      const messageData = {
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        message_type: messageType,
        attachments: attachments || [],
        created_at: new Date().toISOString(),
      }

      const { data: message, error } = await supabase.from("messages").insert(messageData).select().single()

      if (error) {
        console.error("❌ Erro ao enviar mensagem:", error)
        return { data: null, error }
      }

      // Atualizar última mensagem da conversa
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId)

      return { data: message, error: null }
    } catch (err) {
      console.error("❌ Erro inesperado:", err)
      return { data: null, error: err }
    }
  }

  /**
   * Buscar mensagens de uma conversa
   */
  static async getConversationMessages(conversationId: string): Promise<{ data: Message[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          sender:profiles!sender_id (
            full_name,
            avatar_url
          )
        `)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("❌ Erro ao buscar mensagens:", error)
        return { data: [], error }
      }

      return { data: data || [], error: null }
    } catch (err) {
      console.error("❌ Erro inesperado:", err)
      return { data: [], error: err }
    }
  }

  /**
   * Buscar conversas do usuário
   */
  static async getUserConversations(userId: string): Promise<{ data: Conversation[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          *,
          gig:gigs (
            title,
            price
          ),
          client:profiles!client_id (
            full_name,
            avatar_url
          ),
          provider:profiles!provider_id (
            full_name,
            avatar_url
          )
        `)
        .or(`client_id.eq.${userId},provider_id.eq.${userId}`)
        .order("last_message_at", { ascending: false })

      if (error) {
        console.error("❌ Erro ao buscar conversas:", error)
        return { data: [], error }
      }

      return { data: data || [], error: null }
    } catch (err) {
      console.error("❌ Erro inesperado:", err)
      return { data: [], error: err }
    }
  }

  /**
   * Salvar template de proposta
   */
  static async saveProposalTemplate(
    providerId: string,
    templateData: {
      name: string
      title: string
      description: string
      deliverables: string[]
      terms_conditions?: string
      category_id?: string
      is_default?: boolean
    },
  ): Promise<{ data: ProposalTemplate | null; error: any }> {
    try {
      const { data: template, error } = await supabase
        .from("proposal_templates")
        .insert({
          provider_id: providerId,
          ...templateData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        console.error("❌ Erro ao salvar template:", error)
        return { data: null, error }
      }

      return { data: template, error: null }
    } catch (err) {
      console.error("❌ Erro inesperado:", err)
      return { data: null, error: err }
    }
  }

  /**
   * Buscar templates do prestador
   */
  static async getProviderTemplates(providerId: string): Promise<{ data: ProposalTemplate[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from("proposal_templates")
        .select("*")
        .eq("provider_id", providerId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("❌ Erro ao buscar templates:", error)
        return { data: [], error }
      }

      return { data: data || [], error: null }
    } catch (err) {
      console.error("❌ Erro inesperado:", err)
      return { data: [], error: err }
    }
  }
}
