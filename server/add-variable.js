import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VARS_FILE = path.join(__dirname, '../data/custom-variables.json');

function readVars() {
  if (!fs.existsSync(VARS_FILE)) return {};
  return JSON.parse(fs.readFileSync(VARS_FILE, 'utf-8'));
}

function ask(rl, question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('\n📊  Add a new variable to track\n');

  const key = (await ask(rl, 'Variable key (e.g. vitamin_b12, creatinine): ')).trim().toLowerCase().replace(/\s+/g, '_');
  if (!key) { console.log('Cancelled.'); rl.close(); return; }

  const label = (await ask(rl, `Display name (e.g. Vitamin B12): `)).trim();
  const unit = (await ask(rl, `Unit (e.g. pg/mL): `)).trim();
  const refLow = parseFloat(await ask(rl, `Reference range LOW: `));
  const refHigh = parseFloat(await ask(rl, `Reference range HIGH: `));

  rl.close();

  const vars = readVars();
  vars[key] = { label: label || key, unit, refRangeLow: refLow || null, refRangeHigh: refHigh || null };
  fs.mkdirSync(path.dirname(VARS_FILE), { recursive: true });
  fs.writeFileSync(VARS_FILE, JSON.stringify(vars, null, 2));

  console.log(`\n✅  Added "${label}" (${key}). It will appear in the dashboard variable selector.`);
  console.log('   You can now add values for it via "+ Add Report" in the app.\n');
}

main();
