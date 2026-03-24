import connectDb from "@/lib/db";
import User from "@/models/user.model";  // ✅ renamed import to avoid conflict
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    await connectDb(); // if fails it will throw, no need to manually check

    const { name, email, password } = await req.json();
    console.log(name, email, password);

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({  // ✅ direct create + save
      name,
      email,
      password: hashedPassword,
    });

    return NextResponse.json(
      { message: "Registration successful", user: { name: newUser.name, email: newUser.email } },
      { status: 201 }  // better status for created resource
    );

  } catch (error) {
    console.error("Register API Error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
