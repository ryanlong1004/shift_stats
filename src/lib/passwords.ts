import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;
const FORMAT_PREFIX = "s1";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${FORMAT_PREFIX}$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [prefix, salt, expectedHash] = storedHash.split("$");

  if (prefix !== FORMAT_PREFIX || !salt || !expectedHash) {
    return false;
  }

  const actualHash = scryptSync(password, salt, KEY_LENGTH);
  const expectedBuffer = Buffer.from(expectedHash, "hex");

  if (actualHash.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualHash, expectedBuffer);
}
