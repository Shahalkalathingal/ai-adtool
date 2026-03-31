import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono, Montserrat } from "next/font/google";
import { ClientProviders } from "@/app/client-providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-studio-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "AI Ad Studio",
  description: "AI-generated long-form vertical video ads with a Remotion timeline.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${jetbrainsMono.variable} ${montserrat.variable} h-full`}
    >
      <body className="min-h-full antialiased">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
