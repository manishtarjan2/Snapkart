"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import {
    Package, Tag, BarChart2, ChevronRight, LogOut,
    RefreshCw, CheckCircle, XCircle, Search, PlusCircle,
    Upload, ImageIcon, Pencil, Trash2, Loader2, Hash,
    Plus, Minus, Boxes, ShieldCheck
} from "lucide-react";

interface Product {
    _id: string; name: string; price: number; category: string;
    subcategory?: string; brand?: string; unit?: string; barcode?: string;
    discount: number; image?: string; isActive: boolean; tags?: string[];
    stock: number; inStock: boolean;
}
interface Category { _id: string; name: string; count: number; }

const NAV = [
    { id: "products", label: "Products", icon: Package },
    { id: "categories", label: "Categories", icon: Tag },
    { id: "stats", label: "Analytics", icon: BarChart2 },
];
const CATS = ["Fruits", "Vegetables", "Dairy", "Snacks", "Bakery", "Beverages", "Meat & Fish", "Household", "Personal Care", "Other"];

function StockBadge({ stock, inStock }: { stock: number; inStock: boolean }) {
    if (!inStock || stock === 0)
        return <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">Out of Stock</span>;
    if (stock <= 10)
        return <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/20">Low: {stock}</span>;
    return <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">{stock} in stock</span>;
}

