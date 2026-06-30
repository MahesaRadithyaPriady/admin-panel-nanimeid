'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, ChevronDown, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GenreSelect({
  value = '',
  onChange,
  fetchGenres,
  placeholder = 'Cari genre...',
  disabled = false,
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const skipNextFetch = useRef(false);

  const selected = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const search = useCallback(
    (q) => {
      if (skipNextFetch.current) {
        skipNextFetch.current = false;
        return;
      }
      setLoading(true);
      fetchGenres({ q })
        .then((res) => {
          const genres = res?.data?.genres || res?.genres || [];
          setResults(genres.map((g) => g.genre || g.genreRaw || g));
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    },
    [fetchGenres]
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

  const addGenre = (genre) => {
    if (!genre || selected.includes(genre)) return;
    const next = [...selected, genre].join(', ');
    skipNextFetch.current = true;
    onChange(next);
    setQuery('');
    setHighlightIndex(-1);
    inputRef.current?.focus();
  };

  const removeGenre = (genre) => {
    const next = selected.filter((g) => g !== genre).join(', ');
    skipNextFetch.current = true;
    onChange(next);
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
        addGenre(results[highlightIndex]);
      } else if (query.trim() && !selected.includes(query.trim())) {
        addGenre(query.trim());
      }
    } else if (e.key === 'Backspace' && !query && selected.length > 0) {
      removeGenre(selected[selected.length - 1]);
    }
  };

  const filteredResults = results.filter((g) => !selected.includes(g));

  return (
    <div ref={containerRef} className="genre-select" style={{ position: 'relative' }}>
      <div
        className="genre-select__field"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          alignItems: 'center',
          minHeight: '44px',
          padding: '6px 8px',
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
        {selected.map((genre) => (
          <span
            key={genre}
            className="genre-tag"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              background: 'var(--muted-bg)',
              border: '1px solid var(--border-muted)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              fontWeight: 600,
              fontFamily: 'var(--font-body)',
              color: 'var(--foreground)',
            }}
          >
            {genre}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeGenre(genre);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  padding: 0,
                }}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: '80px', position: 'relative' }}>
          <Search
            className="w-3.5 h-3.5"
            style={{ color: 'var(--muted)', position: 'absolute', left: 0, pointerEvents: 'none' }}
          />
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
            placeholder={selected.length === 0 ? placeholder : ''}
            disabled={disabled}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '0.875rem',
              fontFamily: 'var(--font-body)',
              color: 'var(--foreground)',
              paddingLeft: '20px',
              minWidth: '60px',
            }}
            suppressHydrationWarning
          />
          {loading && (
            <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--muted)' }} />
          )}
          {!loading && (
            <ChevronDown
              className="w-3.5 h-3.5"
              style={{ color: 'var(--muted)', cursor: 'pointer', flexShrink: 0 }}
              onClick={(e) => {
                e.stopPropagation();
                if (!disabled) {
                  setOpen((o) => !o);
                  inputRef.current?.focus();
                }
              }}
            />
          )}
        </div>
      </div>

      <AnimatePresence>
        {open && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="genre-select__dropdown"
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
              maxHeight: '240px',
              overflowY: 'auto',
            }}
          >
            {filteredResults.length === 0 && !loading && (
              <div
                style={{
                  padding: '12px 16px',
                  fontSize: '0.8rem',
                  color: 'var(--muted)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {query.trim()
                  ? `Tidak ada genre "${query.trim()}". Tekan Enter untuk menambahkan.`
                  : 'Ketik untuk mencari genre...'}
              </div>
            )}
            {filteredResults.map((genre, i) => (
              <button
                key={genre}
                type="button"
                onClick={() => addGenre(genre)}
                onMouseEnter={() => setHighlightIndex(i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '8px 16px',
                  border: 'none',
                  borderBottom: '1px solid var(--border-muted)',
                  background: i === highlightIndex ? 'var(--muted-bg)' : 'transparent',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontFamily: 'var(--font-body)',
                  color: 'var(--foreground)',
                  textAlign: 'left',
                }}
              >
                {genre}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
