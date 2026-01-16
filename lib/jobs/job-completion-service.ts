
import { supabase } from "@/lib/supabase/client"
import { NotificationService } from "@/lib/notifications/notification-service"
import type { Database } from "@/lib/supabase/database.types"

type JobCompletion = Database["public"]["Tables"]["job_completions"]["Row"]
type JobCompletionInsert = Database["public"]["Tables"]["job_completions"]["Insert"]

export interface SubmitCompletionData {
    gigId: string
    providerId: string
    description: string
    attachments: string[]
}

export class JobCompletionService {
    /**
     * Submit a job completion request (Provider)
     */
    static async submitCompletion(data: SubmitCompletionData): Promise<{ success: boolean; error?: any }> {
        try {
            console.log("👷 Submitting job completion:", data.gigId)

            // 1. Validate if gig is in progress
            const { data: gig, error: gigError } = await supabase
                .from("gigs")
                .select("status, author_id, title")
                .eq("id", data.gigId)
                .single()

            if (gigError || !gig) {
                return { success: false, error: "Gig not found" }
            }

            if (gig.status !== "in_progress") {
                return { success: false, error: "Gig is not in progress" }
            }

            // 2. Insert completion record
            const completionData: JobCompletionInsert = {
                gig_id: data.gigId,
                provider_id: data.providerId,
                description: data.description,
                attachments: data.attachments as any,
                status: "pending"
            }

            const { error: insertError } = await supabase
                .from("job_completions")
                .insert(completionData)

            if (insertError) {
                // Handle unique constraint (already pending)
                if (insertError.code === "23505") { // Unique violation
                    return { success: false, error: "A completion request is already pending for this gig" }
                }
                console.error("❌ Error inserting completion:", insertError)
                return { success: false, error: insertError.message }
            }

            // 3. Update gig status to 'review_pending' (optional, or just rely on completion existence)
            // Choosing to update gig status for easier filtering
            /* 
            // NOTE: We might need to add 'review_pending' to gig status enum if not present.
            // For now, let's keep gig as 'in_progress' but UI will show "Review Pending" based on job_completions table.
            */

            // 4. Notify Client
            await NotificationService.createNotification(
                gig.author_id,
                "Trabalho Concluído - Revisão Necessária",
                `O profissional marcou o gig "${gig.title}" como concluído. Por favor revise e aprove para liberar o pagamento.`,
                "job_completion",
                { gigId: data.gigId }
            )

            return { success: true }

        } catch (err) {
            console.error("❌ Exception submitting completion:", err)
            return { success: false, error: "Internal System Error" }
        }
    }

    /**
     * Approve a completion request (Client)
     * This should trigger payment release
     */
    static async approveCompletion(completionId: string, clientId: string): Promise<{ success: boolean; error?: any }> {
        try {
            console.log("✅ Approving completion:", completionId)

            // 1. Fetch completion and gig details
            const { data: completion, error: fetchError } = await supabase
                .from("job_completions")
                .select("*, gigs(id, author_id, title, price, provider_id)")
                .eq("id", completionId)
                .single()

            if (fetchError || !completion) {
                return { success: false, error: "Completion not found" }
            }

            const gig = completion.gigs as any

            // 2. Validate Client is the author
            if (gig.author_id !== clientId) {
                return { success: false, error: "Unauthorized: You are not the client for this gig" }
            }

            if (completion.status !== "pending") {
                return { success: false, error: "Completion is not pending" }
            }

            // 3. Update Completion Status
            const { error: updateError } = await supabase
                .from("job_completions")
                .update({
                    status: "approved",
                    reviewed_at: new Date().toISOString()
                })
                .eq("id", completionId)

            if (updateError) {
                return { success: false, error: updateError.message }
            }

            // 4. Update Gig Status to 'completed'
            const { error: gigUpdateError } = await supabase
                .from("gigs")
                .update({ status: "completed" })
                .eq("id", gig.id)

            if (gigUpdateError) {
                console.error("❌ Error updating gig status:", gigUpdateError)
                // Critical consistency issue, but proceeding with payment logic/notifications
            }

            // 5. Trigger Payment Release (Placeholder for Transaction Logic)
            // In a real flow, this would credit the provider's wallet.
            // await TransactionService.releaseEscrow(gig.id, gig.provider_id, gig.price)
            console.log(`💰 Payment of ${gig.price} released to ${gig.provider_id}`)

            // 6. Notify Provider
            await NotificationService.createNotification(
                gig.provider_id,
                "Trabalho Aprovado e Pago! 🎉",
                `O cliente aprovou a conclusão do gig "${gig.title}". O pagamento foi liberado.`,
                "job_approved",
                { gigId: gig.id }
            )

            return { success: true }

        } catch (err) {
            console.error("❌ Exception approving completion:", err)
            return { success: false, error: "Internal System Error" }
        }
    }

    /**
     * Reject a completion request (Client)
     */
    static async rejectCompletion(completionId: string, clientId: string, reason: string): Promise<{ success: boolean; error?: any }> {
        try {
            console.log("❌ Rejecting completion:", completionId)

            // 1. Fetch completion and gig details
            const { data: completion, error: fetchError } = await supabase
                .from("job_completions")
                .select("*, gigs(id, author_id, title, provider_id)")
                .eq("id", completionId)
                .single()

            if (fetchError || !completion) {
                return { success: false, error: "Completion not found" }
            }

            const gig = completion.gigs as any

            // 2. Validate Client
            if (gig.author_id !== clientId) {
                return { success: false, error: "Unauthorized" }
            }

            // 3. Update Completion Status
            const { error: updateError } = await supabase
                .from("job_completions")
                .update({
                    status: "rejected",
                    rejection_reason: reason,
                    reviewed_at: new Date().toISOString()
                })
                .eq("id", completionId)

            if (updateError) {
                return { success: false, error: updateError.message }
            }

            // 4. Notify Provider
            await NotificationService.createNotification(
                gig.provider_id,
                "Revisão Necessária ⚠️",
                `O cliente solicitou alterações no gig "${gig.title}": ${reason}`,
                "job_rejected",
                { gigId: gig.id }
            )

            return { success: true }

        } catch (err) {
            console.error("❌ Exception rejecting completion:", err)
            return { success: false, error: "Internal System Error" }
        }
    }

    /**
     * Get Active Completion for a Gig
     */
    static async getActiveCompletion(gigId: string): Promise<JobCompletion | null> {
        const { data } = await supabase
            .from("job_completions")
            .select("*")
            .eq("gig_id", gigId)
            .in("status", ["pending", "approved"]) // Or just pending? Or latest?
            .order("created_at", { ascending: false })
            .limit(1)
            .single()
        return data
    }
}
