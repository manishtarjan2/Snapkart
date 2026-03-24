<<<<<<< HEAD
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
=======
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            To get started, edit the page.tsx file.
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Looking for a starting point or more instructions? Head over to{" "}
            <a
              href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              Templates
            </a>{" "}
            or the{" "}
            <a
              href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              Learning
            </a>{" "}
            center.
          </p>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <a
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={16}
              height={16}
            />
            Deploy Now
          </a>
          <a
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </a>
        </div>
      </main>
    </div>
  );
}
>>>>>>> bafa9275502d3f80c96e7ae5d5e87887f748a526
