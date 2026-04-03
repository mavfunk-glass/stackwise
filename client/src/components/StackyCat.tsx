import {
  createContext,
  useContext,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { isPro } from '../types/storage';

// ─────────────────────────────────────────────────────────────────────────────
// 🐱 STACKY IMAGE, CHANGE THESE TWO LINES TO SWAP STACKY'S APPEARANCE EVERYWHERE
// Set STACKY_USE_FALLBACK = false and STACKY_IMAGE_SRC to your image URL or path
// Image should be square, 400×400px+, transparent background preferred
// ─────────────────────────────────────────────────────────────────────────────
export const STACKY_IMAGE_SRC = '/stacky-cat.png';
export const STACKY_USE_FALLBACK = true; // set false once you have a real image
// ─────────────────────────────────────────────────────────────────────────────

export type StackyMood =
  | 'wave'
  | 'think'
  | 'happy'
  | 'excited'
  | 'sleep'
  | 'flex'
  | 'celebrate'
  | 'love'
  | 'sad'
  | 'nervous'
  | 'cool'
  | 'surprised';

export type StackyOutfit =
  | 'default'
  | 'labCoat'
  | 'chef'
  | 'graduation'
  | 'party'
  | 'crown'
  | 'wizard'
  | 'workout'
  | 'superhero'
  | 'cowboy';

interface StackyCatProps {
  mood?: StackyMood;
  size?: number;
  className?: string;
  speaking?: boolean;
  bubble?: ReactNode;
  bubblePosition?: 'right' | 'left' | 'top';
  /**
   * When `bubblePosition` is `top`, vertical space reserved above the cat so the bubble does not
   * overlap preceding content. Default 128. Increase for long multi-line bubbles.
   */
  topBubbleReservePx?: number;
  /** Costume override for free/basic users. Pro always uses cowboy hat globally. */
  outfit?: StackyOutfit;
  /** Gentle bob animation (e.g. dashboard / fact popups). */
  animate?: boolean;
}

// ─── CHIBI DESIGN CONSTANTS ──────────────────────────────────────────────────
const C_LIGHT = {
  /** Tuxedo: black/white cat (body); tail uses same fur */
  fur: '#1E1E1E',
  furMid: '#2E2E2E',
  furOutline: '#0D0D0D',
  bib: '#EEF0EE',
  pawWhite: '#F4F3F1',
  orange: '#1E1E1E',
  orangeShad: '#2E2E2E',
  cream: '#EEF0EE',
  innerEar: '#FFB09A',
  outline: '#0D0D0D',
  eye: '#1A0A00',
  iris: '#3D1A00',
  nose: '#C87060',
  cheek: 'rgba(220,70,40,0.22)',
  cheekSad: 'rgba(180,160,200,0.22)',
  shine: '#FFFFFF',
  spark: '#E8A020',
  tear: '#A8C8E8',
  brow: '#1A0A00',
  whisker: '#D0C0A8',
  collar: '#1C3A2E',
  bell: '#E8A020',
  bellDark: '#9A5C10',
  sw: 5,    // main stroke width
  swMd: 4,    // medium
  swSm: 3.5,
  swXs: 2.2,
  swW: 1.2,
  labWhite: '#F7F7F5',
  chefWhite: '#F4F4F2',
  gradBlue: '#3B5BA5',
  wizPurple: '#7C3AED',
  goldColor: '#E8A020',
  goldDark: '#9A5C10',
  cape: '#7C3AED',
  green: '#4A7C59',
  party: '#FF6B9D',
  partyBlue: '#4A9EFF',
  partyYell: '#FFE082',
  partyGrn: '#98FF82',
  heart: '#E85555',
};

/** Dark mode: orange tabby — reads on deep green surfaces; aligns with brand Stacky orange */
const C_DARK_ORANGE: typeof C_LIGHT = {
  ...C_LIGHT,
  fur: '#F5924A',
  furMid: '#E07A35',
  furOutline: '#7A3E18',
  bib: '#FFF5EB',
  pawWhite: '#FFFAF4',
  orange: '#F5924A',
  orangeShad: '#C85A20',
  cream: '#FFF5EB',
  innerEar: '#FF9A7A',
  outline: '#5C2810',
  cheek: 'rgba(255,120,70,0.32)',
  cheekSad: 'rgba(180,160,200,0.22)',
  whisker: '#E8D4C4',
};

type StackyPalette = typeof C_LIGHT;
const StackyPaletteContext = createContext<StackyPalette>(C_LIGHT);

// ─── FLUFFY TAIL ──────────────────────────────────────────────────────────────
// Stacked overlapping circles = milkkoyo-style cloud puffs
// sad/nervous = thin flat path (no puff, defeated cat)
function FluffyTail({ mood }: { mood: StackyMood }) {
  const C = useContext(StackyPaletteContext);
  // Each puff array goes from body connection outward to tip
  const PUFFS: Record<string, { cx: number; cy: number; r: number }[]> = {
    wave: [{ cx: 98, cy: 98, r: 10 }, { cx: 110, cy: 84, r: 12 }, { cx: 116, cy: 68, r: 13 }, { cx: 114, cy: 50, r: 12 }, { cx: 106, cy: 36, r: 11 }],
    excited: [{ cx: 74, cy: 94, r: 10 }, { cx: 78, cy: 76, r: 13 }, { cx: 80, cy: 58, r: 14 }, { cx: 78, cy: 40, r: 15 }, { cx: 74, cy: 22, r: 14 }],
    celebrate: [{ cx: 74, cy: 94, r: 10 }, { cx: 78, cy: 76, r: 13 }, { cx: 80, cy: 58, r: 14 }, { cx: 78, cy: 40, r: 15 }, { cx: 74, cy: 22, r: 14 }],
    happy: [{ cx: 96, cy: 100, r: 9 }, { cx: 108, cy: 88, r: 11 }, { cx: 114, cy: 72, r: 12 }, { cx: 110, cy: 57, r: 11 }, { cx: 102, cy: 44, r: 10 }],
    love: [{ cx: 96, cy: 100, r: 9 }, { cx: 108, cy: 88, r: 11 }, { cx: 114, cy: 72, r: 12 }, { cx: 110, cy: 57, r: 11 }, { cx: 102, cy: 44, r: 10 }],
    think: [{ cx: 42, cy: 114, r: 9 }, { cx: 28, cy: 108, r: 10 }, { cx: 20, cy: 96, r: 10 }, { cx: 24, cy: 82, r: 9 }],
    sleep: [{ cx: 50, cy: 118, r: 8 }, { cx: 36, cy: 116, r: 8 }, { cx: 26, cy: 108, r: 8 }, { cx: 26, cy: 98, r: 7 }, { cx: 34, cy: 90, r: 7 }],
    flex: [{ cx: 96, cy: 96, r: 9 }, { cx: 108, cy: 82, r: 11 }, { cx: 112, cy: 64, r: 12 }, { cx: 108, cy: 46, r: 13 }, { cx: 100, cy: 30, r: 12 }],
    cool: [{ cx: 98, cy: 100, r: 9 }, { cx: 110, cy: 88, r: 11 }, { cx: 116, cy: 72, r: 11 }, { cx: 112, cy: 56, r: 10 }],
    surprised: [{ cx: 98, cy: 98, r: 10 }, { cx: 110, cy: 84, r: 12 }, { cx: 116, cy: 68, r: 13 }, { cx: 114, cy: 50, r: 12 }, { cx: 106, cy: 36, r: 11 }],
  };

  if (mood === 'sad' || mood === 'nervous') {
    return (
      <path
        d={mood === 'nervous'
          ? 'M82 96 Q86 112 80 124 Q76 132 70 128 Q64 122 70 110 L76 94Z'
          : 'M82 98 Q84 114 78 126 Q74 134 68 130 Q62 124 68 112 L74 96Z'}
        fill={C.orange} stroke={C.outline} strokeWidth={C.sw} strokeLinejoin="round" />
    );
  }

  const puffs = PUFFS[mood] ?? PUFFS.wave;
  const wagFast = 'stackyTailWag 0.45s ease-in-out infinite alternate';
  const wagSlow = 'stackyTailSway 2.5s ease-in-out infinite alternate';
  const anim = ['excited', 'celebrate', 'happy', 'love'].includes(mood) ? wagFast : wagSlow;
  const origin = `${puffs[0].cx}px ${puffs[0].cy}px`;

  return (
    <g style={{ transformOrigin: origin, animation: anim }}>
      {/* Fill pass, covers internal stroke edges between overlapping circles */}
      {puffs.map((p, i) => (
        <circle key={`tf-${i}`} cx={p.cx} cy={p.cy} r={p.r + 2} fill={C.orange} />
      ))}
      {/* Outline pass, only outer-facing edges of each circle show */}
      {puffs.map((p, i) => (
        <circle key={`tp-${i}`} cx={p.cx} cy={p.cy} r={p.r}
          fill={C.orange} stroke={C.outline}
          strokeWidth={i === puffs.length - 1 ? C.sw : C.swMd} />
      ))}
    </g>
  );
}

// ─── EYES ─────────────────────────────────────────────────────────────────────
function Eyes({ mood }: { mood: StackyMood }) {
  const C = useContext(StackyPaletteContext);
  const lx = 46; const rx = 80; const ey = 44;
  const BaseEye = ({ cx, flip }: { cx: number; flip?: boolean }) => (
    <>
      <ellipse cx={cx} cy={ey} rx={11} ry={13} fill={C.eye} />
      <ellipse cx={cx} cy={ey + 1} rx={9} ry={11} fill={C.iris} />
      <ellipse cx={cx + (flip ? -3.5 : 3.5)} cy={ey - 5} rx={4} ry={4.5} fill={C.shine} />
      <circle cx={cx + (flip ? 5 : -5)} cy={ey + 5} r={2} fill={C.shine} opacity="0.6" />
    </>
  );
  if (mood === 'sleep') return (
    <g>
      <path d={`M${lx - 8} ${ey + 1} Q${lx} ${ey - 9} ${lx + 8} ${ey + 1}`} stroke={C.eye} strokeWidth={3.5} strokeLinecap="round" fill="none" />
      <path d={`M${rx - 7} ${ey + 1} Q${rx} ${ey - 9} ${rx + 7} ${ey + 1}`} stroke={C.eye} strokeWidth={3.5} strokeLinecap="round" fill="none" />
      {[-5, 0, 5].map((d) => <line key={d} x1={lx + d} y1={ey} x2={lx + d - 1} y2={ey - 5} stroke={C.eye} strokeWidth={1.6} strokeLinecap="round" />)}
      {[-4, 0, 4].map((d) => <line key={d} x1={rx + d} y1={ey} x2={rx + d - 1} y2={ey - 5} stroke={C.eye} strokeWidth={1.6} strokeLinecap="round" />)}
    </g>
  );
  if (mood === 'happy') return (
    <g>
      <path d={`M${lx - 10} ${ey + 4} Q${lx} ${ey - 10} ${lx + 10} ${ey + 4}`} stroke={C.eye} strokeWidth={3.8} strokeLinecap="round" fill="none" />
      <path d={`M${rx - 9} ${ey + 4} Q${rx} ${ey - 10} ${rx + 9} ${ey + 4}`} stroke={C.eye} strokeWidth={3.8} strokeLinecap="round" fill="none" />
      <circle cx={lx + 6} cy={ey - 9} r={3} fill={C.spark} opacity="0.9" />
      <circle cx={rx + 5} cy={ey - 9} r={2.5} fill={C.spark} opacity="0.8" />
    </g>
  );
  if (mood === 'wave') return (
    <g>
      <BaseEye cx={lx} /><BaseEye cx={rx} flip />
      <path d={`M${lx - 9} ${ey - 12} Q${lx} ${ey - 16} ${lx + 9} ${ey - 12}`} stroke={C.eye} strokeWidth={1.8} strokeLinecap="round" fill="none" opacity="0.6" />
      <path d={`M${rx - 8} ${ey - 12} Q${rx} ${ey - 16} ${rx + 8} ${ey - 12}`} stroke={C.eye} strokeWidth={1.8} strokeLinecap="round" fill="none" opacity="0.6" />
    </g>
  );
  if (mood === 'excited' || mood === 'celebrate') return (
    <g>
      <text x={lx} y={ey + 8} fontSize={24} textAnchor="middle" fill={C.eye} fontWeight="bold">★</text>
      <text x={rx} y={ey + 8} fontSize={24} textAnchor="middle" fill={C.eye} fontWeight="bold">★</text>
    </g>
  );
  if (mood === 'love') return (
    <g>
      <text x={lx} y={ey + 8} fontSize={22} textAnchor="middle" fill={C.heart}>♥</text>
      <text x={rx} y={ey + 8} fontSize={22} textAnchor="middle" fill={C.heart}>♥</text>
    </g>
  );
  if (mood === 'sad') return (
    <g>
      <BaseEye cx={lx} /><BaseEye cx={rx} flip />
      <path d={`M${lx - 9} ${ey - 14} Q${lx - 1} ${ey - 17} ${lx + 7} ${ey - 13}`} stroke={C.brow} strokeWidth={2.5} strokeLinecap="round" fill="none" />
      <path d={`M${rx - 7} ${ey - 13} Q${rx + 1} ${ey - 17} ${rx + 9} ${ey - 14}`} stroke={C.brow} strokeWidth={2.5} strokeLinecap="round" fill="none" />
      <ellipse cx={lx - 3} cy={ey + 16} rx={3} ry={4} fill={C.tear} opacity="0.85" />
      <ellipse cx={rx + 2} cy={ey + 14} rx={2.5} ry={3.5} fill={C.tear} opacity="0.7" />
    </g>
  );
  if (mood === 'cool') return (
    <g>
      <rect x={lx - 14} y={ey - 9} width={26} height={16} rx={6} fill="#1A1A1A" opacity="0.9" />
      <rect x={rx - 12} y={ey - 9} width={24} height={16} rx={6} fill="#1A1A1A" opacity="0.9" />
      <rect x={lx + 12} y={ey - 5} width={rx - lx - 24} height={6} rx={3} fill="#1A1A1A" opacity="0.9" />
      <line x1={lx - 14} y1={ey} x2={lx - 26} y2={ey + 5} stroke="#1A1A1A" strokeWidth={4} strokeLinecap="round" />
      <line x1={rx + 12} y1={ey} x2={rx + 24} y2={ey + 5} stroke="#1A1A1A" strokeWidth={4} strokeLinecap="round" />
      <ellipse cx={lx - 5} cy={ey - 3} rx={5} ry={3.5} fill="white" opacity="0.18" />
    </g>
  );
  if (mood === 'surprised') return (
    <g>
      <ellipse cx={lx} cy={ey} rx={13} ry={15} fill={C.eye} /><ellipse cx={lx} cy={ey + 1} rx={11} ry={13} fill={C.iris} />
      <ellipse cx={lx + 5} cy={ey - 6} rx={5} ry={5.5} fill={C.shine} /><circle cx={lx - 6} cy={ey + 6} r={2.5} fill={C.shine} opacity="0.6" />
      <ellipse cx={rx} cy={ey} rx={13} ry={15} fill={C.eye} /><ellipse cx={rx} cy={ey + 1} rx={11} ry={13} fill={C.iris} />
      <ellipse cx={rx + 5} cy={ey - 6} rx={5} ry={5.5} fill={C.shine} /><circle cx={rx - 6} cy={ey + 6} r={2.5} fill={C.shine} opacity="0.6" />
    </g>
  );
  if (mood === 'nervous') return (
    <g>
      <BaseEye cx={lx} /><BaseEye cx={rx} flip />
      <ellipse cx={rx + 26} cy={ey - 20} rx={4.5} ry={6} fill={C.tear} opacity="0.75" />
    </g>
  );
  if (mood === 'think') return (
    <g>
      <ellipse cx={lx} cy={ey} rx={11} ry={13} fill={C.eye} /><ellipse cx={lx} cy={ey + 1} rx={9} ry={11} fill={C.iris} />
      <ellipse cx={lx + 6} cy={ey - 5} rx={4} ry={4.5} fill={C.shine} /><circle cx={lx - 5} cy={ey + 5} r={2} fill={C.shine} opacity="0.6" />
      <ellipse cx={rx} cy={ey} rx={11} ry={13} fill={C.eye} /><ellipse cx={rx} cy={ey + 1} rx={9} ry={11} fill={C.iris} />
      <ellipse cx={rx + 6} cy={ey - 5} rx={4} ry={4.5} fill={C.shine} /><circle cx={rx - 5} cy={ey + 5} r={2} fill={C.shine} opacity="0.6" />
      <circle cx={104} cy={22} r={4} fill="white" stroke={C.outline} strokeWidth={1.8} />
      <circle cx={112} cy={10} r={5.5} fill="white" stroke={C.outline} strokeWidth={1.8} />
      <circle cx={120} cy={-4} r={7} fill="white" stroke={C.outline} strokeWidth={1.8} />
      <text x={120} y={0} fontSize={9} textAnchor="middle" fill="#9C8E84">?</text>
    </g>
  );
  if (mood === 'flex') return (
    <g>
      <ellipse cx={lx} cy={ey} rx={11} ry={12} fill={C.eye} /><ellipse cx={lx} cy={ey + 1} rx={9} ry={10} fill={C.iris} />
      <ellipse cx={lx + 4} cy={ey - 4} rx={4} ry={4.5} fill={C.shine} />
      <ellipse cx={rx} cy={ey} rx={11} ry={12} fill={C.eye} /><ellipse cx={rx} cy={ey + 1} rx={9} ry={10} fill={C.iris} />
      <ellipse cx={rx + 4} cy={ey - 4} rx={4} ry={4.5} fill={C.shine} />
      <path d={`M${lx - 9} ${ey - 15} Q${lx} ${ey - 19} ${lx + 8} ${ey - 14}`} stroke={C.brow} strokeWidth={2.5} strokeLinecap="round" fill="none" />
      <path d={`M${rx - 8} ${ey - 14} Q${rx} ${ey - 19} ${rx + 9} ${ey - 15}`} stroke={C.brow} strokeWidth={2.5} strokeLinecap="round" fill="none" />
    </g>
  );
  return <g><BaseEye cx={lx} /><BaseEye cx={rx} flip /></g>;
}

// ─── MOUTH ────────────────────────────────────────────────────────────────────
function Mouth({ mood }: { mood: StackyMood }) {
  const C = useContext(StackyPaletteContext);
  const mx = 63; const my = 68;
  if (mood === 'sleep') return <path d={`M${mx - 3} ${my} Q${mx} ${my + 3} ${mx + 3} ${my}`} stroke={C.eye} strokeWidth={2} strokeLinecap="round" fill="none" />;
  if (mood === 'sad') return <path d={`M${mx - 7} ${my + 4} Q${mx} ${my - 2} ${mx + 7} ${my + 4}`} stroke={C.eye} strokeWidth={2.5} strokeLinecap="round" fill="none" />;
  if (mood === 'surprised') return <ellipse cx={mx} cy={my + 3} rx={6} ry={7} fill={C.eye} opacity="0.85" />;
  if (mood === 'nervous') return <path d={`M${mx - 5} ${my} Q${mx - 2} ${my + 5} ${mx + 1} ${my + 1} Q${mx + 3} ${my + 6} ${mx + 7} ${my + 1}`} stroke={C.eye} strokeWidth={2.2} strokeLinecap="round" fill="none" />;
  if (mood === 'excited' || mood === 'celebrate') return (
    <g>
      <path d={`M${mx - 9} ${my - 2} Q${mx} ${my + 11} ${mx + 9} ${my - 2}`} stroke={C.eye} strokeWidth={2.5} strokeLinecap="round" fill="none" />
      <ellipse cx={mx} cy={my + 4} rx={5.5} ry={4.5} fill={C.nose} opacity="0.4" />
    </g>
  );
  if (mood === 'think') return <path d={`M${mx - 3} ${my + 2} Q${mx + 3} ${my + 6} ${mx + 8} ${my + 3}`} stroke={C.eye} strokeWidth={2.2} strokeLinecap="round" fill="none" />;
  if (mood === 'cool') return <path d={`M${mx} ${my + 2} Q${mx + 5} ${my + 8} ${mx + 10} ${my + 4}`} stroke={C.eye} strokeWidth={2.2} strokeLinecap="round" fill="none" />;
  if (mood === 'flex') return <path d={`M${mx - 6} ${my} Q${mx + 2} ${my + 10} ${mx + 9} ${my + 5}`} stroke={C.eye} strokeWidth={2.5} strokeLinecap="round" fill="none" />;
  return <path d={`M${mx - 8} ${my - 1} Q${mx} ${my + 10} ${mx + 8} ${my - 1}`} stroke={C.eye} strokeWidth={2.5} strokeLinecap="round" fill="none" />;
}

// ─── ARMS ─────────────────────────────────────────────────────────────────────
function Arms({ mood }: { mood: StackyMood }) {
  const C = useContext(StackyPaletteContext);
  const sw = C.swMd;
  const arm = C.fur;
  const paw = C.pawWhite;
  const ink = C.furOutline;
  if (mood === 'wave') return (
    <g>
      <ellipse cx={34} cy={106} rx={10} ry={7} fill={paw} stroke={ink} strokeWidth={sw} />
      <g style={{ transformOrigin: '90px 98px', animation: 'stackyWaveArm 0.75s ease-in-out infinite alternate' }}>
        <path d="M90 100 Q102 88 106 76" stroke={arm} strokeWidth={14} strokeLinecap="round" fill="none" />
        <ellipse cx={107} cy={73} rx={10} ry={9} fill={paw} stroke={ink} strokeWidth={sw} transform="rotate(-20 107 73)" />
      </g>
    </g>
  );
  if (mood === 'excited' || mood === 'celebrate') return (
    <g>
      <path d="M36 100 Q22 86 18 72" stroke={arm} strokeWidth={14} strokeLinecap="round" fill="none" />
      <ellipse cx={16} cy={70} rx={10} ry={9} fill={paw} stroke={ink} strokeWidth={sw} transform="rotate(25 16 70)" />
      <path d="M90 100 Q104 86 108 72" stroke={arm} strokeWidth={14} strokeLinecap="round" fill="none" />
      <ellipse cx={110} cy={70} rx={10} ry={9} fill={paw} stroke={ink} strokeWidth={sw} transform="rotate(-25 110 70)" />
    </g>
  );
  if (mood === 'think') return (
    <g>
      <ellipse cx={34} cy={106} rx={10} ry={7} fill={paw} stroke={ink} strokeWidth={sw} />
      <path d="M92 100 Q102 90 104 78" stroke={arm} strokeWidth={13} strokeLinecap="round" fill="none" />
      <ellipse cx={104} cy={75} rx={10} ry={9} fill={paw} stroke={ink} strokeWidth={sw} transform="rotate(-10 104 75)" />
    </g>
  );
  if (mood === 'flex') return (
    <g>
      <ellipse cx={34} cy={106} rx={10} ry={7} fill={paw} stroke={ink} strokeWidth={sw} />
      <path d="M90 100 Q104 88 104 74" stroke={arm} strokeWidth={16} strokeLinecap="round" fill="none" />
      <ellipse cx={103} cy={73} rx={12} ry={10} fill={paw} stroke={ink} strokeWidth={sw} transform="rotate(-14 103 73)" />
      <ellipse cx={104} cy={82} rx={8} ry={6} fill={paw} stroke={ink} strokeWidth={sw} />
    </g>
  );
  if (mood === 'sleep') return <ellipse cx={63} cy={112} rx={20} ry={9} fill={paw} stroke={ink} strokeWidth={sw} />;
  if (mood === 'sad' || mood === 'nervous') return (
    <g>
      <ellipse cx={36} cy={110} rx={10} ry={7} fill={paw} stroke={ink} strokeWidth={sw} transform="rotate(12 36 110)" />
      <ellipse cx={90} cy={110} rx={10} ry={7} fill={paw} stroke={ink} strokeWidth={sw} transform="rotate(-12 90 110)" />
    </g>
  );
  if (mood === 'surprised') return (
    <g>
      <path d="M34 100 Q20 88 16 76" stroke={arm} strokeWidth={13} strokeLinecap="round" fill="none" />
      <ellipse cx={14} cy={74} rx={10} ry={9} fill={paw} stroke={ink} strokeWidth={sw} transform="rotate(24 14 74)" />
      <path d="M92 100 Q106 88 110 76" stroke={arm} strokeWidth={13} strokeLinecap="round" fill="none" />
      <ellipse cx={112} cy={74} rx={10} ry={9} fill={paw} stroke={ink} strokeWidth={sw} transform="rotate(-24 112 74)" />
    </g>
  );
  if (mood === 'cool') return (
    <g>
      <ellipse cx={34} cy={106} rx={10} ry={7} fill={paw} stroke={ink} strokeWidth={sw} />
      <path d="M92 100 Q106 92 108 82" stroke={arm} strokeWidth={12} strokeLinecap="round" fill="none" />
      <ellipse cx={109} cy={80} rx={10} ry={9} fill={paw} stroke={ink} strokeWidth={sw} transform="rotate(-12 109 80)" />
    </g>
  );
  return (
    <g>
      <ellipse cx={34} cy={106} rx={10} ry={7} fill={paw} stroke={ink} strokeWidth={sw} />
      <ellipse cx={92} cy={106} rx={10} ry={7} fill={paw} stroke={ink} strokeWidth={sw} />
    </g>
  );
}

// ─── OUTFIT ───────────────────────────────────────────────────────────────────
function Outfit({ outfit }: { outfit: StackyOutfit }) {
  const C = useContext(StackyPaletteContext);
  if (outfit === 'labCoat') return (
    <g>
      <path d="M42 74 L52 86 L63 76 L74 86 L84 74" fill="none" stroke="#DDDBD8" strokeWidth={2} />
      <rect x="51" y="96" width="15" height="13" rx="2" fill="none" stroke="#CCCCCA" strokeWidth={1.2} />
      <line x1="56" y1="95" x2="56" y2="105" stroke={C.green} strokeWidth={3} strokeLinecap="round" />
      <circle cx="56" cy="94" r={2} fill={C.green} />
    </g>
  );
  if (outfit === 'chef') return (
    <g>
      <rect x="24" y="1" width="78" height="12" rx="5" fill={C.chefWhite} stroke="#DDDBD8" strokeWidth={1.5} />
      <ellipse cx="63" cy={-8} rx="30" ry="18" fill={C.chefWhite} stroke="#DDDBD8" strokeWidth={1.5} />
      <ellipse cx="46" cy={-6} rx="14" ry="10" fill={C.chefWhite} stroke="#DDDBD8" strokeWidth={1} />
      <ellipse cx="80" cy={-6} rx="14" ry="10" fill={C.chefWhite} stroke="#DDDBD8" strokeWidth={1} />
    </g>
  );
  if (outfit === 'graduation') return (
    <g>
      <rect x="22" y="0" width="82" height="9" rx="2" fill={C.gradBlue} />
      <ellipse cx="63" cy="0" rx="33" ry="15" fill={C.gradBlue} />
      <line x1="84" y1="0" x2="98" y2="12" stroke={C.goldColor} strokeWidth={3} />
      <circle cx="99" cy="13" r={5} fill={C.goldColor} />
      {[-3, -1, 1].map((dx, i) => <line key={i} x1={99 + dx} y1={18} x2={96 + dx} y2={30} stroke={C.goldColor} strokeWidth={2} strokeLinecap="round" />)}
    </g>
  );
  if (outfit === 'party') return (
    <g>
      <path d="M30 14 L63 -22 L96 14Z" fill={C.party} stroke="white" strokeWidth={1.5} />
      <path d="M42 8 L63 -22 L84 8" fill="none" stroke="white" strokeWidth={2} opacity="0.55" />
      <circle cx="52" cy="0" r={3.5} fill="white" opacity="0.7" />
      <circle cx="70" cy={-7} r={3} fill={C.partyYell} opacity="0.8" />
      <circle cx="63" cy={-23} r={6.5} fill={C.partyYell} />
      {[[-52, -4, -30, C.party], [-56, 14, 14, C.partyYell], [-46, 30, -22, C.partyBlue], [112, -6, 22, C.partyBlue], [114, 20, -18, C.partyGrn], [106, 32, 28, C.partyYell]].map(([x, y, r, fill], i) => (
        <rect key={i} x={x as number} y={y as number} width={7} height={3.5} rx={1.8} fill={fill as string} transform={`rotate(${r} ${(x as number) + 3} ${(y as number) + 1.5})`} />
      ))}
    </g>
  );
  if (outfit === 'crown') return (
    <g>
      <path d="M22 6 L22 -12 L38 0 L63 -24 L88 0 L104 -12 L104 6Z" fill={C.goldColor} stroke={C.goldDark} strokeWidth={2} />
      <rect x="22" y="4" width="82" height="11" rx="3" fill={C.goldColor} stroke={C.goldDark} strokeWidth={1.5} />
      <ellipse cx="63" cy={-12} rx="7" ry="8" fill="#FF4A6A" />
      <ellipse cx="38" cy={-2} rx="5.5" ry="6.5" fill={C.partyBlue} />
      <ellipse cx="88" cy={-2} rx="5.5" ry="6.5" fill={C.partyBlue} />
    </g>
  );
  if (outfit === 'wizard') return (
    <g>
      <path d="M20 16 L63 -34 L106 16Z" fill={C.wizPurple} stroke="#5B21B6" strokeWidth={2} />
      <ellipse cx="63" cy="16" rx="46" ry="13" fill={C.wizPurple} stroke="#5B21B6" strokeWidth={2} />
      <text x="48" y="4" fontSize={11} fill={C.goldColor} textAnchor="middle">★</text>
      <text x="70" y={-6} fontSize={9} fill={C.goldColor} textAnchor="middle">✦</text>
      <text x="63" y="12" fontSize={12} fill={C.goldColor} textAnchor="middle">☾</text>
      <text x="110" y="32" fontSize={16} fill={C.goldColor}>✨</text>
    </g>
  );
  if (outfit === 'workout') return (
    <g>
      <path d="M20 6 Q63 -10 106 6" fill="none" stroke={C.green} strokeWidth={11} strokeLinecap="round" />
      <path d="M20 6 Q63 -10 106 6" fill="none" stroke="#5E9970" strokeWidth={6} strokeLinecap="round" />
      <rect x="82" y="84" width="26" height="7" rx="3.5" fill="#666" />
      <rect x="78" y="78" width="9" height="18" rx="4.5" fill="#444" />
      <rect x="101" y="78" width="9" height="18" rx="4.5" fill="#444" />
    </g>
  );
  if (outfit === 'superhero') return (
    <g>
      <text x="63" y="112" fontSize={20} textAnchor="middle" fill={C.goldColor}>★</text>
      <path d="M30 18 Q38 10 48 14 Q54 10 63 14 Q72 10 78 14 Q88 10 96 18" fill="#3B0764" stroke="#2A0050" strokeWidth={2} />
    </g>
  );
  if (outfit === 'cowboy') return (
    <g>
      {/* gold brim */}
      <ellipse cx="63" cy="17" rx="56" ry="12" fill="url(#stackyCowboyBrimGold)" stroke="#8B6518" strokeWidth="2.2" />
      {/* crown */}
      <path
        d="M 30 15 L 34 -4 Q 63 -14 94 -4 L 98 15 Q 63 11 30 15 Z"
        fill="url(#stackyCowboyCrownGold)"
        stroke="#8B6518"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* rich band + dent */}
      <path d="M 36 11 Q 63 7 90 11" stroke="#5A3D11" strokeWidth="4.8" strokeLinecap="round" fill="none" opacity="0.95" />
      <path d="M 38 8.5 Q 63 5 88 8.5" stroke="#F8E3A1" strokeWidth="2.1" strokeLinecap="round" fill="none" opacity="0.95" />
      <ellipse cx="63" cy="-2" rx="20" ry="7" fill="#C79223" stroke="#8B6518" strokeWidth="1.2" />
      {/* shiny accents */}
      <ellipse cx="45" cy="6" rx="5.8" ry="2.4" fill="#FFF6D8" opacity="0.72" />
      <ellipse cx="82" cy="4.8" rx="4.8" ry="2" fill="#FFF6D8" opacity="0.62" />
      <g style={{ transformOrigin: '63px 2px', animation: 'stackyHatSparkle 2.2s ease-in-out infinite' }}>
        <text x="26" y="-4" fontSize={10} fill="#FFECA8">✦</text>
        <text x="97" y="1" fontSize={9} fill="#FFECA8">✦</text>
      </g>
    </g>
  );
  return null;
}

