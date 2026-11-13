/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { AlertCircle } from 'lucide-react';
import { auth, googleProvider } from './firebase';
import {
  subscribeCustomRubric,
  subscribeEvaluations,
} from './services/evaluationService';
import {
  DEFAULT_RUBRIC_ITEMS,
  PASSING_THRESHOLD,
  type DrivingEvaluation,
  type RubricItem,
} from './types/evaluation';
import { Header, type ActiveTab } from './components/Header';
import { EvaluationWorkspace } from './components/EvaluationWorkspace';
import { HistoryView } from './components/HistoryView';
import { StatsView } from './components/StatsView';
import { RubricEditorView } from './components/RubricEditorView';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('evaluate');
  const [evaluations, setEvaluations] = useState<DrivingEvaluation[]>([]);
  const [evaluationsLoading, setEvaluationsLoading] = useState(false);
  const [rubricItems, setRubricItems] =
    useState<RubricItem[]>(DEFAULT_RUBRIC_ITEMS);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (authLoading || !user) {
      setEvaluations([]);
      setEvaluationsLoading(false);
      setRubricItems(DEFAULT_RUBRIC_ITEMS);
      return;
    }

    setEvaluationsLoading(true);
    setDbError(null);

    const unsubEvaluations = subscribeEvaluations(
      user.uid,
      (list) => {
        setEvaluations(list);
        setEvaluationsLoading(false);
      },
      (err) => {
        setEvaluationsLoading(false);
        if (err.message.includes('Quota exceeded')) {
          setDbError(
            'Se alcanzó la cuota diaria gratuita de Firestore. Intenta nuevamente mañana.'
          );
        } else {
          setDbError('No se pudo sincronizar el historial desde Firestore.');
        }
      }
    );

    const unsubRubric = subscribeCustomRubric(
      user.uid,
      (customItems) => {
        setRubricItems(customItems ?? DEFAULT_RUBRIC_ITEMS);
      },
      () => {
        setRubricItems(DEFAULT_RUBRIC_ITEMS);
      }
    );

    return () => {
      unsubEvaluations();
      unsubRubric();
    };
  }, [authLoading, user]);

  async function handleSignIn(): Promise<User | null> {
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      return cred.user;
    } catch (error) {
      const code =
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code: string }).code)
          : '';
      if (code !== 'auth/popup-closed-by-user') {
        setAuthError(
          'No fue posible iniciar sesión con Google. Verifica que las ventanas emergentes estén habilitadas.'
        );
      }
      return null;
    }
  }

  async function handleSignOut() {
    setAuthError(null);
    await signOut(auth);
  }

  return (
    <div className="min-h-screen lg:h-screen flex flex-col bg-[#F8F7F4] text-[#1A1A1E] lg:overflow-hidden print:h-auto print:overflow-visible">
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        user={user}
        authLoading={authLoading}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        historyCount={evaluations.length}
      />

      {(authError || dbError) && (
        <div className="no-print shrink-0 border-b border-red-200 bg-red-50 px-6 py-2.5">
          <div
            role="alert"
            className="mx-auto flex max-w-7xl items-center justify-between gap-3 text-xs font-medium text-red-900"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-[#800020]" aria-hidden="true" />
              <span>{authError || dbError}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setAuthError(null);
                setDbError(null);
              }}
              className="font-bold underline whitespace-nowrap"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col min-h-0">
        {activeTab === 'evaluate' && (
          <EvaluationWorkspace
            rubricItems={rubricItems}
            user={user}
            onRequireAuth={handleSignIn}
            onSavedSuccess={() => setActiveTab('history')}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            user={user}
            evaluations={evaluations}
            loading={evaluationsLoading}
            onSignIn={handleSignIn}
            onStartNew={() => setActiveTab('evaluate')}
          />
        )}

        {activeTab === 'stats' && (
          <StatsView
            user={user}
            evaluations={evaluations}
            onSignIn={handleSignIn}
            onStartNew={() => setActiveTab('evaluate')}
          />
        )}

        {activeTab === 'rubric' && (
          <RubricEditorView
            rubricItems={rubricItems}
            user={user}
            onRequireAuth={handleSignIn}
            onLocalRubricChange={setRubricItems}
          />
        )}
      </main>

      <footer className="no-print shrink-0 border-t border-[#1A1A1E]/10 bg-white px-4 py-2.5 sm:px-8">
        <div className="flex flex-col items-center justify-between gap-1 font-mono text-[11px] text-[#1A1A1E]/60 sm:flex-row">
          <span>ExamenVial · Evaluación práctica de conducción</span>
          <span>Mínimo aprobatorio: {PASSING_THRESHOLD}%</span>
          <span>© 2026 Sistema de Gestión Vial</span>
        </div>
      </footer>
    </div>
  );
}
