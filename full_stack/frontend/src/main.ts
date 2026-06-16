import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, PreloadAllModules, withPreloading } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { LOCALE_ID, ErrorHandler } from '@angular/core';
import { provideToastr } from 'ngx-toastr';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import {
  LUCIDE_ICONS, LucideIconProvider,
  ChevronDown, ChevronRight, Circle, CircleAlert, CircleCheck,
  CloudUpload, Download, Edit, Filter, GripVertical, Image, LayoutGrid,
  Link, Maximize2, Pencil, Plus, RefreshCw, Ruler, Search, Settings, Settings2, Table2, Trash2, TriangleAlert, Truck, Upload, X,
} from 'lucide-angular';

import { AppComponent } from './app/app.component';
import { appRoutes } from './app/app.routes';
import { authInterceptor } from './app/core/auth/auth.interceptor';
import { errorInterceptor } from './app/core/http/error.interceptor';
import { ChatbotService } from './app/core/chatbot/chatbot.service';
import { MockChatbotService } from './app/core/chatbot/mock-chatbot.service';
import { SseRealChatbotService } from './app/core/chatbot/sse-real-chatbot.service';
import { AppErrorHandler } from './app/core/http/app-error-handler';
import { ENVIRONMENT } from './environments/environment.token';
import { environment } from './environments/environment';

registerLocaleData(localeFr);

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(appRoutes, withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    provideAnimations(),
    { provide: LOCALE_ID, useValue: 'fr-FR' },
    provideToastr({ timeOut: 4000, positionClass: 'toast-top-right', preventDuplicates: true }),
    { provide: ChatbotService, useClass: SseRealChatbotService },
    { provide: ErrorHandler, useClass: AppErrorHandler },
    { provide: ENVIRONMENT, useValue: environment },
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({
        ChevronDown, ChevronRight, Circle, CircleAlert, CircleCheck,
        CloudUpload, Download, Edit, Filter, GripVertical, Image, LayoutGrid,
        Link, Maximize2, Pencil, Plus, RefreshCw, Ruler, Search, Settings, Settings2, Table2, Trash2, TriangleAlert, Truck, Upload, X,
      }),
    },
  ]
}).catch(err => console.error(err));
