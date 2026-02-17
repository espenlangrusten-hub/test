export interface PositionSlot {
  x: number;
  y: number;
  role: string;
}

export interface Formation {
  id: string;
  name: string;
  displayName: string;
  sport: 'football' | 'futsal';
  format: '5v5' | '7v7' | '11v11';
  positions: PositionSlot[];
  managerName?: string;
  managerStyle?: string;
  description?: string;
}

export const POSITIONS: Record<string, string[]> = {
  '11v11': ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF'],
  '9v9': ['GK', 'CB', 'LB', 'RB', 'CM', 'LM', 'RM', 'CAM', 'ST', 'LW', 'RW'],
  '7v7': ['GK', 'CB', 'LB', 'RB', 'CM', 'LM', 'RM', 'ST', 'CAM'],
  '5v5': ['GK', 'DEF', 'MID', 'FWD'],
  'futsal_5v5': ['GK', 'Fixo', 'Ala', 'Pivot'],
};

export const STARTERS_COUNT: Record<string, number> = {
  '5v5': 5,
  '7v7': 7,
  '9v9': 9,
  '11v11': 11,
};

export const SET_PIECE_ROLES = ['Corners', 'Free Kicks', 'Penalties', 'Throw-ins'];

const formations11v11: Formation[] = [
  {
    id: '442-ferguson',
    name: '4-4-2',
    displayName: "Ferguson's 4-4-2",
    sport: 'football',
    format: '11v11',
    managerName: 'Sir Alex Ferguson',
    managerStyle: 'Classic English',
    description: 'Balanced formation with two banks of four. Direct play with width.',
    positions: [
      { x: 50, y: 90, role: 'GK' },
      { x: 18, y: 72, role: 'LB' }, { x: 38, y: 76, role: 'CB' },
      { x: 62, y: 76, role: 'CB' }, { x: 82, y: 72, role: 'RB' },
      { x: 18, y: 48, role: 'LM' }, { x: 38, y: 50, role: 'CM' },
      { x: 62, y: 50, role: 'CM' }, { x: 82, y: 48, role: 'RM' },
      { x: 38, y: 22, role: 'ST' }, { x: 62, y: 22, role: 'ST' },
    ],
  },
  {
    id: '433-guardiola',
    name: '4-3-3',
    displayName: "Guardiola's 4-3-3",
    sport: 'football',
    format: '11v11',
    managerName: 'Pep Guardiola',
    managerStyle: 'Tiki-Taka',
    description: 'Possession-based with high pressing. Fluid attacking movement.',
    positions: [
      { x: 50, y: 90, role: 'GK' },
      { x: 18, y: 72, role: 'LB' }, { x: 38, y: 76, role: 'CB' },
      { x: 62, y: 76, role: 'CB' }, { x: 82, y: 72, role: 'RB' },
      { x: 30, y: 52, role: 'CM' }, { x: 50, y: 48, role: 'CM' },
      { x: 70, y: 52, role: 'CM' },
      { x: 18, y: 22, role: 'LW' }, { x: 50, y: 18, role: 'ST' },
      { x: 82, y: 22, role: 'RW' },
    ],
  },
  {
    id: '4231-mourinho',
    name: '4-2-3-1',
    displayName: "Mourinho's 4-2-3-1",
    sport: 'football',
    format: '11v11',
    managerName: 'José Mourinho',
    managerStyle: 'Counter-Attack',
    description: 'Compact defensive block with quick transitions on the break.',
    positions: [
      { x: 50, y: 90, role: 'GK' },
      { x: 18, y: 72, role: 'LB' }, { x: 38, y: 76, role: 'CB' },
      { x: 62, y: 76, role: 'CB' }, { x: 82, y: 72, role: 'RB' },
      { x: 38, y: 58, role: 'CDM' }, { x: 62, y: 58, role: 'CDM' },
      { x: 22, y: 38, role: 'LAM' }, { x: 50, y: 35, role: 'CAM' },
      { x: 78, y: 38, role: 'RAM' },
      { x: 50, y: 16, role: 'ST' },
    ],
  },
  {
    id: '433-klopp',
    name: '4-3-3',
    displayName: "Klopp's 4-3-3",
    sport: 'football',
    format: '11v11',
    managerName: 'Jürgen Klopp',
    managerStyle: 'Gegenpressing',
    description: 'High-intensity pressing with rapid transitions and wide forwards.',
    positions: [
      { x: 50, y: 90, role: 'GK' },
      { x: 15, y: 70, role: 'LB' }, { x: 38, y: 76, role: 'CB' },
      { x: 62, y: 76, role: 'CB' }, { x: 85, y: 70, role: 'RB' },
      { x: 35, y: 55, role: 'CM' }, { x: 50, y: 50, role: 'CDM' },
      { x: 65, y: 55, role: 'CM' },
      { x: 15, y: 25, role: 'LW' }, { x: 50, y: 20, role: 'ST' },
      { x: 85, y: 25, role: 'RW' },
    ],
  },
  {
    id: '352-conte',
    name: '3-5-2',
    displayName: "Conte's 3-5-2",
    sport: 'football',
    format: '11v11',
    managerName: 'Antonio Conte',
    managerStyle: 'Wing-Back System',
    description: 'Three at the back with aggressive wing-backs providing width.',
    positions: [
      { x: 50, y: 90, role: 'GK' },
      { x: 28, y: 76, role: 'CB' }, { x: 50, y: 78, role: 'CB' },
      { x: 72, y: 76, role: 'CB' },
      { x: 10, y: 50, role: 'LWB' }, { x: 35, y: 52, role: 'CM' },
      { x: 50, y: 48, role: 'CM' }, { x: 65, y: 52, role: 'CM' },
      { x: 90, y: 50, role: 'RWB' },
      { x: 38, y: 22, role: 'ST' }, { x: 62, y: 22, role: 'ST' },
    ],
  },
  {
    id: '442-simeone',
    name: '4-4-2',
    displayName: "Simeone's 4-4-2",
    sport: 'football',
    format: '11v11',
    managerName: 'Diego Simeone',
    managerStyle: 'Defensive Block',
    description: 'Ultra-compact defensive shape. Win ugly, win often.',
    positions: [
      { x: 50, y: 90, role: 'GK' },
      { x: 20, y: 74, role: 'LB' }, { x: 40, y: 78, role: 'CB' },
      { x: 60, y: 78, role: 'CB' }, { x: 80, y: 74, role: 'RB' },
      { x: 20, y: 52, role: 'LM' }, { x: 40, y: 55, role: 'CM' },
      { x: 60, y: 55, role: 'CM' }, { x: 80, y: 52, role: 'RM' },
      { x: 40, y: 28, role: 'ST' }, { x: 60, y: 28, role: 'ST' },
    ],
  },
  {
    id: '343-bielsa',
    name: '3-4-3',
    displayName: "Bielsa's 3-4-3",
    sport: 'football',
    format: '11v11',
    managerName: 'Marcelo Bielsa',
    managerStyle: 'Aggressive Pressing',
    description: 'Man-marking with relentless high press. Attack is the best defense.',
    positions: [
      { x: 50, y: 90, role: 'GK' },
      { x: 28, y: 76, role: 'CB' }, { x: 50, y: 78, role: 'CB' },
      { x: 72, y: 76, role: 'CB' },
      { x: 15, y: 50, role: 'LM' }, { x: 40, y: 52, role: 'CM' },
      { x: 60, y: 52, role: 'CM' }, { x: 85, y: 50, role: 'RM' },
      { x: 22, y: 22, role: 'LW' }, { x: 50, y: 18, role: 'ST' },
      { x: 78, y: 22, role: 'RW' },
    ],
  },
];

