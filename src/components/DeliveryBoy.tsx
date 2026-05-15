"use client";

import React, { useState, useEffect, useRef } from "react";
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
    deliveryOtp?: string;
    createdAt: string;
};
type PendingRequest = {
    deliveryId: string;
    assignedAt: string;
    order: Order | null;
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
    const [initialStatusLoaded, setInitialStatusLoaded] = useState(false);
    const [orders, setOrders] = useState<Order[]>([]);
    const [delivered, setDelivered] = useState<Order[]>([]);
    const [earnings, setEarnings] = useState(0);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
    const [trackingEnabled, setTrackingEnabled] = useState(false);
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
    const [acceptingId, setAcceptingId] = useState<string | null>(null);
    const watchIdRef = useRef<number | null>(null);
    const prevPendingCountRef = useRef(0);
    const showToast = React.useCallback((msg: string, type: "success" | "error") => {
        setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
    }, []);

    const loadOrders = React.useCallback(async (showSpinner = true) => {
        if (showSpinner) setLoading(true);
        try {
            const res = await fetch("/api/delivery/orders");
            if (!res.ok) throw new Error();
            const data: Order[] = await res.json();
            setOrders(data);
        } catch {
            showToast("Failed to load orders", "error");
        } finally {
            if (showSpinner) setLoading(false);
        }
    }, [showToast]);

    // Fetch real status from the delivery settings endpoint on mount
    useEffect(() => {
        async function fetchStatus() {
            try {
                const res = await fetch("/api/delivery/settings");
                if (res.ok) {
                    const data = await res.json();
                    if (data.profile) {
                        const isOnline = data.profile.status === "available" || data.profile.status === "busy";
                        setOnline(isOnline);
                    }
                }
            } catch {
                // Ignore — just won't auto-set online
            } finally {
                setInitialStatusLoaded(true);
            }
        }
        fetchStatus();
    }, []);

    const loadPending = React.useCallback(async () => {
        try {
            const res = await fetch("/api/delivery/pending");
            if (!res.ok) return;
            const data: PendingRequest[] = await res.json();
            if (data.length > prevPendingCountRef.current && prevPendingCountRef.current >= 0) {
                try { new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Nk46KgHRqYF9oc4OQlpKMg3ZtZGFndIGOlZKNhHdtZGNnd4SOlZKLgnVqYmNpd4aRl5SMgnVqYGJpdoeSm5eQiH12bmZlbHeCjZaWkYt/dW1mZm14hI+Wl5KMgXdva2htdoOOlpeRi4B1bmtpbneFkJeXkouAdm5raW52hZCXl5KLgHZua2ludoWQl5eSi4B2b2tpb3aFkJeXkouAdm5raW52hZCXl5KLgHZua2ludoWQl5eSi4B2").play().catch(() => {}); } catch {}
            }
            prevPendingCountRef.current = data.length;
            setPendingRequests(data);
        } catch {}
    }, []);

    useEffect(() => {
        loadOrders();
        loadPending();
    }, [loadOrders, loadPending]);

    useEffect(() => {
        if (!online) return;
        const interval = window.setInterval(() => { loadOrders(false); loadPending(); }, 8000);
        loadOrders(); loadPending();
        return () => window.clearInterval(interval);
    }, [online, loadOrders, loadPending]);

    const toggleOnline = async () => {
        setStatusUpdating(true);
        try {
            const nextStatus = online ? "offline" : "available";
            const res = await fetch("/api/delivery/status", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: nextStatus }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Unable to update status");
            setOnline(!online);
            if (online && watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
                setTrackingEnabled(false);
            }
            showToast(data.message || `You are now ${nextStatus}` , "success");
        } catch (err: unknown) {
            showToast(err instanceof Error ? err.message : "Status update failed", "error");
        } finally {
            setStatusUpdating(false);
        }
    };

    useEffect(() => {
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, []);

    // Mark Delivered is handled exclusively via OTP verification

    const verifyOtp = async (order: Order) => {
        if (!online) { showToast("Go online first!", "error"); return; }
        const otp = otpInputs[order._id]?.trim();
        if (!otp) { showToast("Enter the OTP to verify", "error"); return; }
        setUpdating(order._id);
        try {
            const res = await fetch("/api/delivery/otp-verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: order._id, otp }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || "OTP verification failed");
            setOrders((p) => p.filter((o) => o._id !== order._id));
            setDelivered((p) => [{ ...order, orderStatus: "delivered" }, ...p]);
            setEarnings((e) => e + order.totalAmount);
            setOtpInputs((prev) => {
                const next = { ...prev };
                delete next[order._id];
                return next;
            });
            showToast(data.message || "Delivery confirmed!", "success");
        } catch (err: unknown) {
            showToast(err instanceof Error ? err.message : "Update failed", "error");
        } finally { setUpdating(null); }
    };

    const updateLocation = async (latitude: number, longitude: number) => {
        try {
            const res = await fetch("/api/delivery/location", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ latitude, longitude }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data?.message || "Location update failed");
            }
        } catch (err: unknown) {
            showToast(err instanceof Error ? err.message : "Location update failed", "error");
        }
    };

    const toggleTracking = () => {
        if (!online) { showToast("Go online before enabling live GPS.", "error"); return; }
        if (!navigator.geolocation) {
            showToast("Geolocation is not supported in your browser.", "error");
            return;
        }

        if (trackingEnabled) {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
            setTrackingEnabled(false);
            showToast("Live GPS tracking stopped", "success");
            return;
        }

        const id = navigator.geolocation.watchPosition(
            (position) => {
                updateLocation(position.coords.latitude, position.coords.longitude);
            },
            (error) => {
                showToast(error.message || "Unable to get location", "error");
                setTrackingEnabled(false);
            },
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
        );

        watchIdRef.current = id;
        setTrackingEnabled(true);
        showToast("Live GPS tracking enabled", "success");
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

    const handleAccept = async (deliveryId: string) => {
        setAcceptingId(deliveryId);
        try {
            const res = await fetch("/api/delivery/accept", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ deliveryId, action: "accept" }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to accept");
            showToast(data.message || "Order accepted!", "success");
            setPendingRequests((p) => p.filter((r) => r.deliveryId !== deliveryId));
            loadOrders();
        } catch (err: unknown) {
            showToast(err instanceof Error ? err.message : "Accept failed", "error");
        } finally { setAcceptingId(null); }
    };

    const handleReject = async (deliveryId: string) => {
        setAcceptingId(deliveryId);
        try {
            const res = await fetch("/api/delivery/accept", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ deliveryId, action: "reject" }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to reject");
            showToast("Order rejected — reassigning to another rider", "success");
            setPendingRequests((p) => p.filter((r) => r.deliveryId !== deliveryId));
        } catch (err: unknown) {
            showToast(err instanceof Error ? err.message : "Reject failed", "error");
        } finally { setAcceptingId(null); }
    };

    const totalDelivered = delivered.length;
    const pendingCount = orders.length;
    const incomingCount = pendingRequests.length;

    if (!initialStatusLoaded) {
        return (
            <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                <span className="text-sm font-medium">Loading dashboard...</span>
            </div>
        );
    }

    return (
        <>
            <div className="px-4 py-6 max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                            🛵 Delivery Dashboard
                        </h2>
                        <p className="text-gray-400 text-sm mt-0.5">Manage your deliveries in real-time</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Online/Offline toggle */}
                        <button
                            onClick={toggleOnline}
                            disabled={statusUpdating}
                            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border-2 font-bold text-sm transition-all duration-300 cursor-pointer ${online
                                ? "bg-emerald-50 border-emerald-400 text-emerald-700 shadow-lg shadow-emerald-100"
                                : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300"
                                } ${statusUpdating ? "opacity-70 cursor-wait" : ""}`}
                        >
                            {online
                                ? <><ToggleRight className="w-5 h-5 text-emerald-500" /><span>Online</span><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /></>
                                : <><ToggleLeft className="w-5 h-5 text-gray-400" />Offline</>}
                        </button>
                        <button
                            onClick={toggleTracking}
                            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border-2 font-bold text-sm transition-all duration-300 ${trackingEnabled
                                ? "bg-blue-50 border-blue-400 text-blue-700 shadow-lg shadow-blue-100"
                                : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300"
                                }`}
                        >
                            {trackingEnabled
                                ? <><MapPin className="w-5 h-5 text-blue-500" /><span>Tracking</span></>
                                : <><MapPin className="w-5 h-5 text-gray-400" /><span>Live GPS</span></>}
                        </button>
                    </div>
                </motion.div>

                {/* Earnings hero */}
                <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                    className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 rounded-3xl p-6 text-white shadow-xl shadow-emerald-200">
                    <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                    <p className="text-emerald-100 text-sm font-medium mb-1">Today&apos;s Earnings</p>
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

                {/* ══ INCOMING ORDER REQUESTS ════════════════════════════════ */}
                {online && pendingRequests.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                            <Package className="w-4 h-4 text-red-500 animate-pulse" />
                            Incoming Requests
                            <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">{incomingCount} new</span>
                        </h3>
                        <AnimatePresence>
                            {pendingRequests.map((req, i) => {
                                const order = req.order;
                                if (!order) return null;
                                const isProcessing = acceptingId === req.deliveryId;
                                return (
                                    <motion.div key={req.deliveryId} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, x: 80 }} transition={{ delay: i * 0.05 }}
                                        className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border-2 border-orange-300 shadow-lg shadow-orange-100 overflow-hidden">
                                        <div className="p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                                                    <span className="text-lg">🔔</span>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-orange-800">New Delivery Request</p>
                                                    <p className="text-[10px] text-orange-600">Accept within time to earn this delivery</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start justify-between gap-3 mb-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-gray-800">#{order._id.slice(-7).toUpperCase()}</p>
                                                    <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{order.address?.fullName} · {order.address?.city}</p>
                                                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />{order.address?.phone}</p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-lg font-extrabold text-gray-900">₹{order.totalAmount}</p>
                                                    <p className="text-[10px] text-gray-400">{order.paymentMethod}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-1 mb-3">
                                                {order.items?.map((it, j) => (
                                                    <span key={j} className="text-[10px] bg-white text-gray-600 px-2 py-0.5 rounded-full font-medium border border-gray-200">{it.name} ×{it.quantity}</span>
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleAccept(req.deliveryId)} disabled={isProcessing}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-all cursor-pointer disabled:opacity-50 shadow-md">
                                                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                                    Accept Order
                                                </button>
                                                <button onClick={() => handleReject(req.deliveryId)} disabled={isProcessing}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white border-2 border-red-200 text-red-600 text-sm font-bold hover:bg-red-50 transition-all cursor-pointer disabled:opacity-50">
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}

                {/* Pending Orders */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-500" />
                            Pending Deliveries
                            {pendingCount > 0 && <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{pendingCount}</span>}
                        </h3>
                        <button onClick={() => loadOrders()} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors">
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
                            <button onClick={toggleOnline}
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
                                                <button onClick={() => setExpanded(isExpanded ? null : order._id)}
                                                    className="p-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-400 hover:text-gray-700 cursor-pointer transition-colors">
                                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                </button>
                                            </div>

                                            {/* OTP verification — MANDATORY for all deliveries */}
                                            {isOutForDelivery && (
                                                <div className="mt-4 rounded-2xl border-2 border-amber-200 bg-amber-50 p-4">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <div className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center">
                                                            <span className="text-amber-600 text-sm">🔐</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-amber-800 font-bold">OTP Verification Required</p>
                                                            <p className="text-[10px] text-amber-600">Ask the customer for the delivery code</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col sm:flex-row gap-2">
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            maxLength={6}
                                                            placeholder="Enter 6-digit OTP"
                                                            value={otpInputs[order._id] || ""}
                                                            onChange={(e) => setOtpInputs((prev) => ({ ...prev, [order._id]: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                                                            className="flex-1 rounded-xl border-2 border-amber-300 bg-white px-4 py-3 text-base font-bold text-center text-slate-900 tracking-[0.3em] focus:outline-none focus:border-amber-500 placeholder:tracking-normal placeholder:font-normal placeholder:text-sm"
                                                        />
                                                        <button
                                                            onClick={() => verifyOtp(order)}
                                                            disabled={updating === order._id || (otpInputs[order._id] || "").length < 6}
                                                            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                                                        >
                                                            {updating === order._id ? "Verifying…" : "✓ Verify & Complete"}
                                                        </button>
                                                    </div>
                                                    <p className="text-[10px] text-amber-600 mt-2 text-center">Customer received this OTP in their order confirmation</p>
                                                </div>
                                            )}

                                            {/* Info: OTP will be needed after pickup */}
                                            {order.orderStatus === "confirmed" && (
                                                <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-3">
                                                    <p className="text-xs text-blue-700 font-semibold">📋 OTP verification will be required at delivery — pick up the order first.</p>
                                                </div>
                                            )}
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
