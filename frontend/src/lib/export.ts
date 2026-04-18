import { type Expense, type Group } from './contract';

const STROOPS_PER_XLM = 10_000_000;

/** Miktarı stroops'tan XLM string'e çevirir. */
function amountXlm(amount: number): string {
  return (amount / STROOPS_PER_XLM).toFixed(2);
}

/**
 * Export group expenses as CSV. Amounts in XLM.
 */
export function exportToCSV(group: Group, expenses: Expense[]) {
  const headers = ['ID', 'Açıklama', 'Ödeyen', 'Miktar (XLM)', 'Para Birimi', 'Kategori'];
  const rows = expenses.map(e => [
    e.id,
    `"${(e.description || '').replace(/"/g, '""')}"`,
    e.payer,
    amountXlm(e.amount),
    e.currency || group.currency || 'XLM',
    e.category || 'Genel'
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `stellarsplit_${group.name.replace(/\s+/g, '_')}_expenses.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Opens a print-friendly report window (user can Save as PDF from browser print).
 */
export function exportToPrintReport(group: Group, expenses: Expense[]) {
  const totalStroops = expenses.reduce((s, e) => s + e.amount, 0);
  const totalXlm = (totalStroops / STROOPS_PER_XLM).toFixed(2);
  const rows = expenses
    .slice()
    .reverse()
    .map(e => `
      <tr>
        <td>${e.id}</td>
        <td>${escapeHtml(e.description || '')}</td>
        <td><code>${escapeHtml(e.payer.slice(0, 8) + '…' + e.payer.slice(-4))}</code></td>
        <td>${amountXlm(e.amount)} XLM</td>
      </tr>`)
    .join('');

  const membersSection = group.members
    .map(m => `<li><code>${escapeHtml(m.slice(0, 12) + '…')}</code></li>`)
    .join('');

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <title>Birik — ${escapeHtml(group.name)}</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 24px; max-width: 800px; margin: 0 auto; color: #1a1a1a; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    .meta { color: #666; font-size: 0.875rem; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #eee; }
    th { font-weight: 600; color: #555; }
    code { font-size: 0.8em; }
    .total { font-weight: 700; margin-top: 16px; }
    ul { padding-left: 20px; }
    @media print { body { padding: 12px; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(group.name)}</h1>
  <p class="meta">Grup #${group.id} · ${expenses.length} harcama · Toplam ${totalXlm} XLM</p>
  <h2>Üyeler</h2>
  <ul>${membersSection}</ul>
  <h2>Harcamalar</h2>
  <table>
    <thead><tr><th>#</th><th>Açıklama</th><th>Ödeyen</th><th>Miktar</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="total">Toplam: ${totalXlm} XLM</p>
  <p class="meta" style="margin-top: 32px;">Birik · ${new Date().toLocaleString()}</p>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

/**
 * A4 — Professional Tax / Accounting Report
 * Generates a formatted PDF with monthly breakdown, category grouping,
 * per-member totals, and business expense flags.
 */
export function exportToTaxReport(
  group: Group,
  expenses: Expense[],
  members: string[],
  year?: number,
  companyName?: string,
): void {
  const reportYear = year ?? new Date().getFullYear();
  const title = `${group.name} — ${reportYear} Vergi Raporu`;

  // Filter to year
  const yearExpenses = expenses.filter(e => {
    const createdAt = (e as Record<string, unknown>).created_at;
    if (!createdAt) return true; // include all if no date
    return new Date(createdAt as string).getFullYear() === reportYear;
  });

  // Monthly breakdown
  const monthly: Record<string, number> = {};
  for (let m = 1; m <= 12; m++) {
    monthly[String(m).padStart(2, '0')] = 0;
  }
  yearExpenses.forEach(e => {
    const createdAt = (e as Record<string, unknown>).created_at;
    if (createdAt) {
      const month = new Date(createdAt as string).toISOString().slice(5, 7);
      monthly[month] = (monthly[month] || 0) + (e.amount / 10_000_000);
    }
  });

  // Category breakdown
  const byCat: Record<string, number> = {};
  yearExpenses.forEach(e => {
    const cat = e.category || 'other';
    byCat[cat] = (byCat[cat] || 0) + (e.amount / 10_000_000);
  });

  // Per-member totals
  const byMember: Record<string, number> = {};
  members.forEach(m => { byMember[m] = 0; });
  yearExpenses.forEach(e => {
    byMember[e.payer] = (byMember[e.payer] || 0) + (e.amount / 10_000_000);
  });

  const totalAmount = yearExpenses.reduce((s, e) => s + e.amount / 10_000_000, 0);

  // Build CSV content
  const lines: string[] = [];

  // Header
  if (companyName) lines.push(`Şirket / İşletme: ${companyName}`);
  lines.push(`Rapor: ${title}`);
  lines.push(`Oluşturulma: ${new Date().toLocaleDateString('tr-TR')}`);
  lines.push(`Toplam Harcama: ${totalAmount.toFixed(4)} XLM`);
  lines.push(`Harcama Sayısı: ${yearExpenses.length}`);
  lines.push('');

  // Monthly breakdown
  lines.push('=== AYLIK ÖZET ===');
  lines.push('Ay,Tutar (XLM)');
  const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  Object.entries(monthly).forEach(([m, amt]) => {
    lines.push(`${monthNames[parseInt(m) - 1]},${amt.toFixed(4)}`);
  });
  lines.push('');

  // Category breakdown
  lines.push('=== KATEGORİ DAĞILIMI ===');
  lines.push('Kategori,Tutar (XLM),Yüzde');
  Object.entries(byCat).sort(([,a],[,b]) => b - a).forEach(([cat, amt]) => {
    const pct = totalAmount > 0 ? ((amt / totalAmount) * 100).toFixed(1) : '0.0';
    lines.push(`${cat},${amt.toFixed(4)},${pct}%`);
  });
  lines.push('');

  // Per-member
  lines.push('=== KİŞİ BAZLI TOPLAM ===');
  lines.push('Cüzdan,Ödenen (XLM),Oran');
  Object.entries(byMember).sort(([,a],[,b]) => b - a).forEach(([addr, amt]) => {
    const pct = totalAmount > 0 ? ((amt / totalAmount) * 100).toFixed(1) : '0.0';
    lines.push(`${addr},${amt.toFixed(4)},${pct}%`);
  });
  lines.push('');

  // Expense detail
  lines.push('=== HARCAMA DETAYI ===');
  lines.push('ID,Açıklama,Kategori,Tutar (XLM),Ödeyen,Tarih,İş Gideri');
  const businessCats = ['accommodation', 'transport', 'food'];
  yearExpenses.forEach(e => {
    const createdAt = (e as Record<string, unknown>).created_at;
    const dateStr = createdAt ? new Date(createdAt as string).toLocaleDateString('tr-TR') : '-';
    const isBusiness = businessCats.includes(e.category || '') ? 'Evet' : 'Hayır';
    const desc = e.description.replace(/,/g, ';');
    lines.push(`${e.id},"${desc}",${e.category || 'other'},${(e.amount / 10_000_000).toFixed(4)},${e.payer},${dateStr},${isBusiness}`);
  });

  const csv = lines.join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${group.name.replace(/\s+/g, '_')}_vergi_raporu_${reportYear}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Renders a specific DOM element to canvas and downloads it as a PDF.
 * Perfect for preserving the beautifully styled "Wow-Factor" UI!
 */
export async function exportToPDF(group: Group, elementId: string) {
  try {
    const { default: html2canvas } = await import('html2canvas');
    const { jsPDF } = await import('jspdf');

    const element = document.getElementById(elementId);
    if (!element) {
      console.error('Element not found:', elementId);
      return;
    }

    // Slightly scale down to fit nicely or scale up for quality
    const canvas = await html2canvas(element, { 
      scale: 2,
      useCORS: true, 
      backgroundColor: '#09090b', // match dark theme bg
    });
    
    const imgData = canvas.toDataURL('image/png');
    
    // A4 dimensions setup
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    // Padding in mm
    const padding = 10;
    const innerWidth = pdfWidth - padding * 2;
    
    const imgProps = pdf.getImageProperties(imgData);
    const pdfHeight = (imgProps.height * innerWidth) / imgProps.width;
    
    // Header for the PDF
    pdf.setFontSize(16);
    pdf.text(`Birik - ${group.name} Raporu`, padding, padding + 5);
    pdf.setFontSize(10);
    pdf.setTextColor(150);
    pdf.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')} | Grup ID: #${group.id}`, padding, padding + 12);
    
    // Add the UI snapshot
    pdf.addImage(imgData, 'PNG', padding, padding + 20, innerWidth, pdfHeight);
    
    // Footer
    pdf.setFontSize(8);
    pdf.text('Birik Decentralized Expense Sharing', padding, 297 - padding); // A4 height is 297mm

    pdf.save(`Birik_${group.name.replace(/\s+/g, '_')}_Rapor.pdf`);
  } catch (error) {
    console.error('PDF export failed:', error);
  }
}
