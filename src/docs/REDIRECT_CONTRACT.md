# Redirect Contract for Let's Travel Together

This document outlines the strict, non-negotiable rules for handling redirects within this application. Adhering to this contract is critical for maintaining a stable, predictable, and secure user experience.

## The Guiding Principle

**Redirects must be decided in exactly ONE place per user flow.** This prevents duplicate logic, race conditions, and makes the application easier to debug and maintain.

| Flow                         | Redirect Authority                | Explanation                                                                                                 |
| ---------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Authentication & Gating**  | **Server Component (Layout/Page)** | The top-level layout (`/traveler/layout.tsx`, etc.) is the *only* place that should gate access and redirect unauthenticated or unauthorized users. |
| **User-Driven Navigation**   | **Client Component (`Link`, `router.push`)** | Used only for standard UX flows, like "Go Back," "Continue," or navigating after a non-critical success message. Never for security. |
| **Terminal Server Actions**  | **Server Action (`redirect()`)**  | Used *only* for flows that end the user's current context, such as `logoutAction` or `deleteAccountAction`. |
| **Payment Success/Failure**  | **Client Component (reacts to state)** | The UI should react to the backend status (`paid`, `confirmed`) and show the correct view. The redirect happens *after* the backend confirms the state change. |

---

## 🔒 The Three Rules of Redirects

### Rule 1: Authentication Redirects ONLY Occur in Server Components

-   **ALLOWED**: The root layout of a protected route (e.g., `/app/admin/layout.tsx`) is the *only* component responsible for checking the user's session and role. If the user is invalid, it calls `redirect('/login')`.
-   **FORBIDDEN**: Redirects for auth gating must **NEVER** be placed in:
    -   `middleware.ts` (Middleware should be for simple routing, not session validation).
    -   Client-side hooks (`useUser`, etc.).
    -   Server Actions (except for `logout`).
    -   Shared utility files.

### Rule 2: Server Actions Redirect ONLY for Terminal Flows

A "terminal flow" is an action that makes the user's current page or context invalid.

-   **ALLOWED**:
    -   `logoutAction()` → `redirect('/login')`
    -   `deleteAccount()` → `redirect('/')`
-   **FORBIDDEN**:
    -   A `saveProfile()` server action should **NOT** redirect. It should `revalidatePath()` and let the client UI decide what to do next.
    -   Checking a user's role and redirecting them. This is the job of the Server Component Layout (Rule 1).

### Rule 3: Client-Side Redirects are for User Experience (UX), Not Security

-   **ALLOWED**:
    -   A "Cancel" button using `<Link href="/dashboard">`.
    -   A `router.push('/next-step')` call inside a multi-step form after a successful state update from the server.
-   **FORBIDDEN**:
    -   Checking `if (!user) { router.push('/login'); }` inside a client component to protect a page. This is the responsibility of the Server Component Layout (Rule 1) and creates a "flash" of content before redirecting.

By enforcing this contract, we ensure our application's navigation logic remains stable, secure, and easy to understand.
