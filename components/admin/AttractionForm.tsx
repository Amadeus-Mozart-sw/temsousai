'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

type Attraction = {
  id?: string;
  name: string;
  group_name?: string;
  room?: string;
  time_slot?: string;
  category?: string;
  department?: string;
  block?: string;
  is_active?: boolean;
};

export default function AttractionForm({ initial, onClose, onSaved }: { initial?: Attraction; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [groupName, setGroupName] = useState(initial?.group_name ?? '');
  const [room, setRoom] = useState(initial?.room ?? '');
  const [timeSlot, setTimeSlot] = useState(initial?.time_slot ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [department, setDepartment] = useState(initial?.department ?? '');
  const [block, setBlock] = useState(initial?.block ?? '');
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [saving, setSaving] = useState(false);

  useEffect(()=>{
    setName(initial?.name ?? '');
    setGroupName(initial?.group_name ?? '');
    setRoom(initial?.room ?? '');
    setTimeSlot(initial?.time_slot ?? '');
    setCategory(initial?.category ?? '');
    setDepartment(initial?.department ?? '');
    setBlock(initial?.block ?? '');
    setIsActive(initial?.is_active ?? true);
  }, [initial]);

  async function handleSave() {
    if (!name.trim()) { alert('出し物名を入力してください'); return; }
    setSaving(true);
    if (initial && initial.id) {
      const { error } = await supabase.from('attractions').update({
        name: name.trim(),
        group_name: groupName.trim(),
        room: room.trim(),
        time_slot: timeSlot.trim(),
        category: category.trim(),
        department: department.trim(),
        block: block.trim(),
        is_active: isActive,
        updated_at: new Date().toISOString()
      }).eq('id', initial.id);
      setSaving(false);
      if (error) { console.error(error); alert('保存に失敗しました'); return; }
      onSaved();
    } else {
      const { error } = await supabase.from('attractions').insert({
        name: name.trim(),
        group_name: groupName.trim(),
        room: room.trim(),
        time_slot: timeSlot.trim(),
        category: category.trim(),
        department: department.trim(),
        block: block.trim(),
        is_active: isActive,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      setSaving(false);
      if (error) { console.error(error); alert('作成に失敗しました'); return; }
      onSaved();
    }
  }

  return (
    <div className="fixed left-0 top-0 w-full h-full flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-black opacity-30" onClick={onClose}></div>
      <div className="relative bg-white rounded p-6 w-full max-w-lg shadow-lg">
        <h3 className="text-lg font-semibold mb-4">{initial ? '出し物を編集' : '出し物を作成'}</h3>

        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="block text-sm mb-1">名称</label>
            <input value={name} onChange={(e)=>setName(e.target.value)} className="w-full border rounded p-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">団体名</label>
            <input value={groupName} onChange={(e)=>setGroupName(e.target.value)} className="w-full border rounded p-2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">場所</label>
              <input value={room} onChange={(e)=>setRoom(e.target.value)} className="w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm mb-1">時間帯</label>
              <input value={timeSlot} onChange={(e)=>setTimeSlot(e.target.value)} className="w-full border rounded p-2" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">部門</label>
              <input value={department} onChange={(e)=>setDepartment(e.target.value)} className="w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm mb-1">ブロック</label>
              <input value={block} onChange={(e)=>setBlock(e.target.value)} className="w-full border rounded p-2" />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">カテゴリ</label>
            <input value={category} onChange={(e)=>setCategory(e.target.value)} className="w-full border rounded p-2" />
          </div>

          <div className="flex items-center gap-2">
            <input id="active" type="checkbox" checked={isActive} onChange={(e)=>setIsActive(e.target.checked)} />
            <label htmlFor="active" className="text-sm">有効にする</label>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button className="px-3 py-1 rounded border" onClick={onClose} disabled={saving}>キャンセル</button>
          <button className="px-4 py-1 bg-blue-600 text-white rounded" onClick={handleSave} disabled={saving}>{saving ? '保存中...' : '保存'}</button>
        </div>
      </div>
    </div>
  );
}
