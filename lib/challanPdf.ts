import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ChallanCompany {
  name: string;
  gstin?: string;
  address?: string;
  phone?: string;   // optional — not yet in DB schema
}

export interface ChallanVendor {
  name: string;
  gstin?: string;
  address?: string;
}

export interface InboundChallanData {
  challan_no: string;
  challan_date: string;
  eway_bill_no?: string;
  nature_of_processing?: string;
  reference_no?: string;
}

export interface OutboundChallanData {
  dc_no: string;
  dc_date: string;
  vehicle_no?: string;
  eway_bill_no?: string;
  party_dc_no?: string;
  order_no?: string;
}

export interface InboundItem {
  item_desc: string;
  hsn_code?: string;
  quantity_kg?: number;
  rate_per_kg?: number;
  amount?: number;
}

export interface OutboundItem {
  item_desc: string;
  hsn_code?: string;
  quantity?: number;
  value?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function esc(s?: string | null): string {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtAmt(n?: number | null): string {
  if (!n) return '';
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function stateCode(gstin?: string): string {
  return gstin?.slice(0, 2) ?? '';
}

// Add blank rows to fill out the items table (looks like a real printed challan)
const BLANK_ROWS = 8;

// ─── Shared CSS ──────────────────────────────────────────────────────────────

const CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; }
  .wrap { border: 2px solid #1a237e; margin: 6px; }

  /* ── Company Header ── */
  .hdr { border-bottom: 2px solid #1a237e; padding: 6px 10px 8px; }
  .hdr-top { display: flex; justify-content: space-between; font-size: 10px; font-weight: 600; color: #1a237e; margin-bottom: 2px; }
  .hdr-phone { text-align: right; }
  .co-name { text-align: center; font-size: 22px; font-weight: 900; color: #1a237e; letter-spacing: 1px; line-height: 1.2; }
  .co-addr { text-align: center; font-size: 11px; margin-top: 3px; }

  /* ── Body (To + DC details) ── */
  .body { display: flex; border-bottom: 1px solid #1a237e; }
  .body-left  { flex: 1; padding: 6px 10px; border-right: 1px solid #1a237e; }
  .body-right { width: 210px; padding: 6px 10px; }

  .dc-badge {
    display: inline-block; border: 1.5px solid #1a237e;
    font-weight: 700; font-size: 12px; padding: 3px 10px;
    letter-spacing: 0.5px; margin-bottom: 8px; width: 100%; text-align: center;
  }
  .dc-no-row { display: flex; align-items: baseline; gap: 6px; margin-bottom: 6px; }
  .dc-no-lbl { font-size: 11px; }
  .dc-no-val { font-size: 22px; font-weight: 900; color: #1a237e; }

  .frow { display: flex; border-bottom: 1px dotted #aaa; margin-bottom: 5px; padding-bottom: 2px; min-height: 18px; }
  .frow-split { display: flex; gap: 0; margin-bottom: 5px; }
  .frow-split .frow { flex: 1; margin-bottom: 0; }
  .fl  { font-size: 10px; white-space: nowrap; min-width: 90px; }
  .fv  { font-size: 11px; font-weight: 600; flex: 1; padding-left: 4px; }

  /* ── Items Table ── */
  table { width: 100%; border-collapse: collapse; }
  th { border: 1px solid #1a237e; padding: 5px 6px; font-size: 10px; font-weight: 700; text-align: center; background: #f0f0f0; }
  td { border: 1px solid #1a237e; padding: 4px 6px; font-size: 11px; height: 22px; vertical-align: middle; }
  .c { text-align: center; }
  .r { text-align: right; }
  .total-row td { font-weight: 700; background: #f9f9f9; }

  /* ── Table footer ── */
  .tfoot { display: flex; border-top: 1px solid #1a237e; }
  .tfoot-l { flex: 1; padding: 6px 10px; font-size: 10px; font-style: italic; color: #555; border-right: 1px solid #1a237e; display: flex; align-items: flex-end; }
  .tfoot-r { width: 210px; padding: 6px 10px; font-size: 11px; font-weight: 700; text-align: center; display: flex; align-items: flex-start; }

  /* ── Signature row ── */
  .sig-row { display: flex; }
  .sig-l { flex: 1; padding: 8px 10px; border-right: 1px solid #1a237e; }
  .sig-r { width: 210px; padding: 8px 10px; text-align: center; }
  .sig-label { font-size: 11px; }
  .sig-line  { margin-top: 28px; font-size: 11px; font-weight: 700; border-top: 1px solid #555; padding-top: 4px; }

  @media print {
    @page { margin: 5mm; size: A4 portrait; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

// ─── Outbound Challan — matches physical Mold Tech format ────────────────────

export function buildOutboundHTML(
  dc: OutboundChallanData,
  client: ChallanVendor,
  items: OutboundItem[],
  company: ChallanCompany,
): string {
  const totalQty = items.reduce((s, i) => s + (i.quantity ?? 0), 0);
  const totalVal = items.reduce((s, i) => s + (i.value ?? 0), 0);

  // Item rows
  const itemRows = items.map((item, i) => `
    <tr>
      <td class="c">${i + 1}</td>
      <td>${esc(item.item_desc)}</td>
      <td class="c">${esc(item.hsn_code)}</td>
      <td class="c">${item.quantity ? `${item.quantity.toLocaleString('en-IN')} pcs` : ''}</td>
      <td class="r">${item.value ? `₹${fmtAmt(item.value)}` : ''}</td>
    </tr>`).join('');

  // Blank filler rows
  const blanks = Array(Math.max(0, BLANK_ROWS - items.length))
    .fill('<tr><td class="c"></td><td></td><td class="c"></td><td class="c"></td><td class="r"></td></tr>')
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Delivery Challan — DC #${esc(dc.dc_no)}</title>
  <style>${CSS}</style>
</head>
<body>
<div class="wrap">

  <!-- ── Company Header ── -->
  <div class="hdr">
    <div class="hdr-top">
      <div>
        GSTIN : ${esc(company.gstin)}<br>
        ${stateCode(company.gstin) ? `State code : ${stateCode(company.gstin)}` : ''}
      </div>
      ${company.phone ? `<div class="hdr-phone">Mobile : ${esc(company.phone)}</div>` : '<div></div>'}
    </div>
    <div class="co-name">${esc(company.name)}</div>
    ${company.address ? `<div class="co-addr">${esc(company.address)}</div>` : ''}
  </div>

  <!-- ── To / DC Details ── -->
  <div class="body">
    <div class="body-left">
      <div class="frow">
        <span class="fl">To</span>
        <span class="fv">M/s. ${esc(client.name)}</span>
      </div>
      <div class="frow">
        <span class="fl"></span>
        <span class="fv">${esc(client.address)}</span>
      </div>
      <div class="frow">
        <span class="fl">Party's GSTIN</span>
        <span class="fv">${esc(client.gstin)}</span>
      </div>
      <div class="frow-split">
        <div class="frow" style="flex:1; border-bottom: 1px dotted #aaa; margin-bottom:5px; padding-bottom:2px;">
          <span class="fl">Party's D.C. No. &amp; Dt.</span>
          <span class="fv">${esc(dc.party_dc_no)}</span>
        </div>
      </div>
      <div class="frow">
        <span class="fl">E-Way Bill No.</span>
        <span class="fv">${esc(dc.eway_bill_no)}</span>
      </div>
    </div>

    <div class="body-right">
      <div class="dc-badge">DELIVERY CHALLAN</div>
      <div class="dc-no-row">
        <span class="dc-no-lbl">No.</span>
        <span class="dc-no-val">${esc(dc.dc_no)}</span>
      </div>
      <div class="frow">
        <span class="fl">Date :</span>
        <span class="fv">${esc(dc.dc_date)}</span>
      </div>
      <div class="frow">
        <span class="fl">Order No. &amp; Dt.</span>
        <span class="fv">${esc(dc.order_no)}</span>
      </div>
      <div class="frow">
        <span class="fl">Vehicle No.</span>
        <span class="fv">${esc(dc.vehicle_no)}</span>
      </div>
    </div>
  </div>

  <!-- ── Items Table ── -->
  <table>
    <thead>
      <tr>
        <th style="width:40px">S.No.</th>
        <th>Description of Goods</th>
        <th style="width:80px">HSN Code</th>
        <th style="width:90px">Quantity</th>
        <th style="width:110px">Value of Goods</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      ${blanks}
      <tr class="total-row">
        <td colspan="3" class="r">Total</td>
        <td class="c">${totalQty ? `${totalQty.toLocaleString('en-IN')} pcs` : ''}</td>
        <td class="r">${totalVal ? `₹${fmtAmt(totalVal)}` : ''}</td>
      </tr>
    </tbody>
  </table>

  <!-- ── Table Footer ── -->
  <div class="tfoot">
    <div class="tfoot-l">Our responsibility ceases as soon as goods leave our premises</div>
    <div class="tfoot-r">For ${esc(company.name)}</div>
  </div>

  <!-- ── Signature Row ── -->
  <div class="sig-row">
    <div class="sig-l">
      <div class="sig-label">Received the above goods in good condition.</div>
      <div class="sig-line">Receiver's Signature</div>
    </div>
    <div class="sig-r">
      <div class="sig-line">Authorised Signatory</div>
    </div>
  </div>

</div>
</body>
</html>`;
}

// ─── Inbound Receipt Note ─────────────────────────────────────────────────────
// (simpler format — records material received from supplier)

export function buildInboundHTML(
  dc: InboundChallanData,
  supplier: ChallanVendor,
  items: InboundItem[],
  company: ChallanCompany,
): string {
  const totalKg  = items.reduce((s, i) => s + (i.quantity_kg ?? 0), 0);
  const totalAmt = items.reduce((s, i) => s + (i.amount ?? 0), 0);

  const itemRows = items.map((item, i) => `
    <tr>
      <td class="c">${i + 1}</td>
      <td>${esc(item.item_desc)}</td>
      <td class="c">${esc(item.hsn_code)}</td>
      <td class="c">${item.quantity_kg ? `${item.quantity_kg.toLocaleString('en-IN')} KG` : ''}</td>
      <td class="c">${item.rate_per_kg ? `₹${fmtAmt(item.rate_per_kg)}` : ''}</td>
      <td class="r">${item.amount ? `₹${fmtAmt(item.amount)}` : ''}</td>
    </tr>`).join('');

  const blanks = Array(Math.max(0, BLANK_ROWS - items.length))
    .fill('<tr><td></td><td></td><td></td><td></td><td></td><td></td></tr>')
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Inbound Challan — #${esc(dc.challan_no)}</title>
  <style>${CSS}</style>
</head>
<body>
<div class="wrap">
  <div class="hdr">
    <div class="hdr-top">
      <div>GSTIN : ${esc(company.gstin)}${stateCode(company.gstin) ? `<br>State code : ${stateCode(company.gstin)}` : ''}</div>
      ${company.phone ? `<div class="hdr-phone">Mobile : ${esc(company.phone)}</div>` : '<div></div>'}
    </div>
    <div class="co-name">${esc(company.name)}</div>
    ${company.address ? `<div class="co-addr">${esc(company.address)}</div>` : ''}
  </div>

  <div class="body">
    <div class="body-left">
      <div class="frow">
        <span class="fl">From (Supplier)</span>
        <span class="fv">M/s. ${esc(supplier.name)}</span>
      </div>
      <div class="frow">
        <span class="fl"></span>
        <span class="fv">${esc(supplier.address)}</span>
      </div>
      <div class="frow">
        <span class="fl">Supplier's GSTIN</span>
        <span class="fv">${esc(supplier.gstin)}</span>
      </div>
      <div class="frow">
        <span class="fl">E-Way Bill No.</span>
        <span class="fv">${esc(dc.eway_bill_no)}</span>
      </div>
      <div class="frow">
        <span class="fl">Nature of Processing</span>
        <span class="fv">${esc(dc.nature_of_processing)}</span>
      </div>
    </div>

    <div class="body-right">
      <div class="dc-badge">INBOUND CHALLAN</div>
      <div class="dc-no-row">
        <span class="dc-no-lbl">No.</span>
        <span class="dc-no-val">${esc(dc.challan_no)}</span>
      </div>
      <div class="frow">
        <span class="fl">Date :</span>
        <span class="fv">${esc(dc.challan_date)}</span>
      </div>
      <div class="frow">
        <span class="fl">Reference No.</span>
        <span class="fv">${esc(dc.reference_no)}</span>
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:40px">S.No.</th>
        <th>Description of Goods</th>
        <th style="width:80px">HSN Code</th>
        <th style="width:90px">Qty (KG)</th>
        <th style="width:80px">Rate/KG</th>
        <th style="width:110px">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      ${blanks}
      <tr class="total-row">
        <td colspan="3" class="r">Total</td>
        <td class="c">${totalKg ? `${totalKg.toLocaleString('en-IN')} KG` : ''}</td>
        <td></td>
        <td class="r">${totalAmt ? `₹${fmtAmt(totalAmt)}` : ''}</td>
      </tr>
    </tbody>
  </table>

  <div class="tfoot">
    <div class="tfoot-l">Material received as per above details.</div>
    <div class="tfoot-r">For ${esc(company.name)}</div>
  </div>
  <div class="sig-row">
    <div class="sig-l">
      <div class="sig-label">Received the above goods in good condition.</div>
      <div class="sig-line">Receiver's Signature</div>
    </div>
    <div class="sig-r">
      <div class="sig-line">Authorised Signatory</div>
    </div>
  </div>
</div>
</body>
</html>`;
}

// ─── Print / Download ─────────────────────────────────────────────────────────

export async function printOrDownload(html: string, filename: string): Promise<void> {
  if (Platform.OS === 'web') {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 400);
    }
  } else {
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Save ${filename}`,
        UTI: 'com.adobe.pdf',
      });
    }
  }
}
