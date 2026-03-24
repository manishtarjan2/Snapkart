"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import DeliveryAdminDashboard from "@/components/delivery-admin/DeliveryAdminDashboard";

export default function DeliveryAdminPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "loading") return;
        if (status === "authenticated" && session?.user?.role !== "deliveryAdmin") {
            router.replace("/login");
        }
        if (status === "unauthenticated") {
            router.replace("/login");
        }
    }, [session, status, router]);

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#1a0f0a]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
                    <p className="text-orange-300 text-sm tracking-widest uppercase">Loading Delivery Panel…</p>
                </div>
            </div>
        );
    }

    if (status !== "authenticated" || session?.user?.role !== "deliveryAdmin") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#1a0f0a]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
                    <p className="text-orange-300 text-sm tracking-widest uppercase">Verifying access…</p>
                </div>
            </div>
        );
    }

    return <DeliveryAdminDashboard />;
}