// ─── MAIN CAT ─────────────────────────────────────────────────────────────────
function FallbackCat({ mood, outfit, size }: { mood: StackyMood; outfit: StackyOutfit; size: number }) {
  const C = useContext(StackyPaletteContext);
  const sw = C.sw;
  return (
    <svg width={size} height={size} viewBox="0 0 126 136" fill="none"
      xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible', display: 'block' }}>
      <defs>
        <style>{`
          @keyframes stackyTailWag{from{transform:rotate(-28deg)}to{transform:rotate(14deg)}}
          @keyframes stackyTailSway{from{transform:rotate(-10deg)}to{transform:rotate(8deg)}}
          @keyframes stackyWaveArm{from{transform:rotate(-38deg)}to{transform:rotate(-8deg)}}
          @keyframes stackyBob{from{transform:translateY(0)}to{transform:translateY(-5px)}}
          @keyframes stackyHatSparkle{0%,100%{opacity:.55;transform:scale(.96)}50%{opacity:1;transform:scale(1.08)}}
        `}</style>
        <linearGradient id="stackyCowboyBrimGold" x1="10" y1="8" x2="118" y2="27" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#9A6D16" />
          <stop offset="0.32" stopColor="#D5A12D" />
          <stop offset="0.55" stopColor="#F2CA63" />
          <stop offset="0.82" stopColor="#C18E22" />
          <stop offset="1" stopColor="#8D6416" />
        </linearGradient>
        <linearGradient id="stackyCowboyCrownGold" x1="34" y1="-12" x2="97" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#8E6415" />
          <stop offset="0.4" stopColor="#D8A32D" />
          <stop offset="0.62" stopColor="#FFE08A" />
          <stop offset="1" stopColor="#A9781C" />
        </linearGradient>
      </defs>
      <ellipse cx="63" cy="133" rx="28" ry="4.5" fill="rgba(0,0,0,0.12)" />
      {/* Cape behind everything */}
      {outfit === 'superhero' && (
        <g>
          <path d="M30 76 Q14 102 24 128 L44 124 Q36 100 42 84Z" fill={C.cape} stroke="#5B21B6" strokeWidth={1.5} opacity="0.92" />
          <path d="M96 76 Q112 102 102 128 L82 124 Q90 100 84 84Z" fill={C.cape} stroke="#5B21B6" strokeWidth={1.5} opacity="0.92" />
          <path d="M30 76 Q63 92 96 76 Q104 128 63 132 Q22 128 30 76Z" fill={C.cape} stroke="#5B21B6" strokeWidth={1.5} opacity="0.88" />
        </g>
      )}
      {/* Lab coat back panels */}
      {outfit === 'labCoat' && (
        <g>
          <path d="M36 76 L26 118 L46 118 L50 84Z" fill={C.labWhite} stroke="#DDDBD8" strokeWidth={1.5} />
          <path d="M90 76 L100 118 L80 118 L76 84Z" fill={C.labWhite} stroke="#DDDBD8" strokeWidth={1.5} />
          <path d="M50 84 L63 92 L76 84 L78 118 L48 118Z" fill={C.labWhite} />
        </g>
      )}
      {/* FLUFFY TAIL */}
      <FluffyTail mood={mood} />
      {/* BODY - tuxedo */}
      <ellipse cx="63" cy="97" rx="33" ry="31" fill={C.fur} stroke={C.furOutline} strokeWidth={sw} />
      <ellipse cx="63" cy="105" rx="22" ry="24" fill={C.bib} />
      {/* HIND PAWS (white socks) */}
      <ellipse cx="43" cy="126" rx="13" ry="8" fill={C.pawWhite} stroke={C.furOutline} strokeWidth={C.swMd} />
      <ellipse cx="83" cy="126" rx="13" ry="8" fill={C.pawWhite} stroke={C.furOutline} strokeWidth={C.swMd} />
      {/* ARMS */}
      <Arms mood={mood} />
      {/* LEFT EAR, rounded dome */}
      <path
        d="M26 52 Q14 34 12 24 Q16 14 28 22 Q40 30 48 42 Q42 52 32 52 Q28 54 26 52Z"
        fill={C.fur}
        stroke={C.furOutline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      <path d="M28 48 Q22 32 20 26 Q24 22 32 28 Q38 36 42 42Z" fill={C.innerEar} opacity="0.95" />
      {/* RIGHT EAR */}
      <path
        d="M100 52 Q112 34 114 24 Q110 14 98 22 Q86 30 78 42 Q84 52 94 52 Q98 54 100 52Z"
        fill={C.fur}
        stroke={C.furOutline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      <path d="M98 48 Q104 32 106 26 Q102 22 94 28 Q88 36 84 42Z" fill={C.innerEar} opacity="0.95" />
      {/* HEAD */}
      <ellipse cx="63" cy="50" rx="44" ry="42" fill={C.fur} stroke={C.furOutline} strokeWidth={sw} />
      {/* White muzzle: tight patch around nose & mouth only (no long chin / beard) */}
      <path
        fill={C.bib}
        d="M 48 60 Q 63 56 78 60 Q 84 63 82 68 Q 80 73 63 75 Q 46 73 44 68 Q 42 63 48 60 Z"
      />
      {/* OUTFIT (hats, front details) */}
      <Outfit outfit={outfit} />
      {/* BIG ROSY CHEEKS */}
      <ellipse cx="22" cy="62" rx="18" ry="13" fill={mood === 'sad' ? C.cheekSad : C.cheek} />
      <ellipse cx="104" cy="62" rx="18" ry="13" fill={mood === 'sad' ? C.cheekSad : C.cheek} />
      {/* EYES */}
      <g transform="translate(0,6)"><Eyes mood={mood} /></g>
      {/* NOSE */}
      <path d="M59 66 L63 62 L67 66 Q63 71 59 66Z" fill={C.nose} />
      {/* MOUTH */}
      <g transform="translate(0,4)"><Mouth mood={mood} /></g>
      {/* WHISKERS */}
      <line x1="6" y1="60" x2="42" y2="63" stroke={C.whisker} strokeWidth={C.swW} strokeLinecap="round" />
      <line x1="6" y1="67" x2="42" y2="67" stroke={C.whisker} strokeWidth={C.swW * 0.85} strokeLinecap="round" />
      <line x1="84" y1="63" x2="120" y2="60" stroke={C.whisker} strokeWidth={C.swW} strokeLinecap="round" />
      <line x1="84" y1="67" x2="120" y2="67" stroke={C.whisker} strokeWidth={C.swW * 0.85} strokeLinecap="round" />
      {/* ZZZ */}
      {mood === 'sleep' && (
        <g>
          <text x="92" y="42" fontSize={12} fill={C.eye} opacity="0.45" fontWeight="700">z</text>
          <text x="101" y="29" fontSize={15} fill={C.eye} opacity="0.3" fontWeight="700">z</text>
          <text x="112" y="15" fontSize={18} fill={C.eye} opacity="0.18" fontWeight="700">z</text>
        </g>
      )}
    </svg>
  );
}

export default function StackyCat({
  mood = 'wave',
  size = 120,
  className = '',
  speaking = false,
  bubble,
  bubblePosition = 'right',
  topBubbleReservePx,
  outfit: outfitProp,
  animate = false,
}: StackyCatProps) {
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const stackyPalette = isDark ? C_DARK_ORANGE : C_LIGHT;

  const [imgError, setImgError] = useState(false);
  const useImage = !STACKY_USE_FALLBACK && !imgError;
  const [visible, setVisible] = useState(false);
  const resolvedOutfit: StackyOutfit = isPro() ? 'cowboy' : (outfitProp ?? 'default');

  useEffect(() => {
    if (bubble) {
      const t = setTimeout(() => setVisible(true), 200);
      return () => clearTimeout(t);
    }
    setVisible(false);
  }, [bubble]);

  /** Explicit width so shrink-to-fit doesn't use the tiny cat box (~88px), which stacks text in a vertical strip. dvw + safe-area avoids iOS/Android horizontal overflow vs raw 100vw. */
  const bubbleWidth =
    'min(420px, calc(100dvw - 32px - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px)))';

  const bubbleStyle: CSSProperties = {
    position: 'absolute',
    width: bubbleWidth,
    minWidth: 200,
    maxWidth: 420,
    background: isDark ? '#1a2420' : '#FFFFFF',
    border: isDark ? '1.5px solid rgba(61,79,69,0.9)' : '1.5px solid #E8E0D5',
    borderRadius: 16,
    padding: '10px 14px',
    fontSize: 13,
    lineHeight: 1.45,
    textAlign: 'center',
    color: isDark ? '#e8ebe8' : '#3D2E22',
    fontFamily: 'Figtree, system-ui, sans-serif',
    fontWeight: 500,
    boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.35)' : '0 4px 16px rgba(28,58,46,0.1)',
    whiteSpace: 'pre-line',
    writingMode: 'horizontal-tb',
    WebkitWritingMode: 'horizontal-tb',
    textOrientation: 'mixed',
    wordBreak: 'normal',
    overflowWrap: 'break-word',
    direction: 'ltr',
    unicodeBidi: 'isolate',
    zIndex: 10,
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    opacity: visible ? 1 : 0,
    transform: visible ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(4px)',
    pointerEvents: 'none',
    boxSizing: 'border-box',
    ...(bubblePosition === 'right' ? { left: size + 12, top: 8 } : {}),
    ...(bubblePosition === 'left' ? { right: size + 12, top: 8 } : {}),
    ...(bubblePosition === 'top'
      ? {
          bottom: size + 8,
          left: '50%',
          transform: visible ? 'translateX(-50%) scale(1)' : 'translateX(-50%) scale(0.9)',
        }
      : {}),
  };

  /** Top bubbles are absolutely positioned above the cat; without reserved space they overlap prior content. */
  const topBubbleLayoutReservePx =
    bubblePosition === 'top' && bubble ? (topBubbleReservePx ?? 128) : 0;

  const tailStyle: CSSProperties = {
    position: 'absolute',
    width: 10,
    height: 10,
    background: isDark ? '#1a2420' : '#FFFFFF',
    border: isDark ? '1.5px solid rgba(61,79,69,0.9)' : '1.5px solid #E8E0D5',
    borderRight: 'none',
    borderTop: 'none',
    transform: 'rotate(45deg)',
    ...(bubblePosition === 'right' ? { left: -6, top: 18 } : {}),
    ...(bubblePosition === 'left' ? { right: -6, top: 18, transform: 'rotate(-135deg)' } : {}),
    ...(bubblePosition === 'top'
      ? { bottom: -6, left: '50%', marginLeft: -5, transform: 'rotate(-45deg)' }
      : {}),
  };

  const bobStyle: CSSProperties | undefined = animate
    ? { animation: 'stackyBobGlobal 1.8s ease-in-out infinite alternate' }
    : undefined;

  const catInner = (
    <StackyPaletteContext.Provider value={stackyPalette}>
      <>
      {animate && (
        <style>{`
          @keyframes stackyBobGlobal { from { transform: translateY(0); } to { transform: translateY(-5px); } }
        `}</style>
      )}
      {useImage ? (
        <img
          src={STACKY_IMAGE_SRC}
          alt="Stacky"
          width={size}
          height={size}
          onError={() => setImgError(true)}
          style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
        />
      ) : (
        <FallbackCat mood={mood} outfit={resolvedOutfit} size={size} />
      )}

      {speaking && !bubble && (
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            right: -6,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#1C3A2E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ display: 'flex', gap: 2 }}>
            {[0, 80, 160].map((d) => (
              <span
                key={d}
                style={{
                  width: 3,
                  height: 3,
                  borderRadius: '50%',
                  background: '#F9F6F1',
                  animation: `stackySpeakBounce 0.8s ${d}ms ease-in-out infinite alternate`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {bubble != null && bubble !== '' && (
        <div className="stacky-speech-bubble" style={bubbleStyle}>
          <div style={tailStyle} aria-hidden />
          <span dir="ltr" className="stacky-speech-bubble__text">
            {bubble}
          </span>
        </div>
      )}
      <style>{`
        @keyframes stackySpeakBounce {
          from { transform: translateY(0); opacity: 0.8; }
          to { transform: translateY(-2px); opacity: 1; }
        }
      `}</style>
      </>
    </StackyPaletteContext.Provider>
  );

  if (topBubbleLayoutReservePx > 0) {
    return (
      <div
        className={className}
        style={{
          display: 'inline-block',
          paddingTop: topBubbleLayoutReservePx,
          verticalAlign: 'bottom',
        }}
      >
        <div className="relative inline-block" style={{ width: size, height: size, ...bobStyle }}>
          {catInner}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative inline-block ${className}`} style={{ width: size, height: size, ...bobStyle }}>
      {catInner}
    </div>
  );
}
