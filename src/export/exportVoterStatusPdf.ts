import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Project, Voter } from '../types';
import { buildExportRows, summarizeByStatus } from './buildExportRows';

const PAGE_MARGIN = 40;
const SITE_URL = 'https://hellofellowvoter.com';
const LINK_COLOR: [number, number, number] = [37, 99, 235];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'project';
}

/** Local-time YYYY-MM-DD, to match the "Generated on" date shown in the PDF body. */
function localDateStamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function exportVoterStatusPdf(project: Project, voters: Voter[]): void {
  const now = new Date();
  const doc = new jsPDF({ unit: 'pt' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const textWidth = pageWidth - PAGE_MARGIN * 2;

  doc.setFontSize(16);
  doc.text(`${project.name} — Voter Contact Status`, PAGE_MARGIN, PAGE_MARGIN);

  doc.setFontSize(10);

  const attributionY = PAGE_MARGIN + 24;
  const attributionPrefix = 'This document was generated with ';
  const linkText = 'HelloFellowVoter.com';

  doc.setTextColor(0, 0, 0);
  doc.text(attributionPrefix, PAGE_MARGIN, attributionY);
  const linkX = PAGE_MARGIN + doc.getTextWidth(attributionPrefix);
  const linkWidth = doc.getTextWidth(linkText);

  doc.setTextColor(...LINK_COLOR);
  doc.textWithLink(linkText, linkX, attributionY, { url: SITE_URL });
  doc.setDrawColor(...LINK_COLOR);
  doc.setLineWidth(0.5);
  doc.line(linkX, attributionY + 1.5, linkX + linkWidth, attributionY + 1.5);

  doc.setTextColor(0, 0, 0);
  doc.text('.', linkX + linkWidth, attributionY);

  const explanation = doc.splitTextToSize(
    `It lists the voters in the "${project.name}" list along with their current contact status, ` +
      `so the organization that provided this list can see which voters were actually contacted.`,
    textWidth,
  );
  doc.text(explanation, PAGE_MARGIN, attributionY + 16);
  const introBottom = attributionY + 16 + explanation.length * 12;

  const generatedOn = `Generated on ${now.toLocaleDateString()}`;
  doc.text(generatedOn, PAGE_MARGIN, introBottom + 16);
  doc.text(summarizeByStatus(voters), PAGE_MARGIN, introBottom + 32);

  autoTable(doc, {
    startY: introBottom + 48,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    head: [['Name', 'Street', 'City', 'State', 'ZIP', 'Status']],
    body: buildExportRows(voters).map((row) => [row.name, row.street, row.city, row.state, row.zip, row.status]),
  });

  doc.save(`${slugify(project.name)}-voter-status-${localDateStamp(now)}.pdf`);
}
