import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceArea, Legend,
} from 'recharts';
import {
  buildChartData, getMonthlyTicks, formatMonthYear, formatFullDate,
  getProviderColor, VARIABLE_LABELS,
} from '../utils/dataHelpers.js';

function CustomDot({ cx, cy, payload, dataKey }) {
  const flag = payload[`${dataKey}_flag`];
  const color = flag === 'H' ? '#EF4444' : flag === 'L' ? '#F97316' : '#22C55E';
  if (cx == null || cy == null || payload[dataKey] == null) return null;
  return <circle cx={cx} cy={cy} r={5} fill={color} stroke="#fff" strokeWidth={2} />;
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const dateStr = payload[0]?.payload?.date;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{dateStr ? formatFullDate(dateStr) : ''}</p>
      {payload.map(entry => {
        const flag = entry.payload[`${entry.dataKey}_flag`];
        return (
          <div key={entry.dataKey} className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: entry.color }} />
            <span className="text-gray-600">{entry.dataKey}:</span>
            <span className="font-bold" style={{ color: entry.color }}>{entry.value}</span>
            {flag && (
              <span className={`text-xs font-bold px-1 rounded ${flag === 'H' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                {flag}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function VariableChart({ reports, variableKey, activeProviders }) {
  const [collapsed, setCollapsed] = useState(false);
  const { data, providers } = buildChartData(reports, variableKey, activeProviders);

  if (data.length === 0) return null;

  const sampleReport = reports.find(r => r.variables[variableKey]);
  const { refRangeLow, refRangeHigh, unit } = sampleReport?.variables[variableKey] || {};
  const label = VARIABLE_LABELS[variableKey] || variableKey;

  const allValues = data.flatMap(d => providers.map(p => d[p]).filter(v => v != null));
  const minVal = Math.min(...allValues, refRangeLow ?? Infinity);
  const maxVal = Math.max(...allValues, refRangeHigh ?? -Infinity);
  const pad = (maxVal - minVal) * 0.15 || 1;
  const yMin = Math.max(0, +(minVal - pad).toFixed(2));
  const yMax = +(maxVal + pad).toFixed(2);

  const monthlyTicks = getMonthlyTicks(data);
  const xDomain = monthlyTicks.length >= 2
    ? [monthlyTicks[0], monthlyTicks[monthlyTicks.length - 1]]
    : ['dataMin', 'dataMax'];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer select-none"
        onClick={() => setCollapsed(c => !c)}
      >
        <div>
          <h3 className="font-semibold text-gray-800 text-base">{label}</h3>
          {unit && (
            <p className="text-xs text-gray-400 mt-0.5">
              Unit: {unit}{refRangeLow != null ? ` · Normal: ${refRangeLow}–${refRangeHigh}` : ''}
            </p>
          )}
        </div>
        <button className="text-gray-400 hover:text-gray-600 text-sm px-2 py-1 rounded hover:bg-gray-50 transition-colors">
          {collapsed ? '▼ Show' : '▲ Hide'}
        </button>
      </div>

      {!collapsed && (
        <div className="px-5 pb-5">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              {refRangeLow != null && (
                <ReferenceArea y1={refRangeLow} y2={refRangeHigh} fill="#F0FDF4" fillOpacity={0.6} />
              )}
              <XAxis
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={xDomain}
                ticks={monthlyTicks}
                tickFormatter={formatMonthYear}
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={{ stroke: '#E2E8F0' }}
                tickLine={{ stroke: '#E2E8F0' }}
              />
              <YAxis
                domain={[yMin, yMax]}
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
                width={45}
              />
              <Tooltip content={<CustomTooltip />} />
              {providers.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {providers.map(provider => (
                <Line
                  key={provider}
                  type="monotone"
                  dataKey={provider}
                  stroke={getProviderColor(provider)}
                  strokeWidth={2}
                  dot={(props) => <CustomDot {...props} />}
                  connectNulls={false}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
