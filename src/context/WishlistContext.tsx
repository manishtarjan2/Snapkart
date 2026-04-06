"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type WishlistItem = {
  _id: string;
  name: string;
  price: number;
  category: string;
  image?: string;
  discount: number;
  inStock: boolean;
  stock: number;
  isActive?: boolean;
};

type WishlistContextType = {
  items: WishlistItem[];
  toggleWishlist: (item: WishlistItem) => void;
  isInWishlist: (id: string) => boolean;
};

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("snapkart_wishlist");
      if (stored) setItems(JSON.parse(stored));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const saveItems = (newItems: WishlistItem[]) => {
    setItems(newItems);
    localStorage.setItem("snapkart_wishlist", JSON.stringify(newItems));
  };

  const toggleWishlist = (item: WishlistItem) => {
    const exists = items.find((i) => i._id === item._id);
    if (exists) {
      saveItems(items.filter((i) => i._id !== item._id));
    } else {
      saveItems([...items, item]);
    }
  };

  const isInWishlist = (id: string) => {
    return items.some((i) => i._id === id);
  };

  return (
    <WishlistContext.Provider value={{ items, toggleWishlist, isInWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used within WishlistProvider");
  return context;
}
