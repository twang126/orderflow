"use client"

import { Item } from "@/types"
import { ItemCard } from "./ItemCard"

interface CartEntry {
  item: Item
  quantity: number
}

interface MenuSelectorProps {
  items: Item[]
  cart: Map<string, CartEntry>
  onUpdateCart: (itemId: string, quantity: number) => void
}

export function MenuSelector({ items, cart, onUpdateCart }: MenuSelectorProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Select Items</h2>
      <div className="grid gap-3">
        {items.map((item) => {
          const cartItem = cart.get(item.id)
          const quantity = cartItem?.quantity || 0

          return (
            <ItemCard
              key={item.id}
              item={item}
              quantity={quantity}
              onIncrement={() => onUpdateCart(item.id, quantity + 1)}
              onDecrement={() => onUpdateCart(item.id, Math.max(0, quantity - 1))}
            />
          )
        })}
      </div>
    </div>
  )
}
