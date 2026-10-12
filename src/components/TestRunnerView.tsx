import React, { useState, useEffect } from 'react';
import { TestSuiteResponse } from '../types';
import { CheckCircle2, XCircle, Play, RotateCw, Terminal, Check, ListChecks } from 'lucide-react';

export const TestRunnerView: React.FC = () => {
  const [suiteResult, setSuiteResult] = useState<TestSuiteResponse | null>(null);
  const [running, setRunning] = useState(false);

  const runTests = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/tests/run', { method: 'POST' });
      const data = await res.json();
      setSuiteResult(data);
    } catch (err) {
      console.error('Failed to run test suite:', err);
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-white">Automated Backend Test Suite</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Evaluates the 6 mandatory assignment requirements against the live backend engine.
          </p>
        </div>

        <button
          onClick={runTests}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
        >
          {running ? (
            <>
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
              <span>Executing Tests...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run All 6 Tests</span>
            </>
          )}
        </button>
      </div>

      {/* Summary KPI Strip */}
      {suiteResult && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Test Suite Status</div>
            <div className="flex items-center gap-2 mt-1">
              {suiteResult.allPassed ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-bold text-emerald-400">All Passed (100%)</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-rose-400" />
                  <span className="text-sm font-bold text-rose-400">Failed Assertions</span>
                </>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Passed Tests</div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">
              {suiteResult.passedCount} / {suiteResult.totalTests}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Execution Duration</div>
            <div className="text-xl font-bold font-mono text-slate-200 mt-1 tabular-nums">
              {suiteResult.totalDurationMs} ms
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Assignment Spec</div>
            <div className="text-xs font-mono text-slate-300 mt-1">
              Backend Assignment — Page 2
            </div>
          </div>
        </div>
      )}

      {/* Itemized Test Results Accordion/Cards */}
      <div className="space-y-3">
        {suiteResult?.tests.map((test) => (
          <div
            key={test.requirementNumber}
            className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3 hover:border-slate-700 transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-start sm:items-center gap-3">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    test.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {test.passed ? <Check className="w-4 h-4 stroke-[3]" /> : <XCircle className="w-4 h-4" />}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-indigo-400 font-semibold">
                      Req #{test.requirementNumber}
                    </span>
                    <h3 className="text-sm font-bold text-white">{test.name}</h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{test.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono self-end sm:self-auto">
                <span className="text-slate-500 tabular-nums">{test.durationMs}ms</span>
                <span
                  className={`px-2.5 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                    test.passed
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                      : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                  }`}
                >
                  {test.passed ? 'PASSED' : 'FAILED'}
                </span>
              </div>
            </div>

            {/* Test Details and Assertions */}
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-2">
              <div className="text-[11px] font-mono text-slate-300 flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-slate-500" />
                <span>{test.details}</span>
              </div>

              <div className="space-y-1 pt-1 border-t border-slate-800">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                  Assertions Verified:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                  {test.assertions.map((assertion, aIdx) => (
                    <div key={aIdx} className="flex items-center gap-2 text-xs text-slate-300 font-mono">
                      <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="truncate">{assertion}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
