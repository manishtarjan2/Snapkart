"use client";

import React, { useState, useEffect, useCallback } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import {
    User, Mail, Phone, Shield, Package, MapPin, Bell, Lock,
    Heart, CreditCard, HelpCircle, ChevronRight, LogOut, Camera,
    CheckCircle, XCircle, Loader2, Edit3, Save, X, Truck,
    ShoppingBag, Clock, IndianRupee, BarChart3, Eye, EyeOff,
    Smartphone, Globe, Moon, Sun, Trash2, Star, Gift,
    MessageSquare, FileText, Info, AlertTriangle, Wallet,
    ArrowLeft, Settings, Tag
} from "lucide-react";

type UserData = {
    _id: string;
    name: string;
    email: string;
    mobile: string;
    role: string;
    image: string | null;
    isBlocked?: boolean;
    createdAt?: string;
    updatedAt?: string;
};

type OrderStats = {
    totalOrders: number;
    totalSpent: number;
    deliveredOrders: number;
    pendingOrders: number;
    cancelledOrders: number;
    lastOrderDate: string | null;
};

type SettingsSection = "profile" | "orders" | "addresses" | "notifications" | "privacy" | "appearance" | "help";

export default function UserSettingsClient() {
    const [user, setUser] = useState<UserData | null>(null);
    const [stats, setStats] = useState<OrderStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState<SettingsSection>("profile");
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
    const [editForm, setEditForm] = useState({ name: "", mobile: "" });

    // Preferences (local state)
    const [prefs, setPrefs] = useState({
        darkMode: true,
        orderUpdates: true,
        promotions: false,
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: true,
        showOnlineStatus: false,
        twoFactor: false,
        language: "English",
        currency: "INR (₹)",
    });

    const notify = useCallback((msg: string, type: "ok" | "err" = "ok") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    }, []);

    const loadSettings = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/user/settings");
            const data = await res.json();
            if (res.ok) {
                setUser(data.user);
                setStats(data.stats);
                setEditForm({ name: data.user.name, mobile: data.user.mobile || "" });
            }
        } catch {
            notify("Failed to load settings", "err");
        } finally {
            setLoading(false);
        }
    }, [notify]);

    useEffect(() => { loadSettings(); }, [loadSettings]);

    const handleSave = async () => {
        if (!editForm.name.trim()) { notify("Name is required", "err"); return; }
        setSaving(true);
        try {
            const res = await fetch("/api/user/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: editForm.name.trim(), mobile: editForm.mobile.trim() }),
            });
            const data = await res.json();
            if (res.ok) {
                setUser(prev => prev ? { ...prev, ...data.user } : prev);
                notify("Profile updated ✓");
                setEditing(false);
            } else {
                notify(data.message || "Failed to update", "err");
            }
        } catch { notify("Network error", "err"); }
        finally { setSaving(false); }
    };

    const formatDate = (d: string | null | undefined) => {
        if (!d) return "—";
        return new Date(d).toLocaleDateString("en-IN", {
            day: "numeric", month: "short", year: "numeric"
        });
    };

    const formatCurrency = (n: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 0,
        }).format(n);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center animate-pulse">
                        <Settings className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-gray-400 text-sm font-medium animate-pulse">Loading settings…</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <p className="text-red-400">Failed to load user data.</p>
            </div>
        );
    }

    const getInitials = (name: string) =>
        name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

    const memberSince = formatDate(user.createdAt);

    const SECTIONS: { id: SettingsSection; label: string; icon: React.ElementType; color: string; desc: string }[] = [
        { id: "profile", label: "Profile", icon: User, color: "from-indigo-500 to-violet-600", desc: "Personal info & account" },
        { id: "orders", label: "Orders & Activity", icon: Package, color: "from-amber-500 to-orange-600", desc: "Order history & stats" },
        { id: "addresses", label: "Addresses", icon: MapPin, color: "from-emerald-500 to-teal-600", desc: "Saved delivery addresses" },
        { id: "notifications", label: "Notifications", icon: Bell, color: "from-yellow-500 to-amber-600", desc: "Alerts & preferences" },
        { id: "privacy", label: "Privacy & Security", icon: Shield, color: "from-red-500 to-rose-600", desc: "Password & security" },
        { id: "appearance", label: "Appearance", icon: Moon, color: "from-blue-500 to-cyan-600", desc: "Theme & language" },
        { id: "help", label: "Help & Support", icon: HelpCircle, color: "from-green-500 to-emerald-600", desc: "FAQ & contact" },
    ];

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-[100] flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold shadow-2xl border backdrop-blur-xl transition-all animate-in slide-in-from-right ${toast.type === "ok" ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300" : "bg-red-500/20 border-red-500/30 text-red-300"}`}>
                    {toast.type === "ok" ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <header className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-900/40">
                                <Settings className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h1 className="text-sm font-bold">Settings</h1>
                                <p className="text-[10px] text-gray-500">Account & Preferences</p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all font-medium"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="hidden sm:inline">Sign Out</span>
                    </button>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
                {/* Profile Hero Card */}
                <div className="relative rounded-3xl bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-white/[0.08] overflow-hidden mb-6">
                    {/* Background glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-full blur-3xl" />

                    <div className="relative px-6 py-8 sm:px-8 sm:py-10">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                            {/* Avatar */}
                            <div className="relative group">
                                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-3xl font-black shadow-2xl shadow-emerald-900/50 ring-4 ring-gray-900">
                                    {user.image ? (
                                        <img src={user.image} alt={user.name} className="w-full h-full rounded-3xl object-cover" />
                                    ) : (
                                        getInitials(user.name)
                                    )}
                                </div>
                                <button className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-gray-800 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-all shadow-lg">
                                    <Camera size={14} />
                                </button>
                            </div>

                            {/* Info */}
                            <div className="flex-1 text-center sm:text-left">
                                <h2 className="text-2xl font-black capitalize">{user.name}</h2>
                                <p className="text-sm text-gray-400 mt-1">{user.email}</p>
                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                                        <Shield size={10} />{user.role}
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white/5 text-gray-400 border border-white/10">
                                        <Clock size={10} />Member since {memberSince}
                                    </span>
                                    {user.mobile && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white/5 text-gray-400 border border-white/10">
                                            <Phone size={10} />{user.mobile}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Quick Stats */}
                            {stats && (
                                <div className="grid grid-cols-2 gap-3 shrink-0">
                                    <div className="text-center p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] min-w-[90px]">
                                        <p className="text-xl font-black text-emerald-400">{stats.totalOrders}</p>
                                        <p className="text-[10px] text-gray-500 font-medium">Orders</p>
                                    </div>
                                    <div className="text-center p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] min-w-[90px]">
                                        <p className="text-xl font-black text-amber-400">{formatCurrency(stats.totalSpent)}</p>
                                        <p className="text-[10px] text-gray-500 font-medium">Spent</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Layout: Sidebar + Content */}
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Sidebar Navigation */}
                    <aside className="lg:w-72 shrink-0">
                        <div className="bg-gray-900 rounded-2xl border border-white/[0.06] overflow-hidden lg:sticky lg:top-24">
                            <div className="p-2 space-y-0.5">
                                {SECTIONS.map(({ id, label, icon: Icon, color, desc }) => (
                                    <button
                                        key={id}
                                        onClick={() => setActiveSection(id)}
                                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all ${activeSection === id
                                            ? "bg-white/[0.08] border border-white/[0.10]"
                                            : "hover:bg-white/[0.04] border border-transparent"
                                            }`}
                                    >
                                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shrink-0 ${activeSection === id ? "shadow-lg" : "opacity-70"}`}>
                                            <Icon size={16} className="text-white" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`text-sm font-semibold ${activeSection === id ? "text-white" : "text-gray-300"}`}>{label}</p>
                                            <p className="text-[10px] text-gray-500 truncate">{desc}</p>
                                        </div>
                                        {activeSection === id && <ChevronRight size={14} className="ml-auto text-gray-400 shrink-0" />}
                                    </button>
                                ))}
                            </div>

                            {/* Quick Links */}
                            <div className="p-3 border-t border-white/[0.06] space-y-1">
                                <Link href="/orders" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/[0.04] transition-all font-medium">
                                    <Package size={13} />My Orders
                                </Link>
                                <Link href="/wishlist" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/[0.04] transition-all font-medium">
                                    <Heart size={13} />Wishlist
                                </Link>
                                <Link href="/wallet" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/[0.04] transition-all font-medium">
                                    <Wallet size={13} />Wallet & Cards
                                </Link>
                                <Link href="/rewards" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/[0.04] transition-all font-medium">
                                    <Tag size={13} />Coupons
                                </Link>
                            </div>

                            {/* Danger Zone */}
                            <div className="p-3 border-t border-white/[0.06]">
                                <button
                                    onClick={() => signOut({ callbackUrl: "/login" })}
                                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all font-medium"
                                >
                                    <LogOut size={14} />Sign Out
                                </button>
                            </div>
                        </div>
                    </aside>

                    {/* Content Area */}
                    <div className="flex-1 min-w-0 space-y-5">

                        {/* ═══════════════ PROFILE ═══════════════ */}
                        {activeSection === "profile" && (
                            <>
                                {/* Personal Information */}
                                <div className="bg-gray-900 rounded-2xl border border-white/[0.06] overflow-hidden">
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
                                        <div className="flex items-center gap-2">
                                            <User size={16} className="text-indigo-400" />
                                            <h3 className="text-sm font-bold">Personal Information</h3>
                                        </div>
                                        {!editing ? (
                                            <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-400 hover:bg-indigo-500/10 transition-all">
                                                <Edit3 size={12} />Edit
                                            </button>
                                        ) : (
                                            <div className="flex gap-2">
                                                <button onClick={() => setEditing(false)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:bg-white/5 transition-all">
                                                    <X size={12} />Cancel
                                                </button>
                                                <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all disabled:opacity-50">
                                                    {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                                    Save
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="px-6 py-5 space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5 block">Full Name</label>
                                                {editing ? (
                                                    <input
                                                        type="text"
                                                        value={editForm.name}
                                                        onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                                        className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                                                    />
                                                ) : (
                                                    <p className="text-sm font-semibold text-white capitalize flex items-center gap-2">
                                                        <User size={14} className="text-gray-500" />{user.name}
                                                    </p>
                                                )}
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5 block">Email Address</label>
                                                <p className="text-sm text-gray-300 flex items-center gap-2">
                                                    <Mail size={14} className="text-gray-500" />{user.email}
                                                    <CheckCircle size={12} className="text-emerald-400" />
                                                </p>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5 block">Phone Number</label>
                                                {editing ? (
                                                    <input
                                                        type="tel"
                                                        value={editForm.mobile}
                                                        onChange={e => setEditForm(f => ({ ...f, mobile: e.target.value }))}
                                                        placeholder="+91 XXXXX XXXXX"
                                                        className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-all"
                                                    />
                                                ) : (
                                                    <p className="text-sm text-gray-300 flex items-center gap-2">
                                                        <Phone size={14} className="text-gray-500" />{user.mobile || "Not provided"}
                                                        {user.mobile && <CheckCircle size={12} className="text-emerald-400" />}
                                                    </p>
                                                )}
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5 block">Account Type</label>
                                                <p className="text-sm text-gray-300 flex items-center gap-2">
                                                    <Shield size={14} className="text-gray-500" />
                                                    <span className="capitalize font-semibold">{user.role}</span>
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 font-bold">Active</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Account Details */}
                                <div className="bg-gray-900 rounded-2xl border border-white/[0.06] overflow-hidden">
                                    <div className="flex items-center gap-2 px-6 py-4 border-b border-white/[0.06]">
                                        <Info size={16} className="text-blue-400" />
                                        <h3 className="text-sm font-bold">Account Details</h3>
                                    </div>
                                    <div className="px-6 py-5">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                                                <Clock size={16} className="text-gray-500 shrink-0" />
                                                <div>
                                                    <p className="text-[10px] text-gray-500 font-semibold uppercase">Member Since</p>
                                                    <p className="text-sm text-white font-medium">{memberSince}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                                                <Clock size={16} className="text-gray-500 shrink-0" />
                                                <div>
                                                    <p className="text-[10px] text-gray-500 font-semibold uppercase">Last Updated</p>
                                                    <p className="text-sm text-white font-medium">{formatDate(user.updatedAt)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                                                <Globe size={16} className="text-gray-500 shrink-0" />
                                                <div>
                                                    <p className="text-[10px] text-gray-500 font-semibold uppercase">User ID</p>
                                                    <p className="text-sm text-white font-mono">{user._id.slice(-8).toUpperCase()}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                                                <Shield size={16} className={`shrink-0 ${user.isBlocked ? "text-red-400" : "text-emerald-400"}`} />
                                                <div>
                                                    <p className="text-[10px] text-gray-500 font-semibold uppercase">Account Status</p>
                                                    <p className={`text-sm font-semibold ${user.isBlocked ? "text-red-400" : "text-emerald-400"}`}>
                                                        {user.isBlocked ? "Blocked" : "Active & Verified"}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ═══════════════ ORDERS & ACTIVITY ═══════════════ */}
                        {activeSection === "orders" && stats && (
                            <>
                                {/* Order Statistics */}
                                <div className="bg-gray-900 rounded-2xl border border-white/[0.06] overflow-hidden">
                                    <div className="flex items-center gap-2 px-6 py-4 border-b border-white/[0.06]">
                                        <BarChart3 size={16} className="text-amber-400" />
                                        <h3 className="text-sm font-bold">Order Statistics</h3>
                                    </div>
                                    <div className="px-6 py-5">
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            {[
                                                { label: "Total Orders", value: stats.totalOrders, icon: ShoppingBag, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
                                                { label: "Delivered", value: stats.deliveredOrders, icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
                                                { label: "Pending", value: stats.pendingOrders, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
                                                { label: "Cancelled", value: stats.cancelledOrders, icon: XCircle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
                                            ].map(({ label, value, icon: Icon, color, bg }) => (
                                                <div key={label} className={`text-center p-4 rounded-2xl border ${bg} transition-all hover:scale-[1.02]`}>
                                                    <Icon size={20} className={`${color} mx-auto mb-2`} />
                                                    <p className={`text-2xl font-black ${color}`}>{value}</p>
                                                    <p className="text-[10px] text-gray-500 font-medium mt-1">{label}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Spending Summary */}
                                <div className="bg-gray-900 rounded-2xl border border-white/[0.06] overflow-hidden">
                                    <div className="flex items-center gap-2 px-6 py-4 border-b border-white/[0.06]">
                                        <IndianRupee size={16} className="text-emerald-400" />
                                        <h3 className="text-sm font-bold">Spending Summary</h3>
                                    </div>
                                    <div className="px-6 py-5">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                                                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                                    <IndianRupee size={20} className="text-emerald-400" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-semibold uppercase">Total Spent</p>
                                                    <p className="text-xl font-black text-emerald-400">{formatCurrency(stats.totalSpent)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                                                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                                    <BarChart3 size={20} className="text-blue-400" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-semibold uppercase">Avg per Order</p>
                                                    <p className="text-xl font-black text-blue-400">{stats.totalOrders > 0 ? formatCurrency(stats.totalSpent / stats.totalOrders) : "₹0"}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                                                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                                    <Clock size={20} className="text-purple-400" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-semibold uppercase">Last Order</p>
                                                    <p className="text-sm font-bold text-white">{formatDate(stats.lastOrderDate)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <Link href="/orders" className="flex items-center gap-3 p-4 rounded-2xl bg-gray-900 border border-white/[0.06] hover:border-amber-500/30 transition-all group">
                                        <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center group-hover:bg-amber-500/25 transition-all">
                                            <Package size={18} className="text-amber-400" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold">View All Orders</p>
                                            <p className="text-[10px] text-gray-500">See your complete order history</p>
                                        </div>
                                        <ChevronRight size={16} className="text-gray-600 group-hover:text-amber-400 transition-all" />
                                    </Link>
                                    <Link href="/track-order" className="flex items-center gap-3 p-4 rounded-2xl bg-gray-900 border border-white/[0.06] hover:border-orange-500/30 transition-all group">
                                        <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center group-hover:bg-orange-500/25 transition-all">
                                            <Truck size={18} className="text-orange-400" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold">Track Current Order</p>
                                            <p className="text-[10px] text-gray-500">Live delivery tracking</p>
                                        </div>
                                        <ChevronRight size={16} className="text-gray-600 group-hover:text-orange-400 transition-all" />
                                    </Link>
                                </div>
                            </>
                        )}

                        {/* ═══════════════ ADDRESSES ═══════════════ */}
                        {activeSection === "addresses" && (
                            <div className="bg-gray-900 rounded-2xl border border-white/[0.06] overflow-hidden">
                                <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
                                    <div className="flex items-center gap-2">
                                        <MapPin size={16} className="text-emerald-400" />
                                        <h3 className="text-sm font-bold">Saved Addresses</h3>
                                    </div>
                                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all">
                                        <MapPin size={12} />Add New
                                    </button>
                                </div>
                                <div className="px-6 py-5 space-y-3">
                                    {/* Default address card */}
                                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-emerald-500/20 relative">
                                        <span className="absolute top-3 right-3 text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/20">DEFAULT</span>
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0 mt-0.5">
                                                <MapPin size={16} className="text-emerald-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold">Home</p>
                                                <p className="text-xs text-gray-400 mt-1">Please add your delivery address during checkout to save it here</p>
                                                <div className="flex gap-2 mt-3">
                                                    <button className="text-[10px] px-2.5 py-1 rounded-lg bg-white/[0.04] text-gray-400 hover:text-white transition-all font-semibold">Edit</button>
                                                    <button className="text-[10px] px-2.5 py-1 rounded-lg bg-white/[0.04] text-gray-400 hover:text-white transition-all font-semibold">Delete</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Work address placeholder */}
                                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0 mt-0.5">
                                                <MapPin size={16} className="text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold">Work</p>
                                                <p className="text-xs text-gray-400 mt-1">Add your work address for quick delivery</p>
                                                <button className="mt-3 text-[10px] px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 transition-all font-semibold">
                                                    + Add Address
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══════════════ NOTIFICATIONS ═══════════════ */}
                        {activeSection === "notifications" && (
                            <div className="bg-gray-900 rounded-2xl border border-white/[0.06] overflow-hidden">
                                <div className="flex items-center gap-2 px-6 py-4 border-b border-white/[0.06]">
                                    <Bell size={16} className="text-yellow-400" />
                                    <h3 className="text-sm font-bold">Notification Preferences</h3>
                                </div>
                                <div className="px-6 py-5 space-y-1">
                                    {([
                                        { key: "orderUpdates", label: "Order Updates", desc: "Get notified about order status changes", icon: Package, color: "text-amber-400" },
                                        { key: "promotions", label: "Promotions & Offers", desc: "Deals, discounts, and special offers", icon: Tag, color: "text-pink-400" },
                                        { key: "emailNotifications", label: "Email Notifications", desc: "Receive updates via email", icon: Mail, color: "text-blue-400" },
                                        { key: "smsNotifications", label: "SMS Notifications", desc: "Receive updates via text message", icon: Smartphone, color: "text-green-400" },
                                        { key: "pushNotifications", label: "Push Notifications", desc: "Browser push notifications", icon: Bell, color: "text-yellow-400" },
                                    ] as const).map(({ key, label, desc, icon: Icon, color }) => (
                                        <div key={key} className="flex items-center justify-between py-3.5 border-b border-white/[0.04] last:border-0">
                                            <div className="flex items-center gap-3">
                                                <Icon size={16} className={color} />
                                                <div>
                                                    <p className="text-sm font-semibold">{label}</p>
                                                    <p className="text-[10px] text-gray-500">{desc}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setPrefs(p => ({ ...p, [key]: !p[key] }))}
                                                className={`w-11 h-6 rounded-full transition-all relative ${prefs[key] ? "bg-emerald-500" : "bg-gray-700"}`}
                                            >
                                                <div className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-all ${prefs[key] ? "left-5.5" : "left-0.5"}`} style={{ left: prefs[key] ? "22px" : "2px" }} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ═══════════════ PRIVACY & SECURITY ═══════════════ */}
                        {activeSection === "privacy" && (
                            <>
                                <div className="bg-gray-900 rounded-2xl border border-white/[0.06] overflow-hidden">
                                    <div className="flex items-center gap-2 px-6 py-4 border-b border-white/[0.06]">
                                        <Lock size={16} className="text-red-400" />
                                        <h3 className="text-sm font-bold">Security Settings</h3>
                                    </div>
                                    <div className="px-6 py-5 space-y-1">
                                        <div className="flex items-center justify-between py-3.5 border-b border-white/[0.04]">
                                            <div className="flex items-center gap-3">
                                                <Lock size={16} className="text-red-400" />
                                                <div>
                                                    <p className="text-sm font-semibold">Change Password</p>
                                                    <p className="text-[10px] text-gray-500">Update your account password</p>
                                                </div>
                                            </div>
                                            <button className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.04] text-gray-400 hover:text-white font-semibold transition-all">
                                                Change
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between py-3.5 border-b border-white/[0.04]">
                                            <div className="flex items-center gap-3">
                                                <Shield size={16} className="text-violet-400" />
                                                <div>
                                                    <p className="text-sm font-semibold">Two-Factor Authentication</p>
                                                    <p className="text-[10px] text-gray-500">Add extra security to your account</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setPrefs(p => ({ ...p, twoFactor: !p.twoFactor }))}
                                                className={`w-11 h-6 rounded-full transition-all relative ${prefs.twoFactor ? "bg-emerald-500" : "bg-gray-700"}`}
                                            >
                                                <div className="w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-all" style={{ left: prefs.twoFactor ? "22px" : "2px" }} />
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between py-3.5 border-b border-white/[0.04]">
                                            <div className="flex items-center gap-3">
                                                <Eye size={16} className="text-blue-400" />
                                                <div>
                                                    <p className="text-sm font-semibold">Show Online Status</p>
                                                    <p className="text-[10px] text-gray-500">Let others see when you&apos;re active</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setPrefs(p => ({ ...p, showOnlineStatus: !p.showOnlineStatus }))}
                                                className={`w-11 h-6 rounded-full transition-all relative ${prefs.showOnlineStatus ? "bg-emerald-500" : "bg-gray-700"}`}
                                            >
                                                <div className="w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-all" style={{ left: prefs.showOnlineStatus ? "22px" : "2px" }} />
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between py-3.5">
                                            <div className="flex items-center gap-3">
                                                <FileText size={16} className="text-gray-400" />
                                                <div>
                                                    <p className="text-sm font-semibold">Login Activity</p>
                                                    <p className="text-[10px] text-gray-500">View recent login sessions</p>
                                                </div>
                                            </div>
                                            <button className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.04] text-gray-400 hover:text-white font-semibold transition-all">
                                                View
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Danger Zone */}
                                <div className="bg-gray-900 rounded-2xl border border-red-500/20 overflow-hidden">
                                    <div className="flex items-center gap-2 px-6 py-4 border-b border-red-500/10">
                                        <AlertTriangle size={16} className="text-red-400" />
                                        <h3 className="text-sm font-bold text-red-400">Danger Zone</h3>
                                    </div>
                                    <div className="px-6 py-5 space-y-3">
                                        <div className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                                            <div>
                                                <p className="text-sm font-semibold text-red-300">Delete Account</p>
                                                <p className="text-[10px] text-gray-500">Permanently remove your account and all data</p>
                                            </div>
                                            <button className="text-xs px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 font-semibold transition-all">
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ═══════════════ APPEARANCE ═══════════════ */}
                        {activeSection === "appearance" && (
                            <div className="bg-gray-900 rounded-2xl border border-white/[0.06] overflow-hidden">
                                <div className="flex items-center gap-2 px-6 py-4 border-b border-white/[0.06]">
                                    <Moon size={16} className="text-blue-400" />
                                    <h3 className="text-sm font-bold">Appearance & Language</h3>
                                </div>
                                <div className="px-6 py-5 space-y-5">
                                    {/* Theme */}
                                    <div>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-3">Theme</p>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { label: "Dark", icon: Moon, active: prefs.darkMode },
                                                { label: "Light", icon: Sun, active: !prefs.darkMode },
                                                { label: "System", icon: Smartphone, active: false },
                                            ].map(({ label, icon: Icon, active }) => (
                                                <button
                                                    key={label}
                                                    onClick={() => { if (label === "Dark") setPrefs(p => ({ ...p, darkMode: true })); else if (label === "Light") setPrefs(p => ({ ...p, darkMode: false })); }}
                                                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${active ? "bg-blue-500/10 border-blue-500/30 text-blue-300" : "bg-white/[0.03] border-white/[0.06] text-gray-400 hover:border-white/10"}`}
                                                >
                                                    <Icon size={20} />
                                                    <span className="text-xs font-semibold">{label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Language */}
                                    <div>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-3">Language</p>
                                        <select
                                            value={prefs.language}
                                            onChange={e => setPrefs(p => ({ ...p, language: e.target.value }))}
                                            className="w-full bg-[#111827] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50"
                                            style={{ colorScheme: 'dark' }}
                                        >
                                            {["English", "Hindi", "Tamil", "Telugu", "Kannada", "Malayalam", "Bengali", "Marathi"].map(l => (
                                                <option key={l} value={l} className="bg-[#111827] text-white">{l}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Currency */}
                                    <div>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-3">Currency</p>
                                        <select
                                            value={prefs.currency}
                                            onChange={e => setPrefs(p => ({ ...p, currency: e.target.value }))}
                                            className="w-full bg-[#111827] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50"
                                            style={{ colorScheme: 'dark' }}
                                        >
                                            {["INR (₹)", "USD ($)", "EUR (€)", "GBP (£)"].map(c => (
                                                <option key={c} value={c} className="bg-[#111827] text-white">{c}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══════════════ HELP & SUPPORT ═══════════════ */}
                        {activeSection === "help" && (
                            <div className="space-y-5">
                                <div className="bg-gray-900 rounded-2xl border border-white/[0.06] overflow-hidden">
                                    <div className="flex items-center gap-2 px-6 py-4 border-b border-white/[0.06]">
                                        <HelpCircle size={16} className="text-green-400" />
                                        <h3 className="text-sm font-bold">Help & Support</h3>
                                    </div>
                                    <div className="px-6 py-5 space-y-1">
                                        {[
                                            { label: "Help Center", desc: "Browse FAQ and guides", icon: HelpCircle, color: "text-green-400", href: "/help" },
                                            { label: "Contact Us", desc: "Get in touch with our support team", icon: MessageSquare, color: "text-blue-400", href: "/help" },
                                            { label: "Report a Problem", desc: "Something not working? Let us know", icon: AlertTriangle, color: "text-amber-400", href: "/help" },
                                            { label: "Rate the App", desc: "Share your experience", icon: Star, color: "text-yellow-400", href: "#" },
                                            { label: "Refer & Earn", desc: "Invite friends, earn rewards", icon: Gift, color: "text-pink-400", href: "/rewards" },
                                        ].map(({ label, desc, icon: Icon, color, href }) => (
                                            <Link key={label} href={href} className="flex items-center justify-between py-3.5 border-b border-white/[0.04] last:border-0 group">
                                                <div className="flex items-center gap-3">
                                                    <Icon size={16} className={color} />
                                                    <div>
                                                        <p className="text-sm font-semibold group-hover:text-white transition-colors">{label}</p>
                                                        <p className="text-[10px] text-gray-500">{desc}</p>
                                                    </div>
                                                </div>
                                                <ChevronRight size={14} className="text-gray-600 group-hover:text-white transition-all" />
                                            </Link>
                                        ))}
                                    </div>
                                </div>

                                {/* About */}
                                <div className="bg-gray-900 rounded-2xl border border-white/[0.06] p-6 text-center">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto mb-3 shadow-xl shadow-emerald-900/40">
                                        <ShoppingBag size={24} className="text-white" />
                                    </div>
                                    <h3 className="text-lg font-black bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">Snapkart</h3>
                                    <p className="text-[10px] text-gray-500 mt-1">Version 2.0.0 · Fresh Grocery Delivery</p>
                                    <div className="flex justify-center gap-4 mt-4">
                                        <a href="#" className="text-[10px] text-gray-500 hover:text-white transition-all">Privacy Policy</a>
                                        <a href="#" className="text-[10px] text-gray-500 hover:text-white transition-all">Terms of Service</a>
                                        <a href="#" className="text-[10px] text-gray-500 hover:text-white transition-all">Licenses</a>
                                    </div>
                                    <p className="text-[10px] text-gray-600 mt-3">© 2026 Snapkart. All rights reserved.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
