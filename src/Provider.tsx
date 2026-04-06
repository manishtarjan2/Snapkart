"use client";

import { SessionProvider } from "next-auth/react";
import React from "react";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";

interface ProviderProps {
    children: React.ReactNode;
}

export default function Provider({ children }: ProviderProps) {
    return (
        <SessionProvider>
            <CartProvider>
                <WishlistProvider>
                    {children}
                </WishlistProvider>
            </CartProvider>
        </SessionProvider>
    );
}
