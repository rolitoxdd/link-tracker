import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

const checkAuth = (request: Request) => {
  const authHeader = request.headers.get("Authorization");
  if (!env.API_SECRET || !authHeader || !authHeader.startsWith("Basic ")) return false;
  try {
    return atob(authHeader.split(" ")[1]).split(":")[1] === env.API_SECRET;
  } catch {
    return false;
  }
};

export const DELETE: APIRoute = async ({ request, params }) => {
  if (!checkAuth(request)) {
    const isXHR = request.headers.get("X-Requested-With") === "XMLHttpRequest";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (!isXHR) headers["WWW-Authenticate"] = "Basic realm=\"API\"";
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
  }

  const { slug } = params;
  const db = env.DB;

  if (!slug) {
    return new Response(JSON.stringify({ error: "Slug is required" }), { status: 400 });
  }

  try {
    // We need to delete associated clicks first due to foreign key constraint
    // D1 batching can be used for atomicity
    await db.batch([
      db.prepare(`DELETE FROM clicks WHERE slug = ?`).bind(slug),
      db.prepare(`DELETE FROM links WHERE slug = ?`).bind(slug)
    ]);

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Delete error:", error);
    return new Response(JSON.stringify({ error: "Failed to delete link" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
