import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./components/theme-provider";
import { parseTheme, THEME_KEY } from "@/lib/theme";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
export const metadata: Metadata = {
  title: "Glossia · typed graphs for LLM workflows",
  description:
    "A research prototype that compiles natural-language requests into typed workflow graphs, checks them before execution, and records per-node traces and costs.",
  openGraph: {
    title: "Glossia · typed graphs for LLM workflows",
    description:
      "A research prototype for typed LLM workflows, with a deterministic analyzer and a DAG runtime.",
    type: "website",
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const htmlTheme = parseTheme(cookieStore.get(THEME_KEY)?.value) ?? "light";

  return (
    <html
      lang="en"
      data-theme={htmlTheme}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[var(--bg)] font-sans text-[var(--fg)]">
        <ThemeProvider initialTheme={htmlTheme}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
