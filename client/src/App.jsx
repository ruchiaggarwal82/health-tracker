import React, { useEffect, useState, useCallback } from 'react';
import VariableChart from './components/VariableChart.jsx';
import AddReportModal from './components/AddReportModal.jsx';
import ReportsList from './components/ReportsList.jsx';
import { getUniqueProviders, getVariablesAcrossReports, getProviderColor, VARIABLE_LABELS, mergeCustomVariables } from './utils/dataHelpers.js';

const DEFAULT_SELECTED_VARS = ['hemoglobin', 'rbc', 'tlc', 'monocytes_pct', 'platelets'];

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedVars, setSelectedVars] = useState(DEFAULT_SELECTED_VARS);
  const [activeProviders, setActiveProviders] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/reports');
      if (!res.ok) throw new Error('Server error');
      const json = await res.json();
      mergeCustomVariables(json.customVariables);
      setData(json);
      setActiveProviders(prev => {
        const allProviders = getUniqueProviders(json.reports);
        // Keep existing toggles, add new providers as active
        const next = allProviders.filter(p => !prev.includes(p));
        return [...prev.filter(p => allProviders.includes(p)), ...next];
      });
    } catch {
      setError('Cannot connect to server. Run: npm run dev');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-500 font-medium mb-2">{error}</p>
        <p className="text-gray-400 text-sm">Make sure both the client and server are running.</p>
      </div>
    </div>
  );

  const { patient, reports } = data;
  const allProviders = getUniqueProviders(reports);
  const allVars = getVariablesAcrossReports(reports);

  function toggleVar(v) {
    setSelectedVars(prev =>
      prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]
    );
  }

  function toggleProvider(p) {
    setActiveProviders(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-800 text-white px-6 py-4 shadow">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{patient.name}'s Health Tracker</h1>
            <p className="text-slate-400 text-sm mt-0.5">{patient.age}F · Blood Reports · {reports.length} reports on file</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Add Report
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* Controls */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4">
          {/* Provider toggles */}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Providers</p>
            <div className="flex flex-wrap gap-2">
              {allProviders.map(p => {
                const active = activeProviders.includes(p);
                const color = getProviderColor(p);
                return (
                  <button
                    key={p}
                    onClick={() => toggleProvider(p)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      active ? 'text-white border-transparent shadow-sm' : 'bg-white text-gray-400 border-gray-200'
                    }`}
                    style={active ? { background: color, borderColor: color } : {}}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: active ? 'rgba(255,255,255,0.7)' : color }} />
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Variable selector */}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Variables to Track</p>
            <div className="flex flex-wrap gap-2">
              {allVars.map(v => {
                const active = selectedVars.includes(v);
                return (
                  <button
                    key={v}
                    onClick={() => toggleVar(v)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      active
                        ? 'bg-slate-700 text-white border-slate-700'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-slate-400'
                    }`}
                  >
                    {VARIABLE_LABELS[v] || v}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Charts */}
        {selectedVars.length === 0 ? (
          <div className="text-center py-16 text-gray-400">Select variables above to see charts.</div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {selectedVars.map(v => (
              <VariableChart
                key={v}
                reports={reports}
                variableKey={v}
                activeProviders={activeProviders}
              />
            ))}
          </div>
        )}

        {/* Reports list */}
        <ReportsList reports={reports} onDeleted={fetchData} />
      </main>

      {showModal && (
        <AddReportModal
          onClose={() => setShowModal(false)}
          onSaved={fetchData}
          existingProviders={allProviders}
        />
      )}
    </div>
  );
}
