"use server"

import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { logActivity } from "@/lib/logger"

export async function createAdminUser(formData: {
    email: string
    full_name: string
    permissions: string[]
    executorId?: string // ID of the admin performing the action
}) {
    const role = "admin"
    const plan = "free"
    try {
        console.log("🚀 Server Action: Criando novo Administrador...", formData.email)

        // 1. Criar utilizador no Auth
        const supabase = getSupabaseAdmin()
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: formData.email,
            password: "GigHubTemporary123!", // Senha temporária padrão
            email_confirm: true,
            user_metadata: {
                full_name: formData.full_name,
            },
        })

        if (authError) {
            console.error("❌ Erro no Auth admin:", authError)
            return { error: authError.message }
        }

        if (!authData.user) {
            return { error: "Erro ao criar utilizador no sistema de autenticação." }
        }

        // 2. O trigger handle_new_user deve criar o perfil automaticamente, 
        // mas vamos garantir que os campos adicionais (role, plan, permissions) sejam atualizados.

        // Pequeno delay para garantir que o trigger processou
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Pequeno delay para garantir que o trigger processou
        await new Promise(resolve => setTimeout(resolve, 1000))

        const { error: profileError } = await supabase
            .from("profiles")
            .update({
                full_name: formData.full_name,
                role: role,
                plan: plan,
                permissions: formData.permissions,
                updated_at: new Date().toISOString(),
            })
            .eq("id", authData.user.id)

        if (profileError) {
            console.error("❌ Erro ao atualizar perfil:", profileError)
            return { error: `Utilizador criado, mas erro ao definir perfil: ${profileError.message}` }
        }

        console.log("✅ Utilizador criado e configurado com sucesso!")

        // Log activity (Server-side)
        if (formData.executorId) {
            await logActivity(
                formData.executorId,
                "admin",
                "CREATE_USER_ADMIN",
                {
                    newUserId: authData.user.id,
                    newUserEmail: formData.email,
                    role: role,
                    plan: plan,
                    permissions: formData.permissions
                }
            )
        }

        revalidatePath("/admin/users")
        return { success: true, userId: authData.user.id }

    } catch (err) {
        console.error("❌ Erro inesperado na criação:", err)
        return { error: "Ocorreu um erro inesperado ao criar o utilizador." }
    }
}

export async function updateAdminUser(userId: string, data: {
    full_name: string
    role: "user" | "provider" | "admin"
    plan: "free" | "essential" | "pro" | "unlimited"
    permissions: string[]
    executorId?: string
    emailForLog?: string
}) {
    try {
        console.log("🚀 Server Action: Atualizando utilizador...", userId)

        const supabase = getSupabaseAdmin()
        const { error } = await supabase
            .from("profiles")
            .update({
                full_name: data.full_name,
                role: data.role,
                plan: data.plan,
                permissions: data.permissions,
                updated_at: new Date().toISOString(),
            })
            .eq("id", userId)

        if (error) {
            console.error("❌ Erro ao atualizar perfil:", error)
            return { error: `Erro ao atualizar perfil: ${error.message}` }
        }

        // 2. Sincronizar com o Auth Metadata para que apareça no Dashboard do Supabase
        const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
            user_metadata: { full_name: data.full_name }
        })

        if (authError) {
            console.warn("⚠️ Perfil atualizado, mas erro ao sincronizar com Auth:", authError.message)
        }

        // Log activity
        if (data.executorId) {
            await logActivity(
                data.executorId,
                "admin",
                "UPDATE_USER_ADMIN",
                {
                    targetUserId: userId,
                    targetUserEmail: data.emailForLog,
                    changes: {
                        role: data.role,
                        plan: data.plan,
                        permissions: data.permissions
                    }
                }
            )
        }

        revalidatePath("/admin/users")
        return { success: true }
    } catch (err) {
        console.error("❌ Erro inesperado ao atualizar:", err)
        return { error: "Erro inesperado ao atualizar utilizador." }
    }
}

export async function deleteAdminUser(userId: string, executorId?: string, userEmailForLog?: string) {
    try {
        console.log("🚀 Server Action: Apagando utilizador...", userId)

        const supabase = getSupabaseAdmin()

        // 1. Apagar do Auth
        const { error: authError } = await supabase.auth.admin.deleteUser(userId)

        if (authError) {
            console.error("❌ Erro ao apagar utilizador do Auth:", authError)
            return { error: `Erro ao apagar utilizador do sistema de autenticação: ${authError.message}` }
        }

        // 2. Tentar apagar do Profile (caso não haja cascade)
        await supabase.from("profiles").delete().eq("id", userId)

        // Log activity
        if (executorId) {
            await logActivity(
                executorId,
                "admin",
                "DELETE_USER_ADMIN",
                { targetUserId: userId, targetUserEmail: userEmailForLog }
            )
        }

        revalidatePath("/admin/users")
        return { success: true }
    } catch (err) {
        console.error("❌ Erro inesperado ao apagar:", err)
        return { error: "Erro inesperado ao apagar utilizador." }
    }
}

