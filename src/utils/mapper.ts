import * as ApiTypes from '../types/api';
import type { Athlete } from '../types/athlete';
import type { Assessment } from '../types/assessment';

export const mapOldToNewAthlete = (athlete: Partial<Athlete>): Partial<ApiTypes.CreateAthleteCommand> => {
  return {
    fullName: athlete.name,
    sportId: (athlete as any).sportId || '', // Precisamos garantir que temos o ID
    sector: (athlete as any).sportObservation || (athlete as any).position || (athlete as any).sector || '',
    phase: mapPhase(athlete.competitivePhase),
    category: athlete.category || '',
    sex: mapSex(athlete.gender),
    ethnicity: mapEthnicity(athlete.race),
    birthDate: athlete.birthDate || '',
    // physicalAssessments e profilePhoto serão tratados separadamente
  };
};

export const mapPhase = (phase?: string): ApiTypes.Phase => {
  switch (phase?.toLowerCase()) {
    case 'pré-temporada': return ApiTypes.Phase.PreSeason;
    case 'competição': return ApiTypes.Phase.Competitive;
    case 'perda de peso': return ApiTypes.Phase.WeightLoss;
    case 'ganho de peso': return ApiTypes.Phase.WeightGain;
    case 'manutenção': return ApiTypes.Phase.Maintenance;
    default: return ApiTypes.Phase.Competitive;
  }
};

export const mapSex = (sex?: string | number): ApiTypes.Sex => {
  if (typeof sex === 'number') {
    if (sex === 0) return ApiTypes.Sex.Male;
    if (sex === 1) return ApiTypes.Sex.Female;
    return ApiTypes.Sex.Other;
  }
  switch (sex?.toLowerCase()) {
    case 'male':
    case 'masculino': return ApiTypes.Sex.Male;
    case 'female':
    case 'feminino': return ApiTypes.Sex.Female;
    default: return ApiTypes.Sex.Other;
  }
};

export const mapEthnicity = (ethnicity?: string | number): ApiTypes.Ethnicity => {
  if (typeof ethnicity === 'number') {
    if (ethnicity === 1) return ApiTypes.Ethnicity.Caucasian;
    if (ethnicity === 2) return ApiTypes.Ethnicity.African;
    if (ethnicity === 3) return ApiTypes.Ethnicity.Asian;
    return ApiTypes.Ethnicity.Caucasian;
  }
  switch (ethnicity?.toLowerCase()) {
    case 'white':
    case 'branco': return ApiTypes.Ethnicity.Caucasian;
    case 'black':
    case 'negro': return ApiTypes.Ethnicity.African;
    case 'asian':
    case 'asiático': return ApiTypes.Ethnicity.Asian;
    default: return ApiTypes.Ethnicity.Caucasian;
  }
};

// Mapeamento reverso para o Dashboard (se necessário)
export const mapNewToOldAthlete = (athlete: ApiTypes.AthleteViewModel): Athlete => {
  return {
    id: athlete.id,
    name: athlete.fullName,
    photoUrl: athlete.profilePhoto?.accessUrl || undefined,
    sport: athlete.sportName,
    category: athlete.category,
    competitivePhase: mapPhaseToLabel(athlete.phase),
    birthDate: athlete.birthDate,
    gender: mapSexToLabel(athlete.sex),
    race: mapEthnicityToLabel(athlete.ethnicity),
    sportObservation: athlete.sector
  };
};

export const mapPhaseToLabel = (phase: ApiTypes.Phase): string => {
  switch (phase) {
    case ApiTypes.Phase.PreSeason: return 'Pré-temporada';
    case ApiTypes.Phase.Competitive: return 'Competição';
    case ApiTypes.Phase.WeightLoss: return 'Perda de Peso';
    case ApiTypes.Phase.WeightGain: return 'Ganho de Peso';
    case ApiTypes.Phase.Maintenance: return 'Manutenção';
    default: return 'Competição';
  }
};

export const mapSexToLabel = (sex: ApiTypes.Sex | number | string): string => {
  const s = String(sex).toLowerCase();
  if (s === '0' || s === 'male' || s === 'masculino') return 'Masculino';
  if (s === '1' || s === 'female' || s === 'feminino') return 'Feminino';
  return 'Outro';
};

export const mapEthnicityToLabel = (ethnicity: ApiTypes.Ethnicity | number | string): string => {
  const e = String(ethnicity).toLowerCase();
  if (e === '1' || e === 'white' || e === 'branco' || e === 'caucasian') return 'Branco';
  if (e === '2' || e === 'black' || e === 'negro' || e === 'african') return 'Negro';
  if (e === '3' || e === 'asian' || e === 'asiático') return 'Asiático';
  return 'Branco';
};

