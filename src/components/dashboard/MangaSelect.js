'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, ChevronDown, Loader2, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MangaSelect({
  value = '',
  onChange,
  fetchManga,
  placeholder = 'Cari manga...',
  disabled = false,
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [selectedItem, setSelectedItem] = useState(null);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  const search = useCallback(
    (q) => {
      setLoading(true);
      fetchManga({ q })
        .then((res) => {
          const items = res?.items || [];
          setResults(items);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    },
    [fetchManga]
  );

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open, search]);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectManga = (item) => {
    if (!item) return;
    onChange(String(item.id));
    setSelectedItem(item);
    setQuery('');
    setHighlightIndex(-1);
    setOpen(false);
  };

  const clearSelection = () => {
    onChange('');
    setSelectedItem(null);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0 && results[highlightIndex]) {
        selectManga(results[highlightIndex]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="manga-select" style={{ position: 'relative' }}>
      <div
        className="manga-select__field"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          minHeight: '44px',
          padding: '6px 10px',
          border: 'var(--border-width) solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--surface-raised)',
          cursor: 'text',
        }}
        onClick={() => {
          if (!disabled) {
            setOpen(true);
            inputRef.current?.focus();
          }
        }}
      >
        {selectedItem ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
              {selectedItem.cover_manga && (
                <img
                  src={selectedItem.cover_manga}
                  alt=""
                  className="w-6 h-8 object-cover rounded flex-shrink-0"
                  style={{ border: '1px solid var(--border-muted)' }}
                  loading="lazy"
                />
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    fontFamily: 'var(--font-body)',
                    color: 'var(--foreground)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {selectedItem.judul_manga}
                </div>
                <div
                  style={{
                    fontSize: '0.7rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--muted)',
                  }}
                >
                  ID: {selectedItem.id}
                  {selectedItem.type_manga ? ` · ${selectedItem.type_manga}` : ''}
                </div>
              </div>
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearSelection();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </>
        ) : (
          <>
            <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--muted)' }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
                setHighlightIndex(-1);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '0.875rem',
                fontFamily: 'var(--font-body)',
                color: 'var(--foreground)',
                minWidth: '60px',
              }}
              suppressHydrationWarning
            />
            {loading && <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: 'var(--muted)' }} />}
            {!loading && (
              <ChevronDown
                className="w-4 h-4 flex-shrink-0"
                style={{ color: 'var(--muted)', cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!disabled) {
                    setOpen((o) => !o);
                    inputRef.current?.focus();
                  }
                }}
              />
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {open && !disabled && !selectedItem && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="manga-select__dropdown"
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 50,
              marginTop: '4px',
              background: 'var(--surface-raised)',
              border: 'var(--border-width) solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow-lg)',
              maxHeight: '320px',
              overflowY: 'auto',
            }}
          >
            {results.length === 0 && !loading && (
              <div
                style={{
                  padding: '12px 16px',
                  fontSize: '0.8rem',
                  color: 'var(--muted)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {query.trim() ? `Tidak ada manga "${query.trim()}".` : 'Ketik untuk mencari manga...'}
              </div>
            )}
            {results.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectManga(item)}
                onMouseEnter={() => setHighlightIndex(i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  borderBottom: '1px solid var(--border-muted)',
                  background: i === highlightIndex ? 'var(--muted-bg)' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {item.cover_manga && (
                  <img
                    src={item.cover_manga}
                    alt=""
                    className="w-7 h-10 object-cover rounded flex-shrink-0"
                    style={{ border: '1px solid var(--border-muted)' }}
                    loading="lazy"
                  />
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      fontFamily: 'var(--font-body)',
                      color: 'var(--foreground)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.judul_manga}
                  </div>
                  <div
                    style={{
                      fontSize: '0.7rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--muted)',
                      display: 'flex',
                      gap: '6px',
                      alignItems: 'center',
                    }}
                  >
                    <span>ID: {item.id}</span>
                    {item.type_manga && <span>· {item.type_manga}</span>}
                    {item.author && (
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        · {item.author}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
