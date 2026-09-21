import { canal } from "@/lib/content/rss";
import { baseDelSitio } from "@/lib/content/sitio";

/** Canal RSS en español (RF-23). Solo publicados, solo español. */
export const dynamic = "force-static";

export function GET() {
  return new Response(canal("es", baseDelSitio()), {
    headers: { "content-type": "application/rss+xml; charset=utf-8" },
  });
}
