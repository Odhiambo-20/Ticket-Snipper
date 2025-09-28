# Welcome to Your Ticket Snipper App

## Project Info

This is a native cross-platform mobile app.

**Platform**: Native iOS & Android app, exportable to web  
**Framework**: Expo Router + React Native

### Use Your Preferred Code Editor

If you want to work locally using your own code editor, you can clone this repo and push changes. Pushed changes will be reflected in your project environment.

If you are new to coding and unsure which editor to use, we recommend Cursor. The only requirement is having Node.js & Bun installed - [install Node.js with nvm](https://github.com/nvm-sh/nvm) and [install Bun](https://bun.sh/docs/installation).

Follow these steps:

```bash
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
bun i

# Step 4: Start the instant web preview of your app in your browser, with auto-reloading of your changes
bun run start-web

# Step 5: Start iOS preview
# Option A (recommended):
bun run start  # then press "i" in the terminal to open iOS Simulator
# Option B (if supported by your environment):
bun run start -- --ios
```

### Edit a File Directly in GitHub

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

## What Technologies Are Used for This Project?

This project is built with the most popular native mobile cross-platform technical stack:

- **React Native** - Cross-platform native mobile development framework created by Meta and used for Instagram, Airbnb, and many top apps in the App Store.
- **Expo** - Extension of React Native + platform used by Discord, Shopify, Coinbase, Tesla, Starlink, Eight Sleep, and more.
- **Expo Router** - File-based routing system for React Native with support for web, server functions, and SSR.
- **TypeScript** - Type-safe JavaScript.
- **React Query** - Server state management.
- **Lucide React Native** - Beautiful icons.

## How Can I Test My App?

### On Your Phone (Recommended)

1. **iOS**: Download [Expo Go](https://apps.apple.com/app/expo-go/id982107779) from the App Store.
2. **Android**: Download the [Expo Go app](https://play.google.com/store/apps/details?id=host.exp.exponent) from Google Play.
3. Run `bun run start` and scan the QR code from your development server.

### In Your Browser

Run `bun start-web` to test in a web browser. Note: The browser preview is great for quick testing, but some native features may not be available.

### iOS Simulator / Android Emulator

You can test apps in Expo Go. You don’t need Xcode or Android Studio for most features.

**When Do You Need Custom Development Builds?**

- Native authentication (Face ID, Touch ID, Apple Sign In).
- In-app purchases and subscriptions.
- Push notifications.
- Custom native modules.

Learn more: [Expo Custom Development Builds Guide](https://docs.expo.dev/develop/development-builds/introduction/)

If you have Xcode (iOS) or Android Studio installed:

```bash
# iOS Simulator
bun run start -- --ios

# Android Emulator
bun run start -- --android
```

## How Can I Deploy This Project?

### Publish to App Store (iOS)

1. **Install EAS CLI**:

   ```bash
   bun i -g @expo/eas-cli
   ```

2. **Configure your project**:

   ```bash
   eas build:configure
   ```

3. **Build for iOS**:

   ```bash
   eas build --platform ios
   ```

4. **Submit to App Store**:
   ```bash
   eas submit --platform ios
   ```

For detailed instructions, visit [Expo's App Store deployment guide](https://docs.expo.dev/submit/ios/).

### Publish to Google Play (Android)

1. **Build for Android**:

   ```bash
   eas build --platform android
   ```

2. **Submit to Google Play**:
   ```bash
   eas submit --platform android
   ```

For detailed instructions, visit [Expo's Google Play deployment guide](https://docs.expo.dev/submit/android/).

### Publish as a Website

Your React Native app can also run on the web:

1. **Build for web**:

   ```bash
   eas build --platform web
   ```

2. **Deploy with EAS Hosting**:
   ```bash
   eas hosting:configure
   eas hosting:deploy
   ```

Alternative web deployment options:

- **Vercel**: Deploy directly from your GitHub repository.
- **Netlify**: Connect your GitHub repo to Netlify for automatic deployments.

## App Features

This template includes:

- **Cross-platform compatibility** - Works on iOS, Android, and Web.
- **File-based routing** with Expo Router.
- **Tab navigation** with customizable tabs.
- **Modal screens** for overlays and dialogs.
- **TypeScript support** for a better development experience.
- **Async storage** for local data persistence.
- **Vector icons** with Lucide React Native.

## Project Structure

```
├── app/                    # App screens (Expo Router)
│   ├── (tabs)/            # Tab navigation screens
│   │   ├── _layout.tsx    # Tab layout configuration
│   │   └── index.tsx      # Home tab screen
│   ├── _layout.tsx        # Root layout
│   ├── modal.tsx          # Modal screen example
│   └── +not-found.tsx     # 404 screen
├── assets/                # Static assets
│   └── images/           # App icons and images
├── constants/            # App constants and configuration
├── app.json             # Expo configuration
├── package.json         # Dependencies and scripts
└── tsconfig.json        # TypeScript configuration
```

## Custom Development Builds

For advanced native features, you'll need to create a Custom Development Build instead of using Expo Go.

### When Do You Need a Custom Development Build?

- **Native Authentication**: Face ID, Touch ID, Apple Sign In, Google Sign In.
- **In-App Purchases**: App Store and Google Play subscriptions.
- **Advanced Native Features**: Third-party SDKs, platform-specific features (e.g., Widgets on iOS).
- **Background Processing**: Background tasks, location tracking.

### Creating a Custom Development Build

```bash
# Install EAS CLI
bun i -g @expo/eas-cli

# Configure your project for development builds
eas build:configure

# Create a development build for your device
eas build --profile development --platform ios
eas build --profile development --platform android

# Install the development build on your device and start developing
bun start --dev-client
```

**Learn more:**

- [Development Builds Introduction](https://docs.expo.dev/develop/development-builds/introduction/)
- [Creating Development Builds](https://docs.expo.dev/develop/development-builds/create-a-build/)
- [Installing Development Builds](https://docs.expo.dev/develop/development-builds/installation/)

## Advanced Features

### Add a Database

Integrate with backend services:

- **Supabase** - PostgreSQL database with real-time features.
- **Firebase** - Google's mobile development platform.
- **Custom API** - Connect to your own backend.

### Add Authentication

Implement user authentication:

**Basic Authentication (works in Expo Go):**

- **Expo AuthSession** - OAuth providers (Google, Facebook, Apple) - [Guide](https://docs.expo.dev/guides/authentication/)
- **Supabase Auth** - Email/password and social login - [Integration Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)
- **Firebase Auth** - Comprehensive authentication solution - [Setup Guide](https://docs.expo.dev/guides/using-firebase/)

**Native Authentication (requires Custom Development Build):**

- **Apple Sign In** - Native Apple authentication - [Implementation Guide](https://docs.expo.dev/versions/latest/sdk/apple-authentication/)
- **Google Sign In** - Native Google authentication - [Setup Guide](https://docs.expo.dev/guides/google-authentication/)

### Add Push Notifications

Send notifications to your users:

- **Expo Notifications** - Cross-platform push notifications.
- **Firebase Cloud Messaging** - Advanced notification features.

### Add Payments

Monetize your app:

**Web & Credit Card Payments (works in Expo Go):**

- **Stripe** - Credit card payments and subscriptions - [Expo + Stripe Guide](https://docs.expo.dev/guides/using-stripe/)
- **PayPal** - PayPal payments integration - [Setup Guide](https://developer.paypal.com/docs/checkout/mobile/react-native/)

**Native In-App Purchases (requires Custom Development Build):**

- **RevenueCat** - Cross-platform in-app purchases and subscriptions - [Expo Integration Guide](https://www.revenuecat.com/docs/expo)
- **Expo In-App Purchases** - Direct App Store/Google Play integration - [Implementation Guide](https://docs.expo.dev/versions/latest/sdk/in-app-purchases/)

**Paywall Optimization:**

- **Superwall** - Paywall A/B testing and optimization - [React Native SDK](https://docs.superwall.com/docs/react-native)
- **Adapty** - Mobile subscription analytics and paywalls - [Expo Integration](https://docs.adapty.io/docs/expo)

## I Want to Use a Custom Domain - Is That Possible?

For web deployments, you can use custom domains with:

- **EAS Hosting** - Custom domains available on paid plans.
- **Netlify** - Free custom domain support.
- **Vercel** - Custom domains with automatic SSL.

For mobile apps, you'll configure your app's deep linking scheme in `app.json`.

## Troubleshooting

### App Not Loading on Device?

1. Make sure your phone and computer are on the same WiFi network.
2. Try using tunnel mode: `bun start -- --tunnel`.
3. Check if your firewall is blocking the connection.

### Build Failing?

1. Clear your cache: `bunx expo start --clear`.
2. Delete `node_modules` and reinstall: `rm -rf node_modules && bun install`.
3. Check [Expo's troubleshooting guide](https://docs.expo.dev/troubleshooting/build-errors/).

### Need Help with Native Features?

- Check [Expo's documentation](https://docs.expo.dev/) for native APIs.
- Browse [React Native's documentation](https://reactnative.dev/docs/getting-started) for core components.

## About the Project

This app is built using React Native and Expo, the same technology stack used by Discord, Shopify, Coinbase, Instagram, and nearly 30% of the top 100 apps on the App Store. It is production-ready and can be published to both the App Store and Google Play Store, with the option to export to the web for true cross-platform functionality.
