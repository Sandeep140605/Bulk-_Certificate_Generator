import React, { useState, useEffect, useRef } from 'react';
import { CertificateTheme, EmailDispatchRecord, RecipientInput, JobRecord } from '../types';
import { CertificateTemplate } from './CertificateTemplate';
import JSZip from 'jszip';
import {
  Send,
  Mail,
  CheckCircle2,
  Download,
  Eye,
  RotateCw,
  Sparkles,
  ShieldCheck,
  Inbox,
  Clock,
  Upload,
  Plus,
  Trash2,
  FileSpreadsheet,
  AlertCircle,
  ExternalLink,
  Check,
} from 'lucide-react';

interface EmailSenderProps {
  onSelectCertForVerify?: (code: string) => void;
}

const DEFAULT_RECIPIENTS: RecipientInput[] = [
  { name: 'Dr. Elena Rostova', email: 'elena.rostova@techai.org' },
  { name: 'Marcus Sterling', email: 'marcus.s@quantumcloud.io' },
  { name: 'Aisha Al-Mansoor', email: 'aisha.m@appliedml.edu' },
  { name: 'Carlos Mendez', email: 'carlos.m@globalfin.com' },
];

export const EmailSenderView: React.FC<EmailSenderProps> = ({ onSelectCertForVerify }) => {
  const [recipients, setRecipients] = useState<RecipientInput[]>(DEFAULT_RECIPIENTS);
  const [selectedRecipientIndex, setSelectedRecipientIndex] = useState(0);
  const [title, setTitle] = useState('Full-Stack Distributed Systems Specialist');
  const [issuer, setIssuer] = useState('Global Tech Certification Board');
  const [issuerTitle, setIssuerTitle] = useState('Dean of Computer Science');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [theme, setTheme] = useState<CertificateTheme>('sapphire');
  const [autoSendEmail, setAutoSendEmail] = useState(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<JobRecord | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [previewEmail, setPreviewEmail] = useState<EmailDispatchRecord | null>(null);
  const [dispatches, setDispatches] = useState<EmailDispatchRecord[]>([]);
  const [isZipping, setIsZipping] = useState(false);

  // CSV Drag and Drop / Input state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [csvPasteText, setCsvPasteText] = useState('');
  const [showCsvPasteModal, setShowCsvPasteModal] = useState(false);

  const fetchDispatches = async () => {
    try {
      const res = await fetch('/api/email-dispatches');
      const data = await res.json();
      if (data.dispatches) {
        setDispatches(data.dispatches);
      }
    } catch (err) {
      console.error('Failed to fetch dispatches:', err);
    }
  };

  useEffect(() => {
    fetchDispatches();
  }, []);

  // Poll active bulk job when running
  useEffect(() => {
    if (!activeJobId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${activeJobId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.job) {
          setActiveJob(data.job);
          if (data.job.status === 'completed' || data.job.status === 'partial_failure' || data.job.status === 'failed') {
            setIsProcessing(false);
            fetchDispatches();
          }
        }
      } catch (err) {
        console.error('Error polling job:', err);
      }
    }, 800);

    return () => clearInterval(interval);
  }, [activeJobId]);

  // Handle adding recipient
  const handleAddRecipient = () => {
    setRecipients([...recipients, { name: '', email: '' }]);
    setSelectedRecipientIndex(recipients.length);
  };

  // Handle removing recipient
  const handleRemoveRecipient = (idx: number) => {
    if (recipients.length <= 1) return;
    const next = recipients.filter((_, i) => i !== idx);
    setRecipients(next);
    setSelectedRecipientIndex(Math.min(selectedRecipientIndex, next.length - 1));
  };

  // Handle updating recipient
  const handleUpdateRecipient = (idx: number, field: 'name' | 'email', val: string) => {
    const next = [...recipients];
    next[idx] = { ...next[idx], [field]: val };
    setRecipients(next);
  };

  // Parse CSV text into recipients
  const parseCsvContent = (content: string) => {
    const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const parsed: RecipientInput[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip header row if contains name or email
      if (i === 0 && (line.toLowerCase().includes('name') || line.toLowerCase().includes('email'))) {
        continue;
      }
      const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length >= 2) {
        parsed.push({ name: parts[0], email: parts[1] });
      } else if (parts.length === 1 && parts[0]) {
        parsed.push({ name: parts[0], email: '' });
      }
    }

    if (parsed.length > 0) {
      setRecipients(parsed);
      setSelectedRecipientIndex(0);
      setStatusMessage(`Successfully imported ${parsed.length} recipient(s) from CSV.`);
    } else {
      setStatusMessage('Could not find valid recipient rows in CSV file.');
    }
  };

  // Handle CSV file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) parseCsvContent(text);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) parseCsvContent(text);
      };
      reader.readAsText(file);
    }
  };

  // Download Sample CSV
  const handleDownloadSampleCsv = () => {
    const csvData = `Name,Email\nDr. Elena Rostova,elena.rostova@techai.org\nMarcus Sterling,marcus.s@quantumcloud.io\nAisha Al-Mansoor,aisha.m@appliedml.edu\nCarlos Mendez,carlos.m@globalfin.com`;
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_recipients_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Submit bulk job & email dispatch
  const handleProcessAndSendBulk = async () => {
    if (!title.trim()) {
      setStatusMessage('Please enter a certificate or course title.');
      return;
    }
    if (!issuer.trim()) {
      setStatusMessage('Please enter an issuing organization.');
      return;
    }
    if (recipients.length === 0) {
      setStatusMessage('Please add at least one recipient.');
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);
    setActiveJob(null);

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          issuer: issuer.trim(),
          issuerTitle: issuerTitle.trim(),
          issueDate,
          templateTheme: theme,
          recipients,
          sendEmail: autoSendEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to start bulk generation job.');
      }

      setActiveJobId(data.jobId);
      setStatusMessage(`Bulk job ${data.jobId} created! Processing ${recipients.length} certificates and dispatching emails...`);
    } catch (err: any) {
      setIsProcessing(false);
      setStatusMessage(err.message || 'Network error while initiating bulk generation.');
    }
  };

  // Bulk ZIP Download
  const handleDownloadAllZip = async () => {
    if (!activeJob?.recipients) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder(`certificates_${activeJob.id}`);
      const completed = activeJob.recipients.filter(r => r.status === 'completed');

      completed.forEach(cert => {
        const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 700" width="1000" height="700">
  <rect width="1000" height="700" fill="#FCFCFA" />
  <rect x="24" y="24" width="952" height="652" fill="none" stroke="#2563EB" stroke-width="5" rx="8" />
  <text x="500" y="110" font-family="sans-serif" font-size="14" font-weight="700" fill="#2563EB" letter-spacing="4" text-anchor="middle">${activeJob.issuer.toUpperCase()}</text>
  <text x="500" y="170" font-family="serif" font-size="34" font-weight="700" fill="#0F172A" text-anchor="middle">CERTIFICATE OF COMPLETION</text>
  <text x="500" y="280" font-family="serif" font-size="40" font-weight="700" fill="#1E3A8A" text-anchor="middle">${cert.recipientName}</text>
  <text x="500" y="400" font-family="sans-serif" font-size="24" font-weight="700" fill="#0F172A" text-anchor="middle">${cert.title}</text>
  <text x="200" y="540" font-family="sans-serif" font-size="12" fill="#334155">${activeJob.issuer} (${activeJob.issuerTitle})</text>
  <text x="700" y="540" font-family="monospace" font-size="12" fill="#334155">Date: ${cert.issueDate} | ${cert.verificationCode}</text>
  <text x="500" y="640" font-family="monospace" font-size="10" fill="#94A3B8" text-anchor="middle">SHA-256: ${cert.hash}</text>
</svg>`;
        const safeName = cert.recipientName.replace(/[^a-zA-Z0-9_-]/g, '_');
        folder?.file(`${cert.verificationCode}_${safeName}.svg`, svgContent.trim());
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bulk_certificates_${activeJob.id}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to create zip:', err);
    } finally {
      setIsZipping(false);
    }
  };

  const handleExportBatchResultsCsv = () => {
    if (!activeJob || !activeJob.recipients) return;
    const baseUrl = window.location.origin;
    const headers = [
      'Recipient Name',
      'Recipient Email',
      'Status',
      'Certificate ID',
      'Verification Code',
      'Verification Link',
      'Issue Date',
      'SHA256 Fingerprint',
      'Error Diagnostic',
    ];

    const escapeCsv = (val: string | undefined | null) => {
      if (!val) return '""';
      const clean = String(val).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = activeJob.recipients.map(cert => {
      const isCompleted = cert.status === 'completed';
      const verifyLink = isCompleted ? `${baseUrl}/api/verify/${cert.verificationCode}` : '';
      return [
        escapeCsv(cert.recipientName),
        escapeCsv(cert.recipientEmail),
        escapeCsv(cert.status),
        escapeCsv(isCompleted ? cert.id : ''),
        escapeCsv(isCompleted ? cert.verificationCode : ''),
        escapeCsv(verifyLink),
        escapeCsv(cert.issueDate),
        escapeCsv(isCompleted ? cert.hash : ''),
        escapeCsv(cert.errorMessage || ''),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch_${activeJob.id}_results.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const selectedRecipient = recipients[selectedRecipientIndex] || { name: 'Recipient Name', email: 'recipient@domain.com' };
  const progressPercent = activeJob?.totalCount
    ? Math.round(((activeJob.completedCount + activeJob.failedCount) / activeJob.totalCount) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner with Actions */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-white">
              Bulk Certificate Generator & Multi-Recipient Email Dispatch
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Upload CSV or enter multiple recipients manually. Generates certificates and automatically sends each to their email!
          </p>
        </div>

        {/* Quick CSV Template Action */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadSampleCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Download CSV Template</span>
          </button>
          <button
            onClick={() => {
              setRecipients([
                { name: 'Dr. Elena Rostova', email: 'elena.rostova@techai.org' },
                { name: 'Marcus Sterling', email: 'marcus.s@quantumcloud.io' },
                { name: 'Aisha Al-Mansoor', email: 'aisha.m@appliedml.edu' },
                { name: 'Carlos Mendez', email: 'carlos.m@globalfin.com' },
              ]);
              setSelectedRecipientIndex(0);
              setStatusMessage('Reset to default sample roster (4 recipients)');
            }}
            className="px-3 py-1.5 text-xs font-mono rounded-lg bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-800/80 transition-colors"
          >
            Preload Sample (4)
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center gap-2 ${
            statusMessage.includes('Successfully') || statusMessage.includes('created')
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
              : 'bg-indigo-950/60 border-indigo-800 text-indigo-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Main Grid: Multi-Recipient Intake on Left / Live Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Batch Config + CSV Upload + Multi-Recipient Table (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. Batch Credentials Setup */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              01. Credential Information
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Certificate / Course / Event Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Full-Stack Distributed Systems Specialist"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Issuing Organization
                  </label>
                  <input
                    type="text"
                    value={issuer}
                    onChange={e => setIssuer(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Signatory Title
                  </label>
                  <input
                    type="text"
                    value={issuerTitle}
                    onChange={e => setIssuerTitle(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-sans"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Date of Issuance
                  </label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={e => setIssueDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Certificate Theme
                  </label>
                  <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
                    {(['sapphire', 'gold', 'emerald', 'ruby'] as CertificateTheme[]).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTheme(t)}
                        className={`py-1 text-xs font-medium rounded capitalize transition-colors ${
                          theme === t ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Automatic Email Dispatch Checkbox */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-200">
                  <input
                    type="checkbox"
                    checked={autoSendEmail}
                    onChange={e => setAutoSendEmail(e.target.checked)}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 bg-slate-950"
                  />
                  <span className="font-semibold text-white">Automatically send official certificate email to each recipient</span>
                </label>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded">
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* 2. Recipient Intake: Drag-Drop CSV & Manual Multi-Row Editor */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  02. Recipients List ({recipients.length} participants)
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Upload CSV or add/edit rows below. Each person will receive an individual certificate & email.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCsvPasteModal(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Paste CSV
                </button>
                <button
                  type="button"
                  onClick={handleAddRecipient}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Row
                </button>
              </div>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                dragActive
                  ? 'border-indigo-500 bg-indigo-950/40'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Upload className="w-6 h-6 text-indigo-400 mx-auto mb-1.5" />
              <div className="text-xs font-semibold text-slate-200">
                Click to upload CSV or drag and drop file here
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                Columns: <code className="text-indigo-300">Name, Email</code>
              </div>
            </div>

            {/* Multi-Row Table */}
            <div className="border border-slate-800 rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 sticky top-0 border-b border-slate-800 text-slate-400 font-mono">
                  <tr>
                    <th className="py-2.5 px-3 w-8">#</th>
                    <th className="py-2.5 px-3">Full Name</th>
                    <th className="py-2.5 px-3">Email Address</th>
                    <th className="py-2.5 px-3 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {recipients.map((rec, idx) => {
                    const isSelected = selectedRecipientIndex === idx;
                    return (
                      <tr
                        key={idx}
                        onClick={() => setSelectedRecipientIndex(idx)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-indigo-950/40 text-white' : 'hover:bg-slate-800/40 text-slate-300'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono text-slate-500">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={rec.name}
                            onChange={e => handleUpdateRecipient(idx, 'name', e.target.value)}
                            onClick={e => e.stopPropagation()}
                            placeholder="Recipient Name"
                            className="w-full bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 focus:outline-none py-0.5 text-xs text-slate-200"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="email"
                            value={rec.email}
                            onChange={e => handleUpdateRecipient(idx, 'email', e.target.value)}
                            onClick={e => e.stopPropagation()}
                            placeholder="recipient@example.com"
                            className="w-full bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 focus:outline-none py-0.5 text-xs font-mono text-slate-200"
                          />
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleRemoveRecipient(idx);
                            }}
                            className="text-slate-500 hover:text-rose-400 p-1"
                            title="Remove row"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Process Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleProcessAndSendBulk}
                disabled={isProcessing}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Processing Batch & Dispatching Emails...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      Generate {recipients.length} Certificates & Send to Email
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Certificate Preview & Live Progress (5 cols) */}
        <div className="lg:col-span-5 space-y-4 flex flex-col">
          {/* Active Batch Progress Card (if job started) */}
          {activeJob && (
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-white">Batch Execution Status</h4>
                  <p className="text-xs text-slate-400 font-mono">Job ID: {activeJob.id}</p>
                </div>
                <span
                  className={`text-xs font-mono font-semibold px-2.5 py-0.5 rounded ${
                    activeJob.status === 'completed'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-indigo-950 text-indigo-300 border border-indigo-800 animate-pulse'
                  }`}
                >
                  {activeJob.status.toUpperCase()}
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">
                    {activeJob.completedCount} of {activeJob.totalCount} generated & sent
                  </span>
                  <span className="font-mono text-indigo-400 font-bold">{progressPercent}%</span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                  <div
                    className="bg-emerald-500 transition-all duration-300"
                    style={{ width: `${(activeJob.completedCount / (activeJob.totalCount || 1)) * 100}%` }}
                  />
                  <div
                    className="bg-rose-500 transition-all duration-300"
                    style={{ width: `${(activeJob.failedCount / (activeJob.totalCount || 1)) * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportBatchResultsCsv}
                    disabled={!activeJob || activeJob.recipients?.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
                    title="Export results with unique certificate IDs and verification links"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadAllZip}
                    disabled={isZipping || activeJob.completedCount === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors border border-slate-700"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{isZipping ? 'Archiving...' : `Download ZIP (${activeJob.completedCount})`}</span>
                  </button>
                </div>

                <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Emails Dispatched</span>
                </div>
              </div>
            </div>
          )}

          {/* Live Synchronized Certificate Preview */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex-1 flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Live Certificate Preview (Row #{selectedRecipientIndex + 1})
              </span>
              <span className="font-mono text-xs text-indigo-400 font-semibold truncate max-w-[150px]">
                {selectedRecipient.name}
              </span>
            </div>

            <CertificateTemplate
              recipientName={selectedRecipient.name || 'Recipient Name'}
              recipientEmail={selectedRecipient.email || 'email@domain.com'}
              title={title}
              issuer={issuer}
              issuerTitle={issuerTitle}
              issueDate={issueDate}
              verificationCode={`CRT-PREV-${(selectedRecipientIndex + 1).toString().padStart(4, '0')}`}
              theme={theme}
              interactive={true}
            />
          </div>
        </div>
      </div>

      {/* Dispatched Emails Activity Log & Outbox */}
      <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-bold text-white">
              Email Dispatch Outbox ({dispatches.length} Delivered Messages)
            </h3>
          </div>
          <button
            onClick={fetchDispatches}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono"
          >
            <RotateCw className="w-3 h-3" />
            <span>Refresh Outbox</span>
          </button>
        </div>

        {dispatches.length > 0 ? (
          <div className="border border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-mono border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Recipient Name</th>
                  <th className="py-2.5 px-3">Recipient Email</th>
                  <th className="py-2.5 px-3">Certificate Title</th>
                  <th className="py-2.5 px-3">Verification ID</th>
                  <th className="py-2.5 px-3">Tracking Code</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {dispatches.map(d => (
                  <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-200">{d.recipientName}</td>
                    <td className="py-3 px-3 font-mono text-indigo-300">{d.recipientEmail}</td>
                    <td className="py-3 px-3 text-slate-300 truncate max-w-[180px]">{d.title}</td>
                    <td className="py-3 px-3 font-mono text-slate-400">{d.verificationCode}</td>
                    <td className="py-3 px-3 font-mono text-slate-400">{d.trackingId}</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Delivered</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setPreviewEmail(d)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] transition-colors"
                        >
                          View Email
                        </button>
                        <a
                          href={d.directMailtoUrl}
                          className="px-2.5 py-1 rounded bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/80 text-[11px] transition-colors"
                          title="Open mail client"
                        >
                          Open Mail
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-500 font-mono">
            No dispatched emails yet. Enter recipients above or upload a CSV to process the batch!
          </div>
        )}
      </div>

      {/* Rendered Email Preview Modal */}
      {previewEmail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Delivered Email Message</h3>
                <p className="text-xs text-slate-400 font-mono">
                  To: {previewEmail.recipientEmail} · Tracking: {previewEmail.trackingId}
                </p>
              </div>
              <button
                onClick={() => setPreviewEmail(null)}
                className="text-slate-400 hover:text-white px-2 py-1 text-sm rounded bg-slate-800"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs font-mono">
              <div className="text-slate-400">
                <strong className="text-slate-300">Subject:</strong> {previewEmail.subject}
              </div>
              <div className="text-slate-400">
                <strong className="text-slate-300">Recipient:</strong> {previewEmail.recipientName} &lt;{previewEmail.recipientEmail}&gt;
              </div>
              <div className="text-slate-400">
                <strong className="text-slate-300">Sent Time:</strong> {new Date(previewEmail.sentAt).toLocaleString()}
              </div>
            </div>

            {/* Email HTML Container */}
            <div
              className="p-4 bg-slate-950 rounded-xl border border-slate-800"
              dangerouslySetInnerHTML={{ __html: previewEmail.bodyHtml }}
            />

            <div className="flex justify-end gap-2 pt-2">
              <a
                href={previewEmail.directMailtoUrl}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Open in Mail App</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Paste CSV Modal */}
      {showCsvPasteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Paste CSV Data</h3>
              <button
                onClick={() => setShowCsvPasteModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Paste comma-separated rows: <code className="text-indigo-300">Name, Email</code>
            </p>
            <textarea
              rows={8}
              value={csvPasteText}
              onChange={e => setCsvPasteText(e.target.value)}
              placeholder="Alice Sterling, alice@example.com&#10;Bob Vance, bob@vance.com&#10;Charlie Chaplin, charlie@chaplin.org"
              className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCsvPasteModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  parseCsvContent(csvPasteText);
                  setShowCsvPasteModal(false);
                  setCsvPasteText('');
                }}
                className="px-4 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              >
                Import Rows
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
