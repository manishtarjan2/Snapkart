import { auth } from "@/auth";
import { redirect } from "next/navigation";
import BillingCounter from "@/components/BillingCounter";

export const metadata = {
    title: "Billing Counter — SnapKart POS",
    description: "In-store offline billing counter for SnapKart",
};

export default async function BillingPage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    const allowedRoles = ["admin", "storeAdmin", "superAdmin"];
    if (!allowedRoles.includes(session.user.role)) {
        redirect("/");
    }

    return <BillingCounter />;
}