export const mapAssessmentToPhysicalAssessment = (assessment: Assessment): ApiTypes.PhysicalAssessment => {
  return {
    assessmentDate: assessment.date,
    generalMeasurements: {
      weightKg: assessment.weight,
      heightCm: assessment.height,
      sittingHeightCm: assessment.sittingHeight || 0
    },
    skinfolds: assessment.skinfolds ? {
      rightTricepsMm: assessment.skinfolds.tricepsRight,
      leftTricepsMm: assessment.skinfolds.tricepsLeft,
      subscapularMm: assessment.skinfolds.subscapular,
      thoraxMm: assessment.skinfolds.chest,
      subaxillaryMm: assessment.skinfolds.midaxillary,
      suprailiacMm: assessment.skinfolds.suprailiac,
      abdominalMm: assessment.skinfolds.abdominal,
      rightThighMm: assessment.skinfolds.thighRight,
      leftThighMm: assessment.skinfolds.thighLeft,
      rightCalfMm: assessment.skinfolds.calfRight,
      leftCalfMm: assessment.skinfolds.calfLeft,
      iliacCrestMm: assessment.skinfolds.iliacCrest ?? 0,
      supraspinaleMm: assessment.skinfolds.supraspinale ?? 0
    } : null,
    circumferences: assessment.circumferences ? {
      shoulderCm: assessment.circumferences.shoulder,
      chestCm: assessment.circumferences.chest,
      rightArmCm: assessment.circumferences.armRight,
      leftArmCm: assessment.circumferences.armLeft,
      waistCm: assessment.circumferences.waist,
      abdominalCm: assessment.circumferences.abdomen,
      hipCm: assessment.circumferences.hip,
      rightMidThighCm: assessment.circumferences.thighMidRight,
      leftMidThighCm: assessment.circumferences.thighMidLeft,
      rightCalfCm: assessment.circumferences.calfRight,
      leftCalfCm: assessment.circumferences.calfLeft,
      rightWristCm: assessment.circumferences.wristRight,
      rightKneeCm: assessment.circumferences.kneeRight,
      rightAnkleCm: assessment.circumferences.ankle,
      envergaduraCm: assessment.circumferences.envergadura
    } : null
  };
};

export const mapPhysicalAssessmentToAssessment = (pa: ApiTypes.PhysicalAssessment, athleteId: string): Assessment => {
  return {
    id: `pa-${pa.assessmentDate}`, // Fallback ID
    athleteId,
    date: pa.assessmentDate,
    weight: pa.generalMeasurements.weightKg,
    height: pa.generalMeasurements.heightCm,
    sittingHeight: pa.generalMeasurements.sittingHeightCm,
    skinfolds: pa.skinfolds ? {
      tricepsRight: pa.skinfolds.rightTricepsMm,
      tricepsLeft: pa.skinfolds.leftTricepsMm,
      subscapular: pa.skinfolds.subscapularMm,
      chest: pa.skinfolds.thoraxMm,
      midaxillary: pa.skinfolds.subaxillaryMm,
      suprailiac: pa.skinfolds.suprailiacMm,
      abdominal: pa.skinfolds.abdominalMm,
      thighRight: pa.skinfolds.rightThighMm,
      thighLeft: pa.skinfolds.leftThighMm,
      calfRight: pa.skinfolds.rightCalfMm,
      calfLeft: pa.skinfolds.leftCalfMm,
      iliacCrest: pa.skinfolds.iliacCrestMm ?? 0,
      supraspinale: pa.skinfolds.supraspinaleMm ?? 0
    } : {
      tricepsRight: 0, tricepsLeft: 0, subscapular: 0, chest: 0, midaxillary: 0, suprailiac: 0, abdominal: 0, thighRight: 0, thighLeft: 0, calfRight: 0, calfLeft: 0, iliacCrest: 0, supraspinale: 0
    },
    circumferences: pa.circumferences ? {
      shoulder: pa.circumferences.shoulderCm,
      chest: pa.circumferences.chestCm,
      armRight: pa.circumferences.rightArmCm,
      armLeft: pa.circumferences.leftArmCm,
      waist: pa.circumferences.waistCm,
      abdomen: pa.circumferences.abdominalCm,
      hip: pa.circumferences.hipCm,
      thighMidRight: pa.circumferences.rightMidThighCm,
      thighMidLeft: pa.circumferences.leftMidThighCm,
      calfRight: pa.circumferences.rightCalfCm,
      calfLeft: pa.circumferences.leftCalfCm,
      wristRight: pa.circumferences.rightWristCm,
      kneeRight: pa.circumferences.rightKneeCm,
      ankle: pa.circumferences.rightAnkleCm,
      envergadura: pa.circumferences.envergaduraCm
    } : {
      shoulder: 0, chest: 0, armRight: 0, armLeft: 0, waist: 0, abdomen: 0, hip: 0, thighMidRight: 0, thighMidLeft: 0, calfRight: 0, calfLeft: 0, wristRight: 0, kneeRight: 0, ankle: 0, envergadura: 0
    }
  };
};
export const mapAthleteToUpdateCommand = (athlete: ApiTypes.AthleteViewModel): ApiTypes.UpdateAthleteCommand => {
  return {
    id: athlete.id,
    fullName: athlete.fullName,
    sportId: athlete.sportId,
    sector: athlete.sector,
    phase: athlete.phase,
    category: athlete.category,
    sex: athlete.sex,
    ethnicity: athlete.ethnicity,
    birthDate: athlete.birthDate,
    physicalAssessments: athlete.physicalAssessments,
    profilePhoto: null // Envia null para não alterar a foto se não houver um novo upload
  };
};
