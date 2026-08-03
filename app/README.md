# Leo Agent Platform Web

This directory contains the administration console for Leo Agent Platform. It uses Next.js 16 App Router, React 19, and strict TypeScript. The browser communicates only with a same-origin Next.js BFF, while the FastAPI JWT remains in a server-managed HttpOnly cookie.

See the repository [README](../README.md) for full-stack setup, the [Project Specification](../docs/PROJECT_SPEC.md) for product constraints, and the [OpenAPI snapshot](../docs/openai.json) for backend contracts.

## Implemented Features

- Image CAPTCHA login, logout, and expired-session handling
- Protected dashboard layout, responsive navigation, and dark mode
- User pagination, search, creation, and role assignment
- Role pagination, search, CRUD, and permission assignment
- Permission pagination, search, and CRUD
- Provider CRUD, encrypted API-key input, status display, and connection testing
- Model CRUD, provider filtering, capabilities, pricing, and status management
- Prompt CRUD, variable definitions, publishing, version history, and rollback
- Tool CRUD, Function Calling configuration, state transitions, and live tests
- Agent aggregate configuration, publish/version/rollback workflows, lifecycle control, and live invocation
- Dashboard statistics and current-user role and permission summaries
- Zod validation for external responses and form payloads
- TanStack Query caching, invalidation, and server hydration
- Route protection and an explicit BFF method/path allowlist
- Contract and component tests with Vitest and Testing Library

## Technology Boundaries

| Technology | Responsibility |
| --- | --- |
| Next.js 16 App Router | Routing, Server Components, Route Handlers, and proxy checks |
| React 19 and TypeScript | UI components and static types |
| shadcn/ui and Tailwind CSS 4 | Accessible components and styling |
| TanStack Query 5 | Server state, caching, mutations, and invalidation |
| Zustand 5 | Client-only UI state such as sidebar preferences |
| React Hook Form and Zod 4 | Form state and runtime validation |
| Vitest and Testing Library | Contract, component, and interaction tests |

Remote data must use TanStack Query. Zustand must not store users, access tokens, or API result collections. Server Components may call FastAPI through server-only utilities; browser requests must use the fixed `/api/backend/*` BFF allowlist.

## Local Development

Start FastAPI from the repository root and confirm that `http://127.0.0.1:8000/health` succeeds. Then run:

```bash
cd app
cp .env.example .env.local
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

The default backend is `http://127.0.0.1:8000`. Override it in `.env.local` when required:

```dotenv
BACKEND_API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_APP_NAME=Leo Agent Platform
```

`BACKEND_API_URL` is server-only and must not use the `NEXT_PUBLIC_` prefix.

## Commands

```bash
pnpm dev        # Start the development server
pnpm lint       # Run ESLint with zero warnings allowed
pnpm typecheck  # Run strict TypeScript checks
pnpm test       # Run Vitest once
pnpm check      # Run lint, typecheck, and tests
pnpm build      # Create a production build
pnpm start      # Start the production build
```

## Source Layout

```text
src/
├── app/
│   ├── (dashboard)/            # Protected pages and server layout
│   ├── api/auth/               # Login and logout BFF handlers
│   └── api/backend/[...path]/  # Allowlisted backend proxy
├── components/
│   ├── common/                 # Headers, search, pagination, and data states
│   ├── layout/                 # Dashboard shell and navigation
│   └── ui/                     # shadcn/ui components
├── features/
│   ├── auth/
│   ├── agents/
│   ├── dashboard/
│   ├── knowledge-bases/
│   ├── models/
│   ├── permissions/
│   ├── prompts/
│   ├── providers/
│   ├── roles/
│   ├── tools/
│   └── users/
├── lib/
│   ├── api/                    # API clients, endpoint constants, and Zod schemas
│   ├── auth/                   # Cookie session conventions
│   └── query-client.ts         # TanStack Query configuration
├── providers/                  # Query, theme, and Zustand providers
├── stores/                     # Client-only Zustand stores
└── proxy.ts                    # Lightweight cookie-presence check
```

## Session and BFF Flow

1. `/api/auth/login` validates the browser payload and calls FastAPI.
2. Next.js extracts the returned JWT and writes the `leo_access_token` HttpOnly cookie.
3. Client Components call same-origin BFF endpoints and never read the token.
4. The BFF accepts only known method/path combinations and adds the Bearer token.
5. `/api/auth/logout` calls the backend and always clears the local cookie.

Some backend business errors currently use HTTP 200 with a non-200 `code` in the response body. The BFF maps these responses to appropriate HTTP 4xx/5xx statuses, and the frontend exposes them consistently as `ApiError`.

## Adding a Backend Endpoint

1. Update `docs/openai.json`.
2. Add the Zod contract and inferred TypeScript types in `src/lib/api/schemas.ts`.
3. Add the exact method/path combination to `src/app/api/backend/[...path]/route.ts`.
4. Add request functions under the appropriate `src/features/*/api.ts`.
5. Add query keys, cache invalidation, UI states, and tests.

Never create an unrestricted proxy that accepts an arbitrary target URL, and never expose the JWT to a Client Component.
