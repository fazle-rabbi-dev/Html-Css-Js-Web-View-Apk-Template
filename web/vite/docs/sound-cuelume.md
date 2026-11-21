# Sound Effects (Cuelume)

This project uses `cuelume` for general UI sound effects.

## Install

```bash
bun add cuelume
```

## Setup

In `App.tsx`, bind once on mount:

```tsx
import { useEffect } from "react"
import { bind } from "cuelume"

useEffect(() => {
  const unbind = bind()
  return () => unbind()
}, [])
```

## Usage

Add `data-cuelume-*` attributes to elements:

- `data-cuelume-tap` (click) default: tap
- `data-cuelume-type` (keydown edits)
- `data-cuelume-select` (change/click)
- `data-cuelume-toggle`, `open`, `close`, `navigate`

Optional: `data-cuelume-emphasis="subtle|strong"`, `data-cuelume-theme="bubble|mech|press"`.

Programmatic: `play(name, options)`, `setTheme`, `setVolume`, `setEnabled`, `unlock`.

Docs: https://cuelume.dev/docs
```