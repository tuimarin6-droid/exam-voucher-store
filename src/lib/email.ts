import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL =
  process.env.EMAIL_FROM || "EduPass GH <onboarding@resend.dev>";

interface VoucherEmailParams {
  to: string;
  productName: string;
  code: string;
  reference: string;
}

interface MultipleVoucherEmailParams {
  to: string;
  productName: string;
  codes: string[];
  reference: string;
}

/**
 * Send a single voucher email.
 *
 * Kept for compatibility with existing parts of the application.
 */
export async function sendVoucherEmail(
  params: VoucherEmailParams
) {
  return sendMultipleVoucherEmail({
    to: params.to,
    productName: params.productName,
    codes: [params.code],
    reference: params.reference,
  });
}

/**
 * Send one email containing all vouchers purchased in an order.
 */
export async function sendMultipleVoucherEmail(
  params: MultipleVoucherEmailParams
) {
  const { to, productName, codes, reference } = params;

  const voucherRows = codes
    .map(
      (code, index) => `
        <div style="
          margin: 0 0 12px 0;
          padding: 16px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          background: #f9fafb;
        ">
          <div style="
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 6px;
          ">
            Voucher ${index + 1}
          </div>

          <div style="
            font-size: 22px;
            font-weight: 700;
            letter-spacing: 1px;
            color: #111827;
            font-family: monospace;
          ">
            ${escapeHtml(code)}
          </div>
        </div>
      `
    )
    .join("");

  const voucherListText = codes
    .map((code, index) => `Voucher ${index + 1}: ${code}`)
    .join("\n");

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject:
      codes.length === 1
        ? `Your ${productName} voucher`
        : `Your ${productName} vouchers (${codes.length})`,
    text: `
Your voucher purchase was successful.

Product: ${productName}
Reference: ${reference}

${voucherListText}

Please keep these voucher code(s) safe.

Thank you for your purchase.
EduPass GH
    `.trim(),
    html: `
      <!DOCTYPE html>
      <html>
        <body style="
          margin: 0;
          padding: 0;
          background: #f4f5f7;
          font-family: Arial, Helvetica, sans-serif;
          color: #111827;
        ">
          <div style="
            max-width: 600px;
            margin: 0 auto;
            padding: 32px 16px;
          ">

            <div style="
              background: #ffffff;
              border-radius: 16px;
              padding: 32px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            ">

              <h1 style="
                margin: 0 0 10px 0;
                font-size: 24px;
              ">
                Purchase Successful
              </h1>

              <p style="
                margin: 0 0 24px 0;
                color: #4b5563;
                line-height: 1.6;
              ">
                Thank you for your purchase. Your voucher
                ${codes.length === 1 ? "is" : "codes are"} below.
              </p>

              <div style="
                margin-bottom: 20px;
              ">
                ${voucherRows}
              </div>

              <div style="
                padding: 14px 16px;
                background: #f3f4f6;
                border-radius: 10px;
                font-size: 13px;
                color: #4b5563;
              ">
                <strong>Product:</strong>
                ${escapeHtml(productName)}
                <br />
                <strong>Reference:</strong>
                ${escapeHtml(reference)}
              </div>

              <p style="
                margin: 24px 0 0 0;
                font-size: 13px;
                color: #6b7280;
                line-height: 1.6;
              ">
                Please keep your voucher code(s) safe.
                If you lose them, you will be able to recover
                your purchase using the order lookup feature
                on the website.
              </p>

              <p style="
                margin: 24px 0 0 0;
                color: #374151;
              ">
                Thank you,<br />
                <strong>EduPass GH</strong>
              </p>

            </div>
          </div>
        </body>
      </html>
    `,
  });
}

/**
 * Basic HTML escaping so voucher/product/reference values cannot
 * inject HTML into the email.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
