import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  MAX_RUBRIC_ITEMS,
  PASSING_THRESHOLD,
  type DrivingEvaluation,
  type EvaluationItemResult,
  type LicenseCategory,
  type RubricItem,
} from '../types/evaluation';

export interface SaveEvaluationInput {
  evaluatorId: string;
  evaluatorName: string;
  candidateName: string;
  candidateDocument: string;
  licenseCategory: LicenseCategory;
  vehiclePlate: string;
  notes: string;
  items: EvaluationItemResult[];
}

function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || 'item';
}

export function subscribeEvaluations(
  userId: string,
  onData: (evaluations: DrivingEvaluation[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'evaluations';
  const q = query(collection(db, path), where('evaluatorId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: DrivingEvaluation[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        const createdAt = d.createdAt instanceof Timestamp ? d.createdAt.toMillis() : Date.now();
        return {
          id: docSnap.id,
          evaluatorId: String(d.evaluatorId ?? ''),
          evaluatorName: String(d.evaluatorName ?? ''),
          candidateName: String(d.candidateName ?? ''),
          candidateDocument: String(d.candidateDocument ?? ''),
          licenseCategory: (d.licenseCategory ?? 'B1') as LicenseCategory,
          vehiclePlate: String(d.vehiclePlate ?? ''),
          totalPoints: Number(d.totalPoints ?? 0),
          earnedPoints: Number(d.earnedPoints ?? 0),
          percentage: Number(d.percentage ?? 0),
          passed: Boolean(d.passed),
          notes: String(d.notes ?? ''),
          items: Array.isArray(d.items) ? (d.items as EvaluationItemResult[]) : [],
          createdAtMs: createdAt,
        };
      });
      list.sort((a, b) => b.createdAtMs - a.createdAtMs);
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function saveEvaluation(input: SaveEvaluationInput): Promise<string> {
  const items = input.items.slice(0, MAX_RUBRIC_ITEMS).map((item) => ({
    id: sanitizeId(item.id),
    title: item.title.trim().slice(0, 160),
    section: item.section.trim().slice(0, 80),
    points: Math.max(1, Math.min(100, Number(item.points))),
    result: item.result,
  }));

  const totalPoints = items.reduce((acc, item) => acc + item.points, 0);
  const earnedPoints = items.reduce(
    (acc, item) => (item.result === 'correct' ? acc + item.points : acc),
    0
  );
  const percentage =
    totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 1000) / 10 : 0;
  const passed = percentage >= PASSING_THRESHOLD;

  const evalId = `eval_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const path = `evaluations/${evalId}`;

  const payload = {
    evaluatorId: input.evaluatorId.slice(0, 128),
    evaluatorName: (input.evaluatorName.trim() || 'Instructor').slice(0, 120),
    candidateName: input.candidateName.trim().slice(0, 120),
    candidateDocument: input.candidateDocument.trim().slice(0, 40),
    licenseCategory: input.licenseCategory,
    vehiclePlate: input.vehiclePlate.trim().toUpperCase().slice(0, 20),
    totalPoints,
    earnedPoints,
    percentage,
    passed,
    notes: input.notes.trim().slice(0, 1000),
    items,
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'evaluations', evalId), payload);
    return evalId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function removeEvaluation(evaluationId: string): Promise<void> {
  const path = `evaluations/${evaluationId}`;
  try {
    await deleteDoc(doc(db, 'evaluations', evaluationId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeCustomRubric(
  userId: string,
  onData: (items: RubricItem[] | null) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = `rubrics/${userId}`;
  return onSnapshot(
    doc(db, 'rubrics', userId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }
      const data = snapshot.data();
      if (Array.isArray(data.items) && data.items.length > 0) {
        onData(data.items as RubricItem[]);
      } else {
        onData(null);
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function saveCustomRubric(userId: string, items: RubricItem[]): Promise<void> {
  const path = `rubrics/${userId}`;
  const sanitizedItems = items.slice(0, MAX_RUBRIC_ITEMS).map((item) => ({
    id: sanitizeId(item.id),
    title: item.title.trim().slice(0, 160),
    section: item.section.trim().slice(0, 80),
    points: Math.max(1, Math.min(100, Math.round(Number(item.points)))),
  }));

  try {
    await setDoc(doc(db, 'rubrics', userId), {
      ownerId: userId,
      items: sanitizedItems,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function resetCustomRubric(userId: string): Promise<void> {
  const path = `rubrics/${userId}`;
  try {
    await deleteDoc(doc(db, 'rubrics', userId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
