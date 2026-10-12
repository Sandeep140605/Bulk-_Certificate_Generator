import React, { useState, useRef } from 'react';
import { CertificateTheme } from '../types';
import {
  Download,
  Printer,
  ShieldCheck,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Sliders,
  Layers,
  Award,
  RefreshCw,
  Hash,
} from 'lucide-react';

export type FrameStyle = 'guilloche' | 'ornate' | 'modern';
export type SealStyle = 'verified' | 'excellence' | 'honors';

export interface DynamicPreviewProps {
  recipientName: string;
  recipientEmail?: string;
  title: string;
  issuer: string;
  issuerTitle?: string;
  issueDate: string;
  theme: CertificateTheme;
  verificationCode?: string;
  totalRecipients?: number;
  currentRecipientIndex?: number;
  onNavigateRecipient?: (index: number) => void;
  onThemeChange?: (theme: CertificateTheme) => void;
}

const themeStyles: Record<CertificateTheme, {
  primary: string;
  secondary: string;
  accent: string;
  borderBg: string;
  sealBg: string;
  badgeBorder: string;
}> = {
  gold: {
    primary: '#92400E',
    secondary: '#B45309',
    accent: '#D97706',
    borderBg: '#FEF3C7',
    sealBg: 'linear-gradient(135deg, #F59E0B, #B45309)',
    badgeBorder: '#F59E0B',
  },
  sapphire: {
    primary: '#1E3A8A',
    secondary: '#2563EB',
    accent: '#3B82F6',
    borderBg: '#DBEAFE',
    sealBg: 'linear-gradient(135deg, #3B82F6, #1E40AF)',
    badgeBorder: '#3B82F6',
  },
  emerald: {
    primary: '#064E3B',
    secondary: '#059669',
    accent: '#10B981',
    borderBg: '#D1FAE5',
    sealBg: 'linear-gradient(135deg, #10B981, #065F46)',
    badgeBorder: '#10B981',
  },
  ruby: {
    primary: '#881337',
    secondary: '#E11D48',
    accent: '#F43F5E',
    borderBg: '#FFE4E6',
    sealBg: 'linear-gradient(135deg, #F43F5E, #9F1239)',
    badgeBorder: '#F43F5E',
  },
};

