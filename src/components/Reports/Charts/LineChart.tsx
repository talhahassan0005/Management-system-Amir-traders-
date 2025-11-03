"use client";
import React from 'react';
import { ResponsiveContainer, LineChart as ReLine, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

interface Props { data: any[]; dataKey?: string; xKey?: string }

export default function LineChart({ data = [], dataKey = 'value', xKey = 'name' }: Props) {
  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <ReLine data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey={dataKey} stroke="#10b981" />
        </ReLine>
      </ResponsiveContainer>
    </div>
  );
}
