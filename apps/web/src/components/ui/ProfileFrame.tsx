'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { BADGE_CONFIG, BadgeType, BadgeRarity } from './IdentityBadge';

// ─── Props ─────────────────────────────────────────────────────────────────
interface Props {
  /** The list of badges active on the profile. Frame is derived from the top-tier badge. */
  badges: BadgeType[];
  /** Optional custom frame override chosen by the user. */
  selectedFrameBadge?: string;
  /** Extra CSS class names for the wrapper div (use for absolute positioning). */
  className?: string;
}

// ─── Rarity helpers ─────────────────────────────────────────────────────────
const RARITY_ORDER: BadgeRarity[] = ['singularity', 'mythic', 'legendary', 'epic', 'rare', 'common'];

function getTopConfig(badges: BadgeType[], selectedFrameBadge?: string) {
  if (selectedFrameBadge && badges.includes(selectedFrameBadge as BadgeType)) {
    return BADGE_CONFIG[selectedFrameBadge as BadgeType];
  }
  for (const r of RARITY_ORDER) {
    const found = badges.find(b => BADGE_CONFIG[b]?.rarity === r);
    if (found) return BADGE_CONFIG[found];
  }
  return null;
}

// Rarity → visual intensity
const RING_SPEEDS: Record<BadgeRarity, { outer: number; inner: number }> = {
  common:      { outer: 22, inner: 16 },
  rare:        { outer: 18, inner: 13 },
  epic:        { outer: 12, inner: 8  },
  legendary:   { outer: 8,  inner: 5  },
  mythic:      { outer: 5,  inner: 3  },
  singularity: { outer: 3,  inner: 2  },
};
const PARTICLE_COUNTS: Record<BadgeRarity, number> = {
  common: 0, rare: 2, epic: 3, legendary: 4, mythic: 6, singularity: 8,
};
const DOT_SIZES: Record<BadgeRarity, number> = {
  common: 0, rare: 2.5, epic: 3, legendary: 3.5, mythic: 4, singularity: 3,
};

