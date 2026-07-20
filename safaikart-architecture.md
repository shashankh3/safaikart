# SafaiKart Architecture & API Contracts

## Overview
SafaiKart is a monolithic repository containing three core projects that share a unified Firebase backend:
- **Mobile App**: React Native (Expo) app for end-users to browse services, add to cart, and track orders.
- **Admin Console**: React (Vite) web app for administrators to manage operations, dispatch drivers, handle complaints, and view analytics.
- **Cloud Functions**: Firebase Cloud Functions handling secure backend operations like payment webhook processing, coupon validation, order status mutation, and sending driver notifications.

## Architecture Diagram
```mermaid
graph TD;
  UserApp[User Mobile App (React Native)] -->|Read/Write| Firestore[Firestore DB]
  AdminApp[Admin Console (Vite React)] -->|Read/Write| Firestore
  UserApp -->|Callable Functions| CloudFunctions[Firebase Functions]
  AdminApp -->|Callable Functions| CloudFunctions
  
  CloudFunctions -->|Webhook| Razorpay[Razorpay Payment Gateway]
  Razorpay -->|Callback| CloudFunctions
  
  CloudFunctions -->|Server-side Mutation| Firestore
```

## Feature-Sliced Design (FSD)
The React Native app follows a strict Feature-Sliced Design pattern:
- **app/**: Global setup, routing, navigation.
- **core/**: Shared providers, Firebase initialization, auth state.
- **shared/**: UI primitives, colors, theme, general utilities.
- **features/**: Grouped by business domain (cart, catalog, checkout, orders, payments, profile, auth).
  - Each feature has `application` (hooks), `domain` (models), `infrastructure` (repositories), `presentation` (screens, components).

> [!TIP]
> **Data Transfer Objects (DTOs) vs Domain Models**: In the RN codebase, data is fetched as DTOs (e.g. Firebase Timestamps) and converted using Zod/Converters into Domain Models before hitting the Presentation layer. Keep these layers distinct!

## Core API Contracts (Cloud Functions)

### 1. `createOrderDraft`
- **Request**: `{ addressId, pickupSlotId, couponCode, directItems, idempotencyKey }`
- **Behavior**: Validates stock, calculates final pricing securely, creates a Razorpay order, creates a Draft order document in Firestore.
- **Returns**: `{ orderId, razorpayOrderId, finalAmountMinor }`

### 2. `razorpayWebhook`
- **Request**: Signed webhook from Razorpay (`payment.captured` or `order.paid`).
- **Behavior**: Verifies `x-razorpay-signature`, marks order as `CONFIRMED` in Firestore, updates transaction logs.
- **Returns**: `200 OK`

### 3. `adminUpdateOrderStatus`
- **Request**: `{ orderId, status, payload? }`
- **Behavior**: Only executable by Admins (via Custom Claims or admin roles). Safely updates order status and logs the audit trail.
- **Returns**: `{ success: true }`

### 4. `checkServiceability`
- **Request**: `{ pincode }`
- **Behavior**: Verifies if the requested area is serviceable by comparing against the `zones` collection. Uses `shouldEnforceAppCheck` helper to bypass AppCheck locally.
- **Returns**: `{ serviceable: boolean, zoneId: string }`

## Database Rules (Firestore Security)
- **Users**: Can read/write their own profiles and orders.
- **Orders**: Immutable past the `PAYMENT_PENDING` state for users. Users cannot modify pricing or `paymentStatus`.
- **Admins**: Must have the `admin` custom claim to read/write global data and perform system updates.
- **Validation**: Strict schema validation within `.rules` to prevent malformed data (e.g., negative prices, excessively long issue subjects).
