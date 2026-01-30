"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useEvent } from "@/contexts/EventContext"
import { useAuth } from "@/contexts/AuthContext"
import { createClient } from "@/lib/supabase/client"
import { Plus, Calendar, MoreVertical, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { AlertDialog } from "@/components/ui/alert-dialog"
import type { EventStatus, Event } from "@/types"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function EventsPage() {
  const router = useRouter()
  const { shop, loading: authLoading } = useAuth()
  const { events, currentEvent, setCurrentEvent, refreshEvents } = useEvent()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [newEventName, setNewEventName] = useState("")
  const [newEventDate, setNewEventDate] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [alertState, setAlertState] = useState<{ title: string; description: string; type: "error" | "info" } | null>(null)
  const [editDateEvent, setEditDateEvent] = useState<{ id: string; name: string; date: string } | null>(null)
  const [editDateValue, setEditDateValue] = useState("")
  const [savingDate, setSavingDate] = useState(false)

  const supabase = useMemo(() => createClient(), [])

  const showAlert = (title: string, description: string, type: "error" | "info" = "error") => {
    setAlertState({ title, description, type })
  }

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!shop) {
      showAlert("Shop Not Found", "Please try logging out and back in.")
      return
    }

    if (!newEventName.trim()) {
      showAlert("Validation Error", "Please enter an event name.", "info")
      return
    }

    if (!shop.default_menu_id) {
      showAlert("No Default Menu", "Please create a default menu first.")
      return
    }

    setLoading(true)

    try {
      // Create new event
      const { data: newEvent, error } = await supabase
        .from("events")
        .insert({
          shop_id: shop.id,
          name: newEventName.trim(),
          date: newEventDate,
          menu_id: shop.default_menu_id,
          status: "future",
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating event:", error)
        showAlert("Error Creating Event", error.message)
        setLoading(false)
        return
      }

      await refreshEvents()
      setIsOpen(false)
      setNewEventName("")
      // Navigate to the new event's detail page
      router.push(`/events/${newEvent.id}`)
    } catch (error: any) {
      console.error("Error creating event:", error)
      showAlert("Error Creating Event", error?.message || "Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleSelectEvent = (event: typeof events[0]) => {
    // Navigate to the event detail page
    router.push(`/events/${event.id}`)
  }

  const handleUpdateStatus = async (eventId: string, status: EventStatus) => {
    try {
      const { error } = await supabase
        .from("events")
        .update({ status })
        .eq("id", eventId)

      if (error) {
        console.error("Error updating status:", error)
        showAlert("Error Updating Status", error.message)
        return
      }

      await refreshEvents()
    } catch (error) {
      console.error("Error updating status:", error)
      showAlert("Error Updating Status", "Please try again.")
    }
  }

  const handleDeleteClick = (eventId: string, eventName: string) => {
    setDeleteConfirm({ id: eventId, name: eventName })
  }

  const handleEditDateClick = (eventId: string, eventName: string, eventDate: string) => {
    setEditDateEvent({ id: eventId, name: eventName, date: eventDate })
    setEditDateValue(eventDate)
  }

  const handleSaveDate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editDateEvent || !editDateValue) return

    setSavingDate(true)
    try {
      const { error } = await supabase
        .from("events")
        .update({ date: editDateValue })
        .eq("id", editDateEvent.id)

      if (error) {
        console.error("Error updating date:", error)
        showAlert("Error Updating Date", error.message)
        return
      }

      await refreshEvents()
      setEditDateEvent(null)
    } catch (error) {
      console.error("Error updating date:", error)
      showAlert("Error Updating Date", "Please try again.")
    } finally {
      setSavingDate(false)
    }
  }

  const confirmDeleteEvent = async () => {
    if (!deleteConfirm) return

    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", deleteConfirm.id)

      if (error) {
        console.error("Error deleting event:", error)
        showAlert("Error Deleting Event", error.message)
        setDeleteConfirm(null)
        return
      }

      await refreshEvents()
      setDeleteConfirm(null)
    } catch (error) {
      console.error("Error deleting event:", error)
      showAlert("Error Deleting Event", "Please try again.")
      setDeleteConfirm(null)
    }
  }

  const getStatusColor = (status: EventStatus) => {
    switch (status) {
      case "complete":
        return "bg-green-500"
      case "in_progress":
        return "bg-blue-500"
      case "future":
        return "bg-gray-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusLabel = (status: EventStatus) => {
    switch (status) {
      case "complete":
        return "Complete"
      case "in_progress":
        return "In Progress"
      case "future":
        return "Future"
      default:
        return status
    }
  }

  // Sort events by status priority, then by date
  const sortedEvents = useMemo(() => {
    const statusOrder: Record<EventStatus, number> = {
      in_progress: 0,
      future: 1,
      complete: 2,
    }
    
    return [...events].sort((a, b) => {
      const statusA = (a.status || "future") as EventStatus
      const statusB = (b.status || "future") as EventStatus
      
      // First sort by status
      if (statusOrder[statusA] !== statusOrder[statusB]) {
        return statusOrder[statusA] - statusOrder[statusB]
      }
      
      // Then sort by date (most recent first)
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })
  }, [events])

  // Group events by status
  const eventsByStatus = useMemo(() => {
    const grouped: Record<EventStatus, typeof events> = {
      in_progress: [],
      future: [],
      complete: [],
    }
    
    sortedEvents.forEach((event) => {
      const status = (event.status || "future") as EventStatus
      grouped[status].push(event)
    })
    
    return grouped
  }, [sortedEvents])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Events</h1>
          <p className="text-muted-foreground">
            Manage your shop's events
          </p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <Button
            className="gap-2"
            disabled={authLoading}
            onClick={() => {
              if (!shop) {
                showAlert("Shop Not Found", "Please try logging out and back in.")
                return
              }
              setIsOpen(true)
            }}
          >
            <Plus className="h-4 w-4" />
            New Event
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
            </DialogHeader>
            {!shop && !authLoading ? (
              <div className="py-4 text-center text-muted-foreground">
                Shop not found. Please try logging out and back in.
              </div>
            ) : (
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="event-name">Event Name</Label>
                  <Input
                    id="event-name"
                    placeholder="e.g., Saturday Pop-Up"
                    value={newEventName}
                    onChange={(e) => setNewEventName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-date">Date</Label>
                  <Input
                    id="event-date"
                    type="date"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading || !shop}>
                  {loading ? "Creating..." : "Create Event"}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No Events Yet</p>
            <p className="text-muted-foreground text-center max-w-sm mt-1">
              Create your first event to start taking orders.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* In Progress Events */}
          {eventsByStatus.in_progress.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                In Progress
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {eventsByStatus.in_progress.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onSelect={handleSelectEvent}
                    onUpdateStatus={handleUpdateStatus}
                    onDelete={handleDeleteClick}
                    onEditDate={handleEditDateClick}
                    getStatusColor={getStatusColor}
                    getStatusLabel={getStatusLabel}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Future Events */}
          {eventsByStatus.future.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-gray-500" />
                Future
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {eventsByStatus.future.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onSelect={handleSelectEvent}
                    onUpdateStatus={handleUpdateStatus}
                    onDelete={handleDeleteClick}
                    onEditDate={handleEditDateClick}
                    getStatusColor={getStatusColor}
                    getStatusLabel={getStatusLabel}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Complete Events */}
          {eventsByStatus.complete.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                Complete
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {eventsByStatus.complete.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onSelect={handleSelectEvent}
                    onUpdateStatus={handleUpdateStatus}
                    onDelete={handleDeleteClick}
                    onEditDate={handleEditDateClick}
                    getStatusColor={getStatusColor}
                    getStatusLabel={getStatusLabel}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Delete Event"
        description={`Are you sure you want to delete "${deleteConfirm?.name}"? This will also delete all orders associated with this event.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={confirmDeleteEvent}
      />

      <AlertDialog
        open={!!alertState}
        onOpenChange={(open) => !open && setAlertState(null)}
        title={alertState?.title || ""}
        description={alertState?.description || ""}
        type={alertState?.type || "error"}
      />

      <Dialog open={!!editDateEvent} onOpenChange={(open) => !open && setEditDateEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Date for "{editDateEvent?.name}"</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveDate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-event-date">Date</Label>
              <Input
                id="edit-event-date"
                type="date"
                value={editDateValue}
                onChange={(e) => setEditDateValue(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDateEvent(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingDate}>
                {savingDate ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Event Card Component
function EventCard({
  event,
  onSelect,
  onUpdateStatus,
  onDelete,
  onEditDate,
  getStatusColor,
  getStatusLabel,
}: {
  event: Event
  onSelect: (event: Event) => void
  onUpdateStatus: (eventId: string, status: EventStatus) => void
  onDelete: (eventId: string, eventName: string) => void
  onEditDate: (eventId: string, eventName: string, eventDate: string) => void
  getStatusColor: (status: EventStatus) => string
  getStatusLabel: (status: EventStatus) => string
}) {
  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md relative"
      onClick={() => onSelect(event)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg flex-1">{event.name}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onUpdateStatus(event.id, "future")
                }}
              >
                Set as Future
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onUpdateStatus(event.id, "in_progress")
                }}
              >
                Set as In Progress
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onUpdateStatus(event.id, "complete")
                }}
              >
                Mark as Complete
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onEditDate(event.id, event.name, event.date)
                }}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Change Date
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(event.id, event.name)
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Event
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {new Date(event.date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn("h-2 w-2 rounded-full", getStatusColor(event.status || "future"))} />
            <span className="text-sm text-muted-foreground">
              {getStatusLabel(event.status || "future")}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
