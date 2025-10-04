export default {
  expo: {
    name: "Ticket Snipper",
    slug: "ticket-snipper",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.yourcompany.ticketsnipper"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.yourcompany.ticketsnipper"
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      backendApiUrl: process.env.EXPO_PUBLIC_BACKEND_API_URL || "https://ticket-snipper-backend.vercel.app",
      ticketApiKey: process.env.EXPO_PUBLIC_TICKET_API_KEY || "4898a44d4bfdff515579da32729c995ae443898656b6125e67255b8816ff2742",
      eas: {
        projectId: "your-project-id"
      }
    },
    plugins: [
      "expo-router"
    ],
    scheme: "ticketsnipper"
  }
};