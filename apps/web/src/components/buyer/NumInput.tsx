'use client';
import { useRef, useEffect } from 'react';

interface Props {
  value: string | number;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function NumInput({ value, onChange, placeholder, disabled, className }: Props) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current) {
      const n = String(value||'').replace(/,/g,'');
      ref.current.value = n && !isNaN(Number(n)) ? Number(n).toLocaleString() : n;
    }
  }, [value]);

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      disabled={disabled}
      placeholder={placeholder}
      defaultValue={(() => { const n = String(value||'').replace(/,/g,''); return n && !isNaN(Number(n)) ? Number(n).toLocaleString() : n; })()}
      onFocus={e => { e.target.value = String(value||'').replace(/,/g,''); }}
      onBlur={e => { const raw = e.target.value.replace(/,/g,''); onChange(raw); e.target.value = raw && !isNaN(Number(raw)) ? Number(raw).toLocaleString() : raw; }}
      className={className || "w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"}
    />
  );
}
