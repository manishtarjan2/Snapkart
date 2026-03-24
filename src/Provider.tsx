"use client";

import { SessionProvider } from "next-auth/react";
import React from "react";
import { CartProvider } from "@/context/CartContext";

interface ProviderProps {
    children: React.ReactNode;
}

export default function Provider({ children }: ProviderProps) {
    return (
        <SessionProvider>
            <CartProvider>
                {children}
            </CartProvider>
        </SessionProvider>
    );
}
