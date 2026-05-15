export const dynamic = 'force-dynamic';
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import UserSettingsClient from "@/components/UserSettingsClient";
import DeliveryBoySettings from "@/components/DeliveryBoySettings";
import AdminSettings from "@/components/AdminSettings";

export const metadata = {
    title: "Settings — Snapkart",
    description: "Manage your Snapkart account settings, profile, and preferences",
};

export default async function SettingsPage() {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const role = session.user.role;

    if (role === "admin" || role === "superAdmin") {
        return <AdminSettings />;
    } else if (role === "deliveryBoy" || role === "diliveryBoy") {
        return <DeliveryBoySettings />;
    } else {
        return <UserSettingsClient />;
    }
}