export default function ProductAdminDashboard() {
    const { data: session } = useSession();
    const [active, setActive] = useState("products");
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [catFilter, setCatFilter] = useState("all");
    const [notification, setNotification] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editProduct, setEditProduct] = useState<Product | null>(null);
    const [form, setForm] = useState({ name: "", price: "", category: CATS[0], subcategory: "", brand: "", unit: "", barcode: "", discount: "0", stock: "0", tags: "" });
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [discountMap, setDiscountMap] = useState<Record<string, string>>({});
    const fileRef = useRef<HTMLInputElement>(null);

    // Quick stock update state
    const [stockModal, setStockModal] = useState<Product | null>(null);
    const [stockInput, setStockInput] = useState("");
    const [stockSaving, setStockSaving] = useState(false);

    const notify = (msg: string, type: "ok" | "err" = "ok") => {
        setNotification({ msg, type }); setTimeout(() => setNotification(null), 3500);
    };

    const loadProducts = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/product-admin/products");
            const data = await res.json();
            // Guard: API might return an error object instead of array
            setProducts(Array.isArray(data) ? data : []);
        }
        catch { notify("Failed to load products", "err"); }
        finally { setLoading(false); }
    }, []);

    const loadCategories = useCallback(async () => {
        const res = await fetch("/api/product-admin/categories");
        setCategories(await res.json());
    }, []);

    useEffect(() => { loadProducts(); loadCategories(); }, [loadProducts, loadCategories]);

    const openEdit = (p: Product) => {
        setEditProduct(p);
        setForm({ name: p.name, price: String(p.price), category: p.category, subcategory: p.subcategory ?? "", brand: p.brand ?? "", unit: p.unit ?? "", barcode: p.barcode ?? "", discount: String(p.discount), stock: String(p.stock ?? 0), tags: (p.tags ?? []).join(", ") });
        setPreview(p.image ?? null); setFile(null); setShowForm(true);
    };
    const openCreate = () => {
        setEditProduct(null);
        setForm({ name: "", price: "", category: CATS[0], subcategory: "", brand: "", unit: "", barcode: "", discount: "0", stock: "0", tags: "" });
        setPreview(null); setFile(null); setShowForm(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true);
        try {
            const fd = new FormData();

            // Append all text fields — skip empty barcode to avoid sparse-unique conflicts
            Object.entries(form).forEach(([k, v]) => {
                if (k === "barcode" && v.trim() === "") return; // skip empty barcode
                fd.append(k, v);
            });

            // Attach image file if the user selected one
            if (file) fd.append("file", file);

            let res: Response;
            if (editProduct) {
                // PATCH — multipart so image can be included
                res = await fetch(`/api/product-admin/products/${editProduct._id}`, {
                    method: "PATCH",
                    body: fd,   // no Content-Type header — browser sets boundary automatically
                });
            } else {
                // POST — create new product
                res = await fetch("/api/product-admin/products", { method: "POST", body: fd });
            }

            const data = await res.json();
            if (!res.ok) throw new Error(data.message ?? "Save failed");

            // Immediately update local state from server response so badges refresh instantly
            if (editProduct && data._id) {
                setProducts(prev => prev.map(p => p._id === data._id ? { ...p, ...data } : p));
            } else {
                // New product — just prepend it
                setProducts(prev => [data, ...prev]);
            }

            notify(editProduct ? "Product updated ✓" : "Product created ✓");
            setShowForm(false);
            await loadProducts(); // sync from server to confirm
        } catch (err: unknown) { notify(err instanceof Error ? err.message : "Error", "err"); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Deactivate this product?")) return;
        const res = await fetch(`/api/product-admin/products/${id}`, { method: "DELETE" });
        if (!res.ok) { notify("Failed", "err"); return; }
        notify("Product deactivated ✓"); loadProducts();
    };

    // Quick stock update
    const openStockModal = (p: Product) => {
        setStockModal(p);
        setStockInput(String(p.stock ?? 0));
    };
    const handleStockUpdate = async (newStock: number) => {
        if (!stockModal) return;
        setStockSaving(true);
        try {
            const res = await fetch(`/api/product-admin/products/${stockModal._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ stock: newStock, inStock: newStock > 0 }),
            });
            const updated = await res.json();
            if (!res.ok) throw new Error(updated.message ?? "Failed to update stock");

            // ★ Immediately update local state using the server response
            //   This is instant — no async fetch race — badge updates right away
            setProducts(prev => prev.map(p =>
                p._id === stockModal._id
                    ? { ...p, stock: updated.stock ?? newStock, inStock: updated.inStock ?? newStock > 0 }
                    : p
            ));

            notify(`Stock updated to ${newStock} ✓`);
            setStockModal(null);

            // Background sync to confirm DB state
            loadProducts();
        } catch (err: unknown) {
            notify(err instanceof Error ? err.message : "Failed to update stock", "err");
        } finally {
            setStockSaving(false);
        }
    };

    const bulkDiscount = async (cat: string) => {
        const discount = Number(discountMap[cat] ?? 0);
        const res = await fetch("/api/product-admin/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "bulkDiscount", category: cat, discount }),
        });
        if (!res.ok) { notify("Failed", "err"); return; }
        notify(`${discount}% discount applied to ${cat} ✓`); loadProducts();
    };

    const filtered = products.filter((p) =>
        (catFilter === "all" || p.category === catFilter) &&
        (p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode ?? "").includes(search))
    );

    const outOfStock = products.filter(p => !p.inStock || p.stock === 0).length;
    const lowStock = products.filter(p => p.inStock && p.stock > 0 && p.stock <= 10).length;

    return (
        <div className="min-h-screen flex bg-[#0a1a0f] text-white font-sans">
            {/* Sidebar */}
            <aside className="w-60 min-h-screen bg-[#0d1f12] border-r border-white/[0.06] flex flex-col fixed left-0 top-0 z-30">
                <div className="px-5 py-5 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center"><Package size={17} className="text-white" /></div>
                        <div><p className="font-bold text-sm">Snapkart</p><p className="text-[10px] text-emerald-400 uppercase tracking-widest">Product Admin</p></div>
                    </div>
                </div>
                <div className="px-4 py-3 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04]">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center text-xs font-bold">{session?.user?.name?.[0]?.toUpperCase() ?? "P"}</div>
                        <div className="overflow-hidden"><p className="text-xs font-semibold truncate">{session?.user?.name}</p><p className="text-[10px] text-slate-400">Product Admin</p></div>
                    </div>
                </div>
                <nav className="flex-1 px-3 py-4 space-y-1">
                    {NAV.map(({ id, label, icon: Icon }) => (
                        <button key={id} onClick={() => setActive(id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active === id ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/20" : "text-slate-400 hover:text-white hover:bg-white/[0.05]"}`}>
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
                <header className="sticky top-0 z-20 bg-[#0a1a0f]/80 backdrop-blur-xl border-b border-white/[0.06] px-8 py-4 flex items-center justify-between">
                    <div><h1 className="text-lg font-bold">{NAV.find((n) => n.id === active)?.label}</h1><p className="text-xs text-slate-500">Product Management · Snapkart</p></div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => { loadProducts(); loadCategories(); }} className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08]"><RefreshCw size={14} className={loading ? "animate-spin text-emerald-400" : "text-slate-400"} /></button>
                        {active === "products" && <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-semibold transition-colors"><PlusCircle size={14} />Add Product</button>}
                    </div>
                </header>

                {notification && (
                    <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-xl border ${notification.type === "ok" ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300" : "bg-red-500/20 border-red-500/30 text-red-300"}`}>
                        {notification.type === "ok" ? <CheckCircle size={14} /> : <XCircle size={14} />}{notification.msg}
                    </div>
                )}

                <div className="p-8 space-y-6">

                    {/* ── PRODUCTS ── */}
                    {active === "products" && (
                        <div className="space-y-5">

                            {/* Stock alert row */}
                            {(outOfStock > 0 || lowStock > 0) && (
                                <div className="flex flex-wrap gap-3">
                                    {outOfStock > 0 && (
                                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-medium">
                                            <XCircle size={13} /> {outOfStock} product{outOfStock > 1 ? "s" : ""} out of stock
                                        </div>
                                    )}
                                    {lowStock > 0 && (
                                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-300 text-xs font-medium">
                                            <Boxes size={13} /> {lowStock} product{lowStock > 1 ? "s" : ""} low stock (≤10)
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Filters */}
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="relative"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input type="text" placeholder="Search name or barcode…" value={search} onChange={(e) => setSearch(e.target.value)} className="bg-white/[0.04] border border-white/[0.08] rounded-xl pl-8 pr-3 py-2 text-xs placeholder-slate-600 focus:outline-none focus:border-emerald-500/40 w-52" /></div>
                                <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none">
                                    <option value="all">All Categories</option>{CATS.map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <span className="text-xs text-slate-500">{filtered.length} products</span>
                            </div>

                            {/* Product grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {filtered.map((p) => (
                                    <div key={p._id} className={`rounded-2xl bg-[#0d1f12] border overflow-hidden group transition-all hover:border-emerald-500/30 ${!p.isActive ? "opacity-50" : "border-white/[0.06]"}`}>
                                        <div className="relative h-36 bg-white/[0.03]">
                                            {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package size={32} className="text-white/10" /></div>}
                                            {p.discount > 0 && <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">-{p.discount}%</span>}
                                            {/* Stock badge top-left */}
                                            <div className="absolute top-2 left-2">
                                                <StockBadge stock={p.stock ?? 0} inStock={p.inStock ?? true} />
                                            </div>
                                        </div>
                                        <div className="p-3">
                                            <p className="text-sm font-semibold truncate">{p.name}</p>
                                            <p className="text-[10px] text-slate-400">{p.category}{p.brand ? ` · ${p.brand}` : ""}</p>

                                            {/* Price row */}
                                            <div className="flex items-center justify-between mt-2">
                                                <div><span className="text-sm font-bold text-emerald-400">₹{(p.price * (1 - p.discount / 100)).toFixed(0)}</span>{p.discount > 0 && <span className="text-[10px] text-slate-500 line-through ml-1">₹{p.price}</span>}</div>
                                                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                                    <Hash size={9} />{p.stock ?? 0} qty
                                                </div>
                                            </div>

                                            {/* Action buttons — always visible */}
                                            <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-white/[0.05]">
                                                {/* Quick Stock Update */}
                                                <button
                                                    onClick={() => openStockModal(p)}
                                                    title="Update stock quantity"
                                                    className="flex items-center gap-1 flex-1 justify-center py-1.5 rounded-lg bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 text-[10px] font-semibold transition-all"
                                                >
                                                    <Boxes size={11} />Qty
                                                </button>
                                                <button onClick={() => openEdit(p)} title="Edit product" className="flex items-center gap-1 flex-1 justify-center py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 text-[10px] font-semibold transition-all">
                                                    <Pencil size={11} />Edit
                                                </button>
                                                <button onClick={() => handleDelete(p._id)} title="Deactivate product" className="flex items-center gap-1 flex-1 justify-center py-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 text-[10px] font-semibold transition-all">
                                                    <Trash2 size={11} />Del
                                                </button>
                                            </div>
                                            {p.barcode && <p className="text-[9px] text-slate-600 font-mono mt-1.5">{p.barcode}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── CATEGORIES ── */}
                    {active === "categories" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {CATS.map((cat) => {
                                const catData = categories.find((c) => c.name === cat);
                                return (
                                    <div key={cat} className="rounded-2xl bg-[#0d1f12] border border-white/[0.06] p-5">
                                        <div className="flex items-start justify-between mb-3">
                                            <div><p className="font-semibold text-sm">{cat}</p><p className="text-xs text-slate-400">{catData?.count ?? 0} products</p></div>
                                            <span className="bg-emerald-500/15 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/20">Active</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input type="number" min={0} max={100} value={discountMap[cat] ?? ""} onChange={(e) => setDiscountMap((m) => ({ ...m, [cat]: e.target.value }))}
                                                placeholder="% off" className="w-20 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500/40 text-center" />
                                            <button onClick={() => bulkDiscount(cat)} className="flex-1 py-1.5 bg-emerald-600/80 hover:bg-emerald-600 rounded-lg text-xs font-semibold transition-colors">Apply Bulk Discount</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ── ANALYTICS ── */}
                    {active === "stats" && (
                        <div className="rounded-2xl bg-[#0d1f12] border border-white/[0.06] p-6 space-y-4">
                            <h2 className="text-sm font-semibold flex items-center gap-2"><BarChart2 size={14} className="text-emerald-400" />Product Analytics</h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: "Total Products", value: products.length },
                                    { label: "Active", value: products.filter((p) => p.isActive).length },
                                    { label: "With Discount", value: products.filter((p) => p.discount > 0).length },
                                    { label: "Out of Stock", value: products.filter(p => !p.inStock || (p.stock ?? 0) === 0).length },
                                ].map(({ label, value }) => (
                                    <div key={label} className="text-center p-4 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                                        <p className="text-2xl font-bold text-emerald-400">{value}</p>
                                        <p className="text-xs text-slate-400 mt-1">{label}</p>
                                    </div>
                                ))}
                            </div>
                            {/* Stock summary */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                                {[
                                    { label: "In Stock", count: products.filter(p => p.inStock && (p.stock ?? 0) > 10).length, color: "emerald" },
                                    { label: "Low Stock (≤10)", count: products.filter(p => p.inStock && (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 10).length, color: "orange" },
                                    { label: "Out of Stock", count: products.filter(p => !p.inStock || (p.stock ?? 0) === 0).length, color: "red" },
                                ].map(({ label, count, color }) => (
                                    <div key={label} className={`flex items-center justify-between p-3 rounded-xl bg-${color}-500/10 border border-${color}-500/20`}>
                                        <span className={`text-xs text-${color}-300`}>{label}</span>
                                        <span className={`text-lg font-bold text-${color}-400`}>{count}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-2 mt-4">
                                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">By Category</p>
                                {CATS.map((cat) => {
                                    const count = products.filter((p) => p.category === cat).length;
                                    const pct = products.length > 0 ? (count / products.length) * 100 : 0;
                                    return (
                                        <div key={cat} className="flex items-center gap-3">
                                            <span className="text-xs text-slate-400 w-28 truncate">{cat}</span>
                                            <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
                                            <span className="text-xs text-slate-300 w-6 text-right">{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* ── Add/Edit Modal ── */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#0d1f12] border border-white/[0.08] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
                            <h2 className="text-sm font-semibold">{editProduct ? "Edit Product" : "Add New Product"}</h2>
                            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white"><XCircle size={18} /></button>
                        </div>
                        <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
                            {/* Image */}
                            <div onClick={() => fileRef.current?.click()} className="relative h-32 rounded-xl border-2 border-dashed border-white/[0.10] bg-white/[0.03] hover:border-emerald-500/40 cursor-pointer flex items-center justify-center overflow-hidden transition-all">
                                {preview ? <img src={preview} alt="" className="w-full h-full object-cover" /> : <div className="text-center"><ImageIcon size={24} className="text-white/20 mx-auto mb-1" /><p className="text-xs text-slate-500">Click to upload image</p></div>}
                                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setPreview(URL.createObjectURL(f)); } }} />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {([
                                    ["name", "Product Name", "text", 2],
                                    ["price", "Price (₹)", "number", 1],
                                    ["discount", "Discount (%)", "number", 1],
                                    ["stock", "Stock Quantity", "number", 1],
                                    ["brand", "Brand", "text", 1],
                                    ["unit", "Unit (kg/pcs)", "text", 1],
                                    ["barcode", "Barcode", "text", 1],
                                    ["subcategory", "Subcategory", "text", 1],
                                    ["tags", "Tags (comma sep)", "text", 2],
                                ] as const).map(([key, label, type, span]) => (
                                    <div key={key} className={span === 2 ? "col-span-2" : ""}>
                                        <label className="block text-[10px] text-slate-400 mb-1">{label}</label>
                                        <input
                                            type={type}
                                            value={form[key as keyof typeof form]}
                                            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                                            min={type === "number" ? 0 : undefined}
                                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500/40"
                                        />
                                    </div>
                                ))}
                                <div className="col-span-2">
                                    <label className="block text-[10px] text-slate-400 mb-1">Category</label>
                                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/40">
                                        {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Stock preview */}
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                                <Boxes size={13} className="text-slate-400" />
                                <span className="text-xs text-slate-400">Stock status after save:</span>
                                <StockBadge stock={Number(form.stock) || 0} inStock={Number(form.stock) > 0} />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-slate-400 text-sm hover:bg-white/[0.05] transition-colors">Cancel</button>
                                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                                    {saving ? <><Loader2 size={14} className="animate-spin" />Saving…</> : <><Upload size={14} />{editProduct ? "Update" : "Create"}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Quick Stock Update Modal ── */}
            {stockModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#0d1f12] border border-white/[0.08] rounded-2xl w-full max-w-sm shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
                            <div>
                                <h2 className="text-sm font-semibold">Update Stock</h2>
                                <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[200px]">{stockModal.name}</p>
                            </div>
                            <button onClick={() => setStockModal(null)} className="text-slate-400 hover:text-white"><XCircle size={18} /></button>
                        </div>
                        <div className="px-6 py-6 space-y-5">
                            {/* Current stock info */}
                            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                                <span className="text-xs text-slate-400">Current quantity</span>
                                <StockBadge stock={stockModal.stock ?? 0} inStock={stockModal.inStock ?? true} />
                            </div>

                            {/* Increment / Decrement quick buttons */}
                            <div>
                                <label className="block text-[10px] text-slate-400 mb-2 uppercase tracking-wider">Quick Adjust</label>
                                <div className="flex items-center gap-2">
                                    {[-10, -5, -1].map(delta => (
                                        <button
                                            key={delta}
                                            onClick={() => setStockInput(v => String(Math.max(0, Number(v) + delta)))}
                                            className="flex-1 py-2 rounded-lg bg-red-500/15 text-red-300 hover:bg-red-500/25 text-xs font-semibold transition-all"
                                        >
                                            {delta}
                                        </button>
                                    ))}
                                    {[1, 5, 10].map(delta => (
                                        <button
                                            key={delta}
                                            onClick={() => setStockInput(v => String(Number(v) + delta))}
                                            className="flex-1 py-2 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 text-xs font-semibold transition-all"
                                        >
                                            +{delta}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Manual quantity input */}
                            <div>
                                <label className="block text-[10px] text-slate-400 mb-2 uppercase tracking-wider">Set Exact Quantity</label>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setStockInput(v => String(Math.max(0, Number(v) - 1)))} className="p-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 transition-all"><Minus size={14} /></button>
                                    <input
                                        type="number"
                                        min={0}
                                        value={stockInput}
                                        onChange={e => setStockInput(e.target.value)}
                                        className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-center text-lg font-bold text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                                    />
                                    <button onClick={() => setStockInput(v => String(Number(v) + 1))} className="p-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 transition-all"><Plus size={14} /></button>
                                </div>
                                {/* Preview new status */}
                                <div className="mt-2 flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02]">
                                    <span className="text-[10px] text-slate-500">New status:</span>
                                    <StockBadge stock={Number(stockInput) || 0} inStock={Number(stockInput) > 0} />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => setStockModal(null)} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-slate-400 text-sm hover:bg-white/[0.05] transition-colors">Cancel</button>
                                <button
                                    disabled={stockSaving}
                                    onClick={() => handleStockUpdate(Number(stockInput))}
                                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                                >
                                    {stockSaving ? <><Loader2 size={14} className="animate-spin" />Saving…</> : <><CheckCircle size={14} />Save Stock</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
