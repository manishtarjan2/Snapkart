"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    ShoppingCart,
    Plus,
    Minus,
    Trash2,
    ShoppingBag,
    ArrowRight,
    Package,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import CheckoutModal from "./CheckoutModal";

export default function CartSidebar() {
    const { items, isCartOpen, closeCart, removeFromCart, updateQty, totalItems, totalPrice } = useCart();
    const [showCheckout, setShowCheckout] = useState(false);

    const deliveryFee = totalPrice >= 299 ? 0 : 30;
    const grandTotal = totalPrice + deliveryFee;

    return (
        <>
            {/* Backdrop */}
            <AnimatePresence>
                {isCartOpen && (
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeCart}
                        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
                    />
                )}
            </AnimatePresence>

            {/* Drawer */}
            <AnimatePresence>
                {isCartOpen && (
                    <motion.div
                        key="drawer"
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", stiffness: 320, damping: 32 }}
                        className="fixed top-0 right-0 bottom-0 z-[70] w-full max-w-sm flex flex-col bg-white shadow-2xl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-emerald-50 rounded-xl">
                                    <ShoppingCart className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <h2 className="font-extrabold text-gray-900 text-base">Your Cart</h2>
                                    <p className="text-xs text-gray-400">{totalItems} item{totalItems !== 1 ? "s" : ""}</p>
                                </div>
                            </div>
                            <button
                                onClick={closeCart}
                                className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Free delivery banner */}
                        {totalPrice > 0 && totalPrice < 299 && (
                            <div className="mx-4 mt-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
                                <ShoppingBag className="w-4 h-4 text-amber-500 shrink-0" />
                                <p className="text-xs font-semibold text-amber-700">
                                    Add ₹{299 - totalPrice} more for <span className="text-emerald-600">FREE delivery!</span>
                                </p>
                            </div>
                        )}
                        {totalPrice >= 299 && (
                            <div className="mx-4 mt-3 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
                                <Package className="w-4 h-4 text-emerald-500 shrink-0" />
                                <p className="text-xs font-semibold text-emerald-700">🎉 You got FREE delivery!</p>
                            </div>
                        )}

                        {/* Items */}
                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                            {items.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center gap-4 text-gray-400 py-16">
                                    <div className="w-20 h-20 rounded-full bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center">
                                        <ShoppingCart className="w-9 h-9 text-gray-300" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-500 text-base">Your cart is empty</p>
                                        <p className="text-sm mt-1">Add items from the store to get started.</p>
                                    </div>
                                    <button
                                        onClick={closeCart}
                                        className="mt-2 flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all cursor-pointer"
                                    >
                                        Browse Products
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <AnimatePresence>
                                    {items.map((item) => (
                                        <motion.div
                                            key={item._id}
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, x: 60 }}
                                            layout
                                            className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3"
                                        >
                                            {/* Image */}
                                            <div className="w-14 h-14 rounded-xl overflow-hidden bg-white border border-gray-100 shrink-0 flex items-center justify-center">
                                                {item.image ? (
                                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Package className="w-6 h-6 text-gray-300" />
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-gray-800 text-sm truncate">{item.name}</p>
                                                <p className="text-xs text-gray-400 capitalize">{item.category}</p>
                                                <p className="text-emerald-600 font-bold text-sm mt-0.5">
                                                    ₹{(item.price * item.quantity).toFixed(0)}
                                                </p>
                                            </div>

                                            {/* Qty controls */}
                                            <div className="flex flex-col items-end gap-2 shrink-0">
                                                <button
                                                    onClick={() => removeFromCart(item._id)}
                                                    className="text-gray-300 hover:text-red-500 transition-colors cursor-pointer"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                                <div className="flex items-center gap-1.5 bg-white rounded-xl border border-gray-200 px-2 py-1">
                                                    <button
                                                        onClick={() => updateQty(item._id, item.quantity - 1)}
                                                        className="text-gray-500 hover:text-emerald-600 transition-colors cursor-pointer"
                                                    >
                                                        <Minus className="w-3.5 h-3.5" />
                                                    </button>
                                                    <span className="w-5 text-center text-sm font-bold text-gray-800">
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        onClick={() => updateQty(item._id, item.quantity + 1)}
                                                        className="text-gray-500 hover:text-emerald-600 transition-colors cursor-pointer"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            )}
                        </div>

                        {/* Footer — price summary + checkout */}
                        {items.length > 0 && (
                            <div className="border-t border-gray-100 px-5 py-4 space-y-3 bg-white">
                                {/* Price breakdown */}
                                <div className="space-y-1.5 text-sm">
                                    <div className="flex justify-between text-gray-500">
                                        <span>Subtotal ({totalItems} items)</span>
                                        <span className="font-medium text-gray-700">₹{totalPrice.toFixed(0)}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-500">
                                        <span>Delivery fee</span>
                                        {deliveryFee === 0 ? (
                                            <span className="text-emerald-600 font-semibold">FREE</span>
                                        ) : (
                                            <span className="font-medium text-gray-700">₹{deliveryFee}</span>
                                        )}
                                    </div>
                                    <div className="flex justify-between font-extrabold text-gray-900 text-base pt-1 border-t border-gray-100">
                                        <span>Total</span>
                                        <span>₹{grandTotal.toFixed(0)}</span>
                                    </div>
                                </div>

                                {/* Checkout button */}
                                <button
                                    onClick={() => { closeCart(); setShowCheckout(true); }}
                                    className="w-full bg-emerald-600 text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                                >
                                    Proceed to Checkout
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Checkout modal outside sidebar */}
            <AnimatePresence>
                {showCheckout && (
                    <CheckoutModal
                        grandTotal={grandTotal}
                        deliveryFee={deliveryFee}
                        onClose={() => setShowCheckout(false)}
                    />
                )}
            </AnimatePresence>
        </>
    );
}
