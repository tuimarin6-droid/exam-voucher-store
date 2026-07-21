import { NextResponse } from "next/server";
import { fulfilByReference } from "@/lib/fulfilment";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

/**
 * GET /api/paystack/verify?reference=...
 * Called by the /success page after the browser redirect. This gives the buyer
 * instant feedback even before the webhook lands. It reuses the exact same
 * idempotent fulfilment routine, so it can never double-dispense.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const reference = searchParams.get("reference");
  if (!reference) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  try {
    const result = await fulfilByReference(reference);

    // For fulfilled FORM orders, hand back a ready-to-use WhatsApp deep link.
    let whatsappUrl: string | undefined;
    if (result.ok && result.category === "FORM" && result.email) {
      whatsappUrl = buildWhatsAppLink({
        reference,
        productName: result.productName ?? "University Admission Form",
        email: result.email,
      });
    }

    return NextResponse.json({ ...result, whatsappUrl });
  } catch (err) {
    console.error("[verify] error:", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
