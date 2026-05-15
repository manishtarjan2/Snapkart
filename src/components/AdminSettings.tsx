"use client";

import React, { useState, useEffect, useCallback } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import {
    User, Mail, Phone, Shield, Settings, Bell, Lock,
    BarChart3, Users, Package, Truck, IndianRupee, Eye, EyeOff,
    Smartphone, Globe, Moon, Sun, CheckCircle, XCircle, Loader2,
    Edit3, Save, X, ArrowLeft, Settings as SettingsIcon, UsersIcon,
    BarChart, PackageIcon, TruckIcon, DollarSign, FileText, Info,
    AlertTriangle, ChevronRight, ToggleLeft, ToggleRight,
    Database, ShieldCheck, Key, Activity, MessageSquare,
    Calendar, Star, Gift, Tag, Wallet, Camera, LogOut
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

type AdminStats = {
    totalUsers: number;
    totalOrders: number;
    totalRevenue: number;
    activeDeliveries: number;
    pendingOrders: number;
    systemHealth: "good" | "warning" | "critical";
};

type SettingsSection = "profile" | "system" | "users" | "orders" | "deliveries" | "analytics" | "notifications" | "security" | "appearance" | "help";

export default function AdminSettings() {
    const [user, setUser] = useState<UserData | null>(null);
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState<SettingsSection>("profile");
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
    const [editForm, setEditForm] = useState({ name: "", mobile: "" });

    // Admin-specific preferences
    const [adminPrefs, setAdminPrefs] = useState({
        maintenanceMode: false,
        autoAssignDeliveries: true,
        emailNotifications: true,
        smsGateway: "twilio", // twilio, aws, custom
        paymentGateway: "razorpay", // razorpay, stripe, paypal
        backupFrequency: "daily", // daily, weekly, monthly
        logRetention: 90, // days
        maxOrderRadius: 25, // km
        commissionRate: 5, // percentage
        minOrderValue: 50, // rupees
        supportEmail: "",
        systemAlerts: true,
        userRegistration: true,
        deliveryTracking: true
    });

    // General preferences
    const [prefs, setPrefs] = useState({
        darkMode: true,
        orderUpdates: true,
        systemAlerts: true,
        promotions: false,
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: true,
        showOnlineStatus: false,
        twoFactor: true,
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
            const res = await fetch("/api/admin/settings");
            const data = await res.json();
            if (res.ok) {
                setUser(data.user);
                setStats(data.stats);
                setAdminPrefs(data.adminPrefs || adminPrefs);
                setEditForm({ name: data.user.name, mobile: data.user.mobile || "" });
            }
        } catch {
            notify("Failed to load settings", "err");
        } finally {
            setLoading(false);
        }
    }, [notify, adminPrefs]);

    useEffect(() => { loadSettings(); }, [loadSettings]);

    const handleSave = async () => {
        if (!editForm.name.trim()) { notify("Name is required", "err"); return; }
        setSaving(true);
        try {
            const res = await fetch("/api/admin/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: editForm.name.trim(),
                    mobile: editForm.mobile.trim(),
                    adminPrefs
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setUser(prev => prev ? { ...prev, ...data.user } : prev);
                setAdminPrefs(data.adminPrefs);
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
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center animate-pulse">
                        <SettingsIcon className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-gray-400 text-sm font-medium animate-pulse">Loading admin settings…</p>
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
        { id: "system", label: "System", icon: Database, color: "from-red-500 to-rose-600", desc: "System configuration" },
        { id: "users", label: "Users", icon: Users, color: "from-blue-500 to-cyan-600", desc: "User management" },
        { id: "orders", label: "Orders", icon: Package, color: "from-amber-500 to-orange-600", desc: "Order settings" },
        { id: "deliveries", label: "Deliveries", icon: Truck, color: "from-emerald-500 to-teal-600", desc: "Delivery management" },
        { id: "analytics", label: "Analytics", icon: BarChart, color: "from-yellow-500 to-amber-600", desc: "Reports & analytics" },
        { id: "notifications", label: "Notifications", icon: Bell, color: "from-purple-500 to-pink-600", desc: "Alerts & preferences" },
        { id: "security", label: "Security", icon: Shield, color: "from-red-500 to-rose-600", desc: "Security settings" },
        { id: "appearance", label: "Appearance", icon: Moon, color: "from-green-500 to-emerald-600", desc: "Theme & language" },
        { id: "help", label: "Help & Support", icon: MessageSquare, color: "from-cyan-500 to-blue-600", desc: "FAQ & contact" },
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
                        <Link href="/super-admin" className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center shadow-lg shadow-red-900/40">
                                <SettingsIcon className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h1 className="text-sm font-bold">Admin Settings</h1>
                                <p className="text-[10px] text-gray-500">System & Preferences</p>
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
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-red-500/10 to-transparent rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple-500/10 to-transparent rounded-full blur-3xl" />

                    <div className="relative px-6 py-8 sm:px-8 sm:py-10">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                            {/* Avatar */}
                            <div className="relative group">
                                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-red-400 to-purple-500 flex items-center justify-center text-white text-3xl font-black shadow-2xl shadow-red-900/50 ring-4 ring-gray-900">
                                    {user.image ? (
                                        <img src={user.image} alt={user.name} className="w-full h-full rounded-3xl object-cover" />
                                    ) : (
                                        getInitials(user.name)
                                    )}
                                </div>
                                <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:bg-white/5 transition-all">
                                    <Camera size={12} />Change
                                </button>
                            </div>

                            {/* Info */}
                            <div className="flex-1 text-center sm:text-left">
                                <h2 className="text-2xl font-black capitalize">{user.name}</h2>
                                <p className="text-sm text-gray-400 mt-1">{user.email}</p>
                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/15 text-red-300 border border-red-500/20">
                                        <ShieldCheck size={10} />System Admin
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white/5 text-gray-400 border border-white/10">
                                        <Activity size={10} />Active
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white/5 text-gray-400 border border-white/10">
                                        <Calendar size={10} />Member since {memberSince}
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
                                        <p className="text-xl font-black text-red-400">{stats.totalUsers}</p>
                                        <p className="text-[10px] text-gray-500 font-medium">Total Users</p>
                                    </div>
                                    <div className="text-center p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] min-w-[90px]">
                                        <p className="text-xl font-black text-purple-400">{formatCurrency(stats.totalRevenue)}</p>
                                        <p className="text-[10px] text-gray-500 font-medium">Revenue</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Layout: Sidebar + Content */}
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Sidebar Navigation */}
                    <aside className="lg:w-80 shrink-0">
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
                                <Link href="/super-admin" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/[0.04] transition-all font-medium">
                                    <BarChart size={13} />Dashboard
                                </Link>
                                <Link href="/super-admin/users" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/[0.04] transition-all font-medium">
                                    <Users size={13} />User Management
                                </Link>
                                <Link href="/super-admin/orders" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/[0.04] transition-all font-medium">
                                    <Package size={13} />Order Management
                                </Link>
                                <Link href="/super-admin/deliveries" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/[0.04] transition-all font-medium">
                                    <Truck size={13} />Delivery Management
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
                                                    <span className="capitalize font-semibold">System Administrator</span>
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/20 font-bold">Super Admin</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Support Contact */}
                                <div className="bg-gray-900 rounded-2xl border border-white/[0.06] overflow-hidden">
                                    <div className="flex items-center gap-2 px-6 py-4 border-b border-white/[0.06]">
                                        <MessageSquare size={16} className="text-blue-400" />
                                        <h3 className="text-sm font-bold">Support Contact</h3>
                                    </div>
                                    <div className="px-6 py-5">
                                        <div className="max-w-md">
                                            <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5 block">Support Email</label>
                                            <input
                                                type="email"
                                                value={adminPrefs.supportEmail}
                                                onChange={e => setAdminPrefs(p => ({ ...p, supportEmail: e.target.value }))}
                                                placeholder="support@snapkart.com"
                                                className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-all"
                                            />
                                            <p className="text-[10px] text-gray-500 mt-2">This email will be displayed to users for support inquiries.</p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ═══════════════ SYSTEM ═══════════════ */}
                        {activeSection === "system" && (
                            <div className="space-y-5">
                                {/* Maintenance Mode */}
                                <div className="bg-gray-900 rounded-2xl border border-white/[0.06] overflow-hidden">
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle size={16} className="text-amber-400" />
                                            <h3 className="text-sm font-bold">Maintenance Mode</h3>
                                        </div>
                                        <button
                                            onClick={() => setAdminPrefs(p => ({ ...p, maintenanceMode: !p.maintenanceMode }))}
                                            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${adminPrefs.maintenanceMode ? "bg-amber-600" : "bg-gray-600"}`}
                                        >
                                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${adminPrefs.maintenanceMode ? "translate-x-8" : "translate-x-1"}`} />
                                        </button>
                                    </div>
                                    <div className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-3 h-3 rounded-full ${adminPrefs.maintenanceMode ? "bg-amber-400" : "bg-emerald-400"}`} />
                                            <div>
                                                <p className="text-sm font-semibold text-white">
                                                    {adminPrefs.maintenanceMode ? "Maintenance mode enabled" : "System operational"}
                                                </p>
                                                <p className="text-[10px] text-gray-500">
                                                    {adminPrefs.maintenanceMode ? "Users cannot place orders or access the app" : "All systems are running normally"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* System Configuration */}
                                <div className="bg-gray-900 rounded-2xl border border-white/[0.06] overflow-hidden">
                                    <div className="flex items-center gap-2 px-6 py-4 border-b border-white/[0.06]">
                                        <Database size={16} className="text-red-400" />
                                        <h3 className="text-sm font-bold">System Configuration</h3>
                                    </div>
                                    <div className="px-6 py-5 space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5 block">Backup Frequency</label>
                                                <select
                                                    value={adminPrefs.backupFrequency}
                                                    onChange={e => setAdminPrefs(p => ({ ...p, backupFrequency: e.target.value }))}
                                                    className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50 transition-all"
                                                >
                                                    <option value="daily">Daily</option>
                                                    <option value="weekly">Weekly</option>
                                                    <option value="monthly">Monthly</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5 block">Log Retention (days)</label>
                                                <input
                                                    type="number"
                                                    min="7"
                                                    max="365"
                                                    value={adminPrefs.logRetention}
                                                    onChange={e => setAdminPrefs(p => ({ ...p, logRetention: parseInt(e.target.value) || 90 }))}
                                                    className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50 transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.04] border border-white/[0.10]">
                                            <div>
                                                <p className="text-sm font-semibold text-white">System Alerts</p>
                                                <p className="text-[10px] text-gray-500">Receive notifications for system issues</p>
                                            </div>
                                            <button
                                                onClick={() => setAdminPrefs(p => ({ ...p, systemAlerts: !p.systemAlerts }))}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${adminPrefs.systemAlerts ? "bg-red-600" : "bg-gray-600"}`}
                                            >
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${adminPrefs.systemAlerts ? "translate-x-6" : "translate-x-1"}`} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══════════════ USERS ═══════════════ */}
                        {activeSection === "users" && (
                            <div className="space-y-5">
                                <div className="bg-gray-900 rounded-2xl border border-white/[0.06] overflow-hidden">
                                    <div className="flex items-center gap-2 px-6 py-4 border-b border-white/[0.06]">
                                        <Users size={16} className="text-blue-400" />
                                        <h3 className="text-sm font-bold">User Management</h3>
                                    </div>
                                    <div className="px-6 py-5 space-y-4">
                                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.04] border border-white/[0.10]">
                                            <div>
                                                <p className="text-sm font-semibold text-white">User Registration</p>
                                                <p className="text-[10px] text-gray-500">Allow new users to register accounts</p>
                                            </div>
                                            <button
                                                onClick={() => setAdminPrefs(p => ({ ...p, userRegistration: !p.userRegistration }))}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${adminPrefs.userRegistration ? "bg-blue-600" : "bg-gray-600"}`}
                                            >
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${adminPrefs.userRegistration ? "translate-x-6" : "translate-x-1"}`} />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <button className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all font-semibold">
                                                <Users size={16} />
                                                Manage Users
                                            </button>
                                            <button className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all font-semibold">
                                                <ShieldCheck size={16} />
                                                Role Management
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══════════════ ORDERS ═══════════════ */}
                        {activeSection === "orders" && (
                            <div className="space-y-5">
                                <div className="bg-gray-900 rounded-2xl border border-white/[0.06] overflow-hidden">
                                    <div className="flex items-center gap-2 px-6 py-4 border-b border-white/[0.06]">
                                        <Package size={16} className="text-amber-400" />
                                        <h3 className="text-sm font-bold">Order Settings</h3>
                                    </div>
                                    <div className="px-6 py-5 space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5 block">Minimum Order Value (₹)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={adminPrefs.minOrderValue}
                                                    onChange={e => setAdminPrefs(p => ({ ...p, minOrderValue: parseInt(e.target.value) || 50 }))}
                                                    className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5 block">Commission Rate (%)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="20"
                                                    step="0.1"
                                                    value={adminPrefs.commissionRate}
                                                    onChange={e => setAdminPrefs(p => ({ ...p, commissionRate: parseFloat(e.target.value) || 5 }))}
                                                    className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.04] border border-white/[0.10]">
                                            <div>
                                                <p className="text-sm font-semibold text-white">Delivery Tracking</p>
                                                <p className="text-[10px] text-gray-500">Enable real-time order tracking</p>
                                            </div>
                                            <button
                                                onClick={() => setAdminPrefs(p => ({ ...p, deliveryTracking: !p.deliveryTracking }))}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${adminPrefs.deliveryTracking ? "bg-amber-600" : "bg-gray-600"}`}
                                            >
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${adminPrefs.deliveryTracking ? "translate-x-6" : "translate-x-1"}`} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══════════════ DELIVERIES ═══════════════ */}
                        {activeSection === "deliveries" && (
                            <div className="space-y-5">
                                <div className="bg-gray-900 rounded-2xl border border-white/[0.06] overflow-hidden">
                                    <div className="flex items-center gap-2 px-6 py-4 border-b border-white/[0.06]">
                                        <Truck size={16} className="text-emerald-400" />
                                        <h3 className="text-sm font-bold">Delivery Management</h3>
                                    </div>
                                    <div className="px-6 py-5 space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5 block">Max Delivery Radius (km)</label>
                                                <input
                                                    type="number"
                                                    min="5"
                                                    max="100"
                                                    value={adminPrefs.maxOrderRadius}
                                                    onChange={e => setAdminPrefs(p => ({ ...p, maxOrderRadius: parseInt(e.target.value) || 25 }))}
                                                    className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5 block">SMS Gateway</label>
                                                <select
                                                    value={adminPrefs.smsGateway}
                                                    onChange={e => setAdminPrefs(p => ({ ...p, smsGateway: e.target.value }))}
                                                    className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                                                >
                                                    <option value="twilio">Twilio</option>
                                                    <option value="aws">AWS SNS</option>
                                                    <option value="custom">Custom</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.04] border border-white/[0.10]">
                                            <div>
                                                <p className="text-sm font-semibold text-white">Auto Assign Deliveries</p>
                                                <p className="text-[10px] text-gray-500">Automatically assign orders to available delivery partners</p>
                                            </div>
                                            <button
                                                onClick={() => setAdminPrefs(p => ({ ...p, autoAssignDeliveries: !p.autoAssignDeliveries }))}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${adminPrefs.autoAssignDeliveries ? "bg-emerald-600" : "bg-gray-600"}`}
                                            >
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${adminPrefs.autoAssignDeliveries ? "translate-x-6" : "translate-x-1"}`} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══════════════ ANALYTICS ═══════════════ */}
                        {activeSection === "analytics" && (
                            <div className="space-y-5">
                                <div className="bg-gray-900 rounded-2xl border border-white/[0.06] overflow-hidden">
                                    <div className="flex items-center gap-2 px-6 py-4 border-b border-white/[0.06]">
                                        <BarChart size={16} className="text-yellow-400" />
                                        <h3 className="text-sm font-bold">Analytics & Reports</h3>
                                    </div>
                                    <div className="px-6 py-5">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <button className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-yellow-600/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 transition-all font-semibold">
                                                <BarChart size={16} />
                                                View Reports
                                            </button>
                                            <button className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-purple-600/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-all font-semibold">
                                                <FileText size={16} />
                                                Export Data
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══════════════ NOTIFICATIONS ═══════════════ */}
                        {activeSection === "notifications" && (
                            <div className="space-y-5">
                                <div className="bg-gray-900 rounded-2xl border border-white/[0.06] overflow-hidden">
                                    <div className="flex items-center gap-2 px-6 py-4 border-b border-white/[0.06]">
                                        <Bell size={16} className="text-purple-400" />
                                        <h3 className="text-sm font-bold">Notification Preferences</h3>
                                    </div>
                                    <div className="px-6 py-5 space-y-4">
                                        {[
                                            { key: "emailNotifications", label: "Email Notifications", desc: "Receive system updates via email" },
                                            { key: "smsNotifications", label: "SMS Notifications", desc: "Receive critical alerts via SMS" },
                                            { key: "pushNotifications", label: "Push Notifications", desc: "Receive push notifications on mobile" },
                                            { key: "systemAlerts", label: "System Alerts", desc: "Get notified about system issues" },
                                        ].map(({ key, label, desc }) => (
                                            <div key={key} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.04] border border-white/[0.10]">
                                                <div>
                                                    <p className="text-sm font-semibold text-white">{label}</p>
                                                    <p className="text-[10px] text-gray-500">{desc}</p>
                                                </div>
                                                <button
                                                    onClick={() => setPrefs(p => ({ ...p, [key]: !p[key as keyof typeof p] }))}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${(prefs as any)[key] ? "bg-purple-600" : "bg-gray-600"}`}
                                                >
                                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${(prefs as any)[key] ? "translate-x-6" : "translate-x-1"}`} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══════════════ SECURITY ═══════════════ */}
                        {activeSection === "security" && (
                            <div className="space-y-5">
                                <div className="bg-gray-900 rounded-2xl border border-white/[0.06] overflow-hidden">
                                    <div className="flex items-center gap-2 px-6 py-4 border-b border-white/[0.06]">
                                        <Shield size={16} className="text-red-400" />
                                        <h3 className="text-sm font-bold">Security Settings</h3>
                                    </div>
                                    <div className="px-6 py-5 space-y-4">
                                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.04] border border-white/[0.10]">
                                            <div>
                                                <p className="text-sm font-semibold text-white">Two-Factor Authentication</p>
                                                <p className="text-[10px] text-gray-500">Require 2FA for admin accounts</p>
                                            </div>
                                            <button
                                                onClick={() => setPrefs(p => ({ ...p, twoFactor: !p.twoFactor }))}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${prefs.twoFactor ? "bg-red-600" : "bg-gray-600"}`}
                                            >
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${prefs.twoFactor ? "translate-x-6" : "translate-x-1"}`} />
                                            </button>
                                        </div>

                                        <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-600/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all font-semibold">
                                            <Key size={16} />
                                            Change Password
                                        </button>

                                        <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-600/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all font-semibold">
                                            <ShieldCheck size={16} />
                                            Security Audit Log
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══════════════ APPEARANCE ═══════════════ */}
                        {activeSection === "appearance" && (
                            <div className="space-y-5">
                                <div className="bg-gray-900 rounded-2xl border border-white/[0.06] overflow-hidden">
                                    <div className="flex items-center gap-2 px-6 py-4 border-b border-white/[0.06]">
                                        <Moon size={16} className="text-green-400" />
                                        <h3 className="text-sm font-bold">Appearance</h3>
                                    </div>
                                    <div className="px-6 py-5 space-y-4">
                                        <div>
                                            <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-3 block">Theme</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    onClick={() => setPrefs(p => ({ ...p, darkMode: true }))}
                                                    className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${prefs.darkMode ? "bg-green-500/10 border-green-500/30 text-green-300" : "bg-white/[0.04] border-white/[0.10] text-gray-400 hover:bg-white/[0.08]"}`}
                                                >
                                                    <Moon size={20} />
                                                    <span className="text-sm font-semibold">Dark</span>
                                                </button>
                                                <button
                                                    onClick={() => setPrefs(p => ({ ...p, darkMode: false }))}
                                                    className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${!prefs.darkMode ? "bg-green-500/10 border-green-500/30 text-green-300" : "bg-white/[0.04] border-white/[0.10] text-gray-400 hover:bg-white/[0.08]"}`}
                                                >
                                                    <Sun size={20} />
                                                    <span className="text-sm font-semibold">Light</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-3 block">Language</label>
                                            <select
                                                value={prefs.language}
                                                onChange={e => setPrefs(p => ({ ...p, language: e.target.value }))}
                                                className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-green-500/50 transition-all"
                                            >
                                                <option value="English">English</option>
                                                <option value="Hindi">Hindi</option>
                                                <option value="Tamil">Tamil</option>
                                                <option value="Telugu">Telugu</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══════════════ HELP & SUPPORT ═══════════════ */}
                        {activeSection === "help" && (
                            <div className="space-y-5">
                                <div className="bg-gray-900 rounded-2xl border border-white/[0.06] overflow-hidden">
                                    <div className="flex items-center gap-2 px-6 py-4 border-b border-white/[0.06]">
                                        <MessageSquare size={16} className="text-cyan-400" />
                                        <h3 className="text-sm font-bold">Help & Support</h3>
                                    </div>
                                    <div className="px-6 py-5 space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <button className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.04] border border-white/[0.10] hover:bg-white/[0.08] transition-all text-left">
                                                <FileText size={20} className="text-blue-400" />
                                                <div>
                                                    <p className="text-sm font-semibold text-white">Documentation</p>
                                                    <p className="text-[10px] text-gray-500">System admin guide</p>
                                                </div>
                                            </button>
                                            <button className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.04] border border-white/[0.10] hover:bg-white/[0.08] transition-all text-left">
                                                <MessageSquare size={20} className="text-green-400" />
                                                <div>
                                                    <p className="text-sm font-semibold text-white">Support Ticket</p>
                                                    <p className="text-[10px] text-gray-500">Get help from developers</p>
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}