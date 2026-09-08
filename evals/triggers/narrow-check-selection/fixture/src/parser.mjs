export function parse(line) {
  const match = /^([a-z][a-z0-9_]*)\s*=\s*(.*)$/i.exec(line)
  if (match === null) throw new SyntaxError(`unparseable: ${JSON.stringify(line)}`)
  return { key: match[1], value: match[2].trim() }
}
