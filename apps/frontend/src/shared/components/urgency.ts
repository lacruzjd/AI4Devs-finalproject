export type UrgencyLevel = 'expired' | 'critical' | 'warning' | 'safe';

/**
 * Deriva nivel + etiqueta de urgencia FEFO desde las horas restantes, sin cortar
 * la escala: `Vencido` (<0h) · `Hoy` (<24h) · `Mañana` (<48h) · `N Días` (resto).
 * `Vencido` tiene nivel propio desde `TK-155-FE`: un vencido solo se descarta (INV-5),
 * mientras que lo que caduca hoy se consume primero — misma urgencia, acciones opuestas.
 * Vive fuera de `UrgencyChip.tsx` para no romper Fast Refresh (react-refresh/only-export-components).
 * "Vencido" añadido en `TK-087-FE` (hallazgo D-3 de `AUDIT-DEV-004`).
 */
export function urgencyFromHours(hoursRemaining: number): { level: UrgencyLevel; label: string } {
  if (hoursRemaining < 0) return { level: 'expired', label: 'Vencido' };
  if (hoursRemaining < 24) return { level: 'critical', label: 'Hoy' };
  if (hoursRemaining < 48) return { level: 'warning', label: 'Mañana' };
  return { level: 'safe', label: `${Math.ceil(hoursRemaining / 24)} Días` };
}

export interface FefoBuckets {
  expired: number;
  critical: number;
  warning: number;
  safe: number;
  total: number;
}

/**
 * Segmenta un conjunto de remanentes en las 3 cubetas de severidad FEFO, usando el
 * MISMO umbral que `urgencyFromHours` — única fuente de verdad compartida por la
 * `FEFOInventoryHealthBar`, el panel Estado y los chips de fila (`TK-087-FE`).
 */
export function bucketRemanentes(items: readonly { hoursRemaining: number }[]): FefoBuckets {
  const buckets: FefoBuckets = { expired: 0, critical: 0, warning: 0, safe: 0, total: items.length };
  for (const item of items) {
    buckets[urgencyFromHours(item.hoursRemaining).level] += 1;
  }
  return buckets;
}

export interface FefoPercentages {
  safePct: number;
  warningPct: number;
  criticalPct: number;
  expiredPct: number;
}

/**
 * Porcentajes redondeados que SIEMPRE suman 100: el residuo de redondeo (±1-2) se
 * absorbe en el segmento con mayor conteo (AC #2 de `TK-087-FE`).
 */
export function bucketPercentages(buckets: FefoBuckets): FefoPercentages {
  if (buckets.total === 0) return { safePct: 0, warningPct: 0, criticalPct: 0, expiredPct: 0 };

  const pct: FefoPercentages = {
    safePct: Math.round((buckets.safe / buckets.total) * 100),
    warningPct: Math.round((buckets.warning / buckets.total) * 100),
    criticalPct: Math.round((buckets.critical / buckets.total) * 100),
    expiredPct: Math.round((buckets.expired / buckets.total) * 100),
  };

  // El residuo de redondeo (±1-2) se absorbe en el segmento con mayor conteo real.
  const residue = 100 - (pct.safePct + pct.warningPct + pct.criticalPct + pct.expiredPct);
  const byCount: [keyof FefoPercentages, number][] = [
    ['safePct', buckets.safe],
    ['warningPct', buckets.warning],
    ['criticalPct', buckets.critical],
    ['expiredPct', buckets.expired],
  ];
  const largest = byCount.reduce((best, current) => (current[1] > best[1] ? current : best))[0];
  pct[largest] += residue;
  return pct;
}
