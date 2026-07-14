# SafaiKart

SafaiKart is a premium laundry and dry-cleaning mobile application built with React Native (Expo) and Firebase. It offers seamless booking, real-time tracking, and secure payments via Razorpay.

## Prerequisites
- **Node.js** (v18+)
- **Java JDK 17+** (Required for Firebase Local Emulator)
- **Expo CLI** (`npm i -g expo-cli`)
- **Firebase CLI** (`npm i -g firebase-tools`)

## Local Setup
1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Set up environment variables. You will need a `.env` file at the project root with your Firebase and Razorpay keys (ensure this is never committed).
3. Start the Firebase Local Emulator Suite (requires Java):
   ```bash
   npx firebase emulators:start --only firestore
   ```
4. Start the Expo development server:
   ```bash
   npx expo start
   ```

## Running Tests
To run the Firestore security rules unit tests, ensure Java is installed and run:
```bash
npm run test:rules
```

## Firebase Project
Project ID: `safaikart-6c4e4`
Ensure you are logged into the correct Firebase account before deploying any functions or rules.
