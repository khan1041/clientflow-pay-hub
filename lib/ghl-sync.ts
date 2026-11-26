export interface GhlSyncPayload {
  orderId: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string | null;
  businessName?: string | null;
  businessGoal?: string | null;
  packageName: string;
  ghlTag: string;
  amountPaidUsd: string;
  aiOnboardingPlan?: string | null;
}

export interface GhlSyncResult {
  success: boolean;
  contactId: string | null;
  errorMessage: string | null;
}

function splitName(fullName: string): { firstName: string; lastName?: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "Client" };
  if (parts.length === 1) return { firstName: parts[0] };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export async function syncOrderToGoHighLevel(
  payload: GhlSyncPayload
): Promise<GhlSyncResult> {
  const token = process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!token || !locationId) {
    return {
      success: false,
      contactId: null,
      errorMessage:
        "GHL_PRIVATE_INTEGRATION_TOKEN or GHL_LOCATION_ID is missing in .env.",
    };
  }

  const { firstName, lastName } = splitName(payload.clientName);

  // শুধু যে কাস্টম ফিল্ডগুলো GHL-এ আছে সেগুলোই পাঠালে API এরর হয় না
  const customFields: Array<{ key: string; field_value: string }> = [
    {
      key: "order_amount",
      field_value: String(payload.amountPaidUsd),
    },
  ];

  const tags = Array.from(
    new Set([payload.ghlTag, "clientflow-pay-customer"].filter(Boolean))
  );

  try {
    const res = await fetch("https://services.leadconnectorhq.com/contacts/upsert", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Version: "2021-07-28",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        locationId,
        firstName,
        ...(lastName ? { lastName } : {}),
        email: payload.clientEmail,
        ...(payload.clientPhone ? { phone: payload.clientPhone } : {}),
        ...(payload.businessName ? { companyName: payload.businessName } : {}),
        source: "clientflow-pay",
        tags,
        customFields,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "GHL API request failed");
      return {
        success: false,
        contactId: null,
        errorMessage: `GHL HTTP ${res.status}: ${errorText.slice(0, 250)}`,
      };
    }

    const data = (await res.json().catch(() => ({}))) as {
      contact?: { id?: string };
      id?: string;
    };

    const contactId = data.contact?.id || data.id || null;

    return {
      success: true,
      contactId,
      errorMessage: null,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Network error syncing to GHL";
    return {
      success: false,
      contactId: null,
      errorMessage: message,
    };
  }
}