export type ImportType = 'excel_general' | 'releves_compteurs' | 'migration';

export interface ImportsHistorique {
  id: number;
  user: Pick<import('./user.model').User, 'id' | 'prenom' | 'nom'> | null;
  fichier: string | null;
  type: ImportType;
  lignesTotal: number | null;
  lignesOk: number | null;
  lignesErreur: number | null;
  rapportUrl: string | null;
  createdAt: string;
}

export interface ImportPreview {
  type: ImportType;
  fileName: string;
  lignesTotal: number;
  sampleRows: Record<string, unknown>[];
  errors: { row: number; message: string }[];
}