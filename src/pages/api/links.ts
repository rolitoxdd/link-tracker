import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const GET: APIRoute = async () => {
  const db = env.DB;

  const { results } = await db.prepare(`
    SELECT l.slug, l.target_url, l.description, l.created_at, COUNT(c.id) as clicks, COUNT(DISTINCT c.visitor_hash) as unique_visitors
    FROM links l
    LEFT JOIN clicks c ON l.slug = c.slug
    GROUP BY l.slug
    ORDER BY l.created_at DESC
  `).all();

  return new Response(JSON.stringify(results), {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    }
  });
};

export const POST: APIRoute = async ({ request }) => {
  const db = env.DB;

  const body = (await request.json()) satisfies { target_url?: string; custom_slug?: string; description?: string };
  const targetUrl = body.target_url;
  const description = body.description;
  let slug = body.custom_slug;

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: "target_url is required" }), { status: 400 });
  }

  if (!slug) {
    slug = Math.random().toString(36).substring(2, 8);
  }

  try {
    await db.prepare(`INSERT INTO links (slug, target_url, description) VALUES (?, ?, ?)`).bind(slug, targetUrl, description || null).run();
    return new Response(JSON.stringify({ slug, target_url: targetUrl }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to create link or slug already exists" }), { status: 500 });
  }
};
