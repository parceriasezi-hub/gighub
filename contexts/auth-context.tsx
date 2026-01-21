"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/database.types"
import { logClientActivity } from "@/app/actions/log"

type DBProfile = Database["public"]["Tables"]["profiles"]["Row"]

export type Profile = DBProfile & {
  created_at?: string | null
  updated_at?: string | null
  provider_location?: string | null
  postal_code?: string | null
  vat_number?: string | null
  provider_full_name?: string | null
  company_name?: string | null
  provider_service_radius?: number | null
  last_lat?: number | null
  last_lng?: number | null
  provider_type?: string | null
  provider_avatar_url?: string | null
  provider_rejection_reason?: string | null
  permissions?: string[] | null
  provider_verified_at?: string | null
  provider_documents?: any | null
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: string | null }>
  hasPermission: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  const isAuthenticated = !!user && !loading

  // Mock profile fallback for development
  const getMockProfile = (user: User): Profile => {
    // In production, we don't use hardcoded admins
    // This is just a fallback for when DB fetch fails during initial dev setup
    return {
      id: user.id,
      email: user.email || "",
      full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
      avatar_url: user.user_metadata?.avatar_url || null,
      role: "user",
      permissions: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      bio: null,
      location: null,
      website: null,
      phone: null,
      is_provider: false,
      provider_status: null,
      provider_verified_at: null,
      provider_documents: null,
      skills: null,
      hourly_rate: null,
      availability: null,
      rating: null,
      total_reviews: 0,
      total_earnings: 0,
      profile_completion: 50,
      last_active: new Date().toISOString(),
      notification_preferences: {
        email: true,
        push: true,
        sms: false,
      },
      privacy_settings: {
        show_email: false,
        show_phone: false,
        show_location: true,
        show_reviews: true
      },
      plan: "free",
      // Extended fields
      provider_location: null,
      postal_code: null,
      vat_number: null,
      provider_full_name: null,
      company_name: null,
      provider_service_radius: 20,
      last_lat: null,
      last_lng: null,
      provider_type: "individual",
      provider_avatar_url: null,
      provider_rejection_reason: null
    }
  }

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      console.log("🔍 Fetching profile for user:", userId)

      // Use maybeSingle() to avoid 406 error if no rows found
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle()

      if (error) {
        console.warn("⚠️ Profile fetch error:", error.message)
        return null
      }

      if (data) {
        console.log("✅ Profile fetched successfully:", data)
        return data as Profile // Safe cast as we know the shape matches loosely or we handle missing fields
      }

      // If no profile exists, try to create one
      console.log("⚠️ No profile found, attempting to create one...")
      if (!user) {
        console.warn("Cannot create profile: User is null")
        return null
      }

      const newProfile = {
        id: userId,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
        avatar_url: user.user_metadata?.avatar_url || null,
        role: "user",
        updated_at: new Date().toISOString(),
      }

      const { data: createdProfile, error: createError } = await (supabase
        .from("profiles") as any)
        .insert([newProfile])
        .select()
        .single() // Now strict single is okay as we just inserted one

      if (createError) {
        console.error("❌ Failed to create missing profile:", createError.message)
        return null
      }

      console.log("✅ Created missing profile:", createdProfile)
      return createdProfile as Profile

    } catch (err) {
      console.warn("⚠️ Profile fetch exception (using mock):", err)
      return null
    }
  }

  const refreshProfile = async () => {
    if (!user) return

    try {
      const dbProfile = await fetchProfile(user.id)

      if (dbProfile) {
        setProfile(dbProfile)
        console.log("✅ Using database profile")
      } else {
        const mockProfile = getMockProfile(user)
        setProfile(mockProfile)
        console.log("✅ Using mock profile fallback")
      }
    } catch (err) {
      console.error("❌ Profile refresh error:", err)
      const mockProfile = getMockProfile(user)
      setProfile(mockProfile)
    }
  }

  const updateProfile = async (updates: Partial<Profile>): Promise<{ error: string | null }> => {
    if (!user) return { error: "No user logged in" }

    try {
      // Need to strip undefined/extended fields if they don't exist in DB schema?
      // Actually Supabase JS normally ignores unknown fields if configured, or throws.
      // Assuming 'profiles' table has been migrated to include these columns.
      // If not, this might throw. But we rely on migrations being applied.
      const { error } = await (supabase
        .from("profiles") as any)
        .update(updates)
        .eq("id", user.id)

      if (error) {
        console.error("❌ Profile update error:", error.message)
        return { error: error.message }
      }

      await refreshProfile()

      // Log the profile update
      logClientActivity(
        user.id,
        profile?.role || "user",
        "UPDATE_PROFILE",
        updates
      )

      return { error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Profile update failed"
      console.error("❌ Profile update exception:", errorMessage)
      return { error: errorMessage }
    }
  }

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      setError(null)

      console.log("🔐 Attempting sign in for:", email)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error("❌ Sign in error:", error.message)
        setError(error.message)
        return { error: error.message }
      }

      console.log("✅ Sign in successful:", data.user?.email)
      console.log("🍪 Current cookies:", document.cookie)
      // Login logging is handled in the page.tsx to avoid race conditions with profile loading
      return { error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Sign in failed"
      console.error("❌ Sign in exception:", errorMessage)
      setError(errorMessage)
      return { error: errorMessage }
    }
  }

  const signUp = async (email: string, password: string, fullName?: string): Promise<{ error: string | null }> => {
    try {
      setError(null)

      console.log("📝 Attempting sign up for:", email)

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) {
        console.error("❌ Sign up error:", error.message)
        setError(error.message)
        return { error: error.message }
      }

      console.log("✅ Sign up successful:", data.user?.email)

      // Log the registration
      if (data.user) {
        logClientActivity(
          data.user.id,
          "user",
          "REGISTER",
          { email: data.user.email, full_name: fullName }
        )
      }

      // Trigger user registered notification via API (non-blocking)
      if (data.user && data.user.email) {
        try {
          console.log("📧 Triggering welcome notification via API...")

          // Call server-side API to send email (keeps API key secure)
          await fetch("/api/notifications/trigger", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              trigger: "user_registered",
              data: {
                userId: data.user.id,
                userName: fullName || "Novo Utilizador",
                userEmail: data.user.email,
              },
            }),
          })

          console.log("✅ Welcome notification triggered successfully")
        } catch (emailError) {
          // Don't block signup if email fails
          console.warn("⚠️ Welcome notification failed (non-blocking):", emailError)
        }
      }

      return { error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Sign up failed"
      console.error("❌ Sign up exception:", errorMessage)
      setError(errorMessage)
      return { error: errorMessage }
    }
  }

  const signOut = async () => {
    try {
      console.log("🚪 Signing out...")

      if (user) {
        logClientActivity(
          user.id,
          profile?.role || "user",
          "LOGOUT",
          { email: user.email }
        )
      }

      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error("❌ Sign out error:", error.message)
        setError(error.message)
      } else {
        console.log("✅ Sign out successful")
        setUser(null)
        setProfile(null)
        setError(null)
      }
    } catch (err) {
      console.error("❌ Sign out exception:", err)
      setError(err instanceof Error ? err.message : "Sign out failed")
    }
  }

  useEffect(() => {
    let mounted = true

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log("🔍 Getting initial session...")

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (!mounted) return

        if (error) {
          console.error("❌ Session error:", error.message)
          setError(error.message)
          setLoading(false)
          setInitialized(true)
          return
        }

        if (session?.user) {
          console.log("✅ Initial session found:", session.user.email)
          setUser(session.user)

          // Set mock profile immediately to prevent loading loops
          const mockProfile = getMockProfile(session.user)
          setProfile(mockProfile)

          // Try to fetch real profile in background
          fetchProfile(session.user.id)
            .then((dbProfile) => {
              if (mounted && dbProfile) {
                setProfile(dbProfile)
              }
            })
            .catch(() => {
              // Keep mock profile on error
            })
        } else {
          console.log("ℹ️ No initial session found")
        }

        setLoading(false)
        setInitialized(true)
      } catch (err) {
        console.error("❌ Session exception:", err)
        if (mounted) {
          setError(err instanceof Error ? err.message : "Session error")
          setLoading(false)
          setInitialized(true)
        }
      }
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      console.log("🔄 Auth state change:", event, session?.user?.email)

      if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user)
        setError(null)

        // Set mock profile immediately
        const mockProfile = getMockProfile(session.user)
        setProfile(mockProfile)

        // Try to fetch real profile
        fetchProfile(session.user.id)
          .then((dbProfile) => {
            if (mounted && dbProfile) {
              setProfile(dbProfile)
            }
          })
          .catch(() => {
            // Keep mock profile on error
          })
      } else if (event === "SIGNED_OUT") {
        setUser(null)
        setProfile(null)
        setError(null)
      }

      if (initialized) {
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [initialized])

  // Realtime profile listener
  useEffect(() => {
    if (!user?.id) return

    const profileChannel = supabase
      .channel(`profile_realtime_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          console.log("👤 Realtime profile update:", payload.new)
          setProfile(payload.new as Profile)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(profileChannel)
    }
  }, [user?.id])

  const value: AuthContextType = {
    user,
    profile,
    loading,
    error,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    updateProfile,
    hasPermission: (permission: string) => {
      if (!profile) return false
      // Super admins have all permissions
      const perms = profile.permissions as string[] || []
      return perms.includes("super_admin") || perms.includes(permission)
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
