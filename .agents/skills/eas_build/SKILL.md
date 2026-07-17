---
name: eas_build
description: Generate production Android (.aab) and iOS (.ipa) builds and prepare them for store submission.
---
# Skill: EAS Build & Store Submission

## Objective
Generate production Android (.aab) and iOS (.ipa) builds and prepare them for store submission.

## Rules of Engagement
- Use `eas-cli` for all build operations.
- iOS requires a valid Apple Developer account ($99/year) and App Store Connect setup.
- Android requires a Google Play Console account ($25 one-time) and upload key.

## Pre-Build Checklist
1. Verify `app.json` / `app.config.ts` has:
   - Correct `bundleIdentifier` (iOS) and `package` (Android)
   - Correct app version and build number (increment for each submission)
   - Splash screen and app icons configured
2. Verify `eas.json` has production profiles:
   {
     "production": {
       "android": { "buildType": "app-bundle" },
       "ios": { "distribution": "store" }
     }
   }
3. Ensure environment variables are set:
   - `EXPO_PUBLIC_RAZORPAY_KEY_ID` (live key)
   - `EXPO_PUBLIC_FIREBASE_CONFIG` (production config)

## Build Execution

### Android
eas build --platform android --profile production
- Wait for build to complete (EAS cloud builds ~10-15 min)
- Download the `.aab` file

### iOS
eas build --platform ios --profile production
- Wait for build to complete (~15-20 min)
- Download the `.ipa` file

### Submit to Stores

#### Google Play
eas submit --platform android --latest
- Or manually upload `.aab` to Google Play Console → Production → Create new release

#### Apple App Store
eas submit --platform ios --latest
- This uses Transporter to upload to App Store Connect
- Then configure App Store Connect: screenshots, description, privacy policy, etc.

## Post-Build Verification
1. Verify both builds appear in EAS dashboard with "Finished" status
2. Verify Google Play Console shows the new release in review queue
3. Verify App Store Connect shows the build under the app listing
4. Save build artifacts URLs to `production_artifacts/build_manifest.md`

## Self-Verification
- Confirm `app.json` version was incremented from previous build
- Confirm no test API keys are in the build: `grep -r "test" app.config.ts`
- Confirm splash screen and icons are production-ready (not Expo defaults)
