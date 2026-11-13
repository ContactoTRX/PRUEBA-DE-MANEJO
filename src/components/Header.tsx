import type { User } from 'firebase/auth';
import { LogIn, LogOut } from 'lucide-react';

export type ActiveTab = 'evaluate' | 'history' | 'stats' | 'rubric';

interface HeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  user: User | null;
  authLoading: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  historyCount: number;
}

const NAV_ITEMS: { id: ActiveTab; label: string }[] = [
  { id: 'evaluate', label: 'Evaluación' },
  { id: 'history', label: 'Historial' },
  { id: 'stats', label: 'Estadísticas' },
  { id: 'rubric', label: 'Criterios' },
];

export function Header({
  activeTab,
  onSelectTab,
  user,
  authLoading,
  onSignIn,
  onSignOut,
  historyCount,
}: HeaderProps) {
  return (
    <header className="no-print shrink-0 bg-[#002B5B] text-white border-b-4 border-[#800020]">
      <div className="flex items-center justify-between gap-8 px-4 py-3.5 sm:px-8">
        {/* Zone 1: Brand mark */}
        <button
          type="button"
          onClick={() => onSelectTab('evaluate')}
          className="flex items-center gap-3 text-left whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded border border-[#800020] bg-white text-[#002B5B] shrink-0"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              className="h-5 w-5"
            >
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="2.5" />
              <path d="M12 3v6.5M4.5 16l5.3-3M19.5 16l-5.3-3" />
            </svg>
          </span>
          <span className="font-display text-xl font-extrabold tracking-tight text-white">
            ExamenVial
          </span>
        </button>

        {/* Zone 2: 4 clean single-line text navigation links */}
        <nav
          aria-label="Navegación principal"
          className="hidden md:flex items-center gap-6"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const suffix =
              item.id === 'history' && user && historyCount > 0
                ? ` (${historyCount})`
                : '';
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`py-1.5 text-xs font-semibold uppercase tracking-[0.1em] whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${
                  isActive
                    ? 'text-white shadow-[0_2px_0_#800020]'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {item.label}
                {suffix}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          {authLoading ? (
            <span className="font-mono text-xs text-white/70 whitespace-nowrap shrink-0">
              Verificando...
            </span>
          ) : user ? (
            <button
              type="button"
              onClick={onSignOut}
              title={user.email ?? 'Cerrar sesión'}
              className="inline-flex items-center gap-2 rounded border border-white/25 bg-white px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-[#002B5B] transition-colors hover:bg-[#F8F7F4] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <LogOut className="h-3.5 w-3.5 text-[#800020]" aria-hidden="true" />
              <span className="max-w-[130px] truncate">
                {user.displayName?.split(' ')[0] || 'Instructor'}
              </span>
              <span aria-hidden="true" className="text-[#1A1A1E]/30">
                ·
              </span>
              <span>Salir</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex items-center gap-2 rounded bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#002B5B] transition-colors hover:bg-[#F8F7F4] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <LogIn className="h-3.5 w-3.5 text-[#800020]" aria-hidden="true" />
              <span>Iniciar sesión</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile navigation bar */}
      <nav
        aria-label="Navegación móvil"
        className="flex md:hidden items-center justify-between border-t border-white/15 px-4 py-2 overflow-x-auto gap-4"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`py-1 text-[11px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap shrink-0 transition-colors ${
                isActive
                  ? 'text-white shadow-[0_2px_0_#800020]'
                  : 'text-white/70'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
