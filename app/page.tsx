'use client';
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import RatingStars from '../components/RatingStars';

type Attraction = {
  id: string;
  name: string;
  is_active: boolean;
  department?: string;
  block?: string;
};

type Question = {
  id: string;
  label: string;
  sort_order: number;
  is_active: boolean;
};

export default function Page() {
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedAttraction, setSelectedAttraction] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const tapRef = useRef(0);
  const lastTapAt = useRef<number | null>(null);

  useEffect(() => {
    fetchInitial();
    // realtime: refresh questions/attractions when changed (optional, minimal)
    const sub1 = supabase
      .channel('public:meta')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' }, () => fetchQuestions())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attractions' }, () => fetchAttractions())
      .subscribe();
    return () => {
      sub1.unsubscribe();
    };
  }, []);

  async function fetchInitial() {
    await Promise.all([fetchAttractions(), fetchQuestions()]);
  }
  async function fetchAttractions() {
    const { data, error } = await supabase.from('attractions').select('id,name,is_active,department,block').eq('is_active', true).order('name');
    if (error) {
      console.error(error);
      return;
    }
    setAttractions(data ?? []);
    if (data && data.length > 0 && !selectedAttraction) {
      setSelectedAttraction(data[0].id);
    }
  }
  async function fetchQuestions() {
    const { data, error } = await supabase.from('questions').select('id,label,sort_order,is_active').eq('is_active', true).order('sort_order', { ascending: true });
    if (error) {
      console.error(error);
      return;
    }
    setQuestions(data ?? []);
  }

  function setRating(questionId: string, value: number) {
    setRatings(prev => ({ ...prev, [questionId]: value }));
  }

  async function submitResponse() {
    if (!selectedAttraction) return;
    // prepare full ratings: ensure every active question has a numeric value (optional: treat missing as null)
    const payload = { attraction_id: selectedAttraction, ratings, created_at: new Date().toISOString() };
    setLoading(true);
    const { error } = await supabase.from('responses').insert(payload);
    setLoading(false);
    if (error) {
      console.error(error);
      setMessage('送信に失敗しました');
    } else {
      setMessage('送信しました');
      // reset for next
      setRatings({});
      // quick visual reset delay
      setTimeout(() => setMessage(null), 1200);
    }
  }

  async function undoLast() {
    if (!selectedAttraction) return;
    // find last non-excluded response for the selected attraction
    const { data, error } = await supabase
      .from('responses')
      .select('id')
      .eq('attraction_id', selectedAttraction)
      .eq('is_excluded', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) { console.error(error); setMessage('取り消しに失敗'); return; }
    if (!data) { setMessage('取り消す入力がありません'); return; }
    const { error: err2 } = await supabase.from('responses').update({ is_excluded: true }).eq('id', data.id);
    if (err2) { console.error(err2); setMessage('取り消しに失敗'); } else { setMessage('直前入力を取り消しました'); }
    setTimeout(() => setMessage(null), 1200);
  }

  // logo tap handler: 10 taps within 5 seconds unlocks admin
  function onLogoTap() {
    const now = Date.now();
    if (lastTapAt.current && now - lastTapAt.current > 5000) {
      tapRef.current = 0;
    }
    lastTapAt.current = now;
    tapRef.current += 1;
    if (tapRef.current >= 10) {
      try {
        localStorage.setItem('amadeus_unlocked', '1');
      } catch (e) { }
      window.location.href = '/amadeus';
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">天爽祭 投票入力</h1>
          <div onClick={onLogoTap} className="p-2 rounded cursor-pointer select-none">{/* logo placeholder */}
            <div className="text-sm text-gray-500">ロゴ</div>
          </div>
        </header>

        <label className="block mb-2">出し物</label>
        <select className="w-full p-3 mb-4 rounded-md border" value={selectedAttraction ?? ''} onChange={(e) => setSelectedAttraction(e.target.value)}>
          {attractions.map(a => <option key={a.id} value={a.id}>{a.name}{a.department ? ` — ${a.department}` : ''}</option>)}
        </select>

        <div className="space-y-4">
          {questions.map(q => (
            <div key={q.id} className="bg-white p-4 rounded shadow">
              <div className="font-medium mb-2">{q.label}</div>
              <RatingStars value={ratings[q.id] ?? 0} onChange={(v) => setRating(q.id, v)} />
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-4">
          <button className="bg-blue-600 text-white px-5 py-3 rounded-lg flex-1 disabled:opacity-50" disabled={loading} onClick={submitResponse}>
            {loading ? '送信中...' : '送信'}
          </button>
          <button className="bg-red-500 text-white px-4 py-3 rounded-lg" onClick={undoLast}>直前取り消し</button>
        </div>

        {message && <div className="mt-3 text-center text-sm text-gray-700">{message}</div>}
      </div>
    </main>
  );
}
