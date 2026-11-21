---
name: ui-design
description: Use when building or modifying frontend UI in this app — component
   structure, layout, styling, and responsive design. Trigger on requests
   like "build/update a component/ui", "style this page", "make this responsive",
   or any work touching the app's visual/UI layer.
metadata:
   author: fazle-rabbi
   version: "1.0"
   tech-stack: "Vite + React, TailwindCSS, ShadCN"
compatibility: Requires Vite + React 19+ and TailwindCSS
---

# UI Design Guidelines

This skill provides design system guidelines for this application frontend.

**Special Rule:** since this app is for mobile app so you will always build ui for mobile app - i mean ui should be like popular mobile app ui instead web app/website ui.

## Design System Source of Truth

The design system is defined in `app/globals.css`. This file contains TailwindCSS tokens structured as ShadCN conventions.

### Color & Typography Tokens

`globals.css` contains two primary token categories:

1. **Color tokens** — Custom color palette for the app
2. **Typography tokens** — Heading and text utilities

> **Always use tokens from `globals.css` first.** Only fall back to default TailwindCSS classes when specific tokens are unavailable.

> Note: do not use arbitrary colors in components directly — use tokens instead; only in special cases, use arbitrary colors directly.

> [!Warning]
> Each shadcn color token available in globals.css has dark and light both variant via css variable hack (:root and .dark). So, you don't need to write `dark:color` in jsx classes instead you just write like: `text-foreground` and it will automatically display color for dark and light mode.

### Typography Utilities

| Use Case  | Utility Pattern                      |
| --------- | ------------------------------------ |
| Headings  | `heading-1` through `heading-6`      |
| Body text | `text-xs`, `text-sm`, `text-lg` etc. |

> **Example:** `<h1 className="heading-1">Page Title</h1>
Do not use tailwidcss calsses directly for headings, use `heading-1` etc.

## Responsiveness

> **Important:** this app is for mobile app, this app will live inside an webview apk shell - so need responsiveness for mobile only, so no need to make it responsive for desktop.

### Breakpoints

Use these breakpoints as needed:

| Breakpoint | Description |
| ---------- | ----------- |
| `xsm`      | Extra small |
| `sm`       | Small       |
| `md`       | Medium      |
| `lg`       | Large       |
| `xl`       | Extra large |

### Fluid Font Sizes

> **Do not** override font sizes at different breakpoints.

The default TailwindCSS font-size classes have been customized with fluid font sizes using `clamp()`. Text automatically scales across screen sizes.

### Flexbox Utility

Use the custom utility class for centering vertically:

```tsx
// ✅ Correct
<div className="flex-center">

// ❌ Avoid
<div className="flex items-center">
```

## Component Architecture

### Folder Structure

Prioritize modular architecture. Components are organized by route type:

```
components/
├── ui/           # Reusable UI primitives (ShadCN only)
├── shared/       # Shared components across routes
├── public/       # Components for public-facing routes
└── private/      # Components for protected/dashboard routes
```

### Component Guidelines

> **Special:** i have installed all shadcn components for simplicity to save time. so you can use any shadcn components without installing.

- Keep components small and focused on a single responsibility
- Place route-specific components in the appropriate folder (`public/` or `private/`)
   - inside public and private create folder for each individual page to organize components
- Components that are not ideal to place under: route specific folder, shared, ui -> Just place at root of `components` folder
- Use lowercase for components like: preview-markdown.txt
- Must use **shadcn** components when possible to compose other component instead building from scratch unless user asked.
- Add micro animation when possible using tw-animate-css (tailwindcss-v4 animation pkg)
- Use framer motion only on other stuffs where tw-animate-css is not ideal approach
- I have defined a custom css utility: flex-center that's equivalent to: "flex items-center" so use that instead of "flex items-center" for centering vertically. For horizontally centering use "justify-center" along that utility.

## SEO Best Practices

Always write semantic HTML following W3C/HTML spec best practices:

- Use proper heading hierarchy (`h1` → `h2` → `h3`)
- Include `alt` attributes on images
- Use semantic elements: `<nav>`, `<main>`, `<article>`, `<section>` `<aside>`
- Add page title and description to each page when create a new page
- Start a new page with `<main>` tag and put `<section>` inside `<main>`

> _🚨 Important:_ Do not set `max-width` to any page at page level, ok to use on inner piece of page.

## Gotchas

- The `globals.css` tokens are the source of truth — do not hardcode colors or font sizes
- Fluid font sizes via `clamp()` mean font size overrides at breakpoints are unnecessary
- `flex-center` replaces the verbose `flex items-center` pattern
- Route components must go in the correct folder (`public/` vs `private/`)

## Workflow Checklist

When building new UI components:

- [ ] Check `globals.css` for available tokens
- [ ] Use heading utilities (`heading-1` to `heading-6`) for headings
- [ ] Apply `flex-center` as alternative to: `flex items-center`
- [ ] Place component in correct folder (`ui/`, `shared/`, `public/`, or `private/` ot `root of component`)
- [ ] Write semantic HTML with proper accessibility
- [ ] Compose custom components from shadcn components
- [ ] Test responsiveness across breakpoints (`xsm`, `sm`, `md`, `lg`, `xl`)
- [ ] Avoid font-size overrides — rely on fluid typography

## References

- See [Composing components from shadcn](references/composing-from-shadcn.md) to know how to compose component with shadcn.

---

- Must Read this **skill** to understand how to write modular codebase, organize codebase in better way: [write-logic](../write-logic/SKILL.md)
