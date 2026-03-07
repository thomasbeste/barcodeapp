import { existsSync, unlinkSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';

const LOGOS_DIR = join(process.cwd(), 'data', 'logos');

export function getLogosDir(): string {
  if (!existsSync(LOGOS_DIR)) {
    mkdirSync(LOGOS_DIR, { recursive: true });
  }
  return LOGOS_DIR;
}

export function getLogoPath(filename: string): string {
  return join(getLogosDir(), filename);
}

export function deleteLogo(filename: string): boolean {
  const path = getLogoPath(filename);
  if (existsSync(path)) {
    unlinkSync(path);
    return true;
  }
  return false;
}

export function logoFilename(cardId: number): string {
  return `logo_${cardId}.png`;
}

const DOMAIN_OVERRIDES: Record<string, string> = {
  'cvs': 'cvs.com',
  'traderjoes': 'traderjoes.com',
  'traderjoe\'s': 'traderjoes.com',
  'mcdonalds': 'mcdonalds.com',
  'mcdonald\'s': 'mcdonalds.com',
  'bestbuy': 'bestbuy.com',
  'walgreens': 'walgreens.com',
  'walmart': 'walmart.com',
  'target': 'target.com',
  'costco': 'costco.com',
  'starbucks': 'starbucks.com',
  'kroger': 'kroger.com',
  'safeway': 'safeway.com',
  'wholefoods': 'wholefoodsmarket.com',
  'wholefoodsmarket': 'wholefoodsmarket.com',
  'homedepot': 'homedepot.com',
  'lowes': 'lowes.com',
  'lowe\'s': 'lowes.com',
  'nordstrom': 'nordstrom.com',
  'macys': 'macys.com',
  'macy\'s': 'macys.com',
  'sephora': 'sephora.com',
  'ulta': 'ulta.com',
  'petsmart': 'petsmart.com',
  'petco': 'petco.com',
  'ikea': 'ikea.com',
  'rei': 'rei.com',
  'tjmaxx': 'tjmaxx.com',
  'marshalls': 'marshalls.com',
  'panera': 'panerabread.com',
  'panerabread': 'panerabread.com',
  'chipotle': 'chipotle.com',
  'subway': 'subway.com',
  'dunkindonuts': 'dunkindonuts.com',
  'dunkin': 'dunkindonuts.com',
  'albertsons': 'albertsons.com',
  'aldi': 'aldi.us',
  'samsclub': 'samsclub.com',
  'sam\'sclub': 'samsclub.com',
  'bjs': 'bjs.com',
  'dickssportinggoods': 'dickssportinggoods.com',
  'dicks': 'dickssportinggoods.com',
  'dick\'ssportinggoods': 'dickssportinggoods.com',
  'bathandbodyworks': 'bathandbodyworks.com',
};

export function inferDomain(storeName: string): string {
  const key = storeName.toLowerCase().replace(/[^a-z0-9']/g, '');
  if (DOMAIN_OVERRIDES[key]) return DOMAIN_OVERRIDES[key];
  const stripped = storeName.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (DOMAIN_OVERRIDES[stripped]) return DOMAIN_OVERRIDES[stripped];
  return stripped + '.com';
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchAndSaveLogo(cardId: number, storeName: string): Promise<string | null> {
  const domain = inferDomain(storeName);
  const filename = logoFilename(cardId);
  const outPath = getLogoPath(filename);

  // Try Clearbit Logo API
  try {
    const res = await fetchWithTimeout(`https://logo.clearbit.com/${domain}`, 5000);
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length >= 500) {
        const png = await sharp(buf).resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
        writeFileSync(outPath, png);
        return filename;
      }
    }
  } catch { /* fall through to Google */ }

  // Fallback: Google S2 favicon
  try {
    const res = await fetchWithTimeout(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`, 5000);
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length >= 1000) {
        const png = await sharp(buf).resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
        writeFileSync(outPath, png);
        return filename;
      }
    }
  } catch { /* no logo available */ }

  return null;
}
