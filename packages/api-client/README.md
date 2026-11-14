# API client

The contracts of the FastAPI backend as TypeScript types, and a small `fetch` wrapper. Shared by `apps/mobile` and `apps/web`, which import it as `@mooncare/api` (a Vite alias and a TypeScript path in each app). No build step: the apps compile it with their own code.

- Every call goes to `/api/...` on the same origin, with the session cookie. In development each app's Vite server proxies `/api` to its backend.
- `ApiError` means the server answered with an error (`status` 401: not signed in; 403: not allowed; 429: too many wrong PINs). `NetworkError` means the request never reached the server.

When a contract changes in the backend, change `src/types.ts` in the same commit.
