# FCM & APNs Setup Checklist

## ✅ Android (FCM)
- [x] Verified `google-services.json` is present with valid Project Number (`1050255060517`)
- [x] Configured `useNextNotificationsApi: true` in `app.json`
- [x] Verified FCM permissions (`POST_NOTIFICATIONS`) in `app.json`
- [x] Verified `expo-notifications` plugin is installed

## 🔄 iOS (APNs) - Action Required
To complete iOS push notifications, follow these manual steps in your Apple Developer Console:

1. **Create APNs Key**
   - Go to [Apple Developer Console](https://developer.apple.com/account)
   - Navigate to **Certificates, Identifiers & Profiles** -> **Keys**
   - Click the **+** button to create a new key
   - Name it "SafaiKart APNs Key"
   - Enable **Apple Push Notifications service (APNs)**
   - Click Continue and Register

2. **Download and Note Keys**
   - Download the `.p8` file (⚠️ **Keep this secure, never commit to GitHub**)
   - Note down the **Key ID**
   - Note down your Apple **Team ID** (found in the top right corner under your name)

3. **Upload to Firebase**
   - Go to [Firebase Console](https://console.firebase.google.com/project/safaikart-6c4e4/settings/cloudmessaging)
   - Go to Project Settings -> Cloud Messaging -> Apple App Configuration
   - Under APNs Auth Key, click **Upload**
   - Upload the `.p8` file and enter the Key ID and Team ID

4. **Upload to Expo (Optional but recommended)**
   - Run `eas credentials` in the terminal
   - Select iOS -> production -> Push Notifications
   - Upload the `.p8` file there as well for Expo's notification service

Once complete, both Android and iOS will be fully ready to receive production push notifications via FCM and APNs.
