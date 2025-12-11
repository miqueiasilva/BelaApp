import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { toNumber, safe } from '../../utils/normalize';

interface SafeBarProps {
    data: { name: string; ocupacao: any; minutosOcupados: any }[];
    color: string;
}

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const horasOcupadas = (toNumber(data.minutosOcupados) / 60).toFixed(1);

    return (
      <div className="bg-white p-3 border rounded-lg shadow-sm text-sm">
        <p className="font-bold text-slate-800 mb-1">{label}</p>
        <p className="text-slate-600">
          <span className="font-semibold" style={{color: payload[0].color}}>Ocupação:</span> {toNumber(data.ocupacao).toFixed(1)}%
        </p>
        <p className="text-slate-600">
          <span className="font-semibold">Tempo:</span> {horasOcupadas}h de 8h
        </p>
      </div>
    );
  }
  return null;
};

const SafeBar: React.FC<SafeBarProps> = ({ data, color }) => {
  // FIX: Explicitly type the 'd' parameter in the map function to correct a type inference issue where 'd' was being treated as 'unknown'.
  const rows = safe(data)
    .map((d: { name: string; ocupacao: any; minutosOcupados: any; }) => ({ ...d, ocupacao: Math.max(0, Math.min(100, toNumber(d.ocupacao))), minutosOcupados: toNumber(d.minutosOcupados) }));

  if (!rows.length) {
    return <div className="grid h-64 place-items-center text-sm text-slate-500">Sem dados suficientes para exibir o gráfico.</div>;
  }

  return (
    <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false}/>
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`}/>
                <Tooltip 
                    cursor={{fill: '#f1f5f9'}} 
                    content={<CustomTooltip />}
                />
                <Bar dataKey="ocupacao" fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    </div>
  );
}

export default SafeBar;