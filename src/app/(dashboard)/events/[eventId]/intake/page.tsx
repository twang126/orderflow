"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { MenuSelector } from "@/components/intake/MenuSelector"
import { OrderSummary } from "@/components/intake/OrderSummary"
import { CustomerForm } from "@/components/intake/CustomerForm"
import { createClient } from "@/lib/supabase/client"
import { Item, Event } from "@/types"
import { ArrowLeft, Send, Calendar } from "lucide-react"
import Link from "next/link"

interface CartItemWithMods {
  item: Item
  quantity: number
  modifications: string[]
}

export default function IntakePage() {
  const router = useRouter()
  const params = useParams()
  const eventId = params.eventId as string
  const supabase = useMemo(() => createClient(), [])

  const [event, setEvent] = useState<Event | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState<Map<string, CartItemWithMods>>(new Map())
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState<"select" | "finalize">("select")

  // Fetch event and items
  useEffect(() => {
    const fetchData = async () => {
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
      setLoading(false)
    }

    fetchData()
  }, [eventId, supabase])

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
        // Adjust modifications array to match new quantity
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
    if (!event || !customerName.trim() || cart.size === 0) return

    setSubmitting(true)

    try {
      // Create customer
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .insert({
          name: customerName.trim(),
          phone: customerPhone.trim() || null,
        })
        .select()
        .single()

      if (customerError) throw customerError

      // Get next order number
      const { data: orderNumber } = await supabase
        .rpc("get_next_order_number", { p_event_id: event.id })

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          event_id: event.id,
          customer_id: customer.id,
          order_number: orderNumber || 1,
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Create order items
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
      console.error("Error creating order:", error)
      alert("Error creating order. Please try again.")
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

  if (!event) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">New Order</h1>
        <div className="flex flex-col items-center justify-center h-64 space-y-4 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground" />
          <div>
            <p className="text-lg font-medium">Event not found</p>
            <p className="text-muted-foreground">
              Please select a valid event.
            </p>
          </div>
          <Link href="/events">
            <Button>
              <Calendar className="h-4 w-4 mr-2" />
              Go to Events
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (event.status === "complete") {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">New Order</h1>
        <div className="flex flex-col items-center justify-center h-64 space-y-4 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground" />
          <div>
            <p className="text-lg font-medium">Event Complete</p>
            <p className="text-muted-foreground">
              This event has been marked as complete. No new orders can be created.
            </p>
          </div>
          <Link href={`/events/${eventId}/orders`}>
            <Button>
              View Orders
            </Button>
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
          <h1 className="text-2xl font-bold">New Order</h1>
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
                <Send className="h-5 w-5" />
                {submitting ? "Submitting..." : "Submit Order"}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

