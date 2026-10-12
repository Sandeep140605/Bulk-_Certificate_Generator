import React, { useState } from 'react';
import { CertificateTheme, RecipientInput } from '../types';
import { DynamicCertificatePreview } from './DynamicCertificatePreview';
import { Plus, Trash2, Sparkles, ArrowRight, UploadCloud, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

interface StudioProps {
  onJobCreated: (jobId: string) => void;
}

const PRESETS: Record<string, {
  title: string;
  issuer: string;
  issuerTitle: string;
  theme: CertificateTheme;
  recipients: RecipientInput[];
  badge: string;
}> = {
  standard: {
    title: 'Cloud & Distributed Systems Specialist',
    issuer: 'Institute of Applied Computer Science',
    issuerTitle: 'Dean of Engineering',
    theme: 'sapphire',
    badge: 'Standard All-Valid Batch',
    recipients: [
      { name: 'Dr. Elena Rostova', email: 'elena.rostova@techai.org' },
      { name: 'Marcus Sterling', email: 'marcus.s@quantumcloud.io' },
      { name: 'Aisha Al-Mansoor', email: 'aisha.m@appliedml.edu' },
      { name: 'Carlos Mendez', email: 'carlos.m@globalfin.com' },
      { name: 'Liam O’Connor', email: 'liam.oc@devscale.net' },
    ],
  },
  failureTest: {
    title: 'Advanced Cybersecurity Defense Fellowship',
    issuer: 'National Cyber Security Alliance',
    issuerTitle: 'Director of Certifications',
    theme: 'emerald',
    badge: 'Failure Handling Demo (Mixed Valid & Invalid)',
    recipients: [
      { name: 'Alexander Wright', email: 'alex.wright@cybersec.org' },
      { name: 'Nadia Petrov', email: 'nadia.p@infosec.io' },
      { name: 'Malformatted User', email: 'invalid-email-no-at-sign' }, // Invalid email
      { name: 'Kavita Raman', email: 'kavita.r@defenselab.gov' },
      { name: '   ', email: 'missing-name@test.org' }, // Blank name
      { name: 'Broken Domain', email: 'broken@domain' }, // Missing TLD
    ],
  },
  executive: {
    title: 'Global Healthcare Leadership Credential',
    issuer: 'International Medical Academy',
    issuerTitle: 'President of Fellowship',
    theme: 'ruby',
    badge: 'Executive Honors',
    recipients: [
      { name: 'Dr. Sarah Jenkins, MD', email: 's.jenkins@generalmed.org' },
      { name: 'Dr. Rajiv Patel, PhD', email: 'rajiv.patel@biotechlabs.com' },
      { name: 'Astrid Lindholm', email: 'astrid.l@nordichealth.se' },
    ],
  },
};

export const StudioView: React.FC<StudioProps> = ({ onJobCreated }) => {
  const [title, setTitle] = useState('Cloud & Distributed Systems Specialist');
  const [issuer, setIssuer] = useState('Institute of Applied Computer Science');
  const [issuerTitle, setIssuerTitle] = useState('Dean of Engineering');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [theme, setTheme] = useState<CertificateTheme>('sapphire');
  const [recipients, setRecipients] = useState<RecipientInput[]>(PRESETS.standard.recipients);
  const [selectedRecipientIndex, setSelectedRecipientIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [csvInput, setCsvInput] = useState('');
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const applyPreset = (key: keyof typeof PRESETS) => {
    const p = PRESETS[key];
    setTitle(p.title);
    setIssuer(p.issuer);
    setIssuerTitle(p.issuerTitle);
    setTheme(p.theme);
    setRecipients([...p.recipients]);
    setSelectedRecipientIndex(0);
    setErrorMessage(null);
  };

  const handleAddRecipient = () => {
    setRecipients([...recipients, { name: '', email: '' }]);
    setSelectedRecipientIndex(recipients.length);
  };

  const handleRemoveRecipient = (index: number) => {
    if (recipients.length <= 1) return;
    const next = recipients.filter((_, i) => i !== index);
    setRecipients(next);
    setSelectedRecipientIndex(Math.min(selectedRecipientIndex, next.length - 1));
  };

  const handleUpdateRecipient = (index: number, field: 'name' | 'email', val: string) => {
    const next = [...recipients];
    next[index] = { ...next[index], [field]: val };
    setRecipients(next);
  };

  const handleParseCsv = () => {
    if (!csvInput.trim()) return;
    const lines = csvInput.trim().split('\n');
    const parsed: RecipientInput[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      // Skip header if contains 'name' and 'email'
      if (line.toLowerCase().includes('name') && line.toLowerCase().includes('email')) continue;

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
      setShowCsvModal(false);
      setCsvInput('');
    }
  };

  const isEmailValid = (email: string) => {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim());
  };

  const handleSubmitJob = async () => {
    if (!title.trim()) {
      setErrorMessage('Please specify an event or certification title.');
      return;
    }
    if (!issuer.trim()) {
      setErrorMessage('Please specify an issuing organization.');
      return;
    }
    if (recipients.length === 0) {
      setErrorMessage('Please add at least one recipient.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

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
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to submit generation job');
      }

      onJobCreated(data.jobId);
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error while submitting job.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedRecipient = recipients[selectedRecipientIndex] || { name: 'Recipient Name', email: '' };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Preset Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <span>Bulk Certificate Studio</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Submit $N$ recipients in a single bulk request with background generation & partial failure resilience.
          </p>
        </div>

        {/* Preset Selector buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 font-medium">Load Preset:</span>
          <button
            onClick={() => applyPreset('standard')}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            All-Valid (5)
          </button>
          <button
            onClick={() => applyPreset('failureTest')}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-950/60 hover:bg-amber-900/60 text-amber-200 border border-amber-800/80 transition-colors"
            title="Includes 3 valid recipients and 3 deliberate failure test cases"
          >
            Failure Test (6)
          </button>
          <button
            onClick={() => applyPreset('executive')}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            Executive (3)
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Grid: Left Config & Recipient Table / Right Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Configuration & Recipient Table (7 cols) */}
        <div className="lg:col-span-6 xl:col-span-6 space-y-5">
          {/* Batch Metadata Card */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              01. Batch & Credential Metadata
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Event / Course / Degree Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 font-sans"
                  placeholder="e.g. Distributed Systems Architecture 2026"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Issuing Organization
                  </label>
                  <input
                    type="text"
                    value={issuer}
                    onChange={e => setIssuer(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 font-sans"
                    placeholder="e.g. Institute of Technology"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Signatory Title
                  </label>
                  <input
                    type="text"
                    value={issuerTitle}
                    onChange={e => setIssuerTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 font-sans"
                    placeholder="e.g. Dean of Engineering"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Date of Issuance
                  </label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={e => setIssueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Template Theme Accent
                  </label>
                  <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800">
                    {(['gold', 'sapphire', 'emerald', 'ruby'] as CertificateTheme[]).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTheme(t)}
                        className={`py-1 text-xs font-medium rounded capitalize transition-colors ${
                          theme === t
                            ? 'bg-slate-800 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recipient Roster Card */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  02. Recipient Roster ({recipients.length})
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Click any row to preview certificate live. Invalid entries are flagged for failure isolation demo.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCsvModal(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  Import CSV
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

            {/* Recipient Table */}
            <div className="border border-slate-800 rounded-lg overflow-hidden max-h-[320px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 sticky top-0 border-b border-slate-800 text-slate-400 font-mono">
                  <tr>
                    <th className="py-2 px-3 w-8">#</th>
                    <th className="py-2 px-3">Full Name</th>
                    <th className="py-2 px-3">Email Address</th>
                    <th className="py-2 px-3 w-16 text-center">Syntax</th>
                    <th className="py-2 px-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {recipients.map((rec, idx) => {
                    const nameOk = Boolean(rec.name && rec.name.trim().length > 0);
                    const emailOk = isEmailValid(rec.email);
                    const isSelected = selectedRecipientIndex === idx;

                    return (
                      <tr
                        key={idx}
                        onClick={() => setSelectedRecipientIndex(idx)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-indigo-950/40 text-white' : 'hover:bg-slate-800/50 text-slate-300'
                        }`}
                      >
                        <td className="py-2 px-3 font-mono text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={rec.name}
                            onChange={e => handleUpdateRecipient(idx, 'name', e.target.value)}
                            onClick={e => e.stopPropagation()}
                            placeholder="Recipient full name"
                            className="w-full bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 focus:outline-none py-0.5 text-xs text-slate-200"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={rec.email}
                            onChange={e => handleUpdateRecipient(idx, 'email', e.target.value)}
                            onClick={e => e.stopPropagation()}
                            placeholder="recipient@example.com"
                            className="w-full bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 focus:outline-none py-0.5 text-xs font-mono text-slate-200"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          {nameOk && emailOk ? (
                            <span className="inline-flex items-center text-[10px] text-emerald-400" title="Valid">
                              <CheckCircle className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center text-[10px] text-amber-400 cursor-help"
                              title={
                                !nameOk && !emailOk
                                  ? 'Blank name & invalid email'
                                  : !nameOk
                                  ? 'Blank name'
                                  : 'Invalid email syntax'
                              }
                            >
                              <AlertCircle className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right">
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

            {/* Submit Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSubmitJob}
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/50 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Dispatching Bulk Request...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Bulk Generation Request</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 px-1">
                <span>Returns HTTP 202 Accepted</span>
                <span>Asynchronous Queue with Error Isolation</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Certificate Preview Component (6 cols) */}
        <div className="lg:col-span-6 xl:col-span-6 flex flex-col">
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex-1 flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Dynamic Certificate Preview
                </span>
              </div>
              <span className="text-xs text-indigo-400 font-mono font-semibold">
                Live Parameter Binding
              </span>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              <DynamicCertificatePreview
                recipientName={selectedRecipient.name || 'Sample Recipient'}
                recipientEmail={selectedRecipient.email || 'sample@domain.com'}
                title={title || 'Certification Title'}
                issuer={issuer || 'Institution'}
                issuerTitle={issuerTitle || 'Authority'}
                issueDate={issueDate}
                theme={theme}
                verificationCode={`PREV-${(selectedRecipientIndex + 1).toString().padStart(4, '0')}`}
                totalRecipients={recipients.length}
                currentRecipientIndex={selectedRecipientIndex}
                onNavigateRecipient={idx => setSelectedRecipientIndex(idx)}
                onThemeChange={newTheme => setTheme(newTheme)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* CSV Import Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Import Recipients via CSV</h3>
              <button
                onClick={() => setShowCsvModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Paste comma-separated data with one recipient per line in format:
              <br />
              <code className="text-indigo-300 font-mono">Full Name, email@domain.com</code>
            </p>

            <textarea
              rows={6}
              value={csvInput}
              onChange={e => setCsvInput(e.target.value)}
              placeholder="Alice Sterling, alice@example.com&#10;Bob Vance, bob@vance.com&#10;Charlie Chaplin, charlie@chaplin.org"
              className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCsvModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleParseCsv}
                className="px-4 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              >
                Import Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
