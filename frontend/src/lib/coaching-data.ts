export interface TacticalArrow {
  fromX: number; fromY: number;
  toX: number; toY: number;
  color: string;
  dashed?: boolean;
}

export interface CoachingSuggestion {
  id: string;
  quote: string;
  quotedBy: string;
  problem: string;
  principle: string;
  actions: string[];
  arrows: TacticalArrow[];
}

export interface CoachingCategory {
  id: string;
  label: string;
  icon: string;
  color: string;
  suggestions: CoachingSuggestion[];
}

export const COACHING_CATEGORIES: CoachingCategory[] = [
  {
    id: 'team',
    label: 'Team Level',
    icon: 'account-group',
    color: '#3B82F6',
    suggestions: [
      {
        id: 't1',
        quote: '"Pressing is about distances, not running"',
        quotedBy: 'Pep Guardiola',
        problem: 'Press is uncoordinated, one player presses alone.',
        principle: 'Press is collective; vertical compactness < 30-35 m.',
        actions: [
          'Drop the team 5-10 meters',
          'Define one pressing trigger (bad touch / wide pass)',
          'Assign a clear press leader',
        ],
        arrows: [
          { fromX: 50, fromY: 30, toX: 50, toY: 42, color: '#3B82F6' },
          { fromX: 25, fromY: 25, toX: 25, toY: 37, color: '#3B82F6' },
          { fromX: 75, fromY: 25, toX: 75, toY: 37, color: '#3B82F6' },
          { fromX: 50, fromY: 55, toX: 50, toY: 65, color: '#3B82F6' },
          { fromX: 20, fromY: 55, toX: 20, toY: 65, color: '#3B82F6' },
          { fromX: 80, fromY: 55, toX: 80, toY: 65, color: '#3B82F6' },
          { fromX: 50, fromY: 15, toX: 42, toY: 20, color: '#EF4444', dashed: true },
        ],
      },
      {
        id: 't2',
        quote: '"The team must move as one block"',
        quotedBy: 'Arrigo Sacchi',
        problem: 'Big gaps between defence, midfield and attack.',
        principle: 'Compactness > formation.',
        actions: [
          'Ask striker to drop 5 m',
          'Push back line higher instead of midfield lower',
          'Temporarily defend in a lower block to regain control',
        ],
        arrows: [
          { fromX: 50, fromY: 20, toX: 50, toY: 32, color: '#EF4444' },
          { fromX: 25, fromY: 75, toX: 25, toY: 62, color: '#00C853' },
          { fromX: 75, fromY: 75, toX: 75, toY: 62, color: '#00C853' },
          { fromX: 50, fromY: 78, toX: 50, toY: 65, color: '#00C853' },
          { fromX: 30, fromY: 45, toX: 30, toY: 48, color: '#3B82F6', dashed: true },
          { fromX: 70, fromY: 45, toX: 70, toY: 48, color: '#3B82F6', dashed: true },
        ],
      },
    ],
  },
  {
    id: 'defence',
    label: 'Defensive Line',
    icon: 'shield-half-full',
    color: '#EF4444',
    suggestions: [
      {
        id: 'd1',
        quote: '"Protect the box first"',
        quotedBy: 'Diego Simeone',
        problem: 'Defence stretched wide, space opens centrally.',
        principle: 'Stay narrow, shift together, force wide play.',
        actions: [
          'Fullback delays, doesn\'t over-press',
          'Nearest midfielder doubles wide',
          'Accept crosses under pressure, deny central passes',
        ],
        arrows: [
          { fromX: 15, fromY: 72, toX: 30, toY: 72, color: '#EF4444' },
          { fromX: 85, fromY: 72, toX: 70, toY: 72, color: '#EF4444' },
          { fromX: 30, fromY: 55, toX: 20, toY: 65, color: '#F59E0B', dashed: true },
          { fromX: 70, fromY: 55, toX: 80, toY: 65, color: '#F59E0B', dashed: true },
          { fromX: 40, fromY: 72, toX: 45, toY: 72, color: '#EF4444' },
          { fromX: 60, fromY: 72, toX: 55, toY: 72, color: '#EF4444' },
        ],
      },
      {
        id: 'd2',
        quote: '"Defending is about control, not fear"',
        quotedBy: 'Carlo Ancelotti',
        problem: 'Back line drops too deep, constant pressure.',
        principle: 'Line follows ball + pressure, keeper leads depth.',
        actions: [
          'Keeper commands "UP"',
          'One centre-back leads the line',
          'Clear lines for 3-5 minutes if needed',
        ],
        arrows: [
          { fromX: 50, fromY: 90, toX: 50, toY: 80, color: '#F59E0B' },
          { fromX: 35, fromY: 78, toX: 35, toY: 65, color: '#00C853' },
          { fromX: 65, fromY: 78, toX: 65, toY: 65, color: '#00C853' },
          { fromX: 25, fromY: 80, toX: 25, toY: 67, color: '#00C853' },
          { fromX: 75, fromY: 80, toX: 75, toY: 67, color: '#00C853' },
          { fromX: 50, fromY: 75, toX: 50, toY: 62, color: '#00C853', dashed: true },
        ],
      },
    ],
  },
  {
    id: 'attack',
    label: 'Attack',
    icon: 'sword-cross',
    color: '#00C853',
    suggestions: [
      {
        id: 'a1',
        quote: '"The striker creates space before goals"',
        quotedBy: 'Thomas Tuchel',
        problem: 'Striker invisible or isolated.',
        principle: 'Movement creates advantage.',
        actions: [
          'Instruct: Drop - set - run',
          'One midfielder always runs beyond striker',
          'Rotate striker and attacking midfielder if needed',
        ],
        arrows: [
          { fromX: 50, fromY: 18, toX: 50, toY: 35, color: '#EF4444' },
          { fromX: 50, fromY: 35, toX: 40, toY: 30, color: '#F59E0B', dashed: true },
          { fromX: 40, fromY: 30, toX: 35, toY: 15, color: '#00C853' },
          { fromX: 40, fromY: 48, toX: 55, toY: 20, color: '#3B82F6' },
          { fromX: 60, fromY: 48, toX: 45, toY: 25, color: '#3B82F6', dashed: true },
        ],
      },
      {
        id: 'a2',
        quote: '"Verticality before control"',
        quotedBy: 'Marcelo Bielsa',
        problem: 'Slow circulation, no penetration.',
        principle: 'One vertical threat per attack.',
        actions: [
          'Demand one run in behind every attack',
          'Increase width higher up the pitch',
          'Play more direct for short phases',
        ],
        arrows: [
          { fromX: 50, fromY: 50, toX: 50, toY: 20, color: '#00C853' },
          { fromX: 30, fromY: 40, toX: 15, toY: 25, color: '#3B82F6' },
          { fromX: 70, fromY: 40, toX: 85, toY: 25, color: '#3B82F6' },
          { fromX: 40, fromY: 55, toX: 40, toY: 30, color: '#00C853', dashed: true },
          { fromX: 60, fromY: 55, toX: 60, toY: 30, color: '#00C853', dashed: true },
        ],
      },
    ],
  },
];
