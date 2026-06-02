import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./components/theme-provider";
import { parseTheme, THEME_KEY } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Glossia: semantic graph composer",
  description:
    "Describe a domain in plain language, get validated Domain JSON, then compose flows as pseudocode and patch graphs, explored interactively in the browser.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const htmlTheme = parseTheme(cookieStore.get(THEME_KEY)?.value) ?? "dark";

  return (
    <html
      lang="en"
      data-theme={htmlTheme}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider initialTheme={htmlTheme}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
