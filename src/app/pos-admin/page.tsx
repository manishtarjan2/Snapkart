"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import PosAdminDashboard from "@/components/PosAdminDashboard";
import { Loader2 } from "lucide-react";

export default function PosAdminPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "loading") return;
        if (!session?.user) { router.replace("/admin-login"); return; }
        const allowed = ["posAdmin", "superAdmin"]; // superAdmin can preview
        if (!allowed.includes(session.user.role)) {
            router.replace("/admin-login");
        }
    }, [session, status, router]);

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a12]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-pink-500 border-t-transparent animate-spin" />
                    <p className="text-pink-300 text-sm tracking-widest uppercase">Loading POS Panel…</p>
                </div>
            </div>
        );
    }

    if (!session?.user || !["posAdmin", "superAdmin"].includes(session.user.role)) return null;

    return <PosAdminDashboard />;
}
