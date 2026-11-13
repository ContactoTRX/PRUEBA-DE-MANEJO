import { useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  CheckCircle2,
  Eye,
  FileDown,
  FileSpreadsheet,
  LogIn,
  Printer,
  Search,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { PASSING_THRESHOLD, type DrivingEvaluation } from '../types/evaluation';
import { removeEvaluation } from '../services/evaluationService';
import {
  exportEvaluationToExcel,
  exportEvaluationToPdf,
} from '../utils/exportEvaluation';

interface HistoryViewProps {
  user: User | null;
  evaluations: DrivingEvaluation[];
  loading: boolean;
  onSignIn: () => void;
  onStartNew: () => void;
}

type StatusFilter = 'all' | 'passed' | 'failed';

export function HistoryView({
  user,
  evaluations,
  loading,
  onSignIn,
  onStartNew,
}: HistoryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedEvaluation, setSelectedEvaluation] =
    useState<DrivingEvaluation | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return evaluations.filter((ev) => {
      if (statusFilter === 'passed' && !ev.passed) return false;
      if (statusFilter === 'failed' && ev.passed) return false;
      if (!q) return true;
      return (
        ev.candidateName.toLowerCase().includes(q) ||
        ev.candidateDocument.toLowerCase().includes(q) ||
        ev.vehiclePlate.toLowerCase().includes(q) ||
        ev.licenseCategory.toLowerCase().includes(q)
      );
    });
  }, [evaluations, searchQuery, statusFilter]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await removeEvaluation(id);
      if (selectedEvaluation?.id === id) {
        setSelectedEvaluation(null);
      }
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  }

  function formatDate(ms: number) {
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(ms));
  }

  if (!user) {
    return (
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <span className="block font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-[#800020] mb-2">
            Base de datos Firestore
          </span>
          <h1 className="font-display text-3xl font-extrabold text-[#1A1A1E]">
            Historial de evaluaciones
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-[#1A1A1E]/70">
            Inicia sesión con tu cuenta de Google para consultar, filtrar e imprimir las
            pruebas prácticas almacenadas.
          </p>
          <button
            type="button"
            onClick={onSignIn}
            className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded bg-[#002B5B] px-6 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#001f44] whitespace-nowrap"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            <span>Iniciar sesión con Google</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white print:overflow-visible">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8 print:p-0">
        {/* Header & Controls */}
        <div className="no-print mb-6 flex flex-col gap-4 border-b border-[#1A1A1E]/10 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="block font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-[#800020] mb-1">
              Registros almacenados
            </span>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#1A1A1E]">
              Historial de Pruebas
            </h1>
            <p className="mt-1 text-sm text-[#1A1A1E]/65">
              Evaluador: {user.displayName || user.email}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1A1A1E]/40"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar aspirante, DNI o placa..."
                aria-label="Buscar en historial"
                className="w-full rounded border border-[#1A1A1E]/15 bg-white py-2 pl-9 pr-3 text-sm text-[#1A1A1E] placeholder:text-[#1A1A1E]/40 focus:border-[#002B5B] focus:outline-none sm:w-64"
              />
            </div>

            <div
              role="group"
              aria-label="Filtrar por estado"
              className="flex items-center gap-1 rounded bg-[#F8F7F4] p-1 border border-[#1A1A1E]/10"
            >
              {(
                [
                  { id: 'all', label: 'Todas' },
                  { id: 'passed', label: 'Aprobadas' },
                  { id: 'failed', label: 'Reprobadas' },
                ] as { id: StatusFilter; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`rounded px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap shrink-0 ${
                    statusFilter === tab.id
                      ? 'bg-[#002B5B] text-white'
                      : 'text-[#1A1A1E]/70 hover:text-[#1A1A1E]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading skeleton */}
        {loading ? (
          <div className="overflow-hidden rounded-lg border border-[#1A1A1E]/10 bg-white">
            <div className="divide-y divide-[#1A1A1E]/10">
              {[1, 2, 3, 4].map((row) => (
                <div key={row} className="flex items-center justify-between px-6 py-4">
                  <div className="h-4 w-48 animate-pulse rounded bg-[#1A1A1E]/10" />
                  <div className="h-4 w-24 animate-pulse rounded bg-[#1A1A1E]/10" />
                  <div className="h-4 w-16 animate-pulse rounded bg-[#1A1A1E]/10" />
                </div>
              ))}
            </div>
          </div>
        ) : evaluations.length === 0 ? (
          <div className="rounded-lg border border-[#1A1A1E]/10 bg-[#F8F7F4] p-12 text-center">
            <h2 className="font-display text-xl font-bold text-[#1A1A1E]">
              Aún no hay evaluaciones guardadas
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-[#1A1A1E]/65">
              Cuando completes y guardes tu primera prueba práctica de manejo, aparecerá
              aquí con su puntaje y detalle completo.
            </p>
            <button
              type="button"
              onClick={onStartNew}
              className="mt-6 inline-flex min-h-[44px] items-center rounded bg-[#002B5B] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#001f44] whitespace-nowrap"
            >
              Realizar primera evaluación
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-[#1A1A1E]/10 bg-[#F8F7F4] p-10 text-center">
            <p className="text-sm font-medium text-[#1A1A1E]/75">
              No se encontraron evaluaciones con los filtros aplicados.
            </p>
          </div>
        ) : (
          <div className="no-print overflow-x-auto rounded-lg border border-[#1A1A1E]/10 bg-white">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#1A1A1E]/10 bg-[#F8F7F4] font-mono text-[11px] font-bold uppercase tracking-wider text-[#800020]">
                  <th className="px-5 py-3.5">Aspirante</th>
                  <th className="px-4 py-3.5">Documento</th>
                  <th className="px-4 py-3.5">Categoría</th>
                  <th className="px-4 py-3.5">Fecha</th>
                  <th className="px-4 py-3.5 text-right">Puntos</th>
                  <th className="px-4 py-3.5 text-right">Porcentaje</th>
                  <th className="px-4 py-3.5">Resultado</th>
                  <th className="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1E]/10">
                {filtered.map((ev) => (
                  <tr
                    key={ev.id}
                    onClick={() => setSelectedEvaluation(ev)}
                    className="cursor-pointer transition-colors hover:bg-[#F8F7F4]/70"
                  >
                    <td className="px-5 py-3.5 font-semibold text-[#1A1A1E]">
                      {ev.candidateName}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-[#1A1A1E]/70 tabular-nums">
                      {ev.candidateDocument}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[#1A1A1E]/70">
                      {ev.licenseCategory}
                      {ev.vehiclePlate ? ` · ${ev.vehiclePlate}` : ''}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-[#1A1A1E]/60 whitespace-nowrap tabular-nums">
                      {formatDate(ev.createdAtMs)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-xs text-[#1A1A1E]/75 tabular-nums">
                      {ev.earnedPoints} / {ev.totalPoints}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-sm font-bold text-[#002B5B] tabular-nums">
                      {ev.percentage.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3.5">
                      {ev.passed ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-emerald-700 whitespace-nowrap">
                          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span>Aprobado</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-[#800020] whitespace-nowrap">
                          <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span>Reprobado</span>
                        </span>
                      )}
                    </td>
                    <td
                      className="px-5 py-3.5 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedEvaluation(ev)}
                          aria-label={`Ver detalle de ${ev.candidateName}`}
                          className="inline-flex items-center gap-1 rounded border border-[#1A1A1E]/15 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#002B5B] hover:bg-[#F8F7F4] whitespace-nowrap"
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Detalle</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => exportEvaluationToPdf(ev)}
                          aria-label={`Exportar evaluación de ${ev.candidateName} a PDF`}
                          title="Exportar a PDF"
                          className="inline-flex items-center gap-1 rounded border border-[#1A1A1E]/15 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#800020] hover:bg-red-50 whitespace-nowrap"
                        >
                          <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>PDF</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => exportEvaluationToExcel(ev)}
                          aria-label={`Exportar evaluación de ${ev.candidateName} a Excel`}
                          title="Exportar a Excel"
                          className="inline-flex items-center gap-1 rounded border border-[#1A1A1E]/15 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-800 hover:bg-emerald-50 whitespace-nowrap"
                        >
                          <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Excel</span>
                        </button>

                        {confirmDeleteId === ev.id ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              disabled={deletingId === ev.id}
                              onClick={() => handleDelete(ev.id)}
                              className="rounded bg-[#800020] px-2.5 py-1.5 text-[11px] font-bold uppercase text-white hover:bg-red-900 whitespace-nowrap"
                            >
                              {deletingId === ev.id ? '...' : 'Confirmar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded border border-[#1A1A1E]/15 px-2 py-1.5 text-[11px] font-semibold text-[#1A1A1E]/75 hover:bg-[#F8F7F4] whitespace-nowrap"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(ev.id)}
                            aria-label={`Eliminar evaluación de ${ev.candidateName}`}
                            className="inline-flex items-center justify-center rounded border border-[#1A1A1E]/15 p-1.5 text-[#1A1A1E]/55 hover:border-red-300 hover:bg-red-50 hover:text-[#800020]"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Detail Modal */}
        {selectedEvaluation && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-modal-title"
            className="print-reset fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1E]/60 p-4 overflow-y-auto"
          >
            <div className="print-reset max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border-t-4 border-[#002B5B] bg-white p-6 shadow-2xl sm:p-8">
              <div className="flex flex-col gap-4 border-b border-[#1A1A1E]/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#800020] mb-1">
                    Documento oficial de evaluación
                  </span>
                  <h2
                    id="detail-modal-title"
                    className="font-display text-2xl font-extrabold text-[#1A1A1E]"
                  >
                    Acta de Evaluación Práctica
                  </h2>
                  <p className="mt-1 font-mono text-xs text-[#1A1A1E]/60">
                    {formatDate(selectedEvaluation.createdAtMs)} · Evaluador:{' '}
                    {selectedEvaluation.evaluatorName}
                  </p>
                </div>
                <div className="no-print flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => exportEvaluationToPdf(selectedEvaluation)}
                    className="inline-flex items-center gap-1.5 rounded bg-[#800020] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-red-900 whitespace-nowrap"
                  >
                    <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Exportar PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => exportEvaluationToExcel(selectedEvaluation)}
                    className="inline-flex items-center gap-1.5 rounded bg-emerald-700 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-emerald-800 whitespace-nowrap"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Exportar Excel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 rounded border border-[#1A1A1E]/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#002B5B] hover:bg-[#F8F7F4] whitespace-nowrap"
                  >
                    <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Imprimir</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedEvaluation(null)}
                    aria-label="Cerrar detalle"
                    className="rounded border border-[#1A1A1E]/15 p-1.5 text-[#1A1A1E]/60 hover:bg-[#F8F7F4] hover:text-[#1A1A1E]"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 border-b border-[#1A1A1E]/10 pb-5 sm:grid-cols-4">
                <div className="sm:col-span-2">
                  <div className="font-mono text-[10px] uppercase text-[#1A1A1E]/55">
                    Aspirante
                  </div>
                  <div className="mt-0.5 text-sm font-bold text-[#1A1A1E]">
                    {selectedEvaluation.candidateName}
                  </div>
                  <div className="mt-0.5 font-mono text-xs text-[#1A1A1E]/70">
                    {selectedEvaluation.candidateDocument} · Cat.{' '}
                    {selectedEvaluation.licenseCategory}
                    {selectedEvaluation.vehiclePlate
                      ? ` · Placa ${selectedEvaluation.vehiclePlate}`
                      : ''}
                  </div>
                </div>

                <div>
                  <div className="font-mono text-[10px] uppercase text-[#1A1A1E]/55">
                    Puntaje
                  </div>
                  <div className="mt-0.5 font-mono text-lg font-bold text-[#002B5B] tabular-nums">
                    {selectedEvaluation.earnedPoints} / {selectedEvaluation.totalPoints} pts
                  </div>
                  <div className="font-mono text-xs text-[#1A1A1E]/65 tabular-nums">
                    {selectedEvaluation.percentage.toFixed(1)}% (Mín. {PASSING_THRESHOLD}%)
                  </div>
                </div>

                <div>
                  <div className="font-mono text-[10px] uppercase text-[#1A1A1E]/55">
                    Veredicto
                  </div>
                  <div className="mt-1">
                    {selectedEvaluation.passed ? (
                      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        <span>APROBADO</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#800020]">
                        <XCircle className="h-4 w-4" aria-hidden="true" />
                        <span>REPROBADO</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <h3 className="mb-3 font-mono text-xs font-bold uppercase tracking-wider text-[#800020]">
                  Desglose de puntos evaluados
                </h3>
                <div className="divide-y divide-[#1A1A1E]/10 rounded-lg border border-[#1A1A1E]/10">
                  {selectedEvaluation.items.map((item, idx) => (
                    <div
                      key={`${item.id}-${idx}`}
                      className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-[#1A1A1E]">{item.title}</p>
                        <p className="font-mono text-[11px] text-[#1A1A1E]/55">
                          {item.section} ·{' '}
                          <span className="tabular-nums">{item.points} pts</span>
                        </p>
                      </div>
                      {item.result === 'correct' ? (
                        <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-emerald-700 whitespace-nowrap shrink-0">
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          <span>Correcto (+{item.points})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-[#800020] whitespace-nowrap shrink-0">
                          <XCircle className="h-4 w-4" aria-hidden="true" />
                          <span>Incorrecto (0)</span>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {selectedEvaluation.notes && (
                <div className="mt-5 rounded border border-[#1A1A1E]/10 bg-[#F8F7F4] p-4">
                  <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#800020]">
                    Observaciones del evaluador
                  </div>
                  <p className="mt-1.5 text-sm text-[#1A1A1E]/85 whitespace-pre-wrap">
                    {selectedEvaluation.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
