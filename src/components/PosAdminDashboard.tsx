"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Tag, Users, ChevronRight, LogOut, RefreshCw,
    CheckCircle, XCircle, PlusCircle, Loader2,
    Trash2, KeyRound, X, Eye, EyeOff, Search,
    CreditCard, ShieldCheck, Activity, ArrowUpRight
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Employee {
    _id: string;
    name: string;
    email: string;
    employeeId?: string;
    isBlocked: boolean;
    createdAt: string;
}

const NAV = [
    { id: "employees", label: "Employees", icon: Users },
    { id: "billing", label: "Go to Billing", icon: CreditCard, href: "/billing" },
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function PosAdminDashboard() {
    const { data: session } = useSession();
    const router = useRouter();
    const [active, setActive] = useState("employees");
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [notification, setNotification] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

    // Create form
    const [form, setForm] = useState({ name: "", employeeId: "", password: "" });
    const [showPass, setShowPass] = useState(false);
    const [creating, setCreating] = useState(false);

    // Reset password modal
    const [resetTarget, setResetTarget] = useState<Employee | null>(null);
    const [newPass, setNewPass] = useState("");
    const [resetting, setResetting] = useState(false);

    // Delete
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const notify = (msg: string, type: "ok" | "err" = "ok") => {
        setNotification({ msg, type });
        setTimeout(() => setNotification(null), 3500);
    };

    // ── Load employees ───────────────────────────────────────────────────────
    const loadEmployees = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/pos-admin/employees");
            if (res.ok) { const d = await res.json(); setEmployees(Array.isArray(d) ? d : []); }
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { loadEmployees(); }, [loadEmployees]);

    // ── Create employee ──────────────────────────────────────────────────────
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            const res = await fetch("/api/pos-admin/employees", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) { notify(data.message, "err"); return; }
            notify(`Employee "${form.name}" added ✓  (Login: ${data.loginEmail})`);
            setForm({ name: "", employeeId: "", password: "" });
            loadEmployees();
        } catch { notify("Server error", "err"); }
        finally { setCreating(false); }
    };

    // ── Block / Unblock ──────────────────────────────────────────────────────
    const toggleBlock = async (emp: Employee) => {
        const res = await fetch("/api/pos-admin/employees", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: emp._id, isBlocked: !emp.isBlocked }),
        });
        if (!res.ok) { notify("Failed", "err"); return; }
        notify(`${emp.isBlocked ? "Reinstated" : "Suspended"} ✓`);
        loadEmployees();
    };

    // ── Reset password ───────────────────────────────────────────────────────
    const handleReset = async () => {
        if (!resetTarget || newPass.length < 6) { notify("Min 6 characters", "err"); return; }
        setResetting(true);
        try {
            const res = await fetch("/api/pos-admin/employees", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: resetTarget._id, newPassword: newPass }),
            });
            const data = await res.json();
            if (!res.ok) { notify(data.message, "err"); return; }
            notify("Password updated ✓");
            setResetTarget(null); setNewPass("");
        } catch { notify("Error", "err"); }
        finally { setResetting(false); }
    };

    // ── Delete employee ──────────────────────────────────────────────────────
    const handleDelete = async (emp: Employee) => {
        if (!confirm(`Remove "${emp.name}" (${emp.employeeId ?? emp.email})? This cannot be undone.`)) return;
        setDeletingId(emp._id);
        try {
            const res = await fetch("/api/pos-admin/employees", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: emp._id }),
            });
            if (!res.ok) { notify("Delete failed", "err"); return; }
            notify(`"${emp.name}" removed ✓`);
            loadEmployees();
        } catch { notify("Error", "err"); }
        finally { setDeletingId(null); }
    };

    const filtered = employees.filter(
        e => e.name.toLowerCase().includes(search.toLowerCase()) ||
            (e.employeeId ?? "").toLowerCase().includes(search.toLowerCase())
    );

    const activeCount = employees.filter(e => !e.isBlocked).length;

    return (
        <div className="min-h-screen flex bg-[#0a0a12] text-white font-sans">

            {/* ── Sidebar ── */}
            <aside className="w-60 min-h-screen bg-[#0d0d1a] border-r border-white/[0.06] flex flex-col fixed left-0 top-0 z-30">
                <div className="px-5 py-5 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center shadow-lg shadow-pink-900/40">
                            <Tag size={17} className="text-white" />
                        </div>
                        <div>
                            <p className="font-bold text-sm">Snapkart</p>
                            <p className="text-[10px] text-pink-400 uppercase tracking-widest">POS Admin</p>
                        </div>
                    </div>
                </div>

                {/* User pill */}
                <div className="px-4 py-3 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04]">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-xs font-bold">
                            {session?.user?.name?.[0]?.toUpperCase() ?? "P"}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-xs font-semibold truncate">{session?.user?.name}</p>
                            <p className="text-[10px] text-slate-400">POS Admin</p>
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-1">
                    {NAV.map(({ id, label, icon: Icon, href }) =>
                        href ? (
                            <Link key={id} href={href}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/[0.05] transition-all">
                                <Icon size={15} />{label}<ArrowUpRight size={11} className="ml-auto" />
                            </Link>
                        ) : (
                            <button key={id} onClick={() => setActive(id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active === id
                                    ? "bg-pink-500/20 text-pink-300 border border-pink-500/20"
                                    : "text-slate-400 hover:text-white hover:bg-white/[0.05]"}`}>
                                <Icon size={15} />{label}{active === id && <ChevronRight size={13} className="ml-auto" />}
                            </button>
                        )
                    )}
                </nav>

                {/* Footer */}
                <div className="px-3 py-4 border-t border-white/[0.06] space-y-1">
                    <Link href="/admin-portal"
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-white/[0.05] transition-colors font-medium">
                        <ShieldCheck size={15} /> Admin Portal Hub
                    </Link>
                    <button onClick={() => signOut({ callbackUrl: "/admin-login" })}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                        <LogOut size={15} /> Sign Out
                    </button>
                </div>
            </aside>

            {/* ── Main ── */}
            <main className="ml-60 flex-1 min-h-screen">
                <header className="sticky top-0 z-20 bg-[#0a0a12]/80 backdrop-blur-xl border-b border-white/[0.06] px-8 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold">POS Admin Panel</h1>
                        <p className="text-xs text-slate-500">Employee Management · Snapkart</p>
                    </div>
                    <button onClick={loadEmployees} className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08]">
                        <RefreshCw size={14} className={loading ? "animate-spin text-pink-400" : "text-slate-400"} />
                    </button>
                </header>

                {/* Toast */}
                {notification && (
                    <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-xl border ${notification.type === "ok"
                        ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300"
                        : "bg-red-500/20 border-red-500/30 text-red-300"}`}>
                        {notification.type === "ok" ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        {notification.msg}
                    </div>
                )}

                {/* Reset password modal */}
                {resetTarget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <div className="bg-[#0d0d1a] border border-white/[0.08] rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-sm flex items-center gap-2"><KeyRound size={14} className="text-pink-400" /> Reset Password</h3>
                                <button onClick={() => { setResetTarget(null); setNewPass(""); }} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400"><X size={14} /></button>
                            </div>
                            <p className="text-xs text-slate-400 mb-1">New password for <strong className="text-white">{resetTarget.name}</strong></p>
                            <p className="text-[10px] text-slate-500 mb-4">Login ID: {resetTarget.employeeId ?? "—"}</p>
                            <div className="relative mb-4">
                                <input type={showPass ? "text" : "password"} placeholder="Min 6 chars" value={newPass}
                                    onChange={e => setNewPass(e.target.value)}
                                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-pink-500/50 pr-10" />
                                <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                                    {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                                </button>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => { setResetTarget(null); setNewPass(""); }} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-slate-400 text-sm hover:bg-white/[0.05]">Cancel</button>
                                <button onClick={handleReset} disabled={newPass.length < 6 || resetting}
                                    className="flex-1 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-sm font-semibold flex items-center justify-center gap-2">
                                    {resetting ? <Loader2 size={13} className="animate-spin" /> : null}Save
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="p-8 space-y-6">

                    {/* KPIs */}
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { label: "Total Employees", value: employees.length, color: "pink" },
                            { label: "Active", value: activeCount, color: "emerald" },
                            { label: "Suspended", value: employees.length - activeCount, color: "red" },
                        ].map(({ label, value, color }) => (
                            <div key={label} className={`rounded-2xl bg-${color}-500/[0.06] border border-${color}-500/20 p-5 text-center`}>
                                <p className={`text-3xl font-bold text-${color}-400`}>{value}</p>
                                <p className="text-xs text-slate-400 mt-1">{label}</p>
                            </div>
                        ))}
                    </div>

                    {/* ── Create form ── */}
                    <div className="rounded-2xl bg-[#0d0d1a] border border-white/[0.06] p-6">
                        <h2 className="text-sm font-semibold mb-5 flex items-center gap-2">
                            <PlusCircle size={14} className="text-pink-400" /> Add New Employee
                        </h2>
                        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-[10px] text-slate-400 mb-1.5 uppercase tracking-wider">Full Name</label>
                                <input type="text" placeholder="Ravi Kumar" required value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-pink-500/50 transition-all" />
                            </div>
                            <div>
                                <label className="block text-[10px] text-slate-400 mb-1.5 uppercase tracking-wider">Employee ID</label>
                                <input type="text" placeholder="EMP001" required value={form.employeeId}
                                    onChange={e => setForm({ ...form, employeeId: e.target.value.toUpperCase() })}
                                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-pink-500/50 font-mono transition-all" />
                                <p className="text-[10px] text-slate-500 mt-1">Used as login username</p>
                            </div>
                            <div>
                                <label className="block text-[10px] text-slate-400 mb-1.5 uppercase tracking-wider">Password</label>
                                <div className="relative">
                                    <input type={showPass ? "text" : "password"} placeholder="Min 6 chars" required value={form.password}
                                        onChange={e => setForm({ ...form, password: e.target.value })}
                                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-pink-500/50 pr-10 transition-all" />
                                    <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                                        {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                                    </button>
                                </div>
                            </div>
                            <div className="md:col-span-3 flex justify-end">
                                <button type="submit" disabled={creating}
                                    className="px-6 py-2.5 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors">
                                    {creating ? <><Loader2 size={13} className="animate-spin" />Adding…</> : <><PlusCircle size={13} />Add Employee</>}
                                </button>
                            </div>
                        </form>

                        {/* Login info box */}
                        <div className="mt-4 p-4 rounded-xl bg-blue-500/[0.06] border border-blue-500/20">
                            <p className="text-xs text-blue-300 font-semibold mb-1 flex items-center gap-2"><Activity size={12} /> Employee Login Instructions</p>
                            <p className="text-[11px] text-slate-400">
                                Employees can log in at <span className="font-mono text-blue-300">/admin-login</span> using the email pattern:<br />
                                <span className="font-mono text-blue-200">&lt;employeeId&gt;@snapkart.internal</span> and the password you set.
                            </p>
                        </div>
                    </div>

                    {/* ── Employee list ── */}
                    <div className="rounded-2xl bg-[#0d0d1a] border border-white/[0.06] p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-semibold flex items-center gap-2">
                                <Users size={14} className="text-pink-400" /> All Employees
                                <span className="ml-1 text-[10px] bg-pink-500/15 text-pink-300 px-2 py-0.5 rounded-full border border-pink-500/20">{employees.length}</span>
                            </h2>
                            <div className="relative">
                                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
                                    className="bg-white/[0.04] border border-white/[0.08] rounded-lg pl-8 pr-3 py-2 text-xs placeholder-slate-600 focus:outline-none w-36 focus:border-pink-500/40" />
                            </div>
                        </div>

                        {filtered.length === 0 ? (
                            <p className="text-center text-slate-500 text-sm py-8">No employees yet. Add one using the form above.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-xs text-slate-500 border-b border-white/[0.05]">
                                            <th className="text-left pb-3 font-medium">Employee ID</th>
                                            <th className="text-left pb-3 font-medium">Name</th>
                                            <th className="text-left pb-3 font-medium">Login Email</th>
                                            <th className="text-left pb-3 font-medium">Status</th>
                                            <th className="text-right pb-3 font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.04]">
                                        {filtered.map((emp) => (
                                            <tr key={emp._id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="py-3 pr-4 font-mono text-pink-300 text-xs">{emp.employeeId ?? "—"}</td>
                                                <td className="py-3 pr-4 font-medium">{emp.name}</td>
                                                <td className="py-3 pr-4 text-xs text-slate-400">{emp.email}</td>
                                                <td className="py-3 pr-4">
                                                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${emp.isBlocked
                                                        ? "bg-red-500/15 text-red-400 border border-red-500/20"
                                                        : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${emp.isBlocked ? "bg-red-400" : "bg-emerald-400"}`} />
                                                        {emp.isBlocked ? "Suspended" : "Active"}
                                                    </span>
                                                </td>
                                                <td className="py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button onClick={() => toggleBlock(emp)}
                                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${emp.isBlocked
                                                                ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                                                                : "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25"}`}>
                                                            {emp.isBlocked ? "Reinstate" : "Suspend"}
                                                        </button>
                                                        <button onClick={() => { setResetTarget(emp); setNewPass(""); }}
                                                            title="Reset Password" className="p-1.5 rounded-lg bg-violet-500/15 text-violet-400 hover:bg-violet-500/25 transition-all">
                                                            <KeyRound size={12} />
                                                        </button>
                                                        <button onClick={() => handleDelete(emp)} disabled={deletingId === emp._id}
                                                            title="Remove" className="p-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-all disabled:opacity-40">
                                                            {deletingId === emp._id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Quick links */}
                    <div className="rounded-2xl bg-[#0d0d1a] border border-white/[0.06] p-6">
                        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><Activity size={14} className="text-pink-400" /> Quick Links</h2>
                        <div className="grid grid-cols-2 gap-3">
                            <Link href="/billing" className="flex items-center gap-3 p-4 rounded-xl bg-pink-500/[0.06] border border-pink-500/20 hover:bg-pink-500/10 transition-all group">
                                <CreditCard size={18} className="text-pink-400 group-hover:scale-110 transition-transform" />
                                <div><p className="text-sm font-medium">Billing Counter</p><p className="text-[10px] text-slate-400">Open POS billing</p></div>
                                <ArrowUpRight size={13} className="ml-auto text-pink-400" />
                            </Link>
                            <Link href="/admin-portal" className="flex items-center gap-3 p-4 rounded-xl bg-violet-500/[0.06] border border-violet-500/20 hover:bg-violet-500/10 transition-all group">
                                <ShieldCheck size={18} className="text-violet-400 group-hover:scale-110 transition-transform" />
                                <div><p className="text-sm font-medium">Admin Portal Hub</p><p className="text-[10px] text-slate-400">View all dashboards</p></div>
                                <ArrowUpRight size={13} className="ml-auto text-violet-400" />
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
