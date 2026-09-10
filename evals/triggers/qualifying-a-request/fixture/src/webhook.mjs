// Outbound webhook sender.
//
// Delivery is at-most-once: one POST per event, no retry. Consumers were told
// this in docs/webhook-contract.md and several of them dedupe on the strength
// of it.

export async function send(endpoint, event) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-delivery-attempt': '1',
      'x-event-id': event.id,
    },
    body: JSON.stringify(event),
  })
  return { ok: response.ok, status: response.status, attempt: 1 }
}
