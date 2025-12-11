import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { toNumber, safe } from '../../utils/normalize';

interface SafePieProps {
  data: { name: string; receita: any }[];
  colors: string[];
}

const CustomTooltip: React.FC<any> = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const totalPercent = (data.percent * 100).toFixed(1);
        return (
            <div className="bg-white p-3 border rounded-lg shadow-sm text-sm">
                <p className="font-bold text-slate-800 mb-1" style={{ color: payload[0].payload.fill }}>{data.name}</p>
                <p className="text-slate-600">
                    <span className="font-semibold">Receita:</span> {toNumber(data.receita).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <p className="text-slate-600">
                    <span className="font-semibold">Percentual:</span> {totalPercent}%
                </p>
            </div>
        );
    }
    return null;
};


const SafePie: React.FC<SafePieProps> = ({ data, colors }) => {
  // FIX: Explicitly type the 'd' parameter in the map function to correct a type inference issue where 'd' was being treated as 'unknown'.
  const rows = safe(data)
    .map((d: { name: string; receita: any }) => ({ ...d, receita: toNumber(d.receita) }))
    .filter(d => d.receita > 0);

  if (!rows.length) {
    return <div className="grid h-64 place-items-center text-sm text-slate-500">Sem dados suficientes para exibir o gráfico.</div>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie 
            data={rows} 
            dataKey="receita" 
            nameKey="name" 
            outerRadius={80} 
            labelLine={false}
            label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
            fontSize={12}
          >
            {rows.map((_, i) => <Cell key={`cell-${i}`} fill={colors[i % colors.length]} />)}
          </Pie>
          <Legend verticalAlign="bottom" height={24} iconSize={10} />
          <Tooltip 
            content={<CustomTooltip />}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default SafePie;