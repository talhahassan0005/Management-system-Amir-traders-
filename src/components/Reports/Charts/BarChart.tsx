"use client";
import React from 'react';
import { ResponsiveContainer, BarChart as ReBar, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

interface Props { data: any[]; dataKey?: string; xKey?: string }

export default function BarChart({ data = [], dataKey = 'value', xKey = 'name' }: Props) {
  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <ReBar data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey={dataKey} fill="#3b82f6" />
        </ReBar>
      </ResponsiveContainer>
    </div>
  );
}
