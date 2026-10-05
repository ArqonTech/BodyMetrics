export const Phase = {
  Competitive: 0,
  PreSeason: 1,
  WeightLoss: 2,
  WeightGain: 3,
  Maintenance: 4
} as const;
export type Phase = (typeof Phase)[keyof typeof Phase];

export const Sex = {
  Male: 'Male',
  Female: 'Female',
  Other: 'Other'
} as const;
export type Sex = (typeof Sex)[keyof typeof Sex];

export const Ethnicity = {
  Caucasian: 'White',
  African: 'Black',
  Asian: 'Asian'
} as const;
export type Ethnicity = (typeof Ethnicity)[keyof typeof Ethnicity];

export interface CreateSportCommand {
  name: string;
  sectors: string[];
  categories: string[];
}

export interface UpdateSportCommand {
  id: string;
  name: string;
  sectors: string[];
  categories: string[];
}

export interface SportResponse {
  id: string;
  name: string;
  sectors: string[];
  categories: string[];
}

export interface PagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface GeneralMeasurements {
  weightKg: number;
  heightCm: number;
  sittingHeightCm: number;
}

export interface Skinfolds {
  rightTricepsMm: number;
  leftTricepsMm: number;
  subscapularMm: number;
  thoraxMm: number;
  subaxillaryMm: number;
  suprailiacMm: number;
  abdominalMm: number;
  rightThighMm: number;
  leftThighMm: number;
  rightCalfMm: number;
  leftCalfMm: number;
  iliacCrestMm?: number;
  supraspinaleMm?: number;
}

export interface Circumferences {
  shoulderCm: number;
  chestCm: number;
  rightArmCm: number;
  leftArmCm: number;
  waistCm: number;
  abdominalCm: number;
  hipCm: number;
  rightMidThighCm: number;
  leftMidThighCm: number;
  rightCalfCm: number;
  leftCalfCm: number;
  rightWristCm: number;
  rightKneeCm: number;
  rightAnkleCm: number;
  envergaduraCm: number;
}

export interface PhysicalAssessment {
  assessmentDate: string; // ISO date
  generalMeasurements: GeneralMeasurements;
  skinfolds: Skinfolds | null;
  circumferences: Circumferences | null;
}

export interface ProfilePhotoUpload {
  fileName: string;
  contentType: string;
  base64Content: string;
}

export interface ProfilePhoto {
  blobPath: string;
  fileName: string;
  contentType: string;
  uploadedAtUtc: string;
  accessUrl: string | null;
}

export interface CreateAthleteCommand {
  fullName: string;
  sportId: string;
  sector: string;
  phase: Phase;
  category: string;
  sex: Sex;
  ethnicity: Ethnicity;
  birthDate: string; // ISO date
  physicalAssessments: PhysicalAssessment[];
  profilePhoto: ProfilePhotoUpload | null;
}

export interface UpdateAthleteCommand extends CreateAthleteCommand {
  id: string;
}

export interface AthleteViewModel {
  id: string;
  fullName: string;
  sportId: string;
  sportName: string;
  sector: string;
  phase: Phase;
  category: string;
  sex: Sex;
  ethnicity: Ethnicity;
  birthDate: string;
  profilePhoto: ProfilePhoto | null;
  physicalAssessments: PhysicalAssessment[];
}
export interface AthleteSpreadsheetImportViewModel {
  sportId: string;
  sportName: string;
  processedRows: number;
  createdAthletes: number;
  updatedAthletes: number;
  importedAssessments: number;
  replacedAssessments: number;
  addedSportSectors: number;
  addedSportCategories: number;
  sportCreated: boolean;
  createdGroups: number;
}

export interface AthleteGroupMemberViewModel {
  id: string;
  fullName: string;
  sportName?: string;
  category?: string;
  sector?: string;
}

export interface AthleteGroupViewModel {
  id: string;
  name: string;
  members: AthleteGroupMemberViewModel[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateAthleteGroupCommand {
  name: string;
}

export interface UpdateAthleteGroupCommand {
  id: string;
  name: string;
}
