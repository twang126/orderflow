"use client"

import { createContext, useContext, useEffect, useState, useMemo } from "react"
import { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import type { Shop } from "@/types"

interface AuthContextType {
  user: User | null
  shop: Shop | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, shopName: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [shop, setShop] = useState<Shop | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let isMounted = true
    let isInitialized = false

    const fetchShop = async (shopId: string | undefined) => {
      if (!shopId) return null

      try {
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise<null>((resolve) => {
          setTimeout(() => resolve(null), 5000)
        })

        const queryPromise = supabase
          .from("shops")
          .select("*")
          .eq("id", shopId)
          .single()
          .then(({ data: shopData, error }) => {
            if (error) {
              console.error("Error fetching shop:", error)
              return null
            }
            return shopData
          })

        return await Promise.race([queryPromise, timeoutPromise])
      } catch (err) {
        console.error("fetchShop exception:", err)
        return null
      }
    }

    const handleAuthChange = async (currentUser: User | null) => {
      if (!isMounted) return

      if (currentUser) {
        setUser(currentUser)
        const shopId = currentUser.user_metadata?.shop_id
        if (shopId) {
          const shopData = await fetchShop(shopId)
          if (isMounted) setShop(shopData)
        }
      } else {
        setUser(null)
        setShop(null)
      }
    }

    // Initialize auth state immediately by checking current session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error("Error getting session:", error)
        }
        await handleAuthChange(session?.user ?? null)
      } catch (error) {
        console.error("Error initializing auth:", error)
      } finally {
        isInitialized = true
        if (isMounted) setLoading(false)
      }
    }

    initializeAuth()

    // Set up auth state listener for subsequent changes (after initialization)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return
        // Skip if not yet initialized - the initializeAuth will handle it
        if (!isInitialized) return
        await handleAuthChange(session?.user ?? null)
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error: error as Error | null }
  }

  const signUp = async (email: string, password: string, shopName: string) => {
    // Use the secure RPC function to create shop and menu
    // This bypasses RLS since the user isn't authenticated yet
    const { data: shopData, error: shopError } = await supabase
      .rpc("create_shop_for_signup", { shop_name: shopName })
      .single()

    if (shopError) {
      return { error: shopError as Error }
    }

    // Then sign up the user with shop_id in metadata
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          shop_id: shopData.shop_id,
          shop_name: shopName,
        },
      },
    })

    return { error: authError as Error | null }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error("Error signing out:", error)
        throw error
      }
      setUser(null)
      setShop(null)
    } catch (error) {
      console.error("Error in signOut:", error)
      // Clear state even if signOut fails
      setUser(null)
      setShop(null)
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{ user, shop, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
