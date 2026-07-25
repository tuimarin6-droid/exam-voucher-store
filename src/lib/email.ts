// Sends transactional emails via Brevo's HTTP API (https://www.brevo.com).
// Uses a direct fetch call, so no extra npm package is required.

export async function sendVoucherEmail(params: {
  to: string;
  productName: string;
  code: string;
  reference: string;
}): Promise<void> {
  const { to, productName, code, reference } = params;

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error("BREVO_API_KEY is not set");

  const fromEmail = process.env.MAIL_FROM_EMAIL;
  const fromName = process.env.MAIL_FROM_NAME || "EduPass GH";
  if (!fromEmail) throw new Error("MAIL_FROM_EMAIL is not set");

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: fromEmail, name: fromName },
      to: [{ email: to }],
      subject: `Your ${productName} \u2014 voucher code inside`,
      textContent: `Thank you for your purchase!\n\nProduct: ${productName}\nVoucher code / PIN: ${code}\nReference: ${reference}\n\nKeep this code safe. It is single-use.`,
      htmlContent: voucherEmailHtml({ productName, code, reference, fromName }),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Brevo email failed: ${res.status} ${body}`);
  }
}

function voucherEmailHtml(p: {
  productName: string;
  code: string;
  reference: string;
  fromName: string;
}): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f6fb;font-family:Segoe UI,Arial,sans-serif;color:#0f172a">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px">
    <div style="background:#1746a2;color:#fff;border-radius:12px 12px 0 0;padding:20px 24px;font-size:18px;font-weight:700">${p.fromName}</div>
    <div style="background:#fff;border:1px solid #e6e5e3;border-top:0;border-radius:0 0 12px 12px;padding:24px">
      <p style="margin:0 0 8px">Thank you for your purchase.</p>
      <p style="margin:0 0 16px;color:#64748b">Here is your <strong>${p.productName}</strong>.</p>
      <div style="background:#eef4ff;border:1px dashed #1746a2;border-radius:12px;padding:20px;text-align:center;margin:16px 0">
        <div style="font-size:12px;letter-spacing:.08em;color:#1746a2;text-transform:uppercase">Voucher code / PIN</div>
        <div style="font-size:26px;font-weight:800;letter-spacing:.06em;margin-top:6px">${p.code}</div>
      </div>
      <p style="font-size:13px;color:#64748b;margin:0">Reference: ${p.reference}</p>
      <p style="font-size:13px;color:#64748b;margin:8px 0 0">Keep this code safe \u2014 it is single-use. If you have any issues, reply to this email.</p>
    </div>
  </div>
</body></html>`;
}
