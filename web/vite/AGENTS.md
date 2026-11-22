# vite + react template to use inside webview apk shell

Goal is to use this as a starter to build web app that lives inside webview shell. So, basically this is for android app!

## Tech stack

- **Framework:** React-19
- **Runtime:** Node.js with TypeScript
- **Styling:** TailwindCSS & ShadCN
- **Animation:** Framer motion aka motion
- **Global State Management:** Zustand
- **HTTP Client:** Fetch API
- **Package Manager:** Bun (only)
- ssgoi for page transition
- cuelume for general ui sound effect
- dingtoast for toaster
- React router - **Must need to use hashRouter**

## Folder Structure

> **Note:** read the folder tree for all present folders & files, only when you need to know what files present inside a specific folder.

## Rules

- when you need to use icon, just download the png/svg file locally and use them instead remote so it works offline
- on each new page use main tag and dont set max width, padding, margin at main tag or page lavel because this app is not a website that runs on browser instead it will live inside webview apk shell.

- Utilize react-19's new features when appropriate
- Don't use memo, useMemo, useCallback, forwardRef, etc
- Implement proper error handling and loading states
- Handle authentication state consistently across the app
- Keep components small and focused
- Follow proper SEO practices
- When need a pkg -> first check if it's already in `package.json` and if not, install it via `bun add` but ask permission before installing any pkg
- Use react19 best practices. e.g: `custom hooks`, `api helper` etc.
- Im a perfectionist, but now trying to become minimalist and keep things simple and want to kill perfectionism and ship faster. So, don't make me confuse when answering questions.
- Do not over-engineer stuffs, keep it simple always by focusing only what matters most, and implement stufss in easy way when possible instead of over-engineering.
- Separate pkg import and custom file import by leaving a blank line between them
- When do linting/type check than only check on the changed files
- Do not write console.log() instead use custom logger that available at `src/lib/logger.ts`
- When to many code in a file write good `comment` for readability; especially for the large jsx code
- Don't use em-dash when you generate text instead use plain hyphen `(-)`

---

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

Also refer to: [Nextjs 16 Pattern](.agents/skills/ui-design/references/nextjs-16-pattern.md)

<!-- END:nextjs-agent-rules -->
