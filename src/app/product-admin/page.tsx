"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import ProductAdminDashboard from "@/components/product-admin/ProductAdminDashboard";

export default function ProductAdminPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "loading") return;
        if (status === "authenticated" && session?.user?.role !== "productAdmin") {
            router.replace("/login");
        }
        if (status === "unauthenticated") {
            router.replace("/login");
        }
    }, [session, status, router]);

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a1a0f]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
                    <p className="text-emerald-300 text-sm tracking-widest uppercase">Loading Product Panel…</p>
                </div>
            </div>
        );
    }

    if (status !== "authenticated" || session?.user?.role !== "productAdmin") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a1a0f]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
                    <p className="text-emerald-300 text-sm tracking-widest uppercase">Verifying access…</p>
                </div>
            </div>
        );
    }

    return <ProductAdminDashboard />;
}
