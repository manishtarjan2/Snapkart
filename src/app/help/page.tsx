import { auth } from "@/auth";
import { redirect } from "next/navigation";
import User from "@/models/user.model";
import connectDb from "@/lib/db";
import Nav from "@/components/Nav";
import React from "react";
import { HelpCircle } from "lucide-react";

export default async function HelpPage() {
    await connectDb();
    const session = await auth();
    if (!session?.user) redirect("/login");

    const user = await User.findById(session.user.id);
    if (!user) redirect("/login");

    const userData = { _id: user._id.toString(), name: user.name, email: user.email, mobile: user.mobile, role: user.role, image: user.image || null };

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            <Nav user={userData} />
            <main className="pt-24 max-w-6xl mx-auto px-4 sm:px-6 pb-20">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white shadow-lg">
                        <HelpCircle className="w-6 h-6" />
                    </div>
                    <h1 className="text-3xl font-black bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">Help Center</h1>
                </div>
                <div className="bg-gray-900 border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                    <p className="text-gray-400 font-medium relative z-10">Find answers and get support for your Snapkart experience.</p>
                </div>
            </main>
        </div>
    );
}
