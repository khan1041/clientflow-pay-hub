
// import crypto from "crypto";
// import { cookies } from "next/headers";

// export const SESSION_COOKIE_NAME = "cfp_admin_session";

// export interface AdminSession {
//   email: string;
//   role: "ADMIN";
//   exp: number;
// }

// function getAuthSecret(): string {
//   return process.env.AUTH_SECRET || "dev-fallback-secret-change-in-production";
// }

// function signPayload(encodedPayload: string): string {
//   return crypto
//     .createHmac("sha256", getAuthSecret())
//     .update(encodedPayload)
//     .digest("base64url");
// }

// export function createSessionToken(email: string, ttlSeconds = 60 * 60 * 24): string {
//   const payload: AdminSession = {
//     email,
//     role: "ADMIN",
//     exp: Math.floor(Date.now() / 1000) + ttlSeconds,
//   };

//   const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
//   const signature = signPayload(encodedPayload);
//   return `${encodedPayload}.${signature}`;
// }

// export function verifySessionToken(token: string | undefined): AdminSession | null {
//   if (!token) return null;

//   const parts = token.split(".");
//   if (parts.length !== 2) return null;

//   const [encodedPayload, providedSignature] = parts;
//   if (!encodedPayload || !providedSignature) return null;

//   const expectedSignature = signPayload(encodedPayload);
//   const a = Buffer.from(providedSignature);
//   const b = Buffer.from(expectedSignature);

//   if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
//     return null;
//   }

//   try {
//     const parsed = JSON.parse(
//       Buffer.from(encodedPayload, "base64url").toString("utf8")
//     ) as AdminSession;

//     if (
//       parsed.role !== "ADMIN" ||
//       typeof parsed.email !== "string" ||
//       typeof parsed.exp !== "number"
//     ) {
//       return null;
//     }

//     if (parsed.exp < Math.floor(Date.now() / 1000)) {
//       return null;
//     }

//     return parsed;
//   } catch {
//     return null;
//   }
// }

// export async function getAdminSession(): Promise<AdminSession | null> {
//   const cookieStore = await cookies();
//   const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
//   return verifySessionToken(token);
// }

// export function verifyAdminCredentials(email: string, password: string): boolean {
//   const expectedEmail = (process.env.ADMIN_EMAIL || "admin@clientflowpay.local").trim().toLowerCase();
//   const expectedPassword = process.env.ADMIN_PASSWORD || "ChangeMe@12345";

//   const normalizedEmail = email.trim().toLowerCase();
//   if (normalizedEmail !== expectedEmail) return false;

//   const givenBuf = Buffer.from(password);
//   const expectedBuf = Buffer.from(expectedPassword);

//   if (givenBuf.length !== expectedBuf.length) return false;
//   return crypto.timingSafeEqual(givenBuf, expectedBuf);
// }



import crypto from "crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "cfp_admin_session";

export interface AdminSession {
  email: string;
  role: "ADMIN";
  exp: number;
}

function getAuthSecret(): string {
  return process.env.AUTH_SECRET || "dev-fallback-secret-change-in-production";
}

function signPayload(encodedPayload: string): string {
  return crypto
    .createHmac("sha256", getAuthSecret())
    .update(encodedPayload)
    .digest("base64url");
}

function decodeBase64Url(input: string): string {
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
    return new TextDecoder().decode(bytes);
  }

  return Buffer.from(normalized, "base64").toString("utf8");
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

export function createSessionToken(
  email: string,
  ttlSeconds = 60 * 60 * 24
): string {
  const payload: AdminSession = {
    email,
    role: "ADMIN",
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url"
  );
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(
  token: string | undefined
): AdminSession | null {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encodedPayload, providedSignature] = parts;
  if (!encodedPayload || !providedSignature) return null;

  const expectedSignature = signPayload(encodedPayload);
  const a = Buffer.from(providedSignature);
  const b = Buffer.from(expectedSignature);

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(encodedPayload)) as AdminSession;

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

    const parsed = JSON.parse(decodeBase64Url(encodedPayload)) as AdminSession;

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

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

export function verifyAdminCredentials(email: string, password: string): boolean {
  const expectedEmail = (
    process.env.ADMIN_EMAIL || "admin@clientflowpay.local"
  )
    .trim()
    .toLowerCase();
  const expectedPassword = process.env.ADMIN_PASSWORD || "ChangeMe@12345";

  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail !== expectedEmail) return false;

  const givenBuf = Buffer.from(password);
  const expectedBuf = Buffer.from(expectedPassword);

  if (givenBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(givenBuf, expectedBuf);
}

