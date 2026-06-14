import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PDFS_DIR = path.join(__dirname, '../pdfs');
const DATA_FILE = path.join(__dirname, '../data/reports.json');
const PROCESSED_LOG = path.join(__dirname, '../data/processed.json');

// Load env
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim();
  });
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌  Missing ANTHROPIC_API_KEY. Create a .env file in the project root:\n   ANTHROPIC_API_KEY=sk-ant-...');
  process.exit(1);
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    return { patient: { name: 'Renu Aggarwal', age: 68, gender: 'Female' }, reports: [] };
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function readProcessed() {
  if (!fs.existsSync(PROCESSED_LOG)) return [];
  return JSON.parse(fs.readFileSync(PROCESSED_LOG, 'utf-8'));
}

function saveProcessed(list) {
  fs.writeFileSync(PROCESSED_LOG, JSON.stringify(list, null, 2));
}

function isDuplicate(reports, newReport) {
  return reports.some(r =>
    r.date === newReport.date &&
    r.provider === newReport.provider &&
    r.labNo === newReport.labNo
  );
}

async function extractFromPDF(filePath) {
  const pdfBytes = fs.readFileSync(filePath);
  const base64 = pdfBytes.toString('base64');

  const prompt = `This is a blood test lab report. Extract ALL test results and return ONLY valid JSON (no markdown, no explanation).

Return this exact structure:
{
  "date": "YYYY-MM-DD",
  "provider": "Lab name (e.g. Dr. Lal PathLabs, Artemis Hospitals, TATA 1Mg)",
  "labNo": "lab/accession number or empty string",
  "notes": "",
  "variables": {
    "hemoglobin":      { "value": number, "unit": "g/dL",     "refRangeLow": number, "refRangeHigh": number, "flag": "H"|"L"|null },
    "tlc":             { "value": number, "unit": "thou/mm3", "refRangeLow": number, "refRangeHigh": number, "flag": "H"|"L"|null },
    "rbc":             { "value": number, "unit": "mill/mm3", "refRangeLow": number, "refRangeHigh": number, "flag": "H"|"L"|null },
    "monocytes_pct":   { "value": number, "unit": "%",        "refRangeLow": number, "refRangeHigh": number, "flag": "H"|"L"|null },
    "monocytes_abs":   { "value": number, "unit": "thou/mm3", "refRangeLow": number, "refRangeHigh": number, "flag": "H"|"L"|null },
    "platelets":       { "value": number, "unit": "thou/mm3", "refRangeLow": number, "refRangeHigh": number, "flag": "H"|"L"|null },
    "pcv":             { "value": number, "unit": "%",        "refRangeLow": number, "refRangeHigh": number, "flag": "H"|"L"|null },
    "mcv":             { "value": number, "unit": "fL",       "refRangeLow": number, "refRangeHigh": number, "flag": "H"|"L"|null },
    "mch":             { "value": number, "unit": "pg",       "refRangeLow": number, "refRangeHigh": number, "flag": "H"|"L"|null },
    "mchc":            { "value": number, "unit": "g/dL",     "refRangeLow": number, "refRangeHigh": number, "flag": "H"|"L"|null },
    "rdw":             { "value": number, "unit": "%",        "refRangeLow": number, "refRangeHigh": number, "flag": "H"|"L"|null },
    "neutrophils_pct": { "value": number, "unit": "%",        "refRangeLow": number, "refRangeHigh": number, "flag": "H"|"L"|null },
    "lymphocytes_pct": { "value": number, "unit": "%",        "refRangeLow": number, "refRangeHigh": number, "flag": "H"|"L"|null }
  }
}

Rules:
- Only include variables that actually appear in this report (omit the rest)
- flag should be "H" if value is above refRangeHigh, "L" if below refRangeLow, null if normal
- Use the collection/sample date as "date" (not report date)
- Keep unit as printed in the report
- refRangeLow and refRangeHigh should be numbers parsed from the reference range column`;

  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
        { type: 'text', text: prompt }
      ]
    }]
  });

  const text = response.content[0].text.trim();
  // Strip markdown code fences if present
  const json = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(json);
}

async function main() {
  if (!fs.existsSync(PDFS_DIR)) {
    console.error(`❌  pdfs/ folder not found. Create it at: ${PDFS_DIR}`);
    process.exit(1);
  }

  fs.mkdirSync(path.join(__dirname, '../data'), { recursive: true });

  const pdfs = fs.readdirSync(PDFS_DIR).filter(f => f.toLowerCase().endsWith('.pdf'));
  if (pdfs.length === 0) {
    console.log('No PDF files found in pdfs/ folder.');
    return;
  }

  const processed = readProcessed();
  const data = readData();
  let added = 0;
  let skipped = 0;

  for (const filename of pdfs) {
    if (processed.includes(filename)) {
      console.log(`⏭️   Skipping (already processed): ${filename}`);
      skipped++;
      continue;
    }

    console.log(`📄  Processing: ${filename} ...`);
    try {
      const report = await extractFromPDF(path.join(PDFS_DIR, filename));

      if (isDuplicate(data.reports, report)) {
        console.log(`⚠️   Duplicate found (${report.date} · ${report.provider}) — skipping`);
        processed.push(filename);
        saveProcessed(processed);
        skipped++;
        continue;
      }

      report.id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      data.reports.push(report);
      processed.push(filename);
      saveProcessed(processed);
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

      console.log(`✅  Added: ${report.date} · ${report.provider} (${Object.keys(report.variables).length} variables)`);
      added++;
    } catch (err) {
      console.error(`❌  Failed to process ${filename}:`);
      console.error(err);
    }
  }

  console.log(`\nDone. ${added} added, ${skipped} skipped.`);
  if (added > 0) console.log('Refresh your browser to see the updated charts.');
}

main();
