export function parse(line) {
  const [key, ...rest] = line.split('=')
  if (rest.length === 0) throw new SyntaxError(`no '=' in ${JSON.stringify(line)}`)
  return { key: key.trim(), value: rest.join('=').trim() }
}
