import { Html5Qrcode } from 'html5-qrcode';

let scanner: Html5Qrcode | null = null;

const FORMAT_NAME_MAP: Record<number, string> = {
  0: 'QR_CODE',
  1: 'AZTEC',
  2: 'CODABAR',
  3: 'CODE39',
  4: 'CODE93',
  5: 'CODE128',
  6: 'DATA_MATRIX',
  7: 'MAXICODE',
  8: 'ITF',
  9: 'EAN13',
  10: 'EAN8',
  11: 'PDF_417',
  12: 'RSS_14',
  13: 'RSS_EXPANDED',
  14: 'UPC_A',
  15: 'UPC_E',
  16: 'UPC_EAN_EXTENSION',
};

export async function startScanner(
  elementId: string,
  onScan: (data: string, format: string) => void,
): Promise<void> {
  await stopScanner();

  scanner = new Html5Qrcode(elementId);

  await scanner.start(
    { facingMode: 'environment' },
    {
      fps: 10,
      qrbox: { width: 250, height: 250 },
    },
    (decodedText, result) => {
      const formatNum = result.result.format?.format;
      const formatName = formatNum !== undefined ? (FORMAT_NAME_MAP[formatNum] || 'CODE128') : 'CODE128';
      onScan(decodedText, formatName);
    },
    () => {
      // ignore scan failures
    },
  );
}

export async function stopScanner(): Promise<void> {
  if (scanner) {
    try {
      await scanner.stop();
    } catch {
      // already stopped
    }
    scanner.clear();
    scanner = null;
  }
}

export async function scanImageFile(
  file: File,
): Promise<{ data: string; format: string }> {
  const html5Qrcode = new Html5Qrcode('scanner-file-tmp');
  try {
    const result = await html5Qrcode.scanFileV2(file, true);
    const formatNum = result.result.format?.format;
    const formatName = formatNum !== undefined ? (FORMAT_NAME_MAP[formatNum] || 'CODE128') : 'CODE128';
    return { data: result.decodedText, format: formatName };
  } finally {
    html5Qrcode.clear();
  }
}
