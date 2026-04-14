'use client';

import { useState, useRef, useCallback, useId } from 'react';
import { Transaction, DEFAULT_CATEGORIES } from '@/lib/types';

interface ParsedTx {
  _key: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  selected: boolean;
}

interface Props {
  currencySymbol: string;
  onImport: (transactions: Transaction[]) => void;
  onClose: () => void;
}

type Step = 'upload' | 'parsing' | 'preview' | 'importing' | 'done';

let keyCounter = 0;
const nextKey = () => String(++keyCounter);

export default function StatementUploadModal({ currencySymbol, onImport, onClose }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rows, setRows] = useState<ParsedTx[]>([]);
  const [error, setError] = useState('');
  const [importedCount, setImportedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uid = useId();

  const acceptedTypes = '.pdf,.csv,.txt,.tsv';

  // ── file selection ──────────────────────────────────────────────────
  const pickFile = (f: File) => {
    setError('');
    setFile(f);
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setIsDragging(false), []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
  }, []);

  // ── parse ────────────────────────────────────────────────────────────
  const handleParse = async () => {
    if (!file) return;
    setError('');
    setStep('parsing');

    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch('/api/parse-statement', { method: 'POST', body: form });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Failed to parse statement.');
        setStep('upload');
        return;
      }

      if (!data.transactions || data.transactions.length === 0) {
        setError('No transactions found in this file. Try a different statement.');
        setStep('upload');
        return;
      }

      setRows(
        data.transactions.map((t: { date: string; description: string; amount: number; category: string }) => ({
          _key: nextKey(),
          date: t.date,
          description: t.description,
          amount: t.amount,
          category: t.category,
          selected: true,
        }))
      );
      setStep('preview');
    } catch {
      setError('Something went wrong. Please try again.');
      setStep('upload');
    }
  };

  // ── row helpers ──────────────────────────────────────────────────────
  const toggleRow = (key: string) =>
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, selected: !r.selected } : r)));

  const toggleAll = () => {
    const allSelected = rows.every((r) => r.selected);
    setRows((prev) => prev.map((r) => ({ ...r, selected: !allSelected })));
  };

  const setCategory = (key: string, category: string) =>
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, category } : r)));

  // ── import ───────────────────────────────────────────────────────────
  const handleImport = async () => {
    const selected = rows.filter((r) => r.selected);
    if (selected.length === 0) return;

    setStep('importing');

    const payload = selected.map((r) => ({
      date: r.date,
      description: r.description,
      amount: r.amount,
      category: r.category,
    }));

    try {
      const res = await fetch('/api/transactions/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: payload }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Import failed.');
        setStep('preview');
        return;
      }

      setImportedCount(data.count);
      onImport(data.transactions);
      setStep('done');
    } catch {
      setError('Import failed. Please try again.');
      setStep('preview');
    }
  };

  const selectedCount = rows.filter((r) => r.selected).length;
  const allSelected = rows.length > 0 && rows.every((r) => r.selected);

  // ── shared styles ────────────────────────────────────────────────────
  const overlayBtn =
    'px-4 py-2 rounded-lg text-sm font-medium transition-colors';
  const primaryBtn =
    `${overlayBtn} bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50`;
  const ghostBtn =
    `${overlayBtn} text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Import Bank Statement</h2>
            {step === 'preview' && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Found {rows.length} transaction{rows.length !== 1 ? 's' : ''} · review before importing
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── UPLOAD ── */}
          {(step === 'upload') && (
            <div className="space-y-4">
              {error && (
                <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              <label
                htmlFor={`${uid}-file`}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={`
                  flex flex-col items-center justify-center gap-3 w-full h-52 rounded-xl border-2 border-dashed cursor-pointer transition-colors
                  ${isDragging
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                    : file
                      ? 'border-violet-400 bg-violet-50/50 dark:bg-violet-900/10'
                      : 'border-zinc-300 dark:border-zinc-700 hover:border-violet-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}
                `}
              >
                {file ? (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                      <svg className="w-6 h-6 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{file.name}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">{(file.size / 1024).toFixed(0)} KB · click to change</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                      <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Drag & drop your statement here</p>
                      <p className="text-xs text-zinc-400 mt-1">or click to browse · PDF or CSV · max 20 MB</p>
                    </div>
                  </>
                )}
              </label>
              <input
                id={`${uid}-file`}
                ref={fileInputRef}
                type="file"
                accept={acceptedTypes}
                className="sr-only"
                onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])}
              />

              <p className="text-xs text-zinc-400 text-center">
                Supports statements from any bank. Transactions are parsed by AI and never stored as raw files.
              </p>
            </div>
          )}

          {/* ── PARSING ── */}
          {step === 'parsing' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-12 h-12 border-2 border-zinc-200 border-t-violet-600 rounded-full animate-spin" />
              <div className="text-center">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Reading your statement with AI…</p>
                <p className="text-xs text-zinc-400 mt-1">{file?.name} · this may take up to 30 seconds</p>
              </div>
            </div>
          )}

          {/* ── PREVIEW ── */}
          {step === 'preview' && (
            <div className="space-y-3">
              {error && (
                <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              {/* Select all + count */}
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="w-3.5 h-3.5 rounded accent-violet-600"
                  />
                  Select all
                </label>
                <span>{selectedCount} of {rows.length} selected</span>
              </div>

              {/* Table */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="overflow-y-auto max-h-[340px]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                      <tr>
                        <th className="w-8 px-3 py-2.5" />
                        <th className="px-3 py-2.5 text-left font-medium">Date</th>
                        <th className="px-3 py-2.5 text-left font-medium">Description</th>
                        <th className="px-3 py-2.5 text-right font-medium">Amount</th>
                        <th className="px-3 py-2.5 text-left font-medium">Category</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {rows.map((row) => (
                        <tr
                          key={row._key}
                          className={`transition-colors ${row.selected ? 'bg-white dark:bg-zinc-900' : 'bg-zinc-50 dark:bg-zinc-800/50 opacity-50'}`}
                        >
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={row.selected}
                              onChange={() => toggleRow(row._key)}
                              className="w-3.5 h-3.5 rounded accent-violet-600"
                            />
                          </td>
                          <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{row.date}</td>
                          <td className="px-3 py-2 text-zinc-800 dark:text-zinc-200 max-w-[180px] truncate" title={row.description}>
                            {row.description}
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-zinc-900 dark:text-white whitespace-nowrap">
                            {currencySymbol}{row.amount.toFixed(2)}
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={row.category}
                              onChange={(e) => setCategory(row._key, e.target.value)}
                              className="w-full bg-transparent text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-md px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500"
                            >
                              {DEFAULT_CATEGORIES.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── IMPORTING ── */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-12 h-12 border-2 border-zinc-200 border-t-violet-600 rounded-full animate-spin" />
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Importing {selectedCount} transaction{selectedCount !== 1 ? 's' : ''}…
              </p>
            </div>
          )}

          {/* ── DONE ── */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-14 h-14 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <svg className="w-7 h-7 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-base font-semibold text-zinc-900 dark:text-white">
                  {importedCount} transaction{importedCount !== 1 ? 's' : ''} imported
                </p>
                <p className="text-xs text-zinc-400 mt-1">Your dashboard has been updated.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
          {step === 'upload' && (
            <>
              <button onClick={onClose} className={ghostBtn}>Cancel</button>
              <button
                onClick={handleParse}
                disabled={!file}
                className={primaryBtn}
              >
                Parse Statement
              </button>
            </>
          )}

          {step === 'preview' && (
            <>
              <button
                onClick={() => { setFile(null); setRows([]); setError(''); setStep('upload'); }}
                className={ghostBtn}
              >
                ← Try another file
              </button>
              <button
                onClick={handleImport}
                disabled={selectedCount === 0}
                className={primaryBtn}
              >
                Import {selectedCount} transaction{selectedCount !== 1 ? 's' : ''}
              </button>
            </>
          )}

          {step === 'done' && (
            <button onClick={onClose} className={primaryBtn}>Done</button>
          )}
        </div>
      </div>
    </div>
  );
}
