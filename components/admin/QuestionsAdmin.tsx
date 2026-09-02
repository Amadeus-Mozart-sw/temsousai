'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import QuestionForm from './QuestionForm';

type Question = {
  id: string;
  label: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export default function QuestionsAdmin() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editing, setEditing] = useState<Question | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchQuestions();

    // Realtime subscription to auto-refresh when questions change
    const channel = supabase
      .channel('public:questions_admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' }, () => {
        fetchQuestions();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  async function fetchQuestions() {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) {
      console.error(error);
      setMsg('設問の読み込みに失敗しました');
      return;
    }
    setQuestions(data ?? []);
  }

  function openNew() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(q: Question) {
    setEditing(q);
    setShowForm(true);
  }

  async function doDelete(id: string) {
    if (!confirm('設問を無効化します。よろしいですか？（物理削除は行いません）')) return;
    setLoading(true);
    const { error } = await supabase.from('questions').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', id);
    setLoading(false);
    if (error) { console.error(error); setMsg('無効化に失敗しました'); } else { setMsg('無効化しました'); }
    setTimeout(()=>setMsg(null), 1500);
  }

  async function onSave(saved: Question) {
    setShowForm(false);
    // refetch happens via realtime, but we can optimistically update
    fetchQuestions();
  }

  // simple swap sort_order with neighbor
  async function move(id: string, direction: 'up' | 'down') {
    const idx = questions.findIndex(q => q.id === id);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;

    const a = questions[idx];
    const b = questions[targetIdx];

    setLoading(true);
    // swap sort_order
    const updates = [
      supabase.from('questions').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('questions').update({ sort_order: a.sort_order }).eq('id', b.id)
    ];
    const results = await Promise.all(updates);
    setLoading(false);
    const errs = results.map(r => (r as any).error).filter(Boolean);
    if (errs.length) {
      console.error(errs);
      setMsg('並び替えに失敗しました');
    } else {
      setMsg('並び替えました');
      fetchQuestions();
    }
    setTimeout(()=>setMsg(null), 1200);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">設問一覧</h2>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={openNew}>＋ 新規作成</button>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {questions.map((q, i) => (
          <div key={q.id} className="bg-white p-3 rounded shadow flex items-start justify-between">
            <div>
              <div className="font-medium">{q.label} {q.is_active ? <span className="text-sm text-green-600 ml-2">有効</span> : <span className="text-sm text-gray-500 ml-2">無効</span>}</div>
              {q.description && <div className="text-sm text-gray-600">{q.description}</div>}
              <div className="text-xs text-gray-400 mt-1">sort: {q.sort_order}</div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-2">
                <button className="px-2 py-1 bg-white border rounded" onClick={() => move(q.id, 'up')} disabled={i===0 || loading}>▲</button>
                <button className="px-2 py-1 bg-white border rounded" onClick={() => move(q.id, 'down')} disabled={i===questions.length-1 || loading}>▼</button>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={() => openEdit(q)}>編集</button>
                <button className="px-3 py-1 bg-red-500 text-white rounded" onClick={() => doDelete(q.id)}>無効化</button>
              </div>
            </div>
          </div>
        ))}
        {questions.length === 0 && <div className="p-4 bg-white rounded shadow text-gray-500">設問がありません。新規作成してください。</div>}
      </div>

      {showForm && <QuestionForm initial={editing ?? undefined} onClose={() => setShowForm(false)} onSaved={onSave} />}

      {msg && <div className="text-center text-sm text-gray-700">{msg}</div>}
    </div>
  );
}
