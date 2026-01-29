"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { MenuSelector } from "@/components/intake/MenuSelector"
import { OrderSummary } from "@/components/intake/OrderSummary"
import { CustomerForm } from "@/components/intake/CustomerForm"
import { createClient } from "@/lib/supabase/client"
import { Item, Event, Order, OrderItem, Customer } from "@/types"
import { ArrowLeft, Save, Calendar } from "lucide-react"
import Link from "next/link"

interface CartItemWithMods {
  item: Item
  quantity: number
  modifications: string[]
}

interface OrderWithDetails extends Order {
  customer: Customer
  order_items: (OrderItem & { item: Item })[]
}

export default function EditOrderPage() {
  const router = useRouter()
  const params = useParams()
  const eventId = params.eventId as string
  const orderId = params.orderId as string
  const supabase = useMemo(() => createClient(), [])

  const [event, setEvent] = useState<Event | null>(null)
  const [order, setOrder] = useState<OrderWithDetails | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState<Map<string, CartItemWithMods>>(new Map())
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState<"select" | "finalize">("select")

  // Fetch event, order, and items
  useEffect(() => {
    const fetchData = async () => {
      // Fetch event
      const { data: eventData } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single()

      if (eventData) {
        setEvent(eventData)

        if (eventData.menu_id) {
          const { data: itemsData } = await supabase
            .from("items")
            .select("*")
            .eq("menu_id", eventData.menu_id)
            .order("code")

          if (itemsData) {
            setItems(itemsData)
          }
        }
      }

      // Fetch order with details
      const { data: orderData } = await supabase
        .from("orders")
        .select(`
          *,
          customer:customers(*),
          order_items(
            *,
            item:items(*)
          )
        `)
        .eq("id", orderId)
        .single()

      if (orderData) {
        setOrder(orderData as OrderWithDetails)
        setCustomerName(orderData.customer.name)
        setCustomerPhone(orderData.customer.phone || "")

        // Build cart from existing order items
        const cartMap = new Map<string, CartItemWithMods>()
        for (const orderItem of orderData.order_items) {
          const itemId = orderItem.item.id
          const existing = cartMap.get(itemId)
          if (existing) {
            existing.quantity++
            existing.modifications.push(orderItem.modifications || "")
          } else {
            cartMap.set(itemId, {
              item: orderItem.item,
              quantity: 1,
              modifications: [orderItem.modifications || ""],
            })
          }
        }
        setCart(cartMap)
      }

      setLoading(false)
    }

    fetchData()
  }, [eventId, orderId, supabase])

  const updateCart = useCallback((itemId: string, quantity: number) => {
    setCart((prev) => {
      const newCart = new Map(prev)
      const item = items.find((i) => i.id === itemId)
      if (!item) return prev

      if (quantity <= 0) {
        newCart.delete(itemId)
      } else {
        const existing = newCart.get(itemId)
        const currentMods = existing?.modifications || []
        const newMods = [...currentMods]
        while (newMods.length < quantity) newMods.push("")
        while (newMods.length > quantity) newMods.pop()

        newCart.set(itemId, {
          item,
          quantity,
          modifications: newMods,
        } as CartItemWithMods)
      }
      return newCart
    })
  }, [items])

  const updateModifications = useCallback((itemId: string, index: number, modifications: string) => {
    setCart((prev) => {
      const newCart = new Map(prev)
      const cartItem = newCart.get(itemId) as CartItemWithMods
      if (cartItem) {
        const newMods = [...cartItem.modifications]
        newMods[index] = modifications
        newCart.set(itemId, { ...cartItem, modifications: newMods })
      }
      return newCart
    })
  }, [])

  const removeItem = useCallback((itemId: string, index: number) => {
    setCart((prev) => {
      const newCart = new Map(prev)
      const cartItem = newCart.get(itemId) as CartItemWithMods
      if (cartItem) {
        const newMods = cartItem.modifications.filter((_, i) => i !== index)
        if (newMods.length === 0) {
          newCart.delete(itemId)
        } else {
          newCart.set(itemId, { ...cartItem, quantity: newMods.length, modifications: newMods })
        }
      }
      return newCart
    })
  }, [])

  const handleSubmit = async () => {
    if (!event || !order || !customerName.trim() || cart.size === 0) return

    setSubmitting(true)

    try {
      // Update customer
      await supabase
        .from("customers")
        .update({
          name: customerName.trim(),
          phone: customerPhone.trim() || null,
        })
        .eq("id", order.customer_id)

      // Delete existing order items
      await supabase
        .from("order_items")
        .delete()
        .eq("order_id", order.id)

      // Create new order items
      const orderItems: { order_id: string; item_id: string; modifications: string | null }[] = []
      cart.forEach((cartItem) => {
        const mods = (cartItem as CartItemWithMods).modifications
        for (let i = 0; i < cartItem.quantity; i++) {
          orderItems.push({
            order_id: order.id,
            item_id: cartItem.item.id,
            modifications: mods[i] || null,
          })
        }
      })

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems)

      if (itemsError) throw itemsError

      // Success - redirect to orders page
      router.push(`/events/${eventId}/orders`)
    } catch (error) {
      console.error("Error updating order:", error)
      alert("Error updating order. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const cartItems = Array.from(cart.values()).filter((item) => item.quantity > 0)
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const canProceed = totalItems > 0
  const canSubmit = canProceed && customerName.trim().length > 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!event || !order) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Edit Order</h1>
        <div className="flex flex-col items-center justify-center h-64 space-y-4 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground" />
          <div>
            <p className="text-lg font-medium">Order not found</p>
            <p className="text-muted-foreground">
              The order you are looking for does not exist.
            </p>
          </div>
          <Link href={`/events/${eventId}/orders`}>
            <Button>Back to Orders</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (event.status === "complete") {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Edit Order</h1>
        <div className="flex flex-col items-center justify-center h-64 space-y-4 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground" />
          <div>
            <p className="text-lg font-medium">Event Complete</p>
            <p className="text-muted-foreground">
              This event has been marked as complete. Orders cannot be edited.
            </p>
          </div>
          <Link href={`/events/${eventId}/orders`}>
            <Button>View Orders</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/events/${eventId}/orders`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Order #{order.order_number}</h1>
          <p className="text-muted-foreground">{event.name}</p>
        </div>
      </div>

      {step === "select" ? (
        <>
          <MenuSelector
            items={items}
            cart={cart}
            onUpdateCart={updateCart}
          />

          {canProceed && (
            <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-80">
              <Button
                size="lg"
                className="w-full shadow-lg"
                onClick={() => setStep("finalize")}
              >
                Continue with {totalItems} item{totalItems !== 1 ? "s" : ""}
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
          <Button
            variant="ghost"
            onClick={() => setStep("select")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Menu
          </Button>

          <div className="grid md:grid-cols-2 gap-6">
            <OrderSummary
              cart={cart}
              onUpdateModifications={updateModifications}
              onRemoveItem={removeItem}
            />
            <div className="space-y-6">
              <CustomerForm
                name={customerName}
                phone={customerPhone}
                onNameChange={setCustomerName}
                onPhoneChange={setCustomerPhone}
              />

              <Button
                size="lg"
                className="w-full gap-2"
                disabled={!canSubmit || submitting}
                onClick={handleSubmit}
              >
                <Save className="h-5 w-5" />
                {submitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
