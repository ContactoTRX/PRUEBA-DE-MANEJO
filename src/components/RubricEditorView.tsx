import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertCircle,
  CheckCircle2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';
import {
  DEFAULT_RUBRIC_ITEMS,
  EVALUATION_SECTIONS,
  MAX_RUBRIC_ITEMS,
  type RubricItem,
} from '../types/evaluation';
import { resetCustomRubric, saveCustomRubric } from '../services/evaluationService';

interface RubricEditorViewProps {
  rubricItems: RubricItem[];
  user: User | null;
  onRequireAuth: () => Promise<User | null>;
  onLocalRubricChange: (items: RubricItem[]) => void;
}

export function RubricEditorView({
  rubricItems,
  user,
  onRequireAuth,
  onLocalRubricChange,
}: RubricEditorViewProps) {
  const [draftItems, setDraftItems] = useState<RubricItem[]>(rubricItems);
  const [newTitle, setNewTitle] = useState('');
  const [newSection, setNewSection] = useState(EVALUATION_SECTIONS[0]);
  const [newPoints, setNewPoints] = useState(5);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setDraftItems(rubricItems);
  }, [rubricItems]);

  const totalPoints = draftItems.reduce((acc, item) => acc + item.points, 0);

  function handleAddCriterion(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    if (draftItems.length >= MAX_RUBRIC_ITEMS) {
      setErrorMessage(`El máximo permitido es de ${MAX_RUBRIC_ITEMS} criterios.`);
      return;
    }
    if (newTitle.trim().length < 3) {
      setErrorMessage(
        'Escribe una descripción clara para el criterio (mínimo 3 caracteres).'
      );
      return;
    }
    const pts = Math.max(1, Math.min(100, Math.round(Number(newPoints) || 1)));
    const newItem: RubricItem = {
      id: `custom_${Date.now().toString(36)}`,
      title: newTitle.trim().slice(0, 160),
      section: newSection,
      points: pts,
    };

    setDraftItems((prev) => [...prev, newItem]);
    setNewTitle('');
    setNewPoints(5);
  }

  function handlePointsChange(id: string, value: number) {
    setStatusMessage(null);
    const pts = Math.max(1, Math.min(100, Math.round(value || 1)));
    setDraftItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, points: pts } : item))
    );
  }

  function handleRemoveItem(id: string) {
    if (draftItems.length <= 1) {
      setErrorMessage('Debe existir al menos un criterio en la rúbrica.');
      return;
    }
    setErrorMessage(null);
    setStatusMessage(null);
    setDraftItems((prev) => prev.filter((item) => item.id !== id));
  }

  async function handleSaveRubric() {
    setErrorMessage(null);
    setStatusMessage(null);

    let activeUser = user;
    if (!activeUser) {
      activeUser = await onRequireAuth();
      if (!activeUser) {
        onLocalRubricChange(draftItems);
        setStatusMessage('Plantilla aplicada localmente en esta sesión.');
        return;
      }
    }

    setSaving(true);
    try {
      await saveCustomRubric(activeUser.uid, draftItems);
      onLocalRubricChange(draftItems);
      setStatusMessage('Criterios guardados en tu base de datos.');
    } catch {
      setErrorMessage('No se pudo guardar la plantilla personalizada.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRestoreDefault() {
    setErrorMessage(null);
    setStatusMessage(null);
    setDraftItems(DEFAULT_RUBRIC_ITEMS);
    onLocalRubricChange(DEFAULT_RUBRIC_ITEMS);

    if (user) {
      setSaving(true);
      try {
        await resetCustomRubric(user.uid);
        setStatusMessage('Plantilla estándar restaurada (20 criterios · 100 pts).');
      } catch {
        setErrorMessage('No se pudo restaurar la plantilla en Firestore.');
      } finally {
        setSaving(false);
      }
    } else {
      setStatusMessage('Plantilla estándar restaurada.');
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <div className="mb-6 flex flex-col gap-4 border-b border-[#1A1A1E]/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="block font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-[#800020] mb-1">
              Configuración de rúbrica
            </span>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#1A1A1E]">
              Criterios y Ponderación
            </h1>
            <p className="mt-1 text-sm text-[#1A1A1E]/65">
              El cálculo del 70% mínimo aprobatorio se ajusta automáticamente a la
              sumatoria total (actual:{' '}
              <span className="font-mono font-bold text-[#002B5B] tabular-nums">
                {totalPoints} pts
              </span>
              ).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleRestoreDefault}
              disabled={saving}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded border border-[#1A1A1E]/15 bg-white px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-[#1A1A1E] hover:bg-[#F8F7F4] whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Restaurar estándar</span>
            </button>

            <button
              type="button"
              onClick={handleSaveRubric}
              disabled={saving}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded bg-[#002B5B] px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-[#001f44] disabled:opacity-60 whitespace-nowrap"
            >
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{saving ? 'Guardando...' : 'Guardar criterios'}</span>
            </button>
          </div>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mb-6 flex items-center gap-2 rounded border border-red-300 bg-red-50 px-4 py-3 text-xs font-medium text-red-900"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-[#800020]" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        {statusMessage && (
          <div
            role="status"
            className="mb-6 flex items-center gap-2 rounded border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-900"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
            <span>{statusMessage}</span>
          </div>
        )}

        <form
          onSubmit={handleAddCriterion}
          className="mb-8 rounded-lg border border-[#1A1A1E]/10 bg-[#F8F7F4] p-5"
        >
          <h2 className="mb-4 font-mono text-xs font-bold uppercase tracking-[0.12em] text-[#800020]">
            Agregar nuevo criterio ({draftItems.length}/{MAX_RUBRIC_ITEMS})
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
            <div className="sm:col-span-5">
              <label htmlFor="new-criterion-title" className="sr-only">
                Descripción del criterio
              </label>
              <input
                id="new-criterion-title"
                type="text"
                maxLength={160}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ej. Uso correcto de luces altas y bajas"
                className="w-full rounded border border-[#1A1A1E]/15 bg-white px-3 py-2 text-sm text-[#1A1A1E] placeholder:text-[#1A1A1E]/40 focus:border-[#002B5B] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-4">
              <label htmlFor="new-criterion-section" className="sr-only">
                Sección
              </label>
              <select
                id="new-criterion-section"
                value={newSection}
                onChange={(e) => setNewSection(e.target.value)}
                className="w-full rounded border border-[#1A1A1E]/15 bg-white px-3 py-2 text-sm text-[#1A1A1E] focus:border-[#002B5B] focus:outline-none"
              >
                {EVALUATION_SECTIONS.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-1">
              <label htmlFor="new-criterion-pts" className="sr-only">
                Puntos
              </label>
              <input
                id="new-criterion-pts"
                type="number"
                min={1}
                max={100}
                value={newPoints}
                onChange={(e) => setNewPoints(Number(e.target.value))}
                className="w-full rounded border border-[#1A1A1E]/15 bg-white px-3 py-2 font-mono text-sm text-[#1A1A1E] tabular-nums focus:border-[#002B5B] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                className="flex w-full min-h-[38px] items-center justify-center gap-1.5 rounded bg-[#002B5B] px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-[#001f44] whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Agregar</span>
              </button>
            </div>
          </div>
        </form>

        <div className="overflow-hidden rounded-lg border border-[#1A1A1E]/10 bg-white">
          <div className="divide-y divide-[#1A1A1E]/10">
            {draftItems.map((item, idx) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2.5">
                    <span className="font-mono text-xs text-[#1A1A1E]/40 tabular-nums">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="text-sm font-medium text-[#1A1A1E]">
                      {item.title}
                    </span>
                  </div>
                  <div className="pl-6 font-mono text-[11px] text-[#1A1A1E]/55">
                    {item.section}
                  </div>
                </div>

                <div className="flex items-center gap-3 pl-6 sm:pl-0 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <label
                      htmlFor={`pts-${item.id}`}
                      className="font-mono text-[11px] uppercase text-[#1A1A1E]/60"
                    >
                      Pts:
                    </label>
                    <input
                      id={`pts-${item.id}`}
                      type="number"
                      min={1}
                      max={100}
                      value={item.points}
                      onChange={(e) =>
                        handlePointsChange(item.id, Number(e.target.value))
                      }
                      className="w-16 rounded border border-[#1A1A1E]/15 px-2 py-1 text-right font-mono text-xs font-bold text-[#002B5B] tabular-nums focus:border-[#002B5B] focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    aria-label={`Quitar criterio ${item.title}`}
                    className="rounded border border-[#1A1A1E]/15 p-1.5 text-[#1A1A1E]/50 hover:border-red-300 hover:bg-red-50 hover:text-[#800020]"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
