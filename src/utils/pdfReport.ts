import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Anula animações/transições CSS no clone capturado — sem isso, elementos com
// fade-in (ex: linhas de tabela) podem ser fotografados em opacidade parcial.
function freezeAnimations(clonedDoc: Document) {
  const style = clonedDoc.createElement('style');
  style.textContent = `*, *::before, *::after {
    animation: none !important;
    transition: none !important;
    opacity: 1 !important;
  }
  .pdf-hide { visibility: hidden !important; }`;
  clonedDoc.head.appendChild(style);
}

export async function generatePdfFromNode(node: HTMLElement): Promise<jsPDF> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const margin = 15; // mm
  const innerWidth = pdfWidth - (margin * 2);

  // Seletores usados pelos relatórios individuais
  const selectors = [
    '.report-header',
    '.report-athlete-info',
    '.report-section'
  ];

  const elements = node.querySelectorAll(selectors.join(','));

  // ── Fallback: captura o node inteiro quando não há sub-elementos identificados
  if (elements.length === 0) {
    const canvas = await html2canvas(node, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: node.scrollWidth,
      windowHeight: node.scrollHeight,
      onclone: freezeAnimations,
    });

    const totalImgHeight = (canvas.height * innerWidth) / canvas.width;

    let yPosition = margin;
    let remainingHeight = totalImgHeight;
    let srcY = 0;

    while (remainingHeight > 0) {
      const availableHeight = pdfHeight - margin * 2;
      const sliceHeight = Math.min(remainingHeight, availableHeight);

      // Desenha apenas a fatia da imagem que cabe nesta página
      const sliceCanvas = document.createElement('canvas');
      const sliceScale = canvas.width / innerWidth;
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceHeight * sliceScale;

      const ctx = sliceCanvas.getContext('2d')!;
      ctx.drawImage(
        canvas,
        0, srcY * sliceScale,           // sx, sy
        canvas.width, sliceCanvas.height, // sWidth, sHeight
        0, 0,                            // dx, dy
        sliceCanvas.width, sliceCanvas.height // dWidth, dHeight
      );

      const sliceData = sliceCanvas.toDataURL('image/png');
      pdf.addImage(sliceData, 'PNG', margin, yPosition, innerWidth, sliceHeight);

      remainingHeight -= sliceHeight;
      srcY += sliceHeight;

      if (remainingHeight > 0) {
        pdf.addPage();
        yPosition = margin;
      }
    }

    return pdf;
  }

  // ── Fluxo original: captura elemento por elemento
  let yPosition = margin;

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i] as HTMLElement;

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      onclone: freezeAnimations,
    });

    const imgData = canvas.toDataURL('image/png');
    const imgHeight = (canvas.height * innerWidth) / canvas.width;

    // Se o elemento não couber na página atual, pula para a próxima
    if (yPosition + imgHeight > pdfHeight - margin) {
      pdf.addPage();
      yPosition = margin;
    }

    pdf.addImage(imgData, 'PNG', margin, yPosition, innerWidth, imgHeight);
    yPosition += imgHeight + 5; // 5mm de espaçamento entre seções
  }

  return pdf;
}

/**
 * Gera PDF de um relatório em formato de tabela, paginando entre linhas
 * (nunca corta uma <tr> no meio) e repetindo o cabeçalho da tabela em cada página.
 * Usado pelo relatório resumido de grupo (GroupSimplifiedReport).
 */
export async function generateTableReportPdf(
  node: HTMLElement,
  opts: { headerSelector?: string; tableSelector: string } = { tableSelector: 'table' }
): Promise<jsPDF> {
  const pdf = new jsPDF('l', 'mm', 'a4'); // paisagem: tabelas costumam ser largas
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const innerWidth = pdfWidth - margin * 2;

  const headerEl = opts.headerSelector
    ? (node.querySelector(opts.headerSelector) as HTMLElement | null)
    : null;
  const tableEl = node.querySelector(opts.tableSelector) as HTMLElement;
  const theadEl = tableEl.querySelector('thead') as HTMLElement;
  const bodyRows = Array.from(tableEl.querySelectorAll('tbody tr')) as HTMLElement[];

  const captureOpts = {
    scale: 3, // maior resolução: PDF será impresso em papel A4, precisa de nitidez
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: '#ffffff',
    onclone: freezeAnimations,
  };

  let yPosition = margin;

  if (headerEl) {
    const canvas = await html2canvas(headerEl, captureOpts);
    const imgHeight = (canvas.height * innerWidth) / canvas.width;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, yPosition, innerWidth, imgHeight);
    yPosition += imgHeight + 4;
  }

  const tableCanvas = await html2canvas(tableEl, captureOpts);
  const domToPdfScale = innerWidth / tableEl.offsetWidth; // mm por px de DOM
  const canvasPxPerDomPx = tableCanvas.width / tableEl.offsetWidth;

  const theadHeightPx = theadEl.offsetHeight * canvasPxPerDomPx;
  const theadHeightMm = theadEl.offsetHeight * domToPdfScale;

  const drawSlice = (srcYPx: number, heightPx: number, dstY: number, heightMm: number) => {
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = tableCanvas.width;
    sliceCanvas.height = heightPx;
    const ctx = sliceCanvas.getContext('2d')!;
    ctx.drawImage(tableCanvas, 0, srcYPx, tableCanvas.width, heightPx, 0, 0, tableCanvas.width, heightPx);
    pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', margin, dstY, innerWidth, heightMm);
  };

  drawSlice(0, theadHeightPx, yPosition, theadHeightMm);
  yPosition += theadHeightMm;

  let rowTopPx = theadHeightPx;
  for (const row of bodyRows) {
    const rowHeightPx = row.offsetHeight * canvasPxPerDomPx;
    const rowHeightMm = row.offsetHeight * domToPdfScale;

    if (yPosition + rowHeightMm > pdfHeight - margin) {
      pdf.addPage();
      yPosition = margin;
      drawSlice(0, theadHeightPx, yPosition, theadHeightMm);
      yPosition += theadHeightMm;
    }

    drawSlice(rowTopPx, rowHeightPx, yPosition, rowHeightMm);
    yPosition += rowHeightMm;
    rowTopPx += rowHeightPx;
  }

  return pdf;
}
