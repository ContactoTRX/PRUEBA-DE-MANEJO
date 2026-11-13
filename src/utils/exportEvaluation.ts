import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { PASSING_THRESHOLD, type DrivingEvaluation } from '../types/evaluation';

function sanitizeFilename(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
}

function formatDateEs(ms: number): string {
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(ms));
}

export function exportEvaluationToPdf(ev: DrivingEvaluation): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Header band (#002B5B Azul Marino + #800020 Vino Tinto underline)
  doc.setFillColor(0, 43, 91);
  doc.rect(0, 0, pageWidth, 26, 'F');
  doc.setFillColor(128, 0, 32);
  doc.rect(0, 26, pageWidth, 1.8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('ExamenVial — Acta de Evaluación Práctica', margin, 12.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `Fecha: ${formatDateEs(ev.createdAtMs)}   |   Evaluador: ${ev.evaluatorName}`,
    margin,
    20
  );

  // Candidate & Result Summary Box
  doc.setTextColor(26, 26, 30);
  doc.setDrawColor(215, 215, 220);
  doc.setFillColor(248, 247, 244);
  doc.roundedRect(margin, 33, pageWidth - margin * 2, 32, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(128, 0, 32);
  doc.text('DATOS DEL ASPIRANTE', margin + 4, 39.5);
  doc.text('RESULTADO FINAL', pageWidth - margin - 52, 39.5);

  doc.setTextColor(26, 26, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(ev.candidateName, margin + 4, 46);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Documento / Folio: ${ev.candidateDocument}`, margin + 4, 52);
  doc.text(
    `Categoría: ${ev.licenseCategory}${ev.vehiclePlate ? `   |   Placa: ${ev.vehiclePlate}` : ''}`,
    margin + 4,
    58
  );

  // Result numbers on right side of summary box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(0, 43, 91);
  doc.text(`${ev.percentage.toFixed(1)}%`, pageWidth - margin - 52, 47);

  doc.setFontSize(9);
  doc.setTextColor(26, 26, 30);
  doc.text(
    `${ev.earnedPoints} / ${ev.totalPoints} pts (Mín. ${PASSING_THRESHOLD}%)`,
    pageWidth - margin - 52,
    53
  );

  if (ev.passed) {
    doc.setTextColor(4, 120, 87);
    doc.text('VEREDICTO: APROBADO', pageWidth - margin - 52, 59.5);
  } else {
    doc.setTextColor(128, 0, 32);
    doc.text('VEREDICTO: REPROBADO', pageWidth - margin - 52, 59.5);
  }

  // Criteria Table
  const rows = ev.items.map((item, idx) => [
    String(idx + 1).padStart(2, '0'),
    item.section,
    item.title,
    `${item.points}`,
    item.result === 'correct' ? 'Correcto' : 'Incorrecto',
    item.result === 'correct' ? `${item.points}` : '0',
  ]);

  autoTable(doc, {
    startY: 71,
    margin: { left: margin, right: margin },
    head: [['#', 'Sección', 'Criterio evaluado', 'Valor', 'Calificación', 'Obtenido']],
    body: rows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 2.8,
      textColor: [26, 26, 30],
      lineColor: [220, 220, 225],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [0, 43, 91],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 38 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 14, halign: 'right' },
      4: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
      5: { cellWidth: 18, halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const text = String(data.cell.raw);
        if (text === 'Correcto') {
          data.cell.styles.textColor = [4, 120, 87];
          data.cell.styles.fillColor = [236, 253, 245];
        } else {
          data.cell.styles.textColor = [128, 0, 32];
          data.cell.styles.fillColor = [254, 242, 242];
        }
      }
    },
  });

  // Notes section after table
  const finalY =
    (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 75;

  if (ev.notes && ev.notes.trim().length > 0) {
    const notesStartY = finalY + 8;
    const pageHeight = doc.internal.pageSize.getHeight();
    if (notesStartY > pageHeight - 30) {
      doc.addPage();
    }
    const y = notesStartY > pageHeight - 30 ? 20 : notesStartY;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(128, 0, 32);
    doc.text('OBSERVACIONES DEL EVALUADOR', margin, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(26, 26, 30);
    const wrappedNotes = doc.splitTextToSize(ev.notes, pageWidth - margin * 2);
    doc.text(wrappedNotes, margin, y + 5.5);
  }

  const baseName = sanitizeFilename(
    `Evaluacion_${ev.candidateName}_${ev.candidateDocument}`
  );
  doc.save(`${baseName || 'Evaluacion_Manejo'}.pdf`);
}

export function exportEvaluationToExcel(ev: DrivingEvaluation): void {
  const wb = XLSX.utils.book_new();

  const correctCount = ev.items.filter((i) => i.result === 'correct').length;
  const incorrectCount = ev.items.length - correctCount;

  const sheetData: (string | number)[][] = [
    ['EXAMENVIAL — ACTA DE EVALUACIÓN PRÁCTICA DE MANEJO'],
    [],
    ['Aspirante', ev.candidateName, 'Documento / Folio', ev.candidateDocument],
    ['Categoría de Licencia', ev.licenseCategory, 'Placa del Vehículo', ev.vehiclePlate || 'No registrada'],
    ['Evaluador', ev.evaluatorName, 'Fecha de Evaluación', formatDateEs(ev.createdAtMs)],
    [
      'Puntos Obtenidos',
      `${ev.earnedPoints} / ${ev.totalPoints}`,
      'Porcentaje Final',
      `${ev.percentage.toFixed(1)}%`,
    ],
    [
      'Mínimo Aprobatorio',
      `${PASSING_THRESHOLD}%`,
      'Veredicto Final',
      ev.passed ? 'APROBADO' : 'REPROBADO',
    ],
    ['Criterios Correctos', correctCount, 'Criterios Incorrectos', incorrectCount],
    ['Observaciones', ev.notes || 'Sin observaciones'],
    [],
    ['#', 'Sección', 'Criterio Evaluado', 'Puntos Posibles', 'Calificación', 'Puntos Obtenidos'],
    ...ev.items.map((item, idx) => [
      idx + 1,
      item.section,
      item.title,
      item.points,
      item.result === 'correct' ? 'Correcto' : 'Incorrecto',
      item.result === 'correct' ? item.points : 0,
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  ws['!cols'] = [
    { wch: 22 },
    { wch: 32 },
    { wch: 52 },
    { wch: 20 },
    { wch: 16 },
    { wch: 18 },
  ];

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 8, c: 1 }, e: { r: 8, c: 5 } },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Evaluacion');

  const baseName = sanitizeFilename(
    `Evaluacion_${ev.candidateName}_${ev.candidateDocument}`
  );
  XLSX.writeFile(wb, `${baseName || 'Evaluacion_Manejo'}.xlsx`);
}
