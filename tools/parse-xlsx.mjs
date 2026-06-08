// Converte o XML extraído do Excel original em prisma/seed-data.json.
// Executar uma vez: `node tools/parse-xlsx.mjs`. O JSON gerado é a fonte do seed.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "prisma", "data");

// --- shared strings ---
const sst = readFileSync(join(dataDir, "sharedStrings.xml"), "utf8");
const strings = [...sst.matchAll(/<si>(?:<t[^>]*>([\s\S]*?)<\/t>|.*?)<\/si>/g)].map((m) =>
  (m[1] ?? "").replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&amp;/g, "&")
);

// shared-string index -> nome de pessoa (condutor/pagador/recebedor)
const PERSON = { 3: "Márcio", 6: "Manel", 9: "Bruno", 12: "Luciana", 15: "Mariana", 16: "Zé" };
// shared-string index -> tipo de boleia
const TYPE = { 4: "BOLEIA", 7: "BOLEIA_EUR", 10: "MEIA_BOLEIA", 13: "MEIA_BOLEIA_EUR" };
// coluna -> pessoa (passageiro/recebedor) nas folhas Boleias e Pagamentos
const COL_PERSON = { C: "Márcio", D: "Manel", E: "Bruno", F: "Luciana", G: "Mariana", H: "Zé" };

const MEMBERS = ["Márcio", "Manel", "Bruno", "Luciana", "Mariana", "Zé"];

// serial date do Excel (base 1899-12-30) -> ISO
function excelDate(serial) {
  return new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000)
    .toISOString()
    .slice(0, 10);
}

// Extrai as células de uma linha: { ref, col, isString, value }
function parseRow(rowXml) {
  const cells = [];
  const re = /<c r="([A-Z]+)(\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
  let m;
  while ((m = re.exec(rowXml))) {
    const col = m[1];
    const attrs = m[3] || "";
    const inner = m[4] || "";
    const vMatch = inner.match(/<v>([\s\S]*?)<\/v>/);
    if (!vMatch) continue;
    cells.push({ col, isString: /t="s"/.test(attrs), value: vMatch[1] });
  }
  return cells;
}

function rowsOf(xml) {
  return [...xml.matchAll(/<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)].map((m) => ({
    r: Number(m[1]),
    cells: parseRow(m[2]),
  }));
}

// --- Boleias (viagens) ---
const boleiasXml = readFileSync(join(dataDir, "boleias.xml"), "utf8");
const trips = [];
for (const { r, cells } of rowsOf(boleiasXml)) {
  if (r < 3) continue; // 1=título, 2=cabeçalho
  const byCol = Object.fromEntries(cells.map((c) => [c.col, c]));
  const a = byCol["A"];
  const b = byCol["B"];
  if (!b || !b.isString || !(Number(b.value) in PERSON)) continue;
  const driver = PERSON[Number(b.value)];
  let date;
  if (a && !a.isString) date = excelDate(Number(a.value));
  else date = "2025-06-03"; // célula A24 = "03/06/0205" (typo no original)
  const passengers = [];
  for (const [col, person] of Object.entries(COL_PERSON)) {
    const cell = byCol[col];
    if (cell && cell.isString && Number(cell.value) in TYPE) {
      passengers.push({ name: person, type: TYPE[Number(cell.value)] });
    }
  }
  if (passengers.length) trips.push({ date, driver, passengers });
}

// --- Pagamentos ---
const pagXml = readFileSync(join(dataDir, "pagamentos.xml"), "utf8");
const payments = [];
for (const { r, cells } of rowsOf(pagXml)) {
  if (r < 3) continue;
  const byCol = Object.fromEntries(cells.map((c) => [c.col, c]));
  const a = byCol["A"];
  const b = byCol["B"];
  if (!b || !b.isString || !(Number(b.value) in PERSON)) continue;
  const payer = PERSON[Number(b.value)];
  const date = a && !a.isString ? excelDate(Number(a.value)) : "2025-01-01";
  for (const [col, person] of Object.entries(COL_PERSON)) {
    const cell = byCol[col];
    if (cell && !cell.isString && Number(cell.value) > 0) {
      payments.push({ date, payer, payee: person, amount: Number(cell.value), method: "OTHER" });
    }
  }
}

// --- Rota (parâmetros da folha Config) ---
const routes = [
  {
    name: "Braga - Famalicão",
    fuelPrice: 1.65,
    totalKm: 100,
    consumptionPer100: 6,
    tolls: 7.6,
    avgPeople: 4.5,
  },
];

const out = { members: MEMBERS, routes, trips, payments };
writeFileSync(join(root, "prisma", "seed-data.json"), JSON.stringify(out, null, 2));
console.log(
  `seed-data.json: ${MEMBERS.length} membros, ${trips.length} viagens, ${payments.length} pagamentos`
);
