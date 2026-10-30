export interface BachsInitializeOptions {
  email: string;
  amount: number; // in GHS or lowest currency unit depending on Bachs spec
  reference: string;
  callbackUrl: string;
}

export async function initializeBachsTransaction(options: BachsInitializeOptions) {
  const secretKey = process.env.BACHS_SECRET_KEY;
  if (!secretKey) {
    throw new Error("BACHS_SECRET_KEY is not configured");
  }

  const response = await fetch("https://api.bachs.io/v1/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: options.email,
      amount: options.amount,
      reference: options.reference,
      callback_url: options.callbackUrl,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to initialize Bachs transaction");
  }
  return data;
}

export async function verifyBachsTransaction(reference: string) {
  const secretKey = process.env.BACHS_SECRET_KEY;
  if (!secretKey) {
    throw new Error("BACHS_SECRET_KEY is not configured");
  }

  const response = await fetch(`https://api.bachs.io/v1/transaction/verify/${reference}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to verify Bachs transaction");
  }
  return data;
}
