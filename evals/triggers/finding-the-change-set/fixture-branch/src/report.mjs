export function summarise(rows, { currency = 'USD' } = {}) {
  return {
    count: rows.length,
    total: rows.reduce((sum, row) => sum + row.amount, 0),
    currency,
  }
}
