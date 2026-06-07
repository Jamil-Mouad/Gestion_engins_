import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'currencyMad',
  standalone: true,
})
export class CurrencyMadPipe implements PipeTransform {
  private formatter = new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  transform(value: number | null | undefined): string {
    if (value == null) return '';
    return this.formatter.format(value);
  }
}