const formations7v7: Formation[] = [
  {
    id: '231-7v7',
    name: '2-3-1',
    displayName: '2-3-1 Attacking',
    sport: 'football',
    format: '7v7',
    description: 'Wide midfield with a lone striker. Great for possession.',
    positions: [
      { x: 50, y: 88, role: 'GK' },
      { x: 35, y: 70, role: 'CB' }, { x: 65, y: 70, role: 'CB' },
      { x: 20, y: 46, role: 'LM' }, { x: 50, y: 44, role: 'CM' },
      { x: 80, y: 46, role: 'RM' },
      { x: 50, y: 18, role: 'ST' },
    ],
  },
  {
    id: '321-7v7',
    name: '3-2-1',
    displayName: '3-2-1 Defensive',
    sport: 'football',
    format: '7v7',
    description: 'Solid backline with two midfielders supporting a striker.',
    positions: [
      { x: 50, y: 88, role: 'GK' },
      { x: 25, y: 70, role: 'CB' }, { x: 50, y: 72, role: 'CB' },
      { x: 75, y: 70, role: 'CB' },
      { x: 35, y: 44, role: 'CM' }, { x: 65, y: 44, role: 'CM' },
      { x: 50, y: 18, role: 'ST' },
    ],
  },
  {
    id: '2121-7v7',
    name: '2-1-2-1',
    displayName: '2-1-2-1 Diamond',
    sport: 'football',
    format: '7v7',
    description: 'Diamond shape in midfield. Central control with width from defenders.',
    positions: [
      { x: 50, y: 88, role: 'GK' },
      { x: 35, y: 72, role: 'CB' }, { x: 65, y: 72, role: 'CB' },
      { x: 50, y: 55, role: 'CM' },
      { x: 25, y: 38, role: 'LM' }, { x: 75, y: 38, role: 'RM' },
      { x: 50, y: 16, role: 'ST' },
    ],
  },
  {
    id: '132-7v7',
    name: '1-3-2',
    displayName: '1-3-2 Counter',
    sport: 'football',
    format: '7v7',
    description: 'Single sweeper with wide midfield and two strikers for quick counters.',
    positions: [
      { x: 50, y: 88, role: 'GK' },
      { x: 50, y: 72, role: 'CB' },
      { x: 20, y: 48, role: 'LM' }, { x: 50, y: 46, role: 'CM' },
      { x: 80, y: 48, role: 'RM' },
      { x: 35, y: 20, role: 'ST' }, { x: 65, y: 20, role: 'ST' },
    ],
  },
];

