


export const SESSION_COOKIE_NAME = "cfp_admin_session";

export interface AdminSession {
  email: string;
  role: "ADMIN";
  exp: number;
}

function getAuthSecret(): string {
  return process.env.AUTH_SECRET || "dev-fallback-secret-change-in-production";
}

function decodeBase64UrlToBytes(input: string): Uint8Array {
  const normalized = input
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(input.length / 4) * 4, "=");

  if (typeof globalThis.atob === "function") {
    const binary = globalThis.atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  return new Uint8Array(Buffer.from(normalized, "base64"));
}

function decodeBase64UrlToText(input: string): string {
  const bytes = decodeBase64UrlToBytes(input);
  return new TextDecoder().decode(bytes);
}

export async function verifySessionTokenEdge(
  token: string | undefined
): Promise<AdminSession | null> {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encodedPayload, providedSignature] = parts;
  if (!encodedPayload || !providedSignature) return null;

  try {
    const encoder = new TextEncoder();
    const key = await globalThis.crypto.subtle.importKey(
      "raw",
      encoder.encode(getAuthSecret()),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const sigBytes = decodeBase64UrlToBytes(providedSignature);
    const sigBuffer = new ArrayBuffer(sigBytes.byteLength);
    new Uint8Array(sigBuffer).set(sigBytes);

    const isValid = await globalThis.crypto.subtle.verify(
      "HMAC",
      key,
      sigBuffer,
      encoder.encode(encodedPayload)
    );

    if (!isValid) return null;

    const parsed = JSON.parse(
      decodeBase64UrlToText(encodedPayload)
    ) as AdminSession;

    if (
      parsed.role !== "ADMIN" ||
      typeof parsed.email !== "string" ||
      typeof parsed.exp !== "number"
    ) {
      return null;
    }

    if (parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}