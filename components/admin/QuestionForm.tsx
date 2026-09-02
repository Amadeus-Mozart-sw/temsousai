'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

type Question = {
  id?: string;
  label: string;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
};

export default function QuestionForm({ initial, onClose, onSaved }: { initial?: Question; onClose: () => void; onSaved: (q: any) => void }) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);

  useEffect(() => {
    setLabel(initial?.label ?? '');
    setDescription(initial?.description ?? '');
    setIsActive(initial?.is_active ?? true);
  }, [initial]);

  async function handleSave() {
    if (!label.trim()) { alert('項目名を入力してください'); return; }
    setSaving(true);
    if (initial && initial.id) {
      const { error, data } = await supabase.from('questions').update({
        label: label.trim(),
        description: description.trim(),
        is_active: isActive,
        updated_at: new Date().toISOString()
      }).eq('id', initial.id).select().maybeSingle();
      setSaving(false);
      if (error) { console.error(error); alert('保存に失敗しました'); return; }
      onSaved(data);
    } else {
      // determine max sort_order + 1
      const { data: maxRow } = await supabase.from('questions').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle();
      const nextOrder = maxRow ? (maxRow.sort_order ?? 0) + 1 : 1;
      const { error, data } = await supabase.from('questions').insert({
        label: label.trim(),
        description: description.trim(),
        is_active: isActive,
        sort_order: nextOrder,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).select().maybeSingle();
      setSaving(false);
      if (error) { console.error(error); alert('作成に失敗しました'); return; }
      onSaved(data);
    }
  }

  return (
    <div className="fixed left-0 top-0 w-full h-full flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-black opacity-30" onClick={onClose}></div>
      <div className="relative bg-white rounded p-6 w-full max-w-lg shadow-lg">
        <h3 className="text-lg font-semibold mb-4">{initial ? '設問を編集' : '設問を作成'}</h3>

        <div className="mb-3">
          <label className="block text-sm mb-1">項目名</label>
          <input value={label} onChange={(e)=>setLabel(e.target.value)} className="w-full border rounded p-2" />
        </div>

        <div className="mb-3">
          <label className="block text-sm mb-1">説明（任意）</label>
          <textarea value={description} onChange={(e)=>setDescription(e.target.value)} className="w-full border rounded p-2" rows={3} />
        </div>

        <div className="mb-4 flex items-center gap-2">
          <input id="active" type="checkbox" checked={isActive} onChange={(e)=>setIsActive(e.target.checked)} />
          <label htmlFor="active" className="text-sm">有効にする</label>
        </div>

        <div className="flex justify-end gap-2">
          <button className="px-3 py-1 rounded border" onClick={onClose} disabled={saving}>キャンセル</button>
          <button className="px-4 py-1 bg-blue-600 text-white rounded" onClick={handleSave} disabled={saving}>{saving ? '保存中...' : '保存'}</button>
        </div>
      </div>
    </div>
  );
}
