# Kindling mobile

A focused Expo app for student sign-in, a short learner setup, subjects, and live tutoring.

## Run it

1. Install dependencies with `npm install`.
2. Create `mobile-app/.env` and point the app at your running Kindling API:

   ```env
   EXPO_PUBLIC_API_URL=http://192.168.1.20:8000
   ```

   Replace the address with the computer running Django. Use `http://10.0.2.2:8000` for an Android emulator, `http://127.0.0.1:8000` for an iOS simulator, and your computer's LAN address for a physical phone. The phone and computer need to be on the same network.

3. Start Expo with `npm start`, then open the app in Expo Go or a development build.

`EXPO_PUBLIC_GEMINI_MODEL` is optional. It defaults to `gemini-3.1-flash-lite`. Live lessons call the authenticated Kindling platform AI endpoint; set `PLATFORM_GEMINI_API_KEY` in `backend/.env`, restart Django, and use an account with an eligible plan.

## Google Play release

The production API defaults to `https://logical-useful-shad.ngrok-free.app`. To override it, set `EXPO_PUBLIC_API_URL` (or `EXPO_PUBLIC_URL`) in the EAS `production` environment to a public **HTTPS** URL for the Kindling API. `EXPO_PUBLIC_API_URL` takes precedence. `EXPO_PUBLIC_` values are embedded in the app bundle, so use this only for public configuration, never secrets. After changing the EAS value, create a new build so the address is embedded in the app.

The Play application ID (`android.package`) must be set in `app.json` to the exact package name created in Play Console before the first release. Package names are permanent Play app identities; do not use a placeholder. Android `versionCode` starts at `1`. The production EAS profile builds an Android App Bundle (`.aab`) for Play Console.

Before publishing, add a public privacy policy URL and a public account-deletion web page URL in Play Console. Account deletion is available inside Profile in the app; Play also asks for a web resource that explains how someone can request deletion after uninstalling. Publish those pages on your production website and use the same privacy and data-retention details in the Play Data safety form. Confirm the target audience, content rating, ads declaration, and Families requirements against the actual service and SDKs.

Auth tokens are stored using Expo SecureStore on iOS and Android. Web preview uses browser local storage and is intended for development only.
