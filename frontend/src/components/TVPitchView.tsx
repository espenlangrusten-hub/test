import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  Platform, GestureResponderEvent,
} from 'react-native';

interface PositionSlot {
  x: number;
  y: number;
  role: string;
}

interface PlayerInfo {
  id: string;
  name: string;
  number: number;
  is_captain: boolean;
}

interface TVPitchViewProps {
  positions: PositionSlot[];
  assignedPlayers: { [key: number]: PlayerInfo | null };
  onPositionPress?: (index: number) => void;
  compact?: boolean;
  sport?: string;
  draggable?: boolean;
  onPositionDrag?: (index: number, newX: number, newY: number) => void;
  selectedIndex?: number | null;
}

// Perspective transforms: map flat coords to 3D-projected coords
// The pitch narrows at the top (far end) and is wider at the bottom (near end)
const perspectiveMap = (x: number, y: number, w: number, h: number) => {
  // y=0 is top (far), y=100 is bottom (near)
  const yNorm = y / 100;
  // Horizontal squeeze: at top we use ~70% width, at bottom 100%
  const squeeze = 0.72 + 0.28 * yNorm;
  const cx = w / 2;
  const px = cx + (x / 100 - 0.5) * w * squeeze;
  const py = (y / 100) * h;
  return { px, py };
};

function DraggableDot({
  index, posX, posY, pitchW, pitchH, dotSize, fontSize,
  player, posRole, onDragEnd,
}: {
  index: number; posX: number; posY: number;
  pitchW: number; pitchH: number; dotSize: number; fontSize: number;
  player: PlayerInfo | null; posRole: string;
  onDragEnd: (idx: number, x: number, y: number) => void;
}) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const startRef = useRef({ x: 0, y: 0 });

  const { px: basePx, py: basePy } = perspectiveMap(posX, posY, pitchW, pitchH);
  const left = basePx - dotSize / 2 + offset.x;
  const top = basePy - dotSize / 2 + offset.y;

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      e.preventDefault();
      setOffset({ x: e.clientX - startRef.current.x, y: e.clientY - startRef.current.y });
    };
    const handleUp = (e: PointerEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      const dx = e.clientX - startRef.current.x;
      const dy = e.clientY - startRef.current.y;
      // Reverse perspective to get new percentage coordinates
      const newPxX = basePx + dx;
      const newPxY = basePy + dy;
      const newPctY = Math.max(5, Math.min(95, (newPxY / pitchH) * 100));
      const yNorm = newPctY / 100;
      const squeeze = 0.72 + 0.28 * yNorm;
      const cx = pitchW / 2;
      const newPctX = Math.max(5, Math.min(95, ((newPxX - cx) / (pitchW * squeeze) + 0.5) * 100));
      setOffset({ x: 0, y: 0 });
      onDragEnd(index, Math.round(newPctX * 10) / 10, Math.round(newPctY * 10) / 10);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
      }
    };
  }, [posX, posY, pitchW, pitchH, index, onDragEnd, basePx, basePy]);

  const handlePointerDown = useCallback((e: any) => {
    isDragging.current = true;
    startRef.current = { x: e.nativeEvent?.clientX ?? e.clientX, y: e.nativeEvent?.clientY ?? e.clientY };
    setOffset({ x: 0, y: 0 });
  }, []);

  const onGrant = useCallback((e: GestureResponderEvent) => {
    isDragging.current = true;
    startRef.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
  }, []);
  const onMove = useCallback((e: GestureResponderEvent) => {
    if (!isDragging.current) return;
    setOffset({ x: e.nativeEvent.pageX - startRef.current.x, y: e.nativeEvent.pageY - startRef.current.y });
  }, []);
  const onRelease = useCallback((e: GestureResponderEvent) => {
    isDragging.current = false;
    const dx = e.nativeEvent.pageX - startRef.current.x;
    const dy = e.nativeEvent.pageY - startRef.current.y;
    const newPxX = basePx + dx;
    const newPxY = basePy + dy;
    const newPctY = Math.max(5, Math.min(95, (newPxY / pitchH) * 100));
    const yNorm = newPctY / 100;
    const squeeze = 0.72 + 0.28 * yNorm;
    const cx = pitchW / 2;
    const newPctX = Math.max(5, Math.min(95, ((newPxX - cx) / (pitchW * squeeze) + 0.5) * 100));
    setOffset({ x: 0, y: 0 });
    onDragEnd(index, Math.round(newPctX * 10) / 10, Math.round(newPctY * 10) / 10);
  }, [posX, posY, pitchW, pitchH, index, onDragEnd, basePx, basePy]);

  const viewProps = Platform.OS === 'web'
    ? { onPointerDown: handlePointerDown }
    : {
        onStartShouldSetResponder: () => true,
        onMoveShouldSetResponder: () => true,
        onResponderGrant: onGrant,
        onResponderMove: onMove,
        onResponderRelease: onRelease,
        onResponderTerminate: onRelease,
      };

  const nameParts = player?.name?.split(' ') || [];
  const firstName = nameParts.length > 1 ? nameParts[0] : '';
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0] || '';

  return (
    <View style={{ position: 'absolute', alignItems: 'center', zIndex: 10 }}>
      <View
        testID={`pitch-position-${index}`}
        {...viewProps}
        style={{
          position: 'absolute',
          left: left,
          top: top,
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: player ? '#DC2626' : 'rgba(255,255,255,0.12)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10,
          // @ts-ignore
          cursor: 'grab',
          userSelect: 'none',
          touchAction: 'none',
        }}
      />
      {player && (
        <View
          style={{
            position: 'absolute',
            left: left + dotSize / 2 - 40,
            top: top + dotSize + 2,
            width: 80,
            alignItems: 'center',
          }}
          pointerEvents="none"
        >
          {firstName ? <Text style={s.nameFirst}>{player.is_captain ? '(C) ' : ''}{firstName}</Text> : null}
          <Text style={s.nameLast}>{!firstName && player.is_captain ? '(C) ' : ''}{lastName}</Text>
        </View>
      )}
      {!player && (
        <View
          style={{
            position: 'absolute',
            left: left + dotSize / 2 - 20,
            top: top + dotSize + 1,
            width: 40,
            alignItems: 'center',
          }}
          pointerEvents="none"
        >
          <Text style={s.roleLabel}>{posRole}</Text>
        </View>
      )}
    </View>
  );
}

