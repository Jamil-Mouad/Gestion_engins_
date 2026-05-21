export type ComposantCategorie =
  | 'moteur' | 'pneumatique' | 'freinage' | 'hydraulique'
  | 'electrique' | 'transmission' | 'autre';

export interface ComposantNode {
  id: number;
  designation: string;
  niveau: 1 | 2 | 3;
  categorie: ComposantCategorie | null;
  reference?: string | null;
  unite?: string | null;
  stock?: number | null;
  children: ComposantNode[];
}

export interface Composant {
  id: number;
  parentId: number | null;
  niveau: 1 | 2 | 3;
  reference: string | null;
  designation: string;
  categorie: ComposantCategorie | null;
  unite: string | null;
  marque: string | null;
  prixUnitaire: number | null;
  stock: number;
  actif: boolean;
  creePar: { id: number; prenom: string; nom: string } | null;
}