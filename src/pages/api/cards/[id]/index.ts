import type { APIRoute } from 'astro';
import { db, schema } from '../../../../db';
import { eq, sql } from 'drizzle-orm';
import { deletePhoto } from '../../../../lib/photos';
import { deleteLogo } from '../../../../lib/logos';

export const GET: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  const card = db.select().from(schema.cards).where(eq(schema.cards.id, id)).get();

  if (!card) {
    return new Response(JSON.stringify({ error: 'Card not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(card), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ params, request }) => {
  const id = Number(params.id);
  const body = await request.json();

  const card = db.select().from(schema.cards).where(eq(schema.cards.id, id)).get();
  if (!card) {
    return new Response(JSON.stringify({ error: 'Card not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const updated = db.update(schema.cards)
    .set({
      storeName: body.storeName ?? card.storeName,
      barcodeData: body.barcodeData ?? card.barcodeData,
      format: body.format ?? card.format,
      color: body.color !== undefined ? (body.color || null) : card.color,
      notes: body.notes !== undefined ? (body.notes || null) : card.notes,
      updatedAt: sql`datetime('now')`,
    })
    .where(eq(schema.cards.id, id))
    .returning()
    .get();

  return new Response(JSON.stringify(updated), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  const card = db.select().from(schema.cards).where(eq(schema.cards.id, id)).get();

  if (!card) {
    return new Response(JSON.stringify({ error: 'Card not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Delete photo if exists
  if (card.photoPath) {
    deletePhoto(card.photoPath);
  }

  // Delete logo if exists
  if (card.logoPath) {
    deleteLogo(card.logoPath);
  }

  db.delete(schema.cards).where(eq(schema.cards.id, id)).run();

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
