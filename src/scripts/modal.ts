import { renderBarcode } from './barcode-render';
import { stopScanner } from './scanner';

const BASE = import.meta.env.BASE_URL;

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
  const res = await fetch(`${BASE}api/cards/${cardId}`);
  if (!res.ok) return;

  const card: CardData = await res.json();
  currentCard = card;

  const modal = document.getElementById('barcode-modal')!;

  // Populate header
  const nameEl = document.getElementById('barcode-store-name')!;
  nameEl.textContent = card.store_name;

  // Set header color
  if (card.color) {
    nameEl.style.color = card.color;
  } else {
    nameEl.style.color = '';
  }

  // Render large barcode
  const renderArea = document.getElementById('barcode-render-area')!;
  await renderBarcode(renderArea, card.barcode_data, card.format);

  // Photo
  const photoEl = document.getElementById('barcode-photo') as HTMLImageElement;
  if (card.photo_path) {
    photoEl.src = `${BASE}api/cards/${card.id}/photo`;
    photoEl.style.display = 'block';
  } else {
    photoEl.style.display = 'none';
  }

  // Show view, hide edit
  document.getElementById('barcode-view')!.style.display = '';
  document.getElementById('barcode-edit')!.style.display = 'none';
  document.getElementById('barcode-edit')!.classList.remove('active');
  (document.querySelector('.barcode-fullscreen-footer') as HTMLElement).style.display = '';

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
  // Barcode fullscreen close
  document.getElementById('barcode-modal-close')!.addEventListener('click', closeBarcodeModal);

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

  // Card tiles — tap to open full-screen barcode
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
