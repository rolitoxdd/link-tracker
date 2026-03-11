import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const GET: APIRoute = async ({ params, request, locals }) => {
  const { slug } = params;
  const db = env.DB;

  const link = await db.prepare("SELECT target_url FROM links WHERE slug = ?").bind(slug).first();

  if (!link) {
    return new Response("Not found", { status: 404 });
  }

  const country = request.cf?.country || 'Unknown';
  const city = request.cf?.city || 'Unknown';

  const ctx = locals.cfContext;

  if (ctx && ctx.waitUntil) {
    ctx.waitUntil(
      db.prepare(`INSERT INTO clicks (slug, country, city) VALUES (?, ?, ?)`).bind(slug, country, city).run()
    );
  } else {
    // Fallback if waitUntil is not found
    await db.prepare(`INSERT INTO clicks (slug, country, city) VALUES (?, ?, ?)`).bind(slug, country, city).run().catch(() => { });
  }

  return Response.redirect(link.target_url as string, 302);
};
