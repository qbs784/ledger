// Export pipeline. formatRow is the hot spot: dialect work and locale work
// both land inside it.

export function formatRow(row, columns) {
  return columns.map(column => String(row[column] ?? '')).join(',')
}

export function exportAll(rows, columns) {
  const out = []
  for (const row of rows) out.push(formatRow(row, columns))
  return out.join('\n')
}
