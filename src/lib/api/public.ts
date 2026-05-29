export async function getPlatformStats() {
  const res = await fetch("/api/public/stats", {
    cache: "force-cache",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch platform stats");
  }

  return res.json();
}