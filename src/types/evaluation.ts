export type LicenseCategory = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type ItemResult = 'correct' | 'incorrect';

export interface RubricItem {
  id: string;
  title: string;
  section: string;
  points: number;
}

export interface EvaluationItemResult extends RubricItem {
  result: ItemResult;
}

export interface DrivingEvaluation {
  id: string;
  evaluatorId: string;
  evaluatorName: string;
  candidateName: string;
  candidateDocument: string;
  licenseCategory: LicenseCategory;
  vehiclePlate: string;
  totalPoints: number;
  earnedPoints: number;
  percentage: number;
  passed: boolean;
  notes: string;
  items: EvaluationItemResult[];
  createdAtMs: number;
}

export const PASSING_THRESHOLD = 70;
export const MAX_RUBRIC_ITEMS = 35;

export const LICENSE_CATEGORIES: { value: LicenseCategory; label: string }[] = [
  { value: 'A1', label: 'A1 — Motocicleta hasta 125 cc' },
  { value: 'A2', label: 'A2 — Motocicleta > 125 cc' },
  { value: 'B1', label: 'B1 — Automóvil particular' },
  { value: 'B2', label: 'B2 — Camioneta / Microbús' },
  { value: 'C1', label: 'C1 — Servicio público liviano' },
  { value: 'C2', label: 'C2 — Carga y transporte pesado' },
];

export const EVALUATION_SECTIONS: string[] = [
  'Inspección previa y postura',
  'Control del vehículo y arranque',
  'Circulación y respeto a normas',
  'Observación y convivencia vial',
  'Maniobras de precisión y estacionamiento',
];

export const DEFAULT_RUBRIC_ITEMS: RubricItem[] = [
  {
    id: 'pre-asiento',
    section: 'Inspección previa y postura',
    title: 'Ajuste correcto de asiento, volante y apoyacabezas',
    points: 3,
  },
  {
    id: 'pre-espejos',
    section: 'Inspección previa y postura',
    title: 'Regulación de espejos retrovisores interior y laterales',
    points: 3,
  },
  {
    id: 'pre-cinturon',
    section: 'Inspección previa y postura',
    title: 'Uso del cinturón de seguridad del conductor y acompañante',
    points: 4,
  },
  {
    id: 'pre-freno-neutro',
    section: 'Inspección previa y postura',
    title: 'Verificación de freno de estacionamiento y punto muerto / Parking antes de encender',
    points: 3,
  },
  {
    id: 'pre-tablero',
    section: 'Inspección previa y postura',
    title: 'Encendido suave y revisión de luces testigo del tablero',
    points: 2,
  },
  {
    id: 'ctrl-pedales',
    section: 'Control del vehículo y arranque',
    title: 'Coordinación suave de embrague, freno y acelerador sin jaloneos',
    points: 5,
  },
  {
    id: 'ctrl-pendiente',
    section: 'Control del vehículo y arranque',
    title: 'Arranque en pendiente sin retroceso excesivo ni calado del motor',
    points: 5,
  },
  {
    id: 'ctrl-volante',
    section: 'Control del vehículo y arranque',
    title: 'Sujeción firme y posición adecuada de las manos en el volante',
    points: 5,
  },
  {
    id: 'ctrl-marchas',
    section: 'Control del vehículo y arranque',
    title: 'Cambios de marcha oportunos y control estable de la trayectoria',
    points: 5,
  },
  {
    id: 'circ-direccionales',
    section: 'Circulación y respeto a normas',
    title: 'Uso anticipado de luces direccionales en giros y cambios de carril',
    points: 6,
  },
  {
    id: 'circ-pare',
    section: 'Circulación y respeto a normas',
    title: 'Detención total ante señales de PARE (ALTO) y respeto a Ceda el Paso',
    points: 7,
  },
  {
    id: 'circ-semaforos',
    section: 'Circulación y respeto a normas',
    title: 'Obediencia a semáforos y respeto a demarcaciones y líneas de carril',
    points: 6,
  },
  {
    id: 'circ-distancia',
    section: 'Circulación y respeto a normas',
    title: 'Mantenimiento de distancia segura respecto al vehículo precedente',
    points: 6,
  },
  {
    id: 'circ-velocidad',
    section: 'Circulación y respeto a normas',
    title: 'Circulación dentro de los límites de velocidad permitidos y zonas escolares',
    points: 5,
  },
  {
    id: 'obs-puntos-ciegos',
    section: 'Observación y convivencia vial',
    title: 'Revisión de espejos y puntos ciegos antes de cada maniobra',
    points: 7,
  },
  {
    id: 'obs-peatones',
    section: 'Observación y convivencia vial',
    title: 'Prioridad de paso a peatones y ciclistas en cruces y pasos cebra',
    points: 7,
  },
  {
    id: 'obs-defensiva',
    section: 'Observación y convivencia vial',
    title: 'Anticipación ante imprevistos y actitud de conducción defensiva',
    points: 6,
  },
  {
    id: 'man-estacionamiento',
    section: 'Maniobras de precisión y estacionamiento',
    title: 'Estacionamiento en paralelo o batería dentro del espacio demarcado',
    points: 6,
  },
  {
    id: 'man-retroceso',
    section: 'Maniobras de precisión y estacionamiento',
    title: 'Maniobra de retroceso controlada con observación directa y espejos',
    points: 5,
  },
  {
    id: 'man-cierre',
    section: 'Maniobras de precisión y estacionamiento',
    title: 'Detención final segura, freno de estacionamiento y apagado del vehículo',
    points: 4,
  },
];
