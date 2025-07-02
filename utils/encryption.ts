import crypto from "crypto";

const algorithm = "aes-256-cbc";
const secretKey = process.env.ENCRYPTION_SECRET!;

// Validate key length
if (!secretKey || Buffer.from(secretKey).length !== 32) {
  throw new Error("ENCRYPTION_SECRET must be 32 bytes long.");
}

export function encrypt(text: string): { encryptedData: string; iv: string } {
  const iv = crypto.randomBytes(16); // IV must be new each time
  const cipher = crypto.createCipheriv(
    algorithm,
    Buffer.from(secretKey),
    iv
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return {
    encryptedData: encrypted.toString("hex"),
    iv: iv.toString("hex"),
  };
}

export function decrypt(encryptedData: string, ivStr: string): string {
  const decipher = crypto.createDecipheriv(
    algorithm,
    Buffer.from(secretKey),
    Buffer.from(ivStr, "hex")
  );
  let decrypted = decipher.update(Buffer.from(encryptedData, "hex"));
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
