"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useEvent } from "@/contexts/EventContext"
import { createClient } from "@/lib/supabase/client"
import { formatDuration } from "@/lib/utils"
import type { Order, Item, Event } from "@/types"
import {
  BarChart3,
  Clock,
  TrendingUp,
  DollarSign,
  Package,
  Check,
  Filter,
} from "lucide-react"

interface OrderWithItems extends Omit<Order, "order_items"> {
  order_items: { item: Item }[]
}

interface EventStats {
  event: Event
  orders: OrderWithItems[]
  totalOrders: number
  totalItems: number
  totalRevenue: number
  completedOrders: number
  avgCompletionTime: number | null
  itemBreakdown: Record<string, { item: Item; count: number; revenue: number }>
}

function calculateEventStats(event: Event, orders: OrderWithItems[]): EventStats {
  const eventOrders = orders.filter((o) => o.event_id === event.id)

  let totalItems = 0
  let totalRevenue = 0
  const itemBreakdown: Record<string, { item: Item; count: number; revenue: number }> = {}

  for (const order of eventOrders) {
    for (const orderItem of order.order_items || []) {
      if (orderItem.item) {
        const item = orderItem.item
        totalItems++
        totalRevenue += Number(item.price)

        if (!itemBreakdown[item.id]) {
          itemBreakdown[item.id] = { item, count: 0, revenue: 0 }
        }
        itemBreakdown[item.id].count++
        itemBreakdown[item.id].revenue += Number(item.price)
      }
    }
  }

  // Calculate completion stats
  const completedOrders = eventOrders.filter((o) => o.completed_at)
  let avgCompletionTime: number | null = null

  if (completedOrders.length > 0) {
    const completionTimes = completedOrders.map((o) => {
      const created = new Date(o.created_at).getTime()
      const completed = new Date(o.completed_at!).getTime()
      return completed - created
    })
    avgCompletionTime = completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
  }

  return {
    event,
    orders: eventOrders,
    totalOrders: eventOrders.length,
    totalItems,
    totalRevenue,
    completedOrders: completedOrders.length,
    avgCompletionTime,
    itemBreakdown,
  }
}

// Helper to get item stats by code
function getItemStatsByCode(
  stats: EventStats,
  code: string
): { count: number; revenue: number } {
  let count = 0
  let revenue = 0
  for (const data of Object.values(stats.itemBreakdown)) {
    if (data.item.code === code) {
      count += data.count
      revenue += data.revenue
    }
  }
  return { count, revenue }
}

