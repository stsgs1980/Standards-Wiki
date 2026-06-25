import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "@/components/docs/theme-provider";
import "./globals.css";
import { SelectElementFab } from '@stsgs1980/fab-inspector';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StsDev Wiki Template",
  description: "Wiki documentation template built on Next.js 16 with MDX, syntax highlighting, themes, and in-app editing",
  keywords: ["wiki", "documentation", "Next.js", "MDX", "Docs-as-Code", "template"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Script
          id="theme-script"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `!function(){var d=document.documentElement,c=d.classList;c.remove('light','dark');var e=localStorage.getItem('theme');if(e){c.add(e||'')}else{c.add('dark')}d.style.colorScheme=e||'dark'}()`
          }}
        />
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <SelectElementFab />

      </body>
    </html>
  );
}