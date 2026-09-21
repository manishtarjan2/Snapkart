import type { Metadata } from "next";
import "./globals.css";
import React from "react";
import Provider from "@/Provider";

export const metadata: Metadata = {
  title: "Snapkart",
  description: "Snapkart online shopping and self-checkout",
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="w-full min-h-screen bg-gradient-to-b from-green-50 to-white">
        <Provider>
          {children}
        </Provider>
      </body>
    </html>
  );
}
