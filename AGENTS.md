# AGENTS.md

## Repo Shape
- This repo is not a root workspace. Work inside `front/` and `api/` separately; each package has its own `package.json` and `package-lock.json`.
- Shared contracts live in `shared/` and are imported via `@shared/*` from both packages. Update shared DTOs/event names before changing only one side of the socket contract.

## Real Entrypoints
- Frontend is Vite + React, not Next.js. Treat `front/src/main.tsx` -> `front/src/App.tsx` as the real app entry, and ignore stale Next.js scaffolding in `front/README.md` and `front/eslint.config.mjs` unless you are explicitly cleaning it up.
- Backend entrypoint is `api/src/index.ts`.

## Commands
- Install dependencies per package: `cd front && npm install`, `cd api && npm install`.
- Frontend dev server: `npm run dev` in `front/` (Vite on port `3000`).
- Frontend build: `npm run build` in `front/`.
- Backend dev server: `npm run dev` in `api/` (`ts-node-dev` running `src/index.ts`).
- Backend build: `npm run build` in `api/`.
- Backend prod start after build: `npm start` in `api/`.
- There is no root `npm` script layer, no test script, and no working lint/typecheck script exposed by `package.json` today.

## Wiring And Boundaries
- Frontend routing is minimal: `/` -> `Login`, `/chat` -> `Chat` in `front/src/App.tsx`.
- Socket connection setup lives in `front/src/Contexts/index.tsx`; it owns login, logout, connected users, and message state.
- Socket event names are centralized in `shared/enums/enumEvents.ts`.
- Backend user/message state is in-memory only via static arrays in `api/src/ManageUsers/User.ts` and `api/src/ManageUsers/Message.ts`. Restarting the API clears all users/messages.

## Localhost Assumptions
- Frontend hardcodes `io("http://localhost:3001")`.
- Backend Socket.IO CORS hardcodes `origin: "http://localhost:3000"` and defaults to port `3001`.
- If you change local ports or introduce env-based URLs, update both sides together.

## Verification Notes
- On a fresh checkout, build commands fail until dependencies are installed in each package; this repo currently has no `node_modules/` checked in.
