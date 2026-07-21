// Build a wa.me deep link with a pre-filled message to your support number.
const WA_HOST = "wa.me";

export function buildWhatsAppLink(params: {
  reference: string;
  productName: string;
  email: string;
}): string {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  if (!number) throw new Error("NEXT_PUBLIC_WHATSAPP_NUMBER is not set");
  const message =
    `Hello! I have paid for the "${params.productName}".\n` +
    `Payment reference: ${params.reference}\n` +
    `Email: ${params.email}\n` +
    `Please send me my form. Thank you!`;
  const text = encodeURIComponent(message);
  return `https://${WA_HOST}/${number}?text=${text}`;
}
