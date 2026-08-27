const STATUS_LABELS = {
  not_invoiced: "Nog niet gefactureerd",
  pending_invoice: "Factuur aangevraagd / in opmaak",
  invoiced: "Gefactureerd",
};

const WERKTYPE_LABELS = {
  development: "Development",
  design: "Design",
  meeting: "Overleg",
  testing: "Testen",
  documentation: "Documentatie",
  other: "Andere",
};

const KOLOMMEN = [
  { kop: "Type invoer", breedte: 14 },
  { kop: "Datum", breedte: 12, soort: "datum" },
  { kop: "Van", breedte: 12, soort: "datum" },
  { kop: "Tot en met", breedte: 12, soort: "datum" },
  { kop: "Startuur", breedte: 10 },
  { kop: "Einduur", breedte: 10 },
  { kop: "Duur", breedte: 10 },
  { kop: "Uren (decimaal)", breedte: 15, soort: "uren" },
  { kop: "Minuten", breedte: 9 },
  { kop: "Klant", breedte: 20 },
  { kop: "Project", breedte: 20 },
  { kop: "App / onderdeel", breedte: 20 },
  { kop: "Type werk", breedte: 15 },
  { kop: "Titel", breedte: 40 },
  { kop: "Beschrijving", breedte: 60 },
  { kop: "Status", breedte: 30 },
  { kop: "Logboek – sectie", breedte: 25 },
  { kop: "Logboek – URL", breedte: 30 },
  { kop: "Logboek – tekst", breedte: 60 },
  { kop: "Externe ref – type", breedte: 16 },
  { kop: "Externe ref – label", breedte: 25 },
  { kop: "Externe ref – URL", breedte: 30 },
  { kop: "Aangemaakt op", breedte: 18, soort: "datumtijd" },
];

function formatDuur(min) {
  if (!min || min <= 0) return "";
  return `${Math.floor(min / 60)}u ${String(min % 60).padStart(2, "0")}m`;
}

/** "2026-08-27" -> Date, zodat Excel er een echte datum van maakt. */
function naarDatum(isoString) {
  if (!isoString) return "";
  const [jaar, maand, dag] = isoString.split("-").map(Number);
  if (!jaar || !maand || !dag) return isoString;
  return new Date(jaar, maand - 1, dag);
}

/** Firestore Timestamp, Date of null -> Date of lege cel. */
function naarDatumTijd(waarde) {
  if (!waarde) return "";
  if (typeof waarde.toDate === "function") return waarde.toDate();
  if (waarde instanceof Date) return waarde;
  if (typeof waarde.seconds === "number") return new Date(waarde.seconds * 1000);
  return "";
}

function maakRij(log) {
  const isPeriode = log.entryType === "period";
  const minuten = log.durationMinutes || 0;
  return [
    isPeriode ? "Periode" : "Specifiek tijdstip",
    naarDatum(isPeriode ? log.dateFrom || log.date : log.date),
    isPeriode ? naarDatum(log.dateFrom) : "",
    isPeriode ? naarDatum(log.dateTo) : "",
    isPeriode ? "" : log.startTime || "",
    isPeriode ? "" : log.endTime || "",
    formatDuur(minuten),
    minuten ? Math.round((minuten / 60) * 100) / 100 : 0,
    minuten,
    log.client || "",
    log.project || "",
    log.appName || "",
    WERKTYPE_LABELS[log.workType] || log.workType || "",
    log.title || "",
    log.description || "",
    STATUS_LABELS[log.status] || STATUS_LABELS.not_invoiced,
    log.logbookReference?.sectionTitle || "",
    log.logbookReference?.url || "",
    log.logbookReference?.text || "",
    log.externalReference?.type || "",
    log.externalReference?.label || "",
    log.externalReference?.url || "",
    naarDatumTijd(log.createdAt),
  ];
}

