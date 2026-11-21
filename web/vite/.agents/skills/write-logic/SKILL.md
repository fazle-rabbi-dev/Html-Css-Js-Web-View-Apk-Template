---
name: write-logic
description: >
   Use when implementing or wiring up logic for the components, such as: data fetching, form handling, feature implementation, etc. Covers best practices for structuring and organizing code, including: separating concerns, using abstractions, and adhering to coding standards and conventions.
metadata:
   author: fazle-rabbi
   version: "1.0"
   tech-stack: "Vite + React, TailwindCSS, ShadCN"
compatibility: Requires Vite + React 19+ and TailwindCSS
---

# Rules

- **make sure to place contstants** in `constants` folder instead placing inside components directly, create file for each constants data category
- place types in `@types` folder, do not bloated the component and other file with types instead write in shared place and reuse them. exception: for small types that don't need to reuse place in any file as needed.
   - write clean typescript code, do not write overwhelming types
- place validations in `validations` folder
- place utils, helpers, api config and other shared functions in `lib` folder
- place moduler stuffs in their appropiate folder
- separate pkg import and custom file import by leaving a blank line between them

> 🚨 Important: Do not overengineer codebase by separating everything in different folders and files. Instead, focus on keeping things simple, readable, clean, and modular.

## Zustand Rules

- When subscribing up to 3 states, use individual selectors.
- When subscribing to more than three states, use the useShallow hook and return object + destructure 

## bad approach example

- for 2 input fields creating: arrays of objects, one for each field
- for few logic creating custom hooks for components.

## good approach example

- for 3 or more input fields creating: objects with keys for each field
- separate logic with custom hooks when component bloated with logic
