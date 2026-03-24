"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search, Plus, Minus, Trash2, ShoppingCart, Package,
    Receipt, Printer, CheckCircle2, RotateCcw, Loader2,
    User, Phone, IndianRupee, Tag, Percent, Calculator,
    Clock, TrendingUp, ShoppingBag, X, ChevronRight,
    Wifi, WifiOff, BarChart3, Star, Home,
} from "lucide-react";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────────────────────
type GroceryItem = {
    _id: string; name: string; price: number; category: string;
    image?: string; description?: string; inStock: boolean;
};
type BillItem = GroceryItem & { qty: number };
type Receipt = {
    billNo: string; items: BillItem[]; customerName: string; customerPhone: string;
    subtotal: number; discount: number; tax: number; totalAmount: number;
    paymentMethod: string; cashPaid: number; change: number;
    createdAt: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const CATEGORIES = ["All", "Fruits", "Vegetables", "Dairy", "Snacks", "Bakery", "Beverages", "Meat & Fish", "Other"];
const GST_RATE = 5;   // 5% GST

function fmtTime(d: Date) {
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function fmtDate(d: Date) {
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Numpad ──────────────────────────────────────────────────────────────────
function NumPad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const press = (k: string) => {
        if (k === "⌫") { onChange(value.slice(0, -1) || "0"); return; }
        if (k === "C") { onChange("0"); return; }
        if (value === "0") { onChange(k); return; }
        onChange(value + k);
    };
    const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "00", "0", "⌫"];
    return (
        <div className="grid grid-cols-3 gap-1.5">
            {keys.map((k) => (
                <button key={k} onClick={() => press(k)}
                    className={`py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer active:scale-95 ${k === "⌫" ? "bg-red-50 text-red-500 border border-red-200 hover:bg-red-100"
                            : "bg-gray-800 text-white border border-gray-700 hover:bg-gray-700"}`}>
                    {k}
                </button>
            ))}
        </div>
    );
}

// ─── PrintReceipt ──────────────────────────────────────────────────────────
function PrintReceiptModal({ receipt, onClose }: { receipt: Receipt; onClose: () => void }) {
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        const win = window.open("", "_blank");
        if (!win || !printRef.current) return;
        win.document.write(`
            <html><head><title>Receipt - ${receipt.billNo}</title>
            <style>
                body { font-family: 'Courier New', monospace; max-width: 320px; margin: 0 auto; padding: 10px; font-size: 13px; }
                .center { text-align: center; } .bold { font-weight: bold; }
                .line { border-top: 1px dashed #000; margin: 6px 0; }
                .row { display: flex; justify-content: space-between; margin: 3px 0; }
                .big { font-size: 18px; font-weight: bold; }
                .shop { font-size: 20px; font-weight: 900; }
            </style></head><body>
            ${printRef.current.innerHTML}
            </body></html>`);
        win.document.close();
        win.focus();
        win.print();
        win.close();
    };

    const subtotal = receipt.subtotal;
    const discountAmt = (subtotal * receipt.discount) / 100;
    const afterDisc = subtotal - discountAmt;
    const taxAmt = (afterDisc * receipt.tax) / 100;
    const total = afterDisc + taxAmt;
    const change = receipt.cashPaid - total;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-emerald-50 rounded-xl"><Receipt className="w-5 h-5 text-emerald-600" /></div>
                        <div>
                            <p className="font-bold text-gray-900 text-sm">Receipt Preview</p>
                            <p className="text-xs text-gray-400">{receipt.billNo}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 cursor-pointer"><X className="w-4 h-4" /></button>
                </div>

                {/* Receipt paper */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div ref={printRef}
                        className="bg-white border border-dashed border-gray-300 rounded-2xl p-5 font-mono text-xs">
                        {/* Store header */}
                        <div className="text-center mb-3">
                            <p className="text-xl font-black tracking-tight">SnapKart</p>
                            <p className="text-gray-500">Fresh Groceries &amp; Daily Essentials</p>
                            <div className="border-t border-dashed border-gray-300 my-2" />
                            <p className="text-gray-600">{fmtDate(new Date(receipt.createdAt))} &nbsp;|&nbsp; {fmtTime(new Date(receipt.createdAt))}</p>
                            <p className="font-bold">BILL: {receipt.billNo}</p>
                        </div>

                        {receipt.customerName && receipt.customerName !== "Walk-in" && (
                            <div className="mb-2">
                                <p className="text-gray-600">Customer: <span className="font-bold text-gray-800">{receipt.customerName}</span></p>
                                {receipt.customerPhone && <p className="text-gray-600">Ph: {receipt.customerPhone}</p>}
                            </div>
                        )}

                        <div className="border-t border-dashed border-gray-300 my-2" />

                        {/* Items */}
                        {receipt.items.map((it, i) => (
                            <div key={i} className="flex justify-between mb-1">
                                <div className="flex-1">
                                    <span className="font-semibold text-gray-800">{it.name}</span>
                                    <br />
                                    <span className="text-gray-500">₹{it.price} × {it.qty}</span>
                                </div>
                                <span className="font-bold text-gray-900">₹{it.price * it.qty}</span>
                            </div>
                        ))}

                        <div className="border-t border-dashed border-gray-300 my-2" />

                        {/* Totals */}
                        <div className="space-y-0.5">
                            <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
                            {discountAmt > 0 && <div className="flex justify-between text-green-700"><span>Discount ({receipt.discount}%)</span><span>-₹{discountAmt.toFixed(2)}</span></div>}
                            {taxAmt > 0 && <div className="flex justify-between text-gray-600"><span>GST ({receipt.tax}%)</span><span>₹{taxAmt.toFixed(2)}</span></div>}
                        </div>

                        <div className="border-t border-dashed border-gray-300 my-2" />

                        <div className="flex justify-between font-black text-base text-gray-900">
                            <span>TOTAL</span><span>₹{total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600 mt-1"><span>Payment</span><span className="font-bold">{receipt.paymentMethod}</span></div>
                        {receipt.cashPaid > 0 && (
                            <>
                                <div className="flex justify-between text-gray-600"><span>Cash Paid</span><span>₹{receipt.cashPaid.toFixed(2)}</span></div>
                                {change > 0 && <div className="flex justify-between font-bold text-blue-700"><span>Change</span><span>₹{change.toFixed(2)}</span></div>}
                            </>
                        )}

                        <div className="border-t border-dashed border-gray-300 my-3" />
                        <div className="text-center text-gray-400 text-[10px] space-y-0.5">
                            <p className="font-bold text-gray-600">Thank you for shopping! 🙏</p>
                            <p>Goods once sold will not be returned.</p>
                            <p>Visit Again — SnapKart Store</p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 px-5 py-4 border-t border-gray-100">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 cursor-pointer">Close</button>
                    <button onClick={handlePrint}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 cursor-pointer flex items-center justify-center gap-2">
                        <Printer className="w-4 h-4" /> Print
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Main BillingCounter ─────────────────────────────────────────────────────
export default function BillingCounter() {
    const [items, setItems] = useState<GroceryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState("All");
    const [search, setSearch] = useState("");
    const [bill, setBill] = useState<BillItem[]>([]);

    // Customer info
    const [custName, setCustName] = useState("");
    const [custPhone, setCustPhone] = useState("");

    // Discount / tax
    const [discount, setDiscount] = useState(0);
    const [taxEnabled, setTaxEnabled] = useState(false);

    // Payment
    const [payMethod, setPayMethod] = useState<"CASH" | "UPI" | "CARD">("CASH");
    const [cashPaid, setCashPaid] = useState("0");
    const [showNumpad, setShowNumpad] = useState(false);

    // State
    const [submitting, setSubmitting] = useState(false);
    const [receipt, setReceipt] = useState<Receipt | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [histPanel, setHistPanel] = useState(false);
    const [now, setNow] = useState(new Date());
    const [toast, setToast] = useState<string | null>(null);

    const searchRef = useRef<HTMLInputElement>(null);

    // Clock
    useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

    // Load items
    const loadItems = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/groceries");
            const data = await res.json();
            setItems(Array.isArray(data) ? data : []);
        } catch { setItems([]); }
        finally { setLoading(false); }
    };

    // Load today's history
    const loadHistory = async () => {
        try {
            const res = await fetch("/api/admin/billing");
            const data = await res.json();
            setHistory(Array.isArray(data) ? data : []);
        } catch { }
    };

    useEffect(() => { loadItems(); loadHistory(); }, []);

    const showToast = (msg: string) => {
        setToast(msg); setTimeout(() => setToast(null), 3000);
    };

    // Keyboard shortcut: "/" to focus search
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "/" && document.activeElement !== searchRef.current) {
                e.preventDefault(); searchRef.current?.focus();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    // Filtered items
    const filtered = items.filter((it) =>
        it.inStock &&
        (category === "All" || it.category.toLowerCase() === category.toLowerCase()) &&
        it.name.toLowerCase().includes(search.toLowerCase())
    );

    // Bill helpers
    const addItem = (item: GroceryItem) => {
        setBill((prev) => {
            const ex = prev.find((i) => i._id === item._id);
            if (ex) return prev.map((i) => i._id === item._id ? { ...i, qty: i.qty + 1 } : i);
            return [...prev, { ...item, qty: 1 }];
        });
    };
    const setQty = (id: string, qty: number) => {
        if (qty <= 0) setBill((p) => p.filter((i) => i._id !== id));
        else setBill((p) => p.map((i) => i._id === id ? { ...i, qty } : i));
    };
    const removeLine = (id: string) => setBill((p) => p.filter((i) => i._id !== id));
    const clearBill = () => {
        setBill([]); setCustName(""); setCustPhone("");
        setDiscount(0); setCashPaid("0"); setPayMethod("CASH"); setShowNumpad(false);
    };

    // Totals
    const subtotal = bill.reduce((s, i) => s + i.price * i.qty, 0);
    const discountAmt = (subtotal * discount) / 100;
    const afterDiscount = subtotal - discountAmt;
    const taxRate = taxEnabled ? GST_RATE : 0;
    const taxAmt = (afterDiscount * taxRate) / 100;
    const grandTotal = afterDiscount + taxAmt;
    const change = payMethod === "CASH" ? Math.max(0, Number(cashPaid) - grandTotal) : 0;
    const cashShort = payMethod === "CASH" && Number(cashPaid) < grandTotal && Number(cashPaid) > 0;

    // Collect payment
    const handleCollect = async () => {
        if (!bill.length) { showToast("Add items to the bill first."); return; }
        if (payMethod === "CASH" && Number(cashPaid) < grandTotal) {
            showToast("Cash paid is less than total amount!"); return;
        }
        setSubmitting(true);
        try {
            const res = await fetch("/api/admin/billing", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    items: bill.map((i) => ({ groceryId: i._id, name: i.name, price: i.price, quantity: i.qty, image: i.image })),
                    customerName: custName || "Walk-in",
                    customerPhone: custPhone || "",
                    subtotal, discount, tax: taxRate,
                    totalAmount: grandTotal,
                    paymentMethod: payMethod,
                    cashPaid: payMethod === "CASH" ? Number(cashPaid) : grandTotal,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            // Build receipt
            setReceipt({
                billNo: data.billNo,
                items: bill,
                customerName: custName || "Walk-in",
                customerPhone: custPhone,
                subtotal, discount, tax: taxRate,
                totalAmount: grandTotal,
                paymentMethod: payMethod,
                cashPaid: payMethod === "CASH" ? Number(cashPaid) : grandTotal,
                change: change,
                createdAt: new Date().toISOString(),
            });

            await loadHistory();
            clearBill();
        } catch (err: any) {
            showToast(err.message || "Failed to record sale.");
        } finally {
            setSubmitting(false);
        }
    };

    // Today's totals
    const todayRevenue = history.reduce((s: number, o: any) => s + (o.totalAmount || 0), 0);
    const todayBills = history.length;

    return (
        <div className="h-screen bg-gray-950 flex flex-col overflow-hidden text-white">
            {/* ── Top bar ──────────────────────────────────────── */}
            <header className="shrink-0 flex items-center justify-between px-5 py-3 bg-gray-900 border-b border-gray-800">
                <div className="flex items-center gap-3">
                    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                            <ShoppingCart className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-black text-lg bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent">SnapKart</span>
                    </Link>
                    <div className="w-px h-5 bg-gray-700" />
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-sm font-bold text-emerald-400">BILLING COUNTER</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {/* Clock */}
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-mono font-bold text-white">{fmtTime(now)}</p>
                        <p className="text-xs text-gray-400">{fmtDate(now)}</p>
                    </div>
                    {/* Today stats */}
                    <div className="hidden md:flex items-center gap-3 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2">
                        <div className="text-center">
                            <p className="text-[10px] text-gray-400">Bills</p>
                            <p className="font-extrabold text-white text-sm">{todayBills}</p>
                        </div>
                        <div className="w-px h-6 bg-gray-700" />
                        <div className="text-center">
                            <p className="text-[10px] text-gray-400">Revenue</p>
                            <p className="font-extrabold text-emerald-400 text-sm">₹{todayRevenue.toFixed(0)}</p>
                        </div>
                    </div>
                    <button onClick={() => { setHistPanel(true); loadHistory(); }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:border-gray-600 transition-all cursor-pointer">
                        <BarChart3 className="w-3.5 h-3.5" />
                        History
                    </button>
                    <Link href="/" className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:border-gray-600 transition-all cursor-pointer">
                        <Home className="w-3.5 h-3.5" />
                        Dashboard
                    </Link>
                </div>
            </header>

            {/* ── Main area ─────────────────────────────────────── */}
            <div className="flex-1 flex overflow-hidden">

                {/* ════ LEFT: Product picker ════════════════════════════ */}
                <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-800">
                    {/* Search + category */}
                    <div className="shrink-0 px-4 py-3 border-b border-gray-800 space-y-2.5 bg-gray-900">
                        <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5">
                            <Search className="w-4 h-4 text-gray-500 shrink-0" />
                            <input ref={searchRef} type="text" placeholder='Search items... (press "/" to focus)'
                                value={search} onChange={(e) => setSearch(e.target.value)}
                                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-gray-500" />
                            {search && (
                                <button onClick={() => setSearch("")} className="text-gray-500 hover:text-white cursor-pointer">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hidden">
                            {CATEGORIES.map((c) => (
                                <button key={c} onClick={() => setCategory(c)}
                                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${category === c
                                            ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-900"
                                            : "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500"}`}>
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Item grid */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {loading ? (
                            <div className="flex items-center justify-center h-full gap-3 text-gray-500">
                                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                                <span>Loading inventory...</span>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-gray-600">
                                <Package className="w-12 h-12 text-gray-700" />
                                <p className="font-semibold">No items found</p>
                                <button onClick={() => { setSearch(""); setCategory("All"); }}
                                    className="text-xs text-emerald-400 hover:text-emerald-300 cursor-pointer underline">Clear filters</button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                                {filtered.map((item) => {
                                    const inBill = bill.find((i) => i._id === item._id);
                                    return (
                                        <motion.button key={item._id} onClick={() => addItem(item)}
                                            whileTap={{ scale: 0.93 }}
                                            className={`relative flex flex-col p-3 rounded-2xl border-2 text-left cursor-pointer transition-all duration-200 hover:shadow-lg ${inBill
                                                    ? "border-emerald-500 bg-emerald-950 shadow-emerald-900/40 shadow-lg"
                                                    : "border-gray-800 bg-gray-900 hover:border-gray-600"}`}>
                                            {/* Image */}
                                            <div className={`w-full h-20 rounded-xl overflow-hidden mb-2.5 flex items-center justify-center ${inBill ? "bg-emerald-900" : "bg-gray-800"}`}>
                                                {item.image
                                                    ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                    : <Package className="w-7 h-7 text-gray-600" />}
                                            </div>
                                            <p className="text-xs font-bold text-white leading-snug line-clamp-2">{item.name}</p>
                                            <p className="text-[10px] text-gray-500 capitalize mt-0.5">{item.category}</p>
                                            <p className="text-sm font-extrabold text-emerald-400 mt-1.5">₹{item.price}</p>
                                            {inBill && (
                                                <div className="absolute top-2 right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                                                    <span className="text-[10px] text-white font-black">{inBill.qty}</span>
                                                </div>
                                            )}
                                        </motion.button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ════ RIGHT: Bill panel ═══════════════════════════════ */}
                <div className="w-80 xl:w-96 shrink-0 flex flex-col bg-gray-900 overflow-hidden">

                    {/* Customer info */}
                    <div className="shrink-0 px-4 py-3 border-b border-gray-800 space-y-2">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Customer (optional)</p>
                        <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2">
                            <User className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                            <input type="text" placeholder="Customer name" value={custName} onChange={(e) => setCustName(e.target.value)}
                                className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-gray-600" />
                        </div>
                        <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2">
                            <Phone className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                            <input type="tel" placeholder="Phone number" value={custPhone} onChange={(e) => setCustPhone(e.target.value.replace(/\D/g, ""))} maxLength={10}
                                className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-gray-600" />
                        </div>
                    </div>

                    {/* Bill line items */}
                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                        {bill.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-gray-600 py-8">
                                <Receipt className="w-10 h-10 text-gray-700" />
                                <p className="text-sm font-semibold">Bill is empty</p>
                                <p className="text-xs">Click items on the left to add them</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Items ({bill.length})</p>
                                    <button onClick={clearBill} className="text-[10px] text-red-400 hover:text-red-300 cursor-pointer font-semibold">Clear All</button>
                                </div>
                                <AnimatePresence>
                                    {bill.map((item) => (
                                        <motion.div key={item._id}
                                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} layout
                                            className="flex items-center gap-2 bg-gray-800 rounded-xl p-2.5 border border-gray-700">
                                            {/* Image */}
                                            <div className="w-9 h-9 rounded-lg bg-gray-700 overflow-hidden shrink-0 flex items-center justify-center">
                                                {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" /> : <Package className="w-4 h-4 text-gray-500" />}
                                            </div>
                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-white truncate">{item.name}</p>
                                                <p className="text-[10px] text-gray-400">₹{item.price} each</p>
                                            </div>
                                            {/* Qty */}
                                            <div className="flex items-center gap-1 bg-gray-700 rounded-lg px-1.5 py-1 border border-gray-600">
                                                <button onClick={() => setQty(item._id, item.qty - 1)} className="text-gray-400 hover:text-emerald-400 cursor-pointer">
                                                    <Minus className="w-3 h-3" />
                                                </button>
                                                <span className="text-xs font-bold text-white w-4 text-center">{item.qty}</span>
                                                <button onClick={() => setQty(item._id, item.qty + 1)} className="text-gray-400 hover:text-emerald-400 cursor-pointer">
                                                    <Plus className="w-3 h-3" />
                                                </button>
                                            </div>
                                            {/* Line total */}
                                            <span className="text-xs font-extrabold text-emerald-400 w-12 text-right shrink-0">₹{item.price * item.qty}</span>
                                            {/* Remove */}
                                            <button onClick={() => removeLine(item._id)} className="text-gray-600 hover:text-red-400 cursor-pointer ml-0.5">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </>
                        )}
                    </div>

                    {/* Discount / Tax toggles */}
                    {bill.length > 0 && (
                        <div className="shrink-0 px-4 py-2 border-t border-gray-800 space-y-2">
                            <div className="flex items-center gap-2">
                                {/* Discount */}
                                <div className="flex-1 flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2">
                                    <Percent className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                    <input type="number" min={0} max={100} placeholder="Disc %" value={discount || ""}
                                        onChange={(e) => setDiscount(Math.min(100, Math.max(0, Number(e.target.value))))}
                                        className="w-full bg-transparent text-xs text-white outline-none placeholder:text-gray-600" />
                                </div>
                                {/* GST Toggle */}
                                <button onClick={() => setTaxEnabled((v) => !v)}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${taxEnabled ? "bg-blue-900 border-blue-700 text-blue-300" : "bg-gray-800 border-gray-700 text-gray-500"}`}>
                                    <Tag className="w-3 h-3" />
                                    GST {taxEnabled ? `${GST_RATE}%` : "Off"}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Totals */}
                    {bill.length > 0 && (
                        <div className="shrink-0 px-4 py-3 border-t border-gray-800 space-y-1.5 bg-gray-900">
                            <div className="flex justify-between text-xs text-gray-400">
                                <span>Subtotal</span>
                                <span className="font-semibold text-gray-200">₹{subtotal.toFixed(2)}</span>
                            </div>
                            {discountAmt > 0 && (
                                <div className="flex justify-between text-xs text-green-400">
                                    <span>Discount ({discount}%)</span>
                                    <span>−₹{discountAmt.toFixed(2)}</span>
                                </div>
                            )}
                            {taxAmt > 0 && (
                                <div className="flex justify-between text-xs text-blue-400">
                                    <span>GST ({GST_RATE}%)</span>
                                    <span>+₹{taxAmt.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-black text-lg text-white border-t border-gray-700 pt-1.5 mt-1.5">
                                <span>TOTAL</span>
                                <span className="text-emerald-400">₹{grandTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    )}

                    {/* Payment */}
                    {bill.length > 0 && (
                        <div className="shrink-0 px-4 pt-2 pb-4 space-y-3 bg-gray-900 border-t border-gray-800">
                            {/* Method select */}
                            <div className="grid grid-cols-3 gap-1.5">
                                {(["CASH", "UPI", "CARD"] as const).map((m) => (
                                    <button key={m} onClick={() => { setPayMethod(m); if (m !== "CASH") setShowNumpad(false); }}
                                        className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${payMethod === m
                                                ? "bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-900"
                                                : "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500"}`}>
                                        {m === "CASH" ? "💵" : m === "UPI" ? "📱" : "💳"} {m}
                                    </button>
                                ))}
                            </div>

                            {/* Cash paid field + numpad */}
                            {payMethod === "CASH" && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-gray-500 font-semibold">Cash Received</p>
                                        {change > 0 && (
                                            <span className="text-xs font-bold text-blue-400 bg-blue-900/50 border border-blue-800 px-2 py-0.5 rounded-full">
                                                Change: ₹{change.toFixed(2)}
                                            </span>
                                        )}
                                    </div>
                                    <button onClick={() => setShowNumpad((v) => !v)}
                                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border font-mono font-bold text-base cursor-pointer transition-all ${cashShort
                                                ? "border-red-500 bg-red-900/30 text-red-400"
                                                : "border-gray-600 bg-gray-800 text-white hover:border-gray-500"}`}>
                                        <span className="flex items-center gap-1"><IndianRupee className="w-4 h-4" />{Number(cashPaid).toFixed(2)}</span>
                                        <Calculator className="w-4 h-4 text-gray-500" />
                                    </button>
                                    {cashShort && <p className="text-xs text-red-400">Short by ₹{(grandTotal - Number(cashPaid)).toFixed(2)}</p>}
                                    <AnimatePresence>
                                        {showNumpad && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                <NumPad value={cashPaid} onChange={setCashPaid} />
                                                <button onClick={() => { setCashPaid(Math.ceil(grandTotal).toString()); }}
                                                    className="w-full mt-1.5 py-2 rounded-xl bg-gray-800 border border-gray-700 text-xs font-bold text-gray-300 hover:text-white hover:border-gray-600 cursor-pointer transition-all">
                                                    Exact Amount (₹{Math.ceil(grandTotal)})
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            {/* Collect button */}
                            <button onClick={handleCollect} disabled={submitting || bill.length === 0}
                                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-sm hover:from-emerald-400 hover:to-teal-400 transition-all shadow-xl shadow-emerald-900/50 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]">
                                {submitting
                                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                                    : <><CheckCircle2 className="w-4 h-4" /> Collect ₹{grandTotal.toFixed(2)}</>}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Sales History panel ──────────────────────────── */}
            <AnimatePresence>
                {histPanel && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setHistPanel(false)} className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
                        <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="fixed right-0 top-0 bottom-0 z-50 w-80 bg-gray-900 border-l border-gray-800 flex flex-col">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
                                <div className="flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-emerald-400" />
                                    <h3 className="font-bold text-white">Today's Sales</h3>
                                </div>
                                <button onClick={() => setHistPanel(false)} className="text-gray-500 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
                            </div>

                            {/* Summary cards */}
                            <div className="grid grid-cols-2 gap-3 px-4 py-3 border-b border-gray-800">
                                <div className="bg-gray-800 rounded-2xl p-3 text-center border border-gray-700">
                                    <p className="text-xs text-gray-400">Bills</p>
                                    <p className="text-2xl font-black text-white">{todayBills}</p>
                                </div>
                                <div className="bg-gray-800 rounded-2xl p-3 text-center border border-gray-700">
                                    <p className="text-xs text-gray-400">Revenue</p>
                                    <p className="text-2xl font-black text-emerald-400">₹{todayRevenue.toFixed(0)}</p>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                                {history.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center gap-2 text-gray-600">
                                        <ShoppingBag className="w-10 h-10 text-gray-700" />
                                        <p className="text-sm font-medium">No sales yet today</p>
                                    </div>
                                ) : history.map((order: any, i: number) => (
                                    <div key={i} className="bg-gray-800 rounded-2xl p-3 border border-gray-700 hover:border-gray-600 transition-all">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-xs font-bold text-white">#{order._id?.slice(-6).toUpperCase()}</span>
                                            <span className="text-xs font-extrabold text-emerald-400">₹{order.totalAmount}</span>
                                        </div>
                                        <p className="text-[10px] text-gray-400">
                                            {order.address?.fullName} · {fmtTime(new Date(order.createdAt))}
                                        </p>
                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                            {(order.items || []).map((it: any, j: number) => (
                                                <span key={j} className="text-[10px] bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded-full">
                                                    {it.name} ×{it.quantity}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="px-4 py-3 border-t border-gray-800">
                                <button onClick={loadHistory} className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-gray-800 border border-gray-700 text-xs font-bold text-gray-400 hover:text-white cursor-pointer transition-all">
                                    <RotateCcw className="w-3.5 h-3.5" /> Refresh
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Receipt modal */}
            <AnimatePresence>
                {receipt && <PrintReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}
            </AnimatePresence>

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] bg-red-500 text-white px-5 py-3 rounded-2xl shadow-2xl font-semibold text-sm flex items-center gap-2">
                        <X className="w-4 h-4" /> {toast}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
