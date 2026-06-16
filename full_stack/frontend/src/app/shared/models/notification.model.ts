export type NotificationSeverite = 'critical' | 'warning' | 'info' | 'success';
export type NotificationCategorie =
  | 'seuil_pneu' | 'seuil_nbh' | 'seuil_expiration'
  | 'deplacement' | 'maintenance' | 'systeme' | 'info';

export interface Notification {
  id: number;
  user: Pick<import('./user.model').User, 'id'>;
  vehicule: Pick<import('./vehicule.model').Vehicule, 'id' | 'code'> | null;
  severite: NotificationSeverite;
  categorie: NotificationCategorie;
  titre: string;
  detail: string | null;
  targetScreen: string | null;
  targetId: number | null;
  lu: boolean;
  dateLecture: string | null;
  emailEnvoye: boolean;
  createdAt: string;
}