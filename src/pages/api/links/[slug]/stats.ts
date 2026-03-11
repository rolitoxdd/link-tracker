import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const GET: APIRoute = async ({ params }) => {
  const { slug } = params;
  const db = env.DB;

  if (!slug) {
    return new Response(JSON.stringify({ error: "Slug is required" }), { status: 400 });
  }

  try {
    const { results } = await db.prepare(`
      SELECT 
        country, 
        city, 
        COUNT(*) as clicks,
        json_group_array(clicked_at) as timestamps
      FROM clicks
      WHERE slug = ?
      GROUP BY country, city
      ORDER BY clicks DESC
    `).bind(slug).all<{ country: string; city: string; clicks: number; timestamps: string }>();

    // Parse the JSON string of timestamps into an array for each result
    const parsedResults = results.map((row) => ({
      ...row,
      timestamps: JSON.parse(row.timestamps).sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime())
    }));

    return new Response(JSON.stringify(parsedResults), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to fetch stats" }), { status: 500 });
  }
};
