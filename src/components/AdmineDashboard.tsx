"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import {
    Package, Users, TrendingUp, Plus, BarChart3,
    X, Upload, Trash2, Loader2, ImageIcon, CheckCircle2,
    AlertCircle, ClipboardList, Store, ShoppingBag,
    Search, RotateCcw, Receipt, Minus, IndianRupee,
    ExternalLink, LogOut, ChevronRight, Hash, Tag,
    Boxes, AlertTriangle, CheckCircle, XCircle, Bell,
} from "lucide-react";

// ──────────────── Types ────────────────────────────────────────
type GroceryItem = {
    _id: string; name: string; price: number; category: string;
    image?: string; description?: string; isActive: boolean;
    stock?: number; inStock?: boolean;
};
type OrderItem = {
    groceryId: string; name: string; price: number; quantity: number; image?: string;
};
type Order = {
    _id: string;
    userId: { name: string; email: string; mobile: string } | string;
    items: OrderItem[];
    address: { fullName: string; phone: string; street: string; city: string; state: string; pincode: string };
    totalAmount: number;
    paymentMethod: string;
    paymentStatus: string;
    orderStatus: string;
    createdAt: string;
};
type POSItem = GroceryItem & { qty: number };

const CATEGORIES = ["Fruits", "Vegetables", "Dairy", "Snacks", "Bakery", "Beverages", "Meat & Fish", "Other"];

const ORDER_STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
    placed: { label: "Placed", cls: "bg-blue-500/15 text-blue-300 border-blue-500/20" },
    confirmed: { label: "Confirmed", cls: "bg-violet-500/15 text-violet-300 border-violet-500/20" },
    outForDelivery: { label: "Out for Delivery", cls: "bg-amber-500/15 text-amber-300 border-amber-500/20" },
    delivered: { label: "Delivered", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20" },
    cancelled: { label: "Cancelled", cls: "bg-red-500/15 text-red-300 border-red-500/20" },
};

const NAV_ITEMS = [
    { id: "items", label: "Store Items", icon: Package },
    { id: "orders", label: "Orders", icon: ClipboardList },
    { id: "pos", label: "POS Billing", icon: Store },
] as const;
type TabId = typeof NAV_ITEMS[number]["id"];

