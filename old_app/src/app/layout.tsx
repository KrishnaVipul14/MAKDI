import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Placement Coach",
  description: "Your personalized job-to-placement pipeline.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} flex h-screen bg-background overflow-hidden text-foreground`}>
        <TooltipProvider>
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-muted/20">
            {children}
          </main>
        </TooltipProvider>
      </body>
    </html>
  );
}
