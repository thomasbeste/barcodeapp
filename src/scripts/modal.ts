import { renderBarcode } from './barcode-render';
import { stopScanner } from './scanner';

const BASE = import.meta.env.BASE_URL;

let wakeLock: WakeLockSentinel | null = null;
let currentCardId: number | null = null;

async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
    } catch { /* not available */ }
  }
}

async function releaseWakeLock() {
  if (wakeLock) {
    try { await wakeLock.release(); } catch { /* ignore */ }
    wakeLock = null;
  }
}

export function getCurrentCardId(): number | null {
  return currentCardId;
}

export async function openBarcodeFromTile(tile: HTMLElement) {
  const id = Number(tile.dataset.cardId);
  const barcode = tile.dataset.barcode!;
  const format = tile.dataset.format!;
  const color = tile.dataset.color || '';
  const name = tile.dataset.name || '';

  currentCardId = id;

  const modal = document.getElementById('barcode-modal')!;
  const nameEl = document.getElementById('barcode-store-name')!;
  nameEl.textContent = name;
  nameEl.style.color = color;

  // Show the modal immediately, render barcode after
  document.getElementById('barcode-view')!.style.display = '';
  document.getElementById('barcode-edit')!.style.display = 'none';
  document.getElementById('barcode-edit')!.classList.remove('active');
  (document.querySelector('.barcode-fullscreen-footer') as HTMLElement).style.display = '';
  (document.getElementById('barcode-photo') as HTMLImageElement).style.display = 'none';

  modal.classList.add('active');
  requestWakeLock();

  // Now render the barcode
  const renderArea = document.getElementById('barcode-render-area')!;
  await renderBarcode(renderArea, barcode, format);
}

export async function closeBarcodeModal() {
  document.getElementById('barcode-modal')!.classList.remove('active');
  currentCardId = null;
  await releaseWakeLock();
}

export function closeAddModal() {
  document.getElementById('add-card-modal')!.classList.remove('active');
  stopScanner();
}

export function openAddModal() {
  document.getElementById('add-card-modal')!.classList.add('active');
  switchTab('manual');
}

function switchTab(tab: string) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', (btn as HTMLElement).dataset.tab === tab);
  });
  (document.getElementById('tab-manual') as HTMLElement).style.display = tab === 'manual' ? 'block' : 'none';
  (document.getElementById('tab-scan') as HTMLElement).style.display = tab === 'scan' ? 'block' : 'none';
  if (tab !== 'scan') stopScanner();
}

export function initModals() {
  document.getElementById('barcode-modal-close')!.addEventListener('click', closeBarcodeModal);

  document.getElementById('add-modal-close')!.addEventListener('click', closeAddModal);
  document.getElementById('add-card-modal')!.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeAddModal();
  });

  document.getElementById('fab-add')!.addEventListener('click', openAddModal);

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab((btn as HTMLElement).dataset.tab!));
  });

  // Card tiles — read data from DOM, no API call
  document.querySelectorAll('.card-tile').forEach(tile => {
    tile.addEventListener('click', () => openBarcodeFromTile(tile as HTMLElement));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeBarcodeModal();
      closeAddModal();
    }
  });
}
