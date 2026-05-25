import * as bcryptjs from "bcryptjs";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { db } from "../db/index";
import { users } from "../db/schema";
const bcrypt = (bcryptjs as any).default || bcryptjs;

const JWT_SECRET =
  import.meta.env.JWT_SECRET ||
  process.env.JWT_SECRET ||
  "envelopes-secret-change-me-in-production";
const TOKEN_EXPIRY = "7d";

export interface JWTPayload {
  userId: number;
  username: string;
}

export function authenticateUser(
  username: string,
  password: string,
): JWTPayload | null {
  const user = db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .get();
  if (!user) return null;

  const valid = bcrypt.compareSync(password, user.passwordHash);
  if (!valid) return null;

  return { userId: user.id, username: user.username };
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function getUserFromCookie(
  cookieHeader: string | null,
): JWTPayload | null {
  if (!cookieHeader) return null;

  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [key, ...vals] = c.trim().split("=");
      return [key, vals.join("=")];
    }),
  );

  const token = cookies["envelopes_token"];
  if (!token) return null;

  return verifyToken(token);
}
