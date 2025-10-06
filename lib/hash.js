import crypto from "crypto";

export function sha256(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}
