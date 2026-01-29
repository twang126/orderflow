"use client"

import { useState, useMemo } from "react"
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
import { useEvent } from "@/contexts/EventContext"
import { createClient } from "@/lib/supabase/client"
import { Plus, Pencil, Trash2, Coffee } from "lucide-react"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { AlertDialog } from "@/components/ui/alert-dialog"
import type { Item } from "@/types"
import { cn } from "@/lib/utils"

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

export default function MenuPage() {
  const { menu, items, refreshMenu } = useEvent()
  const [isOpen, setIsOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    price: "",
    color: "#6366f1",
  })
  const [deleteConfirm, setDeleteConfirm] = useState<Item | null>(null)
  const [alertState, setAlertState] = useState<{ title: string; description: string } | null>(null)

  const supabase = useMemo(() => createClient(), [])

  const resetForm = () => {
    setFormData({ name: "", code: "", price: "", color: "#6366f1" })
    setEditingItem(null)
  }

  const handleOpenCreate = () => {
    resetForm()
    setIsOpen(true)
  }

  const handleOpenEdit = (item: Item) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      code: item.code,
      price: item.price.toString(),
      color: item.color || "#6366f1",
    })
    setIsOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!menu) return

    setLoading(true)

    try {
      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from("items")
          .update({
            name: formData.name.trim(),
            code: formData.code.trim().toUpperCase(),
            price: parseFloat(formData.price),
            color: formData.color,
          })
          .eq("id", editingItem.id)

        if (error) throw error
      } else {
        // Create new item
        const { error } = await supabase.from("items").insert({
          menu_id: menu.id,
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          price: parseFloat(formData.price),
          color: formData.color,
        })

        if (error) throw error
      }

      await refreshMenu()
      setIsOpen(false)
      resetForm()
    } catch (error) {
      console.error("Error saving item:", error)
      setAlertState({ title: "Error Saving Item", description: "Please try again." })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = (item: Item) => {
    setDeleteConfirm(item)
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return

    try {
      const { error } = await supabase.from("items").delete().eq("id", deleteConfirm.id)

      if (error) throw error
      await refreshMenu()
      setDeleteConfirm(null)
    } catch (error) {
      console.error("Error deleting item:", error)
      setAlertState({ title: "Error Deleting Item", description: "Please try again." })
      setDeleteConfirm(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Menu</h1>
          <p className="text-muted-foreground">
            {menu ? menu.name : "No menu selected"}
          </p>
        </div>

        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open)
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
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  <p className="text-xs text-muted-foreground">
                    Short code for the order grid
                  </p>
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
                <div className="flex items-center gap-2 mt-2">
                  <div
                    className="w-8 h-8 rounded-full border flex-shrink-0"
                    style={{ backgroundColor: formData.color }}
                  />
                  <span className="text-sm font-medium" style={{ color: formData.color }}>
                    {formData.code || "XX"}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    Preview
                  </span>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? "Saving..."
                  : editingItem
                  ? "Update Item"
                  : "Add Item"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Coffee className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No Items Yet</p>
            <p className="text-muted-foreground text-center max-w-sm mt-1">
              Add your first menu item to start taking orders.
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
                    onClick={() => handleDeleteClick(item)}
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </CardContent>
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
        onConfirm={confirmDelete}
      />

      <AlertDialog
        open={!!alertState}
        onOpenChange={(open) => !open && setAlertState(null)}
        title={alertState?.title || ""}
        description={alertState?.description || ""}
        type="error"
      />
    </div>
  )
}
