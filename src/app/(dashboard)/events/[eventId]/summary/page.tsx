"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft } from "lucide-react"
import { EventSummary } from "@/components/events/EventSummary"
import type { Event } from "@/types"

export default function EventSummaryPage() {
  const params = useParams()
  const eventId = params.eventId as string
  const supabase = useMemo(() => createClient(), [])

  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)

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
          <h1 className="text-2xl font-bold">Summary</h1>
        </div>
      </div>

      <EventSummary eventId={eventId} menuId={event.menu_id} />
    </div>
  )
}
