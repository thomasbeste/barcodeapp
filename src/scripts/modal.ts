import { renderBarcode } from './barcode-render';
import { stopScanner } from './scanner';

interface CardData {
  id: number;
  store_name: string;
  barcode_data: string;
  format: string;
  color: string | null;
  photo_path: string | null;
  notes: string | null;
}

let wakeLock: WakeLockSentinel | null = null;
let currentCard: CardData | null = null;

async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
    } catch {
      // Wake lock not available
    }
  }
}

async function releaseWakeLock() {
  if (wakeLock) {
    try {
      await wakeLock.release();
    } catch {
      // ignore
    }
    wakeLock = null;
  }
}

export function getCurrentCard(): CardData | null {
  return currentCard;
}

export async function openBarcodeModal(cardId: number) {
  const res = await fetch(`/api/cards/${cardId}`);
  if (!res.ok) return;

  const card: CardData = await res.json();
  currentCard = card;

  // Populate view
  const nameEl = document.getElementById('barcode-store-name')!;
  nameEl.textContent = card.store_name;

  const renderArea = document.getElementById('barcode-render-area')!;
  await renderBarcode(renderArea, card.barcode_data, card.format);

  // Photo
  const photoEl = document.getElementById('barcode-photo') as HTMLImageElement;
  if (card.photo_path) {
    photoEl.src = `/api/cards/${card.id}/photo`;
    photoEl.style.display = 'block';
  } else {
    photoEl.style.display = 'none';
  }

  // Show view, hide edit
  document.getElementById('barcode-view')!.style.display = 'block';
  document.getElementById('barcode-edit')!.style.display = 'none';

  const modal = document.getElementById('barcode-modal')!;
  modal.classList.add('active');

  await requestWakeLock();
}

export async function closeBarcodeModal() {
  const modal = document.getElementById('barcode-modal')!;
  modal.classList.remove('active');
  currentCard = null;
  await releaseWakeLock();
}

export function closeAddModal() {
  const modal = document.getElementById('add-card-modal')!;
  modal.classList.remove('active');
  stopScanner();
}

export function openAddModal() {
  const modal = document.getElementById('add-card-modal')!;
  modal.classList.add('active');

  // Reset to manual tab
  switchTab('manual');
}

function switchTab(tab: string) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', (btn as HTMLElement).dataset.tab === tab);
  });
  (document.getElementById('tab-manual') as HTMLElement).style.display = tab === 'manual' ? 'block' : 'none';
  (document.getElementById('tab-scan') as HTMLElement).style.display = tab === 'scan' ? 'block' : 'none';

  if (tab !== 'scan') {
    stopScanner();
  }
}

export function initModals() {
  // Barcode modal
  document.getElementById('barcode-modal-close')!.addEventListener('click', closeBarcodeModal);
  document.getElementById('barcode-modal')!.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeBarcodeModal();
  });

  // Add modal
  document.getElementById('add-modal-close')!.addEventListener('click', closeAddModal);
  document.getElementById('add-card-modal')!.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeAddModal();
  });

  // FAB
  document.getElementById('fab-add')!.addEventListener('click', openAddModal);

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = (btn as HTMLElement).dataset.tab!;
      switchTab(tab);
    });
  });

  // Card tiles
  document.querySelectorAll('.card-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      const id = Number((tile as HTMLElement).dataset.cardId);
      openBarcodeModal(id);
    });
  });

  // Keyboard: Escape to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeBarcodeModal();
      closeAddModal();
    }
  });
}
