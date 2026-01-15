'use server'

/**
 * Server Action to generate speech using Google Cloud Text-to-Speech API
 * Uses the high-quality Neural2 voices ("Gemini quality")
 */
export async function generateSpeech(text: string): Promise<{ audioContent: string | null; error?: string }> {
    try {
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

        if (!apiKey) {
            console.error("❌ Missing Google API Key for TTS")
            return { audioContent: null, error: "API Key not configured" }
        }

        // Endpoint for Google Cloud Text-to-Speech
        const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`

        // Configuration for "Gemini-quality" (Neural2)
        const requestBody = {
            input: {
                text: text
            },
            voice: {
                languageCode: "pt-PT",
                name: "pt-PT-Neural2-A", // 'A' is usually female, 'B' is male. Neural2 is the premium engine.
                ssmlGender: "FEMALE"
            },
            audioConfig: {
                audioEncoding: "MP3",
                speakingRate: 1.0,
                pitch: 0
            }
        }

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        })

        if (!response.ok) {
            const errorData = await response.json()
            console.error("❌ Google TTS API Error:", errorData)
            return { audioContent: null, error: errorData.error?.message || "TTS API Failed" }
        }

        const data = await response.json()

        // data.audioContent is the base64 encoded string
        return { audioContent: data.audioContent }

    } catch (error) {
        console.error("❌ generateSpeech Exception:", error)
        return { audioContent: null, error: "Internal Server Error" }
    }
}