// Grouped Bar Chart Component for multi-item comparison
function GroupedBarChart({
  eventStats,
  selectedItemCodes,
  uniqueItems,
  metric,
}: {
  eventStats: EventStats[]
  selectedItemCodes: Set<string>
  uniqueItems: Item[]
  metric: "count" | "revenue"
}) {
  if (eventStats.length === 0) return null

  const selectedItems = uniqueItems.filter((i) => selectedItemCodes.has(i.code))

  // Calculate data for each event
  const chartData = eventStats.map((stats) => {
    if (selectedItemCodes.size === 0) {
      // Show total
      return {
        event: stats.event,
        bars: [
          {
            code: "total",
            label: "Total",
            value: metric === "count" ? stats.totalOrders : stats.totalRevenue,
            color: "#6366f1",
          },
        ],
      }
    }
    // Show selected items
    return {
      event: stats.event,
      bars: selectedItems.map((item) => {
        const itemStats = getItemStatsByCode(stats, item.code)
        return {
          code: item.code,
          label: item.name,
          value: metric === "count" ? itemStats.count : itemStats.revenue,
          color: item.color || "#6366f1",
        }
      }),
    }
  })

  const maxValue = Math.max(
    ...chartData.flatMap((d) => d.bars.map((b) => b.value)),
    1
  )

  const formatValue =
    metric === "revenue" ? (v: number) => `$${v.toFixed(0)}` : (v: number) => v.toString()

  return (
    <div className="w-full">
      {/* Y-axis label */}
      <div className="flex items-end gap-2 h-52 relative">
        <div className="absolute -left-2 top-0 bottom-8 flex flex-col justify-between text-xs text-muted-foreground -translate-x-full w-12 text-right">
          <span>{formatValue(maxValue)}</span>
          <span>{formatValue(maxValue / 2)}</span>
          <span>0</span>
        </div>

        {/* Chart area */}
        <div className="flex-1 flex items-end gap-3 h-48 border-b border-l pl-1">
          {chartData.map((eventData, eventIndex) => (
            <div
              key={eventData.event.id}
              className="flex-1 flex flex-col items-center justify-end h-full min-w-0"
            >
              {/* Bars group */}
              <div className="flex items-end gap-0.5 h-full w-full justify-center">
                {eventData.bars.map((bar, barIndex) => {
                  const heightPercent = maxValue > 0 ? (bar.value / maxValue) * 100 : 0
                  return (
                    <div
                      key={bar.code}
                      className="relative flex flex-col items-center justify-end h-full"
                      style={{
                        width: `${Math.max(100 / Math.max(eventData.bars.length, 1) - 2, 12)}%`,
                        minWidth: "8px",
                        maxWidth: "24px",
                      }}
                    >
                      {bar.value > 0 && eventData.bars.length <= 3 && (
                        <span className="absolute -top-5 text-[10px] font-medium whitespace-nowrap">
                          {formatValue(bar.value)}
                        </span>
                      )}
                      <div
                        className="w-full rounded-t transition-all"
                        style={{
                          height: `${Math.max(heightPercent, bar.value > 0 ? 2 : 0)}%`,
                          backgroundColor: bar.color,
                        }}
                        title={`${bar.label}: ${formatValue(bar.value)}`}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex gap-3 mt-2 pl-1 ml-12">
        {chartData.map((eventData) => (
          <div key={eventData.event.id} className="flex-1 text-center min-w-0">
            <p className="text-xs font-medium truncate" title={eventData.event.name}>
              {eventData.event.name}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {new Date(eventData.event.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        ))}
      </div>

      {/* Legend for multi-item */}
      {selectedItemCodes.size > 0 && (
        <div className="flex flex-wrap gap-3 mt-4 justify-center">
          {selectedItems.map((item) => (
            <div key={item.code} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: item.color || "#6366f1" }}
              />
              <span className="text-xs">{item.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Single metric bar chart (for efficiency tab)
function VerticalBarChart({
  data,
  maxValue,
  color = "bg-primary",
  formatValue = (v: number) => v.toString(),
  formatLabel = (v: number) => v.toString(),
}: {
  data: { label: string; sublabel: string; value: number }[]
  maxValue: number
  color?: string
  formatValue?: (v: number) => string
  formatLabel?: (v: number) => string
}) {
  if (data.length === 0) return null

  // Shorter format for y-axis labels
  const shortFormat = (v: number) => {
    const formatted = formatLabel(v)
    // If it looks like a duration, try to shorten it
    if (formatted.includes("m") || formatted.includes("s")) {
      return formatted
    }
    return formatted
  }

  return (
    <div className="w-full">
      <div className="flex items-end h-48 relative">
        {/* Y-axis */}
        <div className="flex flex-col justify-between h-full text-[10px] text-muted-foreground pr-2 w-12 shrink-0">
          <span className="text-right">{shortFormat(maxValue)}</span>
          <span className="text-right">{shortFormat(maxValue / 2)}</span>
          <span className="text-right">0</span>
        </div>

        {/* Chart area */}
        <div className="flex-1 flex items-end gap-1 h-full border-b border-l">
          {data.map((item, index) => {
            const heightPercent = maxValue > 0 ? (item.value / maxValue) * 100 : 0
            return (
              <div
                key={index}
                className="flex-1 flex flex-col items-center justify-end h-full min-w-0"
              >
                <div className="relative w-full h-full flex items-end justify-center">
                  {item.value > 0 && data.length <= 8 && (
                    <span className="absolute top-0 text-[10px] font-medium text-center whitespace-nowrap">
                      {formatValue(item.value)}
                    </span>
                  )}
                  <div
                    className={`w-full max-w-10 ${color} rounded-t transition-all`}
                    style={{ height: `${Math.max(heightPercent, item.value > 0 ? 2 : 0)}%` }}
                    title={`${item.label}: ${formatValue(item.value)}`}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex gap-1 mt-2 ml-12">
        {data.map((item, index) => (
          <div key={index} className="flex-1 text-center min-w-0">
            <p className="text-[10px] font-medium truncate" title={item.label}>
              {item.label}
            </p>
            <p className="text-[9px] text-muted-foreground">{item.sublabel}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function GeneralTab({
  eventStats,
  allItems,
}: {
  eventStats: EventStats[]
  allItems: Item[]
}) {
  const [selectedItemCodes, setSelectedItemCodes] = useState<Set<string>>(new Set())
  const [showItemFilter, setShowItemFilter] = useState(false)

  // Get unique items across all events (grouped by code)
  const uniqueItems = useMemo(() => {
    const itemMap: Record<string, Item> = {}
    for (const stats of eventStats) {
      for (const { item } of Object.values(stats.itemBreakdown)) {
        if (!itemMap[item.code]) {
          itemMap[item.code] = item
        }
      }
    }
    return Object.values(itemMap).sort((a, b) => a.name.localeCompare(b.name))
  }, [eventStats])

  // Calculate totals
  const totals = useMemo(() => {
    if (selectedItemCodes.size > 0) {
      let count = 0
      let revenue = 0
      const codes = Array.from(selectedItemCodes)
      for (const stats of eventStats) {
        for (const code of codes) {
          const itemStats = getItemStatsByCode(stats, code)
          count += itemStats.count
          revenue += itemStats.revenue
        }
      }
      return { orders: count, revenue, items: count }
    }
    return {
      orders: eventStats.reduce((sum, s) => sum + s.totalOrders, 0),
      revenue: eventStats.reduce((sum, s) => sum + s.totalRevenue, 0),
      items: eventStats.reduce((sum, s) => sum + s.totalItems, 0),
    }
  }, [eventStats, selectedItemCodes])

  const toggleItem = (code: string) => {
    const newSelected = new Set(selectedItemCodes)
    if (newSelected.has(code)) {
      newSelected.delete(code)
    } else {
      newSelected.add(code)
    }
    setSelectedItemCodes(newSelected)
  }

  const clearItemSelection = () => {
    setSelectedItemCodes(new Set())
  }

  if (eventStats.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No events selected.
        </CardContent>
      </Card>
    )
  }

  const selectedItems = uniqueItems.filter((i) => selectedItemCodes.has(i.code))

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              {selectedItemCodes.size > 0 ? "Selected Items Sold" : "Total Orders"}
            </div>
            <p className="text-2xl font-bold mt-1">{totals.orders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              {selectedItemCodes.size > 0 ? "Selected Items Revenue" : "Total Revenue"}
            </div>
            <p className="text-2xl font-bold mt-1">${totals.revenue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              Events Analyzed
            </div>
            <p className="text-2xl font-bold mt-1">{eventStats.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Item Filter */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={showItemFilter ? "default" : "outline"}
            size="sm"
            onClick={() => setShowItemFilter(!showItemFilter)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filter by Items
          </Button>
          {selectedItems.map((item) => (
            <Badge
              key={item.code}
              variant="secondary"
              className="cursor-pointer gap-1"
              onClick={() => toggleItem(item.code)}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: item.color || "#6366f1" }}
              />
              {item.name} &times;
            </Badge>
          ))}
          {selectedItemCodes.size > 0 && (
            <Button variant="ghost" size="sm" onClick={clearItemSelection}>
              Clear all
            </Button>
          )}
        </div>

        {showItemFilter && (
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground mb-3">
                Select items to compare (leave empty for totals):
              </p>
              <div className="flex flex-wrap gap-2">
                {uniqueItems.map((item) => (
                  <Button
                    key={item.code}
                    variant={selectedItemCodes.has(item.code) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleItem(item.code)}
                    className="gap-2"
                  >
                    <span
                      className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-medium text-white"
                      style={{ backgroundColor: item.color || "#6366f1" }}
                    >
                      {item.code}
                    </span>
                    {item.name}
                    {selectedItemCodes.has(item.code) && <Check className="h-3 w-3 ml-1" />}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sales Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {selectedItemCodes.size > 0 ? "Item Sales" : "Orders"} Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <GroupedBarChart
            eventStats={eventStats}
            selectedItemCodes={selectedItemCodes}
            uniqueItems={uniqueItems}
            metric="count"
          />
        </CardContent>
      </Card>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {selectedItemCodes.size > 0 ? "Item Revenue" : "Revenue"} Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <GroupedBarChart
            eventStats={eventStats}
            selectedItemCodes={selectedItemCodes}
            uniqueItems={uniqueItems}
            metric="revenue"
          />
        </CardContent>
      </Card>
    </div>
  )
}

function EfficiencyTab({ eventStats }: { eventStats: EventStats[] }) {
  const eventsWithCompletions = eventStats.filter((s) => s.completedOrders > 0)

  if (eventStats.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No events selected.
        </CardContent>
      </Card>
    )
  }

  if (eventsWithCompletions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No completed orders across selected events to analyze wait times.
        </CardContent>
      </Card>
    )
  }

  const avgCompletionTimes = eventsWithCompletions
    .filter((s) => s.avgCompletionTime !== null)
    .map((s) => s.avgCompletionTime!)

  const overallAvgWaitTime =
    avgCompletionTimes.length > 0
      ? avgCompletionTimes.reduce((a, b) => a + b, 0) / avgCompletionTimes.length
      : null

  const minAvgWaitTime = avgCompletionTimes.length > 0 ? Math.min(...avgCompletionTimes) : null
  const maxAvgWaitTime = avgCompletionTimes.length > 0 ? Math.max(...avgCompletionTimes) : null

  const waitTimeData = eventsWithCompletions.map((stats) => ({
    label: stats.event.name,
    sublabel: new Date(stats.event.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    value: stats.avgCompletionTime || 0,
  }))

  const maxChartValue = Math.max(...waitTimeData.map((d) => d.value), 1)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Avg Wait Time
            </div>
            <p className="text-2xl font-bold mt-1">
              {overallAvgWaitTime ? formatDuration(overallAvgWaitTime) : "-"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground text-green-600">
              <Clock className="h-4 w-4" />
              Best (Fastest)
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">
              {minAvgWaitTime ? formatDuration(minAvgWaitTime) : "-"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground text-amber-600">
              <Clock className="h-4 w-4" />
              Worst (Slowest)
            </div>
            <p className="text-2xl font-bold mt-1 text-amber-600">
              {maxAvgWaitTime ? formatDuration(maxAvgWaitTime) : "-"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Wait Time Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Average Wait Time Per Event
          </CardTitle>
        </CardHeader>
        <CardContent>
          <VerticalBarChart
            data={waitTimeData}
            maxValue={maxChartValue}
            color="bg-amber-500"
            formatValue={(v) => formatDuration(v)}
            formatLabel={(v) => formatDuration(v)}
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default function AnalyticsPage() {
  const { events, items } = useEvent()
  const supabase = useMemo(() => createClient(), [])

  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set())
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(false)

  // Filter to only completed events and sort by date
  const completedEvents = useMemo(() => {
    return [...events]
      .filter((e) => e.status === "complete")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [events])

  // Initialize with all completed events selected
  useEffect(() => {
    if (completedEvents.length > 0 && selectedEventIds.size === 0) {
      setSelectedEventIds(new Set(completedEvents.map((e) => e.id)))
    }
  }, [completedEvents, selectedEventIds.size])

  // Fetch orders for selected events
  useEffect(() => {
    const fetchOrders = async () => {
      if (selectedEventIds.size === 0) {
        setOrders([])
        return
      }

      setLoading(true)

      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          order_items(
            *,
            item:items(*)
          )
        `
        )
        .in("event_id", Array.from(selectedEventIds))
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Error fetching orders:", error)
      } else {
        setOrders(data as OrderWithItems[])
      }

      setLoading(false)
    }

    fetchOrders()
  }, [selectedEventIds, supabase])

  // Calculate stats per event
  const eventStats = useMemo(() => {
    return completedEvents
      .filter((e) => selectedEventIds.has(e.id))
      .map((event) => calculateEventStats(event, orders))
  }, [completedEvents, selectedEventIds, orders])

  const toggleEvent = (eventId: string) => {
    const newSelected = new Set(selectedEventIds)
    if (newSelected.has(eventId)) {
      newSelected.delete(eventId)
    } else {
      newSelected.add(eventId)
    }
    setSelectedEventIds(newSelected)
  }

  const selectAllEvents = () => {
    setSelectedEventIds(new Set(completedEvents.map((e) => e.id)))
  }

  const clearAllEvents = () => {
    setSelectedEventIds(new Set())
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Track performance trends across completed events</p>
      </div>

      {/* Event Selector */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Select Events</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={selectAllEvents}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={clearAllEvents}>
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {completedEvents.length === 0 ? (
            <p className="text-muted-foreground">
              No completed events yet. Complete an event to see analytics.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {completedEvents.map((event) => {
                  const isSelected = selectedEventIds.has(event.id)
                  return (
                    <Button
                      key={event.id}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleEvent(event.id)}
                      className="gap-2"
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                      <span>{event.name}</span>
                      <span className="text-xs opacity-70">
                        {new Date(event.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </Button>
                  )
                })}
              </div>
              {selectedEventIds.size > 0 && (
                <p className="text-sm text-muted-foreground mt-3">
                  {selectedEventIds.size} event{selectedEventIds.size !== 1 ? "s" : ""} selected
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : selectedEventIds.size === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No Events Selected</p>
            <p className="text-muted-foreground text-center max-w-sm mt-1">
              Select completed events above to view cross-event analytics.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-6">
            <GeneralTab eventStats={eventStats} allItems={items} />
          </TabsContent>

          <TabsContent value="efficiency" className="mt-6">
            <EfficiencyTab eventStats={eventStats} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
