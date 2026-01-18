"use server"

import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { NotificationServiceServer } from "@/lib/notifications/notification-service-server"

export async function signUpUser(formData: FormData) {
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const fullName = formData.get("fullName") as string

    if (!email || !password) {
        return { error: "Email and password are required" }
    }

    // 1. Generate the verification link via Admin API
    const supabase = getSupabaseAdmin()
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "signup",
        email,
        password,
        options: {
            data: {
                full_name: fullName,
            },
            // We use a placeholder and replace it after we have the user ID
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/confirm?userId=USER_ID_PLACEHOLDER`
        },
    })

    if (linkError) {
        console.error("Link generation error:", linkError)
        return { error: linkError.message }
    }

    const { user, properties } = linkData
    let verificationLink = properties?.action_link

    if (!user || !verificationLink) {
        return { error: "Failed to generate verification link" }
    }

    // Replace the placeholder with the actual userId
    verificationLink = verificationLink.replace('USER_ID_PLACEHOLDER', user.id)

    // 2. Initialize verification tracking in the profile
    // Small delay to allow trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 1000))
    await supabase
        .from("profiles")
        .update({
            verification_attempts: 1,
            last_verification_sent_at: new Date().toISOString(),
            email_verified: false
        })
        .eq("id", user.id)

    // 3. Trigger the "User Registered" notification with the link
    try {
        await NotificationServiceServer.triggerNotification("user_registered", {
            userId: user.id,
            userName: fullName || email.split("@")[0],
            userEmail: email,
            verification_link: verificationLink,
        })
    } catch (err) {
        console.error("Failed to trigger notification:", err)
        // We don't block success, but user won't get email
        return { error: "Account created but failed to send verification email. Please contact support." }
    }

    return { success: true }
}
