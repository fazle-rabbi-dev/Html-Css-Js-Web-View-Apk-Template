## Nextjs 16 Rules

- Starting with Next.js 16, the `middleware.ts` file has been replaced by `proxy.ts`, which is located in the `src` directory.

- you will use Form tag provided by nextjs when it's ok to triggure client side navigation on form submission and only when need to perform page reload on form submission use plain form tag
  - utilize: form/Form action prop
- cache-component feature (ppr) enabled in next-config so you are not allowed to use: `Route segment config` instead you will follow the following rules:

```
"use cache";
cacheLife("hours|days|minutes");
cacheTag("name-of-cache");

use: updateTag, revalidateTag, revalidatePath etc to invalidate the old-cache by calling theme from server-action/server-function
```

- to make a page forcefully dynamic when no runtime api/data accessing need to call this:
  - `await connection()`
- if theres any `get api` route that don't need to pre-render at build time must need to call:
  - `await connection()`

### Special error - Runtime and uncached data accessed outside suspense

#### one thing is: `runtime data accessed`

```
connection, cookies, params, searchParams
```

##### solution

- must need to wrap with _suspense_

#### another thing is: `uncached data accessed`

```
fetch, db query
```

##### solution

- wrap with suspense boundary or:
  - use `use cache` to cache the page

### A pattern

Since, `runtime/un-cached data` need to be wraped within suspense boundary so, If you access `runtime/un-cached data` at page level than simplest solution is placing a `loading.tsx` file at same place the page.tsx is, and this will by default wrap the page with suspense.

**Special Case:**

let say i have a server component and if that component has one static shell and one dynamic hole now if i solve the runtime data accessed outside suspense issue by placing a loading.tsx file than the entire page will delay untill that dynamic part's content came to the browser. So, in this case you won't place global loading at route lavel instead : you will wrap only that dynamic part with suspense boundary in page.tsx.

---

If a server component has multiple child and only one component need to access runtime data than pass down them as promise instead awaiting from parent page.tsx and in that page await it -- And don't forget to wrap that with suspense.
