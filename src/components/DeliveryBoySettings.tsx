"use client";

import React, { useState, useEffect, useCallback } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import {
    User, Mail, Phone, Shield, Truck, MapPin, Bell, Lock,
    Clock, IndianRupee, BarChart3, Eye, EyeOff,
    Smartphone, Globe, Moon, Sun, CheckCircle, XCircle, Loader2,
    Edit3, Save, X, ArrowLeft, Settings, Bike, Car, Package,
    Calendar, DollarSign, Star, MessageSquare, FileText, Info,
    AlertTriangle, Wallet, ChevronRight, ToggleLeft, ToggleRight,
    Navigation, Timer, Zap, LogOut, Camera
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

type DeliveryStats = {
    totalDeliveries: number;
    totalEarnings: number;
    completedDeliveries: number;
    pendingDeliveries: number;
    cancelledDeliveries: number;
    averageRating: number;
    lastDeliveryDate: string | null;
};

type SettingsSection = "profile" | "vehicle" | "availability" | "earnings" | "notifications" | "privacy" | "appearance" | "help";

export default function DeliveryBoySettings() {
    const [user, setUser] = useState<UserData | null>(null);
    const [stats, setStats] = useState<DeliveryStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState<SettingsSection>("profile");
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
    const [editForm, setEditForm] = useState({ name: "", mobile: "" });

    // Delivery-specific preferences
    const [deliveryPrefs, setDeliveryPrefs] = useState({
        vehicleType: "bike", // bike, car, scooter
        licenseNumber: "",
        vehicleNumber: "",
        isAvailable: true,
        deliveryRadius: 10, // km
        preferredAreas: [] as string[],
        workingHours: { start: "09:00", end: "21:00" },
        instantDelivery: true,
        maxOrdersPerDay: 20,
        emergencyContact: "",
        bankAccount: { accountNumber: "", ifsc: "", holderName: "" }
    });

    // General preferences
    const [prefs, setPrefs] = useState({
        darkMode: true,
        orderUpdates: true,
        deliveryAlerts: true,
        promotions: false,
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: true,
        showOnlineStatus: true,
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
            const res = await fetch("/api/delivery/settings");
            const data = await res.json();
            if (res.ok) {
                setUser(data.user);
                setStats(data.stats);
                setDeliveryPrefs(data.deliveryPrefs || deliveryPrefs);
                setEditForm({ name: data.user.name, mobile: data.user.mobile || "" });
            }
        } catch {
            notify("Failed to load settings", "err");
        } finally {
            setLoading(false);
        }
    }, [notify, deliveryPrefs]);

    useEffect(() => { loadSettings(); }, [loadSettings]);

    const handleSave = async () => {
        if (!editForm.name.trim()) { notify("Name is required", "err"); return; }
        setSaving(true);
        try {
            const res = await fetch("/api/delivery/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: editForm.name.trim(),
                    mobile: editForm.mobile.trim(),
                    deliveryPrefs
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setUser(prev => prev ? { ...prev, ...data.user } : prev);
                setDeliveryPrefs(data.deliveryPrefs);
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
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center animate-pulse">
                        <Settings className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-gray-400 text-sm font-medium animate-pulse">Loading delivery settings…</p>
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
        { id: "vehicle", label: "Vehicle", icon: Bike, color: "from-orange-500 to-red-600", desc: "Vehicle & license details" },
        { id: "availability", label: "Availability", icon: Clock, color: "from-emerald-500 to-teal-600", desc: "Working hours & status" },
        { id: "earnings", label: "Earnings", icon: IndianRupee, color: "from-yellow-500 to-amber-600", desc: "Payment & earnings" },
        { id: "notifications", label: "Notifications", icon: Bell, color: "from-blue-500 to-cyan-600", desc: "Alerts & preferences" },
        { id: "privacy", label: "Privacy & Security", icon: Shield, color: "from-red-500 to-rose-600", desc: "Password & security" },
        { id: "appearance", label: "Appearance", icon: Moon, color: "from-purple-500 to-pink-600", desc: "Theme & language" },
        { id: "help", label: "Help & Support", icon: MessageSquare, color: "from-green-500 to-emerald-600", desc: "FAQ & contact" },
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
                        <Link href="/delivery-admin" className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-900/40">
                                <Settings className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h1 className="text-sm font-bold">Delivery Settings</h1>
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
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-orange-500/10 to-transparent rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-red-500/10 to-transparent rounded-full blur-3xl" />

                    <div className="relative px-6 py-8 sm:px-8 sm:py-10">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                            {/* Avatar */}
                            <div className="relative group">
                                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-3xl font-black shadow-2xl shadow-orange-900/50 ring-4 ring-gray-900">
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
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${deliveryPrefs.isAvailable ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20" : "bg-red-500/15 text-red-300 border border-red-500/20"}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${deliveryPrefs.isAvailable ? "bg-emerald-400" : "bg-red-400"}`} />
                                        {deliveryPrefs.isAvailable ? "Available" : "Offline"}
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white/5 text-gray-400 border border-white/10">
                                        <Truck size={10} />Delivery Partner
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
                                        <p className="text-xl font-black text-orange-400">{stats.totalDeliveries}</p>
                                        <p className="text-[10px] text-gray-500 font-medium">Deliveries</p>
                                    </div>
                                    <div className="text-center p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] min-w-[90px]">
                                        <p className="text-xl font-black text-yellow-400">{formatCurrency(stats.totalEarnings)}</p>
                                        <p className="text-[10px] text-gray-500 font-medium">Earned</p>
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
                                <Link href="/delivery-admin" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/[0.04] transition-all font-medium">
                                    <Truck size={13} />Dashboard
                                </Link>
                                <Link href="/delivery-admin/orders" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/[0.04] transition-all font-medium">
                                    <Package size={13} />My Deliveries
                                </Link>
                                <Link href="/wallet" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/[0.04] transition-all font-medium">
                                    <Wallet size={13} />Earnings
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
                                                    <span className="capitalize font-semibold">Delivery Partner</span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${deliveryPrefs.isAvailable ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20" : "bg-red-500/15 text-red-300 border border-red-500/20"}`}>
                                                        {deliveryPrefs.isAvailable ? "Active" : "Inactive"}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Emergency Contact */}
                                <div className="bg-gray-900 rounded-2xl border border-white/[0.06] overflow-hidden">
                                    <div className="flex items-center gap-2 px-6 py-4 border-b border-white/[0.06]">
                                        <AlertTriangle size={16} className="text-amber-400" />
                                        <h3 className="text-sm font-bold">Emergency Contact</h3>
                                    </div>
                                    <div className="px-6 py-5">
                                        <div className="max-w-md">
                                            <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5 block">Emergency Contact Number</label>
                                            <input
                                                type="tel"
                                                value={deliveryPrefs.emergencyContact}
                                                onChange={e => setDeliveryPrefs(p => ({ ...p, emergencyContact: e.target.value }))}
                                                placeholder="+91 XXXXX XXXXX"
                                                className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 transition-all"
                                            />
                                            <p className="text-[10px] text-gray-500 mt-2">This number will be contacted in case of emergencies during delivery.</p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ═══════════════ VEHICLE ═══════════════ */}
                        {activeSection === "vehicle" && (
                            <div className="space-y-5">
                                {/* Vehicle Type */}
                                <div className="bg-gray-900 rounded-2xl border border-white/[0.06] overflow-hidden">
                                    <div className="flex items-center gap-2 px-6 py-4 border-b border-white/[0.06]">
                                        <Bike size={16} className="text-orange-400" />
                                        <h3 className="text-sm font-bold">Vehicle Information</h3>
                                    </div>
                                    <div className="px-6 py-5 space-y-4">
                                        <div>
                                            <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-3 block">Vehicle Type</label>
                                            <div className="grid grid-cols-3 gap-3">
                                                {[
                                                    { id: "bike", label: "Bike", icon: Bike },
                                                    { id: "scooter", label: "Scooter", icon: Bike },
                                                    { id: "car", label: "Car", icon: Car }
                                                ].map(({ id, label, icon: Icon }) => (
                                                    <button
                                                        key={id}
                                                        onClick={() => setDeliveryPrefs(p => ({ ...p, vehicleType: id }))}
                                                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${deliveryPrefs.vehicleType === id ? "bg-orange-500/10 border-orange-500/30 text-orange-300" : "bg-white/[0.04] border-white/[0.10] text-gray-400 hover:bg-white/[0.08]"}`}
                                                    >
                                                        <Icon size={20} />
                                                        <span className="text-xs font-semibold">{label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5 block">License Number</label>
                                                <input
                                                    type="text"
                                                    value={deliveryPrefs.licenseNumber}
                                                    onChange={e => setDeliveryPrefs(p => ({ ...p, licenseNumber: e.target.value.toUpperCase() }))}
                                                    placeholder="DL-XX-XXXXXXXXXX"
                                                    className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5 block">Vehicle Number</label>
                                                <input
                                                    type="text"
                                                    value={deliveryPrefs.vehicleNumber}
                                                    onChange={e => setDeliveryPrefs(p => ({ ...p, vehicleNumber: e.target.value.toUpperCase() }))}
                                                    placeholder="XX-XX-XX-XXXX"
                                                    className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Delivery Preferences */}
                                <div className="bg-gray-900 rounded-2xl border border-white/[0.06] overflow-hidden">
                                    <div className="flex items-center gap-2 px-6 py-4 border-b border-white/[0.06]">
                                        <Navigation size={16} className="text-emerald-400" />
                                        <h3 className="text-sm font-bold">Delivery Preferences</h3>
                                    </div>
                                    <div className="px-6 py-5 space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5 block">Delivery Radius (km)</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="50"
                                                    value={deliveryPrefs.deliveryRadius}
                                                    onChange={e => setDeliveryPrefs(p => ({ ...p, deliveryRadius: parseInt(e.target.value) || 10 }))}
                                                    className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5 block">Max Orders Per Day</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="100"
                                                    value={deliveryPrefs.maxOrdersPerDay}
                                                    onChange={e => setDeliveryPrefs(p => ({ ...p, maxOrdersPerDay: parseInt(e.target.value) || 20 }))}
                                                    className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.04] border border-white/[0.10]">
                                            <div>
                                                <p className="text-sm font-semibold text-white">Instant Delivery</p>
                                                <p className="text-[10px] text-gray-500">Accept orders that need immediate delivery</p>
                                            </div>
                                            <button
                                                onClick={() => setDeliveryPrefs(p => ({ ...p, instantDelivery: !p.instantDelivery }))}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${deliveryPrefs.instantDelivery ? "bg-emerald-600" : "bg-gray-600"}`}
                                            >
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${deliveryPrefs.instantDelivery ? "translate-x-6" : "translate-x-1"}`} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══════════════ AVAILABILITY ═══════════════ */}
                        {activeSection === "availability" && (
                            <div className="space-y-5">
                                {/* Online Status */}
                                <div className="bg-gray-900 rounded-2xl border border-white/[0.06] overflow-hidden">
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
                                        <div className="flex items-center gap-2">
                                            <Zap size={16} className="text-emerald-400" />
                                            <h3 className="text-sm font-bold">Online Status</h3>
                                        </div>
                                        <button
                                            onClick={() => setDeliveryPrefs(p => ({ ...p, isAvailable: !p.isAvailable }))}
                                            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${deliveryPrefs.isAvailable ? "bg-emerald-600" : "bg-gray-600"}`}
                                        >
                                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${deliveryPrefs.isAvailable ? "translate-x-8" : "translate-x-1"}`} />
                                        </button>
                                    </div>
                                    <div className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-3 h-3 rounded-full ${deliveryPrefs.isAvailable ? "bg-emerald-400" : "bg-red-400"}`} />
                                            <div>
                                                <p className="text-sm font-semibold text-white">
                                                    {deliveryPrefs.isAvailable ? "Available for deliveries" : "Currently offline"}
                                                </p>
                                                <p className="text-[10px] text-gray-500">
                                                    {deliveryPrefs.isAvailable ? "You can receive new delivery requests" : "No new orders will be assigned"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Working Hours */}
                                <div className="bg-gray-900 rounded-2xl border border-white/[0.06] overflow-hidden">
                                    <div className="flex items-center gap-2 px-6 py-4 border-b border-white/[0.06]">
                                        <Clock size={16} className="text-blue-400" />
                                        <h3 className="text-sm font-bold">Working Hours</h3>
                                    </div>
                                    <div className="px-6 py-5">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5 block">Start Time</label>
                                                <input
                                                    type="time"
                                                    value={deliveryPrefs.workingHours.start}
                                                    onChange={e => setDeliveryPrefs(p => ({ ...p, workingHours: { ...p.workingHours, start: e.target.value } }))}
                                                    className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5 block">End Time</label>
                                                <input
                                                    type="time"
                                                    value={deliveryPrefs.workingHours.end}
                                                    onChange={e => setDeliveryPrefs(p => ({ ...p, workingHours: { ...p.workingHours, end: e.target.value } }))}
                                                    className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
                                                />
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-gray-500 mt-3">Set your preferred working hours. Orders will only be assigned during these times when you're available.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══════════════ EARNINGS ═══════════════ */}
                        {activeSection === "earnings" && (
                            <div className="space-y-5">
                                {/* Bank Account Details */}
                                <div className="bg-gray-900 rounded-2xl border border-white/[0.06] overflow-hidden">
                                    <div className="flex items-center gap-2 px-6 py-4 border-b border-white/[0.06]">
                                        <DollarSign size={16} className="text-yellow-400" />
                                        <h3 className="text-sm font-bold">Bank Account Details</h3>
                                    </div>
                                    <div className="px-6 py-5 space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="sm:col-span-2">
                                                <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5 block">Account Holder Name</label>
                                                <input
                                                    type="text"
                                                    value={deliveryPrefs.bankAccount.holderName}
                                                    onChange={e => setDeliveryPrefs(p => ({ ...p, bankAccount: { ...p.bankAccount, holderName: e.target.value } }))}
                                                    placeholder="Full name as per bank records"
                                                    className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50 transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5 block">Account Number</label>
                                                <input
                                                    type="text"
                                                    value={deliveryPrefs.bankAccount.accountNumber}
                                                    onChange={e => setDeliveryPrefs(p => ({ ...p, bankAccount: { ...p.bankAccount, accountNumber: e.target.value } }))}
                                                    placeholder="XXXX XXXX XXXX"
                                                    className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50 transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5 block">IFSC Code</label>
                                                <input
                                                    type="text"
                                                    value={deliveryPrefs.bankAccount.ifsc}
                                                    onChange={e => setDeliveryPrefs(p => ({ ...p, bankAccount: { ...p.bankAccount, ifsc: e.target.value.toUpperCase() } }))}
                                                    placeholder="XXXX0XXXXXX"
                                                    className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50 transition-all"
                                                />
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-gray-500">Your earnings will be transferred to this account. Please ensure details are accurate.</p>
                                    </div>
                                </div>

                                {/* Earnings Summary */}
                                {stats && (
                                    <div className="bg-gray-900 rounded-2xl border border-white/[0.06] overflow-hidden">
                                        <div className="flex items-center gap-2 px-6 py-4 border-b border-white/[0.06]">
                                            <BarChart3 size={16} className="text-emerald-400" />
                                            <h3 className="text-sm font-bold">Earnings Summary</h3>
                                        </div>
                                        <div className="px-6 py-5">
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                <div className="text-center p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                                                    <p className="text-lg font-black text-emerald-400">{stats.totalDeliveries}</p>
                                                    <p className="text-[10px] text-gray-500 font-medium">Total Deliveries</p>
                                                </div>
                                                <div className="text-center p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                                                    <p className="text-lg font-black text-yellow-400">{formatCurrency(stats.totalEarnings)}</p>
                                                    <p className="text-[10px] text-gray-500 font-medium">Total Earned</p>
                                                </div>
                                                <div className="text-center p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                                                    <p className="text-lg font-black text-blue-400">{stats.completedDeliveries}</p>
                                                    <p className="text-[10px] text-gray-500 font-medium">Completed</p>
                                                </div>
                                                <div className="text-center p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                                                    <p className="text-lg font-black text-orange-400">{stats.averageRating.toFixed(1)} ⭐</p>
                                                    <p className="text-[10px] text-gray-500 font-medium">Avg Rating</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ═══════════════ NOTIFICATIONS ═══════════════ */}
                        {activeSection === "notifications" && (
                            <div className="space-y-5">
                                <div className="bg-gray-900 rounded-2xl border border-white/[0.06] overflow-hidden">
                                    <div className="flex items-center gap-2 px-6 py-4 border-b border-white/[0.06]">
                                        <Bell size={16} className="text-blue-400" />
                                        <h3 className="text-sm font-bold">Notification Preferences</h3>
                                    </div>
                                    <div className="px-6 py-5 space-y-4">
                                        {[
                                            { key: "orderUpdates", label: "Order Updates", desc: "New delivery requests and status changes" },
                                            { key: "deliveryAlerts", label: "Delivery Alerts", desc: "Urgent delivery notifications" },
                                            { key: "promotions", label: "Promotions", desc: "Special offers and bonus opportunities" },
                                            { key: "emailNotifications", label: "Email Notifications", desc: "Receive updates via email" },
                                            { key: "smsNotifications", label: "SMS Notifications", desc: "Receive updates via SMS" },
                                            { key: "pushNotifications", label: "Push Notifications", desc: "Receive push notifications on mobile" },
                                        ].map(({ key, label, desc }) => (
                                            <div key={key} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.04] border border-white/[0.10]">
                                                <div>
                                                    <p className="text-sm font-semibold text-white">{label}</p>
                                                    <p className="text-[10px] text-gray-500">{desc}</p>
                                                </div>
                                                <button
                                                    onClick={() => setPrefs(p => ({ ...p, [key]: !p[key as keyof typeof p] }))}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${(prefs as any)[key] ? "bg-blue-600" : "bg-gray-600"}`}
                                                >
                                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${(prefs as any)[key] ? "translate-x-6" : "translate-x-1"}`} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══════════════ PRIVACY & SECURITY ═══════════════ */}
                        {activeSection === "privacy" && (
                            <div className="space-y-5">
                                <div className="bg-gray-900 rounded-2xl border border-white/[0.06] overflow-hidden">
                                    <div className="flex items-center gap-2 px-6 py-4 border-b border-white/[0.06]">
                                        <Shield size={16} className="text-red-400" />
                                        <h3 className="text-sm font-bold">Privacy & Security</h3>
                                    </div>
                                    <div className="px-6 py-5 space-y-4">
                                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.04] border border-white/[0.10]">
                                            <div>
                                                <p className="text-sm font-semibold text-white">Two-Factor Authentication</p>
                                                <p className="text-[10px] text-gray-500">Add an extra layer of security to your account</p>
                                            </div>
                                            <button
                                                onClick={() => setPrefs(p => ({ ...p, twoFactor: !p.twoFactor }))}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${prefs.twoFactor ? "bg-red-600" : "bg-gray-600"}`}
                                            >
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${prefs.twoFactor ? "translate-x-6" : "translate-x-1"}`} />
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.04] border border-white/[0.10]">
                                            <div>
                                                <p className="text-sm font-semibold text-white">Show Online Status</p>
                                                <p className="text-[10px] text-gray-500">Let customers see when you're available</p>
                                            </div>
                                            <button
                                                onClick={() => setPrefs(p => ({ ...p, showOnlineStatus: !p.showOnlineStatus }))}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${prefs.showOnlineStatus ? "bg-emerald-600" : "bg-gray-600"}`}
                                            >
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${prefs.showOnlineStatus ? "translate-x-6" : "translate-x-1"}`} />
                                            </button>
                                        </div>

                                        <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-600/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all font-semibold">
                                            <Lock size={16} />
                                            Change Password
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
                                        <Moon size={16} className="text-purple-400" />
                                        <h3 className="text-sm font-bold">Appearance</h3>
                                    </div>
                                    <div className="px-6 py-5 space-y-4">
                                        <div>
                                            <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-3 block">Theme</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    onClick={() => setPrefs(p => ({ ...p, darkMode: true }))}
                                                    className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${prefs.darkMode ? "bg-purple-500/10 border-purple-500/30 text-purple-300" : "bg-white/[0.04] border-white/[0.10] text-gray-400 hover:bg-white/[0.08]"}`}
                                                >
                                                    <Moon size={20} />
                                                    <span className="text-sm font-semibold">Dark</span>
                                                </button>
                                                <button
                                                    onClick={() => setPrefs(p => ({ ...p, darkMode: false }))}
                                                    className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${!prefs.darkMode ? "bg-purple-500/10 border-purple-500/30 text-purple-300" : "bg-white/[0.04] border-white/[0.10] text-gray-400 hover:bg-white/[0.08]"}`}
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
                                                className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all"
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
                                        <MessageSquare size={16} className="text-green-400" />
                                        <h3 className="text-sm font-bold">Help & Support</h3>
                                    </div>
                                    <div className="px-6 py-5 space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <button className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.04] border border-white/[0.10] hover:bg-white/[0.08] transition-all text-left">
                                                <FileText size={20} className="text-blue-400" />
                                                <div>
                                                    <p className="text-sm font-semibold text-white">FAQ</p>
                                                    <p className="text-[10px] text-gray-500">Frequently asked questions</p>
                                                </div>
                                            </button>
                                            <button className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.04] border border-white/[0.10] hover:bg-white/[0.08] transition-all text-left">
                                                <MessageSquare size={20} className="text-green-400" />
                                                <div>
                                                    <p className="text-sm font-semibold text-white">Contact Support</p>
                                                    <p className="text-[10px] text-gray-500">Get help from our team</p>
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