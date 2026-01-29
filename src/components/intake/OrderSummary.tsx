"use client"

import { Item } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

interface CartEntry {
  item: Item
  quantity: number
  modifications: string[]
}

interface OrderSummaryProps {
  cart: Map<string, CartEntry>
  onUpdateModifications: (itemId: string, index: number, modifications: string) => void
  onRemoveItem: (itemId: string, index: number) => void
}

export function OrderSummary({ cart, onUpdateModifications, onRemoveItem }: OrderSummaryProps) {
  const items = Array.from(cart.values()).filter((item) => item.quantity > 0)

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            No items in order yet
          </p>
        </CardContent>
      </Card>
    )
  }

  const total = items.reduce((sum, item) => sum + item.item.price * item.quantity, 0)

  // Expand items for individual modification
  const expandedItems: { cartItem: CartEntry; index: number; key: string }[] = []
  items.forEach((cartItem) => {
    for (let i = 0; i < cartItem.quantity; i++) {
      expandedItems.push({
        cartItem,
        index: i,
        key: `${cartItem.item.id}-${i}`,
      })
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {expandedItems.map(({ cartItem, index, key }) => (
          <div key={key} className="flex items-start gap-3 pb-3 border-b last:border-0">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: cartItem.item.color || "#6366f1" }}
                >
                  {cartItem.item.code}
                </span>
                <span className="font-medium">{cartItem.item.name}</span>
                <span className="text-muted-foreground">
                  ${cartItem.item.price.toFixed(2)}
                </span>
              </div>
              <Input
                placeholder="Modifications (e.g., low ice, extra sweet)"
                className="mt-2 text-sm"
                onChange={(e) => onUpdateModifications(cartItem.item.id, index, e.target.value)}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemoveItem(cartItem.item.id, index)}
              className="shrink-0"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}

        <div className="pt-4 border-t">
          <div className="flex justify-between items-center text-lg font-bold">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {expandedItems.length} item{expandedItems.length !== 1 ? "s" : ""}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
