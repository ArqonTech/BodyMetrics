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

    const divisor = dpvc < -1 ? 0.91 : dpvc < 0 ? 0.94 : dpvc < 1 ? 0.975 : dpvc < 2 ? 0.99 : 1;
    alturaPrevista = Math.round((altura / divisor) * 10) / 10;
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
