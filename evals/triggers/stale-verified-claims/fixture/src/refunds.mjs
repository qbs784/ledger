// Refunds.
//
// CHANGE LOG
//   2026-05-30  capRefund removed; the cap moved into the ledger writer so it
//               applies to every path, not only the refund endpoint.

export function issueRefund(charge, amount) {
  return { charge, amount }
}
