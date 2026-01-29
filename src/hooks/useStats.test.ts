"use client"

import { describe, it, expect } from "vitest"
import { renderHook } from "@testing-library/react"
import { useStats } from "./useStats"
import type { Order } from "@/types"

// Helper to create mock orders
function createMockOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "order-1",
    event_id: "event-1",
    customer_id: "customer-1",
    order_number: 1,
    created_at: "2024-01-15T10:00:00Z",
    completed_at: null,
    ...overrides,
  }
}

describe("useStats", () => {
  describe("totalOrders", () => {
    it("should return 0 for empty orders array", () => {
      const { result } = renderHook(() => useStats([]))
      expect(result.current.totalOrders).toBe(0)
    })

    it("should count all orders", () => {
      const orders = [
        createMockOrder({ id: "order-1" }),
        createMockOrder({ id: "order-2" }),
        createMockOrder({ id: "order-3" }),
      ]
      const { result } = renderHook(() => useStats(orders))
      expect(result.current.totalOrders).toBe(3)
    })
  })

  describe("pendingCount", () => {
    it("should return 0 when no orders", () => {
      const { result } = renderHook(() => useStats([]))
      expect(result.current.pendingCount).toBe(0)
    })

    it("should count orders without completed_at as pending", () => {
      const orders = [
        createMockOrder({ id: "order-1", completed_at: null }),
        createMockOrder({ id: "order-2", completed_at: null }),
        createMockOrder({ id: "order-3", completed_at: "2024-01-15T10:05:00Z" }),
      ]
      const { result } = renderHook(() => useStats(orders))
      expect(result.current.pendingCount).toBe(2)
    })

    it("should count all orders as pending when none are completed", () => {
      const orders = [
        createMockOrder({ id: "order-1", completed_at: null }),
        createMockOrder({ id: "order-2", completed_at: null }),
      ]
      const { result } = renderHook(() => useStats(orders))
      expect(result.current.pendingCount).toBe(2)
    })
  })

  describe("completedCount", () => {
    it("should return 0 when no orders", () => {
      const { result } = renderHook(() => useStats([]))
      expect(result.current.completedCount).toBe(0)
    })

    it("should count orders with completed_at as completed", () => {
      const orders = [
        createMockOrder({ id: "order-1", completed_at: "2024-01-15T10:05:00Z" }),
        createMockOrder({ id: "order-2", completed_at: null }),
        createMockOrder({ id: "order-3", completed_at: "2024-01-15T10:10:00Z" }),
      ]
      const { result } = renderHook(() => useStats(orders))
      expect(result.current.completedCount).toBe(2)
    })

    it("should count all orders as completed when all have completed_at", () => {
      const orders = [
        createMockOrder({ id: "order-1", completed_at: "2024-01-15T10:05:00Z" }),
        createMockOrder({ id: "order-2", completed_at: "2024-01-15T10:10:00Z" }),
      ]
      const { result } = renderHook(() => useStats(orders))
      expect(result.current.completedCount).toBe(2)
    })
  })

  describe("avgCompletionTime", () => {
    it("should return null when no orders", () => {
      const { result } = renderHook(() => useStats([]))
      expect(result.current.avgCompletionTime).toBeNull()
    })

    it("should return null when no completed orders", () => {
      const orders = [
        createMockOrder({ id: "order-1", completed_at: null }),
        createMockOrder({ id: "order-2", completed_at: null }),
      ]
      const { result } = renderHook(() => useStats(orders))
      expect(result.current.avgCompletionTime).toBeNull()
    })

    it("should calculate average completion time for single order", () => {
      const orders = [
        createMockOrder({
          id: "order-1",
          created_at: "2024-01-15T10:00:00Z",
          completed_at: "2024-01-15T10:05:00Z", // 5 minutes = 300000ms
        }),
      ]
      const { result } = renderHook(() => useStats(orders))
      expect(result.current.avgCompletionTime).toBe(300000)
    })

    it("should calculate average completion time for multiple orders", () => {
      const orders = [
        createMockOrder({
          id: "order-1",
          created_at: "2024-01-15T10:00:00Z",
          completed_at: "2024-01-15T10:05:00Z", // 5 minutes = 300000ms
        }),
        createMockOrder({
          id: "order-2",
          created_at: "2024-01-15T10:10:00Z",
          completed_at: "2024-01-15T10:13:00Z", // 3 minutes = 180000ms
        }),
      ]
      const { result } = renderHook(() => useStats(orders))
      // Average of 300000 and 180000 = 240000ms (4 minutes)
      expect(result.current.avgCompletionTime).toBe(240000)
    })

    it("should only include completed orders in average calculation", () => {
      const orders = [
        createMockOrder({
          id: "order-1",
          created_at: "2024-01-15T10:00:00Z",
          completed_at: "2024-01-15T10:05:00Z", // 5 minutes = 300000ms
        }),
        createMockOrder({
          id: "order-2",
          created_at: "2024-01-15T10:10:00Z",
          completed_at: null, // Not completed - should be excluded
        }),
        createMockOrder({
          id: "order-3",
          created_at: "2024-01-15T10:15:00Z",
          completed_at: "2024-01-15T10:17:00Z", // 2 minutes = 120000ms
        }),
      ]
      const { result } = renderHook(() => useStats(orders))
      // Average of 300000 and 120000 = 210000ms (3.5 minutes)
      expect(result.current.avgCompletionTime).toBe(210000)
    })

    it("should handle orders completed at the same time they were created", () => {
      const orders = [
        createMockOrder({
          id: "order-1",
          created_at: "2024-01-15T10:00:00Z",
          completed_at: "2024-01-15T10:00:00Z", // 0ms
        }),
      ]
      const { result } = renderHook(() => useStats(orders))
      expect(result.current.avgCompletionTime).toBe(0)
    })
  })

  describe("combined stats", () => {
    it("should return correct stats for mixed orders", () => {
      const orders = [
        createMockOrder({
          id: "order-1",
          created_at: "2024-01-15T10:00:00Z",
          completed_at: "2024-01-15T10:02:00Z", // 2 minutes
        }),
        createMockOrder({
          id: "order-2",
          created_at: "2024-01-15T10:05:00Z",
          completed_at: null, // pending
        }),
        createMockOrder({
          id: "order-3",
          created_at: "2024-01-15T10:10:00Z",
          completed_at: "2024-01-15T10:14:00Z", // 4 minutes
        }),
        createMockOrder({
          id: "order-4",
          created_at: "2024-01-15T10:15:00Z",
          completed_at: null, // pending
        }),
      ]

      const { result } = renderHook(() => useStats(orders))

      expect(result.current.totalOrders).toBe(4)
      expect(result.current.pendingCount).toBe(2)
      expect(result.current.completedCount).toBe(2)
      // Average of 120000ms and 240000ms = 180000ms (3 minutes)
      expect(result.current.avgCompletionTime).toBe(180000)
    })
  })

  describe("memoization", () => {
    it("should return same reference when orders array is unchanged", () => {
      const orders = [createMockOrder({ id: "order-1" })]
      const { result, rerender } = renderHook(() => useStats(orders))

      const firstResult = result.current
      rerender()
      const secondResult = result.current

      expect(firstResult).toBe(secondResult)
    })
  })
})
