import type { APIRoute } from 'astro';
import { db, schema } from '../../../db';
import { eq } from 'drizzle-orm';

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

  const result = db.insert(schema.cards).values({
    storeName,
    barcodeData,
    format,
    color: color || null,
    notes: notes || null,
  }).returning().get();

  return new Response(JSON.stringify(result), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
