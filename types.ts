export interface ProcessingStats {
  totalRows: number;
  processedCells: number;
  outOfSpecCount: number;
  inSpecCount: number;
}

export enum AppState {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export interface ProcessedResult {
  fileName: string;
  data: ArrayBuffer;
  stats: ProcessingStats;
}