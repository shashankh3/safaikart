# SafaiKart - Laundry & Dry-Cleaning App

A production-grade Android-first laundry, pickup, delivery, and cart application built with React Native and Expo (SDK 56). The backend is powered by Firebase (Firestore, Cloud Functions, Authentication, Cloud Messaging) with UPI-first payments via Razorpay.

## Architecture Overview

SafaiKart is built using a hybrid of **Feature-Sliced Design (FSD)** and **Clean Architecture**. This ensures the codebase is highly scalable, modular, and extremely organized.

### Root Directory Structure

- `src/app/` — Application-wide configuration. Contains global providers, navigation setup (`RootNavigator.tsx`), and core Firebase initialization.
- `src/core/` — Core infrastructure that spans across multiple features (e.g., Push Notifications logic, Firebase App Check).
- `src/features/` — Domain-specific feature slices. Each feature operates as its own isolated module.
- `src/shared/` — Highly reusable UI components (`Stacks`, `AnimatedPressable`), design tokens (`colors.ts`, `spacing.ts`), and global utility functions.
- `functions/` — Backend Firebase Cloud Functions.

### Feature-Sliced Clean Architecture

Inside each feature (e.g., `src/features/orders`), the code is further divided by its architectural concern:

1. **`domain/`**: The core business logic. Contains TypeScript interfaces, models, and Enums (e.g., `Order.ts`, `OrderStatus.ts`). It has zero dependencies on UI or external frameworks.
2. **`infrastructure/`**: Responsible for external communication. Contains Repositories (e.g., `OrdersRepository.ts`) that talk to Firestore or APIs.
3. **`application/`**: Use cases and hooks that orchestrate the flow of data between the UI and Infrastructure (e.g., `getOrders.usecase.ts`).
4. **`presentation/`**: The UI layer. Contains Screens, UI components, and styles specific to this feature.

### Active Features
- **`auth`**: Phone authentication and user onboarding.
- **`catalog`**: Displaying laundry services, pricing, and details.
- **`cart`**: Local and remote cart state management.
- **`checkout`**: Address selection, pickup slot booking, and coupon validation.
- **`payments`**: Razorpay UPI-first checkout and backend webhook verification.
- **`orders`**: Order history and real-time vertical timeline tracking.
- **`profile`**: User settings and management.

## Backend Architecture

The backend operates on **Firebase**. We strictly adhere to a **Zero-Trust Client Model**:
- **Firestore Rules**: Clients can only read their own data. They are expressly forbidden from writing to critical collections like `orders`, `payments`, and `services`.
- **Cloud Functions**: All state mutations (creating orders, verifying payments, canceling orders) happen exclusively through Cloud Functions.
- **App Check**: All API calls are validated using Firebase App Check and ReCaptcha Enterprise to prevent abuse.
- **Notifications**: Trigger-based Cloud Functions automatically push FCM alerts to the user when order status changes.

## Commands

- `npm start` - Starts the Expo development server.
- `npx tsc --noEmit` - Runs strict TypeScript type checking.
- `firebase deploy --only functions` - Deploys the backend logic.
- `eas build --profile production` - Builds the Android App Bundle for the Google Play Store.
