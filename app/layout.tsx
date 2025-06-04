import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/app/components/theme-provider";
import { TokenInitializer } from "@/app/components/token-initializer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GitHub Repo Analyzer",
  description: "Analyze any public GitHub repository for insights and visualization",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TokenInitializer />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
} 