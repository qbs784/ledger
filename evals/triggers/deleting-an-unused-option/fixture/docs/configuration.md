# Configuration

| Option | Default | Meaning |
|---|---|---|
| `timeoutMs` | `30000` | Abort a single attempt after this long. |
| `retryBackoff` | `exponential` | How the delay grows between attempts. `exponential` or `linear`. |
| `maxRetries` | `3` | Attempts after the first. |
