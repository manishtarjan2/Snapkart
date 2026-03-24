"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import SuperAdminDashboard from "@/components/super-admin/SuperAdminDashboard";

export default function SuperAdminPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        // Only redirect after we KNOW the session has loaded (not while it's fetching)
        if (status === "loading") return;
        // If authenticated but wrong role → redirect
        if (status === "authenticated" && session?.user?.role !== "superAdmin") {
            router.replace("/login");
        }
        // If not authenticated at all → redirect
        if (status === "unauthenticated") {
            router.replace("/login");
        }
    }, [session, status, router]);

    // Show spinner while session is loading
    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-violet-500 border-t-transparent animate-spin" />
                    <p className="text-violet-300 text-sm tracking-widest uppercase">Loading Control Panel…</p>
                </div>
            </div>
        );
    }

    // Don't render dashboard until we have confirmed superAdmin session
    if (status !== "authenticated" || session?.user?.role !== "superAdmin") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-violet-500 border-t-transparent animate-spin" />
                    <p className="text-violet-300 text-sm tracking-widest uppercase">Verifying access…</p>
                </div>
            </div>
        );
    }

    return <SuperAdminDashboard />;
}
