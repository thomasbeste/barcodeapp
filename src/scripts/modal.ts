import { renderBarcode } from './barcode-render';
import { stopScanner } from './scanner';

const BASE = import.meta.env.BASE_URL;

let wakeLock: WakeLockSentinel | null = null;
let currentCardId: number | null = null;
let actionSheetCardId: number | null = null;

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

export function getActionSheetCardId(): number | null {
  return actionSheetCardId;
}

export function closeActionSheet() {
  document.getElementById('action-sheet-overlay')!.classList.remove('active');
  actionSheetCardId = null;
}

function openActionSheet(tile: HTMLElement) {
  const id = Number(tile.dataset.cardId);
  const name = tile.dataset.name || 'Card';
  actionSheetCardId = id;

  document.getElementById('action-sheet-title')!.textContent = name;
  document.getElementById('action-sheet-overlay')!.classList.add('active');
}

export async function openBarcodeFromTile(tile: HTMLElement) {
  const id = Number(tile.dataset.cardId);
  const barcode = tile.dataset.barcode!;
  const format = tile.dataset.format!;
  const color = tile.dataset.color || '#4a90d9';
  const name = tile.dataset.name || '';

  currentCardId = id;

  const modal = document.getElementById('barcode-modal')!;
  const nameEl = document.getElementById('barcode-store-name')!;
  nameEl.textContent = name;

  const cardHeader = document.getElementById('barcode-card-header')!;
  cardHeader.style.backgroundColor = color;

  // Show/hide logo
  const logoImg = document.getElementById('barcode-logo') as HTMLImageElement;
  if (tile.dataset.hasLogo === 'true') {
    logoImg.src = `${BASE}api/cards/${id}/logo`;
    logoImg.style.display = '';
  } else {
    logoImg.style.display = 'none';
    logoImg.removeAttribute('src');
  }

  // Show the modal immediately, render barcode after
  document.getElementById('barcode-view')!.style.display = '';
  document.getElementById('barcode-edit')!.style.display = 'none';
  document.getElementById('barcode-edit')!.classList.remove('active');
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

function setupLongPress(tile: HTMLElement) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let startX = 0;
  let startY = 0;
  let didLongPress = false;

  tile.addEventListener('pointerdown', (e) => {
    startX = e.clientX;
    startY = e.clientY;
    didLongPress = false;
    tile.classList.add('long-pressing');

    timer = setTimeout(() => {
      didLongPress = true;
      tile.classList.remove('long-pressing');
      if (navigator.vibrate) navigator.vibrate(50);
      openActionSheet(tile);
    }, 500);
  });

  tile.addEventListener('pointermove', (e) => {
    if (!timer) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.sqrt(dx * dx + dy * dy) > 10) {
      clearTimeout(timer);
      timer = null;
      tile.classList.remove('long-pressing');
    }
  });

  const cancelPress = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    tile.classList.remove('long-pressing');
  };

  tile.addEventListener('pointerup', (e) => {
    cancelPress();
    if (!didLongPress) {
      openBarcodeFromTile(tile);
    }
  });

  tile.addEventListener('pointerleave', cancelPress);
  tile.addEventListener('pointercancel', cancelPress);

  // Prevent native context menu on tiles
  tile.addEventListener('contextmenu', (e) => e.preventDefault());
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

  // Card tiles — long press for action sheet, short tap to open barcode
  document.querySelectorAll('.card-tile').forEach(tile => {
    setupLongPress(tile as HTMLElement);
  });

  // Action sheet cancel + overlay tap
  document.getElementById('action-sheet-cancel')!.addEventListener('click', closeActionSheet);
  document.getElementById('action-sheet-overlay')!.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeActionSheet();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeActionSheet();
      closeBarcodeModal();
      closeAddModal();
    }
  });
}
