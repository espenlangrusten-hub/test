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

// ========== 11v11 ==========
const COACHING_11v11: CoachingCategory[] = [
  {
    id: 'team', label: 'Team Level', icon: 'account-group', color: '#3B82F6',
    suggestions: [
      {
        id: 't1',
        quote: '"Pressing is about distances, not running"',
        quotedBy: 'Pep Guardiola',
        problem: 'Press is uncoordinated, one player presses alone.',
        principle: 'Press is collective; vertical compactness < 30-35 m.',
        actions: ['Drop the team 5-10 meters', 'Define one pressing trigger (bad touch / wide pass)', 'Assign a clear press leader'],
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
        actions: ['Ask striker to drop 5 m', 'Push back line higher instead of midfield lower', 'Temporarily defend in a lower block to regain control'],
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
    id: 'defence', label: 'Defensive Line', icon: 'shield-half-full', color: '#EF4444',
    suggestions: [
      {
        id: 'd1',
        quote: '"Protect the box first"',
        quotedBy: 'Diego Simeone',
        problem: 'Defence stretched wide, space opens centrally.',
        principle: 'Stay narrow, shift together, force wide play.',
        actions: ['Fullback delays, doesn\'t over-press', 'Nearest midfielder doubles wide', 'Accept crosses under pressure, deny central passes'],
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
        actions: ['Keeper commands "UP"', 'One centre-back leads the line', 'Clear lines for 3-5 minutes if needed'],
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
    id: 'attack', label: 'Attack', icon: 'sword-cross', color: '#00C853',
    suggestions: [
      {
        id: 'a1',
        quote: '"The striker creates space before goals"',
        quotedBy: 'Thomas Tuchel',
        problem: 'Striker invisible or isolated.',
        principle: 'Movement creates advantage.',
        actions: ['Instruct: Drop - set - run', 'One midfielder always runs beyond striker', 'Rotate striker and attacking midfielder if needed'],
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
        actions: ['Demand one run in behind every attack', 'Increase width higher up the pitch', 'Play more direct for short phases'],
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

// ========== 9v9 ==========
const COACHING_9v9: CoachingCategory[] = [
  {
    id: 'team', label: 'Team Shape', icon: 'account-group', color: '#3B82F6',
    suggestions: [
      {
        id: 't1-9',
        quote: '"Good teams make the pitch small in defence and big in attack"',
        quotedBy: 'Johan Cruyff',
        problem: 'Team too spread out, easy to play through.',
        principle: 'Compact shape, 20-25 m between lines.',
        actions: ['Squeeze the team into 3 zones', 'Midfield tracks back as a unit', 'Striker presses from the front, not alone'],
        arrows: [
          { fromX: 50, fromY: 25, toX: 50, toY: 35, color: '#3B82F6' },
          { fromX: 25, fromY: 50, toX: 35, toY: 50, color: '#3B82F6' },
          { fromX: 75, fromY: 50, toX: 65, toY: 50, color: '#3B82F6' },
          { fromX: 50, fromY: 70, toX: 50, toY: 60, color: '#00C853' },
        ],
      },
      {
        id: 't2-9',
        quote: '"Transition is the most important moment in football"',
        quotedBy: 'Jurgen Klopp',
        problem: 'Slow to react after winning/losing ball.',
        principle: 'First 3 seconds after turnover decide the attack.',
        actions: ['Wide players sprint forward on turnover', 'Centre mid plays first-time pass forward', 'If pressed, play back to keeper and reset'],
        arrows: [
          { fromX: 50, fromY: 50, toX: 50, toY: 30, color: '#00C853' },
          { fromX: 20, fromY: 45, toX: 15, toY: 25, color: '#3B82F6' },
          { fromX: 80, fromY: 45, toX: 85, toY: 25, color: '#3B82F6' },
        ],
      },
    ],
  },
  {
    id: 'defence', label: 'Defending', icon: 'shield-half-full', color: '#EF4444',
    suggestions: [
      {
        id: 'd1-9',
        quote: '"If you defend well, you will always have a chance"',
        quotedBy: 'Jose Mourinho',
        problem: 'Defenders get pulled out of position chasing the ball.',
        principle: 'Stay in your zone, shift as a unit.',
        actions: ['Back 3 never break shape', 'Nearest player pressures, others cover', 'Force play wide, away from goal'],
        arrows: [
          { fromX: 30, fromY: 70, toX: 40, toY: 70, color: '#EF4444' },
          { fromX: 70, fromY: 70, toX: 60, toY: 70, color: '#EF4444' },
          { fromX: 50, fromY: 72, toX: 50, toY: 68, color: '#EF4444' },
          { fromX: 40, fromY: 55, toX: 25, toY: 60, color: '#F59E0B', dashed: true },
        ],
      },
      {
        id: 'd2-9',
        quote: '"Organisation is the best player"',
        quotedBy: 'Rafa Benitez',
        problem: 'Players ball-watching, runners get free.',
        principle: 'Communication + body position facing the ball.',
        actions: ['Keeper constantly organises the back line', 'Defenders check shoulders every 3 seconds', 'Hold the line until the ball is played forward'],
        arrows: [
          { fromX: 35, fromY: 75, toX: 35, toY: 65, color: '#00C853' },
          { fromX: 65, fromY: 75, toX: 65, toY: 65, color: '#00C853' },
          { fromX: 50, fromY: 88, toX: 50, toY: 78, color: '#F59E0B' },
        ],
      },
    ],
  },
  {
    id: 'attack', label: 'Attack', icon: 'sword-cross', color: '#00C853',
    suggestions: [
      {
        id: 'a1-9',
        quote: '"Width and depth create opportunities"',
        quotedBy: 'Pep Guardiola',
        problem: 'Everyone clusters centrally, no space to play.',
        principle: 'Use the full width, stretch the opposition.',
        actions: ['Wide midfielders hug the touchline', 'Central player receives between the lines', 'Switch play if one side is blocked'],
        arrows: [
          { fromX: 50, fromY: 45, toX: 15, toY: 30, color: '#3B82F6' },
          { fromX: 50, fromY: 45, toX: 85, toY: 30, color: '#3B82F6' },
          { fromX: 50, fromY: 45, toX: 50, toY: 25, color: '#00C853', dashed: true },
        ],
      },
      {
        id: 'a2-9',
        quote: '"Always have a player between the lines"',
        quotedBy: 'Thomas Muller',
        problem: 'No one available to receive in dangerous areas.',
        principle: 'One player must always find the pocket.',
        actions: ['Attacking mid drifts into space between defence and midfield', 'Striker holds width or drops to create the gap', 'Play the pass into feet, not space'],
        arrows: [
          { fromX: 50, fromY: 40, toX: 50, toY: 28, color: '#00C853' },
          { fromX: 50, fromY: 22, toX: 35, toY: 28, color: '#EF4444', dashed: true },
          { fromX: 40, fromY: 50, toX: 50, toY: 38, color: '#3B82F6' },
        ],
      },
    ],
  },
];

// ========== 7v7 ==========
const COACHING_7v7: CoachingCategory[] = [
  {
    id: 'team', label: 'Team Shape', icon: 'account-group', color: '#3B82F6',
    suggestions: [
      {
        id: 't1-7',
        quote: '"The pitch is small, but the principles are the same"',
        quotedBy: 'Wiel Coerver',
        problem: 'Team bunches around the ball, no structure.',
        principle: 'Triangle shape around the ball at all times.',
        actions: ['Always 3 passing options for the player on the ball', 'One player deep, one wide, one ahead', 'Rotate positions but keep the triangle'],
        arrows: [
          { fromX: 50, fromY: 50, toX: 30, toY: 40, color: '#3B82F6' },
          { fromX: 50, fromY: 50, toX: 70, toY: 40, color: '#3B82F6' },
          { fromX: 50, fromY: 50, toX: 50, toY: 65, color: '#3B82F6', dashed: true },
        ],
      },
      {
        id: 't2-7',
        quote: '"Football is a game of mistakes"',
        quotedBy: 'Johan Cruyff',
        problem: 'Fear of losing ball kills creativity.',
        principle: 'Encourage risk in the final third, safety at the back.',
        actions: ['Play out from the back when possible', 'Go direct if under heavy pressure', 'Celebrate good attempts, not just goals'],
        arrows: [
          { fromX: 50, fromY: 85, toX: 50, toY: 70, color: '#00C853' },
          { fromX: 50, fromY: 70, toX: 30, toY: 55, color: '#3B82F6' },
          { fromX: 50, fromY: 70, toX: 70, toY: 55, color: '#3B82F6' },
          { fromX: 50, fromY: 55, toX: 50, toY: 25, color: '#00C853', dashed: true },
        ],
      },
    ],
  },
  {
    id: 'defence', label: 'Defending', icon: 'shield-half-full', color: '#EF4444',
    suggestions: [
      {
        id: 'd1-7',
        quote: '"Defend as a team, not as individuals"',
        quotedBy: 'Arrigo Sacchi',
        problem: 'One player gets beaten and no cover behind.',
        principle: 'Always have a covering player. Delay, don\'t dive in.',
        actions: ['First defender slows the attacker', 'Second defender covers behind at an angle', 'Third player cuts passing lane'],
        arrows: [
          { fromX: 50, fromY: 55, toX: 50, toY: 48, color: '#EF4444' },
          { fromX: 50, fromY: 65, toX: 45, toY: 58, color: '#F59E0B', dashed: true },
          { fromX: 35, fromY: 55, toX: 40, toY: 50, color: '#EF4444' },
        ],
      },
      {
        id: 'd2-7',
        quote: '"The best defence is shape"',
        quotedBy: 'Claudio Ranieri',
        problem: 'Goalkeeper exposed, shots from close range.',
        principle: 'Block the middle, force play wide.',
        actions: ['Defenders cover the goal zone first', 'Push attackers to the touchline', 'Keeper narrows the angle on 1v1s'],
        arrows: [
          { fromX: 35, fromY: 72, toX: 45, toY: 72, color: '#EF4444' },
          { fromX: 65, fromY: 72, toX: 55, toY: 72, color: '#EF4444' },
          { fromX: 50, fromY: 85, toX: 50, toY: 78, color: '#F59E0B' },
        ],
      },
    ],
  },
  {
    id: 'attack', label: 'Attack', icon: 'sword-cross', color: '#00C853',
    suggestions: [
      {
        id: 'a1-7',
        quote: '"Speed of thought is more important than speed of feet"',
        quotedBy: 'Dennis Bergkamp',
        problem: 'Attacks are predictable, easy to defend.',
        principle: 'Quick one-two combinations beat defenders.',
        actions: ['Play wall passes around the box', 'Encourage overlapping runs from defence', 'Shoot when you see the goal, don\'t over-pass'],
        arrows: [
          { fromX: 40, fromY: 40, toX: 50, toY: 30, color: '#00C853' },
          { fromX: 50, fromY: 30, toX: 40, toY: 22, color: '#00C853' },
          { fromX: 25, fromY: 50, toX: 20, toY: 30, color: '#3B82F6', dashed: true },
        ],
      },
      {
        id: 'a2-7',
        quote: '"If you can\'t go through, go around"',
        quotedBy: 'Arsene Wenger',
        problem: 'Defence packed centrally, no way through.',
        principle: 'Use width to pull defenders, then exploit gaps.',
        actions: ['Switch play quickly to the free side', 'Wide player takes on 1v1', 'Cut back to the edge of the box'],
        arrows: [
          { fromX: 30, fromY: 45, toX: 75, toY: 35, color: '#3B82F6' },
          { fromX: 75, fromY: 35, toX: 80, toY: 22, color: '#00C853' },
          { fromX: 80, fromY: 22, toX: 55, toY: 28, color: '#F59E0B', dashed: true },
        ],
      },
    ],
  },
];

// ========== 5v5 / Futsal ==========
const COACHING_5v5: CoachingCategory[] = [
  {
    id: 'team', label: 'Rotation & Shape', icon: 'account-group', color: '#3B82F6',
    suggestions: [
      {
        id: 't1-5',
        quote: '"Futsal is chess with your feet"',
        quotedBy: 'Falcao',
        problem: 'Players standing still, easy to mark.',
        principle: 'Constant rotation breaks man-marking.',
        actions: ['Pass and move every time', 'Rotate clockwise or anti-clockwise as a unit', 'Never stand in the same spot for more than 3 seconds'],
        arrows: [
          { fromX: 30, fromY: 55, toX: 30, toY: 35, color: '#3B82F6' },
          { fromX: 30, fromY: 35, toX: 70, toY: 35, color: '#3B82F6' },
          { fromX: 70, fromY: 35, toX: 70, toY: 55, color: '#3B82F6' },
          { fromX: 70, fromY: 55, toX: 30, toY: 55, color: '#3B82F6', dashed: true },
        ],
      },
      {
        id: 't2-5',
        quote: '"In futsal, the team that recovers the ball fastest wins"',
        quotedBy: 'Ricardinho',
        problem: 'Slow reaction after losing the ball.',
        principle: 'Immediate pressing within 3 seconds.',
        actions: ['Nearest player presses instantly', 'Others cut passing lanes', 'If not recovered in 5 sec, drop into diamond shape'],
        arrows: [
          { fromX: 50, fromY: 40, toX: 50, toY: 30, color: '#EF4444' },
          { fromX: 30, fromY: 50, toX: 35, toY: 40, color: '#EF4444' },
          { fromX: 70, fromY: 50, toX: 65, toY: 40, color: '#EF4444' },
          { fromX: 50, fromY: 65, toX: 50, toY: 55, color: '#EF4444', dashed: true },
        ],
      },
    ],
  },
  {
    id: 'defence', label: 'Defending', icon: 'shield-half-full', color: '#EF4444',
    suggestions: [
      {
        id: 'd1-5',
        quote: '"Defence in futsal is about angles, not tackles"',
        quotedBy: 'Marcos',
        problem: 'Opponent walks through the centre easily.',
        principle: 'Block the middle, force the play wide.',
        actions: ['Diamond defence: GK covers depth, pivot covers middle', 'Wings squeeze inward when ball is central', 'Only press when you have the angle to win it'],
        arrows: [
          { fromX: 50, fromY: 65, toX: 50, toY: 55, color: '#EF4444' },
          { fromX: 30, fromY: 55, toX: 40, toY: 50, color: '#EF4444' },
          { fromX: 70, fromY: 55, toX: 60, toY: 50, color: '#EF4444' },
          { fromX: 50, fromY: 80, toX: 50, toY: 72, color: '#F59E0B' },
        ],
      },
      {
        id: 'd2-5',
        quote: '"A good goalkeeper is half the team in futsal"',
        quotedBy: 'Higuita',
        problem: 'Keeper just stays on the line, rarely involved.',
        principle: 'Keeper is the extra outfield player in build-up.',
        actions: ['Keeper receives back-passes and plays quick distribution', 'Keeper calls the defensive shape', 'Use keeper as "flying goalkeeper" in last 2 min if losing'],
        arrows: [
          { fromX: 50, fromY: 88, toX: 50, toY: 75, color: '#F59E0B' },
          { fromX: 50, fromY: 75, toX: 30, toY: 60, color: '#3B82F6', dashed: true },
          { fromX: 50, fromY: 75, toX: 70, toY: 60, color: '#3B82F6', dashed: true },
        ],
      },
    ],
  },
  {
    id: 'attack', label: 'Attack', icon: 'sword-cross', color: '#00C853',
    suggestions: [
      {
        id: 'a1-5',
        quote: '"The pivot is the key to unlocking any futsal defence"',
        quotedBy: 'Falcao',
        problem: 'No target player, attack has no reference point.',
        principle: 'Pivot receives with back to goal, lays off or turns.',
        actions: ['Pivot posts up near the opponent\'s area', 'Wings make diagonal runs off pivot\'s lay-off', 'Alternate who plays pivot role every few attacks'],
        arrows: [
          { fromX: 50, fromY: 30, toX: 50, toY: 22, color: '#00C853' },
          { fromX: 50, fromY: 22, toX: 30, toY: 28, color: '#F59E0B', dashed: true },
          { fromX: 30, fromY: 50, toX: 25, toY: 25, color: '#3B82F6' },
          { fromX: 70, fromY: 50, toX: 75, toY: 25, color: '#3B82F6' },
        ],
      },
      {
        id: 'a2-5',
        quote: '"Set pieces win close games"',
        quotedBy: 'Jorge Braz',
        problem: 'Wasting corners and free kicks.',
        principle: 'Rehearsed set pieces create easy goals.',
        actions: ['Use a block-and-peel routine on corners', 'On free kicks: one decoy, one shooter', 'Practice 2-3 set piece plays in training'],
        arrows: [
          { fromX: 15, fromY: 20, toX: 40, toY: 30, color: '#3B82F6' },
          { fromX: 60, fromY: 35, toX: 50, toY: 25, color: '#00C853' },
          { fromX: 50, fromY: 25, toX: 50, toY: 15, color: '#00C853', dashed: true },
        ],
      },
    ],
  },
];

export function getCoachingCategories(format: string): CoachingCategory[] {
  switch (format) {
    case '11v11': return COACHING_11v11;
    case '9v9': return COACHING_9v9;
    case '7v7': return COACHING_7v7;
    case '5v5': return COACHING_5v5;
    default: return COACHING_11v11;
  }
}

// Keep backward compat
export const COACHING_CATEGORIES = COACHING_11v11;
