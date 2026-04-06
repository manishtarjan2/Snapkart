"use client";

import React, { useState } from "react";
import { ShoppingCart, Star, Package, Check, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";

type GroceryItem = {
  _id: string;
  name: string;
  price: number;
  category: string;
  image?: string;
  description?: string;
  isActive: boolean;
  inStock: boolean;
  stock: number;
  discount: number;
  brand?: string;
  unit?: string;
};

export default function GroceryItemCard({ item }: { item: GroceryItem }) {
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [added, setAdded] = useState(false);

  const isFavorite = isInWishlist(item._id);

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Train the trending algorithm: Favoriting implies extremely high interest (view weight)
    if (!isFavorite) {
       fetch(`/api/products/${item._id}/track`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ action: "view" })
       }).catch(() => {});
    }

    toggleWishlist({
      _id: item._id,
      name: item.name,
      price: item.price,
      category: item.category,
      image: item.image,
      discount: item.discount,
      inStock: item.inStock,
      stock: item.stock,
      isActive: item.isActive,
    });
  };

  // A product is purchasable only if it's active AND in stock AND has stock qty > 0
  const canBuy = item.isActive !== false && item.inStock && item.stock > 0;

  const discountedPrice = item.discount > 0
    ? item.price * (1 - item.discount / 100)
    : item.price;

  const handleAdd = () => {
    if (!canBuy) return;
    addToCart({
      _id: item._id,
      name: item.name,
      price: discountedPrice,
      category: item.category,
      image: item.image,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);

    // Train the trending algorithm: Add to cart counts as a strong 'sale' or intent signal
    fetch(`/api/products/${item._id}/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sale" })
    }).catch(() => {});
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: canBuy ? -4 : 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col group hover:shadow-lg hover:border-emerald-100 transition-all duration-300"
    >
      {/* Image area */}
      <div className="relative bg-gradient-to-br from-emerald-50 to-teal-50 h-40 flex items-center justify-center overflow-hidden">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${!canBuy ? "grayscale opacity-70" : ""}`}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 opacity-40">
            <Package className="w-12 h-12 text-emerald-400" />
            <span className="text-xs text-emerald-500 font-medium">No image</span>
          </div>
        )}

        {/* Badges container */}
        <div className="absolute top-2 left-2 flex flex-col gap-1.5 items-start z-10">
          <span className="bg-white/90 backdrop-blur text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm border border-emerald-100 capitalize hover:scale-105 transition-transform">
            {item.category}
          </span>
          {item.discount > 0 && canBuy && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm hover:scale-105 transition-transform">
              -{item.discount}%
            </span>
          )}
        </div>

        {/* Favorite Button */}
        <button
          onClick={handleToggleFavorite}
          className="absolute top-2 right-2 p-1.5 bg-white backdrop-blur rounded-full shadow-md border border-gray-100 hover:scale-110 active:scale-95 transition-all duration-200 z-10 cursor-pointer group/fav"
        >
          <Heart 
            className={`w-4 h-4 transition-colors duration-300 ${isFavorite ? "fill-pink-500 text-pink-500" : "text-gray-400 group-hover/fav:text-pink-400"}`} 
          />
        </button>

        {/* Out of stock overlay — uses inStock AND stock quantity */}
        {!canBuy && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
              {item.isActive === false ? "Unavailable" : "Out of Stock"}
            </span>
          </div>
        )}

        {/* Low stock warning (≤ 5 units) */}
        {canBuy && item.stock > 0 && item.stock <= 5 && (
          <div className="absolute bottom-2 left-2">
            <span className="bg-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow">
              Only {item.stock} left!
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-gray-800 text-sm leading-snug line-clamp-2 flex-1">
            {item.name}
          </h3>
          <div className="flex items-center gap-0.5 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-lg shrink-0">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span className="text-[10px] font-bold text-amber-600">4.5</span>
          </div>
        </div>

        {item.brand && (
          <p className="text-[10px] text-gray-400 font-medium">{item.brand}{item.unit ? ` · ${item.unit}` : ""}</p>
        )}

        {item.description && (
          <p className="text-xs text-gray-400 line-clamp-2">{item.description}</p>
        )}

        <div className="mt-auto pt-2 flex items-center justify-between gap-2">
          <div>
            <span className="text-lg font-extrabold text-gray-900">
              ₹{discountedPrice.toFixed(0)}
            </span>
            {item.discount > 0 && (
              <span className="text-xs text-gray-400 line-through ml-1">₹{item.price}</span>
            )}
            {item.unit && (
              <span className="text-xs text-gray-400 ml-1">/ {item.unit}</span>
            )}
          </div>

          <motion.button
            onClick={handleAdd}
            disabled={!canBuy}
            whileTap={{ scale: canBuy ? 0.92 : 1 }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${added
              ? "bg-emerald-500 text-white scale-95"
              : canBuy
                ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm hover:shadow-emerald-200 hover:shadow-md cursor-pointer"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
          >
            {added ? (
              <><Check className="w-3.5 h-3.5" /> Added!</>
            ) : (
              <><ShoppingCart className="w-3.5 h-3.5" /> {canBuy ? "Add" : "Sold Out"}</>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
