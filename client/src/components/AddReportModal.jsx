import React, { useState } from 'react';
import { VARIABLE_LABELS, VARIABLE_DEFAULTS } from '../utils/dataHelpers.js';

const DEFAULT_VARS = Object.keys(VARIABLE_LABELS);

function emptyRow() {
  return { key: '', value: '', unit: '', refRangeLow: '', refRangeHigh: '', flag: null };
}

export default function AddReportModal({ onClose, onSaved, existingProviders }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [provider, setProvider] = useState('');
  const [labNo, setLabNo] = useState('');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function updateRow(i, field, val) {
    setRows(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: val };
      if (field === 'key' && VARIABLE_DEFAULTS[val]) {
        const d = VARIABLE_DEFAULTS[val];
        next[i].unit = d.unit;
        next[i].refRangeLow = d.refRangeLow;
        next[i].refRangeHigh = d.refRangeHigh;
      }
      // auto-flag
      if (field === 'value' || field === 'key') {
        const v = parseFloat(next[i].value);
        const lo = parseFloat(next[i].refRangeLow);
        const hi = parseFloat(next[i].refRangeHigh);
        if (!isNaN(v) && !isNaN(lo) && !isNaN(hi)) {
          next[i].flag = v < lo ? 'L' : v > hi ? 'H' : null;
        }
      }
      return next;
    });
  }

  async function handleSave() {
    if (!date || !provider.trim()) { setError('Date and Provider are required.'); return; }
    const validRows = rows.filter(r => r.key && r.value !== '');
    if (validRows.length === 0) { setError('Add at least one variable.'); return; }
    setError('');
    setSaving(true);
    const variables = {};
    validRows.forEach(r => {
      variables[r.key] = {
        value: parseFloat(r.value),
        unit: r.unit,
        refRangeLow: parseFloat(r.refRangeLow) || null,
        refRangeHigh: parseFloat(r.refRangeHigh) || null,
        flag: r.flag,
      };
    });
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, provider: provider.trim(), labNo, notes, variables }),
      });
      if (!res.ok) throw new Error('Server error');
      onSaved();
      onClose();
    } catch {
      setError('Failed to save. Is the server running?');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Add New Report</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Provider *</label>
              <input list="providers" value={provider} onChange={e => setProvider(e.target.value)}
                placeholder="e.g. Dr. Lal PathLabs"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <datalist id="providers">
                {existingProviders.map(p => <option key={p} value={p} />)}
              </datalist>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Lab No. (optional)</label>
              <input value={labNo} onChange={e => setLabNo(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Notes (optional)</label>
              <input value={notes} onChange={e => setNotes(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-500">Variables</label>
              <button onClick={() => setRows(r => [...r, emptyRow()])}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Add row</button>
            </div>
            <div className="border border-gray-100 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Variable</th>
                    <th className="px-3 py-2 text-left font-medium">Value</th>
                    <th className="px-3 py-2 text-left font-medium">Unit</th>
                    <th className="px-3 py-2 text-left font-medium">Ref Range</th>
                    <th className="px-3 py-2 text-left font-medium">Flag</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-t border-gray-50">
                      <td className="px-3 py-2">
                        <select value={row.key} onChange={e => updateRow(i, 'key', e.target.value)}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400">
                          <option value="">Select...</option>
                          {DEFAULT_VARS.map(v => <option key={v} value={v}>{VARIABLE_LABELS[v]}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" value={row.value} onChange={e => updateRow(i, 'value', e.target.value)}
                          className="w-24 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      </td>
                      <td className="px-3 py-2">
                        <input value={row.unit} onChange={e => updateRow(i, 'unit', e.target.value)}
                          className="w-24 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-400">
                        {row.refRangeLow}–{row.refRangeHigh}
                      </td>
                      <td className="px-3 py-2">
                        {row.flag && (
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${row.flag === 'H' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                            {row.flag}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <button onClick={() => setRows(r => r.filter((_, j) => j !== i))}
                          className="text-gray-300 hover:text-red-400 text-lg leading-none">&times;</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Report'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
