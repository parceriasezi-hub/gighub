"use server"

import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

interface CompanyRegistrationData {
    email: string
    password: string
    fullName: string
    legalName: string
    vatNumber: string
    address: string
    registryCode: string
}

export async function registerCompany(data: CompanyRegistrationData) {
    // 1. Create Auth User (Standard Client)
    // We use the standard server client to create the user.
    const supabase = await createClient()

    // Check if Service Role Key is available
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
        throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY")
    }

    // Create Admin Client for database operations (bypassing RLS)
    // This is required because the new user might not be verified yet (no session),
    // but we need to create the Organization and Member linkage immediately.
    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )

    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
            data: {
                full_name: data.fullName,
                is_provider: false, // Will be set via Org context later
            },
        },
    })

    if (authError) return { error: authError.message }
    if (!authData.user) return { error: "Failed to create user" }

    const userId = authData.user.id

    // 2. Create Organization (Using Admin Client)
    const { data: orgData, error: orgError } = await supabaseAdmin
        .from("organizations")
        .insert({
            legal_name: data.legalName,
            vat_number: data.vatNumber,
            address: data.address,
            registry_code: data.registryCode,
        })
        .select()
        .single()

    if (orgError) {
        // Since we can't easily undo the auth creation without admin rights (and we want to avoid deleting users if possible),
        // we log this critical error. user exists but org failed.
        console.error("CRITICAL: Failed to create organization for new user", userId, orgError)
        return { error: `Failed to create organization: ${orgError.message}` }
    }

    // 3. Create Organization Member (Owner) (Using Admin Client)
    const { error: memberError } = await supabaseAdmin
        .from("organization_members")
        .insert({
            organization_id: orgData.id,
            user_id: userId,
            role: 'owner'
        })

    if (memberError) {
        console.error("CRITICAL: Failed to link user to organization", userId, orgData.id, memberError)
        return { error: `Failed to add member: ${memberError.message}` }
    }

    return { success: true, orgId: orgData.id }
}
