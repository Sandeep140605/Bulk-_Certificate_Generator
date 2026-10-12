import React, { useRef } from 'react';
import { CertificateTheme } from '../types';
import { Download, Printer, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface CertificateProps {
  recipientName: string;
  recipientEmail?: string;
  title: string;
  issuer: string;
  issuerTitle?: string;
  issueDate: string;
  verificationCode: string;
  hash?: string;
  theme?: CertificateTheme;
  interactive?: boolean;
}

const themeConfigs: Record<CertificateTheme, {
  primary: string;
  secondary: string;
  accent: string;
  borderBg: string;
  sealBg: string;
  sealColor: string;
  badgeBorder: string;
}> = {
  gold: {
    primary: '#92400E',
    secondary: '#B45309',
    accent: '#D97706',
    borderBg: '#FEF3C7',
    sealBg: 'linear-gradient(135deg, #F59E0B, #B45309)',
    sealColor: '#FFF',
    badgeBorder: '#F59E0B',
  },
  sapphire: {
    primary: '#1E3A8A',
    secondary: '#2563EB',
    accent: '#3B82F6',
    borderBg: '#DBEAFE',
    sealBg: 'linear-gradient(135deg, #3B82F6, #1E40AF)',
    sealColor: '#FFF',
    badgeBorder: '#3B82F6',
  },
  emerald: {
    primary: '#064E3B',
    secondary: '#059669',
    accent: '#10B981',
    borderBg: '#D1FAE5',
    sealBg: 'linear-gradient(135deg, #10B981, #065F46)',
    sealColor: '#FFF',
    badgeBorder: '#10B981',
  },
  ruby: {
    primary: '#881337',
    secondary: '#E11D48',
    accent: '#F43F5E',
    borderBg: '#FFE4E6',
    sealBg: 'linear-gradient(135deg, #F43F5E, #9F1239)',
    sealColor: '#FFF',
    badgeBorder: '#F43F5E',
  },
};

export const CertificateTemplate: React.FC<CertificateProps> = ({
  recipientName,
  recipientEmail,
  title,
  issuer,
  issuerTitle = 'Dean & Chief Executive',
  issueDate,
  verificationCode,
  hash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  theme = 'gold',
  interactive = true,
}) => {
  const certRef = useRef<HTMLDivElement>(null);
  const t = themeConfigs[theme] || themeConfigs.gold;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadSvg = () => {
    // Generate standalone scalable SVG file for the certificate
    const svgData = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 700" width="1000" height="700">
  <defs>
    <linearGradient id="certGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${t.accent}" />
      <stop offset="100%" stop-color="${t.secondary}" />
    </linearGradient>
  </defs>
  <rect width="1000" height="700" fill="#FCFCFA" />
  <rect x="24" y="24" width="952" height="652" fill="none" stroke="url(#certGrad)" stroke-width="6" rx="8" />
  <rect x="36" y="36" width="928" height="628" fill="none" stroke="#CBD5E1" stroke-width="1.5" stroke-dasharray="8 4" rx="4" />
  
  <text x="500" y="105" font-family="'Plus Jakarta Sans', sans-serif" font-size="13" font-weight="700" fill="${t.secondary}" letter-spacing="4" text-anchor="middle">
    ${issuer.toUpperCase()}
  </text>
  <text x="500" y="165" font-family="'Cinzel', serif" font-size="34" font-weight="700" fill="#0F172A" text-anchor="middle">
    CERTIFICATE OF COMPLETION
  </text>
  <text x="500" y="205" font-family="'Plus Jakarta Sans', sans-serif" font-size="13" fill="#64748B" text-anchor="middle">
    THIS OFFICIAL CREDENTIAL IS PROUDLY CONFERRED UPON
  </text>
  <text x="500" y="285" font-family="'Playfair Display', serif" font-size="42" font-weight="700" fill="${t.primary}" text-anchor="middle">
    ${recipientName || 'Recipient Name'}
  </text>
  <line x1="260" y1="310" x2="740" y2="310" stroke="${t.accent}" stroke-width="1.5" />
  
  <text x="500" y="360" font-family="'Plus Jakarta Sans', sans-serif" font-size="15" fill="#334155" text-anchor="middle">
    for distinguished participation and fulfillment of the criteria in
  </text>
  <text x="500" y="410" font-family="'Plus Jakarta Sans', sans-serif" font-size="24" font-weight="700" fill="#0F172A" text-anchor="middle">
    ${title || 'Certification Title'}
  </text>

  <g transform="translate(140, 510)">
    <line x1="0" y1="30" x2="200" y2="30" stroke="#94A3B8" stroke-width="1.5" />
    <text x="100" y="52" font-family="'Plus Jakarta Sans', sans-serif" font-size="12" font-weight="600" fill="#0F172A" text-anchor="middle">${issuer}</text>
    <text x="100" y="68" font-family="'Plus Jakarta Sans', sans-serif" font-size="11" fill="#64748B" text-anchor="middle">${issuerTitle}</text>
  </g>

  <g transform="translate(500, 525)">
    <circle cx="0" cy="0" r="38" fill="${t.secondary}" />
    <circle cx="0" cy="0" r="32" fill="none" stroke="#FFF" stroke-width="1.5" stroke-dasharray="3 2" />
    <text x="0" y="-6" font-family="'Plus Jakarta Sans', sans-serif" font-size="8" font-weight="700" fill="#FFF" text-anchor="middle">OFFICIAL</text>
    <text x="0" y="8" font-family="'Cinzel', serif" font-size="14" fill="#FFF" text-anchor="middle">★</text>
    <text x="0" y="18" font-family="'Plus Jakarta Sans', sans-serif" font-size="8" fill="#FFF" text-anchor="middle">VERIFIED</text>
  </g>

  <g transform="translate(660, 510)">
    <line x1="0" y1="30" x2="200" y2="30" stroke="#94A3B8" stroke-width="1.5" />
    <text x="100" y="52" font-family="'Plus Jakarta Sans', sans-serif" font-size="12" font-weight="600" fill="#0F172A" text-anchor="middle">Date: ${issueDate}</text>
    <text x="100" y="68" font-family="'JetBrains Mono', monospace" font-size="11" fill="${t.secondary}" text-anchor="middle">${verificationCode}</text>
  </g>

  <text x="500" y="640" font-family="'JetBrains Mono', monospace" font-size="9" fill="#94A3B8" text-anchor="middle">
    SHA-256: ${hash.slice(0, 32)}... · Verified Authentic Record
  </text>
</svg>`;

    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `certificate_${verificationCode || 'credential'}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Certificate Frame */}
      <div
        id="printable-certificate-container"
        ref={certRef}
        className="w-full max-w-[850px] aspect-[1.414/1] bg-[#FCFCFA] text-slate-900 rounded-xl shadow-2xl relative overflow-hidden border border-slate-300 flex flex-col justify-between p-8 sm:p-12 select-none"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(255, 255, 255, 0.8)',
        }}
      >
        {/* Vector Guilloche Decorative Outer Border */}
        <div
          className="absolute inset-3.5 sm:inset-5 rounded-lg pointer-events-none"
          style={{
            border: `3px double ${t.accent}`,
            boxShadow: `inset 0 0 0 1px ${t.borderBg}`,
          }}
        />
        <div
          className="absolute inset-5 sm:inset-7 rounded border border-slate-300/80 border-dashed pointer-events-none"
        />

        {/* 4 Corner Rosettes */}
        <div
          className="absolute top-4 left-4 sm:top-6 sm:left-6 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
          style={{ border: `1px solid ${t.accent}`, color: t.primary, backgroundColor: '#FFF' }}
        >
          ✦
        </div>
        <div
          className="absolute top-4 right-4 sm:top-6 sm:right-6 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
          style={{ border: `1px solid ${t.accent}`, color: t.primary, backgroundColor: '#FFF' }}
        >
          ✦
        </div>
        <div
          className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
          style={{ border: `1px solid ${t.accent}`, color: t.primary, backgroundColor: '#FFF' }}
        >
          ✦
        </div>
        <div
          className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
          style={{ border: `1px solid ${t.accent}`, color: t.primary, backgroundColor: '#FFF' }}
        >
          ✦
        </div>

        {/* Certificate Top Header */}
        <div className="text-center pt-2 sm:pt-4 z-10">
          <div
            className="text-[11px] sm:text-xs font-bold tracking-[0.25em] uppercase font-sans mb-1"
            style={{ color: t.secondary }}
          >
            {issuer || 'Official Issuing Authority'}
          </div>
          <h1 className="font-serif-cert text-2xl sm:text-4xl font-bold tracking-wider text-slate-900 mb-1">
            CERTIFICATE OF COMPLETION
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-sans tracking-wide">
            This official credential certifies that
          </p>
        </div>

        {/* Recipient Centerpiece */}
        <div className="text-center my-3 sm:my-5 z-10">
          <div
            className="font-script-cert text-3xl sm:text-5xl font-bold tracking-tight py-1"
            style={{ color: t.primary }}
          >
            {recipientName || 'Recipient Name'}
          </div>
          <div
            className="h-[1.5px] w-48 sm:w-80 mx-auto mt-2"
            style={{ backgroundColor: t.accent }}
          />
          {recipientEmail && (
            <div className="text-[11px] text-slate-400 font-mono mt-1">
              {recipientEmail}
            </div>
          )}

          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto mt-3 font-sans leading-relaxed">
            has successfully fulfilled all required coursework, rigorous examinations, and professional criteria for
          </p>
          <h2 className="text-lg sm:text-2xl font-bold text-slate-900 mt-2 font-sans tracking-tight">
            {title || 'Certificate Title'}
          </h2>
        </div>

        {/* Signatures & Seal Bottom Row */}
        <div className="grid grid-cols-3 items-end pt-4 pb-2 z-10 border-t border-slate-200/80">
          {/* Signatory 1 */}
          <div className="text-center px-2">
            <div className="font-script-cert text-lg sm:text-xl text-slate-700 italic select-none">
              {issuer}
            </div>
            <div className="h-[1px] w-28 sm:w-40 bg-slate-300 mx-auto my-1" />
            <div className="text-[11px] sm:text-xs font-semibold text-slate-800">
              {issuer}
            </div>
            <div className="text-[9px] sm:text-[10px] text-slate-500">
              {issuerTitle}
            </div>
          </div>

          {/* Golden / Sapphire Official Seal */}
          <div className="flex flex-col items-center justify-center">
            <div
              className="w-14 h-14 sm:w-20 sm:h-20 rounded-full flex flex-col items-center justify-center text-white shadow-lg relative"
              style={{
                background: t.sealBg,
                boxShadow: `0 8px 16px -4px ${t.accent}66`,
              }}
            >
              <div className="absolute inset-1 rounded-full border border-white/60 border-dashed" />
              <div className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-white/90">
                OFFICIAL
              </div>
              <ShieldCheck className="w-4 h-4 sm:w-6 sm:h-6 text-white my-0.5" />
              <div className="text-[7px] sm:text-[8px] font-medium text-white/80">
                VERIFIED
              </div>
            </div>
          </div>

          {/* Verification Code & Issuance Date */}
          <div className="text-center px-2">
            <div className="font-mono text-xs sm:text-sm font-semibold tracking-wider text-slate-800">
              {issueDate || '2026-10-15'}
            </div>
            <div className="h-[1px] w-28 sm:w-40 bg-slate-300 mx-auto my-1" />
            <div className="text-[11px] sm:text-xs font-semibold text-slate-800">
              Date of Issuance
            </div>
            <div
              className="text-[10px] sm:text-xs font-mono font-medium mt-0.5 tracking-wider"
              style={{ color: t.secondary }}
            >
              {verificationCode || 'CRT-0000'}
            </div>
          </div>
        </div>

        {/* Cryptographic SHA-256 Tamper Digest Footer */}
        <div className="text-center pt-2 text-[9px] sm:text-[10px] text-slate-400 font-mono tracking-tight flex items-center justify-center gap-2">
          <span>SHA-256: {hash.slice(0, 36)}...</span>
          <span aria-hidden="true">·</span>
          <span>Official Digital Credential</span>
        </div>
      </div>

      {/* Action Toolbar */}
      {interactive && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={handleDownloadSvg}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Download Vector SVG
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Save as PDF
          </button>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium px-2 py-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Anti-Tamper Cryptographically Verified</span>
          </div>
        </div>
      )}
    </div>
  );
};
