import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "@/lib/supabase/server"
import { CategorySuggestionService } from "@/lib/ai/category-suggestion-service"

export const runtime = "edge"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { messages, location } = body

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: "Messages array is required" }, { status: 400 })
        }

        // 1. Fetch Categories for Context
        const supabase = await createClient()
        const { data: categories } = await supabase
            .from("categories")
            .select("id, name, parent_id")
            .eq("is_active", true)

        let categoryContext = ""
        if (categories) {
            // efficient retrieval of leaf categories using the existing service logic would be ideal, 
            // but we can't easily access private static methods. 
            // We'll do a quick logical map here or if possible, use the public method if adapted.
            // For now, let's just pass the raw list to Gemini but formatted to save tokens.
            categoryContext = categories
                .map(c => `ID: ${c.id} | Name: ${c.name}`)
                .join("\n")
        }

        // 2. Initialize Gemini
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY

        if (!apiKey) {
            console.error("CRITICAL: Missing GEMINI API KEY in environment variables")
            return NextResponse.json({ error: "Configuration Error: Missing AI API Key on Server" }, { status: 500 })
        }
        const genAI = new GoogleGenerativeAI(apiKey)
        // Fallback to gemini-pro if 1.5-flash is unavailable in this region/API version
        const model = genAI.getGenerativeModel({ model: "gemini-pro" })

        // 3. Construct System Prompt
        const systemPrompt = `
You are an empathetic, calm, and professional Emergency Dispatcher for a platform called Gighub.
Your goal is to help users who are facing home/service emergencies (e.g., floods, fires, lockouts, electrical issues).

CONTEXT:
- The user is speaking to you via voice.
- Your responses will be spoken back to them (Keep them distinct, clear, and under 2-3 sentences).
- Current Location: ${location || "Unknown"}

OBJECTIVES:
1. **Calm the User**: Acknowledge their stress immediately.
2. **Safety First**: Provide *immediate* safety advice relevant to their problem (e.g., "Turn off the main breaker", "Do not enter the room").
3. **Gather Information**: If the emergency is unclear, ask *one* clarifying question.
4. **Detect Category**: Analyze the conversation to match the problem to one of the provided Category IDs.

AVAILABLE CATEGORIES:
${categoryContext}

OUTPUT FORMAT:
Return ONLY a JSON object (no markdown):
{
  "assistantResponse": "The text you will speak to the user.",
  "detectedCategory": null | { "id": "uuid", "name": "Category Name", "confidence": 0.0-1.0 }
}

RULES:
- If confident (>0.8) about the category, fill 'detectedCategory'.
- If not confident, keep 'detectedCategory' as null and ask for more details.
- NEVER invent category IDs. Only use the ones provided.
- If it is a life-threatening emergency (medical, major fire, crime), advise them to call 112/911 immediately.
`

        // 4. Generate Content
        // We act as if the messages are part of the chat history
        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: systemPrompt }] },
                { role: "model", parts: [{ text: "Understood. I am ready to act as the Gighub Emergency Dispatcher." }] }
            ]
        })

        // Convert frontend messages to Gemini format
        // (Skipping the system prompt we just injected)
        // message format: { role: 'user' | 'assistant', content: string }
        const lastMessage = messages[messages.length - 1]
        const historyParts = messages.slice(0, -1).map((m: any) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }))

        // We can't easily inject history into startChat *after* the system prompt hack without proper order.
        // Better approach for single-turn API: send the whole transcript in the user prompt + system prompt.
        // Or properly use the systemInstruction (if available in this SDK version) or the history array.

        // Let's use a simpler prompt structure for reliability in a stateless request:
        const finalPrompt = `
${systemPrompt}

CONVERSATION HISTORY:
${messages.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join("\n")}

Respond in JSON:
`
        const result = await model.generateContent(finalPrompt)
        const responseText = result.response.text()

        // 5. Parse JSON
        let parsedResponse
        try {
            // Clean code fences if present
            const cleanText = responseText.replace(/```json/g, "").replace(/```/g, "").trim()
            parsedResponse = JSON.parse(cleanText)
        } catch (e) {
            console.error("JSON Parse Error:", responseText)
            // Fallback
            parsedResponse = {
                assistantResponse: "I am having trouble processing that. Could you please repeat?",
                detectedCategory: null
            }
        }

        return NextResponse.json(parsedResponse)

    } catch (error: any) {
        console.error("Emergency Chat API Error Full:", error)

        // Return specific error for debugging
        const errorMessage = error.message || "Unknown Internal Error"
        return NextResponse.json(
            { error: `Internal Server Error: ${errorMessage}` },
            { status: 500 }
        )
    }
}
