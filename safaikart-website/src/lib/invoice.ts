import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatINR, formatDate, toDate } from "./format";

type OrderItem = {
  name?: string;
  serviceName?: string;
  quantity?: number;
  qty?: number;
  priceMinor?: number;
  unitPriceMinor?: number;
};

type Order = {
  id: string;
  userId?: string;
  status?: string;
  paymentStatus?: string;
  finalAmountMinor?: number;
  currency?: string;
  addressSnapshot?: Record<string, unknown>;
  items?: OrderItem[];
  createdAt?: unknown;
  driverId?: string;
  driverName?: string;
  tipMinor?: number;
  discountMinor?: number;
  couponCode?: string;
};

export type InvoiceGstConfig = {
  gstin?: string;
  companyName?: string;
  companyAddress?: string;
  hsnCode?: string;
  gstRatePct?: number; // e.g. 18 for 18%
  intraState?: boolean; // true → CGST+SGST split, false → IGST
};

const BRAND = { r: 27, g: 59, b: 34 }; // #1B3B22
const GOLD = { r: 244, g: 199, b: 62 };

export function generateInvoicePdf(order: Order, gst?: InvoiceGstConfig) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();

  // Header band
  pdf.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  pdf.rect(0, 0, pageW, 90, "F");
  pdf.setFillColor(GOLD.r, GOLD.g, GOLD.b);
  pdf.rect(0, 90, pageW, 4, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.text("SafaiKart", 40, 45);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(gst?.companyName || "On-demand laundry & dry-cleaning", 40, 62);
  if (gst?.gstin) {
    pdf.setFontSize(9);
    pdf.text(`GSTIN: ${gst.gstin}`, 40, 76);
  }

  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text(gst?.gstin ? "TAX INVOICE" : "INVOICE", pageW - 40, 45, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(`#${order.id.slice(0, 12)}`, pageW - 40, 60, { align: "right" });
  pdf.text(formatDate(order.createdAt), pageW - 40, 74, { align: "right" });

  // Bill to
  pdf.setTextColor(30, 30, 30);
  const addr = (order.addressSnapshot ?? {}) as Record<string, unknown>;
  const addressLine = [addr.line1, addr.line2, addr.city, addr.state, addr.pincode ?? addr.postalCode]
    .filter(Boolean)
    .map(String)
    .join(", ");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("BILL TO", 40, 130);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.text(String(addr.name || order.userId || "Customer"), 40, 148);
  pdf.setFontSize(9);
  pdf.setTextColor(90, 90, 90);
  if (addr.phone) pdf.text(String(addr.phone), 40, 162);
  const wrapped = pdf.splitTextToSize(addressLine || "—", pageW / 2 - 60);
  pdf.text(wrapped, 40, 176);

  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(30, 30, 30);
  pdf.setFontSize(10);
  pdf.text("STATUS", pageW - 40, 130, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.text(order.status || "—", pageW - 40, 148, { align: "right" });
  pdf.setFontSize(9);
  pdf.setTextColor(90, 90, 90);
  pdf.text(`Payment: ${order.paymentStatus || "—"}`, pageW - 40, 162, { align: "right" });
  if (order.driverName || order.driverId) {
    pdf.text(`Runner: ${order.driverName || order.driverId}`, pageW - 40, 176, { align: "right" });
  }

  // Items table
  const hsn = gst?.hsnCode || "";
  const showHsn = !!gst?.gstin;
  const rows = (order.items || []).map((it) => {
    const qty = it.quantity ?? it.qty ?? 1;
    const price = it.priceMinor ?? it.unitPriceMinor ?? 0;
    const base = [
      it.name || it.serviceName || "Item",
      String(qty),
      formatINR(price, order.currency),
      formatINR(price * qty, order.currency),
    ];
    return showHsn ? [base[0], hsn, base[1], base[2], base[3]] : base;
  });

  autoTable(pdf, {
    startY: 230,
    head: [showHsn ? ["Service", "HSN", "Qty", "Unit price", "Amount"] : ["Service", "Qty", "Unit price", "Amount"]],
    body: rows.length ? rows : [showHsn ? ["—", "—", "—", "—", "—"] : ["—", "—", "—", "—"]],
    styles: { fontSize: 10, cellPadding: 8 },
    headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b], textColor: 255, fontStyle: "bold" },
    columnStyles: showHsn
      ? {
          1: { halign: "center", cellWidth: 60 },
          2: { halign: "center", cellWidth: 50 },
          3: { halign: "right", cellWidth: 90 },
          4: { halign: "right", cellWidth: 100 },
        }
      : {
          1: { halign: "center", cellWidth: 60 },
          2: { halign: "right", cellWidth: 100 },
          3: { halign: "right", cellWidth: 110 },
        },
    margin: { left: 40, right: 40 },
  });

  let finalY = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  // Breakdown
  const gross = order.finalAmountMinor || 0;
  const tip = order.tipMinor || 0;
  const discount = order.discountMinor || 0;
  let taxRows: Array<[string, string]> = [];
  
  const subtotal = gross - tip + discount;
  taxRows.push(["Subtotal", formatINR(subtotal, order.currency)]);
  
  if (discount > 0) {
    taxRows.push([`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`, `-${formatINR(discount, order.currency)}`]);
  }
  if (tip > 0) {
    taxRows.push(["Tip", formatINR(tip, order.currency)]);
  }

  if (taxRows.length > 1) {
    autoTable(pdf, {
      startY: finalY + 10,
      body: taxRows,
      styles: { fontSize: 9, cellPadding: 6 },
      columnStyles: { 0: { cellWidth: 160 }, 1: { halign: "right", cellWidth: 110 } },
      margin: { left: pageW - 310, right: 40 },
      theme: "plain",
    });
    finalY = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  }

  // Total
  pdf.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  pdf.roundedRect(pageW - 260, finalY + 12, 220, 60, 8, 8, "F");
  pdf.setTextColor(GOLD.r, GOLD.g, GOLD.b);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("TOTAL", pageW - 240, finalY + 32);
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.text(formatINR(order.finalAmountMinor, order.currency), pageW - 60, finalY + 54, {
    align: "right",
  });

  // Footer
  pdf.setTextColor(140, 140, 140);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(
    "Thank you for choosing SafaiKart. This is a computer-generated invoice.",
    pageW / 2,
    pdf.internal.pageSize.getHeight() - 30,
    { align: "center" },
  );

  const dateStr = (toDate(order.createdAt) ?? new Date()).toISOString().slice(0, 10);
  pdf.save(`safaikart-invoice-${order.id.slice(0, 8)}-${dateStr}.pdf`);
}
