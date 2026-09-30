const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLL_NUMBER_PATTERN = /^[A-Z0-9][A-Z0-9-]{3,29}$/;

export function normalizeRollNo(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, "").toUpperCase() : "";
}

export function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function normalizePhone(value: unknown): string {
  const digits = typeof value === "string" ? value.replace(/\D/g, "") : "";
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  return digits;
}

export function isValidRegistrationPhone(value: unknown): boolean {
  const phone = normalizePhone(value);
  return /^\d{10}$/.test(phone) && !/^(\d)\1{9}$/.test(phone);
}

export function validateRegistrationIdentity(input: {
  name: unknown;
  rollNo: unknown;
  email: unknown;
  phone: unknown;
}): string | null {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const rollNo = normalizeRollNo(input.rollNo);
  const email = normalizeEmail(input.email);

  if (name.length < 2 || name.length > 100) return "Enter a valid full name.";
  if (!ROLL_NUMBER_PATTERN.test(rollNo)) return "Enter a valid roll number.";
  if (!EMAIL_PATTERN.test(email) || email.length > 254) return "Enter a valid email address.";
  if (!isValidRegistrationPhone(input.phone)) return "Enter a valid 10-digit phone number.";

  return null;
}

export function getRegistrationDuplicateKeys(input: {
  eventId: string;
  rollNo?: unknown;
  email?: unknown;
  phone?: unknown;
}): string[] {
  const eventId = input.eventId.trim().toLowerCase();
  const keys: string[] = [];
  const rollNo = normalizeRollNo(input.rollNo);
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);

  if (rollNo) keys.push(`${eventId}:roll:${rollNo}`);
  if (email) keys.push(`${eventId}:email:${email}`);
  if (phone) keys.push(`${eventId}:phone:${phone}`);

  return keys;
}

export function serializeTimestamp(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const date = (value as { toDate: () => Date }).toDate();
    return date instanceof Date && !Number.isNaN(date.valueOf()) ? date.toISOString() : null;
  }
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString();
  return null;
}
