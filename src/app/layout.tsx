import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata:Metadata={
  title:"ZeroAI",
  description:"Deterministic infrastructure for AI execution, memory, policy, evidence, and certification."
};

export default function RootLayout({children}:{children:ReactNode}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
