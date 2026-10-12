import React, { useState, useEffect } from 'react';
import { JobRecord, CertificateRecord } from '../types';
import { CertificateTemplate } from './CertificateTemplate';
import JSZip from 'jszip';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Download,
  Eye,
  FileCheck2,
  AlertCircle,
  ExternalLink,
  RotateCw,
  FileSpreadsheet,
} from 'lucide-react';

interface JobMonitorProps {
  initialJobId?: string | null;
  onSelectCertForVerify?: (code: string) => void;
}

export const JobMonitorView: React.FC<JobMonitorProps> = ({
  initialJobId,
  onSelectCertForVerify,
}) => {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(initialJobId || null);
  const [selectedJob, setSelectedJob] = useState<JobRecord | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'failed'>('all');
  const [previewCert, setPreviewCert] = useState<CertificateRecord | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [pollingActive, setPollingActive] = useState(true);

  // Fetch list of all jobs
  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      if (data.jobs) {
        setJobs(data.jobs);
        if (!selectedJobId && data.jobs.length > 0) {
          setSelectedJobId(data.jobs[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    }
  };

  // Fetch details for currently selected job
  const fetchJobDetails = async (jobId: string) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.job) {
        setSelectedJob(data.job);
        // If job is terminal, we can relax polling
        if (data.job.status === 'completed' || data.job.status === 'partial_failure' || data.job.status === 'failed') {
          // Keep polling slow
        }
      }
    } catch (err) {
      console.error('Failed to fetch job details:', err);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (initialJobId) {
      setSelectedJobId(initialJobId);
    }
  }, [initialJobId]);

  useEffect(() => {
    if (!selectedJobId) return;
    fetchJobDetails(selectedJobId);

    // Auto-polling interval for real-time progress updates
    const interval = setInterval(() => {
      if (pollingActive) {
        fetchJobDetails(selectedJobId);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedJobId, pollingActive]);

  const handleRetryFailed = async () => {
    if (!selectedJob) return;
    setIsRetrying(true);
    try {
      const res = await fetch(`/api/jobs/${selectedJob.id}/retry-failed`, { method: 'POST' });
      if (res.ok) {
        fetchJobDetails(selectedJob.id);
        fetchJobs();
      }
    } catch (err) {
      console.error('Failed to retry failed items:', err);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDownloadAllZip = async () => {
    if (!selectedJob || !selectedJob.recipients) return;
    setIsZipping(true);

    try {
      const zip = new JSZip();
      const folder = zip.folder(`certificates_${selectedJob.id}`);

      // Filter only completed certificates
      const completedCerts = selectedJob.recipients.filter(c => c.status === 'completed');

      completedCerts.forEach(cert => {
        const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 700" width="1000" height="700">
  <rect width="1000" height="700" fill="#FCFCFA" />
  <rect x="24" y="24" width="952" height="652" fill="none" stroke="#B45309" stroke-width="5" rx="8" />
  <text x="500" y="110" font-family="sans-serif" font-size="14" font-weight="700" fill="#B45309" letter-spacing="4" text-anchor="middle">
    ${selectedJob.issuer.toUpperCase()}
  </text>
  <text x="500" y="170" font-family="serif" font-size="34" font-weight="700" fill="#0F172A" text-anchor="middle">
    CERTIFICATE OF COMPLETION
  </text>
  <text x="500" y="280" font-family="serif" font-size="40" font-weight="700" fill="#92400E" text-anchor="middle">
    ${cert.recipientName}
  </text>
  <text x="500" y="400" font-family="sans-serif" font-size="24" font-weight="700" fill="#0F172A" text-anchor="middle">
    ${cert.title}
  </text>
  <text x="200" y="540" font-family="sans-serif" font-size="12" fill="#334155">${selectedJob.issuer} (${selectedJob.issuerTitle})</text>
  <text x="700" y="540" font-family="monospace" font-size="12" fill="#334155">Date: ${cert.issueDate} | ${cert.verificationCode}</text>
  <text x="500" y="640" font-family="monospace" font-size="10" fill="#94A3B8" text-anchor="middle">
    SHA-256: ${cert.hash}
  </text>
</svg>`;
        const safeName = cert.recipientName.replace(/[^a-zA-Z0-9_-]/g, '_');
        folder?.file(`${cert.verificationCode}_${safeName}.svg`, svgContent.trim());
      });

      // Include batch manifest
      const manifest = {
        jobId: selectedJob.id,
        title: selectedJob.title,
        issuer: selectedJob.issuer,
        issueDate: selectedJob.issueDate,
        totalCount: selectedJob.totalCount,
        completedCount: selectedJob.completedCount,
        failedCount: selectedJob.failedCount,
        exportedAt: new Date().toISOString(),
        certificates: completedCerts.map(c => ({
          recipient: c.recipientName,
          email: c.recipientEmail,
          verificationCode: c.verificationCode,
          hash: c.hash,
        })),
      };
      folder?.file('manifest.json', JSON.stringify(manifest, null, 2));

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificates_bundle_${selectedJob.id}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to create zip bundle:', err);
    } finally {
      setIsZipping(false);
    }
  };

  const handleExportResultsCsv = () => {
    if (!selectedJob || !selectedJob.recipients) return;
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

    const rows = selectedJob.recipients.map(cert => {
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
    a.download = `job_${selectedJob.id}_results.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const recipients = selectedJob?.recipients || [];
  const filteredRecipients = recipients.filter(r => {
    if (filterStatus === 'completed') return r.status === 'completed';
    if (filterStatus === 'failed') return r.status === 'failed';
    return true;
  });

  const progressPercent = selectedJob?.totalCount
    ? Math.round(((selectedJob.completedCount + selectedJob.failedCount) / selectedJob.totalCount) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Controls & Job Selector Strip */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-3">
          <FileCheck2 className="w-5 h-5 text-indigo-400" />
          <div>
            <h2 className="text-sm font-semibold text-white">Bulk Job Monitor & Progress</h2>
            <p className="text-xs text-slate-400">
              Live tracking of generation queues, error diagnostics, and credential downloads.
            </p>
          </div>
        </div>

        {/* Job selector dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs text-slate-400 whitespace-nowrap">Select Job:</label>
          <select
            value={selectedJobId || ''}
            onChange={e => setSelectedJobId(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 font-mono"
          >
            {jobs.map(j => (
              <option key={j.id} value={j.id}>
                {j.id} — {j.title.slice(0, 24)}... ({j.completedCount}/{j.totalCount})
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              if (selectedJobId) fetchJobDetails(selectedJobId);
              fetchJobs();
            }}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg"
            title="Refresh"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {selectedJob ? (
        <div className="space-y-6">
          {/* Real-Time Status & Progress Overview Card */}
          <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-white tracking-tight">{selectedJob.title}</h3>
                  {/* Status Indicator */}
                  {selectedJob.status === 'completed' && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Completed
                    </span>
                  )}
                  {selectedJob.status === 'partial_failure' && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2.5 py-0.5 rounded-full">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Partial Failure (Isolated)
                    </span>
                  )}
                  {selectedJob.status === 'processing' && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 bg-sky-950/60 border border-sky-800/80 px-2.5 py-0.5 rounded-full">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Processing In Background
                    </span>
                  )}
                  {selectedJob.status === 'queued' && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full">
                      <Clock className="w-3.5 h-3.5" />
                      Queued
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                  <span>Job ID: {selectedJob.id}</span>
                  <span aria-hidden="true">·</span>
                  <span>Issuer: {selectedJob.issuer}</span>
                  <span aria-hidden="true">·</span>
                  <span>Created: {new Date(selectedJob.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Action Buttons: Download ZIP & Retry */}
              <div className="flex items-center gap-2">
                {selectedJob.failedCount > 0 && (
                  <button
                    onClick={handleRetryFailed}
                    disabled={isRetrying}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-colors"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                    Retry {selectedJob.failedCount} Failed
                  </button>
                )}

                <button
                  onClick={handleExportResultsCsv}
                  disabled={!selectedJob || selectedJob.recipients?.length === 0}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white transition-colors shadow-sm"
                  title="Export results with unique certificate IDs and verification links"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>

                <button
                  onClick={handleDownloadAllZip}
                  disabled={isZipping || selectedJob.completedCount === 0}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isZipping ? 'Archiving...' : `Download All (${selectedJob.completedCount} ZIP)`}
                </button>
              </div>
            </div>

            {/* Live Animated Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-slate-300">
                  Generation Progress: {selectedJob.completedCount + selectedJob.failedCount} of {selectedJob.totalCount} completed
                </span>
                <span className="font-mono text-indigo-400 font-bold">{progressPercent}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                <div
                  className="bg-emerald-500 transition-all duration-300"
                  style={{ width: `${(selectedJob.completedCount / (selectedJob.totalCount || 1)) * 100}%` }}
                  title="Completed"
                />
                <div
                  className="bg-rose-500 transition-all duration-300"
                  style={{ width: `${(selectedJob.failedCount / (selectedJob.totalCount || 1)) * 100}%` }}
                  title="Failed (Isolated)"
                />
              </div>
            </div>

            {/* Metric KPI cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
                <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Total Batch</div>
                <div className="text-xl font-bold font-mono text-white mt-1 tabular-nums">{selectedJob.totalCount}</div>
              </div>
              <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/40">
                <div className="text-[11px] text-emerald-400 uppercase tracking-wider font-semibold">Generated Successfully</div>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">{selectedJob.completedCount}</div>
              </div>
              <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-900/40">
                <div className="text-[11px] text-rose-400 uppercase tracking-wider font-semibold">Validation Failures</div>
                <div className="text-xl font-bold font-mono text-rose-400 mt-1 tabular-nums">{selectedJob.failedCount}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
                <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Remaining In Queue</div>
                <div className="text-xl font-bold font-mono text-slate-300 mt-1 tabular-nums">{selectedJob.pendingCount}</div>
              </div>
            </div>
          </div>

          {/* Recipient Results Roster */}
          <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-white">Itemized Recipient Results ({filteredRecipients.length})</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Notice how validation errors are isolated per recipient without interrupting the batch.
                </p>
              </div>

              {/* Segmented Filter Control */}
              <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    filterStatus === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({recipients.length})
                </button>
                <button
                  onClick={() => setFilterStatus('completed')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    filterStatus === 'completed' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Completed ({selectedJob.completedCount})
                </button>
                <button
                  onClick={() => setFilterStatus('failed')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    filterStatus === 'failed' ? 'bg-slate-800 text-rose-400' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Failed ({selectedJob.failedCount})
                </button>
              </div>
            </div>

            {/* Recipient Results Table */}
            <div className="border border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-mono border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Recipient Name</th>
                    <th className="py-2.5 px-3">Email Address</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Verification ID</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredRecipients.map((cert) => {
                    return (
                      <tr key={cert.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 font-medium text-slate-200">
                          {cert.recipientName || (
                            <span className="text-rose-400 italic">(Blank / Missing Name)</span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400">
                          {cert.recipientEmail}
                        </td>
                        <td className="py-3 px-3">
                          {cert.status === 'completed' && (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Generated</span>
                            </span>
                          )}
                          {cert.status === 'failed' && (
                            <div className="flex items-center gap-1.5 text-rose-400 font-medium cursor-help" title={cert.errorMessage}>
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate max-w-[220px]">{cert.errorMessage || 'Failed'}</span>
                            </div>
                          )}
                          {cert.status === 'processing' && (
                            <span className="inline-flex items-center gap-1 text-sky-400 font-medium">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>Rendering...</span>
                            </span>
                          )}
                          {cert.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 text-slate-400">
                              <Clock className="w-3 h-3" />
                              <span>Pending</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400">
                          {cert.verificationCode || '—'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {cert.status === 'completed' && (
                              <>
                                <button
                                  onClick={() => setPreviewCert(cert)}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors text-[11px]"
                                  title="Preview Certificate"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Preview</span>
                                </button>
                                {onSelectCertForVerify && (
                                  <button
                                    onClick={() => onSelectCertForVerify(cert.verificationCode)}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/80 transition-colors text-[11px]"
                                    title="Verify Authenticity"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>Verify</span>
                                  </button>
                                )}
                              </>
                            )}
                            {cert.status === 'failed' && (
                              <span className="text-[11px] text-rose-400/80 italic">
                                Isolated
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400">
          No jobs found. Create your first batch in the Studio!
        </div>
      )}

      {/* Certificate Preview Modal */}
      {previewCert && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Official Certificate Credential</h3>
                <p className="text-xs text-slate-400 font-mono">
                  Issued to {previewCert.recipientName} ({previewCert.verificationCode})
                </p>
              </div>
              <button
                onClick={() => setPreviewCert(null)}
                className="text-slate-400 hover:text-white px-2 py-1 text-sm rounded bg-slate-800"
              >
                ✕ Close
              </button>
            </div>

            <div className="py-2 flex justify-center">
              <CertificateTemplate
                recipientName={previewCert.recipientName}
                recipientEmail={previewCert.recipientEmail}
                title={previewCert.title}
                issuer={previewCert.issuer}
                issuerTitle={previewCert.issuerTitle}
                issueDate={previewCert.issueDate}
                verificationCode={previewCert.verificationCode}
                hash={previewCert.hash}
                theme={selectedJob?.templateTheme || 'gold'}
                interactive={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
