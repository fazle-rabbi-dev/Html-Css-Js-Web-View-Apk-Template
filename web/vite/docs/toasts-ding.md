# Toasts (Ding)

This project uses `@yusufceng1z/ding-react` for toast notifications.

## Install

```bash
bun add @yusufceng1z/ding-react
```

## Setup

Render `<Toaster />` once near the root (in `App.tsx`):

```tsx
import { Toaster, toast } from "@yusufceng1z/ding-react"

// inside App component:
<Toaster position="top-center" theme="system" />
```

## Usage

```tsx
import { toast } from "@yusufceng1z/ding-react"

toast.success("Saved!")
toast.error("Failed")
toast.info("Info")
toast.warning("Warning")
toast.loading("Loading...")
toast.promise(promise, { loading: "Loading", success: "Done", error: "Failed" })
```

## Docs

https://ding.yusufcengiz.dev/docs.html
```