import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '../data/reports.json');
const VARS_FILE = path.join(__dirname, '../data/custom-variables.json');

function readCustomVars() {
  if (!fs.existsSync(VARS_FILE)) return {};
  return JSON.parse(fs.readFileSync(VARS_FILE, 'utf-8'));
}

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.get('/api/reports', (req, res) => {
  res.json({ ...readData(), customVariables: readCustomVars() });
});

app.post('/api/reports', (req, res) => {
  const data = readData();
  const report = { id: uuidv4(), ...req.body };
  data.reports.push(report);
  writeData(data);
  res.json(report);
});

app.delete('/api/reports/:id', (req, res) => {
  const data = readData();
  data.reports = data.reports.filter(r => r.id !== req.params.id);
  writeData(data);
  res.json({ ok: true });
});

app.listen(3001, () => console.log('Server running on http://localhost:3001'));
