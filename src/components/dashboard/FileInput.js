'use client';

import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';

export default function FileInput({
  accept,
  onChange,
  disabled = false,
  placeholder = 'Belum ada file dipilih',
  className = '',
}) {
  const inputRef = useRef(null);
  const [fileName, setFileName] = useState('');

  const handleSelect = (e) => {
    const file = e.target.files?.[0] || null;
    setFileName(file ? file.name : '');
    onChange?.(e);
  };

  const handleClear = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setFileName('');
    if (inputRef.current) inputRef.current.value = '';
    onChange?.({ target: { files: null } });
  };

  const handleClick = () => {
    if (!disabled) inputRef.current?.click();
  };

  return (
    <div
      className={`file-input-wrapper ${className}`}
      style={{
        display: 'flex',
        alignItems: 'stretch',
        width: '100%',
        height: '48px',
        border: '2px dashed var(--border)',
        borderRadius: 'var(--radius)',
        background: 'var(--surface)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
        transition: 'box-shadow 0.12s ease, transform 0.12s ease, border-style 0.12s ease',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
      onClick={handleClick}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
          e.currentTarget.style.borderStyle = 'solid';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
          e.currentTarget.style.borderStyle = 'dashed';
        }
      }}
      onMouseDown={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translate(1px, 1px)';
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
      onMouseUp={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = '';
          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleSelect}
        disabled={disabled}
        style={{ display: 'none' }}
      />

      {/* Custom button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '0 16px',
          background: 'var(--foreground)',
          color: 'var(--background)',
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-xs)',
          fontWeight: 'var(--weight-bold)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          borderRight: '2px solid var(--border)',
          flexShrink: 0,
          whiteSpace: 'nowrap',
          userSelect: 'none',
        }}
      >
        <Upload className="w-3.5 h-3.5" />
        PILIH FILE
      </div>

      {/* Filename or placeholder */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flex: 1,
          minWidth: 0,
          padding: '0 var(--space-3)',
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--weight-bold)',
          color: fileName ? 'var(--foreground)' : 'var(--muted)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {fileName || placeholder}
      </div>

      {/* Clear button */}
      {fileName && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 12px',
            background: 'transparent',
            border: 'none',
            borderLeft: '2px solid var(--border-muted)',
            cursor: 'pointer',
            color: 'var(--muted)',
            flexShrink: 0,
          }}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
