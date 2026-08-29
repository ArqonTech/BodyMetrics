import type { Assessment } from '../types/assessment';
import type { Athlete } from '../types/athlete';

export interface AthleteMetrics {
  peso: number;
  altura: number;
  gordura: number;
  sumDobras: number;
  ossos: number;
  mlg: number;
  percentualGordura: number;
  massaMuscular: number;
  relacaoMusculoOsso: number;
  relacaoMusculoGordura: number;
  dpvc: number;
  hasDpvc: boolean;
  statusPvc: string;
  alturaPrevista: number;
  simetria: {
    coxa: { d: number; e: number; diff: number };
    pantu: { d: number; e: number; diff: number };
    braco: { d: number; e: number; diff: number };
  };
  relacao: {
    coxa: number;
    pantu: number;
    braco: number;
    ccCoxa: number;
    ccPantu: number;
    ccBraco: number;
    diamJoelho: number;
    diamTornozelo: number;
    diamPunho: number;
  };
}

// Tabela Sherar (cm restantes até altura adulta) por DPVC (-4.0 a 4.0, passo 0.2) e status maturacional
// Colunas: [H PRECOCE, H MÉDIO, H TARDIO, M PRECOCE, M MÉDIO, M TARDIO]
const SHERAR_TABLE: number[][] = [
  [45.29, 40.09, 34.73, 42.61, 38.81, 34.35],
  [44.21, 39.08, 33.83, 41.49, 37.67, 33.27],
  [43.11, 38.07, 32.94, 40.39, 36.55, 32.20],
  [41.99, 37.06, 32.05, 39.30, 35.44, 31.14],
  [40.85, 36.05, 31.16, 38.21, 34.34, 30.09],
  [39.69, 35.04, 30.27, 37.13, 33.25, 29.04],
  [38.52, 34.04, 29.38, 36.04, 32.16, 27.99],
  [37.33, 33.05, 28.49, 34.94, 31.04, 26.93],
  [36.15, 32.06, 27.60, 33.82, 29.91, 25.87],
  [34.97, 31.07, 26.70, 32.68, 28.76, 24.79],
  [33.80, 30.06, 25.77, 31.53, 27.58, 23.71],
  [32.62, 29.03, 24.79, 30.44, 26.39, 22.63],
  [31.44, 27.95, 23.74, 29.36, 25.21, 21.55],
  [30.23, 26.83, 22.63, 28.24, 24.03, 20.47],
  [28.98, 25.63, 21.45, 27.09, 22.85, 19.37],
  [27.66, 24.36, 20.22, 25.87, 21.66, 18.25],
  [26.24, 22.99, 18.96, 24.54, 20.44, 17.07],
  [24.68, 21.51, 17.68, 23.09, 19.16, 15.81],
  [22.96, 19.88, 16.31, 21.50, 17.80, 14.44],
  [21.07, 18.09, 14.76, 19.77, 16.33, 12.94],
  [19.04, 16.16, 13.05, 17.94, 14.75, 11.36],
  [16.96, 14.21, 11.32, 16.09, 13.13, 9.81],
  [14.92, 12.35, 9.71, 14.30, 11.56, 8.42],
  [13.01, 10.65, 8.27, 12.64, 10.11, 7.20],
  [11.26, 9.12, 6.94, 11.11, 8.77, 6.12],
  [9.70, 7.78, 5.70, 9.69, 7.52, 5.13],
  [8.33, 6.59, 4.54, 8.39, 6.37, 4.24],
  [7.11, 5.54, 3.51, 7.20, 5.33, 3.46],
  [6.04, 4.62, 2.64, 6.14, 4.42, 2.80],
  [5.10, 3.80, 1.92, 5.19, 3.64, 2.25],
  [4.26, 3.09, 1.35, 4.36, 2.99, 1.82],
  [3.52, 2.48, 0.91, 3.63, 2.45, 1.46],
  [2.86, 1.96, 0.58, 2.99, 1.99, 1.18],
  [2.29, 1.52, 0.32, 2.42, 1.60, 0.94],
  [1.78, 1.16, 0.13, 1.92, 1.26, 0.74],
  [1.34, 0.87, 0.00, 1.47, 0.96, 0.57],
  [0.96, 0.63, 0.00, 1.07, 0.69, 0.41],
  [0.64, 0.43, 0.00, 0.72, 0.46, 0.28],
  [0.37, 0.27, 0.00, 0.43, 0.26, 0.17],
  [0.16, 0.12, 0.00, 0.19, 0.11, 0.08],
  [0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
];

export function calculateAge(birthDateStr: string | undefined, referenceDateStr: string | undefined): number {
  if (!birthDateStr || !referenceDateStr) return 0;
  const birthDate = new Date(birthDateStr);
  const refDate = new Date(referenceDateStr);
  let age = refDate.getFullYear() - birthDate.getFullYear();
  const m = refDate.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && refDate.getDate() < birthDate.getDate())) age--;
  return age;
}

