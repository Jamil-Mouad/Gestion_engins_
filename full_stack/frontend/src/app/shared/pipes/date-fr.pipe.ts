import { Pipe, PipeTransform } from '@angular/core';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

@Pipe({
  name: 'dateFr',
  standalone: true,
})
export class DateFrPipe implements PipeTransform {
  transform(value: string | Date | null | undefined, formatType: 'short' | 'long' | 'datetime' = 'short'): string {
    if (!value) return '';
    try {
      const date = typeof value === 'string' ? parseISO(value) : value;
      switch (formatType) {
        case 'long':
          return format(date, 'd MMMM yyyy', { locale: fr });
        case 'datetime':
          return format(date, 'dd/MM/yyyy HH:mm', { locale: fr });
        case 'short':
        default:
          return format(date, 'dd/MM/yyyy', { locale: fr });
      }
    } catch {
      return value instanceof Date ? value.toLocaleDateString('fr-FR') : String(value);
    }
  }
}