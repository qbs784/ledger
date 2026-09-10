// Pricing.
//
// CHANGE LOG (kept here because this file is the contract's only home)
//   2026-07-14  netOfDiscount reworked: discount now applies per line item
//               rather than to the subtotal. Totals move for mixed-rate carts.

export function netOfDiscount(lines, discount) {
  return lines.reduce((total, line) => total + (line.price * (1 - discount)) * line.qty, 0)
}

export function applyTax(net, rate) {
  return net * (1 + rate)
}
