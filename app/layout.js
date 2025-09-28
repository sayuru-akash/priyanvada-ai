import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./contexts/AuthContext";
import Head from "next/head";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "PRIYANVADA AI - Bringing Your Favorite Characters to Life",
  description: "මොහාන් රාජ් මඩවලගේ ලෝකයට පිවිසෙමු..",
  icons: {
    icon: "/images/logo.ico",
    shortcut: "/images/logo.ico",
    apple: "/images/logo.png",
  },
  openGraph: {
    title: "PRIYANVADA AI - Bringing Your Favorite Characters to Life",
    description: "මොහාන් රාජ් මඩවලගේ ලෝකයට පිවිසෙමු..",
    url: "https://www.priyanvadaai.com",
    siteName: "PRIYANVADA AI",
    images: [
      {
        url: "/images/thumbnail.jpg",
        width: 1200,
        height: 630,
        alt: "PRIYANVADA AI - Chat with Your Favorite Characters",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PRIYANVADA AI - Bringing Your Favorite Characters to Life",
    description: "මොහාන් රාජ් මඩවලගේ ලෝකයට පිවිසෙමු..",
    images: ["/images/thumbnail.jpg"],
    creator: "@priyanvada_ai",
    site: "@priyanvada_ai",
  },
  metadataBase: new URL("https://www.priyanvadaai.com"),
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <Head>
        <link rel="icon" href="/images/logo.ico" type="image/x-icon" />
        <link rel="shortcut icon" href="/images/logo.ico" type="image/x-icon" />
        <link rel="apple-touch-icon" href="/images/logo.png" />
      </Head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Google tag (gtag.js) */}
        <Script
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtag/js?id=G-TRS8H57KHY"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-TRS8H57KHY');
          `}
        </Script>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
