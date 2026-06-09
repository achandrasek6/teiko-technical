export const POPULATIONS = ['b_cell', 'cd4_t_cell', 'cd8_t_cell', 'nk_cell', 'monocyte'];

export const POPULATION_LABELS: Record<string, string> = {
  'b_cell': 'B Cell',
  'cd8_t_cell': 'CD8+ T Cell',
  'cd4_t_cell': 'CD4+ T Cell',
  'nk_cell': 'NK Cell',
  'monocyte': 'Monocyte'
};

export const POPULATION_COLORS: Record<string, string> = {
  'b_cell': '#8b5cf6',       // Purple
  'cd4_t_cell': '#10b981',   // Emerald green
  'cd8_t_cell': '#f59e0b',   // Amber
  'monocyte': '#0ea5e9',     // Sky blue
  'nk_cell': '#ec4899',      // Pink
};

export function getPopColor(pop: string) {
  return POPULATION_COLORS[pop] || '#64748b';
}

export function formatPop(pop: string) {
  if (!pop) return '';
  return POPULATION_LABELS[pop] || pop.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function PopBadge({ pop }: { pop: string }) {
  if (!pop) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: '8px', fontWeight: 500, color: '#1e293b' }}>
      <span style={{ 
        display: 'inline-block', 
        width: '10px', 
        height: '10px', 
        borderRadius: '50%', 
        backgroundColor: getPopColor(pop) 
      }}></span>
      <span>{formatPop(pop)}</span>
    </div>
  );
}

export async function fetchJSON(endpoint: string) {
  const API_BASE = '/api';
  const res = await fetch(`${API_BASE}${endpoint}`);
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  return await res.json();
}

export function formatPValue(p: number | null | undefined): string {
  if (p === null || p === undefined) return 'N/A';
  if (p < 0.0001) return '<0.0001';
  return p.toFixed(4);
}

export const getBoxStats = (arr: number[]) => {
  if (!arr || !arr.length) return null;
  const sorted = [...arr].sort((a,b) => a-b);
  const q = (p: number) => {
    const pos = (sorted.length - 1) * p;
    const base = Math.floor(pos);
    const rest = pos - base;
    return sorted[base + 1] !== undefined ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base];
  };
  const q1 = q(0.25);
  const median = q(0.5);
  const q3 = q(0.75);
  const iqr = q3 - q1;
  return {
    lowerFence: Math.max(sorted[0], q1 - 1.5 * iqr),
    q1,
    median,
    q3,
    upperFence: Math.min(sorted[sorted.length - 1], q3 + 1.5 * iqr)
  };
};
