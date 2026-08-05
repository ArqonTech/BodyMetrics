export interface ReportSelections {
  composition: { items: Record<string, boolean> };
  symmetry: { items: Record<string, boolean> };
  relations: { items: Record<string, boolean> };
  skinfolds: { items: Record<string, boolean> };
  circumferences: { items: Record<string, boolean> };
}

export function createDefaultReportSelections(): ReportSelections {
  return {
    composition: {
      items: {
        peso: true, altura: true, percentualGordura: true, sumDobras: true,
        gordura: true, mlg: true, ossos: true, massaMuscular: true,
        relacaoMusculoOsso: true, relacaoMusculoGordura: true, dpvc: true, alturaPrevista: true
      }
    },
    symmetry: {
      items: { Coxa: true, Panturrilha: true, Braço: true }
    },
    relations: {
      items: { 'Coxa / Fêmur': true, 'Panturrilha / Tornozelo': true, 'Braço / Úmero': true }
    },
    skinfolds: {
      items: {
        tricepsRight: true, tricepsLeft: true, subscapular: true, chest: true,
        midaxillary: true, suprailiac: true, abdominal: true, thighRight: true,
        thighLeft: true, calfRight: true, calfLeft: true
      }
    },
    circumferences: {
      items: {
        shoulder: true, chest: true, armRight: true, armLeft: true, waist: true,
        abdomen: true, hip: true, thighMidRight: true, thighMidLeft: true, calfRight: true,
        calfLeft: true, wristRight: true, kneeRight: true, ankle: true, envergadura: true
      }
    }
  };
}
