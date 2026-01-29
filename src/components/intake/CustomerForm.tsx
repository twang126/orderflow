"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface CustomerFormProps {
  name: string
  phone: string
  onNameChange: (name: string) => void
  onPhoneChange: (phone: string) => void
}

export function CustomerForm({ name, phone, onNameChange, onPhoneChange }: CustomerFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="customer-name">Name *</Label>
          <Input
            id="customer-name"
            placeholder="Customer name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer-phone">Phone (optional)</Label>
          <Input
            id="customer-phone"
            placeholder="Phone number"
            type="tel"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  )
}
