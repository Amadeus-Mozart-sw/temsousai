'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AttractionForm from './AttractionForm';

type Attraction = {
  id: string;
  name: string;
  group_name?: string;
  room?: string;
  time_slot?: string;
  category?: string;
  department?: string;
  block?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export default function AttractionsAdmin() {
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [editing, setEditing] = useState<Attraction | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState({ q: '', department: '', block: '' });

  useEffect(() => {
    fetchAttractions();
    const channel = supabase
      .channel('public:attractions_admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attractions' }, () => fetchAttractions())
      .subscribe();
    return () => channel.unsubscribe();
  }, []);

  async function fetchAttractions() {
    let query = supabase.from('attractions').select('*').order('name', { ascending: true });
    if (filter.q) {
      query = query.ilike('name', `%${filter.q}%`);
    }
    if (filter.department) {
      query = query.eq('department', filter.department);
    }
    if (filter.block) {
      query = query.eq('block', filter.block);
    }
    const { data, error } = await query;
    if (error) { console.error(error); setMsg('読み込みに失敗'); return; }
    setAttractions(data ?? []);
  }

  function openNew() { setEditing(null); setShowForm(true); }
  function openEdit(a: Attraction) { setEditing(a); setShowForm(true); }

  async function doDisable(id: string) {
    if (!confirm('この出し物を無効化します。よろしいですか？')) return;
    setLoading(true);
    const { error } = await supabase.from('attractions').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', id);
    setLoading(false);
    if (error) { console.error(error); setMsg('無効化に失敗'); } else { setMsg('無効化しました'); }
    setTimeout(()=>setMsg(null), 1500);
  }

  async function onSaved() { setShowForm(false); fetchAttractions(); }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">出し物一覧</h2>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={openNew}>＋ 新規作成</button>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <input className="p-2 border rounded flex-1" placeholder="名前で検索" value={filter.q} onChange={(e)=>setFilter(f=>({...f, q: e.target.value}))} />
        <input className="p-2 border rounded" placeholder="部門" value={filter.department} onChange={(e)=>setFilter(f=>({...f, department: e.target.value}))} />
        <input className="p-2 border rounded" placeholder="ブロック" value={filter.block} onChange={(e)=>setFilter(f=>({...f, block: e.target.value}))} />
        <button className="px-3 py-1 bg-white border rounded" onClick={()=>fetchAttractions()}>検索</button>
      </div>

      <div className="space-y-3">
        {attractions.map(a => (
          <div key={a.id} className="bg-white p-3 rounded shadow flex items-start justify-between">
            <div>
              <div className="font-medium">{a.name} {a.is_active ? <span className="text-sm text-green-600 ml-2">有効</span> : <span className="text-sm text-gray-500 ml-2">無効</span>}</div>
              <div className="text-sm text-gray-600">{a.group_name}{a.room ? ` — ${a.room}` : ''}{a.time_slot ? ` — ${a.time_slot}` : ''}</div>
              <div className="text-xs text-gray-400 mt-1">{a.department ?? ''} / {a.block ?? ''}</div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={()=>openEdit(a)}>編集</button>
                <button className="px-3 py-1 bg-red-500 text-white rounded" onClick={()=>doDisable(a.id)}>無効化</button>
              </div>
            </div>
          </div>
        ))}
        {attractions.length === 0 && <div className="p-4 bg-white rounded shadow text-gray-500">出し物が見つかりません</div>}
      </div>

      {showForm && <AttractionForm initial={editing ?? undefined} onClose={()=>setShowForm(false)} onSaved={onSaved} />}

      {msg && <div className="text-center text-sm text-gray-700 mt-3">{msg}</div>}
    </div>
  );
}
