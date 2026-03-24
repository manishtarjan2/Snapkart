import { auth } from "@/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

// ─── GET — list all employees under this posAdmin's store ───────────────────
export async function GET() {
    const session = await auth();
    if (!session?.user?.role || !["posAdmin", "storeAdmin", "superAdmin"].includes(session.user.role)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    await connectDb();

    const store_id = (session.user as { store_id?: string }).store_id ?? null;
    const filter = session.user.role === "superAdmin"
        ? { role: "employee" }
        : { role: "employee", store_id };

    const employees = await User.find(filter)
        .select("name email employeeId role isBlocked store_id createdAt")
        .lean();

    return NextResponse.json(employees);
}

// ─── POST — create an employee with custom employeeId + password ─────────────
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.role || !["posAdmin", "storeAdmin", "superAdmin"].includes(session.user.role)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    await connectDb();

    const { name, employeeId, password } = await req.json();

    if (!name || !employeeId || !password) {
        return NextResponse.json({ message: "Name, Employee ID, and password are required" }, { status: 400 });
    }
    if (password.length < 6) {
        return NextResponse.json({ message: "Password must be at least 6 characters" }, { status: 400 });
    }

    // Employee email is derived from their ID (internal login)
    const email = `${employeeId.toLowerCase().replace(/\s+/g, "")}@snapkart.internal`;

    const existing = await User.findOne({ $or: [{ email }, { employeeId }] });
    if (existing) {
        return NextResponse.json({ message: "Employee ID already taken" }, { status: 409 });
    }

    const store_id = (session.user as { store_id?: string }).store_id ?? null;
    const hashed = await bcrypt.hash(password, 12);

    const employee = await User.create({
        name,
        email,
        employeeId,
        password: hashed,
        role: "employee",
        store_id,
        isBlocked: false,
        mobile: null,
    });

    return NextResponse.json({
        message: "Employee added successfully",
        id: employee._id,
        name: employee.name,
        employeeId: employee.employeeId,
        loginEmail: email,
        role: "employee",
    }, { status: 201 });
}

// ─── PATCH — block/unblock or reset employee password ───────────────────────
export async function PATCH(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.role || !["posAdmin", "storeAdmin", "superAdmin"].includes(session.user.role)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    await connectDb();

    const { id, isBlocked, newPassword } = await req.json();
    if (!id) return NextResponse.json({ message: "Missing id" }, { status: 400 });

    if (typeof isBlocked === "boolean") {
        await User.findByIdAndUpdate(id, { isBlocked });
        return NextResponse.json({ message: `Employee ${isBlocked ? "suspended" : "reinstated"}` });
    }

    if (newPassword) {
        if (newPassword.length < 6) {
            return NextResponse.json({ message: "Password too short (min 6)" }, { status: 400 });
        }
        const hashed = await bcrypt.hash(newPassword, 12);
        await User.findByIdAndUpdate(id, { password: hashed });
        return NextResponse.json({ message: "Password updated" });
    }

    return NextResponse.json({ message: "Nothing to update" }, { status: 400 });
}

// ─── DELETE — remove employee ─────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.role || !["posAdmin", "storeAdmin", "superAdmin"].includes(session.user.role)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    await connectDb();

    const { id } = await req.json();
    if (!id) return NextResponse.json({ message: "Missing id" }, { status: 400 });

    await User.findByIdAndDelete(id);
    return NextResponse.json({ message: "Employee removed" });
}
