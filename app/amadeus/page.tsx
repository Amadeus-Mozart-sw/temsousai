'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import QuestionsAdmin from '../../components/admin/QuestionsAdmin';
import AttractionsAdmin from '../../components/admin/AttractionsAdmin';
import ResponsesAdmin from '../../components/admin/ResponsesAdmin';
import StatsAdmin from '../../components/admin/StatsAdmin';

export default function AdminPage() {
  const [tab, setTab] = useState<'questions' | 'attractions' | 'responses' | 'stats'>('questions');
  const router = useRouter();

  useEffect(() => {
    // client-side guard: require localStorage flag set by input-page logo tap
    try {
      const unlocked = typeof window !== 'undefined' && localStorage.getItem('amadeus_unlocked') === '1';
      if (!unlocked) {
        router.replace('/');
      }
    } catch (e) {
      // if any error, be conservative and redirect
      router.replace('/');
    }
  }, [router]);

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">天爽祭 管理画面（隠し /amadeus）</h1>
          <div className="space-x-2">
            <button className={`px-3 py-1 rounded ${tab==='questions' ? 'bg-blue-600 text-white' : 'bg-white'}`} onClick={() => setTab('questions')}>設問</button>
            <button className={`px-3 py-1 rounded ${tab==='attractions' ? 'bg-blue-600 text-white' : 'bg-white'}`} onClick={() => setTab('attractions')}>出し物</button>
            <button className={`px-3 py-1 rounded ${tab==='responses' ? 'bg-blue-600 text-white' : 'bg-white'}`} onClick={() => setTab('responses')}>回答一覧</button>
            <button className={`px-3 py-1 rounded ${tab==='stats' ? 'bg-blue-600 text-white' : 'bg-white'}`} onClick={() => setTab('stats')}>集計</button>
          </div>
        </header>

        <section>
          {tab === 'questions' && <QuestionsAdmin />}
          {tab === 'attractions' && <AttractionsAdmin />}
          {tab === 'responses' && <ResponsesAdmin />}
          {tab === 'stats' && <StatsAdmin />}
        </section>
      </div>
    </main>
  );
}
