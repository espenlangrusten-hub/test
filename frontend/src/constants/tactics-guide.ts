export interface PositionGuide {
  role: string;
  defensive: string[];
  attacking: string[];
}

export interface TacticGuide {
  formationId: string;
  teamDefensive: string[];
  teamAttacking: string[];
  positionGuides: PositionGuide[];
}

const guides: Record<string, TacticGuide> = {
  // ===== 11v11 =====
  '442-ferguson': {
    formationId: '442-ferguson',
    teamDefensive: [
      'Two compact banks of four — deny space between the lines',
      'Press as a unit: front two close down CBs, midfield four shift laterally',
      'Full-backs tuck in to form a back six when under heavy pressure',
      'Win second balls in midfield — physicality and aerial dominance',
      'Force play wide and prevent central penetration',
    ],
    teamAttacking: [
      'Quick direct transitions — hit opponents before they can reset shape',
      'Wide midfielders stretch the pitch and deliver early crosses',
      'Strikers work as a pair: one drops deep, one stays high',
      'Full-backs overlap to create 2v1 situations on the flanks',
      'Switch play quickly from one side to the other to exploit space',
    ],
    positionGuides: [
      { role: 'GK', defensive: ['Command the box on crosses and set pieces', 'Organize the back four — communicate distances and gaps'], attacking: ['Distribute quickly to full-backs to start transitions', 'Long diagonal balls to switch play and find wide runners'] },
      { role: 'LB', defensive: ['Stay tight to your winger — don\'t let them turn', 'Tuck inside when ball is on the opposite flank'], attacking: ['Overlap the left midfielder to create width', 'Deliver early crosses into the box — aim for far post'] },
      { role: 'CB', defensive: ['Stay compact with your partner — no more than 15 yards apart', 'Win aerial duels and clear danger first, play second'], attacking: ['Play simple passes into midfield feet', 'Step forward with the ball when space opens to draw out opponents'] },
      { role: 'CB', defensive: ['Cover your partner when they step up to challenge', 'Track runners making diagonal runs in behind'], attacking: ['Switch play with long diagonal passes to the opposite flank', 'Bring the ball out from the back when pressed to bypass the first line'] },
      { role: 'RB', defensive: ['Hold your position and don\'t get drawn inside', 'Sprint back to cover when caught high up the pitch'], attacking: ['Provide width on the right — overlap and underlap the winger', 'Pull back cutbacks from the byline for arriving midfielders'] },
      { role: 'LM', defensive: ['Track back to form the bank of four — no exceptions', 'Press the opposition right-back when they have the ball'], attacking: ['Hug the touchline to stretch the defense wide', 'Cut inside onto your stronger foot when 1v1 to create shooting chances'] },
      { role: 'CM', defensive: ['Screen the back four — sit in front and intercept through balls', 'Press the ball-carrier when they enter your zone'], attacking: ['Drive forward with the ball when gaps appear in midfield', 'Arrive late into the box for second-ball opportunities'] },
      { role: 'CM', defensive: ['Double up with your CM partner to control the center', 'Track opposition attacking midfielders on their runs'], attacking: ['Play quick one-twos to break through the midfield line', 'Thread through balls into channels for strikers to run onto'] },
      { role: 'RM', defensive: ['Drop deep to form the flat four when out of possession', 'Cut off the supply line to the opposition left-back'], attacking: ['Stay wide and deliver crosses — vary between early and byline crosses', 'Make diagonal runs inside when the full-back overlaps'] },
      { role: 'ST', defensive: ['Press the center-backs — angle your run to force play one side', 'Drop to block passing lanes into the opponent\'s midfield pivot'], attacking: ['Run the channels between CB and full-back', 'Attack crosses — be first to the near post'] },
      { role: 'ST', defensive: ['Work with your strike partner to press as a pair', 'Cut off the goalkeeper as a passing option during build-up'], attacking: ['Hold up the ball and bring others into play', 'Make runs across the defensive line to create space for your partner'] },
    ],
  },

  '433-guardiola': {
    formationId: '433-guardiola',
    teamDefensive: [
      'Press high immediately on losing the ball — 5-second rule to recover possession',
      'GK acts as sweeper-keeper behind the high defensive line',
      'Midfield trio stays compact to suffocate central areas',
      'Wingers press opposition full-backs to cut off build-up routes',
      'Offside trap — step up together as a back line on through balls',
    ],
    teamAttacking: [
      'Build patiently from the back through short passes — never rush',
      'Create triangles everywhere: maintain passing options at all times',
      'Positional play: occupy all five vertical lanes across the pitch',
      'Full-backs invert into midfield to create numerical superiority in center',
      'Wingers stay wide to pin the opponent\'s full-backs and stretch defense',
    ],
    positionGuides: [
      { role: 'GK', defensive: ['Sweep behind the high line — be ready to sprint out', 'Start the build-up: play short to CBs even under pressure'], attacking: ['Act as an extra defender — receive back passes to recycle', 'Play driven passes into the midfield pivot to accelerate build-up'] },
      { role: 'LB', defensive: ['Hold the high line — stay level with the CB partnership', 'Recover position quickly when the ball is lost on your side'], attacking: ['Invert into midfield to create a 3v2 overload in the center', 'Provide underlap runs inside the winger to receive in half-spaces'] },
      { role: 'CB', defensive: ['Split wide in build-up to draw the press and create space centrally', 'Cover the inverting full-back\'s zone when they move inside'], attacking: ['Carry the ball forward into midfield when not pressed', 'Play progressive passes through the lines into midfield'] },
      { role: 'CB', defensive: ['Stay disciplined — win the 1v1 if opponent breaks through', 'Communicate with GK to manage the high line and offside trap'], attacking: ['Switch play with long diagonal balls to the far-side winger', 'Step into midfield to form a back three when full-backs push up'] },
      { role: 'RB', defensive: ['Track back from your inverted position immediately on loss', 'Cover the space behind you when the winger pushes high'], attacking: ['Move inside to become an extra midfielder in possession', 'Link play between defense and midfield — play quick one-touch passes'] },
      { role: 'CM', defensive: ['Be the first line of defense — press immediately and delay counters', 'Cover for inverting full-backs by dropping wider'], attacking: ['Dictate the tempo — slow it down or speed it up with your passing', 'Find the free man: always look for the spare player created by positional play'] },
      { role: 'CM', defensive: ['Sit as the deepest midfielder to protect the back line', 'Intercept passes through the center — read the game and anticipate'], attacking: ['Receive between the lines and turn to play forward', 'Recycle possession under pressure — keep the ball moving'] },
      { role: 'CM', defensive: ['Press high alongside the front three to win the ball early', 'Track runners coming from deep into your zone'], attacking: ['Make late runs into the box — arrive unmarked for cutbacks', 'Play penetrating passes between the lines to the front three'] },
      { role: 'LW', defensive: ['Press the opponent\'s right-back as the first line of defense', 'Track back to help when full-back is outnumbered'], attacking: ['Stay wide to maintain the width — stretch the defense to its limits', 'Cut inside to shoot or play combinations with the striker'] },
      { role: 'ST', defensive: ['Lead the press — angle runs to force play to one side', 'Close down the goalkeeper to prevent easy distribution'], attacking: ['Drop deep to link play and drag center-backs out of position', 'Make intelligent runs into space created by wingers'] },
      { role: 'RW', defensive: ['Press the opponent\'s left-back when they receive the ball', 'Recover to help the right-back in defensive transitions'], attacking: ['Stay wide and take on your full-back in 1v1 situations', 'Pull wide then make diagonal runs behind the defense'] },
    ],
  },

  '4231-mourinho': {
    formationId: '4231-mourinho',
    teamDefensive: [
      'Deep compact block — two banks of four with the #10 dropping in',
      'Double pivot shields the defense: one screens, one covers',
      'Force opponents wide — the center of the pitch is locked down',
      'Win the ball and transition in under 5 seconds — counter-attack',
      'Keeper stays on the line — don\'t play a high line',
    ],
    teamAttacking: [
      'Quick vertical transitions — get the ball to the #10 as fast as possible',
      'Lone striker holds up play while wide players sprint forward',
      'Wide AMs make diagonal runs inside to overload the box',
      'Hit on the counter through the channels — pace is the weapon',
      'Set pieces are a primary goal threat — maximize every dead ball',
    ],
    positionGuides: [
      { role: 'GK', defensive: ['Stay on your line and dominate the box', 'Quick distribution to full-backs to start fast counters'], attacking: ['Long goal kicks to find the striker in the channels', 'Throw quickly to the wide players for instant transitions'] },
      { role: 'LB', defensive: ['Do not get beaten 1v1 — show the winger outside', 'Stay deep and compact — don\'t push beyond the halfway line'], attacking: ['Overlap only when the team has clear possession control', 'Support the left attacking midfielder with simple passes'] },
      { role: 'CB', defensive: ['Win every header — aerial dominance is non-negotiable', 'Stay compact and don\'t get split by through balls'], attacking: ['Play long balls into the channels for the counter-attack', 'Step up to press only when cover is guaranteed behind you'] },
      { role: 'CB', defensive: ['Be the last man — no risky challenges, delay and contain', 'Organize the defensive line and manage the offside trap'], attacking: ['Switch play to the opposite flank with long diagonals', 'Start the counter with a quick ball to the #10 or the striker'] },
      { role: 'RB', defensive: ['Track every runner — never let anyone get behind you', 'Tuck in narrow to prevent cut-backs and inside passes'], attacking: ['Provide width when in established possession on the right', 'Deliver crosses into the box when the opportunity arises'] },
      { role: 'CDM', defensive: ['Sit deep and screen the back four — break up every attack', 'Intercept and tackle: you are the defensive wall in midfield'], attacking: ['Keep possession ticking — don\'t take risks with the ball', 'Spray long diagonal passes to switch play quickly'] },
      { role: 'CDM', defensive: ['Cover your partner: when one presses, the other covers', 'Pick up the opposition #10 — deny them space and time'], attacking: ['Drive forward to support when safe to do so', 'Play quick vertical passes to the attacking midfielders'] },
      { role: 'LAM', defensive: ['Track back to form a bank of five across midfield', 'Press the opposition right-back in the defensive phase'], attacking: ['Make diagonal runs from wide into the center to receive', 'Combine with the striker for quick 1-2s around the box'] },
      { role: 'CAM', defensive: ['Drop into midfield to form a flat 4-5-1 without the ball', 'Press the opposition\'s deepest midfielder to disrupt build-up'], attacking: ['Be the link between midfield and attack — face forward and drive', 'Find pockets of space between the lines to receive and turn'] },
      { role: 'RAM', defensive: ['Drop alongside the right midfielder to double up defensively', 'Deny the opposition left-back space to push forward'], attacking: ['Sprint forward on the counter — get beyond the striker', 'Cut inside onto your stronger foot to shoot or play the final ball'] },
      { role: 'ST', defensive: ['Press the center-backs but conserve energy for the counter', 'Position yourself to block the easy pass into midfield'], attacking: ['Hold the ball up with your back to goal — wait for support', 'Run the channels and stretch the defense for your teammates'] },
    ],
  },

  '433-klopp': {
    formationId: '433-klopp',
    teamDefensive: [
      'Gegenpressing: immediately swarm the ball on losing possession',
      'Win it back within 6 seconds or drop into a mid-block',
      'Full-backs push extremely high — CBs cover wide spaces',
      'Midfield trio presses as a unit — intensity is everything',
      'Force errors through aggressive closing down and pressing traps',
    ],
    teamAttacking: [
      'Direct and vertical — get the ball forward quickly',
      'Full-backs provide all the width — wingers cut inside',
      'Wingers are inverted: left-footer on the right, right-footer on the left',
      'High-tempo passing through midfield — no more than 2 touches',
      'Overload the box with late-arriving midfielders and overlapping full-backs',
    ],
    positionGuides: [
      { role: 'GK', defensive: ['Sweep aggressively behind the high line', 'Distribute quickly to start the counter-press'], attacking: ['Long balls to full-backs pushing high', 'Quick throws to midfield for rapid transitions'] },
      { role: 'LB', defensive: ['Sprint back from advanced position when ball is lost', 'Cover the CB when the line is exposed'], attacking: ['Push all the way to the byline — you ARE the width', 'Deliver crosses and cutbacks from deep wide positions'] },
      { role: 'CB', defensive: ['Hold the high line — be brave and step up', 'Win the foot race when opponents try to run behind'], attacking: ['Play aggressive forward passes into midfield', 'Carry the ball out when the press is beaten'] },
      { role: 'CB', defensive: ['Cover your partner and the spaces behind the full-backs', 'Lead the offside trap — communication is critical'], attacking: ['Long diagonal switches to the far-side full-back', 'Step into midfield when safe to add an extra body'] },
      { role: 'RB', defensive: ['Track back at full speed — recovery runs are essential', 'Don\'t get caught too high when the counter comes'], attacking: ['Overlap and overlap again — relentless forward runs', 'Cross early or cut back for the arriving midfielder'] },
      { role: 'CM', defensive: ['Press with maximum intensity for 6 seconds then hold', 'Cover the space left by the advancing full-backs'], attacking: ['Drive forward with purpose — carry the ball into the final third', 'Arrive late in the box for goals — time your runs'] },
      { role: 'CDM', defensive: ['Anchor the midfield — sit and protect the back four', 'Break up counter-attacks before they develop'], attacking: ['Keep the ball moving quickly — one-touch passing', 'Spray passes to full-backs to switch the point of attack'] },
      { role: 'CM', defensive: ['Press high alongside the front three — energy and intensity', 'Win the ball in the opponent\'s half to create chances'], attacking: ['Make box-to-box runs — support the attack then recover', 'Play through balls into the channels for the inverted wingers'] },
      { role: 'LW', defensive: ['Press the opponent\'s right-back as part of the front three', 'Track back to help when the press is bypassed'], attacking: ['Cut inside from the left onto your right foot to shoot', 'Combine with the overlapping left-back in tight spaces'] },
      { role: 'ST', defensive: ['Lead the press — your intensity sets the tone for the team', 'Press the CBs and angle your runs to force mistakes'], attacking: ['Link play between the wingers — quick combinations', 'Make runs across the back line to pull defenders apart'] },
      { role: 'RW', defensive: ['Press the opponent\'s left-back and track back when needed', 'Cut off passing lanes to the opposition wide players'], attacking: ['Cut inside from the right onto your left foot to create', 'Attack the space behind the defense — pure speed'] },
    ],
  },

  '352-conte': {
    formationId: '352-conte',
    teamDefensive: [
      'Three center-backs shift as a unit — cover and balance',
      'Wing-backs drop to form a back five in the defensive phase',
      'Central midfield trio screens and protects the defensive line',
      'Stay narrow and compact — force opponents to play wide',
      'Transition quickly from 5-3-2 defense to 3-5-2 attack',
    ],
    teamAttacking: [
      'Wing-backs sprint forward to create width — they are key',
      'Two strikers combine and rotate to unsettle the defense',
      'Midfield three pushes high to support the attack',
      'Play through the center with quick combinations',
      'Wing-backs deliver crosses for the two strikers in the box',
    ],
    positionGuides: [
      { role: 'GK', defensive: ['Organize the three CBs — distance and shape', 'Command the box on crosses — bigger area to cover'], attacking: ['Distribute to the wing-backs to start wide attacks', 'Play out from the back through the center-backs'] },
      { role: 'CB', defensive: ['Cover the left channel — don\'t let runners in behind', 'Step out wide to cover when the LWB pushes up'], attacking: ['Carry the ball into midfield when space opens', 'Play progressive passes into the striker\'s feet'] },
      { role: 'CB', defensive: ['Sweep behind the other two CBs — last line of defense', 'Organize and communicate the defensive shape'], attacking: ['Start build-up play through the center with composure', 'Long switching passes to the wing-backs on either flank'] },
      { role: 'CB', defensive: ['Cover the right channel and the space behind the RWB', 'Step up to press when the ball is in your zone'], attacking: ['Drive forward with the ball to create 4v3 in midfield', 'Overlap into the right half-space when safe to do so'] },
      { role: 'LWB', defensive: ['Drop deep to form a back five — discipline is key', 'Track the opposition right winger all the way'], attacking: ['Sprint forward at every opportunity — you provide ALL the width on the left', 'Deliver crosses from the byline and cutbacks from deep'] },
      { role: 'CM', defensive: ['Cover for the wing-backs when they get caught high', 'Press in the center and win the midfield battle'], attacking: ['Link midfield to attack — feed the strikers with through balls', 'Arrive at the edge of the box for shots from distance'] },
      { role: 'CM', defensive: ['Sit deepest in midfield — protect the three center-backs', 'Break up counters and intercept through balls'], attacking: ['Dictate the rhythm — control the tempo of the game', 'Recycle possession and find the wing-backs in space'] },
      { role: 'CM', defensive: ['Press high with the strikers to win the ball early', 'Track opposition midfield runners into the box'], attacking: ['Support the two strikers — become the third attacker', 'Drive forward with late runs into the penalty area'] },
      { role: 'RWB', defensive: ['Fall back into a back five — match up with the opposition winger', 'Track every overlapping run on your side'], attacking: ['Bomb forward relentlessly — create 2v1 on the right', 'Cross early and often — find the two strikers in the box'] },
      { role: 'ST', defensive: ['Press center-backs together with your strike partner', 'Block passing lanes into the midfield pivot'], attacking: ['Rotate with your partner — one drops deep, one stays high', 'Attack crosses from the wing-backs — get into the box'] },
      { role: 'ST', defensive: ['Help press as a pair — angle runs to force sideways passes', 'Track back to pick up the opposition\'s deepest midfielder'], attacking: ['Hold the ball up and bring the midfield runners into play', 'Make runs across the defensive line to lose your marker'] },
    ],
  },

  '442-simeone': {
    formationId: '442-simeone',
    teamDefensive: [
      'Ultra-compact defensive block — maximum 30 yards between lines',
      'Two disciplined banks of four — no player leaves their zone',
      'Press only in your own half — don\'t get drawn high',
      'Win every tackle and second ball — aggression and desire',
      'Protect the center at all costs — force play wide',
    ],
    teamAttacking: [
      'Fast direct counters — no more than 4 passes to get to goal',
      'Use set pieces as a primary weapon — every free kick and corner counts',
      'Wide midfielders break forward at pace on the transition',
      'Strikers stretch the defense vertically with runs in behind',
      'Keep it simple — quality over quantity in the final third',
    ],
    positionGuides: [
      { role: 'GK', defensive: ['Dominate your box — claim every cross', 'Quick distribution to launch the counter'], attacking: ['Long kicks to find the strikers for direct play', 'Distribute to wide midfielders for quick transitions'] },
      { role: 'LB', defensive: ['Hold your position — do NOT push forward unnecessarily', 'Win every 1v1 duel on your side'], attacking: ['Support the attack only when the team has clear control', 'Deliver simple passes to the left midfielder'] },
      { role: 'CB', defensive: ['Win every aerial duel — aggression and timing', 'Stay compact with your partner — never get split'], attacking: ['Clear long to the strikers to start counters', 'Simple build-up: keep it short and safe'] },
      { role: 'CB', defensive: ['Cover and communicate — organize the defensive wall', 'Block shots and put your body on the line'], attacking: ['Play direct passes forward — no risk, no loss', 'Step up to win the ball high when the opportunity is clear'] },
      { role: 'RB', defensive: ['Defend first, always — track your man relentlessly', 'Stay narrow to prevent cutbacks inside'], attacking: ['Overlap only in clear attacking phases', 'Keep it simple — early crosses into the box'] },
      { role: 'LM', defensive: ['Drop into the bank of four — discipline above all', 'Track the opposition right-back on overlapping runs'], attacking: ['Break forward at speed on the counter — use the wide channel', 'Deliver quality crosses first time when you get the ball wide'] },
      { role: 'CM', defensive: ['Win every midfield battle — tackle, intercept, cover', 'Protect the center — never leave it exposed'], attacking: ['Play safe passes to keep possession', 'Drive forward only when a clear opportunity presents'] },
      { role: 'CM', defensive: ['Screen the defense alongside your partner', 'Pick up runners from deep — track them all the way'], attacking: ['Link the counter-attack — quick passes to the wide players', 'Arrive late for rebounds and second balls around the box'] },
      { role: 'RM', defensive: ['Fall back into the flat four every time — no excuses', 'Press the opposition left-back to prevent easy build-up'], attacking: ['Sprint into space on the break — pace and directness', 'Cross early before the defense can reset'] },
      { role: 'ST', defensive: ['Close down the CBs but don\'t waste energy pressing pointlessly', 'Disrupt the build-up by blocking passing lanes'], attacking: ['Run the channels between CB and full-back on the counter', 'Be clinical in the box — one chance, one goal'] },
      { role: 'ST', defensive: ['Work as a pair — press together or drop together', 'Help close the midfield when defending deep'], attacking: ['Hold the ball up for the runners arriving from deep', 'Attack every cross — predatory in the penalty area'] },
    ],
  },

  '343-bielsa': {
    formationId: '343-bielsa',
    teamDefensive: [
      'Man-to-man marking across the entire pitch — everyone has an assignment',
      'Press high and aggressively — no rest for the opponent',
      'Win the ball back immediately — every player presses their man',
      'Accept the risk: high line, high press, high reward or high risk',
      'Use the spare man at the back to sweep up behind',
    ],
    teamAttacking: [
      'Constant movement — create overloads through positional rotations',
      'Width from the wide midfielders, penetration from the front three',
      'Play through the press with quick one-touch football',
      'Front three interchange positions to confuse the defense',
      'Attack relentlessly — outscore the opponent, never sit back',
    ],
    positionGuides: [
      { role: 'GK', defensive: ['Sweep aggressively behind the high line', 'Distribute quickly to the CBs to restart the attack'], attacking: ['Play short to start the build-up from the back', 'Long diagonals when the high press is suffocating'] },
      { role: 'CB', defensive: ['Mark your man tightly — follow them everywhere', 'Step out of the line to press when the ball enters your zone'], attacking: ['Carry the ball forward when your man drops deep', 'Play progressive passes into the midfield'] },
      { role: 'CB', defensive: ['Act as the sweeper — cover behind the pressing CBs', 'Organize and communicate the high defensive line'], attacking: ['Start the build-up with composed distribution', 'Switch play to the opposite wide midfielder'] },
      { role: 'CB', defensive: ['Man-mark the opponent on your side — stay tight', 'Cover the space behind the right midfielder when they press high'], attacking: ['Drive forward with the ball when space opens', 'Play long switches to the left midfielder'] },
      { role: 'LM', defensive: ['Track the opposition right-back man-to-man', 'Press immediately when your man receives the ball'], attacking: ['Provide width and deliver crosses from the left', 'Combine with the left winger in tight spaces'] },
      { role: 'CM', defensive: ['Man-mark the nearest opponent — don\'t let them turn', 'Press instantly when the ball is in your zone'], attacking: ['Link defense to attack with vertical passes', 'Drive forward to create numerical overloads'] },
      { role: 'CM', defensive: ['Cover the center — mark the deepest opponent midfielder', 'Intercept and disrupt the opposition build-up'], attacking: ['Dictate play from deep — change the angle of attack', 'Support the attack with late runs into the box'] },
      { role: 'RM', defensive: ['Track the opposition left-back everywhere they go', 'Win the 1v1 duel on your side at all times'], attacking: ['Attack the byline and deliver crosses into the box', 'Cut inside when space opens to shoot or play'] },
      { role: 'LW', defensive: ['Press the nearest defender — lead from the front', 'Help the left midfielder when outnumbered'], attacking: ['Interchange with the striker — rotate positions constantly', 'Make diagonal runs behind the defense from wide'] },
      { role: 'ST', defensive: ['Press the goalkeeper and center-backs relentlessly', 'Set the intensity standard for the entire team'], attacking: ['Drop deep and play as a false 9 to create space', 'Sprint in behind when the ball is switched quickly'] },
      { role: 'RW', defensive: ['Press the nearest defender on your side', 'Track back to support the right midfielder'], attacking: ['Cut inside onto your left foot to shoot or create', 'Rotate with the striker — take up central positions'] },
    ],
  },

  // ===== 7v7 =====
  '231-7v7': {
    formationId: '231-7v7',
    teamDefensive: ['Two defenders stay compact and cover the center', 'Three midfielders drop back to form a flat line of 5', 'Press as a team — don\'t let the opponent settle on the ball', 'Goalkeeper sweeps behind the two defenders'],
    teamAttacking: ['Build from the back through the midfielders', 'Use width from the LM and RM to stretch the defense', 'Striker makes runs to pull defenders apart', 'Midfielders arrive in the box to support the lone striker'],
    positionGuides: [
      { role: 'GK', defensive: ['Sweep behind the two CBs', 'Organize the defense — communicate constantly'], attacking: ['Start play with short passes to the defenders', 'Throw quickly to start fast attacks'] },
      { role: 'CB', defensive: ['Stay compact with your CB partner — cover the center', 'Win aerial duels and clear danger'], attacking: ['Play short passes into midfield to start build-up', 'Step forward with the ball when safe'] },
      { role: 'CB', defensive: ['Cover your partner and track runners into the box', 'Don\'t get pulled wide — stay central'], attacking: ['Switch play to the opposite midfielder', 'Play long balls for the striker to run onto'] },
      { role: 'LM', defensive: ['Track back to help the defense — form a 5', 'Mark the opposition right midfielder'], attacking: ['Provide width on the left — stretch the defense', 'Deliver crosses and cut inside to shoot'] },
      { role: 'CM', defensive: ['Shield the defense — sit and intercept', 'Close down the ball in the center'], attacking: ['Drive forward with the ball — be the engine', 'Play through balls to the striker'] },
      { role: 'RM', defensive: ['Drop back to help — discipline and work rate', 'Track the opposition left midfielder'], attacking: ['Attack the right side — take on defenders', 'Cross early for the arriving attackers'] },
      { role: 'ST', defensive: ['Press the opposition defenders to force errors', 'Block passing lanes back to their GK'], attacking: ['Make intelligent runs between defenders', 'Hold up play and bring midfielders into the attack'] },
    ],
  },

  '321-7v7': {
    formationId: '321-7v7',
    teamDefensive: ['Three defenders provide a solid base', 'Two midfielders sit in front and protect the back three', 'Drop into a 5-2 shape without the ball', 'Goalkeeper acts as sweeper behind the high back three'],
    teamAttacking: ['Build patiently from the three defenders', 'Midfielders support the lone striker with forward runs', 'Outer CBs push wide to create width in build-up', 'Quick transitions through the center to the striker'],
    positionGuides: [
      { role: 'GK', defensive: ['Command the area and organize the three CBs', 'Sweep behind the back three'], attacking: ['Distribute to the wide CBs quickly', 'Kick long for the striker on the counter'] },
      { role: 'CB', defensive: ['Cover the left channel', 'Stay tight to any opponent on your side'], attacking: ['Push wide to create width in build-up', 'Play diagonal balls to switch the play'] },
      { role: 'CB', defensive: ['Sweep behind the other CBs — stay central', 'Organize the defensive shape'], attacking: ['Play forward through midfield', 'Carry the ball out when pressed'] },
      { role: 'CB', defensive: ['Cover the right channel', 'Step up to press when ball enters your zone'], attacking: ['Push wide to give a passing option', 'Play balls over the top for the striker'] },
      { role: 'CM', defensive: ['Protect the back three — sit and screen', 'Track the nearest opponent in midfield'], attacking: ['Support the striker — arrive as the second runner', 'Play quick passes to break the defensive line'] },
      { role: 'CM', defensive: ['Cover your midfield partner — balance the center', 'Drop between the CBs if pulled out of position'], attacking: ['Drive forward with the ball', 'Play through balls and switch play'] },
      { role: 'ST', defensive: ['Press the opposition build-up from the front', 'Block central passing lanes'], attacking: ['Run the channels — use your pace', 'Drop deep to receive and lay off for arriving runners'] },
    ],
  },

  '2121-7v7': {
    formationId: '2121-7v7',
    teamDefensive: ['Diamond midfield collapses into a compact 4', 'Two defenders cover the central area', 'Wide midfielders track back to form a flat four', 'Central midfielder shields in front of defense'],
    teamAttacking: ['Diamond provides passing triangles everywhere', 'CM links defense to wide players', 'LM and RM push high to support the striker', 'Quick combinations through the center of the diamond'],
    positionGuides: [
      { role: 'GK', defensive: ['Organize the two defenders', 'Sweep behind and cover through balls'], attacking: ['Play short to start build-up', 'Quick throws for transitions'] },
      { role: 'CB', defensive: ['Stay central and compact — cover each other', 'Win 1v1 duels'], attacking: ['Play into the CM to start the diamond pattern', 'Drive forward when space allows'] },
      { role: 'CB', defensive: ['Cover your partner — communication is key', 'Track runners behind the line'], attacking: ['Switch play to the opposite side', 'Step up with the ball under control'] },
      { role: 'CM', defensive: ['Shield the two defenders — first line of protection', 'Close down opponents in the center'], attacking: ['Link defense and attack through the diamond', 'Drive forward and play through balls'] },
      { role: 'LM', defensive: ['Drop into a flat four across midfield', 'Track the opposition right-side player'], attacking: ['Push high to create width and support the striker', 'Cut inside to shoot or combine'] },
      { role: 'RM', defensive: ['Track back into the defensive shape', 'Mark the opposition left-side player'], attacking: ['Provide width and deliver crosses', 'Make runs behind the defense'] },
      { role: 'ST', defensive: ['Press from the front', 'Close down build-up play'], attacking: ['Move intelligently between defenders', 'Drop deep to create space for midfield runners'] },
    ],
  },

  '132-7v7': {
    formationId: '132-7v7',
    teamDefensive: ['Sweeper drops deep as the last line', 'Midfield three forms a compact bank across the pitch', 'Two strikers drop to help midfield when needed', 'Goalkeeper organizes the single defender'],
    teamAttacking: ['Two strikers provide a constant attacking threat', 'Wide midfielders deliver balls for the striker pair', 'Quick counters using the two forwards', 'Central midfielder dictates play and feeds through balls'],
    positionGuides: [
      { role: 'GK', defensive: ['Communicate with the lone CB — be the extra eyes', 'Come out quickly to narrow angles'], attacking: ['Quick distribution to wide midfielders', 'Long kicks to find the strikers'] },
      { role: 'CB', defensive: ['Act as sweeper — cover the entire backline alone', 'Stay disciplined and don\'t commit to challenges early'], attacking: ['Play forward to midfield quickly', 'Carry the ball out to start attacks'] },
      { role: 'LM', defensive: ['Track back to form a bank of three', 'Cover the left side defensively'], attacking: ['Push forward to support the strikers', 'Cross and cut inside to shoot'] },
      { role: 'CM', defensive: ['Protect the lone defender — sit deep when needed', 'Intercept and tackle in the center'], attacking: ['Be the playmaker — find the strikers with through balls', 'Dictate the tempo of the game'] },
      { role: 'RM', defensive: ['Track back to help the defense', 'Mark the opposition left-side player'], attacking: ['Deliver crosses for the two strikers', 'Make overlapping runs on the right'] },
      { role: 'ST', defensive: ['Press the opposition defense together', 'Help midfield by tracking back when needed'], attacking: ['Combine with your strike partner — one-twos and rotations', 'Make runs in behind the defense'] },
      { role: 'ST', defensive: ['Press as a pair — angle runs to force mistakes', 'Drop into midfield when the team is under pressure'], attacking: ['Hold the ball up for the arriving midfielders', 'Attack every cross — be predatory in the box'] },
    ],
  },

  // ===== 5v5 =====
  '121-5v5': {
    formationId: '121-5v5',
    teamDefensive: ['Diamond collapses — everyone behind the ball', 'Defender covers the center, midfielders drop to help', 'Tight marking — in 5v5 every man matters', 'GK sweeps behind the single defender'],
    teamAttacking: ['Quick passing triangles through the diamond', 'Midfielders provide width and options', 'Forward stretches the defense with intelligent movement', 'Build patiently — don\'t rush in small spaces'],
    positionGuides: [
      { role: 'GK', defensive: ['Sweep aggressively — big area to cover', 'Narrow the angle on 1v1 situations'], attacking: ['Start every attack — distribute quickly', 'Play to the widest teammate'] },
      { role: 'DEF', defensive: ['Stay central — cover the middle', 'Delay the attacker — don\'t dive in'], attacking: ['Play forward through the midfielders', 'Step up to create an overload when safe'] },
      { role: 'MID', defensive: ['Track back alongside the defender', 'Close the passing lane through the center'], attacking: ['Provide width on your side — stretch play', 'Combine with the forward — quick passes'] },
      { role: 'MID', defensive: ['Drop back to help — work rate is everything', 'Mark the nearest opponent tightly'], attacking: ['Provide the other wide option', 'Cut inside to shoot or play centrally'] },
      { role: 'FWD', defensive: ['Press the goalkeeper and defender', 'Block the easy pass out from the back'], attacking: ['Move between the opposition defenders', 'Drop deep to receive and turn'] },
    ],
  },

  '211-5v5': {
    formationId: '211-5v5',
    teamDefensive: ['Two defenders cover the width — stay compact', 'Midfielder drops to create a block of three', 'Forward presses to slow the opposition', 'GK commands the area behind the two defenders'],
    teamAttacking: ['Build through the two defenders to the midfielder', 'Midfielder feeds the forward with through balls', 'Defenders push up to compress the space', 'Use the width of the two defenders in build-up'],
    positionGuides: [
      { role: 'GK', defensive: ['Organize the two defenders', 'Rush out to close down breakaways'], attacking: ['Distribute to the wider defender', 'Throw quickly for counter-attacks'] },
      { role: 'DEF', defensive: ['Cover your half of the pitch — stay wide enough', 'Don\'t both commit to the same attacker'], attacking: ['Play forward to the midfielder', 'Push up to squeeze the opposition'] },
      { role: 'DEF', defensive: ['Balance with your partner — if one goes, the other covers', 'Stay goal-side of your opponent always'], attacking: ['Switch play to create space', 'Support the midfielder with overlapping runs'] },
      { role: 'MID', defensive: ['Drop to help the defenders when under pressure', 'Shield and intercept in the center'], attacking: ['Link defense and attack — you are the engine', 'Play quick through balls to the forward'] },
      { role: 'FWD', defensive: ['Press the opposition build-up from the front', 'Force mistakes with your closing down'], attacking: ['Stay on the shoulder of the last defender', 'Drop to receive and lay off for the midfielder'] },
    ],
  },

  '22-5v5': {
    formationId: '22-5v5',
    teamDefensive: ['Two blocks of two — simple and compact', 'Forwards drop to help create a solid shape', 'Cover the passing lanes through the center', 'GK directs traffic from behind'],
    teamAttacking: ['Quick direct play from defense to attack', 'Two forwards combine with each other', 'Defenders push forward together when attacking', 'Use the 2v2 situations at the top — create 1v1 duels'],
    positionGuides: [
      { role: 'GK', defensive: ['Sweep the space behind the two defenders', 'Make yourself big in 1v1 situations'], attacking: ['Quick distribution to either defender', 'Play long for the forwards to run onto'] },
      { role: 'DEF', defensive: ['Stay compact with your partner — cover center', 'Don\'t get pulled out wide and leave a gap'], attacking: ['Play forward quickly to the two strikers', 'Support attacks when in control'] },
      { role: 'DEF', defensive: ['Balance your partner — cover and communicate', 'Track runners making forward runs'], attacking: ['Switch play to change the angle of attack', 'Push up to compress the pitch'] },
      { role: 'FWD', defensive: ['Drop to press and disrupt the build-up', 'Help midfield — track back when needed'], attacking: ['Combine with your partner — 1-2s and rotations', 'Get across the defender to receive passes'] },
      { role: 'FWD', defensive: ['Press together with your partner', 'Block central passing lanes'], attacking: ['Make runs in behind the defense', 'Hold the ball up for the defenders arriving late'] },
    ],
  },

  '112-5v5': {
    formationId: '112-5v5',
    teamDefensive: ['Defender and midfielder form a central spine', 'Two forwards drop to help when under pressure', 'Stay compact — small pitch means quick transitions', 'GK acts as sweeper behind the lone defender'],
    teamAttacking: ['Two forwards provide constant attacking options', 'Midfielder supports with through balls and combinations', 'Quick transitions — get the ball to the forwards fast', 'Use 2v1 situations with the two forwards against one defender'],
    positionGuides: [
      { role: 'GK', defensive: ['Sweep behind the lone defender aggressively', 'Narrow angles on 1v1s quickly'], attacking: ['Play to the midfielder to start the attack', 'Long distribution to the forwards'] },
      { role: 'DEF', defensive: ['Stay central — you are the last line', 'Delay and don\'t dive in — force them wide'], attacking: ['Play forward quickly through midfield', 'Push up to support when the team has control'] },
      { role: 'MID', defensive: ['Drop to help the lone defender — balance the team', 'Close down passing lanes through the center'], attacking: ['Be the link between defense and the two forwards', 'Drive forward to create a 3v2 overload'] },
      { role: 'FWD', defensive: ['Press the opposition build-up from the front', 'Track back when the team is under heavy pressure'], attacking: ['Combine with your strike partner — quick passing', 'Make runs across the defense to create space'] },
      { role: 'FWD', defensive: ['Press alongside your partner — work as a pair', 'Drop to plug gaps when outnumbered'], attacking: ['Stay on the shoulder — ready to run in behind', 'Pull wide to create space for your partner centrally'] },
    ],
  },

  // ===== Futsal 5v5 =====
  '121-futsal': {
    formationId: '121-futsal',
    teamDefensive: ['Diamond collapses into a tight 2-2 shape', 'Fixo anchors the defense — never leaves the center', 'Alas track back to cover the flanks', 'Press the ball aggressively in your own half'],
    teamAttacking: ['Rotate constantly — movement is the key in futsal', 'Quick one-twos through the diamond', 'Pivot stretches the defense and receives with back to goal', 'Use the angles — always provide a passing option'],
    positionGuides: [
      { role: 'GK', defensive: ['Rush out to close 1v1 situations — be aggressive', 'Organize the Fixo — constant communication'], attacking: ['Start every attack with a quick throw or roll', 'Act as an outfield player when team has the ball in own half'] },
      { role: 'Fixo', defensive: ['Anchor the defense — stay central and cover', 'Delay the attack and force wide — never commit'], attacking: ['Start the build-up play with precise short passes', 'Drive forward to create an overload in the center'] },
      { role: 'Ala', defensive: ['Track back to create a flat line with the Fixo', 'Mark your opponent tightly — deny the turn'], attacking: ['Provide width and options on your side', 'Make diagonal runs behind the defense — timing is everything'] },
      { role: 'Ala', defensive: ['Drop to cover the opposite flank from the ball', 'Press aggressively when the ball is on your side'], attacking: ['Cut inside to shoot or play the through ball', 'Rotate positions with the Pivot to create confusion'] },
      { role: 'Pivot', defensive: ['Press the opposition Fixo to disrupt their build-up', 'Drop to help the Alas when the team is defending deep'], attacking: ['Receive with your back to goal and lay off', 'Spin in behind the defense for through balls — movement is crucial'] },
    ],
  },

  '22-futsal': {
    formationId: '22-futsal',
    teamDefensive: ['Flat 2-2 shape — cover the width of the court', 'Front two drop to help — form a compact square', 'Switch quickly between man-marking and zonal', 'Goalkeeper rushes out for 1v1 situations'],
    teamAttacking: ['Quick rotations between the pairs', 'Play through the center with one-touch passing', 'Use give-and-go combinations to break the press', 'Both Alas can push forward to create 3v2 situations'],
    positionGuides: [
      { role: 'GK', defensive: ['Be aggressive — narrow angles quickly', 'Organize the Fixos — communication is everything'], attacking: ['Distribute quickly to start fast attacks', 'Join the attack as a 5th player in power play'] },
      { role: 'Fixo', defensive: ['Stay in your half — cover the center and your side', 'Don\'t both commit — if one presses, the other covers'], attacking: ['Play short accurate passes to the Alas', 'Drive forward when space opens'] },
      { role: 'Fixo', defensive: ['Balance your partner — cover the space they leave', 'Intercept passes through the center'], attacking: ['Switch play to the opposite Ala', 'Support attacks from a deeper position'] },
      { role: 'Ala', defensive: ['Drop to press in your own half', 'Track the nearest opponent tightly'], attacking: ['Rotate with your Ala partner — swap sides frequently', 'Shoot on sight — don\'t hesitate'] },
      { role: 'Ala', defensive: ['Mark your opponent — deny them space', 'Help the Fixos when defending deep'], attacking: ['Make runs behind the defense — be the outlet', 'Combine with quick 1-2s to create shooting chances'] },
    ],
  },

  '31-futsal': {
    formationId: '31-futsal',
    teamDefensive: ['Three defenders form a solid wall across the court', 'Pivot drops to help when under extreme pressure', 'Close the center — force wide and deny the shot', 'GK is the last line — stay big and aggressive'],
    teamAttacking: ['Build through the three Fixos patiently', 'Pivot is the target — play into them and support', 'Wide Fixos push forward to create width', 'Quick transitions through the center to the Pivot'],
    positionGuides: [
      { role: 'GK', defensive: ['Command the area — dominate 1v1s', 'Organize the three defenders'], attacking: ['Distribute to the wide Fixo quickly', 'Play the Pivot in behind with long passes'] },
      { role: 'Fixo', defensive: ['Cover the left side of the court', 'Stay disciplined — don\'t leave your zone'], attacking: ['Push forward to provide width on the left', 'Play into the Pivot and make a run to support'] },
      { role: 'Fixo', defensive: ['Anchor the center — the deepest defender', 'Organize the other two Fixos'], attacking: ['Start the build-up from deep', 'Play through balls to the Pivot'] },
      { role: 'Fixo', defensive: ['Cover the right side of the court', 'Track runners on your side'], attacking: ['Push forward on the right flank', 'Deliver passes into the Pivot'] },
      { role: 'Pivot', defensive: ['Press the opposition build-up from the front', 'Track back to make it a 4-0 shape when needed'], attacking: ['Be the target — receive with back to goal', 'Spin and shoot — be clinical in front of goal'] },
    ],
  },

  '40-futsal': {
    formationId: '40-futsal',
    teamDefensive: ['All four drop into a flat line across the court', 'Man-mark the nearest opponent', 'Press together as a unit — don\'t leave gaps', 'Rotate defensive assignments as opponents move'],
    teamAttacking: ['Constant rotation — no fixed positions', 'One player always making a run, others provide options', 'Create space with movement off the ball', 'Play one-touch football to move the defense around'],
    positionGuides: [
      { role: 'GK', defensive: ['Be ready — no fixed defense means 1v1s can happen fast', 'Rush out aggressively when needed'], attacking: ['Start every attack — you are player #5', 'Join the rotation in your own half to keep the ball'] },
      { role: 'Ala', defensive: ['Mark the nearest opponent — track them everywhere', 'Rotate your defensive assignment as players move'], attacking: ['Make runs continuously — never stop moving', 'Rotate from wide to central to wide — create confusion'] },
      { role: 'Fixo', defensive: ['Provide balance — be the deepest when others push up', 'Cover the space behind the rotating players'], attacking: ['Start the attacks and then rotate forward', 'Drive through the center when space opens'] },
      { role: 'Ala', defensive: ['Track your man — in 4-0 you must be disciplined', 'Communicate constantly about who you\'re covering'], attacking: ['Interchange positions fluidly', 'Look for 1v1 situations to exploit'] },
      { role: 'Pivot', defensive: ['Drop to be the pressing trigger at the top', 'Track back into the flat four when deep defending'], attacking: ['Make the final pass or finish — be the end product', 'Peel off defenders with clever movement'] },
    ],
  },
};

export function getTacticGuide(formationId: string): TacticGuide | null {
  return guides[formationId] || null;
}

export function getAllGuideIds(): string[] {
  return Object.keys(guides);
}
