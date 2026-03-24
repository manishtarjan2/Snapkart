"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    CreditCard,
    Smartphone,
    Wallet,
    ChevronRight,
    Loader2,
    CheckCircle2,
    Lock,
    ArrowLeft,
    IndianRupee,
} from "lucide-react";
import { useCart } from "@/context/CartContext";

type Address = {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    pincode: string;
};

type Props = {
    address: Address;
    grandTotal: number;
    onClose: () => void;
};

type PaymentMethod = "upi" | "card" | "cod" | "wallet";

const PAYMENT_METHODS: { id: PaymentMethod; label: string; sub: string; icon: React.ReactNode }[] = [
    {
        id: "upi",
        label: "UPI",
        sub: "GPay, PhonePe, Paytm, BHIM",
        icon: <Smartphone className="w-5 h-5 text-emerald-600" />,
    },
    {
        id: "card",
        label: "Credit / Debit Card",
        sub: "Visa, Mastercard, RuPay",
        icon: <CreditCard className="w-5 h-5 text-blue-500" />,
    },
    {
        id: "wallet",
        label: "Wallet",
        sub: "Paytm, Amazon Pay, Mobikwik",
        icon: <Wallet className="w-5 h-5 text-violet-500" />,
    },
    {
        id: "cod",
        label: "Cash on Delivery",
        sub: "Pay when your order arrives",
        icon: <IndianRupee className="w-5 h-5 text-amber-500" />,
    },
];

export default function PaymentModal({ address, grandTotal, onClose }: Props) {
    const { items, clearCart } = useCart();
    const [selected, setSelected] = useState<PaymentMethod>("upi");
    const [upiId, setUpiId] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [orderId, setOrderId] = useState("");
    const [error, setError] = useState("");

    const handlePay = async () => {
        setError("");
        if (selected === "upi" && !upiId.trim()) {
            setError("Please enter your UPI ID.");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch("/api/user/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    items: items.map((i) => ({
                        groceryId: i._id,
                        name: i.name,
                        price: i.price,
                        quantity: i.quantity,
                        image: i.image,
                    })),
                    address,
                    totalAmount: grandTotal,
                    paymentMethod: selected.toUpperCase(),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed");
            setOrderId(data.orderId);
            setSuccess(true);
            clearCart();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Payment failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // ── Success screen ──────────────────────────────────────────
    if (success) {
        return (
            <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
                        className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5"
                    >
                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    </motion.div>

                    <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Order Placed! 🎉</h2>
                    <p className="text-gray-500 text-sm mb-4">
                        Your order has been placed successfully and will be delivered shortly.
                    </p>

                    <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4 mb-5 space-y-2 text-left">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Order ID</span>
                            <span className="font-mono text-xs text-gray-600">#{orderId.slice(-8).toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Amount Paid</span>
                            <span className="font-bold text-emerald-600">₹{grandTotal}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Payment</span>
                            <span className="font-semibold text-gray-700 capitalize">{selected.toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Deliver to</span>
                            <span className="font-semibold text-gray-700 text-right max-w-[55%]">
                                {address.city}, {address.state}
                            </span>
                        </div>
                    </div>

                    {/* Estimated delivery */}
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 mb-5 flex items-center gap-2.5">
                        <span className="text-2xl">🛵</span>
                        <div className="text-left">
                            <p className="text-xs font-bold text-emerald-700">Estimated Delivery</p>
                            <p className="text-sm font-semibold text-gray-800">Today in 20–40 minutes</p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full bg-emerald-600 text-white py-3 rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all cursor-pointer"
                    >
                        Back to Shopping
                    </button>
                </motion.div>
            </div>
        );
    }

    // ── Payment screen ──────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, y: 60 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 60 }}
                className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-blue-50 rounded-xl">
                            <Lock className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="font-extrabold text-gray-900">Secure Payment</h2>
                            <p className="text-xs text-gray-400">Step 2 of 2 — Choose payment method</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 cursor-pointer transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Amount banner */}
                <div className="px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 flex items-center justify-between shrink-0">
                    <div>
                        <p className="text-emerald-100 text-xs font-medium">Amount to Pay</p>
                        <p className="text-white text-2xl font-black">₹{grandTotal}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-emerald-100 text-xs">Deliver to</p>
                        <p className="text-white text-sm font-semibold">{address.fullName}</p>
                        <p className="text-emerald-200 text-xs">{address.city}, {address.state}</p>
                    </div>
                </div>

                {/* Payment methods */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                        Select Payment Method
                    </p>

                    {PAYMENT_METHODS.map((method) => (
                        <button
                            key={method.id}
                            onClick={() => setSelected(method.id)}
                            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer text-left ${selected === method.id
                                ? "border-emerald-500 bg-emerald-50"
                                : "border-gray-100 bg-gray-50 hover:border-gray-200"
                                }`}
                        >
                            <div className={`p-2.5 rounded-xl ${selected === method.id ? "bg-white shadow-sm" : "bg-white"}`}>
                                {method.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-800 text-sm">{method.label}</p>
                                <p className="text-xs text-gray-400">{method.sub}</p>
                            </div>
                            <div className={`w-4 h-4 rounded-full border-2 transition-all ${selected === method.id
                                ? "border-emerald-500 bg-emerald-500"
                                : "border-gray-300"
                                }`}>
                                {selected === method.id && (
                                    <div className="w-full h-full rounded-full flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                    </div>
                                )}
                            </div>
                        </button>
                    ))}

                    {/* UPI ID input */}
                    <AnimatePresence>
                        {selected === "upi" && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                                        Enter UPI ID
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="yourname@upi"
                                        value={upiId}
                                        onChange={(e) => setUpiId(e.target.value)}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-gray-300"
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {error && (
                        <p className="text-red-500 text-sm font-medium">{error}</p>
                    )}

                    {/* Security note */}
                    <div className="flex items-center gap-2 text-xs text-gray-400 pt-1">
                        <Lock className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                        Your payment info is encrypted and 100% secure.
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 shrink-0">
                    <button
                        onClick={handlePay}
                        disabled={loading}
                        className="w-full bg-emerald-600 text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-[0.98]"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Lock className="w-4 h-4" />
                                Pay ₹{grandTotal}
                            </>
                        )}
                    </button>
                    <p className="text-center text-xs text-gray-400 mt-2">
                        By placing this order you agree to our Terms of Service.
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
