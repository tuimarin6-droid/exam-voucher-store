// Sends transactional emails via Brevo's HTTP API.
// Uses a direct fetch call, so no extra npm package is required.

export async function sendVoucherEmail(params: {
  to: string;
  productName: string;
  code: string;
  reference: string;
}): Promise<void> {
  await sendMultipleVoucherEmail({
    to: params.to,
    productName: params.productName,
    codes: [params.code],
    reference: params.reference,
  });
}

/**
 * Sends one email containing all vouchers purchased in an order.
 *
 * Example:
 *
 * Voucher 1: ABC123
 * Voucher 2: DEF456
 * Voucher 3: GHI789
 */
export async function sendMultipleVoucherEmail(params: {
  to: string;
  productName: string;
  codes: string[];
  reference: string;
}): Promise<void> {
  const {
    to,
    productName,
    codes,
    reference,
  } = params;

  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not set");
  }

  const fromEmail = process.env.MAIL_FROM_EMAIL;
  const fromName =
    process.env.MAIL_FROM_NAME || "EduPass GH";

  if (!fromEmail) {
    throw new Error("MAIL_FROM_EMAIL is not set");
  }

  if (!codes || codes.length === 0) {
    throw new Error("No voucher codes were provided");
  }

  /*
   * Build plain-text voucher list.
   */
  const voucherText = codes
    .map(
      (code, index) =>
        `Voucher ${index + 1}: ${code}`
    )
    .join("\n");

  /*
   * Build HTML voucher cards.
   */
  const voucherHtml = codes
    .map(
      (code, index) => `
        <div style="
          background:#eef4ff;
          border:1px dashed #1746a2;
          border-radius:12px;
          padding:20px;
          text-align:center;
          margin:12px 0;
        ">
          <div style="
            font-size:12px;
            letter-spacing:.08em;
            color:#1746a2;
            text-transform:uppercase;
          ">
            Voucher ${index + 1}
          </div>

          <div style="
            font-size:26px;
            font-weight:800;
            letter-spacing:.06em;
            margin-top:6px;
          ">
            ${escapeHtml(code)}
          </div>
        </div>
      `
    )
    .join("");

  const voucherCountText =
    codes.length === 1
      ? "Here is your voucher."
      : `Here are your ${codes.length} vouchers.`;

  const subject =
    codes.length === 1
      ? `Your ${productName} — voucher code inside`
      : `Your ${productName} — ${codes.length} voucher codes`;

  const res = await fetch(
    "https://api.brevo.com/v3/smtp/email",
    {
      method: "POST",

      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        accept: "application/json",
      },

      body: JSON.stringify({
        sender: {
          email: fromEmail,
          name: fromName,
        },

        to: [
          {
            email: to,
          },
        ],

        subject,

        textContent: `
Thank you for your purchase!

Product: ${productName}

${voucherCountText}

${voucherText}

Reference: ${reference}

Please keep your voucher code(s) safe. Each voucher code is single-use.

If you have any issues with your purchase, please contact us.

${fromName}
        `.trim(),

        htmlContent: voucherEmailHtml({
          productName,
          codes,
          reference,
          fromName,
        }),
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");

    throw new Error(
      `Brevo email failed: ${res.status} ${body}`
    );
  }
}

/**
 * Generate the HTML email.
 */
function voucherEmailHtml(params: {
  productName: string;
  codes: string[];
  reference: string;
  fromName: string;
}): string {
  const {
    productName,
    codes,
    reference,
    fromName,
  } = params;

  const voucherCards = codes
    .map(
      (code, index) => `
        <div style="
          background:#eef4ff;
          border:1px dashed #1746a2;
          border-radius:12px;
          padding:20px;
          text-align:center;
          margin:12px 0;
        ">
          <div style="
            font-size:12px;
            letter-spacing:.08em;
            color:#1746a2;
            text-transform:uppercase;
          ">
            Voucher ${index + 1}
          </div>

          <div style="
            font-size:26px;
            font-weight:800;
            letter-spacing:.06em;
            margin-top:6px;
            color:#0f172a;
          ">
            ${escapeHtml(code)}
          </div>
        </div>
      `
    )
    .join("");

  const message =
    codes.length === 1
      ? "Here is your voucher."
      : `Here are your ${codes.length} vouchers from this purchase.`;

  return `
<!doctype html>

<html>

<body style="
  margin:0;
  background:#f4f6fb;
  font-family:Segoe UI,Arial,sans-serif;
  color:#0f172a;
">

  <div style="
    max-width:520px;
    margin:0 auto;
    padding:32px 20px;
  ">

    <!-- Header -->

    <div style="
      background:#1746a2;
      color:#fff;
      border-radius:12px 12px 0 0;
      padding:20px 24px;
      font-size:18px;
      font-weight:700;
    ">
      ${escapeHtml(fromName)}
    </div>


    <!-- Main content -->

    <div style="
      background:#fff;
      border:1px solid #e6e5e3;
      border-top:0;
      border-radius:0 0 12px 12px;
      padding:24px;
    ">

      <p style="
        margin:0 0 8px;
      ">
        Thank you for your purchase.
      </p>


      <p style="
        margin:0 0 16px;
        color:#64748b;
      ">
        ${message}
      </p>


      <!-- Voucher cards -->

      ${voucherCards}


      <!-- Reference -->

      <div style="
        background:#f8fafc;
        border-radius:10px;
        padding:14px;
        margin-top:18px;
      ">

        <p style="
          font-size:13px;
          color:#64748b;
          margin:0;
        ">
          <strong>Product:</strong>
          ${escapeHtml(productName)}
        </p>

        <p style="
          font-size:13px;
          color:#64748b;
          margin:8px 0 0;
        ">
          <strong>Reference:</strong>
          ${escapeHtml(reference)}
        </p>

      </div>


      <!-- Security notice -->

      <p style="
        font-size:13px;
        color:#64748b;
        margin:18px 0 0;
        line-height:1.6;
      ">
        Keep your voucher code(s) safe.
        Each voucher code is single-use.
      </p>


      <p style="
        font-size:13px;
        color:#64748b;
        margin:8px 0 0;
        line-height:1.6;
      ">
        If you lose your voucher code, you will be able
        to recover your purchase using the order lookup
        feature that will be added to the website.
      </p>


      <p style="
        margin:24px 0 0;
        color:#374151;
      ">
        Thank you,<br>
        <strong>${escapeHtml(fromName)}</strong>
      </p>

    </div>

  </div>

</body>

</html>
  `.trim();
}


/**
 * Escape values before inserting them into HTML.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
