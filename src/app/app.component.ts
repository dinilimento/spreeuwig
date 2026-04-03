import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { DEFAULT_CONFIG, FlockCanvasComponent } from './starling-flock/flock-canvas.component';

type Lang = 'en' | 'nl' | 'es' | 'fr' | 'it' | 'de';

const I18N: Record<Lang, Record<string, string>> = {
  en: {
    title: 'Murmurize',
    subtitle: 'Real-time flocking simulation in Angular',
    language: 'Language',
    basicsTitle: 'Flocking basics',
    basicsBody:
      'Each bird responds to its neighbors with three rules: alignment, cohesion, and separation. Together they create the emergent murmuration you see in the sky.',
    basicsHint: 'Use the controls on the right to sculpt the flock in real time.',
    controlsTitle: 'Flock controls',
    size: 'Size',
    speed: 'Speed',
    cohesion: 'Cohesion',
    separation: 'Separation',
    edgeJitter: 'Edge jitter',
    centerPullPush: 'Center pull/push',
    borderPadding: 'Border padding',
    ripStrength: 'Rip strength',
    ripFrequency: 'Rip frequency',
    reset: 'Reset',
    hide: 'Hide',
    show: 'Show',
  },
  nl: {
    title: 'Murmurize',
    subtitle: 'Realtime zwermsimulatie in Angular',
    language: 'Taal',
    basicsTitle: 'Basis van zwermen',
    basicsBody:
      'Elke vogel reageert op buren met drie regels: uitlijning, samenhang en scheiding. Samen vormen die de murmuration die je in de lucht ziet.',
    basicsHint: 'Gebruik de bediening rechts om de zwerm live te vormen.',
    controlsTitle: 'Zwermbediening',
    size: 'Grootte',
    speed: 'Snelheid',
    cohesion: 'Samenhang',
    separation: 'Scheiding',
    edgeJitter: 'Randruis',
    centerPullPush: 'Midden aantrekken/afstoten',
    borderPadding: 'Randmarge',
    ripStrength: 'Scheursterkte',
    ripFrequency: 'Scheurfrequentie',
    reset: 'Reset',
    hide: 'Verberg',
    show: 'Toon',
  },
  es: {
    title: 'Murmurize',
    subtitle: 'Simulación de bandada en tiempo real con Angular',
    language: 'Idioma',
    basicsTitle: 'Conceptos de bandada',
    basicsBody:
      'Cada ave responde a sus vecinas con tres reglas: alineación, cohesión y separación. Juntas generan la murmuration emergente que ves en el cielo.',
    basicsHint: 'Usa los controles de la derecha para moldear la bandada en tiempo real.',
    controlsTitle: 'Controles de bandada',
    size: 'Tamaño',
    speed: 'Velocidad',
    cohesion: 'Cohesión',
    separation: 'Separación',
    edgeJitter: 'Variación de borde',
    centerPullPush: 'Centro atraer/expulsar',
    borderPadding: 'Margen de borde',
    ripStrength: 'Fuerza de ruptura',
    ripFrequency: 'Frecuencia de ruptura',
    reset: 'Reiniciar',
    hide: 'Ocultar',
    show: 'Mostrar',
  },
  fr: {
    title: 'Murmurize',
    subtitle: 'Simulation de nuée en temps réel avec Angular',
    language: 'Langue',
    basicsTitle: 'Bases de la nuée',
    basicsBody:
      "Chaque oiseau réagit à ses voisins selon trois règles : alignement, cohésion et séparation. Ensemble, elles créent la murmuration émergente visible dans le ciel.",
    basicsHint: 'Utilisez les contrôles à droite pour modeler la nuée en direct.',
    controlsTitle: 'Contrôles de nuée',
    size: 'Taille',
    speed: 'Vitesse',
    cohesion: 'Cohésion',
    separation: 'Séparation',
    edgeJitter: 'Variation de bord',
    centerPullPush: 'Centre attirer/repousser',
    borderPadding: 'Marge de bord',
    ripStrength: 'Force de rupture',
    ripFrequency: 'Fréquence de rupture',
    reset: 'Réinitialiser',
    hide: 'Masquer',
    show: 'Afficher',
  },
  it: {
    title: 'Murmurize',
    subtitle: 'Simulazione di stormo in tempo reale con Angular',
    language: 'Lingua',
    basicsTitle: 'Fondamenti dello stormo',
    basicsBody:
      'Ogni uccello reagisce ai vicini con tre regole: allineamento, coesione e separazione. Insieme creano la murmuration emergente che vedi nel cielo.',
    basicsHint: 'Usa i controlli a destra per plasmare lo stormo in tempo reale.',
    controlsTitle: 'Controlli stormo',
    size: 'Dimensione',
    speed: 'Velocità',
    cohesion: 'Coesione',
    separation: 'Separazione',
    edgeJitter: 'Variazione bordi',
    centerPullPush: 'Centro attrai/spingi',
    borderPadding: 'Margine bordo',
    ripStrength: 'Intensità rottura',
    ripFrequency: 'Frequenza rottura',
    reset: 'Ripristina',
    hide: 'Nascondi',
    show: 'Mostra',
  },
  de: {
    title: 'Murmurize',
    subtitle: 'Echtzeit-Schwarm-Simulation mit Angular',
    language: 'Sprache',
    basicsTitle: 'Schwarm-Grundlagen',
    basicsBody:
      'Jeder Vogel reagiert auf Nachbarn mit drei Regeln: Ausrichtung, Kohäsion und Trennung. Zusammen erzeugen sie die entstehende Murmuration am Himmel.',
    basicsHint: 'Nutze die Regler rechts, um den Schwarm live zu formen.',
    controlsTitle: 'Schwarmsteuerung',
    size: 'Größe',
    speed: 'Geschwindigkeit',
    cohesion: 'Kohäsion',
    separation: 'Trennung',
    edgeJitter: 'Randjitter',
    centerPullPush: 'Mitte anziehen/abstoßen',
    borderPadding: 'Randabstand',
    ripStrength: 'Rissstärke',
    ripFrequency: 'Rissfrequenz',
    reset: 'Zurücksetzen',
    hide: 'Ausblenden',
    show: 'Anzeigen',
  },
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FlockCanvasComponent, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  config = structuredClone(DEFAULT_CONFIG);
  showBasics = true;
  showControls = true;
  language: Lang = 'en';

  private updateConfig(patch: Partial<typeof DEFAULT_CONFIG>): void {
    this.config = { ...this.config, ...patch };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  updateFlockSize(value: number | string): void {
    const nextCount = this.clamp(Math.round(Number(value) / 10) * 10, 1500, 4500);
    this.updateConfig({ count: nextCount });
  }

  updateMaxSpeed(value: number | string): void {
    const nextValue = this.clamp(Number(value), 0.6, 3.0);
    this.updateConfig({ maxSpeed: nextValue });
  }

  updateCohesion(value: number | string): void {
    const nextValue = this.clamp(Number(value), 0, 3.0);
    this.updateConfig({ cohesionWeight: nextValue });
  }

  updateSeparation(value: number | string): void {
    const nextValue = this.clamp(Number(value), 0, 6.0);
    this.updateConfig({ separationWeight: nextValue });
  }

  updateEdgeJitter(value: number | string): void {
    const nextValue = this.clamp(Number(value), 0, 4);
    this.updateConfig({ edgeJitterStrength: nextValue });
  }

  updateCenterPull(value: number | string): void {
    const nextValue = this.clamp(Number(value), -0.45, 0.55);
    this.updateConfig({ centerPullStrength: nextValue });
  }

  updateBorderPadding(value: number | string): void {
    const nextValue = this.clamp(Number(value), 0, 140);
    this.updateConfig({ borderPadding: nextValue });
  }

  updateRipStrength(value: number | string): void {
    const nextValue = this.clamp(Number(value), 0, 2);
    this.updateConfig({ disturbanceStrength: nextValue });
  }

  updateRipFrequency(value: number | string): void {
    const nextValue = this.clamp(Number(value), 0.4, 3);
    this.updateConfig({ disturbanceFrequency: nextValue });
  }

  resetConfig(): void {
    this.config = structuredClone(DEFAULT_CONFIG);
  }

  toggleBasics(): void {
    this.showBasics = !this.showBasics;
  }

  toggleControls(): void {
    this.showControls = !this.showControls;
  }

  t(key: string): string {
    return I18N[this.language][key] ?? I18N.en[key] ?? key;
  }

  setLanguage(lang: Lang): void {
    this.language = lang;
  }
}

