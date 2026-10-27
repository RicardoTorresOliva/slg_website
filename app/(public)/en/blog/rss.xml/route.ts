import { canal } from "@/lib/content/rss";
import { baseDelSitio } from "@/lib/content/sitio";

/** Canal RSS en inglés (RF-23). Solo publicados, solo inglés. */
export const dynamic = "force-static";

export function GET() {
  return new Response(canal("en", baseDelSitio()), {
    headers: { "content-type": "application/rss+xml; charset=utf-8" },
  });
}
