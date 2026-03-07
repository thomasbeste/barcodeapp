import { openBarcodeModal, closeBarcodeModal, closeAddModal, getCurrentCard } from './modal';
import { startScanner, stopScanner } from './scanner';

function setupColorSwatches(containerId: string, inputId: string) {
  const container = document.getElementById(containerId)!;
  const input = document.getElementById(inputId) as HTMLInputElement;

  container.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      container.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      swatch.classList.add('selected');
      input.value = (swatch as HTMLElement).dataset.color!;
    });
  });

  // Select first by default
  const first = container.querySelector('.color-swatch');
  if (first) {
    first.classList.add('selected');
  }
}

async function resizeImage(file: File, maxWidth = 800): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => resolve(blob!),
        'image/jpeg',
        0.85,
      );
    };
    img.src = url;
  });
}

async function uploadPhoto(cardId: number, file: File) {
  const resized = await resizeImage(file);
  const form = new FormData();
  form.append('photo', resized, 'photo.jpg');
  await fetch(`/api/cards/${cardId}/photo`, { method: 'POST', body: form });
}

export function initForms() {
  setupColorSwatches('add-color-options', 'add-color');
  setupColorSwatches('edit-color-options', 'edit-color');

  // Add card form
  const addForm = document.getElementById('add-card-form') as HTMLFormElement;
  addForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const storeName = (document.getElementById('add-store-name') as HTMLInputElement).value.trim();
    const barcodeData = (document.getElementById('add-barcode-data') as HTMLInputElement).value.trim();
    const format = (document.getElementById('add-format') as HTMLSelectElement).value;
    const color = (document.getElementById('add-color') as HTMLInputElement).value;
    const notes = (document.getElementById('add-notes') as HTMLTextAreaElement).value.trim();

    const res = await fetch('/api/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeName, barcodeData, format, color, notes }),
    });

    if (!res.ok) {
      alert('Failed to add card');
      return;
    }

    const card = await res.json();

    // Upload photo if selected
    const photoInput = document.getElementById('add-photo') as HTMLInputElement;
    if (photoInput.files?.[0]) {
      await uploadPhoto(card.id, photoInput.files[0]);
    }

    closeAddModal();
    window.location.reload();
  });

  // Scan tab
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tab = (btn as HTMLElement).dataset.tab;
      if (tab === 'scan') {
        const scanResult = document.getElementById('scan-result')!;
        scanResult.style.display = 'none';

        try {
          await startScanner('scanner-reader', (data, format) => {
            stopScanner();
            (document.getElementById('scan-barcode-data') as HTMLInputElement).value = data;
            (document.getElementById('scan-format') as HTMLInputElement).value = format;
            scanResult.style.display = 'block';
          });
        } catch {
          alert('Could not access camera. Make sure to allow camera permissions.');
        }
      }
    });
  });

  // Scan save button
  document.getElementById('scan-save-btn')!.addEventListener('click', async () => {
    const storeName = (document.getElementById('scan-store-name') as HTMLInputElement).value.trim();
    if (!storeName) {
      alert('Please enter a store name');
      return;
    }

    const barcodeData = (document.getElementById('scan-barcode-data') as HTMLInputElement).value;
    const format = (document.getElementById('scan-format') as HTMLInputElement).value;
    const color = (document.getElementById('scan-color') as HTMLInputElement).value;

    const res = await fetch('/api/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeName, barcodeData, format, color }),
    });

    if (!res.ok) {
      alert('Failed to save card');
      return;
    }

    closeAddModal();
    window.location.reload();
  });

  setupColorSwatches('scan-color-options', 'scan-color');

  // Edit button
  document.getElementById('barcode-edit-btn')!.addEventListener('click', () => {
    const card = getCurrentCard();
    if (!card) return;

    // Populate edit form
    (document.getElementById('edit-card-id') as HTMLInputElement).value = String(card.id);
    (document.getElementById('edit-store-name') as HTMLInputElement).value = card.store_name;
    (document.getElementById('edit-barcode-data') as HTMLInputElement).value = card.barcode_data;
    (document.getElementById('edit-format') as HTMLSelectElement).value = card.format;
    (document.getElementById('edit-notes') as HTMLTextAreaElement).value = card.notes || '';
    (document.getElementById('edit-color') as HTMLInputElement).value = card.color || '#4a90d9';

    // Highlight correct color swatch
    document.querySelectorAll('#edit-color-options .color-swatch').forEach(s => {
      s.classList.toggle('selected', (s as HTMLElement).dataset.color === (card.color || '#4a90d9'));
    });

    document.getElementById('barcode-view')!.style.display = 'none';
    document.getElementById('barcode-edit')!.style.display = 'block';
    document.getElementById('barcode-edit')!.classList.add('active');
  });

  // Edit cancel / back
  document.getElementById('edit-cancel-btn')!.addEventListener('click', () => {
    document.getElementById('barcode-edit')!.style.display = 'none';
    document.getElementById('barcode-edit')!.classList.remove('active');
    document.getElementById('barcode-view')!.style.display = 'block';
  });

  document.getElementById('edit-back-btn')!.addEventListener('click', () => {
    document.getElementById('barcode-edit')!.style.display = 'none';
    document.getElementById('barcode-edit')!.classList.remove('active');
    document.getElementById('barcode-view')!.style.display = 'block';
  });

  // Edit form submit
  const editForm = document.getElementById('edit-card-form') as HTMLFormElement;
  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = (document.getElementById('edit-card-id') as HTMLInputElement).value;
    const storeName = (document.getElementById('edit-store-name') as HTMLInputElement).value.trim();
    const barcodeData = (document.getElementById('edit-barcode-data') as HTMLInputElement).value.trim();
    const format = (document.getElementById('edit-format') as HTMLSelectElement).value;
    const color = (document.getElementById('edit-color') as HTMLInputElement).value;
    const notes = (document.getElementById('edit-notes') as HTMLTextAreaElement).value.trim();

    const res = await fetch(`/api/cards/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeName, barcodeData, format, color, notes }),
    });

    if (!res.ok) {
      alert('Failed to update card');
      return;
    }

    // Upload photo if selected
    const photoInput = document.getElementById('edit-photo') as HTMLInputElement;
    if (photoInput.files?.[0]) {
      await uploadPhoto(Number(id), photoInput.files[0]);
    }

    closeBarcodeModal();
    window.location.reload();
  });

  // Delete button
  document.getElementById('barcode-delete-btn')!.addEventListener('click', async () => {
    const card = getCurrentCard();
    if (!card) return;

    if (!confirm(`Delete "${card.store_name}"?`)) return;

    const res = await fetch(`/api/cards/${card.id}`, { method: 'DELETE' });
    if (!res.ok) {
      alert('Failed to delete card');
      return;
    }

    closeBarcodeModal();
    window.location.reload();
  });
}
