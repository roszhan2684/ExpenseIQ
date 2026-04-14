'use client';

import { useState, useRef, useCallback, useId } from 'react';
import { Transaction, DEFAULT_CATEGORIES, INCOME_CATEGORIES } from '@/lib/types';

interface ParsedTx {
  _key: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
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

// Extracts PDF text preserving visual row structure using coordinate grouping.
// Adds --- PAGE N --- markers so the server can chunk large statements by page boundary.
async function extractPdfText(
  file: File,
  onProgress?: (msg: string) => void
): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    onProgress?.(`Reading page ${pageNum} of ${pdf.numPages}…`);
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    // Build typed item list with coordinates
    type Item = { str: string; x: number; y: number };
    const items: Item[] = content.items
      .filter((it) => 'str' in it && (it as { str: string }).str.trim().length > 0)
      .map((it) => {
        const i = it as { str: string; transform: number[] };
        return { str: i.str, x: i.transform[4], y: i.transform[5] };
      });

    if (items.length === 0) continue;

    // Sort top-to-bottom (PDF y=0 is bottom, so descending y = top first),
    // then left-to-right within the same line
    items.sort((a, b) => b.y - a.y || a.x - b.x);

    // Group items that are within 4 units vertically (same visual row)
    const lineGroups: Item[][] = [];
    let group: Item[] = [items[0]];
    for (let i = 1; i < items.length; i++) {
      if (Math.abs(items[i].y - group[0].y) <= 4) {
        group.push(items[i]);
      } else {
        lineGroups.push(group);
        group = [items[i]];
      }
    }
    lineGroups.push(group);

    // Join each row left-to-right
    const lines = lineGroups
      .map((g) => g.sort((a, b) => a.x - b.x).map((i) => i.str).join(' ').trim())
      .filter((l) => l.length > 0);

    pages.push(`--- PAGE ${pageNum} ---\n${lines.join('\n')}`);
  }

  return pages.join('\n\n');
}

