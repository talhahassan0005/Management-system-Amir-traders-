"use client";
import React from 'react';
import { ResponsiveContainer, PieChart as RePie, Pie, Cell, Tooltip, Legend } from 'recharts';

const COLORS = ['#6366f1', '#ef4444', '#f59e0b', '#10b981', '#3b82f6'];

interface Props { data: any[]; dataKey?: string; nameKey?: string }

export default function PieChart({ data = [], dataKey = 'value', nameKey = 'name' }: Props) {
  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <RePie>
          <Pie data={data} dataKey={dataKey} nameKey={nameKey} outerRadius={100} fill="#8884d8">
            {data.map((_, i) => (
              <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </RePie>
      </ResponsiveContainer>
    </div>
  );
}
