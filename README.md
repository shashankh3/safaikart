# 🧺 SafaiKart — Premium Laundry & Dry-Cleaning Platform

[![CI Pipeline](https://github.com/shashankh3/safaikart/actions/workflows/ci.yml/badge.svg)](https://github.com/shashankh3/safaikart/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-v12.16%2B-orange.svg)](https://firebase.google.com/)

**SafaiKart** is an end-to-end, multi-channel laundry and dry-cleaning service platform featuring a mobile application (iOS/Android), a web customer & admin platform, and a hardened serverless Firebase backend.

---

## 🏛️ System Architecture

SafaiKart is structured as a monorepo containing three core subsystems:

```
safaikart/
├── src/                  # Mobile Application (React Native / Expo)
├── safaikart-website/    # Web Platform (TanStack Start / Vite / React 19)
├── functions/            # Backend Cloud Functions (Firebase v2 / Node.js 20)
└── tests/                # Unit & Firestore Security Rules Tests
```

### Subsystems Breakdown

1. **Mobile Application (`src/`)**:
   - Built with **Expo (React Native 0.85)**, **Tamagui**, and **React Navigation**.
   - Integrates **Firebase App Check** (`PlayIntegrity` on Android, `AppAttest` on iOS) for client identity verification.
   - Real-time cart state management and Razorpay SDK integration.

2. **Web Platform (`safaikart-website/`)**:
   - Built with **TanStack Start / React Router**, **React 19**, **Vite**, and **TailwindCSS**.
   - Serves as the web ordering portal and administrative management console (Order Queue, Route Sheets, SLA Breach Tracking, Zone Management).

3. **Backend Services (`functions/`)**:
   - Built with **Firebase Cloud Functions v2** (TypeScript, Node.js 20).
   - Atomic Firestore transactions for order drafting, pickup slot capacity locking, and Razorpay webhook processing.
   - Enforces App Check and per-user endpoint rate limiting.

---

## 🛡️ Security & Hardening Features

SafaiKart implements multi-layered security controls across API and database layers:

- **Firebase App Check**: Hardened on all Cloud Function callables (`createOrderDraft`, `createPaymentOrder`, `validateCoupon`, `verifyPaymentStatus`) to block unauthorized non-app clients.
- **Endpoint Rate Limiting**: Per-user sliding-window rate limiting on critical transactional endpoints (`createOrderDraft`, `createPaymentOrder`).
- **Atomic Slot & Coupon Operations**: Concurrency protection for pickup slot booking and uppercase coupon code validation.
- **Idempotency Locks**: Client-side idempotency keys and server-side payment verification to prevent double-submit and duplicate payment issues.
- **Strict Firestore Security Rules**: Granular user, admin, and server-side write permissions.

---

## 🚀 Prerequisites

- **Node.js** (v20+)
- **Java JDK 17+** (Required for Firebase Local Emulator Suite)
- **Firebase CLI** (`npm i -g firebase-tools`)
- **Expo CLI** (`npm i -g expo-cli`)

---

## 🛠️ Local Development & Setup

### 1. Repository Setup

```bash
git clone https://github.com/shashankh3/safaikart.git
cd safaikart
npm install
```

### 2. Mobile App (Expo)

```bash
# Start Metro bundler
npm start

# Run on Android emulator / connected device
npm run android
```

### 3. Web Platform

```bash
# Start website development server
npm run dev:website

# Build production bundle
npm run build:website
```

### 4. Cloud Functions

```bash
cd functions
npm install
npm run build
```

### 5. Running Local Emulators

```bash
# Start Firestore Emulator (requires Java 17+)
npx firebase emulators:start --only firestore
```

---

## 🧪 Testing

SafaiKart includes unit tests for core pricing/discount logic and security rules validation.

```bash
# Run unit tests
npm test

# Run Firestore Security Rules test suite (uses Firebase emulator)
npm run test:rules
```

---

## 🔄 CI/CD Automation

Automated workflows are managed via GitHub Actions:

- **CI Pipeline (`.github/workflows/ci.yml`)**: Automatically triggers on `push` / `pull_request` to `master`. Runs TypeScript typechecks, unit tests, and Firestore rules emulator tests.
- **Deploy Pipeline (`.github/workflows/deploy.yml`)**: Automates Cloud Functions deployment upon successful validation.

---

## 📝 License

Distributed under the [MIT License](LICENSE).
