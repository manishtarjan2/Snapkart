"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
    Package, Truck, ArrowRight, RotateCcw, Clock, Check, X,
    AlertTriangle, ChevronDown, ChevronUp, ShoppingBag, MapPin,
    IndianRupee, Loader2, Ban, CheckCircle2, Info,
} from "lucide-react";

type OrderItem = {
    groceryId: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
};

type Order = {
    _id: string;
    items: OrderItem[];
    address?: {
        fullName: string;
        phone: string;
        street: string;
        city: string;
        state: string;
        pincode: string;
    };
    productTotal?: number;
    deliveryFee?: number;
    discountAmount?: number;
    totalAmount: number;
    paymentMethod: string;
    paymentStatus: string;
    orderStatus: string;
    type: string;
    deliveryOtp?: string;
    otpVerified?: boolean;
    refundStatus?: string;
    refundReason?: string;
    refundAmount?: number;
    createdAt: string;
    updatedAt: string;
};

const STATUS_LABELS: Record<string, { label: string; badge: string; icon: React.ReactNode }> = {
    placed: { label: "Placed", badge: "bg-slate-800 text-slate-200", icon: <Clock className="w-3.5 h-3.5" /> },
    pendingAcceptance: { label: "Finding Rider", badge: "bg-orange-800 text-orange-100", icon: <Truck className="w-3.5 h-3.5" /> },
    confirmed: { label: "Confirmed", badge: "bg-blue-800 text-blue-100", icon: <Check className="w-3.5 h-3.5" /> },
    outForDelivery: { label: "Out for delivery", badge: "bg-emerald-800 text-emerald-100", icon: <Truck className="w-3.5 h-3.5" /> },
    delivered: { label: "Delivered", badge: "bg-emerald-100 text-emerald-900", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    cancelled: { label: "Cancelled", badge: "bg-red-800 text-red-100", icon: <Ban className="w-3.5 h-3.5" /> },
    refunded: { label: "Refunded", badge: "bg-amber-800 text-amber-100", icon: <RotateCcw className="w-3.5 h-3.5" /> },
};

const REFUND_STATUS_LABELS: Record<string, { label: string; color: string }> = {
    none: { label: "", color: "" },
    requested: { label: "Refund Pending", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    approved: { label: "Refund Approved", color: "bg-green-100 text-green-800 border-green-200" },
    rejected: { label: "Refund Rejected", color: "bg-red-100 text-red-800 border-red-200" },
};

function formatDate(value?: string) {
    if (!value) return "-";
    return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function OrdersPage() {
    const { data: session, status: sessionStatus } = useSession();
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [refundModal, setRefundModal] = useState<string | null>(null);
    const [refundReason, setRefundReason] = useState("");
    const [refundLoading, setRefundLoading] = useState(false);
    const [refundMsg, setRefundMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        if (sessionStatus === "unauthenticated") {
            router.push("/login");
            return;
        }
        if (sessionStatus === "authenticated") {
            fetchOrders();
        }
    }, [sessionStatus]);

    const fetchOrders = async () => {
        try {
            const res = await fetch("/api/user/orders");
            if (res.ok) {
                const data = await res.json();
                setOrders(data);
            }
        } catch (err) {
            console.error("Failed to fetch orders:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleRefundRequest = async (orderId: string) => {
        setRefundLoading(true);
        setRefundMsg(null);
        try {
            const res = await fetch("/api/user/refund-request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId, reason: refundReason || "Customer requested return" }),
            });
            const data = await res.json();
            if (res.ok) {
                setRefundMsg({
                    type: "success",
                    text: data.note || data.message,
                });
                setRefundModal(null);
                setRefundReason("");
                await fetchOrders();
            } else {
                setRefundMsg({ type: "error", text: data.message || "Failed to request refund" });
            }
        } catch {
            setRefundMsg({ type: "error", text: "Something went wrong" });
        } finally {
            setRefundLoading(false);
        }
    };

    const canRequestRefund = (order: Order) => {
        return (
            order.orderStatus === "delivered" &&
            order.paymentStatus === "paid" &&
            (!order.refundStatus || order.refundStatus === "none")
        );
    };

    const getRefundableAmount = (order: Order) => {
        if (order.productTotal) return order.productTotal;
        return order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    };

    if (loading || sessionStatus === "loading") {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            <main className="pt-24 max-w-6xl mx-auto px-4 sm:px-6 pb-20">
                {/* Header pills */}
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-700 flex items-center justify-center text-white shadow-xl">
                            <Package className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm uppercase tracking-[0.35em] text-amber-300 font-semibold">Order history</p>
                            <h1 className="text-4xl font-black tracking-tight">My Orders</h1>
                            <p className="mt-2 text-gray-400 max-w-2xl">Review past purchases, track deliveries, and request returns.</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <a href="/track-order" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:border-emerald-500/30 hover:bg-emerald-500/10 transition-all">
                            <Truck className="w-4 h-4" />
                            Track a live order
                        </a>
                        <a href="/" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:border-cyan-500/30 hover:bg-cyan-500/10 transition-all">
                            <ShoppingBag className="w-4 h-4" />
                            Shop More
                        </a>
                    </div>
                </div>

                {/* Refund success/error banner */}
                {refundMsg && (
                    <div className={`mb-6 p-4 rounded-2xl border flex items-start gap-3 ${refundMsg.type === "success" ? "bg-emerald-950/50 border-emerald-500/30 text-emerald-300" : "bg-red-950/50 border-red-500/30 text-red-300"}`}>
                        {refundMsg.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />}
                        <div>
                            <p className="text-sm font-medium">{refundMsg.text}</p>
                            <button onClick={() => setRefundMsg(null)} className="text-xs underline mt-1 opacity-70 hover:opacity-100">Dismiss</button>
                        </div>
                    </div>
                )}

                {/* Orders grid */}
                <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-6">
                        <div className="rounded-3xl border border-white/10 bg-gray-900 p-6 shadow-2xl">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-bold">Your orders</h2>
                                    <p className="text-sm text-gray-400">Recent purchase history with status, delivery, and return options.</p>
                                </div>
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300">{orders.length} orders</span>
                            </div>
                        </div>

                        {orders.length === 0 ? (
                            <div className="rounded-3xl border border-dashed border-white/10 bg-gray-950/80 p-8 text-center text-gray-400">
                                <p className="text-base font-semibold">No orders yet.</p>
                                <p className="mt-2 text-sm text-gray-500">Once you place an order, it will appear here.</p>
                                <a href="/" className="mt-4 inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-2xl text-sm font-semibold hover:bg-emerald-500 transition-all">
                                    Start Shopping <ArrowRight className="w-4 h-4" />
                                </a>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {orders.map((order) => {
                                    const status = STATUS_LABELS[order.orderStatus || "placed"] ?? STATUS_LABELS.placed;
                                    const isExpanded = expandedOrder === order._id;
                                    const refundable = canRequestRefund(order);
                                    const refundableAmt = getRefundableAmount(order);
                                    const refStat = REFUND_STATUS_LABELS[order.refundStatus || "none"];

                                    return (
                                        <article key={order._id} className="rounded-3xl border border-white/10 bg-gray-950 shadow-2xl transition hover:border-emerald-500/20 overflow-hidden">
                                            {/* Order header */}
                                            <div className="p-6">
                                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                                    <div>
                                                        <p className="text-xs uppercase tracking-[0.35em] text-gray-400">Order ID</p>
                                                        <p className="mt-1 font-semibold text-white break-all text-sm">{order._id}</p>
                                                        <p className="text-xs text-gray-500 mt-1">{formatDate(order.createdAt)}</p>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${status.badge}`}>
                                                            {status.icon} {status.label}
                                                        </span>
                                                        {refStat.label && (
                                                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${refStat.color}`}>
                                                                <RotateCcw className="w-3 h-3" /> {refStat.label}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Price breakdown cards */}
                                                <div className="mt-5 grid gap-3 grid-cols-2 sm:grid-cols-4">
                                                    <div className="rounded-2xl border border-white/10 bg-gray-900 p-3">
                                                        <p className="text-[10px] uppercase tracking-wider text-gray-500">Products</p>
                                                        <p className="mt-1 text-base font-bold text-white">₹{(order.productTotal ?? order.items.reduce((s, i) => s + i.price * i.quantity, 0)).toFixed(0)}</p>
                                                    </div>
                                                    <div className="rounded-2xl border border-white/10 bg-gray-900 p-3">
                                                        <p className="text-[10px] uppercase tracking-wider text-gray-500">Delivery</p>
                                                        <p className="mt-1 text-base font-bold text-white">{(order.deliveryFee ?? 0) === 0 ? <span className="text-emerald-400">FREE</span> : `₹${order.deliveryFee}`}</p>
                                                    </div>
                                                    <div className="rounded-2xl border border-white/10 bg-gray-900 p-3">
                                                        <p className="text-[10px] uppercase tracking-wider text-gray-500">Discount</p>
                                                        <p className="mt-1 text-base font-bold text-emerald-400">{(order.discountAmount ?? 0) > 0 ? `-₹${order.discountAmount?.toFixed(0)}` : "—"}</p>
                                                    </div>
                                                    <div className="rounded-2xl border border-white/10 bg-gray-900 p-3">
                                                        <p className="text-[10px] uppercase tracking-wider text-gray-500">Total Paid</p>
                                                        <p className="mt-1 text-base font-bold text-white">₹{order.totalAmount.toFixed(0)}</p>
                                                    </div>
                                                </div>

                                                {/* Refund amount display */}
                                                {order.refundStatus === "approved" && order.refundAmount && (
                                                    <div className="mt-3 rounded-2xl bg-emerald-950/50 border border-emerald-500/20 p-4 flex items-start gap-3">
                                                        <IndianRupee className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                                                        <div>
                                                            <p className="text-sm font-semibold text-emerald-300">₹{order.refundAmount.toFixed(2)} refunded</p>
                                                            <p className="text-xs text-emerald-400/70 mt-1">
                                                                Only product cost is refunded. Delivery charges (₹{order.deliveryFee ?? 0}) and promotional discounts are non-refundable.
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}

                                                {order.refundStatus === "rejected" && (
                                                    <div className="mt-3 rounded-2xl bg-red-950/50 border border-red-500/20 p-4 flex items-start gap-3">
                                                        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                                        <div>
                                                            <p className="text-sm font-semibold text-red-300">Refund request rejected</p>
                                                            {order.refundReason && <p className="text-xs text-red-400/70 mt-1">Reason: {order.refundReason}</p>}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Delivery OTP — shown to customer */}
                                                {order.deliveryOtp && !order.otpVerified && ["confirmed", "outForDelivery", "pendingAcceptance"].includes(order.orderStatus) && (
                                                    <div className="mt-3 rounded-2xl bg-gradient-to-r from-amber-950/50 to-orange-950/50 border-2 border-amber-500/30 p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="text-lg">🔐</span>
                                                            <p className="text-sm font-bold text-amber-200">Your Delivery OTP</p>
                                                        </div>
                                                        <p className="text-3xl font-black tracking-[0.4em] text-white text-center py-2">{order.deliveryOtp}</p>
                                                        <p className="text-xs text-amber-400/80 text-center mt-1">Share this code with the delivery boy to confirm delivery</p>
                                                    </div>
                                                )}

                                                {order.otpVerified && (
                                                    <div className="mt-3 rounded-2xl bg-emerald-950/50 border border-emerald-500/20 p-3 flex items-center gap-2">
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                        <p className="text-sm text-emerald-300 font-semibold">Delivery verified with OTP ✓</p>
                                                    </div>
                                                )}

                                                {/* Action buttons */}
                                                <div className="mt-4 flex flex-wrap items-center gap-3">
                                                    <a
                                                        href={`/track-order?orderId=${order._id}`}
                                                        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:border-cyan-500/30 hover:bg-cyan-500/10 transition-all"
                                                    >
                                                        Track live <ArrowRight className="w-3 h-3" />
                                                    </a>

                                                    {refundable && (
                                                        <button
                                                            onClick={() => { setRefundModal(order._id); setRefundMsg(null); }}
                                                            className="inline-flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-300 hover:bg-amber-500/20 transition-all cursor-pointer"
                                                        >
                                                            <RotateCcw className="w-3.5 h-3.5" /> Return & Refund
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => setExpandedOrder(isExpanded ? null : order._id)}
                                                        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300 hover:bg-white/10 transition-all cursor-pointer"
                                                    >
                                                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                        {isExpanded ? "Hide" : "View"} Items
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Expanded items */}
                                            {isExpanded && (
                                                <div className="border-t border-white/5 bg-gray-900/50 px-6 py-4">
                                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Order Items</p>
                                                    <div className="space-y-2">
                                                        {order.items.map((item, idx) => (
                                                            <div key={idx} className="flex items-center gap-3 rounded-xl bg-gray-950/80 border border-white/5 p-3">
                                                                <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-800 shrink-0 flex items-center justify-center">
                                                                    {item.image ? (
                                                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <Package className="w-5 h-5 text-gray-600" />
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                                                                    <p className="text-xs text-gray-500">Qty: {item.quantity} × ₹{item.price.toFixed(0)}</p>
                                                                </div>
                                                                <p className="text-sm font-bold text-white shrink-0">₹{(item.price * item.quantity).toFixed(0)}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {order.address && (
                                                        <div className="mt-4 rounded-xl bg-gray-950/80 border border-white/5 p-3">
                                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                                <MapPin className="w-3.5 h-3.5" /> Delivery Address
                                                            </p>
                                                            <p className="text-sm text-gray-300">
                                                                {order.address.fullName}, {order.address.phone}<br />
                                                                {order.address.street}, {order.address.city}, {order.address.state} - {order.address.pincode}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <aside className="space-y-6">
                        <div className="rounded-3xl border border-white/10 bg-gray-900 p-6 shadow-2xl">
                            <h3 className="text-lg font-bold">Quick actions</h3>
                            <p className="mt-3 text-sm text-gray-400">Navigate across order management and live tracking.</p>
                            <div className="mt-6 space-y-3">
                                <a href="/track-order" className="block rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-semibold text-white hover:border-emerald-500/30 hover:bg-emerald-500/10 transition-all">
                                    Open live tracking page
                                </a>
                                <a href="/" className="block rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-semibold text-white hover:border-cyan-500/30 hover:bg-cyan-500/10 transition-all">
                                    Browse more products
                                </a>
                                <a href="/wishlist" className="block rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-semibold text-white hover:border-pink-500/30 hover:bg-pink-500/10 transition-all">
                                    View wishlist
                                </a>
                                <a href="/wallet" className="block rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-semibold text-white hover:border-amber-500/30 hover:bg-amber-500/10 transition-all">
                                    Wallet & rewards
                                </a>
                            </div>
                        </div>

                        {/* Refund Policy card */}
                        <div className="rounded-3xl border border-white/10 bg-gray-900 p-6 shadow-2xl">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
                                    <Info className="w-5 h-5" />
                                </div>
                                <h3 className="text-base font-bold">Refund Policy</h3>
                            </div>
                            <ul className="space-y-3 text-sm text-gray-400">
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                    <span>Product cost is fully refundable</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                    <span>Delivery charges are <b className="text-red-300">non-refundable</b></span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                    <span>Promotional discounts are <b className="text-red-300">non-refundable</b></span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <Clock className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                                    <span>Refunds are processed within 5-7 business days</span>
                                </li>
                            </ul>
                        </div>
                    </aside>
                </section>
            </main>

            {/* ─── Refund Request Modal ─── */}
            {refundModal && (() => {
                const order = orders.find((o) => o._id === refundModal);
                if (!order) return null;
                const refundableAmt = getRefundableAmount(order);

                return (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-gray-900 border border-white/10 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                                            <RotateCcw className="w-5 h-5 text-amber-400" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white">Request Return & Refund</h3>
                                    </div>
                                    <button onClick={() => { setRefundModal(null); setRefundReason(""); }} className="p-2 rounded-xl hover:bg-white/10 text-gray-400 cursor-pointer">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Refund breakdown */}
                                <div className="rounded-2xl bg-gray-950 border border-white/10 p-4 mb-5">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Refund Breakdown</p>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Product total</span>
                                            <span className="text-emerald-400 font-semibold">₹{refundableAmt.toFixed(2)} ✓</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Delivery charges</span>
                                            <span className="text-red-400 font-semibold line-through">₹{(order.deliveryFee ?? 0).toFixed(0)} ✕</span>
                                        </div>
                                        {(order.discountAmount ?? 0) > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Offer discount</span>
                                                <span className="text-red-400 font-semibold">Not refundable ✕</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between pt-2 border-t border-white/10 font-bold">
                                            <span className="text-white">You will receive</span>
                                            <span className="text-emerald-400 text-lg">₹{refundableAmt.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-5">
                                    <label className="block text-xs font-semibold text-gray-400 mb-2">Return Reason (optional)</label>
                                    <textarea
                                        value={refundReason}
                                        onChange={(e) => setRefundReason(e.target.value)}
                                        placeholder="e.g. Product damaged, wrong item delivered..."
                                        rows={3}
                                        className="w-full bg-gray-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-amber-500/50 resize-none"
                                    />
                                </div>

                                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 mb-5">
                                    <p className="text-xs text-amber-300 flex items-start gap-2">
                                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                        Delivery charges and promotional discounts will NOT be refunded. Only the product cost of ₹{refundableAmt.toFixed(2)} will be refunded.
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => { setRefundModal(null); setRefundReason(""); }}
                                        className="flex-1 py-3 rounded-2xl border border-white/10 text-gray-300 font-semibold hover:bg-white/5 transition-all cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleRefundRequest(order._id)}
                                        disabled={refundLoading}
                                        className="flex-1 py-3 rounded-2xl bg-amber-600 text-white font-semibold hover:bg-amber-500 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2"
                                    >
                                        {refundLoading ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                                        ) : (
                                            <><RotateCcw className="w-4 h-4" /> Submit Return</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
