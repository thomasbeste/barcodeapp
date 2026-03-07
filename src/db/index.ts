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

export const db = drizzle(sqlite, { schema });
export { schema };
