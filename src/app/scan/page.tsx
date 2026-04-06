import { auth } from "@/auth";
import { redirect } from "next/navigation";
import SelfScanBarcode from "@/components/SelfScanBarcode";

export const metadata = {
    title: "Self Scan Barcode — SnapKart",
    description: "Scan product barcodes for self-checkout at SnapKart",
};

export default async function ScanPage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    return <SelfScanBarcode />;
}
