// Barcode format constants
// Maps html5-qrcode format names to JsBarcode format names
export const BARCODE_FORMATS = [
  { value: 'CODE128', label: 'Code 128' },
  { value: 'EAN13', label: 'EAN-13' },
  { value: 'EAN8', label: 'EAN-8' },
  { value: 'UPC_A', label: 'UPC-A' },
  { value: 'UPC_E', label: 'UPC-E' },
  { value: 'CODE39', label: 'Code 39' },
  { value: 'ITF', label: 'ITF' },
  { value: 'CODABAR', label: 'Codabar' },
  { value: 'QR_CODE', label: 'QR Code' },
  { value: 'DATA_MATRIX', label: 'Data Matrix' },
] as const;

export type BarcodeFormat = typeof BARCODE_FORMATS[number]['value'];

// Map html5-qrcode detected formats to our format values
export function normalizeFormat(detected: string): BarcodeFormat {
  const map: Record<string, BarcodeFormat> = {
    'QR_CODE': 'QR_CODE',
    'DATA_MATRIX': 'DATA_MATRIX',
    'EAN_13': 'EAN13',
    'EAN_8': 'EAN8',
    'UPC_A': 'UPC_A',
    'UPC_E': 'UPC_E',
    'CODE_128': 'CODE128',
    'CODE_39': 'CODE39',
    'CODABAR': 'CODABAR',
    'ITF': 'ITF',
    // Also handle already-normalized values
    'EAN13': 'EAN13',
    'EAN8': 'EAN8',
    'CODE128': 'CODE128',
    'CODE39': 'CODE39',
  };
  return map[detected] || 'CODE128';
}

// Map our format to JsBarcode format name
export function toJsBarcodeFormat(format: BarcodeFormat): string {
  const map: Record<string, string> = {
    'CODE128': 'CODE128',
    'EAN13': 'EAN13',
    'EAN8': 'EAN8',
    'UPC_A': 'UPC',
    'UPC_E': 'UPC',
    'CODE39': 'CODE39',
    'ITF': 'ITF',
    'CODABAR': 'codabar',
  };
  return map[format] || 'CODE128';
}

export function isQrLike(format: string): boolean {
  return format === 'QR_CODE' || format === 'DATA_MATRIX';
}
