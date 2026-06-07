import { InjectionToken } from '@angular/core';
import { environment } from './environment';

export const ENVIRONMENT = new InjectionToken<typeof environment>('ENVIRONMENT');