import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import brandLogo from '../src/assets/Gemini_Generated_Image_l0vw5al0vw5al0vw23-removebg-preview.png';

let cachedLogoDataUrl: string | null | undefined;

const readImageAsDataUrl = (src: string) =>
  new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth || image.width;
      canvas.height = image.naturalHeight || image.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Falha ao gerar contexto para logo.'));
        return;
      }
      ctx.drawImage(image, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    image.onerror = () => reject(new Error('Falha ao carregar logo para PDF.'));
    image.src = src;
  });

export const getBrandLogoDataUrl = async () => {
  if (cachedLogoDataUrl !== undefined) return cachedLogoDataUrl;
  try {
    cachedLogoDataUrl = await readImageAsDataUrl(brandLogo);
  } catch (error) {
    console.warn('[pdf] Logo nao carregada:', error);
    cachedLogoDataUrl = null;
  }
  return cachedLogoDataUrl;
};

export const createBasePdf = async (title: string, subtitle: string) => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  const logo = await getBrandLogoDataUrl();
  let currentY = 40;

  if (logo) {
    // Logo centralizado no topo
    const logoWidth = 120;
    const logoHeight = 50;
    doc.addImage(logo, 'PNG', (pageWidth - logoWidth) / 2, 20, logoWidth, logoHeight);
    currentY = 85;
  }

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.line(40, currentY, pageWidth - 40, currentY);

  doc.setTextColor(17, 24, 39);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  
  const cleanTitle = title.startsWith('Orcamento:') || title.startsWith('Orçamento:') ? 'Orçamento' : title;
  const titleWidth = doc.getTextWidth(cleanTitle);
  doc.text(cleanTitle, (pageWidth - titleWidth) / 2, currentY + 30);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  const subtitleWidth = doc.getTextWidth(subtitle);
  doc.text(subtitle, (pageWidth - subtitleWidth) / 2, currentY + 48);

  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(2);
  doc.line((pageWidth - 40) / 2 - 20, currentY + 58, (pageWidth - 40) / 2 + 60, currentY + 58);

  return { doc, startY: currentY + 85 };
};

export const addStyledTable = (
  doc: jsPDF,
  headers: string[],
  rows: Array<Array<string | number>>,
  startY: number
) => {
  autoTable(doc, {
    startY,
    head: [headers],
    body: rows.map((row) => row.map((cell) => (typeof cell === 'number' ? String(cell) : cell))),
    styles: {
      fontSize: 9,
      cellPadding: 6,
      lineColor: [226, 232, 240],
      lineWidth: 0.4
    },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  const tableState = (doc as any).lastAutoTable;
  return tableState?.finalY ?? startY;
};

export const sanitizePdfFilename = (fileName: string) =>
  fileName
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

export const downloadBlob = (blob: Blob, fileName: string) => {
  const link = document.createElement('a');
  const blobUrl = URL.createObjectURL(blob);
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
};

