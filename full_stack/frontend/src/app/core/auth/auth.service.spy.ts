import { signal, computed } from '@angular/core';
import { of, Subject } from 'rxjs';

import { AuthService } from './auth.service';
import { User } from '../../shared/models/user.model';

export function createAuthServiceSpy(overrides: Partial<Record<keyof AuthService, jasmine.Spy>> = {}) {
  const _user = signal<User | null>(null);
  const isAuthenticated = computed(() => _user() !== null);

  return jasmine.createSpyObj('AuthService', ['login', 'logout', 'refresh', 'clearTokens', 'getMe', 'hasExpiredToken'], {
    _user,
    user: _user.asReadonly(),
    isAuthenticated,
    isBootstrapping: signal(true),
    ...overrides,
  });
}