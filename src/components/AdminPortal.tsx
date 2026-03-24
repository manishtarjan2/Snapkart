"use client";

import React, { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    ShieldCheck, Store, Package, Truck, Users,
    LogOut, ExternalLink, ChevronRight, Activity,
    BarChart3, Bell, Loader2, Lock,
    ClipboardList, Star, Zap, Tag, CreditCard
} from "lucide-react";

// ─── Role card config ───────────────────────────────────────────────────────
const ROLE_CARDS = [
    {
        role: "superAdmin",
        title: "Super Admin",
        subtitle: "Full system control",
        description: "Manage all admins, stores, commissions, revenue analytics, and global settings.",
        href: "/super-admin",
        icon: ShieldCheck,
        gradient: "from-violet-600 to-indigo-700",
        glow: "shadow-violet-900/40",
        accent: "text-violet-300",
        border: "border-violet-500/20",
        bg: "bg-violet-500/10",
        badgeColor: "bg-violet-500/20 text-violet-300 border-violet-500/30",
        perms: ["Create/delete admins", "Reset passwords", "View all revenue", "Control delivery zones"],
    },
    {
        role: "storeAdmin",
        title: "Store Admin",
        subtitle: "Branch operations",
        description: "Handle in-store orders, POS billing, inventory queries, and branch-level reports.",
        href: "/store-admin",
        icon: Store,
        gradient: "from-blue-600 to-cyan-700",
        glow: "shadow-blue-900/40",
        accent: "text-blue-300",
        border: "border-blue-500/20",
        bg: "bg-blue-500/10",
        badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        perms: ["Manage store orders", "POS billing", "Stock view", "Branch analytics"],
    },
    {
        role: "productAdmin",
        title: "Product Admin",
        subtitle: "Catalogue management",
        description: "Add, edit and deactivate products. Manage categories, images, discounts and stock.",
        href: "/product-admin",
        icon: Package,
        gradient: "from-emerald-600 to-green-700",
        glow: "shadow-emerald-900/40",
        accent: "text-emerald-300",
        border: "border-emerald-500/20",
        bg: "bg-emerald-500/10",
        badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        perms: ["Add/edit products", "Upload images", "Set discounts", "Manage stock qty"],
    },
    {
        role: "deliveryAdmin",
        title: "Delivery Admin",
        subtitle: "Logistics control",
        description: "Manage delivery riders, assign orders, track GPS in real-time and review performance.",
        href: "/delivery-admin",
        icon: Truck,
        gradient: "from-orange-600 to-amber-700",
        glow: "shadow-orange-900/40",
        accent: "text-orange-300",
        border: "border-orange-500/20",
        bg: "bg-orange-500/10",
        badgeColor: "bg-orange-500/20 text-orange-300 border-orange-500/30",
        perms: ["Add delivery boys", "Auto-assign orders", "Live GPS tracking", "Rider performance"],
    },
    {
        role: "posAdmin",
        title: "POS Admin",
        subtitle: "Billing & employees",
        description: "Run the POS billing counter, add store employees with custom IDs and passwords, manage shifts.",
        href: "/pos-admin",
        icon: Tag,
        gradient: "from-pink-600 to-rose-700",
        glow: "shadow-pink-900/40",
        accent: "text-pink-300",
        border: "border-pink-500/20",
        bg: "bg-pink-500/10",
        badgeColor: "bg-pink-500/20 text-pink-300 border-pink-500/30",
        perms: ["Operate billing counter", "Create employees (ID + password)", "Block/suspend employees", "Reset employee passwords"],
    },
    {
        role: "admin",
        title: "Store Manager",
        subtitle: "Day-to-day operations",
        description: "Manage store items, process offline orders, use the POS billing counter for walk-in sales.",
        href: "/",
        icon: ClipboardList,
        gradient: "from-teal-600 to-cyan-800",
        glow: "shadow-teal-900/40",
        accent: "text-teal-300",
        border: "border-teal-500/20",
        bg: "bg-teal-500/10",
        badgeColor: "bg-teal-500/20 text-teal-300 border-teal-500/30",
        perms: ["Store items", "Manage orders", "POS billing", "Quick stock updates"],
    },
];

// ─── Stat card config ────────────────────────────────────────────────────────
type Stats = { admins: number; products: number; orders: number; pendingOrders: number };

