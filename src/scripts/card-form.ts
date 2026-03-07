import { closeBarcodeModal, closeAddModal, getActionSheetCardId, closeActionSheet } from './modal';
import { startScanner, stopScanner, scanImageFile } from './scanner';

const BASE = import.meta.env.BASE_URL;

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
  await fetch(`${BASE}api/cards/${cardId}/photo`, { method: 'POST', body: form });
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

    const res = await fetch(`${BASE}api/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeName, barcodeData, format, color, notes }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert('Failed to add card: ' + (err.error || res.status));
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

  // Show scan result helper
  function showScanResult(data: string, format: string) {
    const scanResult = document.getElementById('scan-result')!;
    (document.getElementById('scan-barcode-data') as HTMLInputElement).value = data;
    (document.getElementById('scan-format') as HTMLInputElement).value = format;
    scanResult.style.display = 'block';
  }

  // Scan method switcher (camera / image / clipboard)
  let activeScanMethod = 'camera';

  function switchScanMethod(method: string) {
    activeScanMethod = method;
    stopScanner();

    document.querySelectorAll('.scan-method-btn').forEach(btn => {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.scanMethod === method);
    });

    ['camera', 'image', 'clipboard'].forEach(m => {
      const el = document.getElementById(`scan-method-${m}`);
      if (el) el.style.display = m === method ? 'block' : 'none';
    });

    // Auto-start camera when switching to camera method
    if (method === 'camera') {
      startCameraScanner();
    }
  }

  async function startCameraScanner() {
    const scanResult = document.getElementById('scan-result')!;
    scanResult.style.display = 'none';
    try {
      await startScanner('scanner-reader', (data, format) => {
        stopScanner();
        showScanResult(data, format);
      });
    } catch {
      alert('Could not access camera. Make sure to allow camera permissions.');
    }
  }

  document.querySelectorAll('.scan-method-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchScanMethod((btn as HTMLElement).dataset.scanMethod!);
    });
  });

  // Scan tab (manual/scan top-level tabs)
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tab = (btn as HTMLElement).dataset.tab;
      if (tab === 'scan') {
        const scanResult = document.getElementById('scan-result')!;
        scanResult.style.display = 'none';
        switchScanMethod(activeScanMethod);
      }
    });
  });

  // Image file scanning
  const scanFileInput = document.getElementById('scan-file-input') as HTMLInputElement;
  const scanDropzone = document.getElementById('scan-dropzone')!;
  const scanFileStatus = document.getElementById('scan-file-status')!;
  const scanFilePreview = document.getElementById('scan-file-preview')!;
  const scanFileImg = document.getElementById('scan-file-img') as HTMLImageElement;

  async function handleImageFile(file: File) {
    scanFileStatus.textContent = 'Scanning image...';
    scanFileStatus.style.color = 'var(--text-secondary)';

    // Show preview
    const url = URL.createObjectURL(file);
    scanFileImg.src = url;
    scanFilePreview.style.display = 'block';

    try {
      const { data, format } = await scanImageFile(file);
      scanFileStatus.textContent = 'Barcode found!';
      scanFileStatus.style.color = 'var(--primary)';
      showScanResult(data, format);
    } catch {
      scanFileStatus.textContent = 'No barcode found in image. Try a clearer photo.';
      scanFileStatus.style.color = 'var(--danger)';
    }
  }

  scanFileInput.addEventListener('change', () => {
    if (scanFileInput.files?.[0]) {
      handleImageFile(scanFileInput.files[0]);
    }
  });

  // Drag and drop
  scanDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    scanDropzone.classList.add('drag-over');
  });
  scanDropzone.addEventListener('dragleave', () => {
    scanDropzone.classList.remove('drag-over');
  });
  scanDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    scanDropzone.classList.remove('drag-over');
    const file = (e as DragEvent).dataTransfer?.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageFile(file);
    }
  });

  // Clipboard scanning
  const scanPasteArea = document.getElementById('scan-paste-area')!;
  const scanPasteBtn = document.getElementById('scan-paste-btn')!;
  const scanClipboardStatus = document.getElementById('scan-clipboard-status')!;

  async function handleClipboardImage(blob: Blob) {
    scanClipboardStatus.textContent = 'Scanning image...';
    scanClipboardStatus.style.color = 'var(--text-secondary)';

    const file = new File([blob], 'clipboard.png', { type: blob.type });
    try {
      const { data, format } = await scanImageFile(file);
      scanClipboardStatus.textContent = 'Barcode found!';
      scanClipboardStatus.style.color = 'var(--primary)';
      showScanResult(data, format);
    } catch {
      scanClipboardStatus.textContent = 'No barcode found in image. Try a clearer image.';
      scanClipboardStatus.style.color = 'var(--danger)';
    }
  }

  // Paste event on the paste area
  scanPasteArea.addEventListener('paste', (e) => {
    const items = (e as ClipboardEvent).clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        if (blob) handleClipboardImage(blob);
        return;
      }
    }
    scanClipboardStatus.textContent = 'No image found in clipboard.';
    scanClipboardStatus.style.color = 'var(--danger)';
  });

  // Also listen for paste globally when clipboard tab is active
  document.addEventListener('paste', (e) => {
    if (activeScanMethod !== 'clipboard') return;
    const modal = document.getElementById('add-card-modal')!;
    if (!modal.classList.contains('active')) return;

    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        if (blob) handleClipboardImage(blob);
        return;
      }
    }
  });

  // Read from clipboard button (Clipboard API)
  scanPasteBtn.addEventListener('click', async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find(t => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          handleClipboardImage(blob);
          return;
        }
      }
      scanClipboardStatus.textContent = 'No image in clipboard. Copy an image first.';
      scanClipboardStatus.style.color = 'var(--danger)';
    } catch {
      scanClipboardStatus.textContent = 'Clipboard access denied. Try pasting with Ctrl+V instead.';
      scanClipboardStatus.style.color = 'var(--danger)';
    }
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

    const res = await fetch(`${BASE}api/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeName, barcodeData, format, color }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert('Failed to save card: ' + (err.error || res.status));
      return;
    }

    closeAddModal();
    window.location.reload();
  });

  setupColorSwatches('scan-color-options', 'scan-color');

  // Edit button — from action sheet, fetch card data then open edit form in modal
  document.getElementById('action-sheet-edit')!.addEventListener('click', async (e) => {
    e.stopPropagation();
    const id = getActionSheetCardId();
    if (!id) return;
    closeActionSheet();

    const res = await fetch(`${BASE}api/cards/${id}`);
    if (!res.ok) return;
    const card = await res.json();

    (document.getElementById('edit-card-id') as HTMLInputElement).value = String(card.id);
    (document.getElementById('edit-store-name') as HTMLInputElement).value = card.storeName;
    (document.getElementById('edit-barcode-data') as HTMLInputElement).value = card.barcodeData;
    (document.getElementById('edit-format') as HTMLSelectElement).value = card.format;
    (document.getElementById('edit-notes') as HTMLTextAreaElement).value = card.notes || '';
    (document.getElementById('edit-color') as HTMLInputElement).value = card.color || '#4a90d9';

    document.querySelectorAll('#edit-color-options .color-swatch').forEach(s => {
      s.classList.toggle('selected', (s as HTMLElement).dataset.color === (card.color || '#4a90d9'));
    });

    // Open the barcode modal in edit mode directly
    const modal = document.getElementById('barcode-modal')!;
    document.getElementById('barcode-view')!.style.display = 'none';
    document.getElementById('barcode-edit')!.style.display = 'block';
    document.getElementById('barcode-edit')!.classList.add('active');
    modal.classList.add('active');
  });

  function exitEditMode() {
    document.getElementById('barcode-edit')!.style.display = 'none';
    document.getElementById('barcode-edit')!.classList.remove('active');
    document.getElementById('barcode-view')!.style.display = '';
    closeBarcodeModal();
  }

  // Edit cancel / back
  document.getElementById('edit-cancel-btn')!.addEventListener('click', exitEditMode);
  document.getElementById('edit-back-btn')!.addEventListener('click', exitEditMode);

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

    const res = await fetch(`${BASE}api/cards/${id}`, {
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

  // Delete button — from action sheet
  document.getElementById('action-sheet-delete')!.addEventListener('click', async (e) => {
    e.stopPropagation();
    const id = getActionSheetCardId();
    if (!id) return;
    closeActionSheet();

    // Small delay to let action sheet close before confirm dialog
    await new Promise(r => setTimeout(r, 100));

    if (!confirm('Delete this card?')) return;

    const res = await fetch(`${BASE}api/cards/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      alert('Failed to delete card');
      return;
    }

    window.location.reload();
  });
}
