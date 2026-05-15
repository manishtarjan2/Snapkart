"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    X,
    Smartphone,
    Loader2,
    CheckCircle2,
    Lock,
    ArrowLeft,
    IndianRupee,
} from "lucide-react";
import { useCart } from "@/context/CartContext";

type Address = {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    pincode: string;
};

type Props = {
    address: Address;
    grandTotal: number;
    deliveryFee: number;
    onClose: () => void;
};

type PaymentMethod = "razorpay" | "cod";

const PAYMENT_METHODS: { id: PaymentMethod; label: string; sub: string; icon: React.ReactNode }[] = [
    {
        id: "razorpay",
        label: "Online Payment",
        sub: "UPI, Cards, Wallets (Razorpay)",
        icon: <Smartphone className="w-5 h-5 text-emerald-600" />,
    },
    {
        id: "cod",
        label: "Cash on Delivery",
        sub: "Pay when your order arrives",
        icon: <IndianRupee className="w-5 h-5 text-amber-500" />,
    },
];

declare global {
    interface Window {
        Razorpay: any;
    }
}

export default function PaymentModal({ address, grandTotal, deliveryFee, onClose }: Props) {
    const { items, clearCart } = useCart();
    const [selected, setSelected] = useState<PaymentMethod>("razorpay");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [orderId, setOrderId] = useState("");
    const [error, setError] = useState("");

    // Load Razorpay script
    useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);

        return () => {
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        };
    }, []);

    const handleRazorpayPayment = async () => {
        setError("");
        setLoading(true);

        try {
            // Create Razorpay order
            const orderResponse = await fetch("/api/payments/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount: grandTotal,
                    currency: "INR",
                    receipt: `order_${Date.now()}`,
                }),
            });

            const orderData = await orderResponse.json();

            if (!orderResponse.ok) {
                throw new Error(orderData.message || "Failed to create payment order");
            }

            // Razorpay options
            const options = {
                key: orderData.key,
                amount: orderData.amount,
                currency: orderData.currency,
                order_id: orderData.orderId,
                name: "Snapkart",
                description: "Grocery Order Payment",
                image: "/logo.png",
                handler: async (response: any) => {
                    // Payment successful, verify and create order
                    await verifyPayment(response, orderData.orderId);
                },
                prefill: {
                    name: address.fullName,
                    email: "",
                    contact: address.phone,
                },
                notes: {
                    address: `${address.street}, ${address.city}, ${address.state} - ${address.pincode}`,
                },
                theme: {
                    color: "#059669",
                },
                modal: {
                    ondismiss: () => {
                        setLoading(false);
                        setError("Payment cancelled by user");
                    },
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.open();

        } catch (err) {
            console.error("Payment error:", err);
            setError(err instanceof Error ? err.message : "Payment failed");
            setLoading(false);
        }
    };

    const verifyPayment = async (razorpayResponse: any, razorpayOrderId: string) => {
        try {
            const verifyResponse = await fetch("/api/payments/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    razorpay_order_id: razorpayOrderId,
                    razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                    razorpay_signature: razorpayResponse.razorpay_signature,
                    orderId: null,
                    address,
                    items: items.map((i) => ({
                        groceryId: i._id,
                        name: i.name,
                        price: i.price,
                        quantity: i.quantity,
                        image: i.image,
                    })),
                    totalAmount: grandTotal,
                    paymentMethod: "RAZORPAY",
                }),
            });

            const verifyData = await verifyResponse.json();

            if (!verifyResponse.ok) {
                throw new Error(verifyData.message || "Payment verification failed");
            }

            setOrderId(verifyData.orderId);
            setSuccess(true);
            clearCart();
            setLoading(false);

        } catch (err) {
            console.error("Verification error:", err);
            setError(err instanceof Error ? err.message : "Payment verification failed");
            setLoading(false);
        }
    };

    const handleCODPayment = async () => {
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/user/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    items: items.map((i) => ({
                        groceryId: i._id,
                        quantity: i.quantity,
                    })),
                    address,
                    totalAmount: grandTotal,
                    paymentMethod: "COD",
                    paymentStatus: "pending",
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Failed to place order");
            }

            setOrderId(data.orderId);
            setSuccess(true);
            clearCart();

        } catch (err) {
            console.error("COD order error:", err);
            setError(err instanceof Error ? err.message : "Failed to place order");
        } finally {
            setLoading(false);
        }
    };

    const handlePay = () => {
        if (selected === "razorpay") {
            handleRazorpayPayment();
        } else if (selected === "cod") {
            handleCODPayment();
        }
    };

    if (success) {
        return (
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 text-center"
                >
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Order Placed Successfully!</h3>
                    <p className="text-gray-600 mb-4">
                        Your order #{orderId.slice(-8)} has been confirmed.
                        {selected === "cod" ? " Pay cash on delivery." : " Payment received successfully."}
                    </p>
                    <div className="space-y-3">
                        <button
                            onClick={() => window.location.href = `/orders`}
                            className="w-full bg-emerald-600 text-white py-3 rounded-2xl font-semibold hover:bg-emerald-700 transition-colors"
                        >
                            View Order Details
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full bg-gray-100 text-gray-700 py-3 rounded-2xl font-semibold hover:bg-gray-200 transition-colors"
                        >
                            Continue Shopping
                        </button>
                    </div>
                </motion.div>
            </div>
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
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <button
                        onClick={() => onClose()}
                        className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <h2 className="text-xl font-bold text-gray-900">Payment</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-600" />
                    </button>
                </div>

                {/* Order Summary */}
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Total Amount</span>
                        <span className="text-lg font-bold text-gray-900">₹{grandTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                        <span className="text-sm text-gray-600">Items</span>
                        <span className="text-sm text-gray-900">{items.length} items</span>
                    </div>
                </div>

                {/* Payment Methods */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Payment Method</h3>

                    <div className="space-y-3">
                        {PAYMENT_METHODS.map((method) => (
                            <button
                                key={method.id}
                                onClick={() => setSelected(method.id)}
                                className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                                    selected === method.id
                                        ? "border-emerald-500 bg-emerald-50"
                                        : "border-gray-200 hover:border-gray-300"
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    {method.icon}
                                    <div className="text-left">
                                        <p className="font-semibold text-gray-900">{method.label}</p>
                                        <p className="text-sm text-gray-600">{method.sub}</p>
                                    </div>
                                </div>
                                {selected === method.id && (
                                    <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                                        <CheckCircle2 className="w-4 h-4 text-white" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-white">
                    <button
                        onClick={handlePay}
                        disabled={loading}
                        className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Lock className="w-5 h-5" />
                                Pay ₹{grandTotal.toFixed(2)}
                            </>
                        )}
                    </button>

                    <p className="text-xs text-gray-500 text-center mt-3">
                        Your payment is secured with 256-bit SSL encryption
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
