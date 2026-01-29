"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { OrderGrid } from "@/components/orders/OrderGrid"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, PlusCircle, BarChart3 } from "lucide-react"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import type { Event, Item, Order, OrderItem, Customer } from "@/types"

interface OrderWithDetails extends Order {
  customer: Customer
  order_items: (OrderItem & { item: Item })[]
}

export default function EventOrdersPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.eventId as string
  const supabase = useMemo(() => createClient(), [])

  const [event, setEvent] = useState<Event | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [orders, setOrders] = useState<OrderWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState<OrderWithDetails | null>(null)

  // Fetch event data
  useEffect(() => {
    const fetchEvent = async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single()

      if (data) {
        setEvent(data)
      }
      setLoading(false)
    }

    fetchEvent()
  }, [eventId, supabase])

  // Fetch menu items for this event
  const fetchItems = useCallback(async () => {
    if (!event?.menu_id) return

    const { data } = await supabase
      .from("items")
      .select("*")
      .eq("menu_id", event.menu_id)
      .order("code")

    if (data) {
      setItems(data)
    }
  }, [event?.menu_id, supabase])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // Fetch orders for this event
  const fetchOrders = useCallback(async () => {
    const { data } = await supabase
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

    if (data) {
      setOrders(data as OrderWithDetails[])
    }
  }, [eventId, supabase])

  useEffect(() => {
    fetchOrders()

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
        () => fetchOrders()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_items",
        },
        () => fetchOrders()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId, fetchOrders, supabase])

  // Order actions
  const markAsComplete = async (orderId: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", orderId)

    if (error) {
      console.error("Failed to mark order as complete:", error)
    }
  }

  const undoComplete = async (orderId: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ completed_at: null })
      .eq("id", orderId)

    if (error) {
      console.error("Failed to undo order completion:", error)
    }
  }

  const handleEdit = (orderId: string) => {
    router.push(`/events/${eventId}/orders/${orderId}/edit`)
  }

  const handleDeleteClick = (orderId: string) => {
    const order = orders.find(o => o.id === orderId)
    if (order) {
      setDeleteConfirm(order)
    }
  }

  const confirmDeleteOrder = async () => {
    if (!deleteConfirm) return

    // Delete order items first (due to foreign key constraint)
    await supabase
      .from("order_items")
      .delete()
      .eq("order_id", deleteConfirm.id)

    // Then delete the order
    await supabase
      .from("orders")
      .delete()
      .eq("id", deleteConfirm.id)

    setDeleteConfirm(null)
  }

  // Item sales calculation
  const itemCounts = useMemo(() => {
    const counts: Record<string, { item: Item; count: number }> = {}

    // Only count items from completed orders
    orders
      .filter(order => order.completed_at !== null)
      .forEach(order => {
        order.order_items.forEach(orderItem => {
          const itemId = orderItem.item_id
          if (!counts[itemId]) {
            counts[itemId] = { item: orderItem.item, count: 0 }
          }
          counts[itemId].count++
        })
      })

    // Sort by item code
    return Object.values(counts).sort((a, b) => a.item.code.localeCompare(b.item.code))
  }, [orders])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">Event not found</p>
        <Link href="/events">
          <Button className="mt-4">Back to Events</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header - Mobile optimized */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <Link href={`/events/${eventId}`}>
            <Button variant="ghost" size="sm" className="h-9 px-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold">Orders</h1>
        </div>
        <div className="sm:ml-auto">
          {event.status !== "complete" ? (
            <Link href={`/events/${eventId}/intake`} className="block">
              <Button size="lg" className="w-full sm:w-auto h-12 text-base gap-2">
                <PlusCircle className="h-5 w-5" />
                New Order
              </Button>
            </Link>
          ) : (
            <Button size="lg" className="w-full sm:w-auto h-12 text-base gap-2" disabled>
              <PlusCircle className="h-5 w-5" />
              New Order
            </Button>
          )}
        </div>
      </div>

      {/* Stats toggle - Compact */}
      <details className="bg-gray-50 rounded-lg border">
        <summary className="px-3 py-2 cursor-pointer text-sm font-medium text-gray-600 flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Total Completed
          {itemCounts.length > 0 && (
            <span className="ml-auto text-gray-900 font-bold">
              {itemCounts.reduce((sum, { count }) => sum + count, 0)}
            </span>
          )}
        </summary>
        <div className="px-3 pb-3 pt-1">
          <div className="flex flex-wrap gap-2">
            {itemCounts.length === 0 ? (
              <span className="text-muted-foreground text-sm">No items completed yet</span>
            ) : (
              itemCounts.map(({ item, count }) => (
                <div
                  key={item.id}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white border text-sm"
                >
                  <span
                    className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: item.color || "#6366f1" }}
                  >
                    {item.code}
                  </span>
                  <span className="text-gray-600">{item.name}</span>
                  <span className="font-bold text-gray-900">{count}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </details>

      <OrderGrid
        orders={orders as any}
        items={items}
        onMarkComplete={markAsComplete}
        onUndoComplete={undoComplete}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        isComplete={event.status === "complete"}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Delete Order"
        description={`Are you sure you want to delete order #${deleteConfirm?.order_number} for ${deleteConfirm?.customer.name}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={confirmDeleteOrder}
      />
    </div>
  )
}

