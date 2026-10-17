# Mobile apps (Capacitor iOS + Android)

The iOS and Android apps wrap the same web build (`dist/`) in native shells (`ios/`, `android/`).

## How the apps differ from the website

| | Website | Apps |
|---|---|---|
| Page origin | `https://www.road2cissp.com` | `capacitor://localhost` (iOS), `https://localhost` (Android) |
| API | `https://api.road2cissp.com/api` | same, set at build time with `VITE_API_BASE_URL` |
| Sign-in | OAuth redirect, `rtc_session` cookie | OAuth in the **system browser**, deep link back, `Authorization: Bearer` token |
| Lab guest id | `rtc_guest` cookie | `X-RTC-Guest` header |

The backend always allows the two app origins in CORS (`NATIVE_APP_ORIGINS`, `backend/main.py`).

### Native sign-in (`backend/auth/native.py`, `src/lib/native.js`)

1. The app makes a random PKCE verifier and opens
   `/api/auth/{google|github}/login?client=native&code_challenge=…` in the system browser
   (Google blocks OAuth inside embedded WebViews).
2. After the normal OAuth callback the API redirects to
   `com.road2cissp.app://auth/callback?code=…`: a one-time code, valid 60 s.
3. The app posts `{code, code_verifier}` to `/api/auth/native/exchange` and gets a session token,
   which is sent as `Authorization: Bearer`. An app that intercepts the deep link can't use the code
   without the verifier.

The Google/GitHub OAuth apps need **no changes**: the provider still returns to the API's callback.
The deep link is registered in `AndroidManifest.xml` (intent filter) and `Info.plist`
(`CFBundleURLTypes`).

## Building

CI (`.github/workflows/mobile.yml`) runs on changes to native files, or from the Actions tab:

- **iOS**: unsigned Simulator build, launched on a simulated iPhone, with a screenshot artifact.
- **Android**: debug APK (sideload) plus an upload-key signed `.aab` for Google Play.
- **TestFlight**: tick "testflight" when running the workflow by hand (needs the Apple secrets below).

Phone-size layout checks run on every push (`ci.yml`, `npm run mobile-check`) in Chromium (Android)
and WebKit (iOS).

### Local Android build (Windows)

The `&` in the project path breaks `gradlew.bat` and npm, so build from the junction
`D:\Android\it_fund` (points at this repo):

```powershell
$env:JAVA_HOME = 'C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot'
$env:ANDROID_HOME = 'D:\Android\Sdk'; $env:GRADLE_USER_HOME = 'D:\Android\gradle-home'
$env:VITE_API_BASE_URL = 'https://api.road2cissp.com/api'
cd D:\Android\it_fund
node node_modules/vite/bin/vite.js build
node node_modules/@capacitor/cli/bin/capacitor sync android
cd android; .\gradlew.bat assembleDebug     # or bundleRelease with the signing env below
```

`android/local.properties` must use forward slashes: `sdk.dir=D:/Android/Sdk`.

### Icons and splash

Generated from `assets/icon-1024.png` by `python scripts/gen_native_assets.py` (needs Pillow).
The iOS icon must stay opaque (App Store Connect rejects transparency); the Android adaptive icon
foreground is the chip alone inside the safe zone, over `#0B1020`.

## Store setup

### Google Play

- The **upload key** lives at `D:\Android\keys\road2cissp-upload.jks` (password in
  `UPLOAD_KEY_README.txt` next to it). **Back both up to a password manager.**
- It is also stored as repo secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`,
  `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`; local release builds read the same names as env
  vars (`ANDROID_KEYSTORE_PATH` instead of the base64).
- In Play Console: create the app (`com.road2cissp.app`), enable Play App Signing, and upload the
  `android-play-bundle` artifact to an internal testing track.

### Apple / TestFlight

Needs an Apple Developer Program membership. Then add these repo secrets:

| Secret | Where |
|---|---|
| `APPLE_TEAM_ID` | developer.apple.com, Membership details |
| `ASC_KEY_ID`, `ASC_ISSUER_ID` | App Store Connect, Users and Access, Integrations, App Store Connect API (role: App Manager) |
| `ASC_KEY_P8_BASE64` | the downloaded `.p8`, base64-encoded |

Create the app record in App Store Connect with bundle id `com.road2cissp.app`, then run the
workflow with "testflight" ticked. Signing is automatic via the API key.

**App Store review:** guideline 3.1.1 restricts selling digital subscriptions inside iOS apps
without Apple's in-app purchase. The Pricing page and Stripe checkout are shown in the app today;
decide how to handle that before submitting for review.
