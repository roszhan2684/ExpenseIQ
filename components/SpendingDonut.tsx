'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CATEGORY_COLORS } from '@/lib/types';

interface Props {
  data: { name: string; value: number }[];
  currencySymbol: string;
}

export default function SpendingDonut({ data, currencySymbol }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-400 dark:text-zinc-600 text-sm">
        No transactions this month
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={110}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry) => (
            <Cell
              key={entry.name}
              fill={CATEGORY_COLORS[entry.name] ?? '#94a3b8'}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [`${currencySymbol}${Number(value).toFixed(2)}`, 'Spent']}
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid #e4e4e7',
            fontSize: '12px',
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span style={{ fontSize: '12px', color: 'currentColor' }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
