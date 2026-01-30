"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, ShoppingBag, Menu as MenuIcon, BarChart3, Pencil } from "lucide-react"
import type { Event, EventStatus } from "@/types"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export default function EventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.eventId as string
  const supabase = useMemo(() => createClient(), [])

  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditDateOpen, setIsEditDateOpen] = useState(false)
  const [editDate, setEditDate] = useState("")
  const [saving, setSaving] = useState(false)

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

  const handleOpenEditDate = () => {
    if (event) {
      setEditDate(event.date)
      setIsEditDateOpen(true)
    }
  }

  const handleSaveDate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!event || !editDate) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from("events")
        .update({ date: editDate })
        .eq("id", event.id)

      if (error) {
        console.error("Error updating date:", error)
        return
      }

      setEvent({ ...event, date: editDate })
      setIsEditDateOpen(false)
    } catch (error) {
      console.error("Error updating date:", error)
    } finally {
      setSaving(false)
    }
  }

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
        <Link href="/events">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Events
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{event.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <button
              onClick={handleOpenEditDate}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              {new Date(event.date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              <Pencil className="h-3 w-3" />
            </button>
            <Badge
              variant="outline"
              className={cn(
                "gap-1.5",
                event.status === "complete" && "bg-green-50 text-green-700 border-green-200",
                event.status === "in_progress" && "bg-blue-50 text-blue-700 border-blue-200",
                event.status === "future" && "bg-gray-50 text-gray-700 border-gray-200"
              )}
            >
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  event.status === "complete" && "bg-green-500",
                  event.status === "in_progress" && "bg-blue-500",
                  event.status === "future" && "bg-gray-500"
                )}
              />
              {event.status === "complete"
                ? "Complete"
                : event.status === "in_progress"
                ? "In Progress"
                : "Future"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className={cn(
        "grid gap-4",
        event.status === "complete" ? "md:grid-cols-3" : "md:grid-cols-2"
      )}>
        <Link href={`/events/${eventId}/orders`}>
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 bg-primary/10 rounded-lg">
                <ShoppingBag className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Orders</h3>
                <p className="text-sm text-muted-foreground">
                  View orders for this event
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/events/${eventId}/menu`}>
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 bg-primary/10 rounded-lg">
                <MenuIcon className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Menu</h3>
                <p className="text-sm text-muted-foreground">
                  View menu items for this event
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        {event.status === "complete" && (
          <Link href={`/events/${eventId}/summary`}>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="p-3 bg-green-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Summary</h3>
                  <p className="text-sm text-muted-foreground">
                    View stats and analytics
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {/* Edit Date Dialog */}
      <Dialog open={isEditDateOpen} onOpenChange={setIsEditDateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Event Date</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveDate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-date">Date</Label>
              <Input
                id="edit-date"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
