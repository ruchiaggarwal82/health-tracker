import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/reports');
      if (!res.ok) throw new Error('Server error');
      const json = await res.json();
      mergeCustomVariables(json.customVariables);
      setData(json);
      setActiveProviders(prev => {
        const allProviders = getUniqueProviders(json.reports);
        const next = allProviders.filter(p => !prev.includes(p));
        return [...prev.filter(p => allProviders.includes(p)), ...next];
      });
      // Set default date range to full span of reports
      if (json.reports.length) {
        const dates = json.reports.map(r => r.date).sort();
        setDateFrom(prev => prev || dates[0]);
        setDateTo(prev => prev || dates[dates.length - 1]);
      }
    } catch {
      setError('Cannot connect to server. Run: npm run dev');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredReports = useMemo(() => {
    if (!data) return [];
    return data.reports.filter(r => {
      if (dateFrom && r.date < dateFrom) return false;
      if (dateTo && r.date > dateTo) return false;
      return true;
    });
  }, [data, dateFrom, dateTo]);

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

  function resetDateRange() {
    if (!reports.length) return;
    const dates = reports.map(r => r.date).sort();
    setDateFrom(dates[0]);
    setDateTo(dates[dates.length - 1]);
  }

  const isFiltered = filteredReports.length !== reports.length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-800 text-white px-6 py-4 shadow">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{patient.name}'s Health Tracker</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              {patient.age}F · Blood Reports · {filteredReports.length}
              {isFiltered ? ` of ${reports.length}` : ''} reports shown
            </p>
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

          {/* Date range */}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Date Range</p>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {isFiltered && (
                <button
                  onClick={resetDateRange}
                  className="text-xs text-blue-500 hover:text-blue-700 font-medium px-2 py-1.5 rounded hover:bg-blue-50 transition-colors"
                >
                  Reset to all
                </button>
              )}
            </div>
          </div>

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
                reports={filteredReports}
                variableKey={v}
                activeProviders={activeProviders}
              />
            ))}
          </div>
        )}

        {/* Reports list */}
        <ReportsList reports={filteredReports} onDeleted={fetchData} />
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
