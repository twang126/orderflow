"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Order, OrderItem, Customer, Item } from "@/types"

interface OrderWithDetails extends Order {
  customer: Customer
  order_items: (OrderItem & { item: Item })[]
}

export function useOrders(eventId: string | null) {
  const [orders, setOrders] = useState<OrderWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  const fetchOrders = useCallback(async () => {
    if (!eventId) {
      setOrders([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        customer:customers(*),
        order_items(
          *,
          item:items(*)
        )
      `)
      .eq("event_id", eventId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching orders:", error)
    } else {
      setOrders(data as OrderWithDetails[])
    }
    setLoading(false)
  }, [eventId, supabase])

  useEffect(() => {
    fetchOrders()

    if (!eventId) return

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`orders:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          // Refetch all orders on any change
          fetchOrders()
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_items",
        },
        () => {
          fetchOrders()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId, fetchOrders, supabase])

  const markAsReady = async (orderId: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ ready_at: new Date().toISOString() })
      .eq("id", orderId)

    if (error) {
      console.error("Error marking order as ready:", error)
      throw error
    }
  }

  const markAsPickedUp = async (orderId: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ picked_up_at: new Date().toISOString() })
      .eq("id", orderId)

    if (error) {
      console.error("Error marking order as picked up:", error)
      throw error
    }
  }

  const undoReady = async (orderId: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ ready_at: null })
      .eq("id", orderId)

    if (error) {
      console.error("Error undoing ready status:", error)
      throw error
    }
  }

  const undoPickedUp = async (orderId: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ picked_up_at: null })
      .eq("id", orderId)

    if (error) {
      console.error("Error undoing picked up status:", error)
      throw error
    }
  }

  return {
    orders,
    loading,
    refetch: fetchOrders,
    markAsReady,
    markAsPickedUp,
    undoReady,
    undoPickedUp,
  }
}
