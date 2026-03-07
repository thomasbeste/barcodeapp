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
    await QRCode.toCanvas(canvas, data, {
      width: 280,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });
    container.appendChild(canvas);
  } else {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    container.appendChild(svg);
    try {
      JsBarcode(svg, data, {
        format: FORMAT_MAP[format] || 'CODE128',
        width: 2,
        height: 100,
        displayValue: true,
        fontSize: 14,
        margin: 10,
      });
    } catch {
      // Fallback to CODE128 if format fails
      JsBarcode(svg, data, {
        format: 'CODE128',
        width: 2,
        height: 100,
        displayValue: true,
        fontSize: 14,
        margin: 10,
      });
    }
  }

  const valueDiv = document.createElement('div');
  valueDiv.className = 'barcode-value';
  valueDiv.textContent = data;
  container.appendChild(valueDiv);
}