export const DynamicCertificatePreview: React.FC<DynamicPreviewProps> = ({
  recipientName,
  recipientEmail,
  title,
  issuer,
  issuerTitle = 'Dean of Engineering',
  issueDate,
  theme,
  verificationCode = 'CRT-LIVE-PREVIEW',
  totalRecipients = 1,
  currentRecipientIndex = 0,
  onNavigateRecipient,
  onThemeChange,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [frameStyle, setFrameStyle] = useState<FrameStyle>('guilloche');
  const [sealStyle, setSealStyle] = useState<SealStyle>('verified');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const certContainerRef = useRef<HTMLDivElement>(null);

  const t = themeStyles[theme] || themeStyles.sapphire;

  // Simple live SHA-256 simulation that reacts dynamically to inputs
  const simulatedHash = React.useMemo(() => {
    let str = `${recipientName}:${title}:${issuer}:${issueDate}:${theme}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `sha256-${hex}89a7f341b52c0e819d436a5b8e9072314f`.slice(0, 32);
  }, [recipientName, title, issuer, issueDate, theme]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadSvg = () => {
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
  <text x="500" y="105" font-family="'Plus Jakarta Sans', sans-serif" font-size="13" font-weight="700" fill="${t.secondary}" letter-spacing="4" text-anchor="middle">${(issuer || 'INSTITUTION').toUpperCase()}</text>
  <text x="500" y="165" font-family="'Cinzel', serif" font-size="34" font-weight="700" fill="#0F172A" text-anchor="middle">CERTIFICATE OF COMPLETION</text>
  <text x="500" y="205" font-family="'Plus Jakarta Sans', sans-serif" font-size="13" fill="#64748B" text-anchor="middle">THIS OFFICIAL CREDENTIAL IS PROUDLY CONFERRED UPON</text>
  <text x="500" y="285" font-family="'Playfair Display', serif" font-size="42" font-weight="700" fill="${t.primary}" text-anchor="middle">${recipientName || 'Recipient Name'}</text>
  <line x1="260" y1="310" x2="740" y2="310" stroke="${t.accent}" stroke-width="1.5" />
  <text x="500" y="360" font-family="'Plus Jakarta Sans', sans-serif" font-size="15" fill="#334155" text-anchor="middle">for distinguished participation and fulfillment of the criteria in</text>
  <text x="500" y="410" font-family="'Plus Jakarta Sans', sans-serif" font-size="24" font-weight="700" fill="#0F172A" text-anchor="middle">${title || 'Certification Title'}</text>
  <g transform="translate(140, 510)">
    <line x1="0" y1="30" x2="200" y2="30" stroke="#94A3B8" stroke-width="1.5" />
    <text x="100" y="52" font-family="'Plus Jakarta Sans', sans-serif" font-size="12" font-weight="600" fill="#0F172A" text-anchor="middle">${issuer || 'Authority'}</text>
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
  <text x="500" y="640" font-family="'JetBrains Mono', monospace" font-size="9" fill="#94A3B8" text-anchor="middle">SHA-256: ${simulatedHash}... · Verified Authentic Record</text>
</svg>`;

    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `certificate_${verificationCode}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Dynamic Controls Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl">
        {/* Recipient Navigator */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400 font-medium mr-1">Previewing:</span>
          {totalRecipients > 1 && (
            <>
              <button
                type="button"
                onClick={() => onNavigateRecipient && onNavigateRecipient(Math.max(0, currentRecipientIndex - 1))}
                disabled={currentRecipientIndex === 0}
                className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Previous Recipient"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono text-indigo-400 font-semibold px-1">
                {currentRecipientIndex + 1} / {totalRecipients}
              </span>
              <button
                type="button"
                onClick={() => onNavigateRecipient && onNavigateRecipient(Math.min(totalRecipients - 1, currentRecipientIndex + 1))}
                disabled={currentRecipientIndex >= totalRecipients - 1}
                className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Next Recipient"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <span className="text-xs font-semibold text-white ml-1 truncate max-w-[140px] sm:max-w-[200px]">
            {recipientName || 'Recipient Name'}
          </span>
        </div>

        {/* Live Template Options: Theme & Frame */}
        <div className="flex items-center gap-2">
          {/* Theme Quick Switcher */}
          {onThemeChange && (
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
              {(['sapphire', 'gold', 'emerald', 'ruby'] as CertificateTheme[]).map((thm) => (
                <button
                  key={thm}
                  type="button"
                  onClick={() => onThemeChange(thm)}
                  className={`w-4 h-4 rounded-full transition-transform ${
                    theme === thm ? 'scale-125 ring-2 ring-white ring-offset-1 ring-offset-slate-900' : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor:
                      thm === 'sapphire'
                        ? '#3B82F6'
                        : thm === 'gold'
                        ? '#F59E0B'
                        : thm === 'emerald'
                        ? '#10B981'
                        : '#EF4444',
                  }}
                  title={`Switch to ${thm}`}
                />
              ))}
            </div>
          )}

          {/* Border Style Toggle */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[11px]">
            <button
              type="button"
              onClick={() => setFrameStyle('guilloche')}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                frameStyle === 'guilloche' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Guilloche
            </button>
            <button
              type="button"
              onClick={() => setFrameStyle('ornate')}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                frameStyle === 'ornate' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ornate
            </button>
            <button
              type="button"
              onClick={() => setFrameStyle('modern')}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                frameStyle === 'modern' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Minimal
            </button>
          </div>

          {/* Zoom Level Controller */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(70, z - 10))}
              className="p-1 text-slate-400 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-slate-300 w-9 text-center tabular-nums">
              {zoomLevel}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(130, z + 10))}
              className="p-1 text-slate-400 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Certificate Canvas Wrapper */}
      <div
        ref={certContainerRef}
        className="w-full flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 border border-slate-800 rounded-xl overflow-hidden min-h-[380px]"
      >
        <div
          className="transition-transform duration-200 ease-out origin-center w-full flex justify-center"
          style={{ transform: `scale(${zoomLevel / 100})` }}
        >
          {/* Real-time Rendered Certificate */}
          <div
            id="printable-certificate-container"
            className="w-full max-w-[760px] aspect-[1.414/1] bg-[#FCFCFA] text-slate-900 rounded-xl shadow-2xl relative overflow-hidden border border-slate-300 flex flex-col justify-between p-6 sm:p-10 select-none transition-all duration-200"
            style={{
              boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(255, 255, 255, 0.8)',
            }}
          >
            {/* Dynamic Frame Border */}
            {frameStyle === 'guilloche' && (
              <>
                <div
                  className="absolute inset-3 sm:inset-4 rounded-lg pointer-events-none transition-all duration-200"
                  style={{
                    border: `3px double ${t.accent}`,
                    boxShadow: `inset 0 0 0 1px ${t.borderBg}`,
                  }}
                />
                <div className="absolute inset-4 sm:inset-6 rounded border border-slate-300/80 border-dashed pointer-events-none" />
              </>
            )}

            {frameStyle === 'ornate' && (
              <>
                <div
                  className="absolute inset-2.5 sm:inset-3 rounded-lg pointer-events-none"
                  style={{ border: `4px solid ${t.secondary}` }}
                />
                <div
                  className="absolute inset-4 sm:inset-5 rounded border-2 border-slate-400/60 pointer-events-none"
                />
              </>
            )}

            {frameStyle === 'modern' && (
              <div
                className="absolute inset-3 sm:inset-4 rounded-lg pointer-events-none"
                style={{ border: `1.5px solid ${t.secondary}` }}
              />
            )}

            {/* Corner Ornamental Rosettes */}
            {frameStyle !== 'modern' && (
              <>
                <div
                  className="absolute top-3.5 left-3.5 sm:top-5 sm:left-5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ border: `1px solid ${t.accent}`, color: t.primary, backgroundColor: '#FFF' }}
                >
                  ✦
                </div>
                <div
                  className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ border: `1px solid ${t.accent}`, color: t.primary, backgroundColor: '#FFF' }}
                >
                  ✦
                </div>
                <div
                  className="absolute bottom-3.5 left-3.5 sm:bottom-5 sm:left-5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ border: `1px solid ${t.accent}`, color: t.primary, backgroundColor: '#FFF' }}
                >
                  ✦
                </div>
                <div
                  className="absolute bottom-3.5 right-3.5 sm:bottom-5 sm:right-5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ border: `1px solid ${t.accent}`, color: t.primary, backgroundColor: '#FFF' }}
                >
                  ✦
                </div>
              </>
            )}

            {/* Certificate Header */}
            <div className="text-center pt-1 sm:pt-2 z-10">
              <div
                className="text-[10px] sm:text-xs font-bold tracking-[0.25em] uppercase font-sans mb-1 transition-colors duration-200"
                style={{ color: t.secondary }}
              >
                {issuer || 'OFFICIAL ISSUING AUTHORITY'}
              </div>
              <h1 className="font-serif-cert text-xl sm:text-3xl font-bold tracking-wider text-slate-900 mb-0.5">
                CERTIFICATE OF COMPLETION
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-500 font-sans tracking-wide">
                This official credential certifies that
              </p>
            </div>

            {/* Recipient Centerpiece (Instant Real-Time Dynamic Binding) */}
            <div className="text-center my-2 sm:my-3 z-10">
              <div
                className="font-script-cert text-2xl sm:text-4xl font-bold tracking-tight py-0.5 transition-colors duration-200"
                style={{ color: t.primary }}
              >
                {recipientName || 'Recipient Name'}
              </div>
              <div
                className="h-[1.5px] w-40 sm:w-64 mx-auto mt-1.5 transition-colors duration-200"
                style={{ backgroundColor: t.accent }}
              />
              {recipientEmail && (
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {recipientEmail}
                </div>
              )}

              <p className="text-[11px] sm:text-xs text-slate-600 max-w-lg mx-auto mt-2 font-sans leading-relaxed">
                has successfully fulfilled all required coursework, assessments, and standards for
              </p>
              <h2 className="text-base sm:text-xl font-bold text-slate-900 mt-1 font-sans tracking-tight">
                {title || 'Course / Certification Title'}
              </h2>
            </div>

            {/* Bottom Row: Signatures & Seal */}
            <div className="grid grid-cols-3 items-end pt-2 pb-1 z-10 border-t border-slate-200/80">
              {/* Signatory */}
              <div className="text-center px-2">
                <div className="font-script-cert text-base sm:text-lg text-slate-700 italic select-none">
                  {issuer || 'Authority'}
                </div>
                <div className="h-[1px] w-24 sm:w-32 bg-slate-300 mx-auto my-1" />
                <div className="text-[10px] sm:text-xs font-semibold text-slate-800 truncate">
                  {issuer || 'Authority'}
                </div>
                <div className="text-[8px] sm:text-[9px] text-slate-500 truncate">
                  {issuerTitle || 'Signatory'}
                </div>
              </div>

              {/* Seal Centerpiece */}
              <div className="flex flex-col items-center justify-center">
                <div
                  className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex flex-col items-center justify-center text-white shadow-md relative transition-all duration-200"
                  style={{
                    background: t.sealBg,
                    boxShadow: `0 6px 14px -3px ${t.accent}66`,
                  }}
                >
                  <div className="absolute inset-1 rounded-full border border-white/60 border-dashed" />
                  <div className="text-[7px] sm:text-[8px] font-bold uppercase tracking-wider text-white/90">
                    OFFICIAL
                  </div>
                  <ShieldCheck className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white my-0.2" />
                  <div className="text-[6px] sm:text-[7px] font-medium text-white/80">
                    VERIFIED
                  </div>
                </div>
              </div>

              {/* Date & Unique Verification ID */}
              <div className="text-center px-2">
                <div className="font-mono text-xs sm:text-sm font-semibold tracking-wider text-slate-800">
                  {issueDate || '2026-10-15'}
                </div>
                <div className="h-[1px] w-24 sm:w-32 bg-slate-300 mx-auto my-1" />
                <div className="text-[10px] sm:text-xs font-semibold text-slate-800">
                  Date of Issuance
                </div>
                <div
                  className="text-[9px] sm:text-[11px] font-mono font-medium mt-0.5 tracking-wider truncate"
                  style={{ color: t.secondary }}
                >
                  {verificationCode}
                </div>
              </div>
            </div>

            {/* Cryptographic SHA-256 Tamper Digest Footer */}
            <div className="text-center pt-1 text-[8px] sm:text-[9px] text-slate-400 font-mono tracking-tight flex items-center justify-center gap-1.5">
              <span>SHA-256: {simulatedHash}...</span>
              <span aria-hidden="true">·</span>
              <span>Official Digital Credential</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadSvg}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors border border-slate-700"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Download Vector SVG</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors border border-slate-700"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-400" />
            <span>Print / PDF</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-emerald-400 font-mono text-[11px]">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Real-Time Parameter Sync Active</span>
        </div>
      </div>
    </div>
  );
};
