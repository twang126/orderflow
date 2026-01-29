"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { formatDuration } from "@/lib/utils"
import {
  DollarSign,
  Package,
  Clock,
  TrendingUp,
  ShoppingBag,
  Users,
} from "lucide-react"
import type { Item } from "@/types"

interface OrderWithItems {
  id: string
  created_at: string
  completed_at: string | null
  order_items: { item: Item }[]
}

interface EventSummaryProps {
  eventId: string
  menuId: string | null
}

interface ItemSales {
  item: Item
  quantity: number
  revenue: number
}

export function EventSummary({ eventId, menuId }: EventSummaryProps) {
  const supabase = useMemo(() => createClient(), [])
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      // Fetch orders with items
      const { data: ordersData, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items(
            *,
            item:items(*)
          )
        `)
        .eq("event_id", eventId)

      console.log("EventSummary fetch:", { ordersData, error, eventId })

      if (ordersData) {
        setOrders(ordersData as OrderWithItems[])
      }

      // Fetch menu items for reference
      if (menuId) {
        const { data: itemsData } = await supabase
          .from("items")
          .select("*")
          .eq("menu_id", menuId)

        if (itemsData) {
          setItems(itemsData)
        }
      }

      setLoading(false)
    }

    fetchData()
  }, [eventId, menuId, supabase])

  const stats = useMemo(() => {
    if (orders.length === 0) {
      return null
    }

    const completedOrders = orders.filter((o) => o.completed_at)
    const totalOrders = orders.length

    // Calculate total items and revenue
    let totalItems = 0
    let totalRevenue = 0
    const itemSalesMap: Record<string, ItemSales> = {}

    for (const order of orders) {
      for (const orderItem of order.order_items) {
        const item = orderItem.item
        totalItems++
        totalRevenue += Number(item.price)

        if (!itemSalesMap[item.id]) {
          itemSalesMap[item.id] = {
            item,
            quantity: 0,
            revenue: 0,
          }
        }
        itemSalesMap[item.id].quantity++
        itemSalesMap[item.id].revenue += Number(item.price)
      }
    }

    // Sort items by quantity sold
    const itemSales = Object.values(itemSalesMap).sort(
      (a, b) => b.quantity - a.quantity
    )

    // Calculate timing stats
    const completionTimes: number[] = []
    const orderTimes: number[] = []

    for (const order of completedOrders) {
      const createdAt = new Date(order.created_at).getTime()
      const completedAt = order.completed_at
        ? new Date(order.completed_at).getTime()
        : null

      if (completedAt) {
        completionTimes.push(completedAt - createdAt)
      }
      orderTimes.push(createdAt)
    }

    // Calculate average completion time
    const avgCompletionTime =
      completionTimes.length > 0
        ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
        : 0

    // Calculate throughput (orders per hour, items per hour)
    let ordersPerHour = 0
    let itemsPerHour = 0

    if (orderTimes.length >= 2) {
      const firstOrder = Math.min(...orderTimes)
      const lastOrder = Math.max(...orderTimes)
      const durationHours = (lastOrder - firstOrder) / (1000 * 60 * 60)

      if (durationHours > 0) {
        ordersPerHour = totalOrders / durationHours
        itemsPerHour = totalItems / durationHours
      }
    }

    return {
      totalOrders,
      completedOrders: completedOrders.length,
      totalItems,
      totalRevenue,
      avgCompletionTime, // In milliseconds, formatDuration handles conversion
      ordersPerHour,
      itemsPerHour,
      itemSales,
    }
  }, [orders])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No orders to summarize.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-muted-foreground">Total Orders</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.totalOrders}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-purple-600" />
              <span className="text-sm text-muted-foreground">Items Sold</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.totalItems}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Revenue</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              ${stats.totalRevenue.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-muted-foreground">Completed</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {stats.completedOrders}/{stats.totalOrders}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Efficiency Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Efficiency
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Avg Completion Time
              </div>
              <p className="text-xl font-semibold mt-1">
                {formatDuration(stats.avgCompletionTime)}
              </p>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Orders/Hour</div>
              <p className="text-xl font-semibold mt-1">
                {stats.ordersPerHour.toFixed(1)}
              </p>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Items/Hour</div>
              <p className="text-xl font-semibold mt-1">
                {stats.itemsPerHour.toFixed(1)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Item Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sales by Item</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.itemSales.map(({ item, quantity, revenue }) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded text-[10px] font-medium text-white/90 uppercase tracking-wide"
                    style={{ backgroundColor: item.color || "#6366f1" }}
                  >
                    {item.code}
                  </span>
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ${Number(item.price).toFixed(2)} each
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{quantity} sold</p>
                  <p className="text-sm text-muted-foreground">
                    ${revenue.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