export async function testFirebaseConfig(config: {
    projectId: string
    serviceAccountJson?: string
    serverKey?: string
}) {
    try {
        console.log("🚀 Server Action: Testando configuração do Firebase...")

        const results: {
            v1: { success: boolean; message: string }
            legacy: { success: boolean; message: string }
        } = {
            v1: { success: false, message: "Não testado" },
            legacy: { success: false, message: "Não testado" }
        }

        // 1. Testar FCM V1 (Service Account)
        if (config.serviceAccountJson) {
            try {
                // Import client dynamically if needed, or static is fine since we are server side
                const { FCMEdgeClient } = await import("@/lib/fcm/edge-client");

                const serviceAccount = typeof config.serviceAccountJson === 'string'
                    ? JSON.parse(config.serviceAccountJson)
                    : config.serviceAccountJson

                if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
                    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n')
                }

                if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
                    results.v1 = { success: false, message: "JSON de Service Account inválido (project_id, private_key ou client_email em falta)" }
                } else {
                    // Tentar obter um Access Token - isto valida a chave privada real
                    await FCMEdgeClient.getAccessToken(serviceAccount);

                    results.v1 = { success: true, message: "Service Account validado com sucesso (Access Token obtido)." }
                }
            } catch (e: any) {
                console.error("Erro teste V1:", e);
                results.v1 = { success: false, message: `Erro ao validar Service Account: ${e.message}` }
            }
        } else {
            results.v1 = { success: false, message: "Configuração do Service Account em falta" }
        }

        // 2. Testar FCM Legacy (Server Key)
        if (config.serverKey) {
            try {
                // Testar enviando uma mensagem para um token "fake" ou apenas validando a chave com um fetch
                const response = await fetch("https://fcm.googleapis.com/fcm/send", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `key=${config.serverKey}`,
                    },
                    body: JSON.stringify({
                        registration_ids: ["ABC"], // Token dummy
                        dry_run: true
                    }),
                })

                if (response.status === 200) {
                    results.legacy = { success: true, message: "Server Key Legacy válida (dry-run bem sucedido)." }
                } else if (response.status === 401) {
                    results.legacy = { success: false, message: "Server Key Legacy inválida (401 Unauthorized)." }
                } else {
                    const data = await response.json()
                    results.legacy = { success: false, message: `Erro Legacy FCM (Status ${response.status}): ${JSON.stringify(data)}` }
                }
            } catch (e: any) {
                results.legacy = { success: false, message: `Erro ao testar Legacy FCM: ${e.message}` }
            }
        } else {
            results.legacy = { success: false, message: "Server Key Legacy em falta" }
        }

        return { success: true, results }
    } catch (err: any) {
        console.error("❌ Erro inesperado ao testar Firebase:", err)
        return { success: false, error: err.message }
    }
}

export async function getPlatformSettings() {
    try {
        const supabase = getSupabaseAdmin()
        const { data, error } = await supabase
            .from("platform_integrations")
            .select("*")
            .eq("service_name", "general_settings")
            .single()

        if (error) {
            if (error.code === 'PGRST116') { // Not found
                return {
                    success: true,
                    settings: {
                        site_name: "GigHub",
                        site_url: "https://gighub.com",
                        site_description: "Plataforma de serviços freelance",
                        maintenance_mode: false,
                    }
                }
            }
            console.error("❌ Erro ao procurar configurações:", error)
            return { error: error.message }
        }

        return { success: true, settings: data.config }
    } catch (err) {
        console.error("❌ Erro inesperado ao procurar configurações:", err)
        return { error: "Erro inesperado ao procurar configurações." }
    }
}

export async function updatePlatformSettings(settings: {
    site_name: string
    site_url: string
    site_description: string
    maintenance_mode: boolean
}) {
    try {
        console.log("🚀 Server Action: Atualizando configurações globais...")

        const supabase = getSupabaseAdmin()
        const { data: existing } = await supabase
            .from("platform_integrations")
            .select("id")
            .eq("service_name", "general_settings")
            .single()

        let error;
        if (existing) {
            const { error: updateError } = await supabase
                .from("platform_integrations")
                .update({
                    config: settings,
                    updated_at: new Date().toISOString()
                })
                .eq("id", existing.id)
            error = updateError
        } else {
            const { error: insertError } = await supabase
                .from("platform_integrations")
                .insert({
                    service_name: "general_settings",
                    config: settings,
                    is_enabled: true
                })
            error = insertError
        }

        if (error) {
            console.error("❌ Erro ao atualizar configurações:", error)
            return { error: error.message }
        }

        revalidatePath("/admin/settings")
        return { success: true }
    } catch (err) {
        console.error("❌ Erro inesperado ao atualizar configurações:", err)
        return { error: "Erro inesperado ao atualizar configurações." }
    }
}
