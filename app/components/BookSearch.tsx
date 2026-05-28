'use client';

import { useState } from 'react';

export interface BookResult {
  olKey:    string;
  title:    string;
  author:   string;
  coverId?: number;
}

interface Props {
  onSelect: (book: BookResult) => void;
  onClose:  () => void;
}

const COVER = (id: number) => `https://covers.openlibrary.org/b/id/${id}-M.jpg`;

export default function BookSearch({ onSelect, onClose }: Props) {
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState<BookResult[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);
  const [failed,   setFailed]   = useState(false);

  async function search() {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setSearched(true);
    setFailed(false);
    try {
      const res  = await fetch(
        `https://openlibrary.org/search.json?title=${encodeURIComponent(q)}&limit=9&fields=key,title,author_name,cover_i`,
      );
      const json = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setResults((json.docs ?? []).map((d: any) => ({
        olKey:   d.key   as string,
        title:   d.title as string,
        author:  Array.isArray(d.author_name) ? (d.author_name as string[])[0] ?? '' : '',
        coverId: typeof d.cover_i === 'number' ? (d.cover_i as number) : undefined,
      })));
    } catch {
      setFailed(true);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="bs-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bs-modal">
        <div className="bs-hd">
          <h2 className="bs-title">Find a Book</h2>
          <button className="bs-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="bs-search-row">
          <input
            className="bs-input"
            placeholder="Search by title…"
            value={query}
            autoFocus
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
          />
          <button className="bs-btn" onClick={search} disabled={loading}>
            {loading ? '…' : 'Search'}
          </button>
        </div>

        {failed && (
          <p className="bs-status bs-status--err">Search failed — check your connection.</p>
        )}
        {!failed && !loading && searched && results.length === 0 && (
          <p className="bs-status">No results found.</p>
        )}
        {loading && <p className="bs-status">Searching…</p>}

        {results.length > 0 && (
          <ul className="bs-results">
            {results.map(r => (
              <li key={r.olKey}>
                <button
                  className="bs-result"
                  onClick={() => { onSelect(r); onClose(); }}
                >
                  <div className="bs-cover-wrap">
                    {r.coverId
                      ? <img src={COVER(r.coverId)} alt="" className="bs-cover-img" loading="lazy" />
                      : <span className="bs-no-cover">📖</span>
                    }
                  </div>
                  <div className="bs-result-info">
                    <span className="bs-result-title">{r.title}</span>
                    {r.author && <span className="bs-result-author">{r.author}</span>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
