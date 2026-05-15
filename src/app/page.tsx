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
}

export default Home;
