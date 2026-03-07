import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const dataDir = join(process.cwd(), 'data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const photosDir = join(dataDir, 'photos');
if (!existsSync(photosDir)) {
  mkdirSync(photosDir, { recursive: true });
}

const logosDir = join(dataDir, 'logos');
if (!existsSync(logosDir)) {
  mkdirSync(logosDir, { recursive: true });
}

const sqlite = new Database(join(dataDir, 'cards.db'));
sqlite.pragma('journal_mode = WAL');

// Create table if not exists
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_name TEXT NOT NULL,
    barcode_data TEXT NOT NULL,
    format TEXT NOT NULL,
    color TEXT,
    photo_path TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// Migrate: add logo_path column if missing
const columns = sqlite.pragma('table_info(cards)') as { name: string }[];
if (!columns.some(c => c.name === 'logo_path')) {
  sqlite.exec('ALTER TABLE cards ADD COLUMN logo_path TEXT');
}

export const db = drizzle(sqlite, { schema });
export { schema };

// Backfill logos for existing cards that don't have one
import { fetchAndSaveLogo } from '../lib/logos';
import { eq, isNull, sql } from 'drizzle-orm';

const cardsWithoutLogos = db.select({ id: schema.cards.id, storeName: schema.cards.storeName })
  .from(schema.cards)
  .where(isNull(schema.cards.logoPath))
  .all();

if (cardsWithoutLogos.length > 0) {
  console.log(`[logos] Backfilling logos for ${cardsWithoutLogos.length} card(s)...`);
  for (const card of cardsWithoutLogos) {
    fetchAndSaveLogo(card.id, card.storeName).then(logoFile => {
      if (logoFile) {
        db.update(schema.cards)
          .set({ logoPath: logoFile, updatedAt: sql`datetime('now')` })
          .where(eq(schema.cards.id, card.id))
          .run();
        console.log(`[logos] Fetched logo for "${card.storeName}"`);
      }
    }).catch(() => {});
  }
}
