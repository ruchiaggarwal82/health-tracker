// Merge server-side custom variables into labels/defaults at runtime
export function mergeCustomVariables(customVariables = {}) {
  Object.entries(customVariables).forEach(([key, cfg]) => {
    VARIABLE_LABELS[key] = cfg.label;
    VARIABLE_DEFAULTS[key] = { unit: cfg.unit, refRangeLow: cfg.refRangeLow, refRangeHigh: cfg.refRangeHigh };
  });
}

export const VARIABLE_LABELS = {
  hemoglobin: 'Hemoglobin',
  tlc: 'WBC / Total Leukocyte Count',
  rbc: 'RBC Count',
  monocytes_pct: 'Monocytes %',
  monocytes_abs: 'Monocytes (Absolute)',
  platelets: 'Platelet Count',
  pcv: 'PCV / Hematocrit',
  mcv: 'MCV',
  mch: 'MCH',
  mchc: 'MCHC',
  rdw: 'RDW',
  neutrophils_pct: 'Neutrophils %',
  lymphocytes_pct: 'Lymphocytes %',
};

export const VARIABLE_DEFAULTS = {
  hemoglobin:      { unit: 'g/dL',     refRangeLow: 12.0, refRangeHigh: 15.0 },
  tlc:             { unit: 'thou/mm3', refRangeLow: 4.0,  refRangeHigh: 10.0 },
  rbc:             { unit: 'mill/mm3', refRangeLow: 3.8,  refRangeHigh: 4.8  },
  monocytes_pct:   { unit: '%',        refRangeLow: 2.0,  refRangeHigh: 10.0 },
  monocytes_abs:   { unit: 'thou/mm3', refRangeLow: 0.2,  refRangeHigh: 1.0  },
  platelets:       { unit: 'thou/mm3', refRangeLow: 150,  refRangeHigh: 410  },
  pcv:             { unit: '%',        refRangeLow: 36.0, refRangeHigh: 46.0 },
  mcv:             { unit: 'fL',       refRangeLow: 83.0, refRangeHigh: 101.0},
  mch:             { unit: 'pg',       refRangeLow: 27.0, refRangeHigh: 32.0 },
  mchc:            { unit: 'g/dL',     refRangeLow: 31.5, refRangeHigh: 34.5 },
  rdw:             { unit: '%',        refRangeLow: 11.6, refRangeHigh: 14.0 },
  neutrophils_pct: { unit: '%',        refRangeLow: 40.0, refRangeHigh: 80.0 },
  lymphocytes_pct: { unit: '%',        refRangeLow: 20.0, refRangeHigh: 40.0 },
};

export const PROVIDER_COLORS = {
  'Dr. Lal PathLabs': '#3B82F6',
  'Artemis Hospitals': '#10B981',
  'TATA 1Mg': '#F59E0B',
};

const COLOR_PALETTE = ['#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1'];
let colorIndex = 0;

export function getProviderColor(provider) {
  if (PROVIDER_COLORS[provider]) return PROVIDER_COLORS[provider];
  const color = COLOR_PALETTE[colorIndex % COLOR_PALETTE.length];
  PROVIDER_COLORS[provider] = color;
  colorIndex++;
  return color;
}

export function getUniqueProviders(reports) {
  return [...new Set(reports.map(r => r.provider))];
}

export function getVariablesAcrossReports(reports) {
  const vars = new Set();
  reports.forEach(r => Object.keys(r.variables).forEach(v => vars.add(v)));
  return [...vars];
}

export function buildChartData(reports, variableKey, activeProviders) {
  const filtered = reports
    .filter(r => r.variables[variableKey] && activeProviders.includes(r.provider))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const providers = [...new Set(filtered.map(r => r.provider))];

  const byDate = {};
  filtered.forEach(r => {
    if (!byDate[r.date]) {
      byDate[r.date] = {
        date: r.date,
        timestamp: new Date(r.date + 'T00:00:00').getTime(),
      };
    }
    byDate[r.date][r.provider] = r.variables[variableKey].value;
    byDate[r.date][`${r.provider}_flag`] = r.variables[variableKey].flag;
  });

  const data = Object.values(byDate).sort((a, b) => a.timestamp - b.timestamp);
  return { data, providers };
}

// Generate timestamps for the 1st of every month between two dates
export function getMonthlyTicks(data) {
  if (!data.length) return [];
  const minTs = data[0].timestamp;
  const maxTs = data[data.length - 1].timestamp;

  const ticks = [];
  const start = new Date(minTs);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(maxTs);
  end.setDate(1);
  end.setHours(0, 0, 0, 0);
  end.setMonth(end.getMonth() + 1); // include the end month

  const cur = new Date(start);
  while (cur <= end) {
    ticks.push(cur.getTime());
    cur.setMonth(cur.getMonth() + 1);
  }
  return ticks;
}

export function formatMonthYear(timestamp) {
  const d = new Date(timestamp);
  return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

export function formatFullDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}
