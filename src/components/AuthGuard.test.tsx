import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { useRouter } from "next/navigation"

// Create a standalone AuthGuard component for testing
// (extracted from layout.tsx for testability)
import React, { useEffect } from "react"
import { AuthProvider, useAuth } from "@/contexts/AuthContext"

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [authLoading, user, router])

  if (authLoading) {
    return (
      <div data-testid="loading-spinner">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div data-testid="loading-spinner-redirect">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return <>{children}</>
}

// Mock the supabase client module
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}))

import { createClient } from "@/lib/supabase/client"
import {
  createMockSupabaseClient,
  mockSession,
  mockShop,
} from "@/test/mocks/supabase"

// Get the mock router
const mockPush = vi.fn()
vi.mock("next/navigation", async () => {
  const actual = await vi.importActual("next/navigation")
  return {
    ...actual,
    useRouter: () => ({
      push: mockPush,
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    }),
    usePathname: () => "/events",
  }
})

describe("AuthGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPush.mockClear()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe("loading state", () => {
    it("should show loading spinner while auth is loading", async () => {
      // Create a mock that delays the session response
      const mockSupabase = createMockSupabaseClient()
      mockSupabase.auth.getSession = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: { session: null }, error: null }), 1000))
      )
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      render(
        <AuthProvider>
          <AuthGuard>
            <div data-testid="protected-content">Protected Content</div>
          </AuthGuard>
        </AuthProvider>
      )

      // Should show loading spinner initially
      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument()
      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument()
    })
  })

  describe("authenticated user", () => {
    it("should render children when user is authenticated", async () => {
      const mockSupabase = createMockSupabaseClient({
        session: mockSession,
        shop: mockShop,
      })
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      render(
        <AuthProvider>
          <AuthGuard>
            <div data-testid="protected-content">Protected Content</div>
          </AuthGuard>
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("protected-content")).toBeInTheDocument()
      })

      expect(mockPush).not.toHaveBeenCalled()
    })

    it("should not redirect authenticated user", async () => {
      const mockSupabase = createMockSupabaseClient({
        session: mockSession,
        shop: mockShop,
      })
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      render(
        <AuthProvider>
          <AuthGuard>
            <div data-testid="protected-content">Protected Content</div>
          </AuthGuard>
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("protected-content")).toBeInTheDocument()
      })

      // Wait a bit more to ensure no redirect happens
      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe("unauthenticated user", () => {
    it("should redirect to login when no user and loading is complete", async () => {
      const mockSupabase = createMockSupabaseClient({ session: null })
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      render(
        <AuthProvider>
          <AuthGuard>
            <div data-testid="protected-content">Protected Content</div>
          </AuthGuard>
        </AuthProvider>
      )

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/login")
      })

      // Should not render protected content
      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument()
    })

    it("should show spinner while redirecting", async () => {
      const mockSupabase = createMockSupabaseClient({ session: null })
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      render(
        <AuthProvider>
          <AuthGuard>
            <div data-testid="protected-content">Protected Content</div>
          </AuthGuard>
        </AuthProvider>
      )

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/login")
      })

      // Should still show spinner (for redirect)
      expect(screen.getByTestId("loading-spinner-redirect")).toBeInTheDocument()
    })
  })

  describe("session expiry", () => {
    it("should redirect to login when session expires", async () => {
      const mockSupabase = createMockSupabaseClient({
        session: mockSession,
        shop: mockShop,
      })
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      render(
        <AuthProvider>
          <AuthGuard>
            <div data-testid="protected-content">Protected Content</div>
          </AuthGuard>
        </AuthProvider>
      )

      // Wait for initial render with user
      await waitFor(() => {
        expect(screen.getByTestId("protected-content")).toBeInTheDocument()
      })

      // Simulate session expiry (sign out)
      mockSupabase._simulateAuthStateChange("SIGNED_OUT", null)

      await waitFor(() => {
        expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument()
      })
    })
  })

  describe("error scenarios", () => {
    it("should redirect to login when getSession throws error", async () => {
      const mockSupabase = createMockSupabaseClient({
        getSessionError: new Error("Network error"),
      })
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      render(
        <AuthProvider>
          <AuthGuard>
            <div data-testid="protected-content">Protected Content</div>
          </AuthGuard>
        </AuthProvider>
      )

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/login")
      })

      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument()
    })
  })

  describe("race conditions", () => {
    it("should handle rapid mount/unmount without errors", async () => {
      const mockSupabase = createMockSupabaseClient({
        session: mockSession,
        shop: mockShop,
      })
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const { unmount, rerender } = render(
        <AuthProvider>
          <AuthGuard>
            <div data-testid="protected-content">Protected Content</div>
          </AuthGuard>
        </AuthProvider>
      )

      // Rapidly unmount and remount
      unmount()

      // Re-render
      render(
        <AuthProvider>
          <AuthGuard>
            <div data-testid="protected-content">Protected Content</div>
          </AuthGuard>
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("protected-content")).toBeInTheDocument()
      })
    })
  })
})
