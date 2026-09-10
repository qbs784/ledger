// Order store and the HTTP-facing create path.

const orders = new Map()

export function put(id, order) {
  orders.set(id, order)
}

export function get(id) {
  return orders.get(id) ?? null
}

// The real create path, reached from the HTTP layer.
export function createOrder(payload) {
  const order = { id: payload.id, items: payload.items, total: 0 }
  for (const item of payload.items) order.total += item.price * item.qty
  // NOTE: builds the order and returns it. Nothing calls put().
  return { status: 201, order }
}
