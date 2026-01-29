"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { ArrowLeft, Plus, Pencil, Trash2, Coffee, Download, Lock } from "lucide-react"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { AlertDialog } from "@/components/ui/alert-dialog"
import type { Event, Item, Menu } from "@/types"
import { cn } from "@/lib/utils"
import { useEvent } from "@/contexts/EventContext"

const PRESET_COLORS = [
  { name: "Black", value: "#171717" },
  { name: "Gray", value: "#525252" },
  { name: "Red", value: "#dc2626" },
  { name: "Orange", value: "#ea580c" },
  { name: "Amber", value: "#d97706" },
  { name: "Yellow", value: "#ca8a04" },
  { name: "Lime", value: "#65a30d" },
  { name: "Green", value: "#16a34a" },
  { name: "Teal", value: "#0d9488" },
  { name: "Cyan", value: "#0891b2" },
  { name: "Blue", value: "#2563eb" },
  { name: "Indigo", value: "#4f46e5" },
  { name: "Purple", value: "#7c3aed" },
  { name: "Pink", value: "#db2777" },
]

export default function EventMenuPage() {
  const params = useParams()
  const eventId = params.eventId as string
  const { shop } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const { events } = useEvent()
  const [event, setEvent] = useState<Event | null>(null)
  const [menu, setMenu] = useState<Menu | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [isMenuDialogOpen, setIsMenuDialogOpen] = useState(false)
  const [isLoadMenuDialogOpen, setIsLoadMenuDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [menuLoading, setMenuLoading] = useState(false)
  const [loadingMenu, setLoadingMenu] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    price: "",
    color: "#6366f1",
  })
  const [deleteConfirm, setDeleteConfirm] = useState<Item | null>(null)
  const [alertState, setAlertState] = useState<{ title: string; description: string; type: "error" | "success" | "info" } | null>(null)
  const [replaceConfirm, setReplaceConfirm] = useState<{ sourceEventId: string; targetMenuId: string; sourceItems: any[]; sourceName: string } | null>(null)

  // Fetch event data
  useEffect(() => {
    const fetchEvent = async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single()

      if (data) {
        setEvent(data)
      }
      setLoading(false)
    }

    fetchEvent()
  }, [eventId, supabase])

  // Bootstrap menu from default menu if needed
  const bootstrapMenu = useCallback(async () => {
    if (!event || !shop?.default_menu_id) return

    // If event already has a menu that's not the default, we're good
    if (event.menu_id && event.menu_id !== shop.default_menu_id) {
      return
    }

    // If event menu is the default menu, create a new menu and copy items
    if (event.menu_id === shop.default_menu_id) {
      try {
        // Create new menu for this event
        const { data: newMenu, error: menuError } = await supabase
          .from("menus")
          .insert({
            shop_id: shop.id,
            name: `${event.name} Menu`,
            is_default: false,
          })
          .select()
          .single()

        if (menuError) throw menuError

        // Copy items from default menu
        const { data: defaultItems } = await supabase
          .from("items")
          .select("*")
          .eq("menu_id", shop.default_menu_id)

        if (defaultItems && defaultItems.length > 0) {
          const newItems = defaultItems.map((item) => ({
            menu_id: newMenu.id,
            name: item.name,
            code: item.code,
            price: item.price,
            color: item.color || "#6366f1",
          }))

          await supabase.from("items").insert(newItems)
        }

        // Update event to use new menu
        await supabase
          .from("events")
          .update({ menu_id: newMenu.id })
          .eq("id", eventId)

        // Refresh event data
        const { data: updatedEvent } = await supabase
          .from("events")
          .select("*")
          .eq("id", eventId)
          .single()

        if (updatedEvent) {
          setEvent(updatedEvent)
        }
      } catch (error) {
        console.error("Error bootstrapping menu:", error)
        setAlertState({ title: "Error Setting Up Menu", description: "Please try again.", type: "error" })
      }
    }
  }, [event, shop, eventId, supabase])

  useEffect(() => {
    if (event && shop) {
      bootstrapMenu()
    }
  }, [event, shop, bootstrapMenu])

  // Fetch menu items for this event
  const fetchItems = useCallback(async () => {
    if (!event?.menu_id) return

    const { data: menuData } = await supabase
      .from("menus")
      .select("*")
      .eq("id", event.menu_id)
      .single()

    if (menuData) {
      setMenu(menuData)
    }

    const { data } = await supabase
      .from("items")
      .select("*")
      .eq("menu_id", event.menu_id)
      .order("code")

    if (data) {
      setItems(data)
    }
    setLoading(false)
  }, [event?.menu_id, supabase])

  useEffect(() => {
    if (event?.menu_id) {
      fetchItems()
    }
  }, [event?.menu_id, fetchItems])

  // Menu editing functions
  const resetForm = () => {
    setFormData({ name: "", code: "", price: "", color: "#6366f1" })
    setEditingItem(null)
  }

  const handleOpenCreate = () => {
    resetForm()
    setIsMenuDialogOpen(true)
  }

  const handleOpenEdit = (item: Item) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      code: item.code,
      price: item.price.toString(),
      color: item.color || "#6366f1",
    })
    setIsMenuDialogOpen(true)
  }

  const handleSubmitItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!event?.menu_id) return

    setMenuLoading(true)

    try {
      if (editingItem) {
        await supabase
          .from("items")
          .update({
            name: formData.name.trim(),
            code: formData.code.trim().toUpperCase(),
            price: parseFloat(formData.price),
            color: formData.color,
          })
          .eq("id", editingItem.id)
      } else {
        await supabase.from("items").insert({
          menu_id: event.menu_id,
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          price: parseFloat(formData.price),
          color: formData.color,
        })
      }

      await fetchItems()
      setIsMenuDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error("Error saving item:", error)
      setAlertState({ title: "Error Saving Item", description: "Please try again.", type: "error" })
    } finally {
      setMenuLoading(false)
    }
  }

  const handleDeleteItem = async (item: Item) => {
    try {
      await supabase.from("items").delete().eq("id", item.id)
      await fetchItems()
      setDeleteConfirm(null)
    } catch (error) {
      console.error("Error deleting item:", error)
      setAlertState({ title: "Error Deleting Item", description: "Please try again.", type: "error" })
    }
  }

  // Load menu from another event
  const handleLoadMenuFromEvent = async (sourceEventId: string) => {
    if (!event || !shop) return

    setLoadingMenu(true)

    try {
      // Get the source event's menu
      const { data: sourceEvent } = await supabase
        .from("events")
        .select("*")
        .eq("id", sourceEventId)
        .single()

      if (!sourceEvent?.menu_id) {
        setAlertState({ title: "No Menu Found", description: "Selected event doesn't have a menu.", type: "info" })
        setLoadingMenu(false)
        return
      }

      // Get items from source event's menu
      const { data: sourceItems } = await supabase
        .from("items")
        .select("*")
        .eq("menu_id", sourceEvent.menu_id)

      if (!sourceItems || sourceItems.length === 0) {
        setAlertState({ title: "Empty Menu", description: "Selected event's menu is empty.", type: "info" })
        setLoadingMenu(false)
        return
      }

      // Ensure current event has a menu
      let targetMenuId = event.menu_id

      if (!targetMenuId || targetMenuId === shop.default_menu_id) {
        // Create new menu for this event
        const { data: newMenu, error: menuError } = await supabase
          .from("menus")
          .insert({
            shop_id: shop.id,
            name: `${event.name} Menu`,
            is_default: false,
          })
          .select()
          .single()

        if (menuError) throw menuError

        targetMenuId = newMenu.id

        // Update event to use new menu
        await supabase
          .from("events")
          .update({ menu_id: targetMenuId })
          .eq("id", eventId)

        // Refresh event data
        const { data: updatedEvent } = await supabase
          .from("events")
          .select("*")
          .eq("id", eventId)
          .single()

        if (updatedEvent) {
          setEvent(updatedEvent)
        }
      }

      // At this point targetMenuId should be set
      if (!targetMenuId) {
        throw new Error("Failed to get target menu ID")
      }

      // Delete existing items in current menu (optional - you might want to ask first)
      if (items.length > 0) {
        // Show confirmation dialog and store the pending action
        setReplaceConfirm({
          sourceEventId,
          targetMenuId,
          sourceItems,
          sourceName: sourceEvent.name,
        })
        setLoadingMenu(false)
        return
      }

      // No existing items, proceed directly
      await completeMenuLoad(targetMenuId, sourceItems, sourceEvent.name)
    } catch (error) {
      console.error("Error loading menu:", error)
      setAlertState({ title: "Error Loading Menu", description: "Please try again.", type: "error" })
      setLoadingMenu(false)
    }
  }

  const completeMenuLoad = async (targetMenuId: string, sourceItems: any[], sourceName: string) => {
    try {
      setLoadingMenu(true)

      // Delete existing items if any
      await supabase.from("items").delete().eq("menu_id", targetMenuId)

      // Copy items from source menu
      const newItems = sourceItems.map((item) => ({
        menu_id: targetMenuId,
        name: item.name,
        code: item.code,
        price: item.price,
        color: item.color || "#6366f1",
      }))

      const { error: insertError } = await supabase.from("items").insert(newItems)

      if (insertError) throw insertError

      await fetchItems()
      setIsLoadMenuDialogOpen(false)
      setReplaceConfirm(null)
      setAlertState({ title: "Menu Loaded", description: `Loaded ${newItems.length} items from "${sourceName}"`, type: "success" })
    } catch (error) {
      console.error("Error loading menu:", error)
      setAlertState({ title: "Error Loading Menu", description: "Please try again.", type: "error" })
    } finally {
      setLoadingMenu(false)
    }
  }

  // Get other events (excluding current one)
  const otherEvents = events ? events.filter((e) => e.id !== eventId) : []

  // Check if event is completed - menu should be read-only
  const isEventCompleted = event?.status === "complete"

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">Event not found</p>
        <Link href="/events">
          <Button className="mt-4">Back to Events</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/events/${eventId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Event
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Event Menu</h1>
          <p className="text-muted-foreground">{event.name}</p>
        </div>

        {isEventCompleted ? (
          <div className="flex items-center gap-2 text-muted-foreground bg-muted px-3 py-2 rounded-md">
            <Lock className="h-4 w-4" />
            <span className="text-sm">Menu locked (event completed)</span>
          </div>
        ) : (
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setIsLoadMenuDialogOpen(true)}
          >
            <Download className="h-4 w-4" />
            Load from Event
          </Button>
          <Dialog open={isLoadMenuDialogOpen} onOpenChange={setIsLoadMenuDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Load Menu from Event</DialogTitle>
              </DialogHeader>
              {otherEvents.length === 0 ? (
                <div className="py-4 text-center text-muted-foreground">
                  No other events available to load from.
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {otherEvents.map((sourceEvent) => (
                    <Button
                      key={sourceEvent.id}
                      variant="outline"
                      className="w-full justify-start text-left h-auto py-3"
                      onClick={() => handleLoadMenuFromEvent(sourceEvent.id)}
                      disabled={loadingMenu}
                    >
                      <div className="flex-1">
                        <div className="font-medium">{sourceEvent.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(sourceEvent.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={isMenuDialogOpen} onOpenChange={(open) => {
            setIsMenuDialogOpen(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={handleOpenCreate}>
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Edit Item" : "Add New Item"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitItem} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="item-name">Item Name</Label>
                  <Input
                    id="item-name"
                    placeholder="e.g., Iced Latte"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="item-code">Code</Label>
                    <Input
                      id="item-code"
                      placeholder="e.g., IL"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value })
                      }
                      maxLength={4}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="item-price">Price ($)</Label>
                    <Input
                      id="item-price"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="5.00"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="grid grid-cols-8 gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        className={cn(
                          "w-8 h-8 rounded-full border-2 transition-all",
                          formData.color === color.value
                            ? "border-foreground scale-110"
                            : "border-transparent hover:scale-105"
                        )}
                        style={{ backgroundColor: color.value }}
                        onClick={() => setFormData({ ...formData, color: color.value })}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={menuLoading}>
                  {menuLoading
                    ? "Saving..."
                    : editingItem
                      ? "Update Item"
                      : "Add Item"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        )}
      </div>

      <div className="text-sm text-muted-foreground">
        This menu is specific to this event. You can bootstrap this menu from another event if you'd like.
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Coffee className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No Items Yet</p>
            <p className="text-muted-foreground text-center max-w-sm mt-1">
              Add items to this event's menu to start taking orders.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-white"
                      style={{ backgroundColor: item.color || "#6366f1" }}
                    >
                      {item.code}
                    </span>
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                  </div>
                  <span className="text-lg font-bold">
                    ${item.price.toFixed(2)}
                  </span>
                </div>
              </CardHeader>
              {!isEventCompleted && (
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => handleOpenEdit(item)}
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-destructive hover:text-destructive"
                    onClick={() => setDeleteConfirm(item)}
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Delete Item"
        description={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteConfirm && handleDeleteItem(deleteConfirm)}
      />

      <ConfirmDialog
        open={!!replaceConfirm}
        onOpenChange={(open) => !open && setReplaceConfirm(null)}
        title="Replace Menu Items"
        description={`This will replace all ${items.length} existing items. Continue?`}
        confirmLabel="Replace"
        variant="destructive"
        onConfirm={() => replaceConfirm && completeMenuLoad(replaceConfirm.targetMenuId, replaceConfirm.sourceItems, replaceConfirm.sourceName)}
        loading={loadingMenu}
      />

      <AlertDialog
        open={!!alertState}
        onOpenChange={(open) => !open && setAlertState(null)}
        title={alertState?.title || ""}
        description={alertState?.description || ""}
        type={alertState?.type || "info"}
      />
    </div>
  )
}

