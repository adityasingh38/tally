// src/tally/TallyMark.js
// The tally-mark symbol (4 bars + diagonal slash = "5"), drawn with react-native-svg.
// Pure geometry → crisp at any size. `jitter` adds the hand-drawn "scrappy" feel.
import React from 'react';
import Svg, { Rect, G } from 'react-native-svg';

const JIT = [
  { r: -2.5, dh: 0, dy: 0 },
  { r: 1.8, dh: 0.05, dy: -1 },
  { r: -1.2, dh: -0.03, dy: 1 },
  { r: 2.6, dh: 0.02, dy: 0 },
];

export default function TallyMark({ size = 40, color = '#fff', jitter = false, cap = false }) {
  // viewBox is sized so 4 bars + slash fit with a little headroom for the slash overshoot.
  const H = 100;                 // bar height in viewBox units
  const stroke = H * 0.165;
  const gap = H * 0.20;
  const r = cap ? stroke / 2 : stroke * 0.22;
  const totalW = 4 * stroke + 3 * gap;
  const vbW = totalW;
  const vbH = H * 1.34;          // room for slash
  const baseY = vbH - (vbH - H) / 2; // bottom of bars, vertically centred
  const cx = vbW / 2;

  const bars = [];
  for (let i = 0; i < 4; i++) {
    const j = jitter ? JIT[i] : { r: 0, dh: 0, dy: 0 };
    const bh = H * (1 + j.dh);
    const x = i * (stroke + gap);
    const top = baseY - bh + j.dy * (H / 66);
    const bcx = x + stroke / 2, bcy = top + bh / 2;
    bars.push(
      <Rect key={i} x={x} y={top} width={stroke} height={bh} rx={r} fill={color}
        transform={j.r ? `rotate(${j.r} ${bcx} ${bcy})` : undefined} />
    );
  }
  const sw = stroke * (jitter ? 1.05 : 1) * 0.95;
  const sh = H * 1.34;
  const scy = baseY - H / 2;

  // keep aspect ratio: width scales from `size` (height)
  const aspect = vbW / vbH;
  return (
    <Svg width={size * aspect} height={size} viewBox={`0 0 ${vbW} ${vbH}`}>
      <G>
        {bars}
        <Rect x={cx - sw / 2} y={scy - sh / 2} width={sw} height={sh} rx={r} fill={color}
          transform={`rotate(${jitter ? 60 : 61} ${cx} ${scy})`} />
      </G>
    </Svg>
  );
}
