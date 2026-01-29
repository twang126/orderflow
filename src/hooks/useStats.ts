"use client"

import { useMemo } from "react"
import type { Order } from "@/types"
import { getOrderStatus } from "@/types"

interface Stats {
  totalOrders: number
  pendingCount: number
  completedCount: number
  avgCompletionTime: number | null
}

export function useStats(orders: Order[]): Stats {
  return useMemo(() => {
    const totalOrders = orders.length
    let pendingCount = 0
    let completedCount = 0

    const completionTimes: number[] = []

    for (const order of orders) {
      const status = getOrderStatus(order)
      switch (status) {
        case "pending":
          pendingCount++
          break
        case "completed":
          completedCount++
          break
      }

      // Calculate completion time (created -> completed)
      if (order.completed_at) {
        const created = new Date(order.created_at).getTime()
        const completed = new Date(order.completed_at).getTime()
        completionTimes.push(completed - created)
      }
    }

    const avgCompletionTime = completionTimes.length > 0
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
      : null

    return {
      totalOrders,
      pendingCount,
      completedCount,
      avgCompletionTime,
    }
  }, [orders])
}
