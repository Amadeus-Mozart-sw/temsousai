'use client';
import React, { useState } from 'react';
import QuestionsAdmin from '../../components/admin/QuestionsAdmin';

export default function AdminPage() {
  const [tab, setTab] = useState<'questions' | 'attractions' | 'responses' | 'stats'>('questions');

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
          {tab === 'attractions' && <div className="p-6 bg-white rounded shadow">出し物管理（次フェーズで実装）</div>}
          {tab === 'responses' && <div className="p-6 bg-white rounded shadow">回答一覧（次フェーズで実装）</div>}
          {tab === 'stats' && <div className="p-6 bg-white rounded shadow">集計（次フェーズで実装）</div>}
        </section>
      </div>
    </main>
  );
}