/** Zet het juiste getal-/datumformaat op de datakolommen. */
function pasFormatToe(XLSX, ws, aantalRijen) {
  KOLOMMEN.forEach((kolom, index) => {
    if (!kolom.soort) return;
    const formaat =
      kolom.soort === "datum" ? "dd/mm/yyyy"
        : kolom.soort === "datumtijd" ? "dd/mm/yyyy hh:mm"
          : "0.00";
    for (let rij = 1; rij <= aantalRijen; rij++) {
      const cel = ws[XLSX.utils.encode_cell({ r: rij, c: index })];
      if (cel && cel.v !== "") cel.z = formaat;
    }
  });
}

function maakSamenvattingBlad(XLSX, logs) {
  const totaalMinuten = logs.reduce((som, l) => som + (l.durationMinutes || 0), 0);

  const perProject = new Map();
  const perStatus = new Map();
  for (const log of logs) {
    const minuten = log.durationMinutes || 0;
    const project = log.project || "(geen project)";
    const status = STATUS_LABELS[log.status] || STATUS_LABELS.not_invoiced;
    const p = perProject.get(project) || { aantal: 0, minuten: 0 };
    perProject.set(project, { aantal: p.aantal + 1, minuten: p.minuten + minuten });
    const s = perStatus.get(status) || { aantal: 0, minuten: 0 };
    perStatus.set(status, { aantal: s.aantal + 1, minuten: s.minuten + minuten });
  }

  const urenVan = (min) => Math.round((min / 60) * 100) / 100;
  const rijen = [
    ["Samenvatting werkmomenten"],
    [],
    ["Aantal werkmomenten", logs.length],
    ["Totaal", formatDuur(totaalMinuten)],
    ["Totaal uren (decimaal)", urenVan(totaalMinuten)],
    [],
    ["Per project", "Aantal", "Duur", "Uren (decimaal)"],
    ...[...perProject.entries()]
      .sort((a, b) => b[1].minuten - a[1].minuten)
      .map(([naam, v]) => [naam, v.aantal, formatDuur(v.minuten), urenVan(v.minuten)]),
    [],
    ["Per status", "Aantal", "Duur", "Uren (decimaal)"],
    ...[...perStatus.entries()]
      .sort((a, b) => b[1].minuten - a[1].minuten)
      .map(([naam, v]) => [naam, v.aantal, formatDuur(v.minuten), urenVan(v.minuten)]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(rijen);
  ws["!cols"] = [{ wch: 35 }, { wch: 10 }, { wch: 12 }, { wch: 16 }];
  return ws;
}

/**
 * Bouwt een .xlsx met alle werkmomenten en start de download.
 * SheetJS wordt pas hier ingeladen — het is ~400 kB en alleen de
 * beheerder heeft het nodig.
 * Geeft het aantal geëxporteerde rijen terug.
 */
export async function exporteerWerkmomenten(logs, bestandsnaam) {
  const XLSX = await import("xlsx");

  // Oudste eerst — logischer als bijlage bij een factuur.
  const gesorteerd = [...logs].sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  const rijen = [KOLOMMEN.map((k) => k.kop), ...gesorteerd.map(maakRij)];
  const ws = XLSX.utils.aoa_to_sheet(rijen, { cellDates: true });

  ws["!cols"] = KOLOMMEN.map((k) => ({ wch: k.breedte }));
  ws["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: Math.max(rijen.length - 1, 1), c: KOLOMMEN.length - 1 },
    }),
  };
  pasFormatToe(XLSX, ws, gesorteerd.length);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Werkmomenten");
  XLSX.utils.book_append_sheet(wb, maakSamenvattingBlad(XLSX, gesorteerd), "Samenvatting");

  XLSX.writeFile(wb, bestandsnaam || standaardBestandsnaam(), { cellDates: true });
  return gesorteerd.length;
}

export function standaardBestandsnaam() {
  const nu = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `werkmomenten-${nu.getFullYear()}-${pad(nu.getMonth() + 1)}-${pad(nu.getDate())}.xlsx`;
}
