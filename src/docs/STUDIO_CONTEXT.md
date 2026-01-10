# Project Context: Let's Travel Together

## 1. Project Concept & Scope

**Let's Travel Together** is a web application designed to make travel more accessible for people with disabilities. The core of the platform is to connect two user types:

*   **Travelers**: Users with disabilities who are looking for assistance during their travels.
*   **Guides**: Vetted and trained individuals who can provide assistance to travelers.

The platform facilitates the creation of detailed travel requests by travelers, which guides can then view and accept. It prioritizes safety, accessibility, and clear communication.

## 2. Current Status: Successfully Implemented Features

We have successfully built out the foundational features of the application:

*   **Dual-Role Authentication & Verification**:
    *   Secure signup and login flows for both Traveler and Guide roles using Firebase Authentication (Email/Password).
    *   A robust **email verification** system is in place. Users cannot log in until they have verified their email address, with UI prompts to resend the verification link if needed.
*   **Role-Based Access Control & Home Page Redirect**:
    *   The application correctly redirects logged-in users from the public home page (`/`) to their respective dashboards on every visit.
    *   Server-side middleware and protected layouts ensure users can only access their designated dashboards (`/traveler/*`, `/guide/*`, or `/admin/*`).
*   **Comprehensive Admin Dashboard**:
    *   An admin panel (`/admin/*`) is accessible only to users with an `isAdmin` flag, which is verified on the server.
    *   **User Management**: Admins can view lists of all guides and travelers, see their profile completion progress, and access detailed profile views.
    *   **Guide Verification**: Admins can approve, reject, deactivate, or re-activate guides directly from the user list. Guides pending verification are highlighted.
    *   **Data Management**: Admins have the ability to delete guide or traveler accounts, selectively delete a traveler's personal information, or delete individual travel requests.
*   **Traveler Onboarding & Profile**: A multi-step settings area for Travelers to complete their profile, including:
    *   Basic personal information (name, gender, photo).
    *   Address and Contact details.
    *   A detailed and accessible **Disability Disclosure** form, which uses sliders for percentage input and is designed for screen reader usability. A profile must be complete before a travel request can be created.
*   **Guide Onboarding & Profile**: A comprehensive 5-step profile completion process for Guides, which is critical for their verification:
    1.  **Profile Information**: Basic details and a required profile photo.
    2.  **Address Details**: Primary operating address with document proof upload.
    3.  **Contact Details**: Phone and WhatsApp numbers.
    4.  **Disability Expertise**: A detailed form on their experience (including scribe subjects), language skills, and willingness to assist.
    5.  **Verification**: Uploading of government ID and qualification documents, which moves their profile to a `verification-pending` state for admin review.
*   **Travel Request Flow for Travelers**: A 5-step process for creating a detailed travel request:
    1.  **Service & Location**: Purpose of the trip (Education, Hospital, Shopping) with conditional sub-fields.
    2.  **Date & Duration**: Selecting the date and time for the service.
    3.  **Travel Medium**: How the traveler is arriving (bus, train, etc.).
    4.  **Meeting Point**: Where to meet the guide.
    5.  **Review & Submit**: A final summary where the request is submitted, its status changed to `pending`, and cost is calculated.
*   **Guide Matching & Selection**: After submitting a request, travelers are shown a list of guides filtered by location, gender, and expertise. They can select a guide to notify them. If no perfect match is found, the request is submitted to a wider pool.
*   **Bookings Page, Payment & Trip PIN**:
    *   Travelers can view the status of their in-progress and upcoming bookings on the "My Bookings" page.
    *   **Live Razorpay Integration**: When a guide confirms a booking, a "Pay Now" button appears. Upon successful payment, a server-side webhook securely updates the request's status to `paid` and generates a random **4-digit Trip PIN**.
    *   The Trip PIN is displayed to the traveler and sent via email, to be shared with the guide at the start of the service for verification.
*   **Notifications (Push & Email)**:
    *   Firebase Cloud Functions (`functions/src/index.ts`) trigger on travel request status changes.
    *   **Push Notifications**: Sent to guides for new requests and to travelers for confirmations or rejections.
    *   **Email Notifications**: Integrated with SendGrid to send emails for key events (guide selected, request confirmed, payment successful).
*   **PWA & Client-Side Notifications**: The application is configured as a Progressive Web App (PWA) and includes a UI for users to enable browser push notifications to receive alerts in real-time.

## 3. Project Structure Overview

The application follows the Next.js App Router paradigm.

*   `src/app/(auth)`: Contains login, signup, and forgot password pages.
*   `src/app/(traveler|guide|admin)`: Protected route groups for each user role. Each contains a `dashboard`, `profile/settings` area, and role-specific pages.
*   `src/app/traveler/request/[requestId]`: A dynamic route for creating/viewing travel requests. It creates a new draft document if the ID is 'create'.
*   `src/components`: Reusable React components, including ShadCN UI components and a global `Footer`.
*   `src/lib`: Contains shared logic:
    *   `actions.ts`: Server Actions for auth, admin functions, and travel request submissions.
    *   `auth.ts`: Server-side `getUser()` helper to verify session cookies and retrieve user data, including `isAdmin` status.
    *   `definitions.ts`: Central TypeScript type definitions (`User`, `TravelRequest`).
    *   `firebase-admin.ts`: Server-side Firebase Admin SDK initialization.
    *   `schemas/travel-request.ts`: Zod schemas for validating the multi-step travel request form.
*   `src/firebase`: Client-side Firebase setup, including the core provider (`provider.tsx`), hooks (`use-doc`, `use-collection`, `useUser`), and error handling.
*   `src/middleware.ts`: Lightweight middleware that only handles redirects for logged-in/logged-out states.
*   `src/api/payment-verification/route.ts`: A secure server-side webhook endpoint to handle payment confirmations from Razorpay.
*   `functions/src/index.ts`: Firebase Cloud Functions for sending email and push notifications.
*   `docs/backend.json`: The authoritative blueprint for our Firestore data structure and entities.
*   `firestore.rules` & `storage.rules`: Security rules for our backend services.

## 4. Strict Validation & Criteria (Key Directives)

*   **Server/Client Code Separation**: **DO NOT** import files using server-only code (like the Firebase Admin SDK) into client components. Middleware must remain lightweight and not import server-heavy logic like `auth.ts`.
*   **Semantic HTML & Accessibility**: Forms must be fully accessible (`aria-*` attributes, linked labels). No invalid nesting of HTML tags (e.g., `<h1>` inside `<h3>`). A page must not have more than one `contentinfo` landmark.
*   **Zod for Validation**: All forms MUST use Zod for schema-based validation on both the client and server.
*   **Non-blocking Firebase Operations**: Client-side data mutations (`setDoc`, `updateDoc`, etc.) must be non-blocking. They should use `.catch()` blocks to handle errors and emit a `FirestorePermissionError` for the global error listener, rather than being `await`ed directly in the UI.
*   **Infinite Loop Prevention**: When using `useCollection` or `useDoc` with a query or reference that depends on component props/state, the reference **MUST** be memoized with `useMemoFirebase` to prevent infinite re-render loops.
*   **State Management**: Use React Hooks (`useState`, `useEffect`). For cross-component state, rely on the provided Firebase hooks (`useDoc`, `useCollection`, `useUser`). Avoid introducing new state management libraries.
*   **User-Friendly UX**: Replace generic browser functionality with clear, intentional UI. Input fields should be intuitive (e.g., using sliders for stepped numeric input). Ensure proper loading states (skeletons) and handle null/undefined data to prevent partial page renders.