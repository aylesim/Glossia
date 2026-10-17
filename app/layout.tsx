import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./components/theme-provider";
import { parseTheme, THEME_KEY } from "@/lib/theme";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Glossia — compile, run and prove LLM workflows",
  description:
    "A typed IR for LLM workflows. Describe intent, get a schema-validated graph, run it with traces, cost and deterministic citation verification, then measure it with evals.",
  openGraph: {
    title: "Glossia — compile, run and prove LLM workflows",
    description:
      "Natural language → typed graph → real execution → traces, costs and evals. LLMs propose, the system disposes.",
    type: "website",
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const htmlTheme = parseTheme(cookieStore.get(THEME_KEY)?.value) ?? "dark";

  return (
    <html
      lang="en"
      data-theme={htmlTheme}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[var(--bg)] font-sans text-[var(--fg)]">
        <ThemeProvider initialTheme={htmlTheme}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
