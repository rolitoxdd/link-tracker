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

const unauthorizedResponse = (request: Request) => {
  const isXHR = request.headers.get("X-Requested-With") === "XMLHttpRequest";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!isXHR) headers["WWW-Authenticate"] = "Basic realm=\"API\"";
  return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
};

export const PATCH: APIRoute = async ({ request, params }) => {
  if (!checkAuth(request)) {
    return unauthorizedResponse(request);
  }

  const { slug } = params;
  const db = env.DB;

  if (!slug) {
    return new Response(JSON.stringify({ error: "Slug is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  if (!body || typeof body !== "object") {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const rawTargetUrl = "target_url" in body ? body.target_url : undefined;
  const rawDescription = "description" in body ? body.description : undefined;
  const targetUrl = typeof rawTargetUrl === "string" ? rawTargetUrl.trim() : "";
  const description = typeof rawDescription === "string" && rawDescription.trim() ? rawDescription.trim() : null;

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: "target_url is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const parsedUrl = new URL(targetUrl);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new Error("Unsupported URL protocol");
    }
  } catch {
    return new Response(JSON.stringify({ error: "target_url must be a valid HTTP(S) URL" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const existing = await db.prepare(`SELECT slug FROM links WHERE slug = ?`).bind(slug).first();
    if (!existing) {
      return new Response(JSON.stringify({ error: "Link not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    await db.prepare(`UPDATE links SET target_url = ?, description = ? WHERE slug = ?`)
      .bind(targetUrl, description, slug)
      .run();

    return new Response(JSON.stringify({ slug, target_url: targetUrl, description }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Update error:", error);
    return new Response(JSON.stringify({ error: "Failed to update link" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

export const DELETE: APIRoute = async ({ request, params }) => {
  if (!checkAuth(request)) {
    return unauthorizedResponse(request);
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
