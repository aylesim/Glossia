import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "./components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Glossia: semantic graph composer",
  description:
    "Describe a domain in plain language, get validated Domain JSON, then compose flows as pseudocode and patch graphs, explored interactively in the browser.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <Script
          id="glossia-theme-init"
          strategy="beforeInteractive"
        >{`(function(){try{var t=localStorage.getItem("glossia.theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t);return;}document.documentElement.setAttribute("data-theme",window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();`}</Script>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
