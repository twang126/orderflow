import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { EventProvider, useEvent } from "./EventContext"
import { AuthProvider } from "./AuthContext"
import {
  createMockSupabaseClient,
  mockSession,
  mockShop,
} from "@/test/mocks/supabase"

// Mock the supabase client module
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}))

import { createClient } from "@/lib/supabase/client"

const mockEvents = [
  {
    id: "event-1",
    shop_id: "shop-123",
    name: "Event 1",
    date: "2024-01-01",
    status: "in_progress",
    menu_id: "menu-123",
  },
  {
    id: "event-2",
    shop_id: "shop-123",
    name: "Event 2",
    date: "2024-01-02",
    status: "future",
    menu_id: "menu-123",
  },
]

const mockItems = [
  {
    id: "item-1",
    menu_id: "menu-123",
    name: "Item 1",
    code: "A",
    price: 5.99,
    color: "#6366f1",
  },
  {
    id: "item-2",
    menu_id: "menu-123",
    name: "Item 2",
    code: "B",
    price: 7.99,
    color: "#22c55e",
  },
]

// Test component to access event context
function TestConsumer() {
  const { events, currentEvent, menu, items, loading } = useEvent()
  return (
    <div>
      <div data-testid="loading">{loading ? "loading" : "not-loading"}</div>
      <div data-testid="events-count">{events.length}</div>
      <div data-testid="current-event">
        {currentEvent ? currentEvent.name : "no-event"}
      </div>
      <div data-testid="menu">{menu ? menu.name : "no-menu"}</div>
      <div data-testid="items-count">{items.length}</div>
    </div>
  )
}

// Wrapper component that includes AuthProvider
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <EventProvider>{children}</EventProvider>
    </AuthProvider>
  )
}

describe("EventContext", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe("initialization", () => {
    it("should start with loading=true then set to false", async () => {
      const mockSupabase = createMockSupabaseClient({
        session: mockSession,
        shop: mockShop,
      })
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      render(
        <TestWrapper>
          <TestConsumer />
        </TestWrapper>
      )

      // Eventually should stop loading
      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("not-loading")
      })
    })

    it("should set loading=false even when no shop is available", async () => {
      const mockSupabase = createMockSupabaseClient({ session: null })
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      render(
        <TestWrapper>
          <TestConsumer />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("not-loading")
      })

      expect(screen.getByTestId("events-count")).toHaveTextContent("0")
    })

    it("should fetch events when shop is available", async () => {
      const mockSupabase = createMockSupabaseClient({
        session: mockSession,
        shop: mockShop,
      })
      // Override the events query
      mockSupabase.from = vi.fn().mockImplementation((table: string) => {
        if (table === "events") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockEvents, error: null }),
          }
        }
        if (table === "shops") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockShop, error: null }),
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
          }
        }
        if (table === "items") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockItems, error: null }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      })
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      render(
        <TestWrapper>
          <TestConsumer />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId("events-count")).toHaveTextContent("2")
      })
    })
  })

  describe("error handling", () => {
    it("should handle events fetch error gracefully", async () => {
      const mockSupabase = createMockSupabaseClient({
        session: mockSession,
        shop: mockShop,
      })
      mockSupabase.from = vi.fn().mockImplementation((table: string) => {
        if (table === "events") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: null,
              error: new Error("Database error"),
            }),
          }
        }
        if (table === "shops") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockShop, error: null }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      })
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      render(
        <TestWrapper>
          <TestConsumer />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("not-loading")
      })

      // Should have 0 events due to error
      expect(screen.getByTestId("events-count")).toHaveTextContent("0")
    })
  })

  describe("useEvent hook", () => {
    it("should throw error when used outside of EventProvider", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      expect(() => {
        render(<TestConsumer />)
      }).toThrow("useEvent must be used within an EventProvider")

      consoleSpy.mockRestore()
    })
  })

  describe("shop dependency", () => {
    it("should re-fetch events when shop changes", async () => {
      const mockSupabase = createMockSupabaseClient({
        session: mockSession,
        shop: mockShop,
      })
      const fetchEventsSpy = vi.fn().mockResolvedValue({ data: mockEvents, error: null })
      mockSupabase.from = vi.fn().mockImplementation((table: string) => {
        if (table === "events") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: fetchEventsSpy,
          }
        }
        if (table === "shops") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockShop, error: null }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      })
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      render(
        <TestWrapper>
          <TestConsumer />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(fetchEventsSpy).toHaveBeenCalled()
      })
    })
  })
})
