import React, { useRef, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  Animated, PanResponder,
} from 'react-native';
import { Colors } from '../constants/colors';

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

interface PitchViewProps {
  positions: PositionSlot[];
  assignedPlayers: { [key: number]: PlayerInfo | null };
  onPositionPress?: (index: number) => void;
  compact?: boolean;
  sport?: string;
  draggable?: boolean;
  onPositionDrag?: (index: number, newX: number, newY: number) => void;
}

function DraggableDot({
  index, posX, posY, pitchW, pitchH, dotSize, fontSize,
  player, posRole, onDragEnd,
}: {
  index: number; posX: number; posY: number;
  pitchW: number; pitchH: number; dotSize: number; fontSize: number;
  player: PlayerInfo | null; posRole: string;
  onDragEnd: (idx: number, x: number, y: number) => void;
}) {
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  useEffect(() => {
    pan.setValue({ x: 0, y: 0 });
  }, [posX, posY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          pan.setOffset({
            x: (pan.x as any)._value || 0,
            y: (pan.y as any)._value || 0,
          });
          pan.setValue({ x: 0, y: 0 });
        },
        onPanResponderMove: (_, gs) => {
          pan.setValue({ x: gs.dx, y: gs.dy });
        },
        onPanResponderRelease: (_, gs) => {
          pan.flattenOffset();
          const basePxX = (posX / 100) * pitchW;
          const basePxY = (posY / 100) * pitchH;
          const newPctX = Math.max(5, Math.min(95, ((basePxX + gs.dx) / pitchW) * 100));
          const newPctY = Math.max(5, Math.min(95, ((basePxY + gs.dy) / pitchH) * 100));
          onDragEnd(index, Math.round(newPctX * 10) / 10, Math.round(newPctY * 10) / 10);
        },
      }),
    [posX, posY, pitchW, pitchH, index]
  );

  const px = (posX / 100) * pitchW - dotSize / 2;
  const py = (posY / 100) * pitchH - dotSize / 2;

  return (
    <Animated.View
      testID={`pitch-position-${index}`}
      style={[
        styles.playerDot,
        {
          left: px,
          top: py,
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: player ? Colors.primary : 'rgba(255,255,255,0.15)',
          borderColor: '#FFD700',
          borderWidth: 2.5,
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
          zIndex: 10,
        },
      ]}
      {...panResponder.panHandlers}
    >
      {player ? (
        <Text style={[styles.playerNumber, { fontSize }]}>{player.number}</Text>
      ) : (
        <Text style={[styles.posLabel, { fontSize: fontSize - 3 }]}>{posRole}</Text>
      )}
    </Animated.View>
  );
}

