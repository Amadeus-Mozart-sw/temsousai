'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

type StatRow = {
  attraction_id: string;
  response_count: number;
  total_score_sum: number;
  average_score: number;
  ratings_sum: Record<string, number>;
  ratings_count: Record<string, number>;
  updated_at: string;
  attractions?: { name?: string, department?: string, block?: string };
};

export default function StatsAdmin() {
  const [rows, setRows] = useState<StatRow[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [blockFilter, setBlockFilter] = useState('');

  useEffect(()=>{ fetchStats(); }, []);

  async function fetchStats() {
    let q = supabase.from('attraction_stats').select('*,attractions(name,department,block)').order('average_score', { ascending: false }).limit(200);
    if (departmentFilter) q = q.eq('attractions.department', departmentFilter);
    if (blockFilter) q = q.eq('attractions.block', blockFilter);
    const { data, error } = await q;
    if (error) { console.error(error); return; }
    setRows(data ?? []);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">集計・ランキング</h2>
        <div className="flex gap-2">
          <input placeholder="部門で絞込" value={departmentFilter} onChange={(e)=>setDepartmentFilter(e.target.value)} className="p-2 border rounded" />
          <input placeholder="ブロックで絞込" value={blockFilter} onChange={(e)=>setBlockFilter(e.target.value)} className="p-2 border rounded" />
          <button className="px-3 py-1 bg-white border rounded" onClick={fetchStats}>更新</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded shadow">
          <thead>
            <tr className="text-left">
              <th className="p-2">順位</th>
              <th className="p-2">出し物</th>
              <th className="p-2">部門/ブロック</th>
              <th className="p-2">回答数</th>
              <th className="p-2">平均</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.attraction_id} className="border-t">
                <td className="p-2 align-top">{i+1}</td>
                <td className="p-2">{r.attractions?.name ?? r.attraction_id}</td>
                <td className="p-2">{r.attractions?.department ?? ''} / {r.attractions?.block ?? ''}</td>
                <td className="p-2">{r.response_count}</td>
                <td className="p-2">{Number(r.average_score).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
