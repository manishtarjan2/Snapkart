"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import StoreAdminDashboard from "@/components/store-admin/StoreAdminDashboard";

export default function StoreAdminPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "loading") return;
        if (status === "authenticated" && session?.user?.role !== "storeAdmin") {
            router.replace("/login");
        }
        if (status === "unauthenticated") {
            router.replace("/login");
        }
    }, [session, status, router]);

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0f1a]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
                    <p className="text-blue-300 text-sm tracking-widest uppercase">Loading Store Panel…</p>
                </div>
            </div>
        );
    }

    if (status !== "authenticated" || session?.user?.role !== "storeAdmin") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0f1a]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
                    <p className="text-blue-300 text-sm tracking-widest uppercase">Verifying access…</p>
                </div>
            </div>
        );
    }

    return <StoreAdminDashboard />;
}
