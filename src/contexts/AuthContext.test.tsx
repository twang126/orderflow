import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import { AuthProvider, useAuth } from "./AuthContext"
import {
  createMockSupabaseClient,
  mockUser,
  mockSession,
  mockShop,
} from "@/test/mocks/supabase"

// Mock the supabase client module
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}))

import { createClient } from "@/lib/supabase/client"

// Test component to access auth context
function TestConsumer() {
  const { user, shop, loading } = useAuth()
  return (
    <div>
      <div data-testid="loading">{loading ? "loading" : "not-loading"}</div>
      <div data-testid="user">{user ? user.email : "no-user"}</div>
      <div data-testid="shop">{shop ? shop.name : "no-shop"}</div>
    </div>
  )
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe("initialization", () => {
    it("should start with loading=true", async () => {
      const mockSupabase = createMockSupabaseClient()
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      // Initially should be loading
      expect(screen.getByTestId("loading")).toHaveTextContent("loading")
    })

    it("should set loading=false after getSession completes with no session", async () => {
      const mockSupabase = createMockSupabaseClient({ session: null })
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("not-loading")
      })

      expect(screen.getByTestId("user")).toHaveTextContent("no-user")
      expect(screen.getByTestId("shop")).toHaveTextContent("no-shop")
    })

    it("should set user and loading=false after getSession completes with session", async () => {
      const mockSupabase = createMockSupabaseClient({
        session: mockSession,
        shop: mockShop,
      })
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("not-loading")
      })

      expect(screen.getByTestId("user")).toHaveTextContent("test@example.com")
    })

    it("should fetch shop data when user has shop_id in metadata", async () => {
      const mockSupabase = createMockSupabaseClient({
        session: mockSession,
        shop: mockShop,
      })
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("shop")).toHaveTextContent("Test Shop")
      })
    })

    it("should handle getSession error gracefully", async () => {
      const mockSupabase = createMockSupabaseClient({
        getSessionError: new Error("Network error"),
      })
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("not-loading")
      })

      expect(screen.getByTestId("user")).toHaveTextContent("no-user")
    })

    it("should handle shop fetch error gracefully", async () => {
      const mockSupabase = createMockSupabaseClient({
        session: mockSession,
        shopQueryError: new Error("Database error"),
      })
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("not-loading")
      })

      // User should still be set even if shop fetch fails
      expect(screen.getByTestId("user")).toHaveTextContent("test@example.com")
      expect(screen.getByTestId("shop")).toHaveTextContent("no-shop")
    })

    it("should set loading=false even when there is no shop_id in user metadata", async () => {
      const userWithoutShop = {
        ...mockUser,
        user_metadata: {},
      }
      const sessionWithoutShop = {
        ...mockSession,
        user: userWithoutShop,
      }
      const mockSupabase = createMockSupabaseClient({
        session: sessionWithoutShop,
      })
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("not-loading")
      })

      expect(screen.getByTestId("user")).toHaveTextContent("test@example.com")
      expect(screen.getByTestId("shop")).toHaveTextContent("no-shop")
    })
  })

  describe("auth state changes", () => {
    it("should update user when auth state changes to signed in", async () => {
      const mockSupabase = createMockSupabaseClient({ session: null })
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("not-loading")
      })

      expect(screen.getByTestId("user")).toHaveTextContent("no-user")

      // Simulate sign in
      act(() => {
        mockSupabase._simulateAuthStateChange("SIGNED_IN", mockSession)
      })

      await waitFor(() => {
        expect(screen.getByTestId("user")).toHaveTextContent("test@example.com")
      })
    })

    it("should clear user when auth state changes to signed out", async () => {
      const mockSupabase = createMockSupabaseClient({
        session: mockSession,
        shop: mockShop,
      })
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("user")).toHaveTextContent("test@example.com")
      })

      // Simulate sign out
      act(() => {
        mockSupabase._simulateAuthStateChange("SIGNED_OUT", null)
      })

      await waitFor(() => {
        expect(screen.getByTestId("user")).toHaveTextContent("no-user")
        expect(screen.getByTestId("shop")).toHaveTextContent("no-shop")
      })
    })
  })

  describe("cleanup", () => {
    it("should unsubscribe from auth state changes on unmount", async () => {
      const mockSupabase = createMockSupabaseClient({ session: null })
      const unsubscribeMock = vi.fn()
      mockSupabase.auth.onAuthStateChange = vi.fn().mockReturnValue({
        data: {
          subscription: {
            unsubscribe: unsubscribeMock,
          },
        },
      })
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const { unmount } = render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("not-loading")
      })

      unmount()

      expect(unsubscribeMock).toHaveBeenCalled()
    })

    it("should not update state after unmount", async () => {
      const mockSupabase = createMockSupabaseClient({ session: null })
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const { unmount } = render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("not-loading")
      })

      unmount()

      // This should not cause any errors (state update on unmounted component)
      act(() => {
        mockSupabase._simulateAuthStateChange("SIGNED_IN", mockSession)
      })
    })
  })

  describe("useAuth hook", () => {
    it("should throw error when used outside of AuthProvider", () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      expect(() => {
        render(<TestConsumer />)
      }).toThrow("useAuth must be used within an AuthProvider")

      consoleSpy.mockRestore()
    })
  })
})
