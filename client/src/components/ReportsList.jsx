import React, { useState } from 'react';
import { getProviderColor, VARIABLE_LABELS } from '../utils/dataHelpers.js';

const KEY_VARS = ['hemoglobin', 'rbc', 'tlc', 'monocytes_pct', 'platelets'];

export default function ReportsList({ reports, onDeleted }) {
  const [open, setOpen] = useState(false);

  async function handleDelete(id, provider, date) {
    if (!confirm(`Delete ${provider} report from ${date}?`)) return;
    await fetch(`/api/reports/${id}`, { method: 'DELETE' });
    onDeleted();
  }

  const sorted = [...reports].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <span className="font-semibold text-gray-700 text-sm">All Reports ({reports.length})</span>
        <span className="text-gray-400 text-sm">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="overflow-x-auto border-t border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Provider</th>
                <th className="px-4 py-3 text-left font-medium">Lab No.</th>
                {KEY_VARS.map(v => (
                  <th key={v} className="px-4 py-3 text-left font-medium">{VARIABLE_LABELS[v]?.split(' ')[0]}</th>
                ))}
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(r => (
                <tr key={r.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">
                    {new Date(r.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: getProviderColor(r.provider) }} />
                      <span className="text-gray-700">{r.provider}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{r.labNo || '—'}</td>
                  {KEY_VARS.map(v => {
                    const d = r.variables[v];
                    return (
                      <td key={v} className="px-4 py-3">
                        {d ? (
                          <span className="flex items-center gap-1">
                            <span className={d.flag ? (d.flag === 'H' ? 'text-red-600 font-semibold' : 'text-orange-500 font-semibold') : 'text-gray-700'}>
                              {d.value}
                            </span>
                            {d.flag && (
                              <span className={`text-xs font-bold ${d.flag === 'H' ? 'text-red-400' : 'text-orange-400'}`}>{d.flag}</span>
                            )}
                          </span>
                        ) : <span className="text-gray-200">—</span>}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(r.id, r.provider, r.date)}
                      className="text-xs text-gray-300 hover:text-red-500 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
