import { Pipe, PipeTransform } from '@angular/core';
import { VehiculeStatut } from '../models/vehicule.model';
import { InterventionStatut } from '../models/intervention.model';
import { VidangeStatut } from '../models/vidange.model';
import { PneuStatus } from '../models/pneu.model';
import { DemandeStatut } from '../models/demande-achat.model';

@Pipe({
  name: 'statusLabel',
  standalone: true,
})
export class StatusLabelPipe implements PipeTransform {
  private readonly labels: Record<string, string> = {
    // VehiculeType
    'camion':          'Camion',
    'camion_tracteur': 'Camion (Tracteur)',
    'voiture':         'Voiture',
    'semi_remorque':   'Semi-remorque',
    'chariot':         'Chariot',
    'chargeur':        'Chargeur',
    'bus':             'Bus',
    'balayeuse':       'Balayeuse',
    'pick_up':         'Pick-up',
    // VehiculeStatut
    'in-service': 'En service',
    'workshop': 'En atelier',
    'maintenance': 'En maintenance',
    'out-of-service': 'Hors service',
    // InterventionStatut + VidangeStatut share 'en_cours'
    'ouvert': 'Ouvert',
    'en_cours': 'En cours',
    'cloture': 'Clôturé',
    // VidangeStatut
    'a_faire': 'À faire',
    'fait': 'Fait',
    'depasse': 'Dépassé',
    // PneuStatus
    'ok': 'OK',
    'warn': 'Attention',
    'empty': 'Épuisé',
  };

  transform(value: string | null | undefined): string {
    if (!value) return '';
    return this.labels[value] ?? value;
  }
}