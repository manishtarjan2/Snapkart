import { auth } from "@/auth";
import { redirect } from "next/navigation";
import SelfCheckoutPage from "@/components/SelfCheckoutPage";

export const metadata = {
    title: "Self Checkout — SnapKart",
    description: "Complete your self-checkout at SnapKart",
};

export default async function SelfCheckoutRoute() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    return <SelfCheckoutPage />;
}
