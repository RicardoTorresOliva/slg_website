import { baseDelSitio, canal } from "@/lib/content/rss";

/** Canal RSS en español (RF-23). Solo publicados, solo español. */
export const dynamic = "force-static";

export function GET() {
  return new Response(canal("es", baseDelSitio()), {
    headers: { "content-type": "application/rss+xml; charset=utf-8" },
  });
}
