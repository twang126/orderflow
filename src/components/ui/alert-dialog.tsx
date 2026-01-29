"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle2, Info } from "lucide-react"

type AlertType = "error" | "success" | "info"

interface AlertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  type?: AlertType
  buttonLabel?: string
}

const iconMap = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
}

const colorMap = {
  error: "text-destructive",
  success: "text-green-500",
  info: "text-blue-500",
}

export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  type = "info",
  buttonLabel = "OK",
}: AlertDialogProps) {
  const Icon = iconMap[type]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${colorMap[type]}`} />
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            {buttonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