const formations5v5: Formation[] = [
  {
    id: '121-5v5',
    name: '1-2-1',
    displayName: '1-2-1 Diamond',
    sport: 'football',
    format: '5v5',
    description: 'Diamond shape for central control. Balanced attack and defense.',
    positions: [
      { x: 50, y: 85, role: 'GK' },
      { x: 50, y: 65, role: 'DEF' },
      { x: 25, y: 42, role: 'MID' }, { x: 75, y: 42, role: 'MID' },
      { x: 50, y: 16, role: 'FWD' },
    ],
  },
  {
    id: '211-5v5',
    name: '2-1-1',
    displayName: '2-1-1 Defensive',
    sport: 'football',
    format: '5v5',
    description: 'Two defenders provide stability. Midfielder links to lone striker.',
    positions: [
      { x: 50, y: 85, role: 'GK' },
      { x: 35, y: 65, role: 'DEF' }, { x: 65, y: 65, role: 'DEF' },
      { x: 50, y: 40, role: 'MID' },
      { x: 50, y: 16, role: 'FWD' },
    ],
  },
  {
    id: '22-5v5',
    name: '2-2',
    displayName: '2-2 Box',
    sport: 'football',
    format: '5v5',
    description: 'Simple box shape. Two defenders and two forwards. Quick transitions.',
    positions: [
      { x: 50, y: 85, role: 'GK' },
      { x: 35, y: 62, role: 'DEF' }, { x: 65, y: 62, role: 'DEF' },
      { x: 35, y: 28, role: 'FWD' }, { x: 65, y: 28, role: 'FWD' },
    ],
  },
  {
    id: '112-5v5',
    name: '1-1-2',
    displayName: '1-1-2 Attacking',
    sport: 'football',
    format: '5v5',
    description: 'Aggressive formation with two forwards. Push for goals.',
    positions: [
      { x: 50, y: 85, role: 'GK' },
      { x: 50, y: 65, role: 'DEF' },
      { x: 50, y: 42, role: 'MID' },
      { x: 35, y: 18, role: 'FWD' }, { x: 65, y: 18, role: 'FWD' },
    ],
  },
];

const formationsFutsal: Formation[] = [
  {
    id: '121-futsal',
    name: '1-2-1',
    displayName: '1-2-1 Diamond',
    sport: 'futsal',
    format: '5v5',
    description: 'Classic futsal diamond. Fixo anchors, Alas provide width, Pivot finishes.',
    positions: [
      { x: 50, y: 85, role: 'GK' },
      { x: 50, y: 62, role: 'Fixo' },
      { x: 25, y: 40, role: 'Ala' }, { x: 75, y: 40, role: 'Ala' },
      { x: 50, y: 16, role: 'Pivot' },
    ],
  },
  {
    id: '22-futsal',
    name: '2-2',
    displayName: '2-2 Square',
    sport: 'futsal',
    format: '5v5',
    description: 'Box formation. Strong defensive structure with quick passing lines.',
    positions: [
      { x: 50, y: 85, role: 'GK' },
      { x: 35, y: 60, role: 'Fixo' }, { x: 65, y: 60, role: 'Fixo' },
      { x: 35, y: 28, role: 'Ala' }, { x: 65, y: 28, role: 'Ala' },
    ],
  },
  {
    id: '31-futsal',
    name: '3-1',
    displayName: '3-1 Offensive',
    sport: 'futsal',
    format: '5v5',
    description: 'Three defenders with a target Pivot. Power play option.',
    positions: [
      { x: 50, y: 85, role: 'GK' },
      { x: 25, y: 58, role: 'Fixo' }, { x: 50, y: 62, role: 'Fixo' },
      { x: 75, y: 58, role: 'Fixo' },
      { x: 50, y: 18, role: 'Pivot' },
    ],
  },
  {
    id: '40-futsal',
    name: '4-0',
    displayName: '4-0 Rotational',
    sport: 'futsal',
    format: '5v5',
    description: 'No fixed Pivot. All outfield players rotate positions continuously.',
    positions: [
      { x: 50, y: 85, role: 'GK' },
      { x: 25, y: 50, role: 'Ala' }, { x: 50, y: 55, role: 'Fixo' },
      { x: 75, y: 50, role: 'Ala' }, { x: 50, y: 28, role: 'Pivot' },
    ],
  },
];

export function getFormations(sport: string, format: string): Formation[] {
  if (sport === 'futsal') return formationsFutsal;
  if (format === '5v5') return formations5v5;
  if (format === '7v7') return formations7v7;
  if (format === '9v9') return formations9v9;
  return formations11v11;
}

export function getPositionsForFormat(sport: string, format: string): string[] {
  if (sport === 'futsal') return POSITIONS['futsal_5v5'];
  return POSITIONS[format] || POSITIONS['11v11'];
}
