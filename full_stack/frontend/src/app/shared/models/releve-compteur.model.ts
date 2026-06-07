import { Vehicule } from './vehicule.model';
import { User } from './user.model';

export type ReleveSource = 'manual' | 'excel_import' | 'intervention';

export interface ReleveCompteur {
  id: number;
  vehicule: Pick<Vehicule, 'id' | 'code'>;
  dateReleve: string;
  compteurKm: number | null;
  compteurHeures: number | null;
  source: ReleveSource;
  importHistoriqueId: number | null;
  createdBy: Pick<User, 'id' | 'prenom' | 'nom'> | null;
}
