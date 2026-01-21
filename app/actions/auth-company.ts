"use server"

import { createClient } from "@/lib/supabase/server"
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
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // 1. Create Auth User
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

    // 2. Create Organization
    // Note: RLS allows authenticated users to insert.
    // Since we just signed up, we might need to rely on the session being established OR use a service key for this transaction.
    // However, signUp usually returns a session.

    // STRATEGY: It's safer to use a Service Role client here to ensure atomicity and bypass RLS for the initial setup,
    // preventing a state where User exists but Org fails due to permissions.
    // BUT... we don't expose Service Role to client components.
    // We'll proceed with standard client first. If RLS blocks "Organization Creation" because the user isn't fully "logged in" yet (email verification?),
    // we might need to adjust.

    // Assumption: 'signUp' returns a session if email confirmation is disabled or auto-confirmed.
    // If email confirmation is REQUIRED, the user won't have a session yet.
    // In that case, we MUST use Service Role to create the Org and link it to the (pending) User ID.

    // For this implementation, we will assume we can write to 'organizations' table.

    const { data: orgData, error: orgError } = await supabase
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
        // Ideally rollback user creation here, but Supabase Auth doesn't support easy rollback.
        // For MVP, return error.
        return { error: `Failed to create organization: ${orgError.message}` }
    }

    // 3. Create Organization Member (Owner)
    // The 'organizations' insert RLS policy allows authenticated users.
    // The 'organization_members' insert needs to be allowed.

    const { error: memberError } = await supabase
        .from("organization_members")
        .insert({
            organization_id: orgData.id,
            user_id: userId,
            role: 'owner'
        })

    if (memberError) {
        return { error: `Failed to add member: ${memberError.message}` }
    }

    return { success: true, orgId: orgData.id }
}
