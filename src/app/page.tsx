export const dynamic = 'force-dynamic';
import { auth } from "@/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import React from "react";
import { redirect } from "next/navigation";
import EditRoleMobile from "@/components/EditRoleMobile";
import Nav from "@/components/Nav";
import UserDashboard from "@/components/UserDashboard";
import AdmineDashboard from "@/components/AdmineDashboard";
import DeliveryBoy from "@/components/DeliveryBoy";

async function Home() {
  try {
    await connectDb();
    const session = await auth();
    if (!session?.user) {
      redirect("/login");
    }

    // Redirect specialized admin roles to their dedicated dashboards
    const role = session.user.role;
    if (role === "superAdmin") redirect("/super-admin");
    if (role === "storeAdmin") redirect("/store-admin");
    if (role === "productAdmin") redirect("/product-admin");
    if (role === "deliveryAdmin") redirect("/delivery-admin");
    if (role === "posAdmin") redirect("/pos-admin");
    // deliveryBoy, employee, user, admin — handled below

    const user = await User.findById(session.user.id);
    if (!user) {
      redirect("/login");
    }

    const isIncomplete = !user.mobile || !user.role;
    if (isIncomplete) {
      return <EditRoleMobile />;
    }

    const userData = {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      image: user.image || null,
    };

    // Role-based component rendering
    const isDeliveryRole = ["deliveryBoy", "diliveryBoy"].includes(user.role);
    const isLegacyAdmin = user.role === "admin";

    return (
      <div className="pt-24">
        <Nav user={userData} />
        {user.role === "user" ? (
          <UserDashboard />
        ) : isLegacyAdmin ? (
          <AdmineDashboard />
        ) : isDeliveryRole ? (
          <DeliveryBoy />
        ) : (
          // posAdmin, employee, and any other roles see UserDashboard
          <UserDashboard />
        )}
      </div>
    );
  } catch (error: any) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center text-red-500">
        <h1 className="text-3xl font-bold mb-4">Database or Configuration Error</h1>
        <p className="text-lg">This is the exact error causing the crash on Vercel:</p>
        <pre className="bg-gray-100 p-4 rounded text-left text-black mt-4 max-w-2xl overflow-auto whitespace-pre-wrap">
          {error.message || String(error)}
        </pre>
        <p className="mt-8 text-black">If this says "querySrv ENOTFOUND", it means your MongoDB URL is missing in Vercel.</p>
        <p className="mt-2 text-black">If this says something about "timeout", it means MongoDB Network Access is blocking Vercel's IP.</p>
      </div>
    );
  }
}

export default Home;
