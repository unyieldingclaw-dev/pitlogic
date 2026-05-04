import html2canvas from 'html2canvas';

export async function captureShareCard(elementId) {
  const el = document.getElementById(elementId);
  if (!el) throw new Error('Share card element not found');
  const canvas = await html2canvas(el, {
    backgroundColor: '#141410',
    scale: 2,
    useCORS: true,
    logging: false,
  });
  return canvas;
}

export function downloadCanvas(canvas, filename = 'rfx-cook.png') {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export async function copyCanvasToClipboard(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) { reject(new Error('Canvas to blob failed')); return; }
      navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        .then(resolve).catch(reject);
    }, 'image/png');
  });
}

export function svgToDataUrl(containerEl) {
  if (!containerEl) return null;
  const svg = containerEl.querySelector('svg');
  if (!svg) return null;
  const svgStr = new XMLSerializer().serializeToString(svg);
  return 'data:image/svg+xml;base64,' + btoa(encodeURIComponent(svgStr).replace(/%([0-9A-F]{2})/gi, (_, p) => String.fromCharCode(parseInt(p, 16))));
}