// ──────────────── Notification Toast ──────────────────────────
function Notif({ msg, type }: { msg: string; type: "ok" | "err" }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-[100] flex items-center gap-2.5 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold text-white border ${type === "ok" ? "bg-emerald-600 border-emerald-500" : "bg-red-600 border-red-500"}`}
        >
            {type === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {msg}
        </motion.div>
    );
}

// ──────────────── Stock Badge ──────────────────────────────────
function StockBadge({ stock, inStock }: { stock?: number; inStock?: boolean }) {
    const qty = stock ?? 0;
    if (!inStock || qty === 0)
        return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">Out of Stock</span>;
    if (qty <= 10)
        return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/20">Low: {qty}</span>;
    return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">{qty} in stock</span>;
}

// ──────────────── Add Item Modal ───────────────────────────────
function AddItemModal({ onClose, onAdded }: { onClose: () => void; onAdded: (i: GroceryItem) => void }) {
    const [form, setForm] = useState({ name: "", category: CATEGORIES[0], price: "", description: "", isActive: "true", stock: "0" });
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const fileRef = useRef<HTMLInputElement>(null);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]; if (!f) return;
        setFile(f); setPreview(URL.createObjectURL(f));
    };
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setError("");
        if (!form.name || !form.price) { setError("Name and price are required."); return; }
        setLoading(true);
        try {
            const fd = new FormData();
            fd.append("name", form.name); fd.append("category", form.category);
            fd.append("price", form.price); fd.append("description", form.description);
            fd.append("stock", form.stock);
            // isActive is not part of add-grocery API — inStock is derived from stock server-side
            if (file) fd.append("file", file);
            const res = await fetch("/api/admin/add-grocery", { method: "POST", body: fd });
            if (!res.ok) throw new Error((await res.json()).message || "Failed");
            onAdded(await res.json()); onClose();
        } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
        finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#0d1f12] border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
                    <h3 className="text-base font-bold text-white">Add Grocery Item</h3>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
                    {/* Image upload */}
                    <div
                        onClick={() => fileRef.current?.click()}
                        className="relative cursor-pointer flex flex-col items-center justify-center h-32 rounded-xl border-2 border-dashed border-white/[0.10] bg-white/[0.03] hover:border-emerald-500/40 hover:bg-white/[0.06] transition-all overflow-hidden"
                    >
                        {preview ? (
                            <><img src={preview} alt="" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                    <p className="text-white text-xs font-semibold">Change image</p>
                                </div></>
                        ) : (<><ImageIcon className="w-7 h-7 text-white/20 mb-1.5" />
                            <p className="text-xs text-slate-500">Click to upload image</p></>)}
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-[10px] text-slate-400 mb-1.5 uppercase tracking-wider">Item Name <span className="text-red-400">*</span></label>
                        <input type="text" placeholder="e.g. Fresh Tomatoes" value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all" />
                    </div>

                    {/* Category + Price */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] text-slate-400 mb-1.5 uppercase tracking-wider">Category</label>
                            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all">
                                {CATEGORIES.map((c) => <option key={c} value={c} className="bg-[#0d1f12]">{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] text-slate-400 mb-1.5 uppercase tracking-wider">Price (₹) <span className="text-red-400">*</span></label>
                            <input type="number" min="0" placeholder="0.00" value={form.price}
                                onChange={(e) => setForm({ ...form, price: e.target.value })}
                                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all" />
                        </div>
                    </div>

                    {/* Stock */}
                    <div>
                        <label className="block text-[10px] text-slate-400 mb-1.5 uppercase tracking-wider">Initial Stock Quantity</label>
                        <input type="number" min="0" placeholder="0" value={form.stock}
                            onChange={(e) => setForm({ ...form, stock: e.target.value })}
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all" />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-[10px] text-slate-400 mb-1.5 uppercase tracking-wider">Description</label>
                        <textarea rows={2} placeholder="Short description..." value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 resize-none transition-all" />
                    </div>

                    {/* Active toggle */}
                    <div className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                        <span className="text-sm font-medium text-slate-300">Active / In Stock</span>
                        <button type="button" onClick={() => setForm({ ...form, isActive: form.isActive === "true" ? "false" : "true" })}
                            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${form.isActive === "true" ? "bg-emerald-500" : "bg-white/[0.10]"}`}>
                            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${form.isActive === "true" ? "translate-x-5" : "translate-x-0.5"}`} />
                        </button>
                    </div>

                    {error && <p className="text-red-400 text-sm">{error}</p>}

                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-slate-400 text-sm font-semibold hover:bg-white/[0.05] transition-colors">Cancel</button>
                        <button type="submit" disabled={loading}
                            className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
                            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Upload className="w-4 h-4" />Add Item</>}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}

// ──────────────── Main Dashboard ──────────────────────────────
export default function AdmineDashboard() {
    const { data: session } = useSession();
    const [tab, setTab] = useState<TabId>("orders");
    const [stockEditing, setStockEditing] = useState<Record<string, string>>({});
    const [stockSaving, setStockSaving] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [items, setItems] = useState<GroceryItem[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loadingItems, setLoadingItems] = useState(true);
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [notif, setNotif] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
    const [itemSearch, setItemSearch] = useState("");
    const [catFilter, setCatFilter] = useState("all");
    const [orderSearch, setOrderSearch] = useState("");
    const [orderFilter, setOrderFilter] = useState("all");

    // POS state
    const [posSearch, setPosSearch] = useState("");
    const [posCart, setPosCart] = useState<POSItem[]>([]);
    const [posPayment, setPosPayment] = useState<"CASH" | "UPI" | "CARD">("CASH");
    const [posBilling, setPosBilling] = useState(false);

    const notify = (msg: string, type: "ok" | "err" = "ok") => {
        setNotif({ msg, type }); setTimeout(() => setNotif(null), 3000);
    };

    const loadItems = useCallback(async () => {
        setLoadingItems(true);
        try {
            const res = await fetch("/api/admin/groceries");
            if (!res.ok) throw new Error();
            setItems(await res.json());
        } catch { notify("Failed to load items", "err"); }
        finally { setLoadingItems(false); }
    }, []);

    const loadOrders = useCallback(async () => {
        setLoadingOrders(true);
        try {
            const res = await fetch("/api/admin/orders");
            if (!res.ok) throw new Error();
            setOrders(await res.json());
        } catch { notify("Failed to load orders", "err"); }
        finally { setLoadingOrders(false); }
    }, []);

    useEffect(() => { loadItems(); loadOrders(); }, [loadItems, loadOrders]);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete "${name}"?`)) return;
        setDeletingId(id);
        try {
            const res = await fetch("/api/admin/groceries", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
            if (!res.ok) throw new Error();
            setItems((p) => p.filter((i) => i._id !== id));
            notify(`"${name}" deleted.`);
        } catch { notify("Delete failed", "err"); }
        finally { setDeletingId(null); }
    };

    const handleOrderStatus = async (id: string, orderStatus: string) => {
        try {
            const res = await fetch("/api/admin/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, orderStatus }) });
            if (!res.ok) throw new Error();
            setOrders((p) => p.map((o) => o._id === id ? { ...o, orderStatus } : o));
            notify("Order status updated");
        } catch { notify("Update failed", "err"); }
    };

    // Inline stock update on item card
    const handleStockUpdate = async (id: string) => {
        const val = stockEditing[id];
        if (val === undefined) return;
        setStockSaving(id);
        try {
            const res = await fetch("/api/admin/groceries", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, stock: Number(val) }),
            });
            if (!res.ok) throw new Error();
            setItems(p => p.map(i => i._id === id ? { ...i, stock: Number(val), inStock: Number(val) > 0 } : i));
            setStockEditing(p => { const n = { ...p }; delete n[id]; return n; });
            notify(`Stock updated to ${val} ✓`);
        } catch { notify("Stock update failed", "err"); }
        finally { setStockSaving(null); }
    };

    // POS helpers
    const posFiltered = items.filter((i) => i.isActive && i.name.toLowerCase().includes(posSearch.toLowerCase()));
    const posTotal = posCart.reduce((s, i) => s + i.price * i.qty, 0);
    const addToPos = (item: GroceryItem) => setPosCart((p) => {
        const ex = p.find((i) => i._id === item._id);
        if (ex) return p.map((i) => i._id === item._id ? { ...i, qty: i.qty + 1 } : i);
        return [...p, { ...item, qty: 1 }];
    });
    const updatePosQty = (id: string, qty: number) =>
        qty <= 0 ? setPosCart((p) => p.filter((i) => i._id !== id))
            : setPosCart((p) => p.map((i) => i._id === id ? { ...i, qty } : i));
    const completeSale = () => {
        setPosBilling(true);
        setTimeout(() => { setPosCart([]); setPosSearch(""); setPosBilling(false); notify(`Sale of ₹${posTotal} recorded! 🎉`); }, 1500);
    };

    // Computed
    const totalOrders = orders.length;
    const pendingOrders = orders.filter((o) => o.orderStatus === "placed" || o.orderStatus === "confirmed").length;
    const totalRevenue = orders.filter(o => o.orderStatus === "delivered").reduce((s, o) => s + o.totalAmount, 0);
    const outOfStock = items.filter(i => !i.inStock || (i.stock ?? 0) === 0).length;

    const filteredItems = items.filter(i =>
        (catFilter === "all" || i.category === catFilter) &&
        i.name.toLowerCase().includes(itemSearch.toLowerCase())
    );
    const filteredOrders = orders.filter(o => {
        const matchStatus = orderFilter === "all" || o.orderStatus === orderFilter;
        const id = `#${o._id.slice(-7).toUpperCase()}`;
        const customer = typeof o.userId === "object" ? o.userId.name : "";
        const matchSearch = id.toLowerCase().includes(orderSearch.toLowerCase()) || customer.toLowerCase().includes(orderSearch.toLowerCase());
        return matchStatus && matchSearch;
    });

    const STATS = [
        { icon: Package, label: "Total Items", value: items.length, sub: `${outOfStock} out of stock`, color: "emerald" },
        { icon: ClipboardList, label: "Total Orders", value: totalOrders, sub: `${pendingOrders} pending`, color: "blue" },
        { icon: IndianRupee, label: "Revenue", value: `₹${totalRevenue.toLocaleString("en-IN")}`, sub: "Delivered orders", color: "violet" },
        { icon: TrendingUp, label: "Pending", value: pendingOrders, sub: "Need attention", color: "amber" },
    ];

    return (
        <div className="min-h-screen flex bg-[#080c14] text-white font-sans">

            {/* ── Sidebar ── */}
            <aside className="w-60 min-h-screen bg-[#0d1117] border-r border-white/[0.06] flex flex-col fixed left-0 top-0 z-30">
                {/* Brand */}
                <div className="px-5 py-5 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-900/40">
                            <Store size={17} className="text-white" />
                        </div>
                        <div>
                            <p className="font-bold text-sm">Snapkart</p>
                            <p className="text-[10px] text-emerald-400 uppercase tracking-widest">Admin Panel</p>
                        </div>
                    </div>
                </div>

                {/* User */}
                <div className="px-4 py-3 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.04]">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-xs font-bold shrink-0">
                            {session?.user?.name?.[0]?.toUpperCase() ?? "A"}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-xs font-semibold truncate">{session?.user?.name ?? "Admin"}</p>
                            <p className="text-[10px] text-slate-400 truncate">{session?.user?.email}</p>
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-1">
                    {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                        <button key={id} onClick={() => setTab(id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === id
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/20"
                                : "text-slate-400 hover:text-white hover:bg-white/[0.05]"}`}>
                            <Icon size={15} />{label}
                            {tab === id && <ChevronRight size={13} className="ml-auto" />}
                            {id === "orders" && pendingOrders > 0 && (
                                <span className="ml-auto bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                    {pendingOrders}
                                </span>
                            )}
                        </button>
                    ))}

                    {/* External links */}
                    <div className="mt-3 pt-3 border-t border-white/[0.05] space-y-1">
                        <p className="text-[9px] text-slate-600 uppercase tracking-widest px-3 mb-1">Quick Links</p>
                        <Link href="/product-admin"
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/[0.05] transition-all">
                            <Package size={15} />Product Catalogue
                            <ExternalLink size={11} className="ml-auto text-slate-600" />
                        </Link>
                        <Link href="/billing"
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/[0.05] transition-all">
                            <Receipt size={15} />Billing Counter
                            <ExternalLink size={11} className="ml-auto text-slate-600" />
                        </Link>
                    </div>
                </nav>

                {/* Sidebar footer */}
                <div className="px-3 py-4 border-t border-white/[0.06] space-y-1.5">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] text-emerald-300 font-semibold">Live Dashboard</span>
                    </div>
                    <button onClick={() => signOut({ callbackUrl: "/login" })}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                        <LogOut size={15} />Sign Out
                    </button>
                </div>
            </aside>

            {/* ── Main Content ── */}
            <main className="ml-60 flex-1 min-h-screen">

                {/* Top header */}
                <header className="sticky top-0 z-20 bg-[#080c14]/80 backdrop-blur-xl border-b border-white/[0.06] px-8 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold">
                            {NAV_ITEMS.find(n => n.id === tab)?.label ?? "Dashboard"}
                        </h1>
                        <p className="text-xs text-slate-500">Snapkart Admin · Store Management</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => { loadItems(); loadOrders(); }}
                            className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-all">
                            <RotateCcw size={14} className={(loadingItems || loadingOrders) ? "animate-spin text-emerald-400" : ""} />
                        </button>
                        <div className="relative">
                            <Bell size={15} className="text-slate-400" />
                            {pendingOrders > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400" />}
                        </div>
                    </div>
                </header>

                <div className="p-8 space-y-6">

                    {/* ── KPI Stat Cards ── */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {STATS.map((card, i) => (
                            <motion.div
                                key={card.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.07 }}
                                className="rounded-2xl bg-[#0d1117] border border-white/[0.06] p-5"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className={`p-2.5 rounded-xl bg-${card.color}-500/10 border border-${card.color}-500/20`}>
                                        <card.icon size={16} className={`text-${card.color}-400`} />
                                    </div>
                                </div>
                                <p className="text-2xl font-extrabold text-white">{card.value}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{card.label}</p>
                                <p className="text-[10px] text-slate-600 mt-1">{card.sub}</p>
                            </motion.div>
                        ))}
                    </div>

                    {/* ══════════════ TAB: STORE ITEMS ══════════════ */}
                    {tab === "items" && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

                            {/* Info banner — inventory owned by product admin */}
                            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs">
                                <div className="flex items-center gap-2">
                                    <Package size={13} className="shrink-0" />
                                    <span>Full product catalogue & inventory is managed by <strong>Product Admin</strong>. Use the quick-link in the sidebar.</span>
                                </div>
                                <Link href="/product-admin" className="ml-4 shrink-0 flex items-center gap-1 font-semibold text-blue-300 hover:text-white transition-colors">
                                    Go <ExternalLink size={11} />
                                </Link>
                            </div>

                            {/* Alerts */}
                            {outOfStock > 0 && (
                                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-medium">
                                    <AlertTriangle size={13} /> {outOfStock} item{outOfStock > 1 ? "s" : ""} out of stock — update quantity below
                                </div>
                            )}

                            {/* Header */}
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <div className="relative">
                                        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input type="text" placeholder="Search items…" value={itemSearch}
                                            onChange={e => setItemSearch(e.target.value)}
                                            className="bg-white/[0.04] border border-white/[0.08] rounded-xl pl-8 pr-3 py-2 text-xs placeholder-slate-600 focus:outline-none focus:border-emerald-500/40 w-44" />
                                    </div>
                                    <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
                                        className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none">
                                        <option value="all" className="bg-[#0d1117]">All Categories</option>
                                        {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#0d1117]">{c}</option>)}
                                    </select>
                                    <span className="text-xs text-slate-500">{filteredItems.length} items</span>
                                </div>
                                <button onClick={() => setShowModal(true)}
                                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-semibold text-xs transition-all shadow-md shadow-emerald-900/30">
                                    <Plus className="w-3.5 h-3.5" />Add Item
                                </button>
                            </div>

                            {/* Items grid */}
                            {loadingItems ? (
                                <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
                                    <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />Loading...
                                </div>
                            ) : filteredItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center gap-3 text-slate-500">
                                    <Package className="w-12 h-12 text-white/10" />
                                    <p className="font-semibold">No items found</p>
                                    <button onClick={() => setShowModal(true)}
                                        className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-emerald-500 transition-colors">
                                        <Plus className="w-3.5 h-3.5" />Add First Item
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {filteredItems.map((item, i) => {
                                        const editingQty = stockEditing[item._id];
                                        const currentQty = editingQty !== undefined ? editingQty : String(item.stock ?? 0);
                                        return (
                                            <motion.div
                                                key={item._id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.03 }}
                                                className={`rounded-2xl bg-[#0d1117] border overflow-hidden transition-all hover:border-emerald-500/30 ${!item.isActive ? "opacity-50 border-white/[0.04]" : "border-white/[0.06]"}`}
                                            >
                                                {/* Image */}
                                                <div className="relative h-28 bg-white/[0.03]">
                                                    {item.image
                                                        ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                        : <div className="w-full h-full flex items-center justify-center"><Package size={24} className="text-white/10" /></div>}
                                                    <div className="absolute top-2 left-2"><StockBadge stock={item.stock} inStock={item.inStock} /></div>
                                                    <div className="absolute top-2 right-2">
                                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${item.isActive ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : "bg-red-500/15 text-red-400 border-red-500/20"}`}>
                                                            {item.isActive ? "Active" : "Off"}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Info */}
                                                <div className="p-3 space-y-2">
                                                    <div>
                                                        <p className="text-sm font-semibold truncate">{item.name}</p>
                                                        <p className="text-[10px] text-slate-400">{item.category}</p>
                                                    </div>

                                                    {/* Price row */}
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-bold text-emerald-400">₹{item.price}</span>
                                                        <button
                                                            onClick={() => handleDelete(item._id, item.name)}
                                                            disabled={deletingId === item._id}
                                                            className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-40"
                                                        >
                                                            {deletingId === item._id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                                                        </button>
                                                    </div>

                                                    {/* ── Quantity update row ── */}
                                                    <div className="pt-2 border-t border-white/[0.05]">
                                                        <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1.5">Quantity</p>
                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                onClick={() => setStockEditing(p => ({ ...p, [item._id]: String(Math.max(0, Number(currentQty) - 1)) }))}
                                                                className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-all"
                                                            ><Minus size={10} /></button>
                                                            <input
                                                                type="number" min={0}
                                                                value={currentQty}
                                                                onChange={e => setStockEditing(p => ({ ...p, [item._id]: e.target.value }))}
                                                                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1 text-xs text-center font-bold text-white focus:outline-none focus:border-emerald-500/40 transition-all"
                                                            />
                                                            <button
                                                                onClick={() => setStockEditing(p => ({ ...p, [item._id]: String(Number(currentQty) + 1) }))}
                                                                className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-all"
                                                            ><Plus size={10} /></button>
                                                            <button
                                                                onClick={() => handleStockUpdate(item._id)}
                                                                disabled={stockSaving === item._id || editingQty === undefined}
                                                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold disabled:opacity-40 transition-all flex items-center gap-1"
                                                            >
                                                                {stockSaving === item._id ? <Loader2 size={10} className="animate-spin" /> : "Save"}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ══════════════ TAB: ORDERS ══════════════ */}
                    {tab === "orders" && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

                            {/* Filters */}
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="relative">
                                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input type="text" placeholder="Search order ID or customer…" value={orderSearch}
                                        onChange={e => setOrderSearch(e.target.value)}
                                        className="bg-white/[0.04] border border-white/[0.08] rounded-xl pl-8 pr-3 py-2 text-xs placeholder-slate-600 focus:outline-none focus:border-blue-500/40 w-56" />
                                </div>
                                <select value={orderFilter} onChange={e => setOrderFilter(e.target.value)}
                                    className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none">
                                    <option value="all" className="bg-[#0d1117]">All Statuses</option>
                                    {Object.entries(ORDER_STATUS_CONFIG).map(([k, v]) => (
                                        <option key={k} value={k} className="bg-[#0d1117]">{v.label}</option>
                                    ))}
                                </select>
                                <span className="text-xs text-slate-500">{filteredOrders.length} orders</span>
                                <button onClick={loadOrders} className="ml-auto p-2 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors">
                                    <RotateCcw size={13} />
                                </button>
                            </div>

                            {/* Orders list */}
                            {loadingOrders ? (
                                <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
                                    <Loader2 className="w-6 h-6 animate-spin text-blue-400" />Loading orders...
                                </div>
                            ) : filteredOrders.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center gap-3 text-slate-500">
                                    <ShoppingBag className="w-12 h-12 text-white/10" />
                                    <p className="font-semibold">No orders found</p>
                                    <p className="text-xs">Orders placed by customers will appear here.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {filteredOrders.map((order, i) => {
                                        const customer = typeof order.userId === "object" ? order.userId : null;
                                        const cfg = ORDER_STATUS_CONFIG[order.orderStatus] ?? { label: order.orderStatus, cls: "bg-slate-500/15 text-slate-300 border-slate-500/20" };
                                        return (
                                            <motion.div
                                                key={order._id}
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.04 }}
                                                className="bg-[#0d1117] border border-white/[0.06] rounded-2xl px-6 py-4 hover:border-white/[0.10] transition-all"
                                            >
                                                {/* Top row */}
                                                <div className="flex items-start justify-between gap-4 mb-3">
                                                    <div>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-bold text-sm">#{order._id.slice(-7).toUpperCase()}</span>
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.cls}`}>{cfg.label}</span>
                                                            <span className="text-[10px] text-slate-500">
                                                                {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                                            </span>
                                                        </div>
                                                        {customer && (
                                                            <p className="text-xs text-slate-400 mt-1">
                                                                {customer.name} · {order.address.city}, {order.address.state}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="font-extrabold text-lg text-white">₹{order.totalAmount}</p>
                                                        <p className="text-[10px] text-slate-500">{order.paymentMethod} · {order.paymentStatus}</p>
                                                    </div>
                                                </div>

                                                {/* Items chips */}
                                                <div className="flex flex-wrap gap-1.5 mb-3">
                                                    {order.items.map((it, j) => (
                                                        <span key={j} className="text-[10px] font-medium bg-white/[0.04] border border-white/[0.06] text-slate-300 px-2 py-0.5 rounded-full">
                                                            {it.name} ×{it.quantity}
                                                        </span>
                                                    ))}
                                                </div>

                                                {/* Status actions */}
                                                {order.orderStatus !== "delivered" && order.orderStatus !== "cancelled" && (
                                                    <div className="flex gap-2 flex-wrap pt-2 border-t border-white/[0.04]">
                                                        {["confirmed", "outForDelivery", "delivered"].map((s) => (
                                                            <button key={s}
                                                                onClick={() => handleOrderStatus(order._id, s)}
                                                                disabled={order.orderStatus === s}
                                                                className={`text-[11px] font-semibold px-3 py-1.5 rounded-xl border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${order.orderStatus === s
                                                                    ? "bg-white/[0.05] text-slate-500 border-white/[0.05]"
                                                                    : "bg-white/[0.04] text-slate-300 border-white/[0.08] hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-300"}`}>
                                                                → {ORDER_STATUS_CONFIG[s]?.label}
                                                            </button>
                                                        ))}
                                                        <button onClick={() => handleOrderStatus(order._id, "cancelled")}
                                                            className="text-[11px] font-semibold px-3 py-1.5 rounded-xl border bg-white/[0.04] text-red-400 border-red-500/20 hover:bg-red-500/10 transition-all">
                                                            ✕ Cancel
                                                        </button>
                                                    </div>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ══════════════ TAB: POS BILLING ══════════════ */}
                    {tab === "pos" && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            className="grid grid-cols-1 lg:grid-cols-5 gap-5">

                            {/* Product picker */}
                            <div className="lg:col-span-3 bg-[#0d1117] border border-white/[0.06] rounded-2xl overflow-hidden flex flex-col">
                                <div className="px-5 py-4 border-b border-white/[0.06]">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Store className="w-4 h-4 text-violet-400" />
                                        <h3 className="font-bold text-sm">In-Store POS Billing</h3>
                                        <span className="text-[10px] font-medium text-slate-500 ml-0.5">— walk-in customers</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2">
                                        <Search className="w-4 h-4 text-slate-500 shrink-0" />
                                        <input type="text" placeholder="Search items..." value={posSearch}
                                            onChange={(e) => setPosSearch(e.target.value)}
                                            className="flex-1 bg-transparent text-sm outline-none text-white placeholder-slate-600" />
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[480px]">
                                    {posFiltered.length === 0 ? (
                                        <div className="col-span-3 flex flex-col items-center justify-center py-12 text-slate-500 gap-2">
                                            <Package className="w-10 h-10 text-white/10" />
                                            <p className="text-sm font-medium">No items found</p>
                                        </div>
                                    ) : posFiltered.map((item) => {
                                        const inCart = posCart.find((i) => i._id === item._id);
                                        return (
                                            <button key={item._id} onClick={() => addToPos(item)}
                                                className={`flex flex-col items-center text-center p-3 rounded-2xl border-2 transition-all hover:shadow-md ${inCart
                                                    ? "border-emerald-500/40 bg-emerald-500/10"
                                                    : "border-white/[0.06] bg-white/[0.02] hover:border-emerald-500/20 hover:bg-white/[0.05]"}`}>
                                                <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/[0.04] border border-white/[0.06] mb-2 flex items-center justify-center">
                                                    {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" /> : <Package className="w-6 h-6 text-white/20" />}
                                                </div>
                                                <p className="text-xs font-bold text-white line-clamp-1">{item.name}</p>
                                                <p className="text-sm font-extrabold text-emerald-400 mt-0.5">₹{item.price}</p>
                                                {inCart && <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 rounded-full mt-1">×{inCart.qty}</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Bill panel */}
                            <div className="lg:col-span-2 bg-[#0d1117] border border-white/[0.06] rounded-2xl flex flex-col overflow-hidden">
                                <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                                    <h3 className="font-bold text-sm flex items-center gap-2">
                                        <Receipt className="w-4 h-4 text-amber-400" />Bill
                                    </h3>
                                    {posCart.length > 0 && (
                                        <button onClick={() => setPosCart([])} className="text-xs text-red-400 hover:text-red-300 font-semibold transition-colors">Clear all</button>
                                    )}
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-72">
                                    {posCart.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full py-10 text-center text-slate-500 gap-2">
                                            <ShoppingBag className="w-10 h-10 text-white/10" />
                                            <p className="text-sm font-medium">No items added</p>
                                            <p className="text-xs">Click items from the left to add</p>
                                        </div>
                                    ) : posCart.map((item) => (
                                        <div key={item._id} className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.05] rounded-xl p-2.5">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-white truncate">{item.name}</p>
                                                <p className="text-[10px] text-slate-500">₹{item.price} each</p>
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg px-1.5 py-1">
                                                <button onClick={() => updatePosQty(item._id, item.qty - 1)} className="text-slate-400 hover:text-red-400 transition-colors"><Minus className="w-3 h-3" /></button>
                                                <span className="text-xs font-bold text-white w-5 text-center">{item.qty}</span>
                                                <button onClick={() => updatePosQty(item._id, item.qty + 1)} className="text-slate-400 hover:text-emerald-400 transition-colors"><Plus className="w-3 h-3" /></button>
                                            </div>
                                            <span className="text-xs font-extrabold text-white w-14 text-right shrink-0">₹{item.price * item.qty}</span>
                                        </div>
                                    ))}
                                </div>
                                {posCart.length > 0 && (
                                    <div className="p-4 border-t border-white/[0.06] space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-400">Items</span>
                                            <span className="text-sm text-slate-300">{posCart.reduce((s, i) => s + i.qty, 0)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-base font-extrabold text-white">Total</span>
                                            <span className="text-xl font-extrabold text-emerald-400">₹{posTotal}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            {(["CASH", "UPI", "CARD"] as const).map((m) => (
                                                <button key={m} onClick={() => setPosPayment(m)}
                                                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${posPayment === m
                                                        ? "bg-emerald-600 text-white border-emerald-600"
                                                        : "bg-white/[0.04] text-slate-400 border-white/[0.08] hover:border-emerald-500/30"}`}>
                                                    {m === "CASH" ? "💵" : m === "UPI" ? "📱" : "💳"} {m}
                                                </button>
                                            ))}
                                        </div>
                                        <button onClick={completeSale} disabled={posBilling}
                                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-70 flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40">
                                            {posBilling ? <><Loader2 className="w-4 h-4 animate-spin" />Processing…</> : <><IndianRupee className="w-4 h-4" />Collect ₹{posTotal}</>}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </div>
            </main>

            {/* Add Item Modal */}
            <AnimatePresence>
                {showModal && (
                    <AddItemModal
                        onClose={() => setShowModal(false)}
                        onAdded={(item) => { setItems((p) => [item, ...p]); notify(`"${item.name}" added!`); }}
                    />
                )}
            </AnimatePresence>

            {/* Notification */}
            <AnimatePresence>
                {notif && <Notif msg={notif.msg} type={notif.type} />}
            </AnimatePresence>
        </div>
    );
}
