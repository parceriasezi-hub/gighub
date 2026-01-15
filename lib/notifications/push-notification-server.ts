
import { supabaseAdmin } from "@/lib/supabase/admin"
// import * as admin from "firebase-admin" - Removed to fix Cloudflare build errors

interface FirebaseConfig {
    apiKey: string
    authDomain: string
    projectId: string
    storageBucket: string
    messagingSenderId: string
    appId: string
    serverKey?: string
    serviceAccountJson?: string
}

// Keep track of initialized apps to avoid duplicate initialization
const initializedApps = new Set<string>()

export class PushNotificationServiceServer {
    /**
     * Initializes Firebase Admin SDK if needed
     */
    private static async initFirebaseAdmin(serviceAccount: any, projectId: string) {
        // Cloudflare/Edge Runtime check
        if (typeof process !== 'undefined' && process.env.NEXT_RUNTIME === 'edge') {
            console.warn("⚠️ Firebase Admin skip: Running on Edge Runtime")
            return null
        }

        try {
            const admin = await import("firebase-admin")
            // If no apps are initialized, initialize the default one
            if (admin.apps.length === 0) {
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                    projectId: projectId
                })
                console.log("✅ Firebase Admin initialized successfully")
            }
            return admin
        } catch (error) {
            console.error("❌ Firebase Admin initialization error:", error)
            return null
        }
    }

    /**
     * Envia notificação push para todos os dispositivos ativos de um utilizador via FCM V1
     */
    static async sendToUser(
        userId: string,
        title: string,
        body: string,
        data: Record<string, any> = {}
    ): Promise<{ success: number; failed: number }> {
        try {
            console.log(`📲 Preparing to send push notification to user ${userId} (V1 API)`)

            // 1. Buscar tokens ativos do utilizador
            const { data: tokens, error: tokenError } = await supabaseAdmin
                .from("user_device_tokens")
                .select("token, id")
                .eq("user_id", userId)
                .eq("is_active", true)

            if (tokenError) {
                console.error("❌ Error fetching device tokens:", tokenError)
                return { success: 0, failed: 0 }
            }

            if (!tokens || tokens.length === 0) {
                console.log(`ℹ️ No active device tokens found for user ${userId}`)
                return { success: 0, failed: 0 }
            }

            // 2. Buscar configuração do Firebase
            const { data: configData, error: configError } = await supabaseAdmin
                .from("platform_integrations")
                .select("config, is_enabled")
                .eq("service_name", "firebase")
                .single()

            if (configError || !configData || !configData.is_enabled) {
                console.warn("⚠️ Firebase not configured or disabled")
                return { success: 0, failed: 0 }
            }

            const firebaseConfig = configData.config as FirebaseConfig

            // Verify Service Account JSON
            if (!firebaseConfig.serviceAccountJson) {
                console.warn("⚠️ Service Account JSON missing. Cannot use FCM V1 API.")
                return { success: 0, failed: 0 }
            }

            let serviceAccount
            try {
                // Handle if it's already an object or a string
                serviceAccount = typeof firebaseConfig.serviceAccountJson === 'string'
                    ? JSON.parse(firebaseConfig.serviceAccountJson)
                    : firebaseConfig.serviceAccountJson
            } catch (e) {
                console.error("❌ Invalid Service Account JSON:", e)
                return { success: 0, failed: 0 }
            }

            // Initialize Firebase Admin
            const admin = await this.initFirebaseAdmin(serviceAccount, firebaseConfig.projectId)

            if (!admin) {
                console.warn("⚠️ Push Notification skip: Firebase Admin not available in this runtime")
                return { success: 0, failed: tokens.length }
            }

            console.log(`found ${tokens.length} tokens for user ${userId}`)

            // 3. Enviar para cada token usando a SDK admin (que usa V1 sob o capô)
            let successCount = 0
            let failedCount = 0

            const messages = tokens.map(t => ({
                token: t.token,
                notification: {
                    title,
                    body
                },
                data: data,
                webpush: {
                    fcmOptions: {
                        link: process.env.NEXT_PUBLIC_APP_URL || "https://v0-biskate.vercel.app/"
                    }
                }
            }))

            if (messages.length > 0) {
                try {
                    const batchResponse = await admin.messaging().sendEach(messages as any)

                    successCount = batchResponse.successCount
                    failedCount = batchResponse.failureCount

                    // Handle failures (cleanup invalid tokens)
                    if (batchResponse.failureCount > 0) {
                        const failedTokens: string[] = []
                        batchResponse.responses.forEach((resp: any, idx: number) => {
                            if (!resp.success) {
                                const error = resp.error
                                console.error(`FCM error for token ${tokens[idx].id}:`, error?.code, error?.message)

                                if (error?.code === 'messaging/registration-token-not-registered' ||
                                    error?.code === 'messaging/invalid-argument') {
                                    failedTokens.push(tokens[idx].id)
                                }
                            }
                        })

                        // Deactivate invalid tokens
                        if (failedTokens.length > 0) {
                            await supabaseAdmin
                                .from("user_device_tokens")
                                .update({ is_active: false })
                                .in("id", failedTokens)
                            console.log(`Deactivated ${failedTokens.length} invalid tokens`)
                        }
                    }

                } catch (err) {
                    console.error("❌ Error sending batch messages:", err)
                    return { success: 0, failed: tokens.length }
                }
            }

            console.log(`✅ Push notifications sent: ${successCount} success, ${failedCount} failed`)
            return { success: successCount, failed: failedCount }

        } catch (error) {
            console.error("❌ Error in sendToUser:", error)
            return { success: 0, failed: 0 }
        }
    }
}
