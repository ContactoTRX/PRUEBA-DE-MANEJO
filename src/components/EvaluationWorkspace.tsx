import { useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertCircle,
  ArrowDown,
  CheckCircle2,
  Database,
  RotateCcw,
  Save,
  XCircle,
} from 'lucide-react';
import {
  LICENSE_CATEGORIES,
  PASSING_THRESHOLD,
  type ItemResult,
  type LicenseCategory,
  type RubricItem,
} from '../types/evaluation';
import { saveEvaluation } from '../services/evaluationService';

interface EvaluationWorkspaceProps {
  rubricItems: RubricItem[];
  user: User | null;
  onRequireAuth: () => Promise<User | null>;
  onSavedSuccess: () => void;
}

export function EvaluationWorkspace({
  rubricItems,
  user,
  onRequireAuth,
  onSavedSuccess,
}: EvaluationWorkspaceProps) {
  const [candidateName, setCandidateName] = useState('');
  const [candidateDocument, setCandidateDocument] = useState('');
  const [licenseCategory, setLicenseCategory] = useState<LicenseCategory>('B1');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [notes, setNotes] = useState('');
  const [selections, setSelections] = useState<Record<string, ItemResult>>({});

  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null);

  const groupedSections = useMemo(() => {
    const map = new Map<string, RubricItem[]>();
    for (const item of rubricItems) {
      const existing = map.get(item.section);
      if (existing) {
        existing.push(item);
      } else {
        map.set(item.section, [item]);
      }
    }
    return Array.from(map.entries());
  }, [rubricItems]);

  const metrics = useMemo(() => {
    let totalPoints = 0;
    let earnedPoints = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let answeredCount = 0;

    for (const item of rubricItems) {
      totalPoints += item.points;
      const res = selections[item.id];
      if (res === 'correct') {
        earnedPoints += item.points;
        correctCount += 1;
        answeredCount += 1;
      } else if (res === 'incorrect') {
        incorrectCount += 1;
        answeredCount += 1;
      }
    }

    const totalItems = rubricItems.length;
    const pendingCount = totalItems - answeredCount;
    const percentage =
      totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 1000) / 10 : 0;
    const passed = percentage >= PASSING_THRESHOLD;

    return {
      totalPoints,
      earnedPoints,
      correctCount,
      incorrectCount,
      answeredCount,
      pendingCount,
      totalItems,
      percentage,
      passed,
      isComplete: totalItems > 0 && pendingCount === 0,
    };
  }, [rubricItems, selections]);

  const firstPendingItemId = useMemo(() => {
    const found = rubricItems.find((item) => !selections[item.id]);
    return found?.id ?? null;
  }, [rubricItems, selections]);

  function handleSelect(itemId: string, value: ItemResult) {
    setFormError(null);
    setSavedRecordId(null);
    setSelections((prev) => {
      if (prev[itemId] === value) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return { ...prev, [itemId]: value };
    });
  }

  function handleMarkRemainingCorrect() {
    setFormError(null);
    setSelections((prev) => {
      const next = { ...prev };
      for (const item of rubricItems) {
        if (!next[item.id]) {
          next[item.id] = 'correct';
        }
      }
      return next;
    });
  }

  function handleReset() {
    setCandidateName('');
    setCandidateDocument('');
    setLicenseCategory('B1');
    setVehiclePlate('');
    setNotes('');
    setSelections({});
    setFormError(null);
    setSavedRecordId(null);
  }

  function jumpToFirstPending() {
    if (!firstPendingItemId) return;
    const el = document.getElementById(`rubric-item-${firstPendingItemId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  async function handleSave() {
    setFormError(null);

    if (candidateName.trim().length < 2) {
      setFormError('Ingresa el nombre completo del aspirante (mínimo 2 caracteres).');
      return;
    }
    if (candidateDocument.trim().length < 2) {
      setFormError('Ingresa el documento de identidad o folio del aspirante.');
      return;
    }
    if (!metrics.isComplete) {
      setFormError(
        `Faltan ${metrics.pendingCount} puntos por calificar como Correcto o Incorrecto.`
      );
      return;
    }

    let activeUser = user;
    if (!activeUser) {
      activeUser = await onRequireAuth();
      if (!activeUser) {
        setFormError(
          'Debes iniciar sesión con Google para guardar la evaluación en la base de datos.'
        );
        return;
      }
    }

    setIsSaving(true);
    try {
      const evaluatedItems = rubricItems.map((item) => ({
        ...item,
        result: selections[item.id] ?? 'incorrect',
      }));

      const id = await saveEvaluation({
        evaluatorId: activeUser.uid,
        evaluatorName: activeUser.displayName || activeUser.email || 'Instructor',
        candidateName,
        candidateDocument,
        licenseCategory,
        vehiclePlate,
        notes,
        items: evaluatedItems,
      });

      setSavedRecordId(id);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? 'No se pudo guardar la evaluación en Firestore. Verifica tu conexión y permisos.'
          : 'Error inesperado al guardar la evaluación.'
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_340px] lg:flex-1 lg:min-h-0">
      {/* Left Sidebar: Candidate & Vehicle Registration */}
      <aside
        aria-labelledby="candidate-section-heading"
        className="border-b border-[#1A1A1E]/10 bg-white p-6 lg:border-b-0 lg:border-r lg:p-7 lg:overflow-y-auto"
      >
        <span className="block font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-[#800020] mb-1.5">
          Registro 01
        </span>
        <h2
          id="candidate-section-heading"
          className="font-display text-2xl font-bold tracking-tight text-[#1A1A1E] mb-6"
        >
          Datos Aspirante
        </h2>

        <div className="space-y-5">
          <div>
            <label
              htmlFor="candidate-name"
              className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#1A1A1E]/60"
            >
              Nombre Completo *
            </label>
            <input
              id="candidate-name"
              type="text"
              maxLength={120}
              value={candidateName}
              onChange={(e) => {
                setCandidateName(e.target.value);
                setFormError(null);
              }}
              placeholder="Ej. María Fernanda López"
              className="w-full rounded border border-[#1A1A1E]/15 bg-white px-3 py-2.5 text-sm text-[#1A1A1E] placeholder:text-[#1A1A1E]/35 focus:border-[#002B5B] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="candidate-doc"
              className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#1A1A1E]/60"
            >
              Documento / Folio *
            </label>
            <input
              id="candidate-doc"
              type="text"
              maxLength={40}
              value={candidateDocument}
              onChange={(e) => {
                setCandidateDocument(e.target.value);
                setFormError(null);
              }}
              placeholder="Ej. DNI-4829104"
              className="w-full rounded border border-[#1A1A1E]/15 bg-white px-3 py-2.5 font-mono text-sm text-[#1A1A1E] placeholder:font-sans placeholder:text-[#1A1A1E]/35 focus:border-[#002B5B] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="license-category"
              className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#1A1A1E]/60"
            >
              Categoría de licencia
            </label>
            <select
              id="license-category"
              value={licenseCategory}
              onChange={(e) => setLicenseCategory(e.target.value as LicenseCategory)}
              className="w-full rounded border border-[#1A1A1E]/15 bg-white px-3 py-2.5 text-sm text-[#1A1A1E] focus:border-[#002B5B] focus:outline-none"
            >
              {LICENSE_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="vehicle-plate"
              className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#1A1A1E]/60"
            >
              Placa del vehículo
            </label>
            <input
              id="vehicle-plate"
              type="text"
              maxLength={20}
              value={vehiclePlate}
              onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
              placeholder="ABC-492"
              className="w-full rounded border border-[#1A1A1E]/15 bg-white px-3 py-2.5 font-mono text-sm uppercase text-[#1A1A1E] placeholder:normal-case placeholder:font-sans placeholder:text-[#1A1A1E]/35 focus:border-[#002B5B] focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-8 border-t border-[#1A1A1E]/10 pt-5 text-xs text-[#1A1A1E]/60 space-y-1.5">
          <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#002B5B]">
            Parámetros de prueba
          </div>
          <p>
            {metrics.totalItems} criterios ·{' '}
            <span className="font-mono tabular-nums">{metrics.totalPoints} pts</span>
          </p>
          <p>Mínimo aprobatorio: {PASSING_THRESHOLD}%</p>
        </div>
      </aside>

      {/* Center Column: Real-Time Rubric Checklist */}
      <section
        aria-label="Evaluación práctica"
        className="bg-white p-6 lg:p-8 lg:overflow-y-auto"
      >
        <div className="mb-7">
          <span className="block font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-[#800020] mb-1.5">
            Evaluación en tiempo real
          </span>
          <h1 className="font-display text-3xl font-extrabold leading-[0.95] tracking-tight text-[#1A1A1E] sm:text-4xl text-balance">
            Calificación Práctica
          </h1>
          <p className="mt-2.5 text-sm text-[#1A1A1E]/70">
            Mínimo aprobatorio:{' '}
            <span className="font-mono font-bold text-[#002B5B] tabular-nums">
              {PASSING_THRESHOLD}%
            </span>{' '}
            sobre{' '}
            <span className="font-mono font-bold text-[#1A1A1E] tabular-nums">
              {metrics.totalPoints} pts
            </span>
            . Selecciona Correcto o Incorrecto en cada punto.
          </p>
        </div>

        <div className="space-y-5">
          {groupedSections.map(([sectionTitle, sectionItems], sectionIdx) => {
            const sectionTotal = sectionItems.reduce((acc, i) => acc + i.points, 0);
            const sectionEarned = sectionItems.reduce(
              (acc, i) => (selections[i.id] === 'correct' ? acc + i.points : acc),
              0
            );

            return (
              <div
                key={sectionTitle}
                className="overflow-hidden rounded-lg border border-[#1A1A1E]/10 bg-white"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1A1A1E]/10 bg-[#F8F7F4] px-4 py-3">
                  <h3 className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-[#800020]">
                    0{sectionIdx + 2}. {sectionTitle}
                  </h3>
                  <span className="font-mono text-xs font-bold text-[#1A1A1E]/70 tabular-nums">
                    {sectionEarned} / {sectionTotal} PTS
                  </span>
                </div>

                <div className="divide-y divide-[#1A1A1E]/10">
                  {sectionItems.map((item, itemIdx) => {
                    const current = selections[item.id];
                    const isCorrect = current === 'correct';
                    const isIncorrect = current === 'incorrect';

                    return (
                      <div
                        key={item.id}
                        id={`rubric-item-${item.id}`}
                        className={`flex flex-col gap-3 px-4 py-3.5 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                          isCorrect
                            ? 'bg-emerald-50/45'
                            : isIncorrect
                              ? 'bg-red-50/45'
                              : 'bg-white hover:bg-[#F8F7F4]/60'
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="flex items-baseline gap-2.5">
                            <span className="font-mono text-[11px] text-[#1A1A1E]/40 tabular-nums shrink-0">
                              {String(itemIdx + 1).padStart(2, '0')}
                            </span>
                            <p className="text-sm font-medium text-[#1A1A1E] leading-snug">
                              {item.title}
                            </p>
                          </div>
                          <div className="mt-1 pl-6 font-mono text-[11px] text-[#1A1A1E]/55 tabular-nums">
                            VALOR: {item.points} PTS
                            <span aria-hidden="true" className="mx-1.5">
                              ·
                            </span>
                            <span>
                              {isCorrect
                                ? `SUMADOS +${item.points} PTS`
                                : isIncorrect
                                  ? '0 PTS ASIGNADOS'
                                  : 'PENDIENTE'}
                            </span>
                          </div>
                        </div>

                        <div
                          role="group"
                          aria-label={`Calificar ${item.title}`}
                          className="flex items-center gap-2 shrink-0 pl-6 sm:pl-0"
                        >
                          <button
                            type="button"
                            onClick={() => handleSelect(item.id, 'correct')}
                            aria-pressed={isCorrect}
                            className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded border px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
                              isCorrect
                                ? 'border-emerald-700 bg-emerald-700 text-white'
                                : 'border-[#1A1A1E]/15 bg-white text-[#1A1A1E] hover:border-emerald-600 hover:bg-emerald-50 hover:text-emerald-800'
                            }`}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>Correcto</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSelect(item.id, 'incorrect')}
                            aria-pressed={isIncorrect}
                            className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded border px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 ${
                              isIncorrect
                                ? 'border-red-700 bg-red-700 text-white'
                                : 'border-[#1A1A1E]/15 bg-white text-[#1A1A1E] hover:border-red-600 hover:bg-red-50 hover:text-red-800'
                            }`}
                          >
                            <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>Incorrecto</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* General Notes */}
        <div className="mt-7">
          <div className="mb-1.5 flex items-center justify-between">
            <label
              htmlFor="evaluation-notes"
              className="text-[11px] font-bold uppercase tracking-wider text-[#1A1A1E]/60"
            >
              Observaciones del evaluador
            </label>
            <span className="font-mono text-[11px] text-[#1A1A1E]/45 tabular-nums">
              {notes.length} / 1000
            </span>
          </div>
          <textarea
            id="evaluation-notes"
            rows={4}
            maxLength={1000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anota incidencias relevantes durante el recorrido, faltas graves o recomendaciones..."
            className="w-full rounded border border-[#1A1A1E]/15 bg-white px-3.5 py-2.5 text-sm text-[#1A1A1E] placeholder:text-[#1A1A1E]/35 focus:border-[#002B5B] focus:outline-none"
          />
        </div>
      </section>

      {/* Right Sidebar: Live Score & Save Panel */}
      <aside
        aria-label="Resultado actual"
        className="border-t border-[#1A1A1E]/10 bg-[#F8F7F4] p-6 lg:border-t-0 lg:border-l lg:p-7 lg:overflow-y-auto"
      >
        {/* Big Score Block */}
        <div className="border-b border-[#1A1A1E]/10 pb-6 text-center">
          <span className="block font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-[#800020] mb-2">
            Resultado actual
          </span>
          <div className="font-display text-6xl font-extrabold leading-none tracking-tight text-[#002B5B] tabular-nums">
            {metrics.percentage.toFixed(1)}%
          </div>
          <div className="mt-2 font-mono text-xs font-bold text-[#1A1A1E]/60 tabular-nums">
            {metrics.earnedPoints} / {metrics.totalPoints} PUNTOS
          </div>

          {/* Progress Bar with MIN 70% marker */}
          <div className="relative mt-6 mb-2">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#1A1A1E]/10">
              <div
                className={`h-full rounded-full transition-all duration-200 ${
                  metrics.percentage >= PASSING_THRESHOLD
                    ? 'bg-emerald-600'
                    : 'bg-[#800020]'
                }`}
                style={{ width: `${Math.min(100, metrics.percentage)}%` }}
              />
            </div>
            <div
              className="absolute -top-1.5 flex flex-col items-center -translate-x-1/2"
              style={{ left: `${PASSING_THRESHOLD}%` }}
            >
              <div className="h-5 w-0.5 bg-[#1A1A1E]" />
            </div>
          </div>
          <div className="flex items-center justify-between font-mono text-[10px] font-bold text-[#1A1A1E]/55 tabular-nums">
            <span>0%</span>
            <span className="text-[#800020]">MIN {PASSING_THRESHOLD}%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Stat Grid */}
        <div className="grid grid-cols-3 gap-3 border-b border-[#1A1A1E]/10 py-5 text-center">
          <div>
            <div className="font-mono text-xl font-bold text-emerald-700 tabular-nums">
              {metrics.correctCount}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#1A1A1E]/55">
              Correctos
            </div>
          </div>
          <div>
            <div className="font-mono text-xl font-bold text-red-700 tabular-nums">
              {metrics.incorrectCount}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#1A1A1E]/55">
              Error
            </div>
          </div>
          <div>
            <div className="font-mono text-xl font-bold text-[#1A1A1E] tabular-nums">
              {metrics.pendingCount}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#1A1A1E]/55">
              Pend.
            </div>
          </div>
        </div>

        {/* Verdict Readout */}
        <div className="mt-5">
          {metrics.answeredCount === 0 ? (
            <div className="flex items-start gap-2 rounded border border-[#1A1A1E]/10 bg-white px-3.5 py-3 text-xs text-[#1A1A1E]/75">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#800020]" aria-hidden="true" />
              <span>
                Registra todos los criterios para obtener el veredicto final.
              </span>
            </div>
          ) : metrics.passed ? (
            <div className="flex items-start gap-2.5 rounded border border-emerald-300 bg-emerald-50 px-3.5 py-3 text-emerald-950">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
              <div>
                <p className="font-mono text-xs font-bold uppercase">
                  Aprobado · {metrics.percentage.toFixed(1)}%
                </p>
                <p className="mt-0.5 text-xs text-emerald-800">
                  {metrics.isComplete
                    ? 'Supera el mínimo requerido del 70%.'
                    : `Faltan ${metrics.pendingCount} criterios por evaluar.`}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 rounded border border-[#800020]/25 bg-red-50 px-3.5 py-3 text-red-950">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#800020]" aria-hidden="true" />
              <div>
                <p className="font-mono text-xs font-bold uppercase text-[#800020]">
                  Reprobado · {metrics.percentage.toFixed(1)}%
                </p>
                <p className="mt-0.5 text-xs text-red-900">
                  {metrics.isComplete
                    ? `Por debajo del mínimo del ${PASSING_THRESHOLD}%.`
                    : `Faltan ${metrics.pendingCount} criterios por calificar.`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Pending helpers */}
        {metrics.pendingCount > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
            {firstPendingItemId && (
              <button
                type="button"
                onClick={jumpToFirstPending}
                className="inline-flex items-center gap-1 font-semibold text-[#002B5B] hover:underline whitespace-nowrap"
              >
                <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Siguiente pendiente</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleMarkRemainingCorrect}
              className="font-semibold text-[#1A1A1E]/70 hover:text-[#1A1A1E] hover:underline whitespace-nowrap"
            >
              Marcar restantes Correcto
            </button>
          </div>
        )}

        {/* Inline error feedback */}
        {formError && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-900"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#800020]" aria-hidden="true" />
            <span>{formError}</span>
          </div>
        )}

        {/* Saved success feedback */}
        {savedRecordId && (
          <div
            role="status"
            className="mt-4 rounded border border-emerald-300 bg-emerald-50 p-3.5 text-xs text-emerald-950"
          >
            <div className="flex items-center gap-2 font-bold">
              <Database className="h-4 w-4 text-emerald-700 shrink-0" aria-hidden="true" />
              <span>Guardado en base de datos</span>
            </div>
            <p className="mt-1 text-emerald-800">
              Evaluación de {candidateName} registrada correctamente.
            </p>
            <div className="mt-3 flex items-center gap-4">
              <button
                type="button"
                onClick={onSavedSuccess}
                className="font-bold text-[#002B5B] underline whitespace-nowrap"
              >
                Ver historial
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="font-bold text-[#1A1A1E] underline whitespace-nowrap"
              >
                Nueva evaluación
              </button>
            </div>
          </div>
        )}

        {/* Primary Actions */}
        <div className="mt-6 space-y-2.5">
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="flex w-full min-h-[46px] items-center justify-center gap-2 rounded bg-[#002B5B] px-4 py-3 text-xs font-bold uppercase tracking-[0.06em] text-white transition-colors hover:bg-[#001f44] disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#002B5B]"
          >
            <Save className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {isSaving
                ? 'Guardando...'
                : user
                  ? 'Guardar Evaluación'
                  : 'Iniciar sesión y guardar'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="flex w-full min-h-[40px] items-center justify-center gap-2 rounded bg-[#1A1A1E]/10 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-[#1A1A1E] transition-colors hover:bg-[#1A1A1E]/15 whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Reiniciar Todo</span>
          </button>
        </div>

        <p className="mt-5 text-xs font-semibold text-[#800020]">
          Recuerda calificar todos los criterios para emitir y guardar el veredicto final.
        </p>
      </aside>
    </div>
  );
}
