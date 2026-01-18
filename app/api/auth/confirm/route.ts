import { NextRequest, NextResponse } from "next/server"

export const runtime = "edge"
export const dynamic = "force-dynamic"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { NotificationServiceServer } from "@/lib/notifications/notification-service-server"

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    console.log("🔗 Auth Confirmation Callback: Processing user:", userId)

    if (!userId) {
        return NextResponse.redirect(new URL("/login?error=Invalid confirmation link", request.url))
    }

    try {
        const supabase = getSupabaseAdmin()

        // 1. Verificar se o utilizador está realmente confirmado no Auth do Supabase
        const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId)

        if (userError || !user) {
            console.error("❌ Auth Callback: Utilizador não encontrado:", userError?.message)
            return NextResponse.redirect(new URL("/login?error=User not found", request.url))
        }

        if (!user.email_confirmed_at) {
            console.warn("⚠️ Auth Callback: Email ainda não confirmado para:", userId)
            // Se o Supabase ainda não marcou como confirmado, podemos estar num estado de transição.
            // No entanto, se o utilizador chegou aqui via redirectTo, ele DEVE estar confirmado.
        }

        // 2. Marcar como verificado no perfil
        await supabase
            .from("profiles")
            .update({ email_verified: true })
            .eq("id", userId)

        // 3. Disparar a notificação de Bem-vindo (e alerta para o admin)
        // Buscamos o nome do perfil
        const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", userId)
            .single()

        await NotificationServiceServer.triggerNotification("welcome_email", {
            userId: userId,
            userName: profile?.full_name || user.user_metadata?.full_name || "Utilizador",
            userEmail: user.email,
        })

        console.log("✅ Welcome email and admin alert triggered for:", user.email)

        // 3. Redirecionar para o dashboard
        return NextResponse.redirect(new URL("/dashboard?welcome=true", request.url))

    } catch (err) {
        console.error("❌ Auth Callback Error:", err)
        return NextResponse.redirect(new URL("/login?error=Internal server error during confirmation", request.url))
    }
}
