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

  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const salt = env.HASH_SALT || 'default_salt';

  const data = new TextEncoder().encode(ip + userAgent + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const visitorHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

  const ctx = locals.cfContext;

  if (ctx && ctx.waitUntil) {
    ctx.waitUntil(
      db.prepare(`INSERT INTO clicks (slug, country, city, visitor_hash) VALUES (?, ?, ?, ?)`).bind(slug, country, city, visitorHash).run()
    );
  } else {
    // Fallback if waitUntil is not found
    await db.prepare(`INSERT INTO clicks (slug, country, city, visitor_hash) VALUES (?, ?, ?, ?)`).bind(slug, country, city, visitorHash).run().catch(() => { });
  }

  return Response.redirect(link.target_url as string, 302);
};
