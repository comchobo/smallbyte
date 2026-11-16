import { cookies } from "next/headers";
import type { User } from "@/lib/learning";

export async function currentUser(): Promise<User | null> {
  const session = (await cookies()).get("smallbyte_session")?.value;
  if (!session) return null;
  const origin = process.env.API_ORIGIN || "http://api:8000";
  try {
    const response = await fetch(`${origin}/api/me`, {
      headers: { cookie: `smallbyte_session=${session}` },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return null;
    return (await response.json()) as User;
  } catch {
    return null;
  }
}
