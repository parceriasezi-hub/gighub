"use client"

import { generateSpeech } from "@/app/actions/voice"

export interface TTSOptions {
  lang?: string
  rate?: number
  pitch?: number
  volume?: number
  voiceName?: string
  forceBrowser?: boolean // New option to force browser fallback
}

export class TextToSpeechService {
  private synthesis: SpeechSynthesis | null = null
  private voices: SpeechSynthesisVoice[] = []
  private isInitialized = false
  private currentAudio: HTMLAudioElement | null = null

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.synthesis = window.speechSynthesis
      this.initializeVoices()
    }
  }

  private async initializeVoices(): Promise<void> {
    if (!this.synthesis) return

    return new Promise((resolve) => {
      const loadVoices = () => {
        this.voices = this.synthesis!.getVoices()
        this.isInitialized = true
        resolve()
      }

      if (this.synthesis.getVoices().length > 0) {
        loadVoices()
      } else {
        this.synthesis.onvoiceschanged = loadVoices
      }
    })
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeVoices()
    }
  }

  private findBestVoice(lang = "pt-PT"): SpeechSynthesisVoice | null {
    // Definir preferências de vozes naturais/femininas (Fallback Browser)
    const naturalKeywords = ["natural", "google", "microsoft", "premium", "neural"]
    const femaleKeywords = ["female", "maria", "joana", "sofia", "helena", "zira", "aria", "samantha", "victoria"]

    const scoreVoice = (voice: SpeechSynthesisVoice) => {
      let score = 0
      const name = voice.name.toLowerCase()

      if (voice.lang.includes(lang.split('-')[0])) score += 10
      if (voice.lang === lang) score += 5
      if (naturalKeywords.some(keyword => name.includes(keyword))) score += 5
      if (femaleKeywords.some(keyword => name.includes(keyword))) score += 8

      return score
    }

    const sortedVoices = [...this.voices]
      .filter(v => v.lang.includes(lang.split('-')[0]) || v.lang.includes("en"))
      .sort((a, b) => scoreVoice(b) - scoreVoice(a))

    if (sortedVoices.length > 0) return sortedVoices[0]
    return this.voices.find((voice) => voice.default) || this.voices[0] || null
  }

  // Play cloud audio from Base64
  private async playCloudAudio(base64: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.currentAudio) {
        this.currentAudio.pause()
        this.currentAudio = null
      }

      const audio = new Audio(`data:audio/mp3;base64,${base64}`)
      this.currentAudio = audio

      audio.onended = () => {
        this.currentAudio = null
        resolve()
      }

      audio.onerror = (e) => {
        this.currentAudio = null
        reject(e)
      }

      audio.play().catch(reject)
    })
  }

  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    // 1. Try Google Cloud Neural TTS first (unless forced otherwise)
    if (!options.forceBrowser) {
      try {
        const { audioContent, error } = await generateSpeech(text)

        if (audioContent) {
          await this.playCloudAudio(audioContent)
          return // Success, exit
        }

        console.warn("⚠️ Google Cloud TTS failed, falling back to browser:", error)
      } catch (err) {
        console.warn("⚠️ Google Cloud TTS error, falling back to browser:", err)
      }
    }

    // 2. Fallback to Browser SpeechSynthesis
    if (!this.synthesis) {
      console.error("Text-to-Speech not supported in this browser")
      return
    }

    await this.ensureInitialized()
    this.synthesis.cancel()

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text)

      utterance.lang = options.lang || "pt-PT"
      utterance.rate = options.rate || 0.9
      utterance.pitch = options.pitch || 1
      utterance.volume = options.volume || 1

      const voice = this.findBestVoice(utterance.lang)
      if (voice) {
        utterance.voice = voice
      }

      utterance.onend = () => resolve()
      utterance.onerror = (event) => reject(new Error(`Browser TTS Error: ${event.error}`))

      this.synthesis.speak(utterance)
    })
  }

  stop(): void {
    // Stop Cloud Audio
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio = null
    }
    // Stop Browser Audio
    if (this.synthesis) {
      this.synthesis.cancel()
    }
  }

  isSpeaking(): boolean {
    return (this.currentAudio !== null && !this.currentAudio.paused) || (this.synthesis ? this.synthesis.speaking : false)
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.voices
  }

  isSupported(): boolean {
    return !!(this.synthesis || typeof window !== 'undefined')
  }
}

export const ttsService = new TextToSpeechService()
