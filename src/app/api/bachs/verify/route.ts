import { NextResponse } from "next/server";
import { verifyBachsTransaction } from "@/lib/bachs";
import { db } from "@/lib/db";
import { fulfillOrder } from "@/lib/fulfilment"; // Adjust import to match your project's fulfillment file

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get("reference");

    if (!reference) {
      return NextResponse.json({ error: "Reference is required" }, { status: 400 });
    }

    const verification = await verifyBachsTransaction(reference);

    if (verification.status === "success" || verification.data?.status === "success") {
      // Perform order fulfillment (assigning voucher code, sending SMS/Email)
      // Call your existing fulfillment service here
      return NextResponse.json({ success: true, data: verification });
    }

    return NextResponse.json({ success: false, message: "Payment not successful" }, { status: 400 });
  } catch (error: any) {
    console.error("Bachs verification error:", error);
    return NextResponse.json({ error: error.message || "Verification failed" }, { status: 500 });
  }
}