import { Injectable, ErrorHandler, inject, InjectionToken } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { ENVIRONMENT } from '../../../environments/environment.token';

@Injectable()
export class AppErrorHandler implements ErrorHandler {
  private readonly auth = inject(AuthService);
  private readonly env = inject(ENVIRONMENT);

  handleError(error: unknown): void {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[AppErrorHandler]', err);

    if (this.env.production) {
      const payload = {
        timestamp: new Date().toISOString(),
        url: location.href,
        user_id: this.auth.user()?.id ?? null,
        user_agent: navigator.userAgent,
        message: err.message,
        stack: err.stack ?? '',
      };
      fetch('/api/v1/client-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }
  }
}