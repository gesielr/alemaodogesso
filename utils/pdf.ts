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

  // Removido fundo escuro conforme solicitacao
  // doc.setFillColor(15, 23, 42);
  // doc.rect(0, 0, pageWidth, 80, 'F');

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1.5);
  doc.line(40, 80, pageWidth - 40, 80); // Linha divisória solicitada

  const logo = await getBrandLogoDataUrl();
  let titleX = 40;

  if (logo) {
    doc.addImage(logo, 'PNG', 36, 18, 95, 40);
    titleX = 145;
  }

  doc.setTextColor(17, 24, 39); // Alterado para preto/escuro
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);

  // Se o titulo comecar com "Orcamento:", simplifica para apenas "Orçamento"
  const cleanTitle = title.startsWith('Orcamento:') || title.startsWith('Orçamento:') ? 'Orçamento' : title;
  doc.text(cleanTitle, titleX, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(subtitle, titleX, 58);

  doc.setTextColor(17, 24, 39);
  return { doc, startY: 105 };
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

