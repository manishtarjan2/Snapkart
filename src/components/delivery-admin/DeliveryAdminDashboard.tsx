"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import {
    Truck, Users, MapPin, Activity, LogOut, RefreshCw,
    CheckCircle, XCircle, ChevronRight, PlusCircle, Search,
    AlertTriangle, Navigation, ToggleLeft, ToggleRight, Loader2, ShieldCheck
} from "lucide-react";

interface DeliveryBoyDoc {
    _id: string;
    name: string;
    phone: string;
    vehicleType: string;
    vehicleNumber?: string;
    status: "available" | "busy" | "offline";
    totalDeliveries: number;
    liveLocation?: { coordinates: [number, number] };
    store_id?: { name: string } | string;
}

interface DeliveryDoc {
    _id: string;
    order_id: { _id: string; totalAmount: number; type: string } | string;
    delivery_boy_id: { name: string; phone: string } | string;
    status: string;
    fraudFlag: boolean;
    createdAt: string;
    liveLocation?: { coordinates: [number, number] };
}

const NAV = [
    { id: "boys", label: "Delivery Boys", icon: Users },
    { id: "tracking", label: "Live Tracking", icon: MapPin },
    { id: "assign", label: "Assign Orders", icon: Truck },
];

const STATUS_COLORS: Record<string, string> = {
    available: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    busy: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    offline: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const DELIVERY_STATUS_COLORS: Record<string, string> = {
    assigned: "bg-blue-500/20 text-blue-300",
    pickedUp: "bg-violet-500/20 text-violet-300",
    outForDelivery: "bg-amber-500/20 text-amber-300",
    delivered: "bg-emerald-500/20 text-emerald-300",
    failed: "bg-red-500/20 text-red-300",
};

export default function DeliveryAdminDashboard() {
    const { data: session } = useSession();
    const [active, setActive] = useState("boys");
    const [boys, setBoys] = useState<DeliveryBoyDoc[]>([]);
    const [deliveries, setDeliveries] = useState<DeliveryDoc[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [notification, setNotification] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

    // Add boy form
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ userId: "", name: "", phone: "", vehicleType: "bike", vehicleNumber: "" });
    const [saving, setSaving] = useState(false);

    // Assign form
    const [assignOrderId, setAssignOrderId] = useState("");
    const [assigning, setAssigning] = useState(false);

    const notify = (msg: string, type: "ok" | "err" = "ok") => {
        setNotification({ msg, type }); setTimeout(() => setNotification(null), 3500);
    };

    const loadBoys = useCallback(async () => {
        const res = await fetch("/api/delivery-admin/tracking");
        const data = await res.json();
        setBoys(Array.isArray(data.boys) ? data.boys : []);
        setDeliveries(Array.isArray(data.deliveries) ? data.deliveries : []);
    }, []);

    const refresh = useCallback(async () => {
        setLoading(true);
        try { await loadBoys(); }
        finally { setLoading(false); }
    }, [loadBoys]);

    useEffect(() => { refresh(); }, [refresh]);

    // ── Add delivery boy ─────────────────────────────────────────────────────
    const handleAddBoy = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true);
        try {
            const res = await fetch("/api/delivery-admin/tracking", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "addBoy", ...form }),
            });
            if (!res.ok) throw new Error((await res.json()).message);
            notify("Delivery boy added ✓");
            setShowForm(false);
            setForm({ userId: "", name: "", phone: "", vehicleType: "bike", vehicleNumber: "" });
            loadBoys();
        } catch (err: unknown) { notify(err instanceof Error ? err.message : "Error", "err"); }
        finally { setSaving(false); }
    };

    // ── Toggle suspend ────────────────────────────────────────────────────────
    const toggleSuspend = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === "offline" ? "available" : "offline";
        const res = await fetch("/api/delivery-admin/tracking", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ boyId: id, status: newStatus }),
        });
        if (!res.ok) { notify("Failed to update", "err"); return; }
        notify(`Status set to ${newStatus} ✓`);
        setBoys((prev) => prev.map((b) => b._id === id ? { ...b, status: newStatus as DeliveryBoyDoc["status"] } : b));
    };

    // ── Assign order ─────────────────────────────────────────────────────────
    const handleAssign = async () => {
        if (!assignOrderId.trim()) { notify("Enter an order ID", "err"); return; }
        setAssigning(true);
        try {
            const res = await fetch("/api/delivery-admin/assign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: assignOrderId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            notify(`Order assigned! OTP: ${data.otp ?? "—"}`);
            setAssignOrderId("");
            loadBoys();
        } catch (err: unknown) { notify(err instanceof Error ? err.message : "Error", "err"); }
        finally { setAssigning(false); }
    };

    const filteredBoys = boys.filter((b) =>
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.phone.includes(search)
    );

    const availableCount = boys.filter((b) => b.status === "available").length;
    const busyCount = boys.filter((b) => b.status === "busy").length;
    const offlineCount = boys.filter((b) => b.status === "offline").length;

    return (
        <div className="min-h-screen flex bg-[#1a0f0a] text-white font-sans">
            {/* Sidebar */}
            <aside className="w-60 min-h-screen bg-[#1f1208] border-r border-white/[0.06] flex flex-col fixed left-0 top-0 z-30">
                <div className="px-5 py-5 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center"><Truck size={17} className="text-white" /></div>
                        <div><p className="font-bold text-sm">Snapkart</p><p className="text-[10px] text-orange-400 uppercase tracking-widest">Delivery Admin</p></div>
                    </div>
                </div>
                <div className="px-4 py-3 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04]">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-xs font-bold">{session?.user?.name?.[0]?.toUpperCase() ?? "D"}</div>
                        <div className="overflow-hidden"><p className="text-xs font-semibold truncate">{session?.user?.name}</p><p className="text-[10px] text-slate-400">Delivery Admin</p></div>
                    </div>
                </div>
                <nav className="flex-1 px-3 py-4 space-y-1">
                    {NAV.map(({ id, label, icon: Icon }) => (
                        <button key={id} onClick={() => setActive(id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active === id ? "bg-orange-500/20 text-orange-300 border border-orange-500/20" : "text-slate-400 hover:text-white hover:bg-white/[0.05]"}`}>
                            <Icon size={15} />{label}{active === id && <ChevronRight size={13} className="ml-auto" />}
                        </button>
                    ))}
                </nav>
                <div className="px-3 py-4 border-t border-white/[0.06] space-y-1">
                    <Link href="/admin-portal" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-white/[0.05] transition-colors font-medium">
                        <ShieldCheck size={15} />Admin Portal Hub
                    </Link>
                    <button onClick={() => signOut({ callbackUrl: "/admin-login" })} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors"><LogOut size={15} />Sign Out</button>
                </div>
            </aside>

            {/* Main */}
            <main className="ml-60 flex-1 min-h-screen">
                <header className="sticky top-0 z-20 bg-[#1a0f0a]/80 backdrop-blur-xl border-b border-white/[0.06] px-8 py-4 flex items-center justify-between">
                    <div><h1 className="text-lg font-bold">{NAV.find((n) => n.id === active)?.label}</h1><p className="text-xs text-slate-500">Logistics Control · Snapkart</p></div>
                    <div className="flex items-center gap-3">
                        <button onClick={refresh} className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08]"><RefreshCw size={14} className={loading ? "animate-spin text-orange-400" : "text-slate-400"} /></button>
                        {active === "boys" && <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-xl text-xs font-semibold transition-colors"><PlusCircle size={14} />Add Boy</button>}
                    </div>
                </header>

                {notification && (
                    <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-xl border ${notification.type === "ok" ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300" : "bg-red-500/20 border-red-500/30 text-red-300"}`}>
                        {notification.type === "ok" ? <CheckCircle size={14} /> : <XCircle size={14} />}{notification.msg}
                    </div>
                )}

                <div className="p-8 space-y-6">

                    {/* ══ DELIVERY BOYS ══════════════════════════════════════════════════ */}
                    {active === "boys" && (
                        <div className="space-y-5">
                            {/* KPI row */}
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { label: "Available", value: availableCount, color: "emerald" },
                                    { label: "Busy", value: busyCount, color: "amber" },
                                    { label: "Offline", value: offlineCount, color: "slate" },
                                ].map(({ label, value, color }) => (
                                    <div key={label} className={`rounded-2xl bg-${color}-500/[0.06] border border-${color}-500/20 p-5 text-center`}>
                                        <p className={`text-3xl font-bold text-${color}-400`}>{value}</p>
                                        <p className="text-xs text-slate-400 mt-1">{label}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Search + list */}
                            <div className="rounded-2xl bg-[#1f1208] border border-white/[0.06] p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-sm font-semibold flex items-center gap-2"><Users size={14} className="text-orange-400" />All Riders <span className="text-[10px] bg-orange-500/15 text-orange-300 px-2 py-0.5 rounded-full border border-orange-500/20 ml-1">{boys.length}</span></h2>
                                    <div className="relative"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input type="text" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="bg-white/[0.04] border border-white/[0.08] rounded-lg pl-8 pr-3 py-2 text-xs placeholder-slate-600 focus:outline-none w-40" /></div>
                                </div>
                                <div className="space-y-2">
                                    {filteredBoys.map((boy) => (
                                        <div key={boy._id} className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-orange-500/20 transition-all">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center font-bold text-sm shrink-0">{boy.name[0].toUpperCase()}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold">{boy.name}</p>
                                                <p className="text-xs text-slate-400">{boy.phone} · {boy.vehicleType}{boy.vehicleNumber ? ` · ${boy.vehicleNumber}` : ""}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[boy.status]}`}>{boy.status}</span>
                                                <p className="text-[10px] text-slate-500 mt-0.5">{boy.totalDeliveries} deliveries</p>
                                            </div>
                                            <button onClick={() => toggleSuspend(boy._id, boy.status)}
                                                className={`p-2 rounded-lg transition-colors ${boy.status === "offline" ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25" : "bg-red-500/15 text-red-400 hover:bg-red-500/25"}`}>
                                                {boy.status === "offline" ? <ToggleLeft size={15} /> : <ToggleRight size={15} />}
                                            </button>
                                            {boy.liveLocation && (
                                                <a href={`https://www.google.com/maps?q=${boy.liveLocation.coordinates[1]},${boy.liveLocation.coordinates[0]}`} target="_blank" rel="noreferrer"
                                                    className="p-2 rounded-lg bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-colors">
                                                    <Navigation size={15} />
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                    {filteredBoys.length === 0 && <p className="text-center text-slate-500 text-sm py-6">No delivery boys found</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ══ LIVE TRACKING ═════════════════════════════════════════════════ */}
                    {active === "tracking" && (
                        <div className="rounded-2xl bg-[#1f1208] border border-white/[0.06] p-6">
                            <h2 className="text-sm font-semibold mb-5 flex items-center gap-2"><Activity size={14} className="text-orange-400" />Active Deliveries</h2>
                            <div className="space-y-3">
                                {deliveries.filter((d) => d.status !== "delivered").map((d) => {
                                    const boy = typeof d.delivery_boy_id === "object" ? d.delivery_boy_id : null;
                                    const order = typeof d.order_id === "object" ? d.order_id : null;
                                    return (
                                        <div key={d._id} className={`p-4 rounded-xl border ${d.fraudFlag ? "bg-red-500/5 border-red-500/25" : "bg-white/[0.02] border-white/[0.05]"}`}>
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="text-xs font-semibold flex items-center gap-2">
                                                        Delivery #{d._id.slice(-7).toUpperCase()}
                                                        {d.fraudFlag && <span className="bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle size={9} />Flagged</span>}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">Rider: {boy?.name ?? "—"} · {boy?.phone ?? ""}</p>
                                                    {order && <p className="text-[10px] text-slate-400">Order: ₹{order.totalAmount} · {order.type}</p>}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${DELIVERY_STATUS_COLORS[d.status] ?? "bg-slate-500/20 text-slate-300"}`}>{d.status}</span>
                                                    {d.liveLocation && (
                                                        <a href={`https://www.google.com/maps?q=${d.liveLocation.coordinates[1]},${d.liveLocation.coordinates[0]}`} target="_blank" rel="noreferrer"
                                                            className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-colors">
                                                            <Navigation size={12} />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {deliveries.filter((d) => d.status !== "delivered").length === 0 && (
                                    <p className="text-center text-slate-500 text-sm py-8">No active deliveries right now</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ══ ASSIGN ORDERS ═════════════════════════════════════════════════ */}
                    {active === "assign" && (
                        <div className="space-y-6">
                            <div className="rounded-2xl bg-[#1f1208] border border-white/[0.06] p-6 max-w-lg">
                                <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><Truck size={14} className="text-orange-400" />Auto-Assign Delivery Boy</h2>
                                <p className="text-xs text-slate-400 mb-4">The system will automatically find the nearest available rider to the order's store using geospatial search.</p>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1.5">Order ID</label>
                                        <input type="text" placeholder="Paste full Order ID…" value={assignOrderId} onChange={(e) => setAssignOrderId(e.target.value)}
                                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-orange-500/40 font-mono" />
                                    </div>
                                    <button onClick={handleAssign} disabled={assigning}
                                        className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                                        {assigning ? <><Loader2 size={14} className="animate-spin" />Assigning…</> : <><Truck size={14} />Auto-Assign Nearest Rider</>}
                                    </button>
                                </div>
                            </div>

                            {/* Performance table */}
                            <div className="rounded-2xl bg-[#1f1208] border border-white/[0.06] p-6">
                                <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><Activity size={14} className="text-orange-400" />Rider Performance</h2>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-xs text-slate-500 border-b border-white/[0.05]">
                                            <th className="text-left pb-3 font-medium">Rider</th>
                                            <th className="text-left pb-3 font-medium">Vehicle</th>
                                            <th className="text-left pb-3 font-medium">Status</th>
                                            <th className="text-right pb-3 font-medium">Deliveries</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.04]">
                                        {boys.sort((a, b) => b.totalDeliveries - a.totalDeliveries).map((boy) => (
                                            <tr key={boy._id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="py-3 pr-4">
                                                    <p className="font-medium text-sm">{boy.name}</p>
                                                    <p className="text-[10px] text-slate-400">{boy.phone}</p>
                                                </td>
                                                <td className="py-3 pr-4 text-xs text-slate-400 capitalize">{boy.vehicleType}</td>
                                                <td className="py-3 pr-4">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[boy.status]}`}>{boy.status}</span>
                                                </td>
                                                <td className="py-3 text-right font-bold text-orange-300">{boy.totalDeliveries}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Add Boy Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#1f1208] border border-white/[0.08] rounded-2xl w-full max-w-md">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
                            <h2 className="text-sm font-semibold">Add Delivery Boy</h2>
                            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white"><XCircle size={18} /></button>
                        </div>
                        <form onSubmit={handleAddBoy} className="px-6 py-5 space-y-4">
                            {[
                                { key: "userId", label: "User ID (from users table)", type: "text", ph: "Mongo ObjectId" },
                                { key: "name", label: "Full Name", type: "text", ph: "Raju Kumar" },
                                { key: "phone", label: "Phone Number", type: "tel", ph: "9876543210" },
                                { key: "vehicleNumber", label: "Vehicle Number (optional)", type: "text", ph: "MH12AB1234" },
                            ].map(({ key, label, type, ph }) => (
                                <div key={key}>
                                    <label className="block text-[10px] text-slate-400 mb-1">{label}</label>
                                    <input type={type} placeholder={ph} value={form[key as keyof typeof form]}
                                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-orange-500/40" />
                                </div>
                            ))}
                            <div>
                                <label className="block text-[10px] text-slate-400 mb-1">Vehicle Type</label>
                                <select value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
                                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/40">
                                    {["bike", "scooter", "bicycle", "car", "van"].map((v) => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-slate-400 text-sm hover:bg-white/[0.05] transition-colors">Cancel</button>
                                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                                    {saving ? <><Loader2 size={14} className="animate-spin" />Saving…</> : <><PlusCircle size={14} />Add Rider</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
