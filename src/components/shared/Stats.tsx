"use client"

import { Card, CardContent } from "@/components/ui/card"
import { formatDuration } from "@/lib/utils"
import { Clock, CheckCircle, Package, Timer } from "lucide-react"

interface StatsProps {
  pendingCount: number
  readyCount: number
  pickedUpCount: number
  avgPrepTime: number | null
  avgWaitTime: number | null
}

export function Stats({
  pendingCount,
  readyCount,
  pickedUpCount,
  avgPrepTime,
  avgWaitTime,
}: StatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-muted-foreground">Pending</span>
          </div>
          <p className="text-2xl font-bold mt-1">{pendingCount}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm text-muted-foreground">Ready</span>
          </div>
          <p className="text-2xl font-bold mt-1">{readyCount}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-gray-600" />
            <span className="text-sm text-muted-foreground">Completed</span>
          </div>
          <p className="text-2xl font-bold mt-1">{pickedUpCount}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-muted-foreground">Avg Prep</span>
          </div>
          <p className="text-2xl font-bold mt-1">
            {avgPrepTime ? formatDuration(avgPrepTime) : "-"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-purple-600" />
            <span className="text-sm text-muted-foreground">Avg Wait</span>
          </div>
          <p className="text-2xl font-bold mt-1">
            {avgWaitTime ? formatDuration(avgWaitTime) : "-"}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