export default function StatementUploadModal({ currencySymbol, onImport, onClose }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rows, setRows] = useState<ParsedTx[]>([]);
  const [error, setError] = useState('');
  const [importedCount, setImportedCount] = useState(0);
  const [parseStatus, setParseStatus] = useState('Analyzing your statement…');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uid = useId();

  const acceptedTypes = '.pdf,.csv,.txt,.tsv';

  const pickFile = (f: File) => { setError(''); setFile(f); };

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const onDragLeave = useCallback(() => setIsDragging(false), []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
  }, []);

  const handleParse = async () => {
    if (!file) return;
    setError('');
    setStep('parsing');

    let uploadFile: File = file;

    if (file.name.toLowerCase().endsWith('.pdf')) {
      try {
        const text = await extractPdfText(file, (msg) => setParseStatus(msg));
        uploadFile = new File([text], file.name.replace(/\.pdf$/i, '.txt'), { type: 'text/plain' });
        setParseStatus('Analyzing transactions…');
      } catch {
        setError('Could not read this PDF. Try exporting your statement as CSV instead.');
        setStep('upload');
        return;
      }
    }

    const form = new FormData();
    form.append('file', uploadFile);

    try {
      const res = await fetch('/api/parse-statement', { method: 'POST', body: form });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Failed to parse statement.');
        setStep('upload');
        return;
      }

      if (!data.transactions || data.transactions.length === 0) {
        setError('No transactions found. Try a different statement or format.');
        setStep('upload');
        return;
      }

      setRows(
        data.transactions.map((t: { date: string; description: string; amount: number; category: string; type?: string }) => ({
          _key: nextKey(),
          date: t.date,
          description: t.description,
          amount: t.amount,
          category: t.category,
          type: t.type === 'income' ? 'income' : 'expense',
          selected: true,
        }))
      );
      setStep('preview');
    } catch {
      setError('Something went wrong. Please try again.');
      setStep('upload');
    }
  };

  const toggleRow = (key: string) =>
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, selected: !r.selected } : r)));

  const toggleAll = () => {
    const allSelected = rows.every((r) => r.selected);
    setRows((prev) => prev.map((r) => ({ ...r, selected: !allSelected })));
  };

  const setCategory = (key: string, category: string) =>
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, category } : r)));

  const setType = (key: string, type: 'income' | 'expense') =>
    setRows((prev) => prev.map((r) => {
      if (r._key !== key) return r;
      const cats = type === 'income' ? INCOME_CATEGORIES : DEFAULT_CATEGORIES;
      return { ...r, type, category: cats[0] };
    }));

  const handleImport = async () => {
    const selected = rows.filter((r) => r.selected);
    if (selected.length === 0) return;
    setStep('importing');

    const payload = selected.map((r) => ({
      date: r.date, description: r.description, amount: r.amount, category: r.category, type: r.type,
    }));

    try {
      const res = await fetch('/api/transactions/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: payload }),
      });
      const data = await res.json();

      if (!res.ok) { setError(data.error ?? 'Import failed.'); setStep('preview'); return; }

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

  const overlayBtn = 'px-4 py-2 rounded-lg text-sm font-medium transition-colors';
  const primaryBtn = `${overlayBtn} bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50`;
  const ghostBtn = `${overlayBtn} text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
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
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">×</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* UPLOAD */}
          {step === 'upload' && (
            <div className="space-y-4">
              {error && (
                <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">{error}</div>
              )}
              <label
                htmlFor={`${uid}-file`}
                onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                className={`flex flex-col items-center justify-center gap-3 w-full h-52 rounded-xl border-2 border-dashed cursor-pointer transition-colors
                  ${isDragging ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                    : file ? 'border-violet-400 bg-violet-50/50 dark:bg-violet-900/10'
                    : 'border-zinc-300 dark:border-zinc-700 hover:border-violet-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
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
              <input id={`${uid}-file`} ref={fileInputRef} type="file" accept={acceptedTypes} className="sr-only"
                onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])} />
              <p className="text-xs text-zinc-400 text-center">Supports statements from any bank · your files are never stored</p>
            </div>
          )}

          {/* PARSING */}
          {step === 'parsing' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-12 h-12 border-2 border-zinc-200 border-t-violet-600 rounded-full animate-spin" />
              <div className="text-center">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{parseStatus}</p>
                <p className="text-xs text-zinc-400 mt-1">{file?.name}</p>
              </div>
            </div>
          )}

          {/* PREVIEW */}
          {step === 'preview' && (
            <div className="space-y-3">
              {error && (
                <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">{error}</div>
              )}
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-3.5 h-3.5 rounded accent-violet-600" />
                  Select all
                </label>
                <span>{selectedCount} of {rows.length} selected</span>
              </div>

              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="overflow-y-auto max-h-[340px]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                      <tr>
                        <th className="w-8 px-3 py-2.5" />
                        <th className="px-3 py-2.5 text-left font-medium">Date</th>
                        <th className="px-3 py-2.5 text-left font-medium">Description</th>
                        <th className="px-3 py-2.5 text-right font-medium">Amount</th>
                        <th className="px-3 py-2.5 text-left font-medium">Type</th>
                        <th className="px-3 py-2.5 text-left font-medium">Category</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {rows.map((row) => {
                        const cats = row.type === 'income' ? INCOME_CATEGORIES : DEFAULT_CATEGORIES;
                        return (
                          <tr key={row._key} className={`transition-colors ${row.selected ? 'bg-white dark:bg-zinc-900' : 'bg-zinc-50 dark:bg-zinc-800/50 opacity-50'}`}>
                            <td className="px-3 py-2 text-center">
                              <input type="checkbox" checked={row.selected} onChange={() => toggleRow(row._key)} className="w-3.5 h-3.5 rounded accent-violet-600" />
                            </td>
                            <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{row.date}</td>
                            <td className="px-3 py-2 text-zinc-800 dark:text-zinc-200 max-w-[160px] truncate" title={row.description}>{row.description}</td>
                            <td className={`px-3 py-2 text-right font-medium whitespace-nowrap ${row.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-white'}`}>
                              {row.type === 'income' ? '+' : '-'}{currencySymbol}{row.amount.toFixed(2)}
                            </td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => setType(row._key, row.type === 'income' ? 'expense' : 'income')}
                                className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${row.type === 'income' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}
                              >
                                {row.type === 'income' ? 'Income' : 'Expense'}
                              </button>
                            </td>
                            <td className="px-3 py-2">
                              <select value={row.category} onChange={(e) => setCategory(row._key, e.target.value)}
                                className="w-full bg-transparent text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-md px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500">
                                {cats.map((c) => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* IMPORTING */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-12 h-12 border-2 border-zinc-200 border-t-violet-600 rounded-full animate-spin" />
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Importing {selectedCount} transaction{selectedCount !== 1 ? 's' : ''}…
              </p>
            </div>
          )}

          {/* DONE */}
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
              <button onClick={handleParse} disabled={!file} className={primaryBtn}>Analyze Statement</button>
            </>
          )}
          {step === 'preview' && (
            <>
              <button onClick={() => { setFile(null); setRows([]); setError(''); setStep('upload'); }} className={ghostBtn}>← Try another file</button>
              <button onClick={handleImport} disabled={selectedCount === 0} className={primaryBtn}>
                Import {selectedCount} transaction{selectedCount !== 1 ? 's' : ''}
              </button>
            </>
          )}
          {step === 'done' && <button onClick={onClose} className={primaryBtn}>Done</button>}
        </div>
      </div>
    </div>
  );
}
