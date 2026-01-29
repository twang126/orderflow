import { vi } from "vitest"
import type { User, Session } from "@supabase/supabase-js"

// Mock user data
export const mockUser: User = {
  id: "user-123",
  app_metadata: {},
  user_metadata: {
    shop_id: "shop-123",
    shop_name: "Test Shop",
  },
  aud: "authenticated",
  created_at: "2024-01-01T00:00:00.000Z",
  email: "test@example.com",
  phone: "",
  confirmed_at: "2024-01-01T00:00:00.000Z",
  last_sign_in_at: "2024-01-01T00:00:00.000Z",
  role: "authenticated",
  updated_at: "2024-01-01T00:00:00.000Z",
}

export const mockSession: Session = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  token_type: "bearer",
  user: mockUser,
}

export const mockShop = {
  id: "shop-123",
  name: "Test Shop",
  default_menu_id: "menu-123",
  created_at: "2024-01-01T00:00:00.000Z",
}

// Type for auth state change callback
type AuthStateChangeCallback = (
  event: string,
  session: Session | null
) => void | Promise<void>

// Create a controllable mock for Supabase
export function createMockSupabaseClient(options: {
  session?: Session | null
  user?: User | null
  shop?: typeof mockShop | null
  getSessionError?: Error | null
  getUserError?: Error | null
  shopQueryError?: Error | null
} = {}) {
  const {
    session = null,
    user = null,
    shop = null,
    getSessionError = null,
    getUserError = null,
    shopQueryError = null,
  } = options

  let authStateChangeCallback: AuthStateChangeCallback | null = null

  const mockSupabase = {
    auth: {
      getSession: vi.fn().mockImplementation(async () => {
        if (getSessionError) {
          return { data: { session: null }, error: getSessionError }
        }
        return { data: { session }, error: null }
      }),
      getUser: vi.fn().mockImplementation(async () => {
        if (getUserError) {
          return { data: { user: null }, error: getUserError }
        }
        return { data: { user: user ?? session?.user ?? null }, error: null }
      }),
      onAuthStateChange: vi.fn().mockImplementation((callback: AuthStateChangeCallback) => {
        authStateChangeCallback = callback
        // Immediately call with current session state
        callback("INITIAL_SESSION", session)
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        }
      }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user, session }, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { user, session }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "shops") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockImplementation(async () => {
            if (shopQueryError) {
              return { data: null, error: shopQueryError }
            }
            return { data: shop, error: null }
          }),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
        }
      }
      if (table === "menus") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: "menu-123", name: "Default Menu", shop_id: "shop-123" },
            error: null,
          }),
          insert: vi.fn().mockReturnThis(),
        }
      }
      if (table === "events") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
          insert: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
        }
      }
      if (table === "items") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
      }
    }),
    // Helper to simulate auth state changes in tests
    _simulateAuthStateChange: (event: string, newSession: Session | null) => {
      if (authStateChangeCallback) {
        authStateChangeCallback(event, newSession)
      }
    },
  }

  return mockSupabase
}

// Default mock that can be overridden
export const defaultMockSupabase = createMockSupabaseClient()
