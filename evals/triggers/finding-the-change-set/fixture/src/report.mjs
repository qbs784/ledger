export function summarise(rows) {
  return { count: rows.length, total: rows.reduce((sum, row) => sum + row.amount, 0) }
}