export default function PitchView({
  positions,
  assignedPlayers,
  onPositionPress,
  compact = false,
  sport = 'football',
  draggable = false,
  onPositionDrag,
}: PitchViewProps) {
  const screenWidth = Dimensions.get('window').width;
  const w = screenWidth - 32;
  const h = compact ? w * 1.1 : w * 1.35;
  const dotSize = compact ? 30 : 36;
  const fontSize = compact ? 11 : 14;

  return (
    <View style={[styles.pitch, { width: w, height: h }]}>
      {/* Grass stripes */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <View
          key={`stripe-${i}`}
          style={[
            styles.grassStripe,
            {
              top: (h / 8) * i,
              height: h / 8,
              backgroundColor: i % 2 === 0 ? Colors.pitchGreen : Colors.pitchGreenLight,
            },
          ]}
        />
      ))}

      {/* Center line */}
      <View style={[styles.centerLine, { top: h / 2 - 0.5, width: w - 4 }]} />

      {/* Center circle */}
      <View
        style={[
          styles.centerCircle,
          {
            top: h / 2 - w * 0.12,
            left: w / 2 - w * 0.12,
            width: w * 0.24,
            height: w * 0.24,
            borderRadius: w * 0.12,
          },
        ]}
      />

      {/* Center dot */}
      <View style={[styles.centerDot, { top: h / 2 - 3, left: w / 2 - 3 }]} />

      {/* Top penalty area */}
      <View style={[styles.areaBox, { top: 0, left: w * 0.22, width: w * 0.56, height: h * 0.16 }]} />
      <View style={[styles.areaBox, { top: 0, left: w * 0.34, width: w * 0.32, height: h * 0.065 }]} />

      {/* Bottom penalty area */}
      <View style={[styles.areaBox, { bottom: 0, left: w * 0.22, width: w * 0.56, height: h * 0.16 }]} />
      <View style={[styles.areaBox, { bottom: 0, left: w * 0.34, width: w * 0.32, height: h * 0.065 }]} />

      {/* Goals */}
      <View style={[styles.goalLine, { top: -2, left: w * 0.4, width: w * 0.2 }]} />
      <View style={[styles.goalLine, { bottom: -2, left: w * 0.4, width: w * 0.2 }]} />

      {/* Player positions */}
      {positions.map((pos, index) => {
        const player = assignedPlayers[index];

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
              fontSize={fontSize}
              player={player}
              posRole={pos.role}
              onDragEnd={onPositionDrag}
            />
          );
        }

        const px = (pos.x / 100) * w - dotSize / 2;
        const py = (pos.y / 100) * h - dotSize / 2;

        return (
          <TouchableOpacity
            key={`pos-${index}`}
            testID={`pitch-position-${index}`}
            style={[
              styles.playerDot,
              {
                left: px,
                top: py,
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                backgroundColor: player ? Colors.primary : 'rgba(255,255,255,0.15)',
                borderColor: player ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
              },
            ]}
            onPress={() => onPositionPress?.(index)}
            activeOpacity={0.7}
          >
            {player ? (
              <Text style={[styles.playerNumber, { fontSize }]}>{player.number}</Text>
            ) : (
              <Text style={[styles.posLabel, { fontSize: fontSize - 3 }]}>{pos.role}</Text>
            )}
          </TouchableOpacity>
        );
      })}

      {/* Player names */}
      {positions.map((pos, index) => {
        const player = assignedPlayers[index];
        if (!player) return null;
        const px = (pos.x / 100) * w;
        const py = (pos.y / 100) * h + dotSize / 2 + 1;
        const nameWidth = 60;
        return (
          <View
            key={`name-${index}`}
            style={[styles.nameContainer, { left: px - nameWidth / 2, top: py, width: nameWidth }]}
            pointerEvents="none"
          >
            <Text style={styles.playerName} numberOfLines={1}>
              {player.is_captain ? '©' : ''}{player.name.split(' ').pop()}
            </Text>
          </View>
        );
      })}

      {/* Drag mode hint */}
      {draggable && (
        <View style={styles.dragHint} pointerEvents="none">
          <Text style={styles.dragHintText}>DRAG TO REPOSITION</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pitch: {
    borderWidth: 2,
    borderColor: Colors.pitchLine,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    alignSelf: 'center',
  },
  grassStripe: { position: 'absolute', left: 0, right: 0 },
  centerLine: { position: 'absolute', height: 1, left: 2, backgroundColor: Colors.pitchLine },
  centerCircle: { position: 'absolute', borderWidth: 1, borderColor: Colors.pitchLine },
  centerDot: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.pitchLine },
  areaBox: { position: 'absolute', borderWidth: 1, borderColor: Colors.pitchLine },
  goalLine: { position: 'absolute', height: 4, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 2 },
  playerDot: {
    position: 'absolute', justifyContent: 'center', alignItems: 'center', borderWidth: 2,
  },
  playerNumber: { color: '#FFFFFF', fontWeight: '900' },
  posLabel: { color: 'rgba(255,255,255,0.5)', fontWeight: '700' },
  nameContainer: { position: 'absolute', alignItems: 'center' },
  playerName: { color: '#FFFFFF', fontSize: 9, fontWeight: '700', textAlign: 'center' },
  dragHint: { position: 'absolute', top: 6, left: 0, right: 0, alignItems: 'center' },
  dragHintText: {
    fontSize: 10, fontWeight: '800', color: '#FFD700', letterSpacing: 2,
    backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 4, overflow: 'hidden',
  },
});
