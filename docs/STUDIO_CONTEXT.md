# Project Context: Let's Travel Together

## 1. Project Concept & Scope

**Let's Travel Together** is a web application designed to make travel more accessible for people with disabilities. The core of the platform is to connect two user types:

*   **Travelers**: Users with disabilities who are looking for assistance during their travels.
*   **Guides**: Vetted and trained individuals who can provide assistance to travelers.

The platform facilitates the creation of detailed travel requests by travelers, which guides can then view and accept. It prioritizes safety, accessibility, and clear communication.

## 2. Current Status: Successfully Implemented Features

We have successfully built out the foundational features of the application:

*   **Dual-Role Authentication**: Secure signup and login flows for both Traveler and Guide roles using Firebase Authentication (Email/Password).
*   **Role-Based Access Control**: The app uses server-side middleware and protected layouts to ensure users can only access their respective dashboards (`/traveler/*` or `/guide/*`).
*   **Traveler Onboarding & Profile**: A multi-step settings area for Travelers to complete their profile, including:
    *   Basic personal information (name, gender, photo).
    *   Address and Contact details.
    *   A detailed and accessible **Disability Disclosure** form, which uses sliders for percentage input and is designed for screen reader usability.
*   **Guide Onboarding & Profile**: A comprehensive 5-step profile completion process for Guides, which is critical for their verification:
    1.  **Profile Information**: Basic details and a required profile photo.
    2.  **Address Details**: Primary operating address with document proof upload.
    3.  **Contact Details**: Phone and WhatsApp numbers.
    4.  **Disability Expertise**: A detailed form on their experience, language skills, and willingness to assist.
    5.  **Verification**: Uploading of government ID and qualification documents, which moves their profile to a `verification-pending` state.
*   **Travel Request Flow for Travelers**: A 5-step process for creating a detailed travel request:
    1.  **Service & Location**: Purpose of the trip (Education, Hospital, Shopping) with conditional sub-fields.
    2.  **Date & Duration**: Selecting the date and time for the service.
    3.  **Travel Medium**: How the traveler is arriving (bus, train, etc.).
    4.  **Meeting Point**: Where to meet the guide.
    5.  **Review & Submit**: A final summary where the request is submitted, its status changed to `pending`, and cost is calculated.
*   **Traveler "My Requests" Page**: A dashboard for travelers to view their requests, separated into "Drafts" and "Upcoming" tabs, with options to continue editing or delete drafts.
*   **UI & Styling**: The frontend is built with Next.js, React, ShadCN UI components, and Tailwind CSS. The UI is clean, modern, and focus has been placed on fixing semantic HTML issues to prevent hydration errors.
*   **Global Accessible Footer**: A reusable footer component has been implemented across the entire application. It features two distinct parts for accessibility:
    *   A navigation section for sitewide links (About, Blogs, Contact, Privacy, etc.) wrapped in a `div` with a `role="group"`.
    *   A separate `<footer>` element containing only the copyright notice, ensuring it serves as the unique `contentinfo` landmark for each page.

## 3. Project Structure Overview

The application follows the Next.js App Router paradigm.

*   `src/app/(auth)`: Contains login and signup pages.
*   `src/app/(traveler|guide)`: These are the protected route groups for each user role. Each contains a `dashboard`, `profile/settings` area, and role-specific pages.
*   `src/app/traveler/request/[requestId]`: A dynamic route that handles the creation and viewing of travel requests. It uses client-side logic to create a new draft document in Firestore if the ID is 'new'.
*   `src/components`: Reusable React components, including a large set of UI components from ShadCN in `src/components/ui` and the new global `Footer`.
*   `src/lib`: Contains shared logic:
    *   `actions.ts`: Server Actions for `login`, `signup`, `logout`, and `submitTravelRequest`.
    *   `auth.ts`: Server-side helper `getUser()` to verify session cookies and retrieve user data.
    *   `definitions.ts`: Central TypeScript type definitions (`User`, `TravelRequest`).
    *   `firebase-admin.ts`: Server-side Firebase Admin SDK initialization.
    *   `schemas/travel-request.ts`: Zod schemas for validating the multi-step travel request form.
*   `src/firebase`: Client-side Firebase setup, including the core provider (`provider.tsx`), hooks (`use-doc`, `use-collection`, `use-user`), and error handling infrastructure.
*   `docs/backend.json`: The authoritative blueprint for our Firestore data structure and entities. This MUST be kept in sync with application logic.
*   `firestore.rules` & `storage.rules`: Security rules for our backend services.

## 4. Strict Validation & Criteria (Key Directives)

*   **Semantic HTML**: **NO NESTING of heading tags (e.g., `<h1>` inside `<h3>`)**. Use the `as` prop on components like `CardTitle` to change the rendered tag to prevent hydration errors. A page must not have more than one `contentinfo` landmark. This has been a recurring issue and must be avoided.
*   **Accessibility First**: Forms must be fully accessible.
    *   Use `aria-required`, `aria-invalid`, and `aria-describedby` where appropriate.
    *   Ensure all form controls are properly linked to their labels (`htmlFor` and `id`).
    *   Sliders and other complex inputs must have clear `aria-label` attributes for screen readers.
    *   Ensure logical tab order for keyboard navigation.
*   **Zod for Validation**: All forms MUST use Zod for schema-based validation on both the client and server. Error messages should be user-friendly. For example, a minimum disability percentage of 40% is enforced with a clear message.
*   **Non-blocking Firebase Operations**: For UI responsiveness, client-side data mutations (`setDoc`, `updateDoc`, etc.) should be non-blocking. They should not be `await`ed directly in the UI; instead, use `.catch()` blocks to handle errors, emitting a `FirestorePermissionError` for the global error listener.
*   **State Management**: Use React Hooks (`useState`, `useEffect`). For cross-component state, rely on the provided Firebase hooks (`useDoc`, `useCollection`, `useUser`). Avoid introducing new state management libraries.
*   **User-Friendly UX**: Replace generic browser functionality with clear, intentional UI. For example, use a "Back to Dashboard" button instead of relying on the browser's back action. Input fields should be intuitive (e.g., using sliders for stepped numeric input instead of number inputs with spinners).

## 5. Backend Logic Summary

*   **Authentication**: Managed by Firebase. A session cookie (`session`) is set via a Server Action (`login`) containing the user's role as a custom claim. This is the source of truth for the user's role during a session.
*   **Firestore Database**: The structure is strictly defined in `docs/backend.json`.
    *   `/users/{userId}`: Stores all user data, including their assigned `role`.
    *   `/users/{userId}/guideProfile/{guideProfileId}`: A subcollection containing detailed profile information ONLY for users with the 'Guide' role.
    *   `/travelRequests/{requestId}`: Stores all travel requests created by travelers. Security rules ensure a user can only access their own requests.
*   **Firebase Storage**: Used for file uploads (profile photos, verification documents). Access is restricted by security rules in `storage.rules`.
*   **Server Actions**: Used for all authentication-related mutations and for submitting the final travel request. This keeps sensitive logic on the server.
