"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Mic, MicOff, AlertTriangle, Loader2, MapPin, Send, Crosshair, Search, StopCircle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { ttsService } from "@/lib/voice/text-to-speech-service"
import { supabase } from "@/lib/supabase/client"

// Speech Recognition types
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList
    resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean
    interimResults: boolean
    lang: string
    start(): void
    stop(): void
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null
    onend: ((this: SpeechRecognition, ev: Event) => any) | null
}

interface SpeechRecognitionStatic {
    new(): SpeechRecognition
}

declare global {
    interface Window {
        SpeechRecognition: SpeechRecognitionStatic
        webkitSpeechRecognition: SpeechRecognitionStatic
    }
}

interface Message {
    id: string
    role: "user" | "assistant"
    content: string
    timestamp: Date
}

interface EmergencyAIProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: (requestId: string) => void
}

type Step = "chat" | "confirmation" | "broadcasting"

export function EmergencyAI({ isOpen, onClose, onSuccess }: EmergencyAIProps) {
    const { user } = useAuth()
    const [messages, setMessages] = useState<Message[]>([])
    const [isListening, setIsListening] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [transcript, setTranscript] = useState("")
    const [textInput, setTextInput] = useState("")
    const [location, setLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null)
    const [addressInput, setAddressInput] = useState("")
    const [isLocating, setIsLocating] = useState(false)

    // New State for Conversational Flow
    const [step, setStep] = useState<Step>("chat")
    const [detectedCategory, setDetectedCategory] = useState<{ id: string; name: string; confidence: number } | null>(null)

    const recognitionRef = useRef<SpeechRecognition | null>(null)
    const scrollRef = useRef<HTMLDivElement>(null)

    // Scroll to bottom of chat
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, transcript])

    // Monitor speaking state
    useEffect(() => {
        const checkSpeaking = setInterval(() => {
            setIsSpeaking(ttsService.isSpeaking())
        }, 100)
        return () => clearInterval(checkSpeaking)
    }, [])

    // Initialize speech
    useEffect(() => {
        if (typeof window !== "undefined") {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition()
                recognitionRef.current.continuous = false
                recognitionRef.current.interimResults = true
                recognitionRef.current.lang = "pt-PT" // Default to Portuguese
            }
        }
    }, [])

    // Google Maps Autocomplete removed to prevent input blocking issues.
    // Manual entry is prioritized if Geolocation fails.
    /*
    useEffect(() => {
        // ... legacy autocomplete code removed ...
    }, [isOpen])
    */
    // Start sequence when opened
    useEffect(() => {
        if (isOpen) {
            resetState()
            const welcomeMsg = "Sou o seu assistente de emergência. Diga-me, qual é a situação?"
            addMessage("assistant", welcomeMsg)

            // Auto-locate
            handleLocate()

            // Speak welcome with new Neural Voice
            setTimeout(() => speak(welcomeMsg), 500)
        } else {
            stopAllAudio()
        }
    }, [isOpen])

    const resetState = () => {
        setMessages([])
        setTranscript("")
        setTextInput("")
        setStep("chat")
        setDetectedCategory(null)
        stopAllAudio()
    }

    const stopAllAudio = () => {
        ttsService.stop()
        if (recognitionRef.current) recognitionRef.current.stop()
        setIsListening(false)
        setIsSpeaking(false)
    }

    const addMessage = useCallback((role: "user" | "assistant", content: string) => {
        const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const msg: Message = { id: uniqueId, role, content, timestamp: new Date() }
        setMessages(prev => [...prev, msg])
        return msg
    }, [])

    const speak = useCallback((text: string) => {
        setIsSpeaking(true)
        // Using "forceBrowser: false" to use the new Google Cloud Neural2 voice
        ttsService.speak(text, { lang: "pt-PT", forceBrowser: false })
            .catch((err) => {
                console.error("Speech error", err)
                setIsSpeaking(false)
            })
    }, [])

    const handleLocate = async (retryCount = 0) => {
        if (retryCount === 0) {
            setIsLocating(true)
            // Only show loading text if empty or if it was the initial "Detecting..."
            if (!addressInput || addressInput === "A detetar endereço...") {
                setAddressInput("A obter localização...")
            }
        }

        try {
            // Check if Geolocation is supported
            if (!navigator.geolocation) {
                throw new Error("Geolocalização não suportada pelo browser")
            }

            const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    resolve,
                    (err) => reject(err),
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                )
            })

            const { latitude, longitude } = pos.coords
            console.log("📍 Coordinates:", latitude, longitude)

            // Set location state immediately
            setLocation({ lat: latitude, lng: longitude })

            // Direct Google Maps Geocoding API fetch to avoid script loading race conditions
            const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
            if (apiKey) {
                try {
                    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`)
                    const data = await response.json()

                    if (data.status === 'OK' && data.results && data.results[0]) {
                        const address = data.results[0].formatted_address
                        setAddressInput(address)
                        setLocation({ lat: latitude, lng: longitude, address })
                    } else {
                        console.warn("Geocoding API returned no results:", data)
                        if (!addressInput) setAddressInput(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
                    }
                } catch (fetchErr) {
                    console.error("Geocoding fetch error:", fetchErr)
                    if (!addressInput) setAddressInput(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
                }
            } else {
                console.warn("No Google Maps API Key found")
                if (!addressInput) setAddressInput(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
            }

        } catch (err: any) {
            console.error("Locate error:", err)
            // Only overwrite if input is empty
            if (!addressInput) {
                let errorMsg = "Localização indisponível"
                if (err.code === 1) errorMsg = "Permissão de localização negada"
                setAddressInput(errorMsg)
            }
            toast({
                title: "Aviso de Localização",
                description: "Não foi possível obter a localização precisa. Por favor indique a sua morada.",
                variant: "destructive"
            })
        } finally {
            setIsLocating(false)
        }
    }

    const processInput = async (input: string) => {
        if (!input.trim() || isProcessing) return

        // Stop any current speech when user replies
        ttsService.stop()

        setIsProcessing(true)
        const userMsg = addMessage("user", input)
        setTextInput("")

        try {
            // Send entire history to the new Chat API
            const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))

            const response = await fetch("/api/ai/emergency-chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: history,
                    location: addressInput || "Desconhecida"
                })
            })

            if (!response.ok) {
                let errorData
                try {
                    errorData = await response.json()
                } catch (e) {
                    errorData = { error: response.statusText }
                }
                throw new Error(errorData.error || errorData.details || `Server Error ${response.status}`)
            }

            const data = await response.json()

            // 1. Add Assistant Response
            if (data.assistantResponse) {
                addMessage("assistant", data.assistantResponse)
                speak(data.assistantResponse)
            }

            // 2. Check for Category Detection
            if (data.detectedCategory && data.detectedCategory.confidence > 0.8) {
                setDetectedCategory(data.detectedCategory)
                setStep("confirmation")
            }

        } catch (err: any) {
            console.error("Chat Error:", err)
            // Show actual error to help debugging
            const errorMessage = err.message || "Unknown Error"
            const userFriendlyError = `Erro de Conexão (${errorMessage}). Por favor tente novamente.`

            addMessage("assistant", userFriendlyError)
            speak("Ocorreu um erro técnico. Por favor verifique a sua conexão.")
        } finally {
            setIsProcessing(false)
        }
    }

    const handleConfirmCategory = async () => {
        if (!detectedCategory) return
        setStep("broadcasting")
        const confirmMsg = `Entendido. A contactar especialistas em ${detectedCategory.name} agora mesmo.`
        addMessage("assistant", confirmMsg)
        speak(confirmMsg)

        try {
            if (user && location) {
                const response = await fetch("/api/emergency/create", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        category: detectedCategory.name,
                        serviceId: detectedCategory.id,
                        description: messages.map(m => m.content).join("\n"), // Full transcript as description
                        lat: location.lat,
                        lng: location.lng,
                        address: location.address || "Localização Atual"
                    })
                })

                if (!response.ok) throw new Error("Broadcast failed")
                const result = await response.json()

                if (result.data) {
                    setTimeout(() => {
                        onSuccess(result.data.id)
                        onClose()
                    }, 4000) // Wait a bit for audio to finish
                }
            } else {
                throw new Error("Missing location or user")
            }
        } catch (err) {
            console.error("Broadcast failed", err)
            setStep("chat")
            const errorMsg = "Falha ao criar o pedido. Por favor tente novamente."
            addMessage("assistant", errorMsg)
            speak(errorMsg)
        }
    }

    const startListening = () => {
        if (!recognitionRef.current) return

        // Safety: If already listening, stop first to avoid 'InvalidStateError'
        if (isListening) {
            try {
                recognitionRef.current.stop()
            } catch (e) { /* ignore */ }
            setIsListening(false)
            return
        }

        // Stop assistant from talking when user wants to speak
        ttsService.stop()

        setIsListening(true)
        setTranscript("")

        recognitionRef.current.onresult = (event) => {
            let current = ""
            for (let i = event.resultIndex; i < event.results.length; i++) {
                current += event.results[i][0].transcript
                if (event.results[i].isFinal) {
                    processInput(current)
                    setIsListening(false)
                }
            }
            setTranscript(current)
        }

        recognitionRef.current.onerror = () => setIsListening(false)
        recognitionRef.current.onend = () => setIsListening(false)

        try {
            recognitionRef.current.start()
        } catch (e) {
            console.error("Speech Recognition start error:", e)
            setIsListening(false)
        }
    }

    const stopListening = () => {
        if (recognitionRef.current) recognitionRef.current.stop()
        setIsListening(false)
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) stopAllAudio(); onClose(); }}>
            <DialogContent className="sm:max-w-md border-red-200 bg-red-50/30 backdrop-blur-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-6 w-6 animate-pulse" />
                        ASSISTENTE DE EMERGÊNCIA
                    </DialogTitle>
                    <DialogDescription>
                        {detectedCategory ? `Emergência Detetada: ${detectedCategory.name}` : "Descreva a situação. Estou aqui para ajudar."}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-4 h-[500px]">
                    {/* Chat Area */}
                    <div className="flex-1 flex flex-col gap-3 min-h-0">
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto bg-white/80 rounded-xl p-4 border border-red-100 shadow-inner flex flex-col gap-3 scroll-smooth"
                        >
                            {messages.map((m) => (
                                <div key={m.id} className={cn(
                                    "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm animate-in fade-in slide-in-from-bottom-2",
                                    m.role === 'user' ? "bg-red-600 text-white self-end rounded-tr-none" : "bg-gray-100 text-gray-800 self-start rounded-tl-none border border-gray-200"
                                )}>
                                    {m.content}
                                </div>
                            ))}

                            {/* Live Transcript Bubble */}
                            {transcript && (
                                <div className="bg-red-50 text-red-700 self-end rounded-2xl px-4 py-2 text-sm italic animate-pulse border border-red-100">
                                    {transcript}...
                                </div>
                            )}

                            {/* Processing Indicator */}
                            {isProcessing && (
                                <div className="self-start flex items-center gap-2 text-gray-500 text-xs italic ml-2 bg-white/50 px-3 py-1 rounded-full">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    A pensar...
                                </div>
                            )}

                            {/* Confirmation Card */}
                            {step === "confirmation" && detectedCategory && (
                                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl animate-in zoom-in-95 duration-300">
                                    <h4 className="font-semibold text-red-900 mb-1">Confirmar Categoria?</h4>
                                    <p className="text-sm text-red-700 mb-3">Identificámos isto como uma emergência de <strong>{detectedCategory.name}</strong>.</p>
                                    <div className="flex gap-2">
                                        <Button
                                            className="flex-1 bg-red-600 hover:bg-red-700 text-white shadow-md transition-all hover:scale-105"
                                            onClick={handleConfirmCategory}
                                        >
                                            Sim, Chamar Ajuda
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="px-3 border-red-200 hover:bg-red-100"
                                            onClick={() => {
                                                setStep("chat")
                                                setDetectedCategory(null)
                                                addMessage("assistant", "Peço desculpa. Pode descrever melhor o problema?")
                                                speak("Peço desculpa. Pode descrever melhor o problema?")
                                            }}
                                        >
                                            Não
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Location Bar */}
                    {/* Location Bar */}
                    <div className="flex flex-col gap-2 px-1">
                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-1">
                            <MapPin className={cn("h-3 w-3", location ? "text-red-500" : "text-gray-300")} />
                            {isLocating ? "A determinar localização..." : "Localização da Emergência:"}
                        </div>

                        {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
                            <div className="text-[10px] text-red-500 bg-red-50 p-1 rounded mb-1 border border-red-100">
                                ⚠️ Configuração em falta: Chave API Google Maps.
                            </div>
                        )}

                        <div className="relative group">
                            <Input
                                id="emergency-address-input"
                                placeholder={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? "Escreva a morada..." : "Insira a morada manualmente..."}
                                value={addressInput}
                                onChange={(e) => setAddressInput(e.target.value)}
                                className="pl-3 pr-10 h-9 rounded-lg border-red-100 bg-white text-xs text-black"
                                autoComplete="off" // Prevent browser autocomplete fighting with Google
                            />
                            <Button
                                size="icon"
                                variant="ghost"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-red-500 hover:bg-red-50 rounded-md"
                                onClick={() => handleLocate(0)}
                                disabled={isLocating}
                                type="button"
                            >
                                {isLocating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Crosshair className="h-3 w-3" />}
                            </Button>
                        </div>
                    </div>

                    {/* Input Controls */}
                    {step !== "broadcasting" && (
                        <div className="flex flex-col gap-3">
                            <Button
                                size="lg"
                                className={cn(
                                    "h-16 rounded-2xl text-lg font-bold transition-all duration-300 shadow-lg relative overflow-hidden",
                                    isListening ? "bg-red-500 animate-pulse scale-95 ring-4 ring-red-200" :
                                        isSpeaking ? "bg-amber-500 hover:bg-amber-600" : "bg-red-600 hover:bg-red-700 shadow-red-200"
                                )}
                                onClick={isListening ? stopListening : isSpeaking ? () => ttsService.stop() : startListening}
                                disabled={isProcessing}
                            >
                                {isListening ? (
                                    <>
                                        <MicOff className="mr-2 h-6 w-6" /> A OUVIR...
                                    </>
                                ) : isSpeaking ? (
                                    <>
                                        <StopCircle className="mr-2 h-6 w-6" /> PARAR ÁUDIO
                                    </>
                                ) : (
                                    <>
                                        <Mic className="mr-2 h-6 w-6" /> FALAR AGORA
                                    </>
                                )}
                            </Button>

                            <div className="flex gap-2">
                                <Input
                                    placeholder="Ou escreva aqui..."
                                    value={textInput}
                                    onChange={(e) => setTextInput(e.target.value)}
                                    // Submit on Enter
                                    onKeyDown={(e) => e.key === 'Enter' && processInput(textInput)}
                                    className="rounded-xl border-red-100 focus:ring-red-500 h-10"
                                />
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="rounded-xl border-red-200 text-red-600 h-10 w-10 hover:bg-red-50"
                                    onClick={() => processInput(textInput)}
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent >
        </Dialog >
    )
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(" ")
}
