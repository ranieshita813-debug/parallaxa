'use client'

import React, { useState, useEffect } from 'react'
import { Play, RotateCcw, Activity, CheckCircle2, AlertCircle, Clock, Database, Sparkles } from 'lucide-react'

interface PipelineStep {
  id: string
  name: string
  status: string
  duration?: number
  output?: any
  error?: string
}

interface PipelineJob {
  id: string
  runId: string | null
  status: 'pending' | 'running' | 'done' | 'failed'
  createdAt: string
  updatedAt: string
  error?: string
  progress: { total: number; done: number; failed: number }
  steps: PipelineStep[]
  articles: Array<{
    sourceUrl: string
    title: string | null
    status: 'pending' | 'done' | 'failed'
    articleId: string | null
    error?: string
  }>
}

export default function PipelineManager() {
  const [isRunning, setIsRunning] = useState(false)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [jobData, setJobData] = useState<PipelineJob | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleStartPipeline = async () => {
    try {
      setIsRunning(true)
      setError(null)
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tUrl: false }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to trigger pipeline')
      }
      const data = await res.json()
      if (data.eventId) {
        setActiveJobId(data.eventId)
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Error starting pipeline')
      setIsRunning(false)
    }
  }

  useEffect(() => {
    if (!activeJobId) return

    let intervalId = setInterval(async () => {
      try {
        const res = await fetch(`/api/pipeline/${activeJobId}`)
        if (res.ok) {
          const data: PipelineJob = await res.json()
          setJobData(data)
          if (data.status === 'done' || data.status === 'failed') {
            setIsRunning(false)
            clearInterval(intervalId)
          }
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }, 3000)

    return () => clearInterval(intervalId)
  }, [activeJobId])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-neutral-900" />
            AI & Ingestion Pipeline Management
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Trigger automated RSS/news feeds ingestion, translation, rewriting, and vector embedding.
          </p>
        </div>
        <button
          onClick={handleStartPipeline}
          disabled={isRunning}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white rounded-xl text-sm font-semibold hover:bg-neutral-800 disabled:opacity-50 transition-all shadow-sm"
        >
          {isRunning ? (
            <>
              <Activity className="w-4 h-4 animate-spin" />
              Pipeline Running…
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Pipeline Now
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-neutral-100 border border-neutral-300 rounded-xl text-sm text-neutral-900">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Progress Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</span>
          <div className="mt-2 flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-neutral-900 animate-pulse' : jobData?.status === 'done' ? 'bg-neutral-900' : 'bg-neutral-400'}`} />
            <span className="text-lg font-bold capitalize text-slate-900">
              {jobData?.status || (isRunning ? 'Initializing' : 'Idle')}
            </span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Processed Articles</span>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">
            {jobData?.progress?.done ?? 0}
            <span className="text-sm font-normal text-slate-400 ml-1">/ {jobData?.progress?.total ?? 0}</span>
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Failed / Skipped</span>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">
            {jobData?.progress?.failed ?? 0}
          </p>
        </div>
      </div>

      {/* Live Pipeline Steps */}
      {jobData?.steps && jobData.steps.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Pipeline Execution Steps</h3>
            <span className="text-xs text-slate-500 font-mono">Job ID: {activeJobId?.slice(0, 16)}...</span>
          </div>
          <div className="divide-y divide-slate-100">
            {jobData.steps.map((step, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {step.status === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4 text-neutral-900" />
                  ) : step.status === 'failed' ? (
                    <AlertCircle className="w-4 h-4 text-neutral-400" />
                  ) : (
                    <Clock className="w-4 h-4 text-neutral-400 animate-spin" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{step.name}</p>
                    {step.error && <p className="text-xs text-neutral-600 mt-0.5">{step.error}</p>}
                  </div>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  {step.duration ? `${(step.duration / 1000).toFixed(1)}s` : step.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
