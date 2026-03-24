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

export const GET: APIRoute = async ({ request, params }) => {
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
    const { results } = await db.prepare(`
      SELECT 
        country, 
        city, 
        COUNT(*) as clicks,
        json_group_array(strftime('%Y-%m-%dT%H:%M:%SZ', clicked_at)) as timestamps
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
