import type { APIRoute } from 'astro';
import { db, schema } from '../../../../db';
import { eq, sql } from 'drizzle-orm';
import { getPhotoPath, deletePhoto, photoFilename } from '../../../../lib/photos';
import { readFileSync, writeFileSync } from 'fs';
import { extname } from 'path';

export const POST: APIRoute = async ({ params, request }) => {
  const id = Number(params.id);
  const card = db.select().from(schema.cards).where(eq(schema.cards.id, id)).get();

  if (!card) {
    return new Response(JSON.stringify({ error: 'Card not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const formData = await request.formData();
  const file = formData.get('photo') as File | null;

  if (!file || file.size === 0) {
    return new Response(JSON.stringify({ error: 'No photo provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Delete old photo if exists
  if (card.photoPath) {
    deletePhoto(card.photoPath);
  }

  const ext = extname(file.name) || '.jpg';
  const filename = photoFilename(id, ext);
  const buffer = Buffer.from(await file.arrayBuffer());
  writeFileSync(getPhotoPath(filename), buffer);

  db.update(schema.cards)
    .set({ photoPath: filename, updatedAt: sql`datetime('now')` })
    .where(eq(schema.cards.id, id))
    .run();

  return new Response(JSON.stringify({ ok: true, photoPath: filename }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const GET: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  const card = db.select().from(schema.cards).where(eq(schema.cards.id, id)).get();

  if (!card || !card.photoPath) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const data = readFileSync(getPhotoPath(card.photoPath));
    const ext = extname(card.photoPath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    return new Response(data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return new Response('Photo file not found', { status: 404 });
  }
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

  if (card.photoPath) {
    deletePhoto(card.photoPath);
    db.update(schema.cards)
      .set({ photoPath: null, updatedAt: sql`datetime('now')` })
      .where(eq(schema.cards.id, id))
      .run();
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
