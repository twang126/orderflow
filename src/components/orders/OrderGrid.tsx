"use client"

import { useRef, useState } from "react"
import { Item } from "@/types"
import { OrderRow } from "./OrderRow"
import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"

type OrderStatus = "pending" | "completed"

function getStatus(order: { completed_at: string | null }): OrderStatus {
  if (order.completed_at) return "completed"
  return "pending"
}

interface OrderWithDetails {
  id: string
  event_id: string
  customer_id: string
  order_number: number
  created_at: string
  completed_at: string | null
  customer: { id: string; name: string; phone: string | null }
  order_items: { id: string; item_id: string; modifications: string | null; item: Item }[]
}

interface OrderGridProps {
  orders: OrderWithDetails[]
  items: Item[]
  onMarkComplete: (orderId: string) => void
  onUndoComplete: (orderId: string) => void
  onEdit?: (orderId: string) => void
  onDelete?: (orderId: string) => void
  isComplete?: boolean
}

const VISIBLE_ORDER_OPTIONS = [5, 10, 15, 20]

export function OrderGrid({
  orders,
  items,
  onMarkComplete,
  onUndoComplete,
  onEdit,
  onDelete,
  isComplete = false,
}: OrderGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [visibleCount, setVisibleCount] = useState(10)

  // Get unique item codes for columns
  const itemCodes = Array.from(new Set(items.map((item) => item.code))).sort()

  // Group orders by status for better visualization
  const pendingOrders = orders.filter((o) => getStatus(o) === "pending")
  const completedOrders = orders.filter((o) => getStatus(o) === "completed")

  // Sort pending orders by when they were created (oldest first)
  const sortedPendingOrders = [...pendingOrders].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  // Completed orders sorted by when they were completed (most recent first for easy undo)
  const sortedCompletedOrders = [...completedOrders].sort(
    (a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime()
  )

  // Visible pending orders are limited by visibleCount
  const visiblePendingOrders = sortedPendingOrders.slice(0, visibleCount)
  const hiddenPendingCount = sortedPendingOrders.length - visiblePendingOrders.length

  if (orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-base sm:text-lg bg-gray-50 rounded-lg border">
        No orders yet. Create a new order to get started.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Status Summary + Controls */}
      <div className="flex flex-wrap items-center gap-2 p-2 sm:p-3 bg-gray-50 rounded-lg border">
        <span className="text-sm font-semibold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full">
          {sortedPendingOrders.length} pending
        </span>
        {hiddenPendingCount > 0 && (
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
            +{hiddenPendingCount} queued
          </span>
        )}
        <span className="text-sm text-gray-500">
          {sortedCompletedOrders.length} done
        </span>

        {/* Show controls */}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs text-muted-foreground hidden sm:inline">Show:</span>
          {VISIBLE_ORDER_OPTIONS.map((count) => (
            <Button
              key={count}
              variant={visibleCount === count ? "default" : "outline"}
              size="sm"
              onClick={() => setVisibleCount(count)}
              className="h-8 px-2.5 text-xs"
            >
              {count}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="border rounded-lg bg-white overflow-hidden">
        {/* Header with item codes */}
        <div
          className="grid bg-gray-100 border-b sticky top-0 z-10"
          style={{
            gridTemplateColumns: `minmax(50px, 80px) 120px repeat(${itemCodes.length}, 1fr) 200px`
          }}
        >
          <div className="px-2 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-600 border-r border-gray-200 text-center">#</div>
          <div className="px-2 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-600 border-r border-gray-200">Name</div>
          {itemCodes.map((code) => {
            const item = items.find(i => i.code === code)
            const color = item?.color || "#6366f1"
            return (
              <div
                key={code}
                className="py-2 sm:py-3 border-r border-gray-200 flex items-center justify-center"
              >
                <span
                  className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs sm:text-sm font-bold text-white"
                  style={{ backgroundColor: color }}
                >
                  {code}
                </span>
              </div>
            )
          })}
          <div className="px-2 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-600 text-center">Action</div>
        </div>

        {/* Orders */}
        <div ref={scrollRef}>
          {/* Pending section header */}
          {visiblePendingOrders.length > 0 && (
            <div className="px-2 sm:px-3 py-1.5 bg-amber-50 border-b text-xs font-semibold text-amber-700">
              Pending ({sortedPendingOrders.length})
            </div>
          )}

          {/* Pending Orders */}
          {visiblePendingOrders.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              itemCodes={itemCodes}
              items={items}
              onMarkComplete={onMarkComplete}
              onUndoComplete={onUndoComplete}
              onEdit={onEdit}
              onDelete={onDelete}
              isComplete={isComplete}
            />
          ))}

          {/* Empty state */}
          {sortedPendingOrders.length === 0 && (
            <div className="px-3 py-8 text-center text-muted-foreground">
              {completedOrders.length > 0
                ? "All orders completed!"
                : "No orders yet."}
            </div>
          )}

          {/* Show more button */}
          {hiddenPendingCount > 0 && (
            <button
              onClick={() => setVisibleCount(Math.min(visibleCount + 5, sortedPendingOrders.length))}
              className="w-full px-3 py-2.5 bg-blue-50 border-t text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
            >
              <ChevronDown className="h-4 w-4" />
              Show {Math.min(5, hiddenPendingCount)} more
            </button>
          )}

          {/* Completed orders */}
          {sortedCompletedOrders.length > 0 && (
            <details className="border-t">
              <summary className="px-2 sm:px-3 py-2.5 bg-gray-50 cursor-pointer text-sm font-medium text-gray-600 hover:bg-gray-100">
                Completed ({sortedCompletedOrders.length})
              </summary>
              <div>
                {sortedCompletedOrders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    itemCodes={itemCodes}
                    items={items}
                    onMarkComplete={onMarkComplete}
                    onUndoComplete={onUndoComplete}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    isComplete={isComplete}
                  />
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  )
}
