import React, { useState, useEffect } from 'react';
import { CertificateTemplate } from './CertificateTemplate';
import { ShieldCheck, Search, CheckCircle, XCircle, Award, Hash, Building2, Calendar, User } from 'lucide-react';

interface VerificationProps {
  initialCode?: string;
}

export const VerificationView: React.FC<VerificationProps> = ({ initialCode }) => {
  const [identifier, setIdentifier] = useState(initialCode || 'CRT-');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleVerify = async (codeToVerify?: string) => {
    const code = (codeToVerify || identifier).trim();
    if (!code) return;

    setLoading(true);
    setErrorMsg(null);
    setSearched(true);

    try {
      const res = await fetch(`/api/verify/${encodeURIComponent(code)}`);
      const data = await res.json();
      if (res.ok && data.verified) {
        setResult(data.certificate);
      } else {
        setResult(null);
        setErrorMsg(data.message || 'No valid certificate found for this identifier.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to verify credential.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode && initialCode !== 'CRT-') {
      setIdentifier(initialCode);
      handleVerify(initialCode);
    } else {
      // Test with first available seed code
      fetch('/api/jobs')
        .then(r => r.json())
        .then(d => {
          if (d.jobs && d.jobs.length > 0) {
            fetch(`/api/jobs/${d.jobs[0].id}`)
              .then(r => r.json())
              .then(jd => {
                const completed = jd.job?.recipients?.find((c: any) => c.status === 'completed');
                if (completed) {
                  setIdentifier(completed.verificationCode);
                  handleVerify(completed.verificationCode);
                }
              });
          }
        });
    }
  }, [initialCode]);

  return (
    <div className="space-y-6">
      {/* Search Header Card */}
      <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-semibold text-white">Public Credential Verification Portal</h2>
        </div>
        <p className="text-xs text-slate-400">
          Verify digital authenticity, cryptographic anti-tamper hashes, and institutional issuance in real-time.
        </p>

        {/* Input box */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleVerify()}
              placeholder="Enter Verification Code (e.g. CRT-XXXX) or SHA-256 Hash"
              className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            onClick={() => handleVerify()}
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {loading ? 'Verifying...' : 'Verify Credential'}
          </button>
        </div>
      </div>

      {/* Verification Result */}
      {searched && (
        <>
          {result ? (
            <div className="space-y-6">
              {/* Trust Badge Banner */}
              <div className="p-5 rounded-xl bg-emerald-950/40 border border-emerald-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-300">
                      Official Credential Cryptographically Verified
                    </h3>
                    <p className="text-xs text-emerald-400/80">
                      This certificate is authentic, untampered, and on record with the issuing institution.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs text-emerald-300 bg-emerald-950/80 px-3 py-1.5 rounded-lg border border-emerald-800">
                  <span>Code:</span>
                  <span className="font-bold">{result.verificationCode}</span>
                </div>
              </div>

              {/* Credential Metadata Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                    <User className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Recipient</span>
                  </div>
                  <div className="text-sm font-bold text-white mt-1">{result.recipientName}</div>
                  <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">{result.recipientEmail}</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>Credential</span>
                  </div>
                  <div className="text-sm font-bold text-white mt-1">{result.title}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Verified Completion</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                    <Building2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>Issuing Body</span>
                  </div>
                  <div className="text-sm font-bold text-white mt-1">{result.issuer}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{result.issuerTitle}</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Date of Record</span>
                  </div>
                  <div className="text-sm font-bold font-mono text-white mt-1">{result.issueDate}</div>
                  <div className="text-[11px] font-mono text-emerald-400 mt-0.5">Status: Valid</div>
                </div>
              </div>

              {/* SHA-256 Digest Card */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono text-slate-300">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-400">SHA-256 Digest:</span>
                  <span className="text-indigo-400 break-all">{result.sha256Fingerprint}</span>
                </div>
              </div>

              {/* Visual Certificate Rendering */}
              <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Verified Digital Certificate Document
                  </h4>
                  <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Valid & Legitimate
                  </span>
                </div>

                <CertificateTemplate
                  recipientName={result.recipientName}
                  recipientEmail={result.recipientEmail}
                  title={result.title}
                  issuer={result.issuer}
                  issuerTitle={result.issuerTitle}
                  issueDate={result.issueDate}
                  verificationCode={result.verificationCode}
                  hash={result.sha256Fingerprint}
                  theme="sapphire"
                  interactive={true}
                />
              </div>
            </div>
          ) : (
            <div className="p-10 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
                <XCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Certificate Verification Failed</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {errorMsg || 'No record exists for the provided code or SHA-256 fingerprint.'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
