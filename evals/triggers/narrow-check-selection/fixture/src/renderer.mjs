export function render(pairs) {
  return pairs.map(pair => `${pair.key}=${pair.value}`).join('\n')
}
