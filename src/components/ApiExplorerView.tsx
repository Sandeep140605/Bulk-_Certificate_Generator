import React, { useState } from 'react';
import { Send, Copy, Check, Terminal, ExternalLink, Code } from 'lucide-react';

interface EndpointSpec {
  id: string;
  method: 'GET' | 'POST';
  path: string;
  summary: string;
  description: string;
  defaultBody?: string;
  defaultParams?: Record<string, string>;
}

const ENDPOINTS: EndpointSpec[] = [
  {
    id: 'create-job',
    method: 'POST',
    path: '/api/jobs',
    summary: 'Submit Bulk Certificate Generation Request',
    description: 'Accepts batch of recipient records, initiates asynchronous background generation queue, returns 202 Accepted.',
    defaultBody: JSON.stringify(
      {
        title: 'Full-Stack Distributed Systems Engineering',
        issuer: 'Global Cloud Computing Academy',
        issuerTitle: 'Dean of Computer Science',
        issueDate: '2026-10-15',
        templateTheme: 'sapphire',
        recipients: [
          { name: 'Dr. John Doe', email: 'johndoe@example.com' },
          { name: 'Jane Smith', email: 'janesmith@example.com' },
          { name: 'Bad Recipient', email: 'invalid-email-address' },
        ],
      },
      null,
      2
    ),
  },
  {
    id: 'list-jobs',
    method: 'GET',
    path: '/api/jobs',
    summary: 'List All Generation Jobs',
    description: 'Returns list of past and active generation jobs with counters and status breakdown.',
  },
  {
    id: 'get-job',
    method: 'GET',
    path: '/api/jobs/job_summit_2026',
    summary: 'Get Job Progress and Results',
    description: 'Polls real-time progress, percentage completion, and itemized recipient states with failure causes.',
  },
  {
    id: 'get-certificates',
    method: 'GET',
    path: '/api/jobs/job_summit_2026/certificates',
    summary: 'Retrieve Certificates for Job',
    description: 'Lists all generated certificate records with status filter and download links.',
  },
  {
    id: 'export-job-csv',
    method: 'GET',
    path: '/api/jobs/job_summit_2026/export-csv',
    summary: 'Export Job Results as CSV',
    description: 'Generates and downloads a CSV manifest containing unique certificate IDs, verification links, and cryptographic fingerprints.',
  },
  {
    id: 'verify-cert',
    method: 'GET',
    path: '/api/verify/CRT-D1515A0F',
    summary: 'Public Verification Endpoint',
    description: 'Validates credential authenticity against cryptographic SHA-256 fingerprint.',
  },
];

export const ApiExplorerView: React.FC = () => {
  const [activeEndpointId, setActiveEndpointId] = useState<string>('create-job');
  const [requestBody, setRequestBody] = useState<string>(ENDPOINTS[0].defaultBody || '');
  const [customPath, setCustomPath] = useState<string>(ENDPOINTS[0].path);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseHeaders, setResponseHeaders] = useState<Record<string, string> | null>(null);
  const [responseBody, setResponseBody] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const activeEndpoint = ENDPOINTS.find((e) => e.id === activeEndpointId) || ENDPOINTS[0];

  const handleSelectEndpoint = (endpoint: EndpointSpec) => {
    setActiveEndpointId(endpoint.id);
    setCustomPath(endpoint.path);
    setRequestBody(endpoint.defaultBody || '');
    setResponseStatus(null);
    setResponseBody(null);
  };

  const handleSendRequest = async () => {
    setLoading(true);
    setResponseStatus(null);
    setResponseBody(null);

    const startTime = performance.now();

    try {
      const options: RequestInit = {
        method: activeEndpoint.method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (activeEndpoint.method === 'POST' && requestBody) {
        options.body = requestBody;
      }

      const res = await fetch(customPath, options);
      const duration = Math.round(performance.now() - startTime);

      setResponseStatus(res.status);

      const headers: Record<string, string> = {};
      res.headers.forEach((val, key) => {
        headers[key] = val;
      });
      setResponseHeaders(headers);

      const json = await res.json();
      setResponseBody(JSON.stringify(json, null, 2));
    } catch (err: any) {
      setResponseStatus(500);
      setResponseBody(JSON.stringify({ error: err.message || 'Network error' }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const curlCommand =
    activeEndpoint.method === 'POST'
      ? `curl -X POST http://localhost:3000${customPath} \\\n  -H "Content-Type: application/json" \\\n  -d '${requestBody.replace(/\n/g, '')}'`
      : `curl -X GET http://localhost:3000${customPath}`;

  const copyCurl = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-white">Interactive API Playground & Docs</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real REST endpoints responding in real time. Inspect headers, test payloads, and verify status codes.
          </p>
        </div>

        <button
          onClick={copyCurl}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono transition-colors border border-slate-700"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>Copy cURL</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Endpoints Sidebar (4 cols) */}
        <div className="lg:col-span-4 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1 mb-2">
            Available Endpoints
          </div>
          {ENDPOINTS.map((ep) => {
            const isSelected = ep.id === activeEndpointId;
            return (
              <button
                key={ep.id}
                onClick={() => handleSelectEndpoint(ep)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-slate-800/90 border-indigo-500 shadow-md'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                      ep.method === 'POST' ? 'bg-indigo-900/60 text-indigo-300 border border-indigo-700' : 'bg-emerald-900/60 text-emerald-300 border border-emerald-700'
                    }`}
                  >
                    {ep.method}
                  </span>
                  <span className="font-mono text-xs text-slate-200 truncate">{ep.path}</span>
                </div>
                <div className="text-xs font-medium text-white truncate">{ep.summary}</div>
              </button>
            );
          })}
        </div>

        {/* Request & Response Workbench (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* URL & Method Bar */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono uppercase ${
                  activeEndpoint.method === 'POST'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                {activeEndpoint.method}
              </span>
              <input
                type="text"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleSendRequest}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-white rounded-lg text-xs font-semibold transition-colors shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{loading ? 'Sending...' : 'Send'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-400">{activeEndpoint.description}</p>
          </div>

          {/* Request Payload Editor (if POST) */}
          {activeEndpoint.method === 'POST' && (
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                <span>Request Body (JSON)</span>
                <span className="font-mono text-[11px] text-slate-500">application/json</span>
              </div>
              <textarea
                rows={9}
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-emerald-400 focus:outline-none focus:border-indigo-500 leading-relaxed"
              />
            </div>
          )}

          {/* Response Payload Viewer */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-300">Response</span>
                {responseStatus && (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      responseStatus >= 200 && responseStatus < 300
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}
                  >
                    HTTP {responseStatus}
                  </span>
                )}
              </div>
              {responseBody && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(responseBody);
                  }}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 font-mono"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy JSON</span>
                </button>
              )}
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg min-h-[160px] max-h-[360px] overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32 text-xs font-mono text-slate-500">
                  Transmitting request to backend...
                </div>
              ) : responseBody ? (
                <pre className="text-xs font-mono text-slate-200 whitespace-pre-wrap">{responseBody}</pre>
              ) : (
                <div className="flex items-center justify-center h-32 text-xs font-mono text-slate-500">
                  Click "Send" above to execute this endpoint.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