export default function TVPitchView({
  positions,
  assignedPlayers,
  onPositionPress,
  compact = false,
  sport = 'football',
  draggable = false,
  onPositionDrag,
  selectedIndex = null,
}: TVPitchViewProps) {
  const screenWidth = Dimensions.get('window').width;
  const w = screenWidth - 32;
  const h = compact ? w * 1.2 : w * 1.45;
  const dotSize = compact ? 14 : 16;

  // Perspective line helpers
  const line = (x1p: number, y1p: number, x2p: number, y2p: number) => {
    const p1 = perspectiveMap(x1p, y1p, w, h);
    const p2 = perspectiveMap(x2p, y2p, w, h);
    return { p1, p2 };
  };

  // Draw line as absolutely positioned view
  const PitchLine = ({ x1, y1, x2, y2, opacity = 0.4 }: { x1: number; y1: number; x2: number; y2: number; opacity?: number }) => {
    const p1 = perspectiveMap(x1, y1, w, h);
    const p2 = perspectiveMap(x2, y2, w, h);
    const dx = p2.px - p1.px;
    const dy = p2.py - p1.py;
    const len = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    return (
      <View
        style={{
          position: 'absolute',
          left: p1.px,
          top: p1.py - 0.5,
          width: len,
          height: 1,
          backgroundColor: `rgba(255,255,255,${opacity})`,
          transform: [{ rotate: `${angle}deg` }],
          transformOrigin: '0 50%',
        }}
        pointerEvents="none"
      />
    );
  };

  // Approximate ellipse with line segments
  const EllipseLines = ({ cx, cy, rx, ry, segments = 40, opacity = 0.35 }: { cx: number; cy: number; rx: number; ry: number; segments?: number; opacity?: number }) => {
    const lines = [];
    for (let i = 0; i < segments; i++) {
      const a1 = (i / segments) * 2 * Math.PI;
      const a2 = ((i + 1) / segments) * 2 * Math.PI;
      const x1 = cx + rx * Math.cos(a1);
      const y1 = cy + ry * Math.sin(a1);
      const x2 = cx + rx * Math.cos(a2);
      const y2 = cy + ry * Math.sin(a2);
      lines.push(<PitchLine key={`e-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} opacity={opacity} />);
    }
    return <>{lines}</>;
  };

  // Arc for penalty area (half circle)
  const ArcLines = ({ cx, cy, rx, ry, startAngle, endAngle, segments = 20, opacity = 0.35 }: { cx: number; cy: number; rx: number; ry: number; startAngle: number; endAngle: number; segments?: number; opacity?: number }) => {
    const lines = [];
    for (let i = 0; i < segments; i++) {
      const a1 = startAngle + (i / segments) * (endAngle - startAngle);
      const a2 = startAngle + ((i + 1) / segments) * (endAngle - startAngle);
      const x1 = cx + rx * Math.cos(a1);
      const y1 = cy + ry * Math.sin(a1);
      const x2 = cx + rx * Math.cos(a2);
      const y2 = cy + ry * Math.sin(a2);
      lines.push(<PitchLine key={`a-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} opacity={opacity} />);
    }
    return <>{lines}</>;
  };

  return (
    <View style={[s.pitch, { width: w, height: h }]}>
      {/* Dark pitch background */}
      <View style={[s.pitchBg, { width: w, height: h }]} />

      {/* === PITCH MARKINGS === */}

      {/* Outer boundary */}
      <PitchLine x1={0} y1={0} x2={100} y2={0} opacity={0.45} />
      <PitchLine x1={100} y1={0} x2={100} y2={100} opacity={0.45} />
      <PitchLine x1={100} y1={100} x2={0} y2={100} opacity={0.45} />
      <PitchLine x1={0} y1={100} x2={0} y2={0} opacity={0.45} />

      {/* Center line */}
      <PitchLine x1={0} y1={50} x2={100} y2={50} opacity={0.35} />

      {/* Center circle */}
      <EllipseLines cx={50} cy={50} rx={12} ry={8} opacity={0.3} />

      {/* Center dot */}
      {(() => {
        const { px, py } = perspectiveMap(50, 50, w, h);
        return <View style={{ position: 'absolute', left: px - 3, top: py - 3, width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' }} pointerEvents="none" />;
      })()}

      {/* TOP penalty area (far end) */}
      <PitchLine x1={22} y1={0} x2={22} y2={16} opacity={0.35} />
      <PitchLine x1={78} y1={0} x2={78} y2={16} opacity={0.35} />
      <PitchLine x1={22} y1={16} x2={78} y2={16} opacity={0.35} />

      {/* TOP goal area */}
      <PitchLine x1={34} y1={0} x2={34} y2={6} opacity={0.35} />
      <PitchLine x1={66} y1={0} x2={66} y2={6} opacity={0.35} />
      <PitchLine x1={34} y1={6} x2={66} y2={6} opacity={0.35} />

      {/* TOP penalty arc */}
      <ArcLines cx={50} cy={16} rx={10} ry={5} startAngle={0} endAngle={Math.PI} segments={16} opacity={0.25} />

      {/* BOTTOM penalty area (near end) */}
      <PitchLine x1={22} y1={100} x2={22} y2={84} opacity={0.4} />
      <PitchLine x1={78} y1={100} x2={78} y2={84} opacity={0.4} />
      <PitchLine x1={22} y1={84} x2={78} y2={84} opacity={0.4} />

      {/* BOTTOM goal area */}
      <PitchLine x1={34} y1={100} x2={34} y2={94} opacity={0.4} />
      <PitchLine x1={66} y1={100} x2={66} y2={94} opacity={0.4} />
      <PitchLine x1={34} y1={94} x2={66} y2={94} opacity={0.4} />

      {/* BOTTOM penalty arc */}
      <ArcLines cx={50} cy={84} rx={10} ry={5} startAngle={Math.PI} endAngle={2 * Math.PI} segments={16} opacity={0.3} />

      {/* Bottom goal posts */}
      {(() => {
        const gl = perspectiveMap(40, 100, w, h);
        const gr = perspectiveMap(60, 100, w, h);
        return (
          <View style={{ position: 'absolute', left: gl.px, top: gl.py, width: gr.px - gl.px, height: 3, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 1 }} pointerEvents="none" />
        );
      })()}

      {/* Top goal posts */}
      {(() => {
        const gl = perspectiveMap(40, 0, w, h);
        const gr = perspectiveMap(60, 0, w, h);
        return (
          <View style={{ position: 'absolute', left: gl.px, top: gl.py - 2, width: gr.px - gl.px, height: 3, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 1 }} pointerEvents="none" />
        );
      })()}

      {/* === PLAYER POSITIONS === */}
      {positions.map((pos, index) => {
        const player = assignedPlayers[index];
        const { px, py } = perspectiveMap(pos.x, pos.y, w, h);
        const isSelected = selectedIndex === index;

        if (draggable && onPositionDrag) {
          return (
            <DraggableDot
              key={`drag-${index}`}
              index={index}
              posX={pos.x}
              posY={pos.y}
              pitchW={w}
              pitchH={h}
              dotSize={dotSize}
              fontSize={10}
              player={player}
              posRole={pos.role}
              onDragEnd={onPositionDrag}
            />
          );
        }

        const nameParts = player?.name?.split(' ') || [];
        const firstName = nameParts.length > 1 ? nameParts[0] : '';
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0] || '';

        return (
          <React.Fragment key={`pos-${index}`}>
            <TouchableOpacity
              testID={`pitch-position-${index}`}
              style={{
                position: 'absolute',
                left: px - dotSize / 2,
                top: py - dotSize / 2,
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                backgroundColor: player ? '#DC2626' : 'rgba(255,255,255,0.12)',
                borderWidth: isSelected ? 2 : 0,
                borderColor: isSelected ? '#FFD700' : 'transparent',
                zIndex: 10,
                transform: isSelected ? [{ scale: 1.3 }] : [],
              }}
              onPress={() => onPositionPress?.(index)}
              activeOpacity={0.7}
            />
            {player && (
              <View
                style={{
                  position: 'absolute',
                  left: px - 44,
                  top: py + dotSize / 2 + 2,
                  width: 88,
                  alignItems: 'center',
                  zIndex: 5,
                }}
                pointerEvents="none"
              >
                {firstName ? <Text style={s.nameFirst} numberOfLines={1}>{player.is_captain ? '(C) ' : ''}{firstName}</Text> : null}
                <Text style={s.nameLast} numberOfLines={1}>{!firstName && player.is_captain ? '(C) ' : ''}{lastName}</Text>
              </View>
            )}
            {!player && (
              <View
                style={{
                  position: 'absolute',
                  left: px - 20,
                  top: py + dotSize / 2 + 1,
                  width: 40,
                  alignItems: 'center',
                  zIndex: 5,
                }}
                pointerEvents="none"
              >
                <Text style={s.roleLabel}>{pos.role}</Text>
              </View>
            )}
          </React.Fragment>
        );
      })}

      {/* Drag mode hint */}
      {draggable && (
        <View style={s.dragHint} pointerEvents="none">
          <Text style={s.dragHintText}>DRAG TO REPOSITION</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  pitch: {
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
    alignSelf: 'center',
  },
  pitchBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#1A1D23',
    borderRadius: 6,
  },
  nameFirst: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '400',
    textAlign: 'center',
  },
  nameLast: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '800',
    textAlign: 'center',
  },
  roleLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
    textAlign: 'center',
  },
  dragHint: {
    position: 'absolute',
    top: 6,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  dragHintText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFD700',
    letterSpacing: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
    overflow: 'hidden',
  },
});
