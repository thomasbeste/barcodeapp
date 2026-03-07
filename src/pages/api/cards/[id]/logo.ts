import type { APIRoute } from 'astro';
import { db, schema } from '../../../../db';
import { eq } from 'drizzle-orm';
import { getLogoPath } from '../../../../lib/logos';
import { readFileSync } from 'fs';

export const GET: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  const card = db.select().from(schema.cards).where(eq(schema.cards.id, id)).get();

  if (!card || !card.logoPath) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const data = readFileSync(getLogoPath(card.logoPath));
    return new Response(data, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return new Response('Logo file not found', { status: 404 });
  }
};
