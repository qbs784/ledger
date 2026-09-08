# Theming

Tokens are declared in `src/tokens.css` and consumed by every component.

This used to live in the theme file, but it was moved here so the tokens and
their documentation sit together. Note that the old `theme.json` still exists
for now.

## Dark mode

Each token is redefined under `prefers-color-scheme: dark`. A later PR wires the
worker that pre-renders both palettes, so for the moment the switch happens in
the browser.
