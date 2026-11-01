'use client'

import React, { useState, useEffect } from 'react'
import {
  Database,
  Plus,
  Trash2,
  Edit,
  RotateCw,
  Search,
  Code2,
  Table as TableIcon,
  Play,
  Check,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Save,
} from 'lucide-react'
import { toast } from 'sonner'

interface TableInfo {
  name: string
  isAllowed: boolean
  columns: Array<{ name: string; type: string; nullable: boolean; default: any }>
  rowCount: number
}

export default function DbManager() {
  const [tables, setTables] = useState<TableInfo[]>([])
  const [selectedTable, setSelectedTable] = useState<string>('')
  const [tableData, setTableData] = useState<{
    columns: Array<{ name: string; type: string; nullable: boolean; default: any }>
    rows: any[]
    pagination: { page: number; limit: number; total: number; totalPages: number }
  } | null>(null)

  const [activeTab, setActiveTab] = useState<'tables' | 'query'>('tables')
  const [isLoading, setIsLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [searchFilter, setSearchFilter] = useState('')

  // Raw SQL state
  const [sqlQuery, setSqlQuery] = useState("SELECT * FROM pages ORDER BY created_at DESC LIMIT 10;")
  const [sqlResult, setSqlResult] = useState<any[] | null>(null)
  const [sqlError, setSqlError] = useState<string | null>(null)
  const [isExecutingSql, setIsExecutingSql] = useState(false)

  // Insert Modal state
  const [insertModalOpen, setInsertModalOpen] = useState(false)
  const [insertFormData, setInsertFormData] = useState<Record<string, any>>({})
  const [isInserting, setIsInserting] = useState(false)

  // Edit Modal state
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<any>(null)
  const [editFormData, setEditFormData] = useState<Record<string, any>>({})
  const [isUpdating, setIsUpdating] = useState(false)

  // Load all tables
  const loadTables = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/db')
      if (!res.ok) throw new Error('Failed to load tables')
      const data = await res.json()
      setTables(data.tables || [])
      if (!selectedTable && data.tables?.length > 0) {
        const first = data.tables.find((t: any) => t.isAllowed) || data.tables[0]
        setSelectedTable(first.name)
      }
    } catch (err: any) {
      toast.error(err.message || 'Error loading tables')
    } finally {
      setIsLoading(false)
    }
  }

  // Load specific table data
  const loadTableData = async (tbl: string, pageNum: number = 1) => {
    if (!tbl) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/admin/db?table=${encodeURIComponent(tbl)}&page=${pageNum}&limit=15`)
      if (!res.ok) throw new Error('Failed to load table rows')
      const data = await res.json()
      setTableData(data)
    } catch (err: any) {
      toast.error(err.message || 'Error loading table data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTables()
  }, [])

  useEffect(() => {
    if (selectedTable && activeTab === 'tables') {
      loadTableData(selectedTable, page)
    }
  }, [selectedTable, page, activeTab])

  // Execute Raw SQL Query
  const handleExecuteSql = async () => {
    if (!sqlQuery.trim()) return
    setIsExecutingSql(true)
    setSqlError(null)
    setSqlResult(null)
    try {
      const res = await fetch('/api/admin/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'query', query: sqlQuery }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Query failed')
      setSqlResult(data.result)
      toast.success(`Query returned ${data.rowCount ?? 0} rows`)
    } catch (err: any) {
      setSqlError(err.message || 'Query execution failed')
      toast.error(err.message || 'Query execution failed')
    } finally {
      setIsExecutingSql(false)
    }
  }

  // Handle Delete Row
  const handleDeleteRow = async (row: any) => {
    const pkVal = row.id || row.key
    if (!pkVal) {
      toast.error('Cannot identify primary key for this row')
      return
    }

    if (!confirm(`Are you sure you want to delete this record (${pkVal})?`)) return

    try {
      const pkField = row.id !== undefined ? 'id' : 'key'
      const res = await fetch(`/api/admin/db?table=${encodeURIComponent(selectedTable)}&pkField=${pkField}&pkValue=${encodeURIComponent(pkVal)}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete record')
      toast.success('Record deleted successfully')
      loadTableData(selectedTable, page)
      loadTables()
    } catch (err: any) {
      toast.error(err.message || 'Delete failed')
    }
  }

  // Handle Open Insert Modal
  const openInsertModal = () => {
    const initData: Record<string, any> = {}
    tableData?.columns.forEach(c => {
      if (c.name !== 'id' && c.name !== 'created_at' && c.name !== 'updated_at') {
        initData[c.name] = ''
      }
    })
    setInsertFormData(initData)
    setInsertModalOpen(true)
  }

  // Submit Insert
  const handleInsertRow = async () => {
    setIsInserting(true)
    try {
      const cleanData: Record<string, any> = {}
      for (const [k, v] of Object.entries(insertFormData)) {
        if (v !== '' && v !== undefined) {
          cleanData[k] = v
        }
      }

      const res = await fetch('/api/admin/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: selectedTable,
          data: cleanData,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to insert row')

      toast.success('Row inserted successfully!')
      setInsertModalOpen(false)
      loadTableData(selectedTable, page)
      loadTables()
    } catch (err: any) {
      toast.error(err.message || 'Insert failed')
    } finally {
      setIsInserting(false)
    }
  }

  // Handle Open Edit Modal
  const openEditModal = (row: any) => {
    setEditingRow(row)
    setEditFormData({ ...row })
    setEditModalOpen(true)
  }

  // Submit Update
  const handleUpdateRow = async () => {
    if (!editingRow) return
    setIsUpdating(true)
    try {
      const pkField = editingRow.id !== undefined ? 'id' : 'key'
      const pkValue = editingRow[pkField]

      const res = await fetch('/api/admin/db', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: selectedTable,
          pkField,
          pkValue,
          data: editFormData,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')

      toast.success('Row updated successfully!')
      setEditModalOpen(false)
      loadTableData(selectedTable, page)
    } catch (err: any) {
      toast.error(err.message || 'Update failed')
    } finally {
      setIsUpdating(false)
    }
  }

  const filteredRows = tableData?.rows.filter(r => {
    if (!searchFilter.trim()) return true
    return Object.values(r).some(val =>
      String(val).toLowerCase().includes(searchFilter.toLowerCase())
    )
  }) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200/60 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0">
            <Database size={20} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-950">Database Manager</h2>
            <p className="text-xs text-slate-500">
              Browse system tables, inspect data, insert or update rows, and execute safe SQL queries.
            </p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200/60">
          <button
            onClick={() => setActiveTab('tables')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'tables' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <TableIcon size={14} />
            <span>Tables</span>
          </button>
          <button
            onClick={() => setActiveTab('query')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'query' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Code2 size={14} />
            <span>SQL Console</span>
          </button>
        </div>
      </div>

      {/* ── TAB 1: TABLES BROWSER ── */}
      {activeTab === 'tables' && (
        <div className="space-y-6">
          {/* Table Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100">
            {tables.map(t => (
              <button
                key={t.name}
                onClick={() => {
                  setSelectedTable(t.name)
                  setPage(1)
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                  selectedTable === t.name
                    ? 'bg-slate-950 text-white border-slate-950 shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                }`}
              >
                <span>{t.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedTable === t.name ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-500'
                }`}>
                  {t.rowCount}
                </span>
              </button>
            ))}
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-2xl border border-slate-200/80">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <Search size={14} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Filter loaded rows..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                className="w-full bg-transparent text-xs outline-none text-slate-800 placeholder:text-slate-400"
              />
              {searchFilter && (
                <button onClick={() => setSearchFilter('')} className="text-slate-400 hover:text-slate-600">
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => loadTableData(selectedTable, page)}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
                title="Refresh Table"
              >
                <RotateCw size={13} className={isLoading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                onClick={openInsertModal}
                className="flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-slate-950 text-white text-xs font-semibold hover:bg-slate-800 shadow-xs"
              >
                <Plus size={14} />
                <span>Insert Row</span>
              </button>
            </div>
          </div>

          {/* Data Grid Table */}
          <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin mx-auto mb-2" />
                  Loading rows from {selectedTable}…
                </div>
              ) : filteredRows.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  No records found in table "{selectedTable}".
                </div>
              ) : (
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-sans font-bold">
                      <th className="py-2.5 px-3 w-16 text-center">Actions</th>
                      {tableData?.columns.map(col => (
                        <th key={col.name} className="py-2.5 px-3 whitespace-nowrap">
                          {col.name}
                          <span className="ml-1 text-[10px] text-slate-400 font-normal">({col.type})</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2 px-3 text-center whitespace-nowrap font-sans">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openEditModal(row)}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded"
                              title="Edit Row"
                            >
                              <Edit size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteRow(row)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded"
                              title="Delete Row"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                        {tableData?.columns.map(col => {
                          const val = row[col.name]
                          const strVal = val === null || val === undefined ? 'null' : typeof val === 'object' ? JSON.stringify(val) : String(val)
                          return (
                            <td
                              key={col.name}
                              className={`py-2 px-3 max-w-xs truncate ${val === null ? 'text-slate-300 italic' : 'text-slate-800'}`}
                              title={strVal}
                            >
                              {strVal}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination footer */}
            {tableData && tableData.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 text-xs">
                <span className="text-slate-500">
                  Showing page {tableData.pagination.page} of {tableData.pagination.totalPages} ({tableData.pagination.total} total rows)
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="p-1 border border-slate-200 rounded-md bg-white disabled:opacity-40 text-slate-600"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    disabled={page >= tableData.pagination.totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="p-1 border border-slate-200 rounded-md bg-white disabled:opacity-40 text-slate-600"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: SQL CONSOLE ── */}
      {activeTab === 'query' && (
        <div className="space-y-4">
          <div className="border border-slate-200 rounded-2xl bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Custom SQL Query (Neon PostgreSQL)
              </label>
              <button
                onClick={handleExecuteSql}
                disabled={isExecutingSql}
                className="inline-flex items-center gap-1.5 h-8 px-4 rounded-xl bg-slate-950 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-xs"
              >
                {isExecutingSql ? (
                  <div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                ) : (
                  <Play size={13} />
                )}
                <span>Run Query</span>
              </button>
            </div>

            <textarea
              rows={4}
              value={sqlQuery}
              onChange={e => setSqlQuery(e.target.value)}
              className="w-full font-mono text-xs bg-slate-900 text-emerald-400 p-4 rounded-xl outline-none selection:bg-emerald-950"
              spellCheck={false}
            />
          </div>

          {/* Query Error Output */}
          {sqlError && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-mono flex items-start gap-2">
              <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Error:</strong> {sqlError}
              </div>
            </div>
          )}

          {/* Query Results Table */}
          {sqlResult && (
            <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-xs">
              <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-600">
                Query Results: {sqlResult.length} rows returned
              </div>
              <div className="overflow-x-auto max-h-96">
                {sqlResult.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">Statement executed with 0 return rows.</div>
                ) : (
                  <table className="w-full text-left text-xs font-mono border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-sans font-bold">
                        {Object.keys(sqlResult[0] || {}).map(k => (
                          <th key={k} className="py-2 px-3 whitespace-nowrap">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sqlResult.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50/70">
                          {Object.values(r).map((v: any, vi) => (
                            <td key={vi} className="py-2 px-3 max-w-xs truncate text-slate-800">
                              {v === null ? <span className="text-slate-300 italic">null</span> : typeof v === 'object' ? JSON.stringify(v) : String(v)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── INSERT ROW MODAL ── */}
      {insertModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Insert New Row into "{selectedTable}"</h3>
              <button onClick={() => setInsertModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {tableData?.columns
                .filter(c => c.name !== 'id' && c.name !== 'created_at' && c.name !== 'updated_at')
                .map(col => (
                  <div key={col.name}>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {col.name} <span className="text-slate-400 text-[10px]">({col.type})</span>
                    </label>
                    {col.type === 'text' && col.name.includes('content') ? (
                      <textarea
                        rows={3}
                        value={insertFormData[col.name] ?? ''}
                        onChange={e => setInsertFormData({ ...insertFormData, [col.name]: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 outline-none focus:border-slate-900"
                      />
                    ) : col.type === 'boolean' ? (
                      <select
                        value={insertFormData[col.name] ?? 'true'}
                        onChange={e => setInsertFormData({ ...insertFormData, [col.name]: e.target.value === 'true' })}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none"
                      >
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    ) : (
                      <input
                        type={col.type.includes('int') ? 'number' : 'text'}
                        value={insertFormData[col.name] ?? ''}
                        onChange={e => setInsertFormData({ ...insertFormData, [col.name]: e.target.value })}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-slate-900"
                      />
                    )}
                  </div>
                ))}
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setInsertModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsertRow}
                disabled={isInserting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-950 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50"
              >
                {isInserting ? 'Inserting…' : 'Insert Row'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT ROW MODAL ── */}
      {editModalOpen && editingRow && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">
                Edit Record ({editingRow.id || editingRow.key})
              </h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {tableData?.columns
                .filter(c => c.name !== 'id' && c.name !== 'created_at' && c.name !== 'updated_at')
                .map(col => (
                  <div key={col.name}>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {col.name} <span className="text-slate-400 text-[10px]">({col.type})</span>
                    </label>
                    {col.type === 'text' && (col.name.includes('content') || col.name.includes('template')) ? (
                      <textarea
                        rows={4}
                        value={editFormData[col.name] ?? ''}
                        onChange={e => setEditFormData({ ...editFormData, [col.name]: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 outline-none focus:border-slate-900 font-mono"
                      />
                    ) : col.type === 'boolean' ? (
                      <select
                        value={String(editFormData[col.name])}
                        onChange={e => setEditFormData({ ...editFormData, [col.name]: e.target.value === 'true' })}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none"
                      >
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    ) : (
                      <input
                        type={col.type.includes('int') ? 'number' : 'text'}
                        value={editFormData[col.name] ?? ''}
                        onChange={e => setEditFormData({ ...editFormData, [col.name]: e.target.value })}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-slate-900"
                      />
                    )}
                  </div>
                ))}
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateRow}
                disabled={isUpdating}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-950 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50"
              >
                {isUpdating ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
