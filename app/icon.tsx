/**
 * app/icon.tsx
 *
 * Generates the ExpenseIQ favicon / browser-tab icon at build time
 * using Next.js's built-in ImageResponse (next/og). The output is a
 * 32 × 32 PNG that browsers pick up automatically from <head>.
 *
 * Design: violet-to-indigo gradient rounded square with a white
 * lightning-bolt "IQ" monogram — matches the sidebar logo style.
 */

import { ImageResponse } from 'next/og';

/* ─── icon dimensions ───────────────────────────────────────────── */
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

/* ─── icon renderer ─────────────────────────────────────────────── */
export default function Icon() {
  return new ImageResponse(
    (
      /**
       * Outer container: fills the full 32 × 32 canvas.
       * Uses a violet → indigo gradient matching the app brand colour.
       * border-radius: 8px gives the rounded-lg look.
       */
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
          borderRadius: 8,
        }}
      >
        {/**
         * Lightning-bolt "spark" icon drawn with two stacked lines:
         * a wide top segment and a narrow bottom segment, rotated −15 °
         * to give a natural diagonal slash feel.
         */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0,
            transform: 'rotate(-10deg)',
          }}
        >
          {/* Top half of the bolt — wider */}
          <div
            style={{
              width: 10,
              height: 4,
              background: 'white',
              borderRadius: 1,
              marginLeft: 3,
            }}
          />
          {/* Middle connector */}
          <div
            style={{
              width: 14,
              height: 4,
              background: 'white',
              borderRadius: 1,
            }}
          />
          {/* Bottom half of the bolt — narrower, offset right */}
          <div
            style={{
              width: 10,
              height: 4,
              background: 'white',
              borderRadius: 1,
              marginRight: 3,
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
