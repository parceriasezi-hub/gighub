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

    // Initialize Google Maps Autocomplete (Existing Logic preserved)
    useEffect(() => {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        if (!isOpen || !apiKey) return

        const initAutocomplete = () => {
            const input = document.getElementById("emergency-address-input") as HTMLInputElement
            if (!input || !window.google) return

            const attemptInit = () => {
                if (window.google?.maps?.places?.Autocomplete) {
                    const autocomplete = new window.google.maps.places.Autocomplete(input, {
                        types: ["geocode"],
                    })

                    autocomplete.addListener("place_changed", () => {
                        const place = autocomplete.getPlace()
                        if (place.geometry && place.geometry.location) {
                            const lat = place.geometry.location.lat()
                            const lng = place.geometry.location.lng()
                            const address = place.formatted_address || place.name || ""
                            setLocation({ lat, lng, address })
                            setAddressInput(address)
                        }
                    })
                    return true
                }
                return false
            }

            if (!attemptInit()) {
                const interval = setInterval(() => {
                    if (attemptInit()) clearInterval(interval)
                }, 100)
                setTimeout(() => clearInterval(interval), 5000)
            }
        }

        if (window.google) {
            initAutocomplete()
        } else {
            const scriptId = "google-maps-script"
            if (!document.getElementById(scriptId)) {
                const script = document.createElement("script")
                script.id = scriptId
                script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geocoding&loading=async`
                script.async = true
                script.defer = true
                script.onload = () => initAutocomplete()
                document.head.appendChild(script)
            } else {
                const interval = setInterval(() => {
                    if (window.google) {
                        initAutocomplete()
                        clearInterval(interval)
                    }
                }, 100)
                setTimeout(() => clearInterval(interval), 5000)
            }
        }
    }, [isOpen])

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

    const handleLocate = async () => {
        setIsLocating(true)
        try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject)
            })
            const { latitude, longitude } = pos.coords
            setLocation({ lat: latitude, lng: longitude })

            if (window.google?.maps?.Geocoder) {
                const geocoder = new window.google.maps.Geocoder()
                geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
                    if (status === "OK" && results && results[0]) {
                        const address = results[0].formatted_address
                        setAddressInput(address)
                        setLocation(prev => prev ? { ...prev, address } : { lat: latitude, lng: longitude, address })
                    } else {
                        setAddressInput(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
                    }
                })
            } else {
                setAddressInput(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
            }
        } catch (err) {
            console.error("Locate error", err)
            // Silent fail on location in background, user can correct manually
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
        recognitionRef.current.start()
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
                    <div className="flex flex-col gap-2 px-1">
                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-1">
                            <MapPin className={cn("h-3 w-3", location ? "text-red-500" : "text-gray-300")} />
                            {isLocating ? "A determinar localização..." : "Localização da Emergência:"}
                        </div>
                        <div className="relative group">
                            <Input
                                id="emergency-address-input"
                                placeholder="A detetar endereço..."
                                value={addressInput}
                                onChange={(e) => setAddressInput(e.target.value)}
                                className="pl-3 pr-10 h-9 rounded-lg border-red-100 bg-white/50 focus:bg-white text-xs transition-colors"
                            />
                            <Button
                                size="icon"
                                variant="ghost"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-red-500 hover:bg-red-50 rounded-md"
                                onClick={handleLocate}
                                disabled={isLocating}
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
            </DialogContent>
        </Dialog>
    )
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(" ")
}
