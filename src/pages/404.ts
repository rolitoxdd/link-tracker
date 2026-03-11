import type { APIRoute } from "astro";

export const ALL: APIRoute = () => {
  return new Response("Not found", { status: 404 });
};
