import { redirect } from "next/navigation";

export const metadata = {
    title: "My Profile — Snapkart",
    description: "View and manage your Snapkart profile",
};

// Profile page redirects to settings where the profile section is fully built
export default function ProfilePage() {
    redirect("/settings");
}