// ─── Main component ──────────────────────────────────────────────────────────
export default function AdminPortal() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [stats, setStats] = useState<Stats | null>(null);
    const [loadingStats, setLoadingStats] = useState(true);
    const userRole = session?.user?.role ?? "";

    useEffect(() => {
        if (status === "loading") return;
        if (!session?.user) { router.replace("/admin-login"); return; }
        const allowed = ["superAdmin", "storeAdmin", "productAdmin", "deliveryAdmin", "posAdmin", "admin"];
        if (!allowed.includes(userRole)) { router.replace("/login"); }
    }, [session, status, router, userRole]);

    // Load quick stats
    useEffect(() => {
        const load = async () => {
            setLoadingStats(true);
            try {
                const [adminsRes, itemsRes, ordersRes] = await Promise.allSettled([
                    fetch("/api/register/admin"),
                    fetch("/api/admin/groceries"),
                    fetch("/api/admin/orders"),
                ]);
                const adminList = adminsRes.status === "fulfilled" && adminsRes.value.ok ? await adminsRes.value.json() : [];
                const itemList = itemsRes.status === "fulfilled" && itemsRes.value.ok ? await itemsRes.value.json() : [];
                const orderList = ordersRes.status === "fulfilled" && ordersRes.value.ok ? await ordersRes.value.json() : [];
                setStats({
                    admins: Array.isArray(adminList) ? adminList.length : 0,
                    products: Array.isArray(itemList) ? itemList.length : 0,
                    orders: Array.isArray(orderList) ? orderList.length : 0,
                    pendingOrders: Array.isArray(orderList)
                        ? orderList.filter((o: { orderStatus: string }) => o.orderStatus === "placed" || o.orderStatus === "confirmed").length
                        : 0,
                });
            } catch { /* silent */ }
            finally { setLoadingStats(false); }
        };
        if (session?.user) load();
    }, [session]);

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#060810]">
                <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
            </div>
        );
    }

    const isSuperAdmin = userRole === "superAdmin";

    const QUICK_STATS = [
        { label: "Admin Accounts", value: stats?.admins ?? "—", icon: Users, color: "violet" },
        { label: "Products", value: stats?.products ?? "—", icon: Package, color: "emerald" },
        { label: "Total Orders", value: stats?.orders ?? "—", icon: ClipboardList, color: "blue" },
        { label: "Pending Orders", value: stats?.pendingOrders ?? "—", icon: Activity, color: "amber" },
    ];

    return (
        <div className="min-h-screen bg-[#060810] text-white font-sans">

            {/* ── Animated background blobs ── */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[100px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] rounded-full bg-emerald-600/5 blur-[100px]" />
            </div>

            {/* ── Top Nav ── */}
            <header className="sticky top-0 z-30 bg-[#060810]/80 backdrop-blur-xl border-b border-white/[0.06]">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-900/40">
                            <ShieldCheck size={17} className="text-white" />
                        </div>
                        <div>
                            <p className="font-bold text-sm">Snapkart</p>
                            <p className="text-[10px] text-violet-400 uppercase tracking-widest">Admin Portal</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* User pill */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.07]">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center text-[10px] font-bold">
                                {session?.user?.name?.[0]?.toUpperCase() ?? "A"}
                            </div>
                            <span className="text-xs font-medium text-slate-300 hidden sm:block">{session?.user?.name}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${ROLE_CARDS.find(r => r.role === userRole)?.badgeColor ?? "bg-slate-500/20 text-slate-300 border-slate-500/30"}`}>
                                {userRole}
                            </span>
                        </div>
                        <div className="relative">
                            <Bell size={15} className="text-slate-400" />
                            {(stats?.pendingOrders ?? 0) > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400" />}
                        </div>
                        <button onClick={() => signOut({ callbackUrl: "/admin-login" })}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-red-400 hover:bg-red-500/10 border border-red-500/20 hover:border-red-400/40 transition-all">
                            <LogOut size={12} />Sign out
                        </button>
                    </div>
                </div>
            </header>

            <div className="relative max-w-7xl mx-auto px-6 py-10 space-y-10">

                {/* ── Hero ── */}
                <div className="text-center space-y-3">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-semibold mb-2">
                        <Zap size={12} className="text-violet-400" />Snapkart Control Center
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
                        Admin Dashboard Hub
                    </h1>
                    <p className="text-slate-400 text-sm max-w-lg mx-auto">
                        One portal for all admin roles. Jump directly to your dashboard or manage the entire system.
                    </p>
                </div>

                {/* ── KPI Stats ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {QUICK_STATS.map((s, i) => (
                        <div key={i} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 hover:border-white/[0.12] transition-all">
                            <div className={`inline-flex p-2.5 rounded-xl bg-${s.color}-500/10 border border-${s.color}-500/20 mb-3`}>
                                <s.icon size={16} className={`text-${s.color}-400`} />
                            </div>
                            <p className="text-2xl font-extrabold text-white">
                                {loadingStats ? <span className="inline-block w-8 h-6 rounded bg-white/[0.06] animate-pulse" /> : s.value}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* ── Role Cards ── */}
                <div>
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="font-bold text-sm text-slate-300 flex items-center gap-2">
                            <Star size={14} className="text-violet-400" />Admin Dashboards
                        </h2>
                        {isSuperAdmin && (
                            <Link href="/super-admin" className="text-xs text-violet-300 hover:text-white flex items-center gap-1 transition-colors">
                                Super Admin Panel <ChevronRight size={12} />
                            </Link>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {ROLE_CARDS.map((card) => {
                            const Icon = card.icon;
                            const isCurrentRole = userRole === card.role;
                            const canAccess = isSuperAdmin || userRole === card.role;

                            return (
                                <div key={card.role}
                                    className={`relative rounded-2xl border overflow-hidden transition-all duration-300 group ${isCurrentRole
                                        ? `${card.border} bg-white/[0.04] shadow-xl ${card.glow}`
                                        : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.10] hover:bg-white/[0.04]"
                                        } ${!canAccess ? "opacity-50" : ""}`}
                                >
                                    {/* Gradient top strip */}
                                    <div className={`h-1 w-full bg-gradient-to-r ${card.gradient}`} />

                                    {/* Current role badge */}
                                    {isCurrentRole && (
                                        <div className={`absolute top-4 right-4 text-[9px] font-bold px-2 py-0.5 rounded-full border ${card.badgeColor}`}>
                                            Your Role
                                        </div>
                                    )}

                                    <div className="p-6">
                                        {/* Icon + title */}
                                        <div className="flex items-start gap-4 mb-4">
                                            <div className={`p-3 rounded-xl bg-gradient-to-br ${card.gradient} shadow-lg ${card.glow} shrink-0`}>
                                                <Icon size={20} className="text-white" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-base text-white">{card.title}</h3>
                                                <p className={`text-xs font-medium ${card.accent}`}>{card.subtitle}</p>
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <p className="text-xs text-slate-400 leading-relaxed mb-4">{card.description}</p>

                                        {/* Permissions */}
                                        <div className="space-y-1.5 mb-5">
                                            {card.perms.map((p) => (
                                                <div key={p} className="flex items-center gap-2 text-[11px] text-slate-400">
                                                    <div className={`w-1 h-1 rounded-full bg-gradient-to-r ${card.gradient}`} />
                                                    {p}
                                                </div>
                                            ))}
                                        </div>

                                        {/* CTA button */}
                                        {canAccess ? (
                                            <Link href={card.href}
                                                className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-semibold text-sm transition-all bg-gradient-to-r ${card.gradient} text-white hover:opacity-90 shadow-md ${card.glow} group-hover:shadow-lg`}>
                                                Open Dashboard <ExternalLink size={13} />
                                            </Link>
                                        ) : (
                                            <div className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-semibold text-sm bg-white/[0.04] border border-white/[0.06] text-slate-500 cursor-not-allowed">
                                                <Lock size={13} />Access Restricted
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── Quick action links (super admin only) ── */}
                {isSuperAdmin && (
                    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.07] p-6">
                        <h2 className="font-bold text-sm mb-4 flex items-center gap-2 text-slate-300">
                            <BarChart3 size={14} className="text-violet-400" />Super Admin Quick Actions
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                            {[
                                { label: "Create Admin", href: "/super-admin", icon: Users, color: "violet" },
                                { label: "View All Orders", href: "/super-admin", icon: ClipboardList, color: "blue" },
                                { label: "Product Catalogue", href: "/product-admin", icon: Package, color: "emerald" },
                                { label: "Delivery Riders", href: "/delivery-admin", icon: Truck, color: "orange" },
                                { label: "POS Admin", href: "/pos-admin", icon: Tag, color: "pink" },
                                { label: "Billing Counter", href: "/billing", icon: CreditCard, color: "teal" },
                            ].map((a) => (
                                <Link key={a.label} href={a.href}
                                    className={`flex flex-col items-center gap-2 p-4 rounded-xl bg-${a.color}-500/[0.05] border border-${a.color}-500/20 hover:bg-${a.color}-500/[0.10] transition-all text-center group`}>
                                    <a.icon size={18} className={`text-${a.color}-400 group-hover:scale-110 transition-transform`} />
                                    <span className="text-[11px] font-medium text-slate-300">{a.label}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Footer ── */}
                <div className="text-center pb-6">
                    <p className="text-xs text-slate-600">Snapkart Admin Portal · All rights reserved · {new Date().getFullYear()}</p>
                </div>
            </div>
        </div>
    );
}
