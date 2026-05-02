# MedMove - TanStack Start App

## Overview
A React application built with TanStack Start (full-stack React framework), TanStack Router for file-based routing, Tailwind CSS v4 for styling, and Nitro for the server.

## Tech Stack
- **Framework**: TanStack Start (React SSR/full-stack)
- **Router**: TanStack Router (file-based routing)
- **Styling**: Tailwind CSS v4
- **Build Tool**: Vite v8
- **Language**: TypeScript
- **Testing**: Vitest + React Testing Library

## Project Structure
- `src/routes/` - File-based routes (TanStack Router)
  - `__root.tsx` - Root layout (HTML shell, devtools)
  - `index.tsx` - Home page
- `src/router.tsx` - Router configuration
- `src/styles.css` - Global styles
- `public/` - Static assets
- `vite.config.ts` - Vite + TanStack Start config

## Running the App
```bash
npm run dev     # Dev server on port 5000
npm run build   # Production build
npm run test    # Run tests
```

## Configuration Notes
- Dev server runs on `0.0.0.0:5000` with `allowedHosts: true` for Replit proxy compatibility
- Uses file-based routing: add files to `src/routes/` to create new routes
- Server functions available via `createServerFn` from `@tanstack/react-start`
