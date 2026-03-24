"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Bike, CheckCircle, Clock, MapPin, Package, IndianRupee,
    ToggleLeft, ToggleRight, Star, Loader2, RotateCcw,
    Phone, Navigation, ShoppingBag, AlertCircle, ChevronDown,
    ChevronUp,
} from "lucide-react";

type OrderItem = { name: string; price: number; quantity: number; image?: string };
type Order = {
    _id: string;
    userId: { name: string; mobile: string } | null;
    items: OrderItem[];
    address: { fullName: string; phone: string; street: string; city: string; state: string; pincode: string };
    totalAmount: number;
    paymentMethod: string;
    orderStatus: string;
    createdAt: string;
};

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
            className={`fixed bottom-6 right-6 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl text-sm font-semibold text-white ${type === "success" ? "bg-emerald-600" : "bg-red-500"}`}
        >
            {type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {msg}
        </motion.div>
    );
}

export default function DeliveryBoy() {
    const [online, setOnline] = useState(false);
    const [orders, setOrders] = useState<Order[]>([]);
    const [delivered, setDelivered] = useState<Order[]>([]);
    const [earnings, setEarnings] = useState(0);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
    const [expanded, setExpanded] = useState<string | null>(null);

    const showToast = (msg: string, type: "success" | "error") => {
        setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
    };

    const loadOrders = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/delivery/orders");
            if (!res.ok) throw new Error();
            const data: Order[] = await res.json();
            setOrders(data);
        } catch {
            showToast("Failed to load orders", "error");
        } finally { setLoading(false); }
    };

    useEffect(() => { loadOrders(); }, []);

    const markDelivered = async (order: Order) => {
        if (!online) { showToast("Go online first!", "error"); return; }
        setUpdating(order._id);
        try {
            const res = await fetch("/api/delivery/orders", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: order._id, orderStatus: "delivered" }),
            });
            if (!res.ok) throw new Error();
            setOrders((p) => p.filter((o) => o._id !== order._id));
            setDelivered((p) => [{ ...order, orderStatus: "delivered" }, ...p]);
            setEarnings((e) => e + order.totalAmount);
            showToast(`₹${order.totalAmount} earned! Delivered to ${order.address.fullName} 🎉`, "success");
        } catch { showToast("Update failed", "error"); }
        finally { setUpdating(null); }
    };

    const markOutForDelivery = async (orderId: string) => {
        if (!online) { showToast("Go online first!", "error"); return; }
        setUpdating(orderId);
        try {
            const res = await fetch("/api/delivery/orders", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: orderId, orderStatus: "outForDelivery" }),
            });
            if (!res.ok) throw new Error();
            setOrders((p) => p.map((o) => o._id === orderId ? { ...o, orderStatus: "outForDelivery" } : o));
            showToast("Marked as Out for Delivery!", "success");
        } catch { showToast("Update failed", "error"); }
        finally { setUpdating(null); }
    };

    const totalDelivered = delivered.length;
    const pendingCount = orders.length;

    return (
        <>
            <div className="px-4 py-6 max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                            🛵 Delivery Dashboard
                        </h2>
                        <p className="text-gray-400 text-sm mt-0.5">Manage your deliveries in real-time</p>
                    </div>
                    {/* Online/Offline toggle */}
                    <button
                        onClick={() => { setOnline((v) => !v); showToast(online ? "You are now Offline" : "You are now Online! 🟢", online ? "error" : "success"); }}
                        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border-2 font-bold text-sm transition-all duration-300 cursor-pointer ${online
                            ? "bg-emerald-50 border-emerald-400 text-emerald-700 shadow-lg shadow-emerald-100"
                            : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300"
                            }`}
                    >
                        {online
                            ? <><ToggleRight className="w-5 h-5 text-emerald-500" /><span>Online</span><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /></>
                            : <><ToggleLeft className="w-5 h-5 text-gray-400" />Offline</>}
                    </button>
                </motion.div>

                {/* Earnings hero */}
                <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                    className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 rounded-3xl p-6 text-white shadow-xl shadow-emerald-200">
                    <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                    <p className="text-emerald-100 text-sm font-medium mb-1">Today's Earnings</p>
                    <p className="text-4xl font-black mb-1">₹{earnings.toLocaleString("en-IN")}</p>
                    <div className="flex items-center gap-1 text-emerald-200 text-sm">
                        <Star className="w-4 h-4 fill-yellow-300 text-yellow-300" />
                        <span className="font-semibold text-white">4.9</span>
                        <span>· {totalDelivered} delivered today</span>
                    </div>
                </motion.div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { icon: Clock, label: "Pending", value: pendingCount, bg: "bg-amber-50", border: "border-amber-100", iconColor: "text-amber-500" },
                        { icon: CheckCircle, label: "Delivered", value: totalDelivered, bg: "bg-emerald-50", border: "border-emerald-100", iconColor: "text-emerald-500" },
                        { icon: IndianRupee, label: "Earnings", value: `₹${earnings}`, bg: "bg-blue-50", border: "border-blue-100", iconColor: "text-blue-500" },
                    ].map((card, i) => (
                        <motion.div key={card.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                            className={`${card.bg} ${card.border} border rounded-2xl p-4 text-center`}>
                            <card.icon className={`w-5 h-5 ${card.iconColor} mx-auto mb-1.5`} />
                            <p className="text-2xl font-extrabold text-gray-900">{card.value}</p>
                            <p className="text-xs text-gray-500 font-medium">{card.label}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Pending Orders */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-500" />
                            Pending Deliveries
                            {pendingCount > 0 && <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{pendingCount}</span>}
                        </h3>
                        <button onClick={loadOrders} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors">
                            <RotateCcw className="w-4 h-4" />
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-10 gap-3 text-gray-400">
                            <Loader2 className="w-5 h-5 animate-spin text-emerald-500" /> Loading orders...
                        </div>
                    ) : !online ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center gap-3 text-gray-400 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                            <ToggleLeft className="w-10 h-10 text-gray-300" />
                            <p className="font-semibold text-gray-500">You are Offline</p>
                            <p className="text-sm max-w-xs">Go online to start receiving and managing delivery orders.</p>
                            <button onClick={() => setOnline(true)}
                                className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200">
                                Go Online Now 🟢
                            </button>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center gap-2 text-gray-400 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                            <ShoppingBag className="w-10 h-10 text-gray-200" />
                            <p className="font-semibold text-gray-500">No pending orders</p>
                            <p className="text-sm">New orders will appear here automatically.</p>
                        </div>
                    ) : (
                        <AnimatePresence>
                            {orders.map((order, i) => {
                                const isExpanded = expanded === order._id;
                                const isUpdating = updating === order._id;
                                const isOutForDelivery = order.orderStatus === "outForDelivery";
                                return (
                                    <motion.div key={order._id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 80 }} transition={{ delay: i * 0.05 }}
                                        className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${isOutForDelivery ? "border-amber-300 shadow-amber-100" : "border-gray-100"}`}>
                                        <div className="p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                        <span className="font-bold text-gray-800 text-sm">
                                                            #{order._id.slice(-7).toUpperCase()}
                                                        </span>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isOutForDelivery ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                                                            {isOutForDelivery ? "Out for Delivery" : "Ready to Pick"}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                                        <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                                                        {order.address.fullName} · {order.address.city}
                                                    </p>
                                                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                        <Phone className="w-3 h-3 text-gray-300 shrink-0" />
                                                        {order.address.phone}
                                                    </p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-lg font-extrabold text-gray-900">₹{order.totalAmount}</p>
                                                    <p className="text-[10px] text-gray-400">{order.paymentMethod}</p>
                                                </div>
                                            </div>

                                            {/* Items preview */}
                                            <div className="flex flex-wrap gap-1 mt-2 mb-3">
                                                {order.items.map((it, j) => (
                                                    <span key={j} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                                                        {it.name} ×{it.quantity}
                                                    </span>
                                                ))}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-2">
                                                {!isOutForDelivery && (
                                                    <button onClick={() => markOutForDelivery(order._id)} disabled={isUpdating}
                                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold hover:bg-amber-100 transition-all cursor-pointer disabled:opacity-50">
                                                        {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bike className="w-3.5 h-3.5" />}
                                                        Pick Up Order
                                                    </button>
                                                )}
                                                <button onClick={() => markDelivered(order)} disabled={isUpdating}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all cursor-pointer disabled:opacity-50 shadow-sm">
                                                    {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                                    Mark Delivered
                                                </button>
                                                <button onClick={() => setExpanded(isExpanded ? null : order._id)}
                                                    className="p-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-400 hover:text-gray-700 cursor-pointer transition-colors">
                                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Expanded address */}
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden border-t border-gray-100">
                                                    <div className="px-4 py-3 bg-gray-50 space-y-1.5">
                                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Delivery Address</p>
                                                        <p className="text-sm font-semibold text-gray-800">{order.address.fullName}</p>
                                                        <p className="text-xs text-gray-600">{order.address.street}</p>
                                                        <p className="text-xs text-gray-600">{order.address.city}, {order.address.state} — {order.address.pincode}</p>
                                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                                            <Phone className="w-3 h-3" /> {order.address.phone}
                                                        </p>
                                                        <a
                                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address.street + ", " + order.address.city + ", " + order.address.state)}`}
                                                            target="_blank" rel="noreferrer"
                                                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline mt-1">
                                                            <Navigation className="w-3 h-3" /> Open in Maps
                                                        </a>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    )}
                </div>

                {/* Completed deliveries */}
                {delivered.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            Completed Today
                            <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">{delivered.length}</span>
                        </h3>
                        <div className="space-y-2">
                            {delivered.map((order, i) => (
                                <motion.div key={order._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                                    className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                                    <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-800 truncate">
                                            {order.address.fullName} · {order.address.city}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {order.items.length} item{order.items.length !== 1 ? "s" : ""} · {order.paymentMethod}
                                        </p>
                                    </div>
                                    <span className="text-emerald-700 font-extrabold text-sm shrink-0">+₹{order.totalAmount}</span>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Toast */}
            <AnimatePresence>
                {toast && <Toast msg={toast.msg} type={toast.type} />}
            </AnimatePresence>
        </>
    );
}
