"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeft, ShoppingCart, Package, Plus, Minus, Trash2,
    CheckCircle2, Loader2, AlertTriangle, X, CreditCard,
    Smartphone, Banknote, QrCode, ScanBarcode,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type CartItem = {
    groceryId: string;
    quantity: number;
    name?: string;
    price?: number;
    image?: string;
    discount?: number;
};

type EnrichedItem = {
    _id: string;
    name: string;
    price: number;
    image?: string;
    discount: number;
    category: string;
    qty: number;
};

export default function SelfCheckoutPage() {
    const searchParams = useSearchParams();
    const [items, setItems] = useState<EnrichedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [paymentMethod, setPaymentMethod] = useState<"UPI" | "CARD">("UPI");
    const [submitting, setSubmitting] = useState(false);
    const [receipt, setReceipt] = useState<{
        orderId: string;
        receiptToken: string;
        qrData: string;
        totalAmount: number;
        flagged: boolean;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Parse items from URL params (from scan page)
    useEffect(() => {
        const loadItems = async () => {
            setLoading(true);
            try {
                const itemsParam = searchParams.get("items");
                if (!itemsParam) {
                    setLoading(false);
                    return;
                }

                const parsed: CartItem[] = JSON.parse(itemsParam);
                const enriched: EnrichedItem[] = [];

                for (const item of parsed) {
                    const res = await fetch(
                        `/api/user/scan?code=${encodeURIComponent(item.groceryId)}`
                    );
                    if (res.ok) {
                        const data = await res.json();
                        enriched.push({
                            _id: data._id,
                            name: data.name,
                            price: data.price,
                            image: data.image,
                            discount: data.discount || 0,
                            category: data.category,
                            qty: item.quantity,
                        });
                    }
                }

                setItems(enriched);
            } catch (err) {
                console.error("Failed to load items:", err);
                setError("Failed to load cart items");
            } finally {
                setLoading(false);
            }
        };

        loadItems();
    }, [searchParams]);

    const setQty = (id: string, qty: number) => {
        if (qty <= 0) setItems((p) => p.filter((i) => i._id !== id));
        else setItems((p) => p.map((i) => (i._id === id ? { ...i, qty } : i)));
    };

    const removeItem = (id: string) =>
        setItems((p) => p.filter((i) => i._id !== id));

    // Totals
    const subtotal = useMemo(
        () =>
            items.reduce((sum, item) => {
                const discounted = item.price * (1 - item.discount / 100);
                return sum + discounted * item.qty;
            }, 0),
        [items]
    );

    const handleCheckout = async () => {
        if (items.length === 0) return;
        setSubmitting(true);
        setError(null);

        try {
            // Get user location for geofence
            let latitude: number | undefined;
            let longitude: number | undefined;
            try {
                const pos = await new Promise<GeolocationPosition>(
                    (resolve, reject) =>
                        navigator.geolocation.getCurrentPosition(resolve, reject, {
                            timeout: 5000,
                        })
                );
                latitude = pos.coords.latitude;
                longitude = pos.coords.longitude;
            } catch {
                // Location not available — will be flagged but not blocked
            }

            const res = await fetch("/api/user/self-checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    items: items.map((i) => ({
                        groceryId: i._id,
                        quantity: i.qty,
                    })),
                    store_id: "default", // TODO: let user select store
                    paymentMethod,
                    clientTotal: parseFloat(subtotal.toFixed(2)),
                    clientLatitude: latitude,
                    clientLongitude: longitude,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(
                    data.message ||
                    (data.reasons
                        ? data.reasons.join("; ")
                        : "Checkout failed")
                );
                return;
            }

            setReceipt({
                orderId: data.orderId,
                receiptToken: data.receiptToken,
                qrData: data.qrData,
                totalAmount: data.totalAmount,
                flagged: data.flagged,
            });
        } catch (err) {
            setError("Network error — please try again");
        } finally {
            setSubmitting(false);
        }
    };

    // Success screen
    if (receipt) {
        return (
            <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md bg-gray-900 rounded-3xl border border-gray-800 overflow-hidden"
                >
                    <div className="flex flex-col items-center pt-8 pb-6 px-6 text-center">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring" }}
                            className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-4 shadow-2xl shadow-emerald-900/50"
                        >
                            <CheckCircle2 className="w-10 h-10 text-white" />
                        </motion.div>
                        <h2 className="text-2xl font-black text-white">
                            Checkout Complete!
                        </h2>
                        <p className="text-sm text-gray-400 mt-1">
                            Show this receipt QR at the exit gate
                        </p>
                    </div>

                    <div className="px-6 pb-6 space-y-4">
                        {/* Receipt token */}
                        <div className="bg-gray-800 rounded-2xl p-4 text-center border border-gray-700">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                                Receipt Token
                            </p>
                            <p className="text-3xl font-black text-emerald-400 tracking-widest font-mono">
                                {receipt.receiptToken}
                            </p>
                        </div>

                        {/* QR Code placeholder */}
                        <div className="bg-white rounded-2xl p-6 flex items-center justify-center">
                            <div className="text-center">
                                <QrCode className="w-24 h-24 text-gray-800 mx-auto" />
                                <p className="text-xs text-gray-500 mt-2">
                                    QR code for verification
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Total Paid</span>
                            <span className="font-black text-emerald-400 text-lg">
                                ₹{receipt.totalAmount.toFixed(2)}
                            </span>
                        </div>

                        <div className="flex justify-between text-xs text-gray-500">
                            <span>Order ID</span>
                            <span className="font-mono">
                                {receipt.orderId.slice(-8).toUpperCase()}
                            </span>
                        </div>

                        {receipt.flagged && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-amber-900/30 border border-amber-800 rounded-xl">
                                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                                <p className="text-xs text-amber-300">
                                    This order has been flagged for review.
                                    Please show your receipt at the counter.
                                </p>
                            </div>
                        )}

                        <Link
                            href="/"
                            className="block w-full py-3 rounded-2xl bg-gray-800 border border-gray-700 text-center text-sm font-bold text-gray-300 hover:text-white hover:border-gray-600 transition-all"
                        >
                            Back to Home
                        </Link>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-xl border-b border-gray-800">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
                    <Link
                        href="/scan"
                        className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/40">
                            <ShoppingCart className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h1 className="text-sm font-black">Self Checkout</h1>
                            <p className="text-[10px] text-gray-500">
                                Review & Pay
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
                {loading ? (
                    <div className="flex items-center justify-center py-20 gap-3 text-gray-500">
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                        <span>Loading your items...</span>
                    </div>
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                        <Package className="w-16 h-16 text-gray-700" />
                        <h2 className="text-lg font-bold text-gray-400">
                            No items to checkout
                        </h2>
                        <p className="text-sm text-gray-600">
                            Scan products first to add them to your cart
                        </p>
                        <Link
                            href="/scan"
                            className="flex items-center gap-2 px-5 py-3 bg-violet-600 rounded-2xl text-white font-bold hover:bg-violet-500 transition-all"
                        >
                            <ScanBarcode className="w-5 h-5" />
                            Go to Scanner
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* Items list */}
                        <div className="bg-gray-900 rounded-3xl border border-gray-800 overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-800">
                                <h3 className="text-sm font-bold text-white">
                                    Your Items (
                                    {items.reduce((s, i) => s + i.qty, 0)})
                                </h3>
                            </div>
                            <div className="divide-y divide-gray-800">
                                {items.map((item) => {
                                    const discountedPrice =
                                        item.price *
                                        (1 - item.discount / 100);
                                    return (
                                        <div
                                            key={item._id}
                                            className="flex items-center gap-3 px-4 py-3"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-gray-800 overflow-hidden flex items-center justify-center shrink-0">
                                                {item.image ? (
                                                    <img
                                                        src={item.image}
                                                        alt={item.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <Package className="w-4 h-4 text-gray-600" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-white truncate">
                                                    {item.name}
                                                </p>
                                                <p className="text-[10px] text-gray-500">
                                                    ₹
                                                    {discountedPrice.toFixed(2)}{" "}
                                                    each
                                                    {item.discount > 0 && (
                                                        <span className="text-orange-400 ml-1">
                                                            ({item.discount}%
                                                            off)
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1 bg-gray-800 rounded-lg px-1.5 py-1 border border-gray-700">
                                                <button
                                                    onClick={() =>
                                                        setQty(
                                                            item._id,
                                                            item.qty - 1
                                                        )
                                                    }
                                                    className="text-gray-400 hover:text-emerald-400 cursor-pointer"
                                                >
                                                    <Minus className="w-3 h-3" />
                                                </button>
                                                <span className="text-xs font-bold text-white w-5 text-center">
                                                    {item.qty}
                                                </span>
                                                <button
                                                    onClick={() =>
                                                        setQty(
                                                            item._id,
                                                            item.qty + 1
                                                        )
                                                    }
                                                    className="text-gray-400 hover:text-emerald-400 cursor-pointer"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                </button>
                                            </div>
                                            <span className="text-xs font-extrabold text-emerald-400 w-14 text-right shrink-0">
                                                ₹
                                                {(
                                                    discountedPrice * item.qty
                                                ).toFixed(0)}
                                            </span>
                                            <button
                                                onClick={() =>
                                                    removeItem(item._id)
                                                }
                                                className="text-gray-600 hover:text-red-400 cursor-pointer"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Payment method */}
                        <div className="bg-gray-900 rounded-3xl border border-gray-800 p-4 space-y-3">
                            <h3 className="text-sm font-bold text-white">
                                Payment Method
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setPaymentMethod("UPI")}
                                    className={`flex items-center justify-center gap-2 py-3 rounded-2xl border text-sm font-bold transition-all cursor-pointer ${
                                        paymentMethod === "UPI"
                                            ? "bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-900"
                                            : "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500"
                                    }`}
                                >
                                    <Smartphone className="w-4 h-4" />
                                    UPI
                                </button>
                                <button
                                    onClick={() => setPaymentMethod("CARD")}
                                    className={`flex items-center justify-center gap-2 py-3 rounded-2xl border text-sm font-bold transition-all cursor-pointer ${
                                        paymentMethod === "CARD"
                                            ? "bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-900"
                                            : "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500"
                                    }`}
                                >
                                    <CreditCard className="w-4 h-4" />
                                    Card
                                </button>
                            </div>
                        </div>

                        {/* Total & Pay */}
                        <div className="bg-gray-900 rounded-3xl border border-gray-800 p-4 space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400 text-sm">
                                    Total
                                </span>
                                <span className="text-2xl font-black text-emerald-400">
                                    ₹{subtotal.toFixed(2)}
                                </span>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-red-900/30 border border-red-800 rounded-xl">
                                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                                    <p className="text-xs text-red-300 flex-1">
                                        {error}
                                    </p>
                                    <button
                                        onClick={() => setError(null)}
                                        className="text-red-400 cursor-pointer"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            )}

                            <button
                                onClick={handleCheckout}
                                disabled={submitting || items.length === 0}
                                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-base hover:from-emerald-400 hover:to-teal-400 transition-all shadow-2xl shadow-emerald-900/50 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-5 h-5" />
                                        Pay ₹{subtotal.toFixed(2)}
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
