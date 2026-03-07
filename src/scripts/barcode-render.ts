import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

const QR_LIKE_FORMATS = ['QR_CODE', 'DATA_MATRIX'];

const FORMAT_MAP: Record<string, string> = {
  CODE128: 'CODE128',
  EAN13: 'EAN13',
  EAN8: 'EAN8',
  UPC_A: 'UPC',
  UPC_E: 'UPC',
  CODE39: 'CODE39',
  ITF: 'ITF14',
  CODABAR: 'codabar',
};

export async function renderBarcode(
  container: HTMLElement,
  data: string,
  format: string,
): Promise<void> {
  container.innerHTML = '';

  if (QR_LIKE_FORMATS.includes(format)) {
    const canvas = document.createElement('canvas');
    // Render at high res, CSS will scale
    await QRCode.toCanvas(canvas, data, {
      width: 600,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });
    canvas.style.width = '70vw';
    canvas.style.maxWidth = '400px';
    canvas.style.height = 'auto';
    container.appendChild(canvas);
  } else {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    container.appendChild(svg);
    const opts = {
      format: FORMAT_MAP[format] || 'CODE128',
      width: 2,
      height: 120,
      displayValue: false,
      margin: 10,
    };
    try {
      JsBarcode(svg, data, opts);
    } catch {
      JsBarcode(svg, data, { ...opts, format: 'CODE128' });
    }
    // Remove fixed dimensions so CSS can scale the SVG to fill width
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.style.width = '100%';
    svg.style.height = 'auto';
  }

  const valueDiv = document.createElement('div');
  valueDiv.className = 'barcode-value';
  valueDiv.textContent = data;
  container.appendChild(valueDiv);
}

/** Small barcode preview for card tiles */
export async function renderBarcodeSmall(
  container: HTMLElement,
  data: string,
  format: string,
): Promise<void> {
  container.innerHTML = '';

  if (QR_LIKE_FORMATS.includes(format)) {
    const canvas = document.createElement('canvas');
    await QRCode.toCanvas(canvas, data, {
      width: 36,
      margin: 0,
      color: { dark: '#000000', light: 'rgba(0,0,0,0)' },
    });
    container.appendChild(canvas);
  } else {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    container.appendChild(svg);
    try {
      JsBarcode(svg, data, {
        format: FORMAT_MAP[format] || 'CODE128',
        width: 1,
        height: 36,
        displayValue: false,
        margin: 0,
        background: 'transparent',
      });
    } catch {
      JsBarcode(svg, data, {
        format: 'CODE128',
        width: 1,
        height: 36,
        displayValue: false,
        margin: 0,
        background: 'transparent',
      });
    }
  }
}
