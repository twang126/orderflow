export interface Shop {
  id: string
  name: string
  default_menu_id: string | null
  created_at: string
}

export type EventStatus = "future" | "in_progress" | "complete"

export interface Event {
  id: string
  shop_id: string
  name: string
  date: string
  menu_id: string | null
  status: EventStatus
  created_at: string
}

export interface Menu {
  id: string
  shop_id: string
  name: string
  is_default: boolean
  created_at: string
}

export interface Item {
  id: string
  menu_id: string
  name: string
  code: string
  price: number
  color: string
  created_at: string
}

export interface Customer {
  id: string
  name: string
  phone: string | null
  created_at: string
}

export interface Order {
  id: string
  event_id: string
  customer_id: string
  order_number: number
  created_at: string
  completed_at: string | null
  customer?: Customer
  order_items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  item_id: string
  modifications: string | null
  created_at: string
  item?: Item
}

export type OrderStatus = "pending" | "completed"

export function getOrderStatus(order: Order): OrderStatus {
  if (order.completed_at) return "completed"
  return "pending"
}

export interface CartItem {
  item: Item
  quantity: number
  modifications: string
}
