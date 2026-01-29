import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { updateSession } from "./middleware"

// Mock the Supabase SSR module
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}))

import { createServerClient } from "@supabase/ssr"

// Mock NextResponse
vi.mock("next/server", async () => {
  const actual = await vi.importActual("next/server")
  return {
    ...actual,
    NextResponse: {
      next: vi.fn().mockImplementation(({ request }) => ({
        cookies: {
          set: vi.fn(),
          get: vi.fn(),
          getAll: vi.fn().mockReturnValue([]),
        },
        headers: new Headers(),
      })),
      redirect: vi.fn().mockImplementation((url) => ({
        type: "redirect",
        url: url.toString(),
        cookies: {
          set: vi.fn(),
        },
      })),
    },
  }
})

// Helper to create a mock request
function createMockRequest(pathname: string, cookies: Record<string, string> = {}) {
  const url = new URL(`http://localhost:3000${pathname}`)

  return {
    nextUrl: {
      pathname,
      clone: () => ({
        pathname,
        toString: () => url.toString(),
      }),
    },
    cookies: {
      getAll: () => Object.entries(cookies).map(([name, value]) => ({ name, value })),
      set: vi.fn(),
      get: vi.fn((name) => cookies[name] ? { name, value: cookies[name] } : undefined),
    },
    headers: new Headers(),
    url: url.toString(),
  } as unknown as NextRequest
}

describe("updateSession middleware", () => {
  let mockSupabaseClient: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabaseClient = {
      auth: {
        getUser: vi.fn(),
      },
    }

    vi.mocked(createServerClient).mockReturnValue(mockSupabaseClient)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe("protected routes", () => {
    const protectedPaths = ["/events", "/intake", "/menu", "/analytics"]

    protectedPaths.forEach((path) => {
      it(`should redirect to login when accessing ${path} without auth`, async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null,
        })

        const request = createMockRequest(path)
        const response = await updateSession(request)

        expect(NextResponse.redirect).toHaveBeenCalled()
        const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0][0]
        expect(redirectCall.pathname).toBe("/login")
      })

      it(`should allow access to ${path} when authenticated`, async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: {
            user: {
              id: "user-123",
              email: "test@example.com",
            },
          },
          error: null,
        })

        const request = createMockRequest(path)
        const response = await updateSession(request)

        expect(NextResponse.redirect).not.toHaveBeenCalled()
      })
    })

    it("should redirect to login for nested protected routes", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest("/events/123/orders")
      const response = await updateSession(request)

      expect(NextResponse.redirect).toHaveBeenCalled()
      const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0][0]
      expect(redirectCall.pathname).toBe("/login")
    })
  })

  describe("login page", () => {
    it("should redirect authenticated users away from login page", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            email: "test@example.com",
          },
        },
        error: null,
      })

      const request = createMockRequest("/login")
      const response = await updateSession(request)

      expect(NextResponse.redirect).toHaveBeenCalled()
      const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0][0]
      expect(redirectCall.pathname).toBe("/events")
    })

    it("should allow unauthenticated users to access login page", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest("/login")
      const response = await updateSession(request)

      // Should not redirect
      expect(NextResponse.redirect).not.toHaveBeenCalled()
    })
  })

  describe("public routes", () => {
    it("should allow access to root path without auth", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest("/")
      const response = await updateSession(request)

      // Should not redirect to login
      expect(NextResponse.redirect).not.toHaveBeenCalled()
    })
  })

  describe("cookie handling", () => {
    it("should provide setAll callback to Supabase client", async () => {
      let capturedCookieOptions: any = null

      vi.mocked(createServerClient).mockImplementation((url, key, options) => {
        capturedCookieOptions = options.cookies
        return mockSupabaseClient
      })

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest("/login")
      await updateSession(request)

      // Verify the cookie handlers are provided
      expect(capturedCookieOptions).toBeDefined()
      expect(capturedCookieOptions.setAll).toBeDefined()
      expect(typeof capturedCookieOptions.setAll).toBe("function")
      expect(capturedCookieOptions.getAll).toBeDefined()
      expect(typeof capturedCookieOptions.getAll).toBe("function")
    })

    it("should pass all cookies to Supabase client via getAll", async () => {
      let capturedGetAll: any = null

      vi.mocked(createServerClient).mockImplementation((url, key, options) => {
        capturedGetAll = options.cookies.getAll
        return mockSupabaseClient
      })

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest("/login", {
        "sb-token": "existing-token",
        "other-cookie": "value",
      })
      await updateSession(request)

      expect(capturedGetAll).toBeDefined()
      const cookies = capturedGetAll()
      expect(cookies).toHaveLength(2)
      expect(cookies).toContainEqual({ name: "sb-token", value: "existing-token" })
    })
  })

  describe("error handling", () => {
    it("should handle getUser error gracefully", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error("Auth error"),
      })

      const request = createMockRequest("/events")

      // Should not throw, should redirect to login
      const response = await updateSession(request)
      expect(NextResponse.redirect).toHaveBeenCalled()
    })
  })
})
