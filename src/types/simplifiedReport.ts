export type SimplifiedReportColumnKey =
  | 'categoria'
  | 'idade'
  | 'altura'
  | 'peso'
  | 'sumDobras'
  | 'faulkner'
  | 'pollock'
  | 'mediaFP'
  | 'dpvc'
  | 'alturaPrevista'
  | 'difCoxa'
  | 'difPantu'
  | 'difBraco';

export type SimplifiedReportSelections = Record<SimplifiedReportColumnKey, boolean>;

export interface SimplifiedReportColumnMeta {
  key: SimplifiedReportColumnKey;
  label: string;
  unit?: string;
  hasAverage: boolean;
}

export const SIMPLIFIED_REPORT_COLUMNS: SimplifiedReportColumnMeta[] = [
  { key: 'categoria', label: 'Categoria', hasAverage: false },
  { key: 'idade', label: 'Idade', unit: 'anos', hasAverage: false },
  { key: 'altura', label: 'Altura', unit: 'cm', hasAverage: false },
  { key: 'peso', label: 'Peso', unit: 'kg', hasAverage: false },
  { key: 'sumDobras', label: 'Soma das Dobras', unit: 'mm', hasAverage: true },
  { key: 'faulkner', label: '% Gordura (Faulkner)', unit: '%', hasAverage: true },
  { key: 'pollock', label: '% Gordura (Pollock)', unit: '%', hasAverage: true },
  { key: 'mediaFP', label: '% Média Pollock/Faulkner', unit: '%', hasAverage: true },
  { key: 'dpvc', label: 'DPVC', hasAverage: true },
  { key: 'alturaPrevista', label: 'Altura Prevista', unit: 'cm', hasAverage: true },
  { key: 'difCoxa', label: 'Dif. Coxa D/E', unit: 'cm', hasAverage: false },
  { key: 'difPantu', label: 'Dif. Panturrilha D/E', unit: 'cm', hasAverage: false },
  { key: 'difBraco', label: 'Dif. Braço D/E', unit: 'cm', hasAverage: false }
];

export function createDefaultSimplifiedReportSelections(): SimplifiedReportSelections {
  return {
    categoria: true,
    idade: true,
    altura: true,
    peso: true,
    sumDobras: true,
    faulkner: true,
    pollock: true,
    mediaFP: true,
    dpvc: true,
    alturaPrevista: true,
    difCoxa: true,
    difPantu: true,
    difBraco: true
  };
}
