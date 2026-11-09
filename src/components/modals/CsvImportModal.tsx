'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  FileText,
  RefreshCw,
  Download,
} from 'lucide-react';
import Papa from 'papaparse';
import { processCsvData, ColumnMapping, CsvImportResult } from '@/lib/server/csvImportEngine';
import { repository } from '@/lib/db/repository';
import type { Business } from '@/types';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onImportComplete: (importedCount: number) => void;
}

type ImportStep = 'upload' | 'mapping' | 'preview' | 'results';

export function CsvImportModal({
  isOpen,
  onClose,
  projectId,
  onImportComplete,
}: CsvImportModalProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [fileName, setFileName] = useState('');
  const [csvContent, setCsvContent] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    officialName: '',
    websiteUrl: '',
    phone: '',
    email: '',
    city: '',
    state: '',
  });
  const [previewResult, setPreviewResult] = useState<CsvImportResult | null>(null);
  const [importResult, setImportResult] = useState<CsvImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text || text.trim().length === 0) {
        setError('Selected file is empty.');
        return;
      }

      setCsvContent(text);
      const parsed = Papa.parse(text, { header: true, preview: 1 });
      const detectedHeaders = parsed.meta.fields || [];
      setHeaders(detectedHeaders);

      // Pre-compute suggested mappings
      const initialResult = processCsvData(text, {
        projectId,
        dryRun: true,
      });

      setMapping(initialResult.suggestedMapping);
      setPreviewResult(initialResult);
      setStep('mapping');
    };
    reader.readAsText(file);
  };

  const handleMappingProceed = async () => {
    if (!mapping.officialName) {
      setError('You must select a column for Company / Business Name.');
      return;
    }

    // Run preview validation with updated mapping
    const existing = await repository.getBusinesses(projectId);
    const result = processCsvData(csvContent, {
      projectId,
      mapping,
      existingBusinesses: existing,
      dryRun: true,
    });

    setPreviewResult(result);
    setStep('preview');
  };

  const handleExecuteImport = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const existing = await repository.getBusinesses(projectId);
      const result = processCsvData(csvContent, {
        projectId,
        mapping,
        existingBusinesses: existing,
        dryRun: false,
      });

      // Save valid imported businesses to client Dexie repository
      if (result.importedBusinesses.length > 0) {
        await repository.saveBusinesses(result.importedBusinesses);
      }

      setImportResult(result);
      setStep('results');
      onImportComplete(result.importedCount);
    } catch (err: any) {
      setError(`Import failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadInvalidRecords = () => {
    if (!importResult || importResult.invalidRows.length === 0) return;
    const rows = importResult.invalidRows.map((r) => ({
      _error_line: r.line,
      _error_reason: r.errors.join('; '),
      ...r.rawRow,
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `failed_rows_${fileName}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-3xl my-8 p-6 shadow-2xl relative text-left">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Import Business Leads (CSV)</h3>
              <p className="text-xs text-slate-400">
                Automatic column mapping, validation, and duplicate prevention
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="my-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-xs text-red-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: UPLOAD */}
        {step === 'upload' && (
          <div className="py-8 space-y-6">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-900/50"
            >
              <Upload className="w-10 h-10 text-blue-400 mb-3" />
              <span className="text-sm font-medium text-white mb-1">
                Choose a CSV file or drag and drop here
              </span>
              <span className="text-xs text-slate-400">
                Supports .csv files with standard columns (Company Name, Website, Phone, Email)
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
        )}

        {/* STEP 2: MAPPING */}
        {step === 'mapping' && (
          <div className="py-6 space-y-6">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
              <span>File: <strong className="text-white">{fileName}</strong></span>
              <span>Detected Columns: <strong className="text-white">{headers.length}</strong></span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Company / Business Name <span className="text-red-400">*</span>
                </label>
                <select
                  value={mapping.officialName}
                  onChange={(e) => setMapping({ ...mapping, officialName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="">-- Select Column --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Website / URL / Domain <span className="text-blue-400">(Required for audit)</span>
                </label>
                <select
                  value={mapping.websiteUrl}
                  onChange={(e) => setMapping({ ...mapping, websiteUrl: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="">-- Select Column --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
                <select
                  value={mapping.phone || ''}
                  onChange={(e) => setMapping({ ...mapping, phone: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="">-- Optional --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <select
                  value={mapping.email || ''}
                  onChange={(e) => setMapping({ ...mapping, email: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="">-- Optional --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">City / Municipality</label>
                <select
                  value={mapping.city || ''}
                  onChange={(e) => setMapping({ ...mapping, city: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="">-- Optional (Uses Project City) --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">State / Province</label>
                <select
                  value={mapping.state || ''}
                  onChange={(e) => setMapping({ ...mapping, state: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="">-- Optional (Uses Project State) --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <button
                onClick={() => setStep('upload')}
                className="flex items-center gap-2 text-xs text-slate-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Upload
              </button>
              <button
                onClick={handleMappingProceed}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white shadow-lg"
              >
                Preview Mapped Records <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: PREVIEW & VALIDATION */}
        {step === 'preview' && previewResult && (
          <div className="py-6 space-y-6">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <span className="block text-xl font-bold text-emerald-400">{previewResult.validCount}</span>
                <span className="text-[11px] text-slate-400">Valid to Import</span>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <span className="block text-xl font-bold text-amber-400">{previewResult.duplicateCount}</span>
                <span className="text-[11px] text-slate-400">Duplicates Filtered</span>
              </div>
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <span className="block text-xl font-bold text-rose-400">{previewResult.invalidCount}</span>
                <span className="text-[11px] text-slate-400">Invalid Records</span>
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-300 mb-2">
                Sample Valid Records (First {Math.min(3, previewResult.importedBusinesses.length)} of {previewResult.validCount}):
              </span>
              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-2 font-medium">Business Name</th>
                      <th className="p-2 font-medium">Domain / Website</th>
                      <th className="p-2 font-medium">Phone</th>
                      <th className="p-2 font-medium">Location</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {previewResult.importedBusinesses.slice(0, 3).map((biz) => (
                      <tr key={biz.id}>
                        <td className="p-2 font-medium text-white">{biz.officialName}</td>
                        <td className="p-2 font-mono text-blue-400">{biz.domain || 'N/A'}</td>
                        <td className="p-2">{biz.phone || 'N/A'}</td>
                        <td className="p-2">{biz.city}, {biz.state}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <button
                onClick={() => setStep('mapping')}
                className="flex items-center gap-2 text-xs text-slate-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" /> Change Mapping
              </button>
              <button
                onClick={handleExecuteImport}
                disabled={isProcessing || previewResult.validCount === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Ingesting {previewResult.validCount} records...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Ingest {previewResult.validCount} Businesses Now
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: RESULTS */}
        {step === 'results' && importResult && (
          <div className="py-8 space-y-6 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-white">Import Complete!</h4>
              <p className="text-xs text-slate-400 mt-1">
                Successfully ingested {importResult.importedCount} business lead(s) into this project.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto text-center">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="block text-lg font-bold text-white">{importResult.importedCount}</span>
                <span className="text-[10px] text-slate-400">Imported</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="block text-lg font-bold text-amber-400">{importResult.duplicateCount}</span>
                <span className="text-[10px] text-slate-400">Duplicates</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="block text-lg font-bold text-rose-400">{importResult.invalidCount}</span>
                <span className="text-[10px] text-slate-400">Invalid</span>
              </div>
            </div>

            {importResult.invalidCount > 0 && (
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-left space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Invalid Records Log ({importResult.invalidCount})</span>
                  <button
                    onClick={handleDownloadInvalidRecords}
                    className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-mono text-[11px]"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Failed Rows CSV
                  </button>
                </div>
                <div className="max-h-28 overflow-y-auto space-y-1">
                  {importResult.invalidRows.map((inv, idx) => (
                    <div key={idx} className="text-[10px] text-slate-400 flex gap-2">
                      <span className="font-mono text-amber-400 shrink-0">Line {inv.line}:</span>
                      <span className="text-rose-400">{inv.errors.join(', ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full max-w-sm mx-auto block py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-lg"
            >
              Done & View Imported Leads
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
