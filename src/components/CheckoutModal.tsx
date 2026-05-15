"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    MapPin,
    User,
    Phone,
    Home,
    Building2,
    Hash,
    ArrowRight,
    ShoppingBag,
    Package,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import PaymentModal from "./PaymentModal";

type Address = {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    pincode: string;
};

type Props = {
    grandTotal: number;
    deliveryFee: number;
    onClose: () => void;
};

export default function CheckoutModal({ grandTotal, deliveryFee, onClose }: Props) {
    const { items, totalPrice } = useCart();
    const [address, setAddress] = useState<Address>({
        fullName: "",
        phone: "",
        street: "",
        city: "",
        state: "",
        pincode: "",
    });
    const [errors, setErrors] = useState<Partial<Address>>({});
    const [showPayment, setShowPayment] = useState(false);

    const set = (field: keyof Address, val: string) => {
        setAddress((a) => ({ ...a, [field]: val }));
        setErrors((e) => ({ ...e, [field]: "" }));
    };

    const validate = () => {
        const e: Partial<Address> = {};
        if (!address.fullName.trim()) e.fullName = "Required";
        if (!/^\d{10}$/.test(address.phone)) e.phone = "Enter valid 10-digit number";
        if (!address.street.trim()) e.street = "Required";
        if (!address.city.trim()) e.city = "Required";
        if (!address.state.trim()) e.state = "Required";
        if (!/^\d{6}$/.test(address.pincode)) e.pincode = "Enter valid 6-digit pincode";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleProceed = () => {
        if (validate()) setShowPayment(true);
    };

    if (showPayment) {
        return (
            <PaymentModal
                address={address}
                grandTotal={grandTotal}
                deliveryFee={deliveryFee}
                onClose={onClose}
            />
        );
    }

    return (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, y: 60 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 60 }}
                className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="flex flex-col gap-4 px-6 py-5 border-b border-gray-100 shrink-0 bg-white/95">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 rounded-2xl bg-white border border-gray-200 px-3 py-2 shadow-sm">
                                <div className="p-2 bg-emerald-50 rounded-xl">
                                    <MapPin className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div className="text-left">
                                    <p className="text-xs uppercase tracking-[0.3em] text-emerald-700 font-semibold">Snapkart</p>
                                </div>
                            </div>
                            <div>
                                <h2 className="text-xl font-extrabold text-gray-900">Checkout</h2>
                                <p className="text-sm text-gray-500">Deliver to your chosen address and continue to payment.</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
                            <X className="w-4 h-4" />
                            Close
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                        <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1">
                            <ShoppingBag className="w-4 h-4 text-emerald-500" />
                            {items.length} item{items.length !== 1 ? "s" : ""}
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 font-semibold text-gray-800">
                            <span>₹{grandTotal}</span>
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            Step 1 of 2
                        </span>
                        {deliveryFee === 0 ? (
                            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-emerald-700 font-semibold">
                                FREE delivery
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 border border-slate-200 px-3 py-1 text-slate-600">
                                Delivery fee ₹{deliveryFee}
                            </span>
                        )}
                    </div>
                </div>

                {/* Form */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

                    {/* Full Name */}
                    <Field icon={<User className="w-4 h-4 text-gray-400" />} label="Full Name" error={errors.fullName}>
                        <input
                            type="text"
                            placeholder="e.g. Ramesh Kumar"
                            value={address.fullName}
                            onChange={(e) => set("fullName", e.target.value)}
                            className={inputCls(errors.fullName)}
                        />
                    </Field>

                    {/* Phone */}
                    <Field icon={<Phone className="w-4 h-4 text-gray-400" />} label="Mobile Number" error={errors.phone}>
                        <input
                            type="tel"
                            maxLength={10}
                            placeholder="10-digit number"
                            value={address.phone}
                            onChange={(e) => set("phone", e.target.value.replace(/\D/g, ""))}
                            className={inputCls(errors.phone)}
                        />
                    </Field>

                    {/* Street */}
                    <Field icon={<Home className="w-4 h-4 text-gray-400" />} label="Street / Flat / Area" error={errors.street}>
                        <textarea
                            rows={2}
                            placeholder="Flat no., Street name, Landmark..."
                            value={address.street}
                            onChange={(e) => set("street", e.target.value)}
                            className={`${inputCls(errors.street)} resize-none`}
                        />
                    </Field>

                    {/* City + State */}
                    <div className="grid grid-cols-2 gap-3">
                        <Field icon={<Building2 className="w-4 h-4 text-gray-400" />} label="City" error={errors.city}>
                            <input
                                type="text"
                                placeholder="City"
                                value={address.city}
                                onChange={(e) => set("city", e.target.value)}
                                className={inputCls(errors.city)}
                            />
                        </Field>
                        <Field icon={<MapPin className="w-4 h-4 text-gray-400" />} label="State" error={errors.state}>
                            <input
                                type="text"
                                placeholder="State"
                                value={address.state}
                                onChange={(e) => set("state", e.target.value)}
                                className={inputCls(errors.state)}
                            />
                        </Field>
                    </div>

                    {/* Pincode */}
                    <Field icon={<Hash className="w-4 h-4 text-gray-400" />} label="Pincode" error={errors.pincode}>
                        <input
                            type="text"
                            maxLength={6}
                            placeholder="6-digit pincode"
                            value={address.pincode}
                            onChange={(e) => set("pincode", e.target.value.replace(/\D/g, ""))}
                            className={inputCls(errors.pincode)}
                        />
                    </Field>

                    {/* Items preview */}
                    <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4 space-y-2">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5" /> Order Summary
                        </p>
                        {items.map((item) => (
                            <div key={item._id} className="flex justify-between text-sm text-gray-600">
                                <span className="truncate mr-2">{item.name} × {item.quantity}</span>
                                <span className="font-semibold text-gray-800 shrink-0">₹{item.price * item.quantity}</span>
                            </div>
                        ))}
                        <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-bold text-gray-800">
                            <span>Total</span>
                            <span>₹{grandTotal}</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 shrink-0">
                    <button
                        onClick={handleProceed}
                        className="w-full bg-emerald-600 text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                    >
                        Continue to Payment
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

function Field({
    icon, label, error, children,
}: {
    icon: React.ReactNode;
    label: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-1.5">
                {icon} {label}
            </label>
            {children}
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
    );
}

function inputCls(error?: string) {
    return `w-full border ${error ? "border-red-300 bg-red-50" : "border-gray-200"} rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent placeholder:text-gray-300 transition-all`;
}