// ─── Component ─────────────────────────────────────────────────────────────
export default function ProfileFrame({ badges, selectedFrameBadge, className = '' }: Props) {
  const rm     = useReducedMotion();
  const config = getTopConfig(badges, selectedFrameBadge);

  if (!config || badges.length === 0) return null;

  const { primaryColor, secondaryColor, glowColor, rarity } = config;
  const speeds   = RING_SPEEDS[rarity];
  const nParticles = PARTICLE_COUNTS[rarity];
  const dotSize  = DOT_SIZES[rarity];
  const filterId = `pf-glow-${rarity}`;

  return (
    <div
      className={`pointer-events-none select-none ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 200 200"
        width="100%"
        height="100%"
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* Soft glow filter */}
          <filter id={filterId} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Strong glow for particles */}
          <filter id={`${filterId}-strong`} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Outer dashed ring — slow clockwise rotation ── */}
        <motion.g
          style={{ transformOrigin: '100px 100px' }}
          animate={rm ? {} : { rotate: 360 }}
          transition={{ duration: speeds.outer, repeat: Infinity, ease: 'linear' }}
        >
          <circle
            cx="100" cy="100" r="93"
            stroke={primaryColor}
            strokeWidth="1.25"
            strokeDasharray="7 9"
            fill="none"
            opacity="0.55"
            filter={`url(#${filterId})`}
          />
        </motion.g>

        {/* ── Inner dashed ring — faster counter-clockwise ── */}
        <motion.g
          style={{ transformOrigin: '100px 100px' }}
          animate={rm ? {} : { rotate: -360 }}
          transition={{ duration: speeds.inner, repeat: Infinity, ease: 'linear' }}
        >
          <circle
            cx="100" cy="100" r="85"
            stroke={secondaryColor}
            strokeWidth="0.75"
            strokeDasharray="3 11"
            fill="none"
            opacity="0.30"
          />
        </motion.g>

        {/* ── Mythic bonus ring — fast multi-color ── */}
        {rarity === 'mythic' && !rm && (
          <motion.g
            style={{ transformOrigin: '100px 100px' }}
            animate={{ rotate: 360 }}
            transition={{ duration: speeds.outer * 0.55, repeat: Infinity, ease: 'linear' }}
          >
            <circle
              cx="100" cy="100" r="89"
              stroke="#f472b6"
              strokeWidth="1"
              strokeDasharray="2 7"
              fill="none"
              opacity="0.22"
            />
          </motion.g>
        )}

        {/* ── Orbiting particle dots with trailing effects ── */}
        {!rm && Array.from({ length: nParticles }, (_, i) => {
          const startAngle  = (360 / nParticles) * i;
          const dir         = i % 2 === 0 ? 1 : -1;
          const orbitRadius = 89 + (i % 2 === 0 ? 3 : -3);
          const particleColor = i % 3 === 0 ? primaryColor : secondaryColor;
          const spd = speeds.outer * (0.75 + i * 0.15);

          return (
            <g key={i}>
              {/* Trail 2 */}
              <motion.g
                style={{ transformOrigin: '100px 100px' }}
                initial={{ rotate: startAngle - dir * 8 }}
                animate={{ rotate: startAngle - dir * 8 + dir * 360 }}
                transition={{ duration: spd, repeat: Infinity, ease: 'linear' }}
              >
                <circle
                  cx="100"
                  cy={100 - orbitRadius}
                  r={dotSize * 0.5}
                  fill={particleColor}
                  opacity="0.20"
                  filter={`url(#${filterId})`}
                />
              </motion.g>

              {/* Trail 1 */}
              <motion.g
                style={{ transformOrigin: '100px 100px' }}
                initial={{ rotate: startAngle - dir * 4 }}
                animate={{ rotate: startAngle - dir * 4 + dir * 360 }}
                transition={{ duration: spd, repeat: Infinity, ease: 'linear' }}
              >
                <circle
                  cx="100"
                  cy={100 - orbitRadius}
                  r={dotSize * 0.75}
                  fill={particleColor}
                  opacity="0.45"
                  filter={`url(#${filterId})`}
                />
              </motion.g>

              {/* Lead Particle */}
              <motion.g
                style={{ transformOrigin: '100px 100px' }}
                initial={{ rotate: startAngle }}
                animate={{ rotate: startAngle + dir * 360 }}
                transition={{ duration: spd, repeat: Infinity, ease: 'linear' }}
              >
                <circle
                  cx="100"
                  cy={100 - orbitRadius}
                  r={dotSize}
                  fill={particleColor}
                  opacity="0.95"
                  filter={`url(#${filterId}-strong)`}
                />
              </motion.g>
            </g>
          );
        })}

        {/* ── Singularity / White Heart god-mode cardinal heart marks ── */}
        {config?.label === 'White Heart' && !rm &&
          [0, 90, 180, 270].map(angle => (
            <motion.g
              key={angle}
              style={{ transformOrigin: '100px 100px' }}
              animate={{
                rotate: [angle, angle + 2, angle - 2, angle],
                scale: [1, 1.15, 0.95, 1.15, 1],
              }}
              transition={{ duration: 1.6 + angle * 0.002, repeat: Infinity, ease: 'easeInOut' }}
            >
              <path
                d="M100,13.5 C98.5,11 95,11 95,14 C95,17.5 100,21.5 100,21.5 C100,21.5 105,17.5 105,14 C105,11 101.5,11 100,13.5 Z"
                fill="#ffffff"
                filter={`url(#${filterId})`}
                opacity="0.95"
              />
            </motion.g>
          ))
        }

        {/* ── Legendary / Mythic cardinal accent marks ── */}
        {(rarity === 'legendary' || rarity === 'mythic') && !rm &&
          [0, 90, 180, 270].map(angle => (
            <motion.g
              key={angle}
              style={{ transformOrigin: '100px 100px' }}
              animate={{
                rotate: [angle, angle + 5, angle - 5, angle],
                opacity: [0.4, 0.9, 0.4],
              }}
              transition={{ duration: 3 + angle * 0.01, repeat: Infinity, ease: 'easeInOut' }}
            >
              {/* Small diamond accent at the ring */}
              <polygon
                points={`100,${100 - 96} 102,${100 - 91} 100,${100 - 86} 98,${100 - 91}`}
                fill={primaryColor}
                filter={`url(#${filterId})`}
                opacity="0.85"
              />
            </motion.g>
          ))
        }
      </svg>
    </div>
  );
}
