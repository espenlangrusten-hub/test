// In-Match Coaching Suggestions based on well-known football philosophies

export interface CoachingSuggestion {
  id: string;
  title: string;
  description: string;
  philosophy: string;
  philosopher: string;
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
    id: 'def_general',
    label: 'Defensive — General',
    icon: 'shield-outline',
    color: '#EF4444',
    suggestions: [
      {
        id: 'dg1', title: 'Compact the Lines',
        description: 'Reduce space between defence and midfield to max 25m. Force opponents wide.',
        philosophy: 'Low Block', philosopher: 'Mourinho',
      },
      {
        id: 'dg2', title: 'High Press Trigger',
        description: 'Press when the ball goes to opponent\'s weak-foot CB or when GK plays short.',
        philosophy: 'Gegenpressing', philosopher: 'Klopp',
      },
      {
        id: 'dg3', title: 'Zonal Marking',
        description: 'Each player guards a zone, not a man. Shift as a unit laterally with the ball.',
        philosophy: 'Positional Play', philosopher: 'Sacchi',
      },
      {
        id: 'dg4', title: 'Counter-Press Immediately',
        description: 'Win the ball back within 5 seconds of losing it. Nearest 3 players surround.',
        philosophy: '5-Second Rule', philosopher: 'Guardiola',
      },
    ],
  },
  {
    id: 'def_left',
    label: 'Defensive — Left Side',
    icon: 'arrow-left-bold',
    color: '#F59E0B',
    suggestions: [
      {
        id: 'dl1', title: 'Double Up Left',
        description: 'LB tucks inside, LM/LW drops deeper. Force opponent onto their weaker right foot.',
        philosophy: 'Overload Defence', philosopher: 'Simeone',
      },
      {
        id: 'dl2', title: 'Left Side Pressing Trap',
        description: 'Show opponent inside, then LB & CM close the space. Win ball in dangerous area.',
        philosophy: 'Pressing Trap', philosopher: 'Rangnick',
      },
      {
        id: 'dl3', title: 'Cover Shadow Left',
        description: 'LM covers passing lane to opponent RW while closing down the fullback.',
        philosophy: 'Cover Shadow', philosopher: 'Nagelsmann',
      },
    ],
  },
  {
    id: 'def_right',
    label: 'Defensive — Right Side',
    icon: 'arrow-right-bold',
    color: '#F59E0B',
    suggestions: [
      {
        id: 'dr1', title: 'Double Up Right',
        description: 'RB stays tight, RM tucks in. Don\'t let opponent LW receive in half-space.',
        philosophy: 'Overload Defence', philosopher: 'Simeone',
      },
      {
        id: 'dr2', title: 'Right Side Pressing Trap',
        description: 'Push opponent left, then RB & CM spring the trap to win possession.',
        philosophy: 'Pressing Trap', philosopher: 'Rangnick',
      },
      {
        id: 'dr3', title: 'Invert the RB',
        description: 'RB steps into midfield to overload centre, RCB covers the width.',
        philosophy: 'Inverted Fullback', philosopher: 'Guardiola',
      },
    ],
  },
  {
    id: 'mid_control',
    label: 'Midfield Control',
    icon: 'target',
    color: '#3B82F6',
    suggestions: [
      {
        id: 'mc1', title: 'Create a Diamond',
        description: 'CDM drops deep, two CMs wide, CAM high. Always have 4 passing options.',
        philosophy: 'Positional Play', philosopher: 'Guardiola',
      },
      {
        id: 'mc2', title: 'Third Man Runs',
        description: 'Pass to CM1, CM1 lays off to CM2 who has already turned. Break the press.',
        philosophy: 'Tiki-Taka', philosopher: 'Xavi',
      },
      {
        id: 'mc3', title: 'Win Second Balls',
        description: 'Play direct, two midfielders crash the landing zone. Win the knock-downs.',
        philosophy: 'Direct Play', philosopher: 'Dyche / Pulis',
      },
      {
        id: 'mc4', title: 'Control Tempo',
        description: 'Slow build-up to draw opponents out, then one quick pass to break lines.',
        philosophy: 'Tempo Control', philosopher: 'Ancelotti',
      },
      {
        id: 'mc5', title: 'Midfield Press Resist',
        description: 'Receive on the half-turn. Body open to the field. One touch to switch play.',
        philosophy: 'Press Resistance', philosopher: 'De Jong / Busquets',
      },
    ],
  },
  {
    id: 'attack_general',
    label: 'Attacking — General',
    icon: 'sword-cross',
    color: '#00C853',
    suggestions: [
      {
        id: 'ag1', title: 'Overload the Box',
        description: 'Get 5+ players in/around the box on crosses. Far post, near post, penalty spot, edge, cutback.',
        philosophy: 'Crossing Game', philosopher: 'Moyes / Allardyce',
      },
      {
        id: 'ag2', title: 'Quick Counter Attack',
        description: 'Win ball → forward pass within 3 seconds → runners go. Max 4 passes to goal.',
        philosophy: 'Counter Attack', philosopher: 'Mourinho',
      },
      {
        id: 'ag3', title: 'Patient Build-Up',
        description: 'Build from the back. GK → CB → FB overlaps → switch play → find the free man.',
        philosophy: 'Build from Back', philosopher: 'Guardiola',
      },
      {
        id: 'ag4', title: 'Half-Space Penetration',
        description: 'Target the channels between CB and FB. CAM/inside forwards make diagonal runs.',
        philosophy: 'Half-Spaces', philosopher: 'Tuchel',
      },
      {
        id: 'ag5', title: 'Width and Stretch',
        description: 'Wingers hug the touchline. Stretch the defence. Create 1v1 situations wide.',
        philosophy: 'Wing Play', philosopher: 'Sir Alex Ferguson',
      },
    ],
  },
  {
    id: 'attack_left',
    label: 'Attacking — Left Side',
    icon: 'arrow-left-bold',
    color: '#8B5CF6',
    suggestions: [
      {
        id: 'al1', title: 'LB Overlap',
        description: 'LW comes inside, LB bombs forward on the overlap. Cross from the byline.',
        philosophy: 'Overlapping Fullback', philosopher: 'Klopp',
      },
      {
        id: 'al2', title: 'Inverted Winger Left',
        description: 'LW cuts inside onto right foot. Look for curling shot or through ball.',
        philosophy: 'Inverted Winger', philosopher: 'Robben Effect',
      },
      {
        id: 'al3', title: 'Underlap Left',
        description: 'LB underlaps inside of LW. LW holds width, LB penetrates the half-space.',
        philosophy: 'Underlapping Run', philosopher: 'Arteta',
      },
    ],
  },
  {
    id: 'attack_right',
    label: 'Attacking — Right Side',
    icon: 'arrow-right-bold',
    color: '#8B5CF6',
    suggestions: [
      {
        id: 'ar1', title: 'RB Overlap',
        description: 'RW comes inside, RB overlaps wide. Deliver early crosses to the far post.',
        philosophy: 'Overlapping Fullback', philosopher: 'Klopp',
      },
      {
        id: 'ar2', title: 'Inverted Winger Right',
        description: 'RW cuts inside onto left foot. Combine with ST or shoot from the edge.',
        philosophy: 'Inverted Winger', philosopher: 'Salah / Messi style',
      },
      {
        id: 'ar3', title: 'Switch of Play',
        description: 'Build on left, quick diagonal to isolated RW. 1v1 against tired LB.',
        philosophy: 'Switch Play', philosopher: 'Zidane',
      },
    ],
  },
];
