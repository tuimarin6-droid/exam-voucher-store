import { NextResponse } from "next/server";
import { initializeBachsTransaction } from "@/lib/bachs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, amount, reference } = body;

    if (!email || !amount || !reference) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const host = request.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const callbackUrl = `${protocol}://${host}/success?reference=${reference}`;

    const result = await initializeBachsTransaction({
      email,
      amount,
      reference,
      callbackUrl,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Bachs initialization error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}