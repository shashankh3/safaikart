---
name: fcm_apns
description: Configure FCM and APNs Push Notifications for Android and iOS.
---
# Skill: Configure FCM and APNs Push Notifications

## Objective
Set up production push notifications for both Android (FCM) and iOS (APNs).

## Rules of Engagement
- Android FCM config must be in `google-services.json` (already present).
- iOS APNs requires a `.p8` key from Apple Developer Console.
- Never commit `.p8` files to version control.

## Instructions

### Android (FCM)
1. Verify `google-services.json` has the correct `project_info.project_number` (FCM sender ID).
2. Check that `app.json` (Expo config) has:
   "android": {
     "googleServicesFile": "./google-services.json",
     "useNextNotificationsApi": true
   }
3. Verify the FCM token registration code runs on app launch and saves to `users/{uid}.fcmToken`.
4. Test by sending a notification via Firebase Console → Cloud Messaging → "Send test message".

### iOS (APNs)
1. Guide the user through Apple Developer Console:
   - Certificates, Identifiers & Profiles → Keys → Create new key
   - Enable "Apple Push Notifications service (APNs)"
   - Download the `.p8` file and note the Key ID and Team ID
2. Upload to Firebase Console:
   - Project Settings → Cloud Messaging → iOS
   - Upload APNs Auth Key (.p8)
   - Enter Key ID and Team ID
3. Verify Expo config has APNs enabled:
   "ios": {
     "useITunesArtwork": true,
     "supportsTablet": true
   }
4. Update `app.json` with `expo-notifications` plugin if not present:
   "plugins": ["expo-notifications"]

### Verification
1. Build a development iOS app with push capability.
2. Trigger the `sendOrderStatusNotification` Cloud Function manually.
3. Verify notification arrives on both Android and iOS test devices.

## Output
- Save config checklist to `production_artifacts/fcm_apns_setup.md`
- Include the test notification message ID from Firebase Console
