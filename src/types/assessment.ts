export interface Assessment {
  id: string;
  athleteId: string;
  date: string;
  weight: number;
  height: number;
  sittingHeight?: number;
  skinfolds: {
    tricepsRight: number;
    tricepsLeft: number;
    subscapular: number;
    chest: number;
    midaxillary: number;
    abdominal: number;
    thighRight: number;
    thighLeft: number;
    calfRight: number;
    calfLeft: number;
    iliacCrest?: number;
    supraspinale?: number;
  };
  circumferences: {
    shoulder: number;
    chest: number;
    armRight: number;
    armLeft: number;
    waist: number;
    abdomen: number;
    hip: number;
    thighMidRight: number;
    thighMidLeft: number;
    calfRight: number;
    calfLeft: number;
    wristRight: number;
    kneeRight: number;
    ankle: number;
    envergadura: number;
  };
}
