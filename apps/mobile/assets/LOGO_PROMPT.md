# Stride app icon

Use a single file: **`icon.png`** (1024×1024 PNG).

It is used for:
- iOS / Android launcher icon (`app.json` → `icon`)
- Android adaptive icon foreground
- Splash screen
- In-app logo (`StrideLogo` on login, landing, splash, account)

Replace `apps/mobile/assets/icon.png`, then:
- **In-app logo:** restart Metro (`npm run start:dev`)
- **Launcher / splash:** new dev build (`eas build --profile development --platform android`)

## GPT prompt

```
Design a modern app icon for "Stride", a tele-physiotherapy and home rehabilitation app.

Square 1024x1024 PNG, flat vector-style, symbol only (no text).
Abstract forward motion / recovery path — gentle stride arc or forward chevrons.
Primary #2563EB blue, optional teal #0D9488, white rounded-square background.
Must read clearly at 48px on Android home screen. No stethoscope, no crosses.
```
