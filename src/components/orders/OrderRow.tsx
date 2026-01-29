"use client"

import { Item } from "@/types"
import { Button } from "@/components/ui/button"
import { Check, Undo2, Trash2, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatTime } from "@/lib/utils"

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

interface OrderRowProps {
  order: OrderWithDetails
  itemCodes: string[]
  items: Item[]
  onMarkComplete: (orderId: string) => void
  onUndoComplete: (orderId: string) => void
  onEdit?: (orderId: string) => void
  onDelete?: (orderId: string) => void
  isComplete?: boolean
}

export function OrderRow({
  order,
  itemCodes,
  items,
  onMarkComplete,
  onUndoComplete,
  onEdit,
  onDelete,
  isComplete = false,
}: OrderRowProps) {
  const status = getStatus(order)

  // Get item details by code (including color)
  const itemByCode: Record<string, Item> = {}
  for (const item of items) {
    itemByCode[item.code] = item
  }

  // Group order items by code, keeping individual items with their modifications
  // Sort so items WITH modifications appear first
  const itemsByCode: Record<string, { item: Item; modification: string | null }[]> = {}
  for (const orderItem of order.order_items) {
    const code = orderItem.item.code
    if (!itemsByCode[code]) {
      itemsByCode[code] = []
    }
    itemsByCode[code].push({
      item: orderItem.item,
      modification: orderItem.modifications,
    })
  }
  // Sort each group: items with modifications first
  for (const code in itemsByCode) {
    itemsByCode[code].sort((a, b) => {
      if (a.modification && !b.modification) return -1
      if (!a.modification && b.modification) return 1
      return 0
    })
  }

  const statusColors = {
    pending: "bg-yellow-50 hover:bg-yellow-100",
    completed: "bg-gray-50 hover:bg-gray-100 opacity-60",
  }

  return (
    <div
      className={cn(
        "grid border-b-2 border-gray-300 transition-colors",
        statusColors[status]
      )}
      style={{
        gridTemplateColumns: `minmax(50px, 80px) 120px repeat(${itemCodes.length}, 1fr) 200px`
      }}
    >
      {/* Order Number */}
      <div className="px-3 py-3 border-r-2 border-gray-300 flex items-center">
        <span className="font-bold text-lg">#{order.order_number}</span>
      </div>

      {/* Customer */}
      <div className="px-3 py-3 border-r-2 border-gray-300">
        <div className="font-medium truncate">{order.customer.name}</div>
        <div className="text-xs text-muted-foreground">
          {formatTime(order.created_at)}
        </div>
      </div>

      {/* Item Columns - Show each item with its modification */}
      {itemCodes.map((code) => {
        const itemsForCode = itemsByCode[code]
        const item = itemByCode[code]
        const color = item?.color || "#6366f1"

        return (
          <div
            key={code}
            className="px-2 py-2 border-r-2 border-gray-300 flex flex-col items-center justify-center gap-1"
          >
            {itemsForCode && itemsForCode.length > 0 ? (
              <>
                <div className="flex flex-wrap items-start justify-center gap-2">
                  {itemsForCode.slice(0, 5).map((orderItem, i) => (
                    <div
                      key={i}
                      className="flex flex-col items-center group relative"
                      title={orderItem.modification || undefined}
                    >
                      <span
                        className={cn(
                          "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold text-white flex-shrink-0",
                          orderItem.modification && "ring-2 ring-offset-1 ring-orange-400"
                        )}
                        style={{ backgroundColor: color }}
                      >
                        {code}
                      </span>
                      {orderItem.modification && (
                        <span className="text-[11px] text-orange-600 font-medium text-center mt-1 leading-tight max-w-[80px] break-words">
                          {orderItem.modification}
                        </span>
                      )}
                    </div>
                  ))}
                  {itemsForCode.length > 5 && (
                    <span className="font-bold text-sm text-muted-foreground self-center">+{itemsForCode.length - 5}</span>
                  )}
                </div>
              </>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        )
      })}

      {/* Actions */}
      <div className="px-2 py-2 flex items-center gap-1">
        {status === "pending" && (
          <>
            <Button
              size="sm"
              variant="default"
              onClick={() => onMarkComplete(order.id)}
              disabled={isComplete}
              className="h-7 px-2 text-xs gap-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="h-3 w-3" />
              Complete
            </Button>
            {onEdit && !isComplete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit(order.id)}
                title="Edit Order"
                className="h-7 w-7 p-0"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
            {onDelete && !isComplete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(order.id)}
                title="Delete Order"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </>
        )}
        {status === "completed" && (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUndoComplete(order.id)}
              disabled={isComplete}
              title="Undo Complete"
              className="h-7 w-7 p-0"
            >
              <Undo2 className="h-3 w-3" />
            </Button>
            {onDelete && !isComplete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(order.id)}
                title="Delete Order"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
