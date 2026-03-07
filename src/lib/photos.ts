import { existsSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';

const PHOTOS_DIR = join(process.cwd(), 'data', 'photos');

export function getPhotosDir(): string {
  if (!existsSync(PHOTOS_DIR)) {
    mkdirSync(PHOTOS_DIR, { recursive: true });
  }
  return PHOTOS_DIR;
}

export function getPhotoPath(filename: string): string {
  return join(getPhotosDir(), filename);
}

export function deletePhoto(filename: string): boolean {
  const path = getPhotoPath(filename);
  if (existsSync(path)) {
    unlinkSync(path);
    return true;
  }
  return false;
}

export function photoFilename(cardId: number, ext: string): string {
  return `card_${cardId}${ext}`;
}
