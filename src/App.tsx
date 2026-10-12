import React, { useState } from 'react';
import { EmailSenderView } from './components/EmailSenderView';
import { StudioView } from './components/StudioView';
import { JobMonitorView } from './components/JobMonitorView';
import { VerificationView } from './components/VerificationView';
import { ApiExplorerView } from './components/ApiExplorerView';
import { TestRunnerView } from './components/TestRunnerView';
import { CodebaseExplorerView } from './components/CodebaseExplorerView';
import { Mail, Plus } from 'lucide-react';

type NavTab = 'sender' | 'studio' | 'monitor' | 'verification' | 'api' | 'tests' | 'codebase';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('sender');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [verifyTargetCode, setVerifyTargetCode] = useState<string | undefined>(undefined);

  const handleJobCreated = (jobId: string) => {
    setActiveJobId(jobId);
    setActiveTab('monitor');
  };

  const handleSelectCertForVerify = (code: string) => {
    setVerifyTargetCode(code);
    setActiveTab('verification');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Top Bar Contract: Zone 1 (Wordmark) — Zone 2 (Nav Links) — Zone 3 (Action Button) */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
          {/* Zone 1: Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-lg font-bold tracking-tight text-white font-sans whitespace-nowrap">
              CertiFlow
            </span>
            <span className="hidden sm:inline text-xs text-slate-500 font-mono">
              / bulk-engine
            </span>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
            <button
              onClick={() => setActiveTab('sender')}
              className={`transition-colors whitespace-nowrap py-1 flex items-center gap-1.5 ${
                activeTab === 'sender' ? 'text-white border-b-2 border-indigo-500 font-semibold' : 'hover:text-slate-200'
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-indigo-400" />
              <span>Send to Email</span>
            </button>
            <button
              onClick={() => setActiveTab('studio')}
              className={`transition-colors whitespace-nowrap py-1 ${
                activeTab === 'studio' ? 'text-white border-b-2 border-indigo-500 font-semibold' : 'hover:text-slate-200'
              }`}
            >
              Bulk Studio
            </button>
            <button
              onClick={() => setActiveTab('monitor')}
              className={`transition-colors whitespace-nowrap py-1 ${
                activeTab === 'monitor' ? 'text-white border-b-2 border-indigo-500 font-semibold' : 'hover:text-slate-200'
              }`}
            >
              Job Monitor
            </button>
            <button
              onClick={() => setActiveTab('verification')}
              className={`transition-colors whitespace-nowrap py-1 ${
                activeTab === 'verification' ? 'text-white border-b-2 border-indigo-500 font-semibold' : 'hover:text-slate-200'
              }`}
            >
              Verification
            </button>
            <button
              onClick={() => setActiveTab('api')}
              className={`transition-colors whitespace-nowrap py-1 ${
                activeTab === 'api' ? 'text-white border-b-2 border-indigo-500 font-semibold' : 'hover:text-slate-200'
              }`}
            >
              API Playground
            </button>
            <button
              onClick={() => setActiveTab('tests')}
              className={`transition-colors whitespace-nowrap py-1 ${
                activeTab === 'tests' ? 'text-white border-b-2 border-indigo-500 font-semibold' : 'hover:text-slate-200'
              }`}
            >
              Test Suite
            </button>
            <button
              onClick={() => setActiveTab('codebase')}
              className={`transition-colors whitespace-nowrap py-1 ${
                activeTab === 'codebase' ? 'text-white border-b-2 border-indigo-500 font-semibold' : 'hover:text-slate-200'
              }`}
            >
              Python Codebase
            </button>
          </nav>

          {/* Zone 3: Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('sender')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors whitespace-nowrap shadow-sm shadow-indigo-500/20"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Send to Email</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden items-center gap-4 text-xs font-medium text-slate-400 overflow-x-auto pt-2.5 scrollbar-none">
          <button
            onClick={() => setActiveTab('sender')}
            className={`whitespace-nowrap pb-1 ${activeTab === 'sender' ? 'text-white border-b-2 border-indigo-500' : ''}`}
          >
            Send Email
          </button>
          <button
            onClick={() => setActiveTab('studio')}
            className={`whitespace-nowrap pb-1 ${activeTab === 'studio' ? 'text-white border-b-2 border-indigo-500' : ''}`}
          >
            Studio
          </button>
          <button
            onClick={() => setActiveTab('monitor')}
            className={`whitespace-nowrap pb-1 ${activeTab === 'monitor' ? 'text-white border-b-2 border-indigo-500' : ''}`}
          >
            Monitor
          </button>
          <button
            onClick={() => setActiveTab('verification')}
            className={`whitespace-nowrap pb-1 ${activeTab === 'verification' ? 'text-white border-b-2 border-indigo-500' : ''}`}
          >
            Verification
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`whitespace-nowrap pb-1 ${activeTab === 'api' ? 'text-white border-b-2 border-indigo-500' : ''}`}
          >
            API
          </button>
          <button
            onClick={() => setActiveTab('tests')}
            className={`whitespace-nowrap pb-1 ${activeTab === 'tests' ? 'text-white border-b-2 border-indigo-500' : ''}`}
          >
            Tests
          </button>
          <button
            onClick={() => setActiveTab('codebase')}
            className={`whitespace-nowrap pb-1 ${activeTab === 'codebase' ? 'text-white border-b-2 border-indigo-500' : ''}`}
          >
            Python Repo
          </button>
        </div>
      </header>

      {/* Main Viewport Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'sender' && (
          <EmailSenderView onSelectCertForVerify={handleSelectCertForVerify} />
        )}
        {activeTab === 'studio' && <StudioView onJobCreated={handleJobCreated} />}
        {activeTab === 'monitor' && (
          <JobMonitorView
            initialJobId={activeJobId}
            onSelectCertForVerify={handleSelectCertForVerify}
          />
        )}
        {activeTab === 'verification' && <VerificationView initialCode={verifyTargetCode} />}
        {activeTab === 'api' && <ApiExplorerView />}
        {activeTab === 'tests' && <TestRunnerView />}
        {activeTab === 'codebase' && <CodebaseExplorerView />}
      </main>

      {/* Clean Unboxed Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 px-6 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>CertiFlow Bulk Certificate Generator</span>
            <span aria-hidden="true">·</span>
            <span>FastAPI & Relational Architecture</span>
            <span aria-hidden="true">·</span>
            <span>Direct Email Dispatch System</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500">
            <span>HTTP 202 Async Queues</span>
            <span aria-hidden="true">/</span>
            <span>SHA-256 Tamper Protection</span>
            <span aria-hidden="true">/</span>
            <span>Instant Email Outbox</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
