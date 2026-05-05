export interface User {
  id: number;
  email: string;
  prenom: string;
  nom: string;
  fonction?: string;
  matricule_emp?: string;
  site?: string;
  telephone?: string;
  dashboard_config?: Record<string, unknown>;
  preferences_notifications?: Record<string, unknown>;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface RefreshResponse {
  access_token: string;
}
