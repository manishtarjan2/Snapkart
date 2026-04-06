"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Camera, Package, Plus, Minus, Trash2, ShoppingCart,
    ArrowLeft, Loader2, X, ScanBarcode, CheckCircle2,
    AlertTriangle, Search,
} from "lucide-react";
import Link from "next/link";

type ScannedItem = {
    _id: string;
    name: string;
    price: number;
    category: string;
    image?: string;
    description?: string;
    barcode?: string;
    stock: number;
    discount: number;
    unit?: string;
    brand?: string;
};

type CartItem = ScannedItem & { qty: number };

export default function SelfScanBarcode() {
    const [scanning, setScanning] = useState(false);
    const [manualCode, setManualCode] = useState("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [lastScanned, setLastScanned] = useState<ScannedItem | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    // Lookup product by barcode
    const lookupBarcode = useCallback(async (code: string) => {
        if (!code.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/user/scan?code=${encodeURIComponent(code.trim())}`);
            const data = await res.json();
            if (!res.ok) {
                setError(data.message || "Product not found");
                return;
            }
            setLastScanned(data);
            // Auto-add to cart
            addToCart(data);
            showToast(`✓ Added ${data.name}`);
        } catch {
            setError("Network error — please try again");
        } finally {
            setLoading(false);
        }
    }, []);

    const addToCart = (item: ScannedItem) => {
        setCart((prev) => {
            const existing = prev.find((i) => i._id === item._id);
            if (existing) {
                return prev.map((i) =>
                    i._id === item._id ? { ...i, qty: i.qty + 1 } : i
                );
            }
            return [...prev, { ...item, qty: 1 }];
        });
    };

    const setQty = (id: string, qty: number) => {
        if (qty <= 0) setCart((p) => p.filter((i) => i._id !== id));
        else setCart((p) => p.map((i) => (i._id === id ? { ...i, qty } : i)));
    };

    const removeItem = (id: string) => setCart((p) => p.filter((i) => i._id !== id));

    // Camera scanner using html5-qrcode
    const startCamera = useCallback(async () => {
        try {
            const { Html5Qrcode } = await import("html5-qrcode");
            const scanner = new Html5Qrcode("scanner-region");

            await scanner.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 150 } },
                (decodedText) => {
                    // On successful scan
                    lookupBarcode(decodedText);
                    // Brief pause to avoid rapid re-scans
                    scanner.pause();
                    setTimeout(() => {
                        try { scanner.resume(); } catch { }
                    }, 2000);
                },
                () => { /* ignore errors during scanning */ }
            );

            setScanning(true);

            // Store scanner ref for cleanup
            (window as any).__snapkartScanner = scanner;
        } catch (err) {
            console.error("Camera error:", err);
            setError("Could not access camera. Please check permissions or enter barcode manually.");
        }
    }, [lookupBarcode]);

    const stopCamera = useCallback(() => {
        try {
            const scanner = (window as any).__snapkartScanner;
            if (scanner) {
                scanner.stop().catch(() => { });
                delete (window as any).__snapkartScanner;
            }
        } catch { }
        setScanning(false);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, [stopCamera]);

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualCode.trim()) {
            lookupBarcode(manualCode.trim());
            setManualCode("");
        }
    };

    // Cart totals
    const subtotal = cart.reduce((sum, item) => {
        const discounted = item.price * (1 - (item.discount || 0) / 100);
        return sum + discounted * item.qty;
    }, 0);

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-xl border-b border-gray-800">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/"
                            className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-900/40">
                                <ScanBarcode className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h1 className="text-sm font-black">Self Scan</h1>
                                <p className="text-[10px] text-gray-500">Scan & Go</p>
                            </div>
                        </div>
                    </div>

                    {/* Cart count */}
                    {cart.length > 0 && (
                        <Link
                            href="/self-checkout"
                            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 rounded-xl text-sm font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/40"
                        >
                            <ShoppingCart className="w-4 h-4" />
                            <span>{cart.reduce((s, i) => s + i.qty, 0)}</span>
                            <span className="hidden sm:inline">· ₹{subtotal.toFixed(0)}</span>
                        </Link>
                    )}
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
                {/* Scanner area */}
                <div className="bg-gray-900 rounded-3xl border border-gray-800 overflow-hidden">
                    {/* Camera view */}
                    <div className="relative">
                        <div
                            id="scanner-region"
                            className={`w-full bg-black ${scanning ? "min-h-[280px]" : "h-0 overflow-hidden"}`}
                        />

                        {!scanning && (
                            <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-4">
                                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/30 flex items-center justify-center">
                                    <Camera className="w-10 h-10 text-violet-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Scan Product Barcode</h2>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Point your camera at a product barcode to scan it
                                    </p>
                                </div>
                                <button
                                    onClick={startCamera}
                                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl text-white font-bold hover:from-violet-500 hover:to-purple-500 transition-all shadow-xl shadow-violet-900/40 cursor-pointer active:scale-95"
                                >
                                    <Camera className="w-5 h-5" />
                                    Start Camera
                                </button>
                            </div>
                        )}

                        {scanning && (
                            <button
                                onClick={stopCamera}
                                className="absolute top-3 right-3 p-2 bg-black/60 backdrop-blur-sm rounded-xl text-white hover:bg-black/80 transition-all cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {/* Manual barcode entry */}
                    <div className="px-4 py-4 border-t border-gray-800">
                        <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
                            <div className="flex-1 flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5">
                                <Search className="w-4 h-4 text-gray-500 shrink-0" />
                                <input
                                    type="text"
                                    placeholder="Enter barcode manually..."
                                    value={manualCode}
                                    onChange={(e) => setManualCode(e.target.value)}
                                    className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-gray-600"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading || !manualCode.trim()}
                                className="px-4 py-2.5 bg-violet-600 rounded-xl text-sm font-bold text-white hover:bg-violet-500 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <ScanBarcode className="w-4 h-4" />
                                )}
                                Lookup
                            </button>
                        </form>
                    </div>
                </div>

                {/* Error message */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex items-center gap-3 px-4 py-3 bg-red-900/30 border border-red-800 rounded-2xl"
                        >
                            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                            <p className="text-sm text-red-300">{error}</p>
                            <button
                                onClick={() => setError(null)}
                                className="ml-auto text-red-400 hover:text-red-300 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Last scanned item */}
                <AnimatePresence>
                    {lastScanned && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-gray-900 rounded-2xl border border-emerald-800/50 p-4"
                        >
                            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2">
                                Last Scanned
                            </p>
                            <div className="flex items-center gap-3">
                                <div className="w-14 h-14 rounded-xl bg-gray-800 overflow-hidden flex items-center justify-center shrink-0">
                                    {lastScanned.image ? (
                                        <img
                                            src={lastScanned.image}
                                            alt={lastScanned.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <Package className="w-6 h-6 text-gray-600" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-white truncate">
                                        {lastScanned.name}
                                    </p>
                                    <p className="text-xs text-gray-500 capitalize">
                                        {lastScanned.category}
                                        {lastScanned.brand && ` · ${lastScanned.brand}`}
                                    </p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-lg font-black text-emerald-400">
                                        ₹{lastScanned.price}
                                    </p>
                                    {lastScanned.discount > 0 && (
                                        <p className="text-[10px] text-orange-400 font-semibold">
                                            {lastScanned.discount}% off
                                        </p>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Cart items */}
                {cart.length > 0 && (
                    <div className="bg-gray-900 rounded-3xl border border-gray-800 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                            <div className="flex items-center gap-2">
                                <ShoppingCart className="w-4 h-4 text-emerald-400" />
                                <h3 className="text-sm font-bold text-white">
                                    Scanned Items ({cart.reduce((s, i) => s + i.qty, 0)})
                                </h3>
                            </div>
                            <button
                                onClick={() => setCart([])}
                                className="text-xs text-red-400 hover:text-red-300 cursor-pointer font-semibold"
                            >
                                Clear All
                            </button>
                        </div>

                        <div className="divide-y divide-gray-800">
                            <AnimatePresence>
                                {cart.map((item) => {
                                    const discountedPrice =
                                        item.price * (1 - (item.discount || 0) / 100);
                                    return (
                                        <motion.div
                                            key={item._id}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            layout
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
                                                    ₹{discountedPrice.toFixed(2)} each
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1 bg-gray-800 rounded-lg px-1.5 py-1 border border-gray-700">
                                                <button
                                                    onClick={() => setQty(item._id, item.qty - 1)}
                                                    className="text-gray-400 hover:text-emerald-400 cursor-pointer"
                                                >
                                                    <Minus className="w-3 h-3" />
                                                </button>
                                                <span className="text-xs font-bold text-white w-5 text-center">
                                                    {item.qty}
                                                </span>
                                                <button
                                                    onClick={() => setQty(item._id, item.qty + 1)}
                                                    className="text-gray-400 hover:text-emerald-400 cursor-pointer"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                </button>
                                            </div>
                                            <span className="text-xs font-extrabold text-emerald-400 w-14 text-right shrink-0">
                                                ₹{(discountedPrice * item.qty).toFixed(0)}
                                            </span>
                                            <button
                                                onClick={() => removeItem(item._id)}
                                                className="text-gray-600 hover:text-red-400 cursor-pointer"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>

                        {/* Totals + checkout */}
                        <div className="px-4 py-4 border-t border-gray-800 space-y-3 bg-gray-900/80">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Subtotal</span>
                                <span className="font-bold text-white">₹{subtotal.toFixed(2)}</span>
                            </div>
                            <Link
                                href={`/self-checkout?items=${encodeURIComponent(JSON.stringify(cart.map((i) => ({ groceryId: i._id, quantity: i.qty }))))}`}
                                className="block w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-sm text-center hover:from-emerald-400 hover:to-teal-400 transition-all shadow-xl shadow-emerald-900/50 active:scale-[0.98]"
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Proceed to Self Checkout · ₹{subtotal.toFixed(0)}
                                </span>
                            </Link>
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {cart.length === 0 && !scanning && (
                    <div className="text-center py-8">
                        <p className="text-gray-600 text-sm">
                            Scan product barcodes to add them to your cart
                        </p>
                    </div>
                )}
            </div>

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 40 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl font-semibold text-sm flex items-center gap-2"
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        {toast}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hidden canvas for barcode processing */}
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
}
