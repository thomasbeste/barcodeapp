import type { APIRoute } from 'astro';
import { db, schema } from '../../../db';
import { eq, sql } from 'drizzle-orm';
import { fetchAndSaveLogo } from '../../../lib/logos';

export const GET: APIRoute = async () => {
  const allCards = db.select().from(schema.cards).orderBy(schema.cards.storeName).all();
  return new Response(JSON.stringify(allCards), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();

  const { storeName, barcodeData, format, color, notes } = body;

  if (!storeName || !barcodeData || !format) {
    return new Response(JSON.stringify({ error: 'storeName, barcodeData, and format are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const result = db.insert(schema.cards).values({
      storeName,
      barcodeData,
      format,
      color: color || null,
      notes: notes || null,
    }).returning().get();

    // Fire-and-forget logo fetch
    fetchAndSaveLogo(result.id, storeName).then(logoFile => {
      if (logoFile) {
        db.update(schema.cards)
          .set({ logoPath: logoFile, updatedAt: sql`datetime('now')` })
          .where(eq(schema.cards.id, result.id))
          .run();
      }
    }).catch(() => {});

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Failed to insert card:', err);
    return new Response(JSON.stringify({ error: 'Database error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
