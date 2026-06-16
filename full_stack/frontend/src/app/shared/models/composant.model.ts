export type ComposantCategorie =
  | 'moteur' | 'pneumatique' | 'freinage' | 'hydraulique'
  | 'electrique' | 'transmission' | 'autre'
  | 'chassis' | 'carrosserie' | 'suspension';

export interface ComposantNode {
  id: number;
  designation: string;
  niveau: number;
  categorie: ComposantCategorie | null;
  reference?: string | null;
  unite?: string | null;
  stock?: number | null;
  imageUrl?: string | null;
  vehiculeType?: string | null;
  vehiculeId?: number | null;
  vehiculeCode?: string | null;
  children: ComposantNode[];
}

export interface Composant {
  id: number;
  parentId: number | null;
  niveau: number;
  vehiculeId?: number | null;
  vehiculeCode?: string | null;
  reference: string | null;
  designation: string;
  categorie: ComposantCategorie | null;
  unite: string | null;
  marque: string | null;
  prixUnitaire: number | null;
  stock: number;
  actif: boolean;
  imageUrl: string | null;
  vehiculeType?: string | null;
  creePar: { id: number; prenom: string; nom: string } | null;
}