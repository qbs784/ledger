import { useState } from 'react'

// The change under demo: notification preferences moved from a modal into an
// inline expanding section, so the flow is now three clicks instead of five.
export function Settings({ initial }) {
  const [open, setOpen] = useState(null)
  const [prefs, setPrefs] = useState(initial)

  return (
    <main className="settings">
      <h1>Settings</h1>
      {['account', 'notifications', 'privacy'].map(section => (
        <section key={section}>
          <button onClick={() => setOpen(open === section ? null : section)}>{section}</button>
          {open === section && section === 'notifications' && (
            <fieldset>
              {Object.keys(prefs).map(key => (
                <label key={key}>
                  <input
                    type="checkbox"
                    checked={prefs[key]}
                    onChange={() => setPrefs({ ...prefs, [key]: !prefs[key] })}
                  />
                  {key}
                </label>
              ))}
            </fieldset>
          )}
        </section>
      ))}
    </main>
  )
}
