export async function checkHealth(path: "live" | "ready"): Promise<boolean> {
  const response = await fetch(`/api/health/${path}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) return false;
  const body: unknown = await response.json();
  return (
    typeof body === "object" &&
    body !== null &&
    "status" in body &&
    body.status === "ok"
  );
}
