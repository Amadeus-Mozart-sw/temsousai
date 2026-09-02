'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

type ResponseRow = {
  id: string;
  attraction_id: string;
  ratings: Record<string, number>;
  is_excluded: boolean;
  created_at: string;
  attractions?: { name?: string };
};

export default function ResponsesAdmin() {
  const [rows, setRows] = useState<ResponseRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [attractionFilter, setAttractionFilter] = useState<string>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => { fetchPage(); }, [page]);

  async function fetchPage() {
    setLoading(true);
    let q = supabase.from('responses').select('id,attraction_id,ratings,is_excluded,created_at,attractions(name)').order('created_at', { ascending: false }).range((page-1)*pageSize, page*pageSize -1);
    if (attractionFilter) q = q.eq('attraction_id', attractionFilter);
    if (from) q = q.gte('created_at', from);
    if (to) q = q.lte('created_at', to);
    const { data, error } = await q;
    setLoading(false);
    if (error) { console.error(error); return; }
    setRows(data ?? []);
  }

  async function toggleExclude(id: string, current: boolean) {
    const { error } = await supabase.from('responses').update({ is_excluded: !current }).eq('id', id);
    if (error) { console.error(error); alert('更新に失敗'); return; }
    fetchPage();
  }

  function exportCsv() {
    const params = new URLSearchParams();
    if (attractionFilter) params.set('attraction_id', attractionFilter);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    params.set('limit', '1000');
    const url = `/api/export-responses?` + params.toString();
    window.open(url, '_blank');
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">回答一覧</h2>
        <div className="flex gap-2">
          <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={exportCsv}>CSV エクスポート (絞込)</button>
        </div>
      </div>

      <div className="mb-3 flex gap-2">
        <input placeholder="出し物IDで絞込" value={attractionFilter} onChange={(e)=>setAttractionFilter(e.target.value)} className="p-2 border rounded" />
        <input type="datetime-local" value={from} onChange={(e)=>setFrom(e.target.value)} className="p-2 border rounded" />
        <input type="datetime-local" value={to} onChange={(e)=>setTo(e.target.value)} className="p-2 border rounded" />
        <button className="px-3 py-1 bg-white border rounded" onClick={()=>{ setPage(1); fetchPage(); }}>検索</button>
      </div>

      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.id} className="bg-white p-3 rounded shadow flex items-start justify-between">
            <div>
              <div className="text-sm text-gray-700">ID: {r.id}</div>
              <div className="font-medium">{r.attractions?.name ?? r.attraction_id} <span className="text-xs text-gray-400">{r.created_at}</span></div>
              <div className="text-xs text-gray-600 mt-1">{Object.entries(r.ratings || {}).map(([k,v])=>`${k}:${v}`).join(', ')}</div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="text-sm">{r.is_excluded ? <span className="text-red-600">除外</span> : <span className="text-green-600">有効</span>}</div>
              <div>
                <button className="px-3 py-1 bg-white border rounded mr-2" onClick={()=>toggleExclude(r.id, r.is_excluded)}>{r.is_excluded ? '再有効化' : '除外'}</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mt-4">
        <button className="px-3 py-1 border rounded" onClick={()=>{ if (page>1) setPage(p=>p-1); }}>前へ</button>
        <div>ページ {page}</div>
        <button className="px-3 py-1 border rounded" onClick={()=>setPage(p=>p+1)}>次へ</button>
      </div>
    </div>
  );
}
