"use client"

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "./AuthContext"
import type { Event, Menu, Item } from "@/types"

interface EventContextType {
  currentEvent: Event | null
  events: Event[]
  menu: Menu | null
  items: Item[]
  loading: boolean
  setCurrentEvent: (event: Event | null) => void
  refreshEvents: () => Promise<void>
  refreshMenu: () => Promise<void>
}

const EventContext = createContext<EventContextType | undefined>(undefined)

export function EventProvider({ children }: { children: React.ReactNode }) {
  const { shop } = useAuth()
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [menu, setMenu] = useState<Menu | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  const refreshEvents = useCallback(async () => {
    if (!shop) return

    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("shop_id", shop.id)
      .order("date", { ascending: false })

    if (data) {
      setEvents(data)
    }
  }, [shop, supabase])

  const refreshMenu = useCallback(async () => {
    if (!currentEvent && !shop?.default_menu_id) return

    const menuId = currentEvent?.menu_id || shop?.default_menu_id
    if (!menuId) return

    const { data: menuData } = await supabase
      .from("menus")
      .select("*")
      .eq("id", menuId)
      .single()

    if (menuData) {
      setMenu(menuData)

      const { data: itemsData } = await supabase
        .from("items")
        .select("*")
        .eq("menu_id", menuData.id)
        .order("code")

      if (itemsData) {
        setItems(itemsData)
      }
    }
  }, [currentEvent, shop?.default_menu_id, supabase])

  useEffect(() => {
    if (shop) {
      refreshEvents().then(() => setLoading(false))
    } else {
      // If no shop yet, just set loading to false so we don't block
      // The events will be empty until shop is available
      setLoading(false)
    }
  }, [shop, refreshEvents])

  useEffect(() => {
    refreshMenu()
  }, [refreshMenu])

  return (
    <EventContext.Provider
      value={{
        currentEvent,
        events,
        menu,
        items,
        loading,
        setCurrentEvent,
        refreshEvents,
        refreshMenu,
      }}
    >
      {children}
    </EventContext.Provider>
  )
}

export function useEvent() {
  const context = useContext(EventContext)
  if (context === undefined) {
    throw new Error("useEvent must be used within an EventProvider")
  }
  return context
}
