import { useMemo } from 'react';
import type { User } from 'firebase/auth';
import { LogIn } from 'lucide-react';
import type { DrivingEvaluation } from '../types/evaluation';

interface StatsViewProps {
  user: User | null;
  evaluations: DrivingEvaluation[];
  onSignIn: () => void;
  onStartNew: () => void;
}

export function StatsView({
  user,
  evaluations,
  onSignIn,
  onStartNew,
}: StatsViewProps) {
  const analytics = useMemo(() => {
    const total = evaluations.length;
    if (total === 0) {
      return null;
    }

    const passedCount = evaluations.filter((e) => e.passed).length;
    const failedCount = total - passedCount;
    const passRate = Math.round((passedCount / total) * 1000) / 10;
    const avgPercentage =
      Math.round(
        (evaluations.reduce((acc, e) => acc + e.percentage, 0) / total) * 10
      ) / 10;

    const itemStats = new Map<
      string,
      { title: string; section: string; attempts: number; failures: number }
    >();
    const categoryStats = new Map<
      string,
      { category: string; total: number; passed: number; sumPct: number }
    >();

    for (const ev of evaluations) {
      const cat = categoryStats.get(ev.licenseCategory) ?? {
        category: ev.licenseCategory,
        total: 0,
        passed: 0,
        sumPct: 0,
      };
      cat.total += 1;
      if (ev.passed) cat.passed += 1;
      cat.sumPct += ev.percentage;
      categoryStats.set(ev.licenseCategory, cat);

      for (const item of ev.items) {
        const current = itemStats.get(item.title) ?? {
          title: item.title,
          section: item.section,
          attempts: 0,
          failures: 0,
        };
        current.attempts += 1;
        if (item.result === 'incorrect') {
          current.failures += 1;
        }
        itemStats.set(item.title, current);
      }
    }

    const topFailedItems = Array.from(itemStats.values())
      .map((s) => ({
        ...s,
        failureRate: Math.round((s.failures / s.attempts) * 1000) / 10,
      }))
      .sort((a, b) => b.failures - a.failures || b.failureRate - a.failureRate)
      .slice(0, 8);

    const byCategory = Array.from(categoryStats.values()).sort((a, b) =>
      a.category.localeCompare(b.category)
    );

    return {
      total,
      passedCount,
      failedCount,
      passRate,
      avgPercentage,
      topFailedItems,
      byCategory,
    };
  }, [evaluations]);

  if (!user) {
    return (
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <span className="block font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-[#800020] mb-2">
            Indicadores de desempeño
          </span>
          <h1 className="font-display text-3xl font-extrabold text-[#1A1A1E]">
            Estadísticas de evaluaciones
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-[#1A1A1E]/70">
            Inicia sesión con Google para visualizar tasas de aprobación y los puntos con
            mayor índice de error en tus pruebas guardadas.
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

  if (!analytics) {
    return (
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <div className="rounded-lg border border-[#1A1A1E]/10 bg-[#F8F7F4] p-12">
            <h1 className="font-display text-2xl font-bold text-[#1A1A1E]">
              Sin datos estadísticos todavía
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#1A1A1E]/65">
              Registra y guarda al menos una evaluación práctica para calcular indicadores
              reales de desempeño.
            </p>
            <button
              type="button"
              onClick={onStartNew}
              className="mt-6 inline-flex min-h-[44px] items-center rounded bg-[#002B5B] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#001f44] whitespace-nowrap"
            >
              Ir a evaluación
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
        <div className="mb-8 border-b border-[#1A1A1E]/10 pb-6">
          <span className="block font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-[#800020] mb-1">
            Análisis consolidado
          </span>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#1A1A1E]">
            Estadísticas de Pruebas
          </h1>
          <p className="mt-1 text-sm text-[#1A1A1E]/65">
            Métricas reales calculadas sobre {analytics.total}{' '}
            {analytics.total === 1 ? 'evaluación almacenada' : 'evaluaciones almacenadas'}.
          </p>
        </div>

        {/* 4-column KPI strip */}
        <div className="grid grid-cols-2 divide-x divide-y divide-[#1A1A1E]/10 overflow-hidden rounded-lg border border-[#1A1A1E]/10 bg-[#F8F7F4] sm:grid-cols-4 sm:divide-y-0">
          <div className="p-6">
            <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#1A1A1E]/60">
              Total pruebas
            </div>
            <div className="mt-2 font-display text-4xl font-extrabold text-[#002B5B] tabular-nums">
              {analytics.total}
            </div>
          </div>

          <div className="p-6">
            <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#1A1A1E]/60">
              Tasa de aprobación
            </div>
            <div className="mt-2 font-display text-4xl font-extrabold text-emerald-700 tabular-nums">
              {analytics.passRate.toFixed(1)}%
            </div>
            <div className="mt-1 font-mono text-[11px] text-[#1A1A1E]/60 tabular-nums">
              {analytics.passedCount} ok · {analytics.failedCount} reprobadas
            </div>
          </div>

          <div className="p-6">
            <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#1A1A1E]/60">
              Promedio general
            </div>
            <div className="mt-2 font-display text-4xl font-extrabold text-[#1A1A1E] tabular-nums">
              {analytics.avgPercentage.toFixed(1)}%
            </div>
            <div className="mt-1 font-mono text-[11px] text-[#800020]">
              Mínimo 70.0%
            </div>
          </div>

          <div className="p-6">
            <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#1A1A1E]/60">
              Categorías
            </div>
            <div className="mt-2 font-display text-4xl font-extrabold text-[#1A1A1E] tabular-nums">
              {analytics.byCategory.length}
            </div>
          </div>
        </div>

        {/* Two-column detail breakdown */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <section className="overflow-hidden rounded-lg border border-[#1A1A1E]/10 bg-white lg:col-span-7">
            <div className="border-b border-[#1A1A1E]/10 bg-[#F8F7F4] px-6 py-4">
              <h2 className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-[#800020]">
                Criterios con mayor frecuencia de error
              </h2>
            </div>
            <div className="divide-y divide-[#1A1A1E]/10">
              {analytics.topFailedItems.map((item) => (
                <div key={item.title} className="px-6 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#1A1A1E]">
                        {item.title}
                      </p>
                      <p className="font-mono text-[11px] text-[#1A1A1E]/55">
                        {item.section}
                      </p>
                    </div>
                    <div className="text-right shrink-0 font-mono tabular-nums">
                      <div className="text-sm font-bold text-[#800020]">
                        {item.failureRate.toFixed(1)}%
                      </div>
                      <div className="text-[11px] text-[#1A1A1E]/55">
                        {item.failures} / {item.attempts}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#1A1A1E]/10">
                    <div
                      className="h-full bg-[#800020]"
                      style={{ width: `${item.failureRate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-[#1A1A1E]/10 bg-white lg:col-span-5">
            <div className="border-b border-[#1A1A1E]/10 bg-[#F8F7F4] px-6 py-4">
              <h2 className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-[#800020]">
                Desempeño por categoría
              </h2>
            </div>
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#1A1A1E]/10 font-mono text-[11px] font-bold uppercase text-[#1A1A1E]/60">
                  <th className="px-6 py-3">Categoría</th>
                  <th className="px-4 py-3 text-right">Pruebas</th>
                  <th className="px-4 py-3 text-right">Aprob.</th>
                  <th className="px-6 py-3 text-right">Prom.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1E]/10 font-mono text-xs tabular-nums">
                {analytics.byCategory.map((cat) => {
                  const passPct = (cat.passed / cat.total) * 100;
                  const avgPct = cat.sumPct / cat.total;
                  return (
                    <tr key={cat.category}>
                      <td className="px-6 py-3.5 font-sans text-sm font-bold text-[#002B5B]">
                        {cat.category}
                      </td>
                      <td className="px-4 py-3.5 text-right text-[#1A1A1E]/75">
                        {cat.total}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-emerald-700">
                        {passPct.toFixed(1)}%
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-[#1A1A1E]">
                        {avgPct.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </div>
  );
}
