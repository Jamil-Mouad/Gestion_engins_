import { DashboardConfig } from './dashboard.model';

export type UserRole = 'USER' | 'ADMIN' | 'FLEET_MANAGER' | 'LOGISTIQUE' | 'MAGASIN';

export interface User {
  id: number;
  email: string;
  prenom: string;
  nom: string;
  role: UserRole;
  dashboardConfig: DashboardConfig | null;
  actif: boolean;
  telephone?: string | null;
}

export interface LoginForm {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterForm {
  email: string;
  prenom: string;
  nom: string;
  password: string;
  confirmPassword: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: 'Bearer';
}