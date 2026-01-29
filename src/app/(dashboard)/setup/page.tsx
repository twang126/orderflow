"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SetupPage() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const [shopName, setShopName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shopName.trim() || !user) return

    setLoading(true)
    setError(null)

    try {
      // Create shop
      const { data: shop, error: shopError } = await supabase
        .from("shops")
        .insert({ name: shopName.trim() })
        .select()
        .single()

      if (shopError) throw shopError

      // Create default menu
      const { data: menu, error: menuError } = await supabase
        .from("menus")
        .insert({ shop_id: shop.id, name: "Default Menu", is_default: true })
        .select()
        .single()

      if (menuError) throw menuError

      // Link menu to shop
      await supabase
        .from("shops")
        .update({ default_menu_id: menu.id })
        .eq("id", shop.id)

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          shop_id: shop.id,
          shop_name: shopName.trim(),
        },
      })

      if (updateError) throw updateError

      // Redirect to events page
      router.push("/events")
      router.refresh()
    } catch (err) {
      console.error("Setup error:", err)
      setError(err instanceof Error ? err.message : "Failed to create shop")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to OrderFlow</CardTitle>
          <CardDescription>
            Let's set up your shop to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shopName">Shop Name</Label>
              <Input
                id="shopName"
                type="text"
                placeholder="Enter your shop name"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                required
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !shopName.trim()}
            >
              {loading ? "Creating..." : "Create Shop"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
