'use client';
import React from 'react';

export default function RatingStars({ value = 0, onChange }: { value?: number; onChange: (v: number) => void }) {
  const stars = [1,2,3,4,5];
  return (
    <div className="flex gap-2">
      {stars.map((s) => (
        <button
          key={s}
          aria-label={`${s} stars`}
          className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${s <= value ? 'text-yellow-400' : 'text-gray-300'} bg-white shadow`}
          onClick={() => onChange(s)}
        >
          ★
        </button>
      ))}
    </div>
  );
}
