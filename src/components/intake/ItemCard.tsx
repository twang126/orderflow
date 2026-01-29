"use client"

import { Item } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Minus, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface ItemCardProps {
  item: Item
  quantity: number
  onIncrement: () => void
  onDecrement: () => void
}

export function ItemCard({ item, quantity, onIncrement, onDecrement }: ItemCardProps) {
  const hasQuantity = quantity > 0

  return (
    <Card className={cn(
      "transition-all",
      hasQuantity && "ring-2 ring-primary bg-primary/5"
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm text-white"
                style={{ backgroundColor: item.color || "#6366f1" }}
              >
                {item.code}
              </span>
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-muted-foreground">
                  ${item.price.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={onDecrement}
              disabled={quantity === 0}
              className="h-10 w-10"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-8 text-center font-bold text-lg">{quantity}</span>
            <Button
              variant="outline"
              size="icon"
              onClick={onIncrement}
              className="h-10 w-10"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
