import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { NotificationServiceServer } from "@/lib/notifications/notification-service-server"
import { logActivity } from "@/lib/logger"

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies()
        const supabase = await createClient()

        console.log("Debug update-status: Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)
        console.log("Debug update-status: Cookies present:", cookieStore.getAll().map(c => c.name))

        // 1. Verify Authentication
        const {
            data: { user },
            error: authError
        } = await supabase.auth.getUser()

        console.log("Debug update-status: User from getUser():", user?.id, "Error:", authError)

        // Fallback check
        if (!user) {
            const { data: { session } } = await supabase.auth.getSession()
            console.log("Debug update-status: Fallback session check:", session?.user?.id)
            if (session?.user) {
                // If getUser fails but getSession succeeds, we might have a token validation issue 
                // but we can proceed with session user if we trust the session 
                // Actually getUser is safer, but this helps debug.
            }
        }

        if (!user) {
            console.error("Debug update-status: No user found, returning 401.")
            return NextResponse.json({ error: "Unauthorized: No active session found" }, { status: 401 })
        }

        const { data: profileData } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single()

        const profile = profileData as any

        if (!profile || profile.role !== "admin") {
            return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
        }

        // 2. Parse Request Body
        const { providerId, status, reason } = await request.json()

        if (!providerId || !status) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        // 3. Update Provider Status using Admin Client (Bypass RLS)
        // We need to update: 
        // 1. The profile role (promote to provider or demote to user)
        // 2. The provider_status in profiles
        // 3. The status in the providers table

        const role = status === "approved" ? "provider" : status === "rejected" ? "user" : "provider_pending"
        // changes_requested also keeps role as provider_pending but updates status to changes_requested

        const { error: profileError } = await (supabaseAdmin
            .from("profiles") as any)
            .update({
                provider_status: status,
                role: role,
                updated_at: new Date().toISOString(),
            })
            .eq("id", providerId)

        if (profileError) {
            console.error("Error updating profile status/role:", profileError)
            throw profileError
        }

        // Update the providers table too if it exists
        const { error: providerTableError } = await (supabaseAdmin
            .from("providers") as any)
            .update({
                status: status,
                updated_at: new Date().toISOString(),
            })
            .eq("user_id", providerId)

        if (providerTableError) {
            // It's possible the provider record doesn't exist yet if they just submitted profile info
            // But usually become-provider creates it.
            console.warn("Notice: Could not update providers table (record might not exist):", providerTableError.message)
        }

        // Trigger Notification (Email + In-App)
        const triggerType =
            status === "approved" ? "provider_approved" :
                status === "rejected" ? "provider_rejected" :
                    status === "changes_requested" ? "admin_requested_changes" : null

        if (triggerType) {
            // We don't await this to ensure fast response, or we can await if we want to catch errors here
            // Since NotificationServiceServer handles errors internally, safe to await or fire-and-forget.
            // Let's await to ensure logging appears in this request trace.
            await NotificationServiceServer.triggerNotification(triggerType, {
                userId: providerId,
                rejectionReason: reason,
                // userId is sufficient, NotificationServiceServer now fetches email/name if missing
            })
        }

        // Log Admin Activity
        await logActivity(user.id, 'admin', 'UPDATE_PROVIDER_STATUS', {
            providerId,
            status,
            reason,
            affectedUser: providerId // Ensure we can trace who was affected
        }, request.headers.get("x-forwarded-for") || "Unknown")

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error in provider status update:", error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        )
    }
}