export function calculateMetrics(
  evalData: Assessment | undefined,
  mappedAthlete: Athlete | null,
  formula: 'pollock' | 'faulkner'
): AthleteMetrics | null {
  if (!evalData) return null;

  let idade = 0;
  if (mappedAthlete && mappedAthlete.birthDate && evalData.date) {
    const evalDate = new Date(evalData.date);
    const birthDate = new Date(mappedAthlete.birthDate);
    const diffTime = evalDate.getTime() - birthDate.getTime();
    idade = diffTime / (1000 * 60 * 60 * 24 * 365.25);
  }

  const peso = evalData.weight;
  const altura = evalData.height;

  // Somatório das dobras
  const sf: Partial<Assessment['skinfolds']> = evalData.skinfolds || {};
  const sumDobras = (sf.tricepsRight || 0) +
    (sf.tricepsLeft || 0) +
    (sf.subscapular || 0) +
    (sf.chest || 0) +
    (sf.midaxillary || 0) +
    (sf.suprailiac || 0) +
    (sf.abdominal || 0) +
    (sf.thighRight || 0);

  // Formula de Pollock
  let pollock = 0;
  if (sumDobras > 0 && idade > 0) {
    const densidade = 1.112 - (0.00043499 * sumDobras) + (0.00000055 * Math.pow(sumDobras, 2)) - (0.00028826 * idade);
    pollock = (495 / densidade) - 450;
  }

  // Formula de Faulkner
  const faulknerSum = (sf.tricepsRight || 0) + (sf.subscapular || 0) + (sf.suprailiac || 0) + (sf.abdominal || 0);
  const faulkner = faulknerSum > 0 ? (faulknerSum * 0.153) + 5.783 : 0;

  const percentualGordura = formula === 'pollock' ? Math.max(0, pollock) : Math.max(0, faulkner);
  const gordura = (peso * percentualGordura) / 100;

  const circ: Partial<Assessment['circumferences']> = evalData.circumferences || {};
  const punhoM = (circ.wristRight || 0) / 100;
  const joelhoM = (circ.kneeRight || 0) / 100;
  const alturaM = altura / 100;

  let ossos = 0;
  if (punhoM > 0 && joelhoM > 0 && alturaM > 0) {
    ossos = 3.02 * Math.pow(400 * punhoM * joelhoM * Math.pow(alturaM, 2), 0.712);
  }

  const mlg = (gordura > 0 && ossos > 0) ? peso - gordura - ossos : peso - gordura;

  // Fatores
  const fatorSexo = mappedAthlete?.gender === 'Feminino' ? 0 : 1;
  const fatorRaca = mappedAthlete?.race === 'Branco' ? 0 : mappedAthlete?.race === 'Negro' ? 1.1 : -2;

  // Medidas Corrigidas
  const coxaD_C = (circ.thighMidRight || 0) > 0 ? (circ.thighMidRight || 0) - (((sf.thighRight || 0) / 10) * 3.16) : 0;
  const coxaE_C = (circ.thighMidLeft || 0) > 0 ? (circ.thighMidLeft || 0) - (((sf.thighLeft || 0) / 10) * 3.16) : 0;
  const pantuD_C = (circ.calfRight || 0) > 0 ? (circ.calfRight || 0) - (((sf.calfRight || 0) / 10) * 3.16) : 0;
  const pantuE_C = (circ.calfLeft || 0) > 0 ? (circ.calfLeft || 0) - (((sf.calfLeft || 0) / 10) * 3.16) : 0;
  const bracoD_C = (circ.armRight || 0) > 0 ? (circ.armRight || 0) - (((sf.tricepsRight || 0) / 10) * 3.16) : 0;
  const bracoE_C = (circ.armLeft || 0) > 0 ? (circ.armLeft || 0) - (((sf.tricepsLeft || 0) / 10) * 3.16) : 0;

  const ccBraco = (bracoD_C + bracoE_C) / 2;
  const ccCoxa = (coxaD_C + coxaE_C) / 2;
  const ccPantu = (pantuD_C + pantuE_C) / 2;

  const mmTermo1 = ccBraco > 0 ? 0.00744 * Math.pow(ccBraco, 2) : 0;
  const mmTermo2 = ccCoxa > 0 ? 0.00088 * Math.pow(ccCoxa, 2) : 0;
  const mmTermo3 = ccPantu > 0 ? 0.00441 * Math.pow(ccPantu, 2) : 0;
  const hasMuscleMassInput = mmTermo1 > 0 || mmTermo2 > 0 || mmTermo3 > 0;

  let massaMuscular = 0;
  if (alturaM > 0 && idade > 0 && hasMuscleMassInput) {
    massaMuscular = alturaM * (mmTermo1 + mmTermo2 + mmTermo3) + (2.4 * fatorSexo) - (0.048 * idade) + fatorRaca + 7.8;
  }

  // Relação Massa Muscular-Ossos (Massa Muscular / Ossos)
  const relacaoMusculoOsso = (massaMuscular > 0 && ossos > 0) ? massaMuscular / ossos : 0;

  // Relação Massa Muscular-Gordura (Massa Muscular / Gordura)
  const relacaoMusculoGordura = (massaMuscular > 0 && gordura > 0) ? massaMuscular / gordura : 0;

  // DPVC (Desvio do Pico de Velocidade de Crescimento)
  const altSentado = evalData.sittingHeight || 0;
  const hasDpvc = altSentado > 0 && altura > 0 && idade > 0 && peso > 0;
  let dpvc = 0;
  let alturaPrevista = 0;
  let statusPvc = '';
  if (hasDpvc) {
    const isMulher = mappedAthlete?.gender === 'Feminino';
    dpvc = isMulher
      ? -9.376
        + (0.0001882 * ((altura - altSentado) * altSentado))
        + (0.0022 * (idade * (altura - altSentado)))
        + (0.005841 * (idade * altSentado))
        - (0.002658 * (idade * peso))
        + (0.07693 * ((peso / altura) * 100))
      : -9.236
        + (0.0002708 * ((altura - altSentado) * altSentado))
        - (0.001663 * (idade * (altura - altSentado)))
        + (0.007216 * (idade * altSentado))
        + (0.02292 * ((peso / altura) * 100));

    const pvc = idade - dpvc;
    statusPvc = isMulher
      ? (pvc < 11 ? 'PRECOCE' : pvc <= 13 ? 'MÉDIO' : 'TARDIO')
      : (pvc < 13 ? 'PRECOCE' : pvc <= 15 ? 'MÉDIO' : 'TARDIO');

    if (dpvc < -4 || dpvc > 4) {
      alturaPrevista = altura;
    } else {
      const rowIndex = Math.min(40, Math.max(0, Math.round(dpvc * 5) + 20));
      const colIndex = (isMulher ? 3 : 0) + (statusPvc === 'PRECOCE' ? 0 : statusPvc === 'MÉDIO' ? 1 : 2);
      alturaPrevista = Math.round((altura + SHERAR_TABLE[rowIndex][colIndex]) * 10) / 10;
    }
  }

  return {
    peso,
    altura,
    gordura,
    sumDobras,
    ossos,
    mlg,
    percentualGordura,
    massaMuscular,
    relacaoMusculoOsso,
    relacaoMusculoGordura,
    dpvc,
    hasDpvc,
    statusPvc,
    alturaPrevista,
    simetria: {
      coxa: { d: coxaD_C, e: coxaE_C, diff: Math.abs(coxaD_C - coxaE_C) },
      pantu: { d: pantuD_C, e: pantuE_C, diff: Math.abs(pantuD_C - pantuE_C) },
      braco: { d: bracoD_C, e: bracoE_C, diff: Math.abs(bracoD_C - bracoE_C) }
    },
    relacao: {
      coxa: (circ.kneeRight || 0) > 0 ? ccCoxa / (circ.kneeRight || 0) : 0,
      pantu: ((circ as any).ankle || 0) > 0 ? ccPantu / ((circ as any).ankle || 0) : 0,
      braco: (circ.wristRight || 0) > 0 ? ccBraco / (circ.wristRight || 0) : 0,
      ccCoxa, ccPantu, ccBraco,
      diamJoelho: circ.kneeRight || 0,
      diamTornozelo: (circ as any).ankle || 0,
      diamPunho: circ.wristRight || 0
    }
  };
}
