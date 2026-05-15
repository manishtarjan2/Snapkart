"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { ShoppingBasket, Menu, X, LogOut, ChevronDown, ShoppingCart, ScanBarcode, CreditCard, Settings, Package, User, Heart, Bell, HelpCircle, Truck, Grid, Wallet, Tag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/context/CartContext";

type UserData = {
    _id: string;
    name: string;
    email: string;
    mobile: string;
    role: string;
    image?: string | null;
};

type Props = {
    user: UserData;
};

function getInitials(name: string) {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

function getRoleColor(role: string) {
    switch (role.toLowerCase()) {
        case "admin":
            return "bg-violet-500/20 text-violet-300 border border-violet-500/30";
        case "deliveryboy":
            return "bg-amber-500/20 text-amber-300 border border-amber-500/30";
        default:
            return "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
    }
}

export default function Nav({ user }: Props) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

    // Cart — only available when role is "user"
    let totalItems = 0;
    let openCart: (() => void) | undefined;
    try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const cart = useCart();
        totalItems = cart.totalItems;
        openCart = cart.openCart;
    } catch {
        // Not inside CartProvider (admin/delivery) — ignore
    }

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        const handler = () => setProfileOpen(false);
        if (profileOpen) document.addEventListener("click", handler);
        return () => document.removeEventListener("click", handler);
    }, [profileOpen]);

    return (
        <div>
            {/* Gradient top accent line */}
            <div className="fixed top-0 left-0 right-0 h-0.5 z-[60] bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />

            <nav
                className={`fixed top-0.5 left-0 right-0 z-50 transition-all duration-300 ${scrolled
                    ? "bg-gray-950/80 backdrop-blur-xl shadow-2xl shadow-black/30 border-b border-white/5"
                    : "bg-gray-950/60 backdrop-blur-lg border-b border-white/5"
                    }`}
            >
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

                    {/* ── Logo (left-anchored brand) ── */}
                    <Link href="/" className="flex items-center gap-3 group shrink-0">
                        {/* Icon bubble */}
                        <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/40 group-hover:shadow-emerald-500/60 group-hover:scale-105 transition-all duration-300">
                            <ShoppingBasket className="w-5 h-5 text-white" />
                            {/* Pulse ring */}
                            <span className="absolute inset-0 rounded-2xl ring-2 ring-emerald-400/30 group-hover:ring-emerald-400/60 transition-all duration-300" />
                        </div>
                        {/* Brand text */}
                        <div className="flex flex-col leading-none">
                            <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent group-hover:from-white group-hover:via-emerald-200 group-hover:to-teal-200 transition-all duration-300">
                                Snapkart
                            </span>
                            <span className="text-[10px] font-medium text-emerald-500/70 tracking-widest uppercase hidden sm:block">
                                Fresh Grocery Delivery
                            </span>
                        </div>
                    </Link>

                    {/* ── Desktop right section ── */}
                    <div className="hidden md:flex items-center gap-3">
                        {/* Self Checkout — only for users */}
                        {user.role === "user" && (
                            <Link
                                href="/self-checkout"
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-200"
                            >
                                <CreditCard className="w-4 h-4 text-teal-400" />
                                <span className="hidden lg:inline">Self Checkout</span>
                            </Link>
                        )}

                        {/* Cart button — only for users */}
                        {user.role === "user" && openCart && (
                            <button
                                onClick={openCart}
                                className="relative flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-200 cursor-pointer text-gray-300 hover:text-white"
                            >
                                <ShoppingCart className="w-5 h-5" />
                                {totalItems > 0 && (
                                    <motion.span
                                        key={totalItems}
                                        initial={{ scale: 0.5 }}
                                        animate={{ scale: 1 }}
                                        className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg"
                                    >
                                        {totalItems > 9 ? "9+" : totalItems}
                                    </motion.span>
                                )}
                            </button>
                        )}

                        {/* Profile dropdown */}
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <button
                                onClick={() => setProfileOpen((v) => !v)}
                                className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-200 cursor-pointer"
                            >
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold shadow-md">
                                    {getInitials(user.name)}
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${getRoleColor(user.role)}`}>
                                    {user.role}
                                </span>
                                <ChevronDown
                                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`}
                                />
                            </button>

                            {/* Dropdown */}
                            <AnimatePresence>
                                {profileOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                                        transition={{ duration: 0.15, ease: "easeOut" }}
                                        className="absolute right-0 top-full mt-2 w-56 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
                                    >
                                        <div className="px-4 py-3 border-b border-white/10">
                                            <p className="text-sm font-semibold text-white capitalize">{user.name}</p>
                                            <p className="text-xs text-gray-400 truncate">{user.email}</p>
                                        </div>
                                        <div className="p-2 space-y-1">
                                            <Link href="/profile" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/5 font-medium transition-all duration-150 cursor-pointer">
                                                <User className="w-4 h-4 shrink-0 text-indigo-400" />
                                                My Profile
                                            </Link>
                                            <Link href="/orders" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/5 font-medium transition-all duration-150 cursor-pointer">
                                                <Package className="w-4 h-4 shrink-0 text-amber-400" />
                                                My Orders
                                            </Link>
                                            <Link href="/track-order" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/5 font-medium transition-all duration-150 cursor-pointer">
                                                <Truck className="w-4 h-4 shrink-0 text-orange-400" />
                                                Track Order
                                            </Link>
                                            <Link href="/wallet" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/5 font-medium transition-all duration-150 cursor-pointer">
                                                <Wallet className="w-4 h-4 shrink-0 text-purple-400" />
                                                Gift Cards & Wallet
                                            </Link>
                                            <Link href="/rewards" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/5 font-medium transition-all duration-150 cursor-pointer">
                                                <Tag className="w-4 h-4 shrink-0 text-emerald-400" />
                                                Coupons & Offers
                                            </Link>
                                            <Link href="/wishlist" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/5 font-medium transition-all duration-150 cursor-pointer">
                                                <Heart className="w-4 h-4 shrink-0 text-pink-400" />
                                                Wishlist
                                            </Link>
                                        </div>
                                        <div className="p-2 border-t border-white/10">
                                            <button
                                                onClick={() => signOut({ callbackUrl: "/login" })}
                                                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 font-medium transition-all duration-150 cursor-pointer"
                                            >
                                                <LogOut className="w-4 h-4 shrink-0" />
                                                Sign out
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* ── Mobile right: cart + hamburger ── */}
                    <div className="md:hidden flex items-center gap-2">
                        {/* Mobile cart button */}
                        {user.role === "user" && openCart && (
                            <button
                                onClick={openCart}
                                className="relative p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                            >
                                <ShoppingCart className="w-5 h-5" />
                                {totalItems > 0 && (
                                    <motion.span
                                        key={totalItems}
                                        initial={{ scale: 0.5 }}
                                        animate={{ scale: 1 }}
                                        className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[9px] font-black rounded-full flex items-center justify-center"
                                    >
                                        {totalItems > 9 ? "9+" : totalItems}
                                    </motion.span>
                                )}
                            </button>
                        )}

                        <button
                            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-200"
                            onClick={() => setMenuOpen((v) => !v)}
                            aria-label="Toggle menu"
                        >
                            <AnimatePresence mode="wait" initial={false}>
                                {menuOpen ? (
                                    <motion.div
                                        key="close"
                                        initial={{ rotate: -90, opacity: 0 }}
                                        animate={{ rotate: 0, opacity: 1 }}
                                        exit={{ rotate: 90, opacity: 0 }}
                                        transition={{ duration: 0.15 }}
                                    >
                                        <X className="w-5 h-5" />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="menu"
                                        initial={{ rotate: 90, opacity: 0 }}
                                        animate={{ rotate: 0, opacity: 1 }}
                                        exit={{ rotate: -90, opacity: 0 }}
                                        transition={{ duration: 0.15 }}
                                    >
                                        <Menu className="w-5 h-5" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </button>
                    </div>
                </div>

                {/* ── Mobile drawer ── */}
                <AnimatePresence>
                    {menuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                            className="md:hidden overflow-hidden border-t border-white/5"
                        >
                            <div className="px-4 py-5 bg-gray-950/95 backdrop-blur-xl space-y-4">
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm font-bold shadow-md shrink-0">
                                        {getInitials(user.name)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-white capitalize truncate">{user.name}</p>
                                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                                    </div>
                                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-semibold capitalize shrink-0 ${getRoleColor(user.role)}`}>
                                        {user.role}
                                    </span>
                                </div>

                                {/* Self Checkout linked feature — only for users */}
                                {user.role === "user" && (
                                    <div className="space-y-1.5 mb-1.5">
                                        <Link
                                            href="/self-checkout"
                                            onClick={() => setMenuOpen(false)}
                                            className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-200"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center">
                                                <CreditCard className="w-4 h-4 text-teal-400" />
                                            </div>
                                            Self Checkout
                                        </Link>
                                    </div>
                                )}

                                {/* Settings link inside drawer */}
                                <div className="space-y-1.5 pb-2">
                                    <Link href="/categories" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-200">
                                        <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                                            <Grid className="w-4 h-4 text-cyan-400" />
                                        </div>
                                        Shop by Category
                                    </Link>
                                    <Link href="/track-order" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-200">
                                        <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                                            <Truck className="w-4 h-4 text-orange-400" />
                                        </div>
                                        Track Order
                                    </Link>
                                    <Link href="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-200">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                            <User className="w-4 h-4 text-indigo-400" />
                                        </div>
                                        My Profile
                                    </Link>
                                    <Link href="/orders" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-200">
                                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                            <Package className="w-4 h-4 text-amber-400" />
                                        </div>
                                        My Orders
                                    </Link>
                                    <Link href="/wallet" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-200">
                                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                            <Wallet className="w-4 h-4 text-purple-400" />
                                        </div>
                                        Gift Cards & Wallet
                                    </Link>
                                    <Link href="/rewards" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-200">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                            <Tag className="w-4 h-4 text-emerald-400" />
                                        </div>
                                        Coupons & Offers
                                    </Link>
                                    <Link href="/wishlist" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-200">
                                        <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
                                            <Heart className="w-4 h-4 text-pink-400" />
                                        </div>
                                        Wishlist
                                    </Link>
                                    <Link href="/notifications" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-200">
                                        <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                                            <Bell className="w-4 h-4 text-yellow-400" />
                                        </div>
                                        Notifications
                                    </Link>
                                    <Link href="/help" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-200">
                                        <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                                            <HelpCircle className="w-4 h-4 text-green-400" />
                                        </div>
                                        Help Center
                                    </Link>
                                    <Link
                                        href="/settings"
                                        onClick={() => setMenuOpen(false)}
                                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-200"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                            <Settings className="w-4 h-4 text-blue-400" />
                                        </div>
                                        Settings
                                    </Link>
                                </div>

                                <button
                                    onClick={() => signOut({ callbackUrl: "/login" })}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-500/20 font-semibold text-sm transition-all duration-200"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sign out
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>
        </div>
    );
}
