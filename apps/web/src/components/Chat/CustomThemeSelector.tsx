import React, { useState, useRef } from 'react';
import { CINEMATIC_THEMES } from './cinematicThemes';
import { AESTHETIC_THEMES } from './aestheticThemes';
import { Upload, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// ─── SVG Helper ───────────────────────────────────────────────────────────────
const svgBg = (svg: string) =>
  `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;

// ─── THEMES ──────────────────────────────────────────────────────────────────
export const PRESET_THEMES = [
  // ── Classic ──────────────────────────────────────────────────────────────
  {
    id: 'midnight',
    name: 'Midnight',
    style: { background: '#07070d' },
  },
  {
    id: 'oled-black',
    name: 'OLED Black',
    style: { background: '#000000' },
  },
  // ── Hearts & Love ─────────────────────────────────────────────────────────
  {
    id: 'heart-drive',
    name: 'Heart Drive',
    style: {
      background: `radial-gradient(ellipse at 30% 20%, #7c0060 0%, transparent 55%),
                   radial-gradient(ellipse at 70% 80%, #b50060 0%, transparent 50%),
                   radial-gradient(ellipse at 50% 50%, #12001e 0%, #050010 100%)`,
      backgroundImage: `${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        <text x='30' y='90' font-size='48' fill='rgba(255,60,140,0.22)'>♥</text>
        <text x='110' y='160' font-size='64' fill='rgba(255,0,100,0.18)'>♥</text>
        <text x='60' y='240' font-size='36' fill='rgba(220,0,120,0.25)'>♥</text>
        <text x='140' y='60' font-size='28' fill='rgba(255,80,160,0.15)'>♥</text>
        <text x='10' y='200' font-size='22' fill='rgba(255,40,120,0.12)'>♥</text>
      </svg>`)}`,
    },
  },
  {
    id: 'valentines',
    name: 'Valentine\'s Day',
    style: {
      background: `radial-gradient(ellipse at 50% 50%, #1e0040 10%, #0a0020 100%)`,
      backgroundImage: `${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'>
        <circle cx='150' cy='150' r='70'  fill='none' stroke='rgba(180,0,160,0.3)' stroke-width='1.5'/>
        <circle cx='150' cy='150' r='105' fill='none' stroke='rgba(160,0,140,0.22)' stroke-width='1.2'/>
        <circle cx='150' cy='150' r='140' fill='none' stroke='rgba(140,0,120,0.16)' stroke-width='1'/>
        <circle cx='150' cy='150' r='175' fill='none' stroke='rgba(120,0,100,0.12)' stroke-width='0.8'/>
        <text x='117' y='165' font-size='48' fill='rgba(200,0,180,0.35)'>♥</text>
      </svg>`)}`,
    },
  },
  {
    id: 'love',
    name: 'Love',
    style: {
      background: `radial-gradient(ellipse at 40% 60%, #5c006e 0%, transparent 60%),
                   radial-gradient(ellipse at 80% 20%, #3d0055 0%, transparent 50%),
                   #0d001a`,
      backgroundImage: `${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        <circle cx='50'  cy='80'  r='30' fill='rgba(180,0,200,0.12)'/>
        <circle cx='140' cy='180' r='50' fill='rgba(160,0,180,0.1)'/>
        <circle cx='80'  cy='240' r='25' fill='rgba(200,0,220,0.08)'/>
        <circle cx='170' cy='50'  r='20' fill='rgba(180,0,200,0.09)'/>
      </svg>`)}`,
    },
  },
  {
    id: 'flirt',
    name: 'Flirt',
    style: {
      background: `radial-gradient(ellipse at 30% 70%, #6b0030 0%, transparent 55%),
                   radial-gradient(ellipse at 70% 30%, #4a0040 0%, transparent 50%),
                   #100010`,
      backgroundImage: `${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        <text x='15' y='70'  font-size='28' fill='rgba(220,50,100,0.2)'>♥</text>
        <text x='120' y='130' font-size='20' fill='rgba(200,0,80,0.15)'>♥</text>
        <text x='60' y='200' font-size='38' fill='rgba(240,20,120,0.18)'>♥</text>
        <text x='150' y='260' font-size='22' fill='rgba(200,0,80,0.12)'>♥</text>
        <text x='30' y='280' font-size='16' fill='rgba(240,60,140,0.1)'>♥</text>
      </svg>`)}`,
    },
  },
  // ── Space & Cosmos ────────────────────────────────────────────────────────
  {
    id: 'galaxy',
    name: 'Galaxy',
    style: {
      background: `radial-gradient(ellipse at 40% 30%, #1a0540 0%, transparent 55%),
                   radial-gradient(ellipse at 70% 70%, #0a0c40 0%, transparent 55%),
                   radial-gradient(ellipse at 20% 80%, #160040 0%, transparent 45%),
                   #03020d`,
      backgroundImage: `${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        ${Array.from({length:60}).map((_,i) => {
          const x = (i*37+13)%200, y=(i*53+7)%300, r=i%3===0?1.5:i%3===1?1:0.7;
          return `<circle cx='${x}' cy='${y}' r='${r}' fill='rgba(255,255,255,${0.2+i%5*0.08})'/>`;
        }).join('')}
      </svg>`)}`,
    },
  },
  {
    id: 'astrology',
    name: 'Astrology',
    style: {
      background: `radial-gradient(ellipse at 60% 40%, #001840 0%, transparent 60%),
                   radial-gradient(ellipse at 20% 80%, #002050 0%, transparent 50%),
                   #000c1e`,
      backgroundImage: `${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        ${Array.from({length:40}).map((_,i) => {
          const x=(i*43+17)%200,y=(i*67+23)%300,r=i%4===0?1.5:0.8;
          return `<circle cx='${x}' cy='${y}' r='${r}' fill='rgba(220,180,100,${0.15+i%4*0.1})'/>`;
        }).join('')}
        <line x1='30' y1='50' x2='80' y2='100' stroke='rgba(200,160,80,0.2)' stroke-width='0.8'/>
        <line x1='80' y1='100' x2='150' y2='80' stroke='rgba(200,160,80,0.15)' stroke-width='0.8'/>
        <line x1='150' y1='80' x2='120' y2='200' stroke='rgba(200,160,80,0.12)' stroke-width='0.8'/>
        <line x1='120' y1='200' x2='60' y2='220' stroke='rgba(200,160,80,0.15)' stroke-width='0.8'/>
        <line x1='60' y1='220' x2='30' y2='150' stroke='rgba(200,160,80,0.12)' stroke-width='0.8'/>
        <circle cx='30' cy='50'  r='3' fill='rgba(255,220,100,0.5)'/>
        <circle cx='80' cy='100' r='2' fill='rgba(255,220,100,0.4)'/>
        <circle cx='150' cy='80' r='4' fill='rgba(255,220,100,0.5)'/>
        <circle cx='120' cy='200' r='2.5' fill='rgba(255,220,100,0.4)'/>
        <circle cx='60' cy='220' r='3' fill='rgba(255,220,100,0.45)'/>
      </svg>`)}`,
    },
  },
  // ── Nature & Chill ────────────────────────────────────────────────────────
  {
    id: 'aurora',
    name: 'Aurora',
    style: {
      background: `radial-gradient(ellipse at 50% 20%, #00502a 0%, transparent 50%),
                   radial-gradient(ellipse at 80% 40%, #2a0060 0%, transparent 45%),
                   radial-gradient(ellipse at 20% 60%, #004040 0%, transparent 40%),
                   #010a0f`,
      backgroundImage: `${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        <path d='M0,80 Q50,20 100,60 T200,50' fill='none' stroke='rgba(0,255,150,0.15)' stroke-width='40'/>
        <path d='M0,120 Q60,60 120,100 T200,90' fill='none' stroke='rgba(100,0,255,0.12)' stroke-width='30'/>
        <path d='M0,100 Q80,40 150,80 T200,70' fill='none' stroke='rgba(0,200,200,0.1)' stroke-width='20'/>
      </svg>`)}`,
    },
  },
  {
    id: 'deep-ocean',
    name: 'Deep Ocean',
    style: {
      background: `radial-gradient(ellipse at 30% 70%, #000d40 0%, transparent 60%),
                   radial-gradient(ellipse at 70% 30%, #001a30 0%, transparent 55%),
                   linear-gradient(180deg, #010820 0%, #000c30 100%)`,
      backgroundImage: `${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        <ellipse cx='60'  cy='120' rx='12' ry='20' fill='none' stroke='rgba(0,200,255,0.2)' stroke-width='1'/>
        <ellipse cx='140' cy='200' rx='16' ry='26' fill='none' stroke='rgba(0,180,255,0.15)' stroke-width='1'/>
        <ellipse cx='100' cy='60'  rx='8'  ry='14' fill='none' stroke='rgba(50,220,255,0.18)' stroke-width='1'/>
        <line x1='60'  y1='100' x2='60'  y2='50'  stroke='rgba(0,200,255,0.1)' stroke-width='0.5'/>
        <line x1='140' y1='174' x2='140' y2='100' stroke='rgba(0,180,255,0.08)' stroke-width='0.5'/>
      </svg>`)}`,
    },
  },
  {
    id: 'enchanted-forest',
    name: 'Enchanted Forest',
    style: {
      background: `radial-gradient(ellipse at 50% 80%, #002810 0%, transparent 60%),
                   radial-gradient(ellipse at 20% 20%, #003020 0%, transparent 50%),
                   #000c08`,
      backgroundImage: `${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        <circle cx='40'  cy='250' r='6'  fill='rgba(0,255,140,0.25)'/>
        <circle cx='90'  cy='220' r='4'  fill='rgba(80,255,100,0.2)'/>
        <circle cx='160' cy='260' r='8'  fill='rgba(0,240,120,0.18)'/>
        <circle cx='120' cy='180' r='5'  fill='rgba(100,255,80,0.22)'/>
        <circle cx='60'  cy='190' r='3'  fill='rgba(60,255,160,0.25)'/>
        <circle cx='170' cy='200' r='4'  fill='rgba(0,220,140,0.2)'/>
        <line x1='80'  y1='300' x2='80'  y2='180' stroke='rgba(0,100,40,0.3)' stroke-width='2'/>
        <line x1='130' y1='300' x2='130' y2='160' stroke='rgba(0,80,30,0.25)' stroke-width='2.5'/>
        <line x1='50'  y1='300' x2='50'  y2='200' stroke='rgba(0,90,35,0.2)' stroke-width='1.5'/>
      </svg>`)}`,
    },
  },
  {
    id: 'foliage',
    name: 'Foliage',
    style: {
      background: `linear-gradient(160deg, #012020 0%, #001a18 50%, #010f10 100%)`,
      backgroundImage: `${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        <ellipse cx='10' cy='60' rx='45' ry='25' fill='rgba(0,80,60,0.3)' transform='rotate(-30,10,60)'/>
        <ellipse cx='180' cy='40' rx='40' ry='22' fill='rgba(0,70,50,0.25)' transform='rotate(20,180,40)'/>
        <ellipse cx='50' cy='200' rx='55' ry='28' fill='rgba(0,90,65,0.22)' transform='rotate(-20,50,200)'/>
        <ellipse cx='170' cy='180' rx='50' ry='25' fill='rgba(0,80,55,0.2)' transform='rotate(15,170,180)'/>
        <ellipse cx='100' cy='280' rx='60' ry='30' fill='rgba(0,100,70,0.25)' transform='rotate(-10,100,280)'/>
      </svg>`)}`,
    },
  },
  {
    id: 'cottagecore',
    name: 'Cottagecore',
    style: {
      background: `radial-gradient(ellipse at 50% 70%, #2a1200 0%, transparent 55%),
                   radial-gradient(ellipse at 50% 100%, #3a1800 0%, transparent 40%),
                   linear-gradient(180deg, #060210 0%, #100808 100%)`,
      backgroundImage: `${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        <rect x='75' y='170' width='50' height='60' fill='rgba(60,20,0,0.5)' rx='2'/>
        <polygon points='70,170 100,140 130,170' fill='rgba(40,15,0,0.5)'/>
        <rect x='88' y='195' width='14' height='20' fill='rgba(255,180,60,0.15)' rx='1'/>
        <rect x='107' y='195' width='8' height='12' fill='rgba(255,180,60,0.1)' rx='1'/>
        <circle cx='100' cy='90' r='20' fill='rgba(255,200,100,0.08)'/>
        <circle cx='100' cy='90' r='3' fill='rgba(255,220,120,0.3)'/>
        ${Array.from({length:20}).map((_,i) => {
          const x=(i*43+11)%200,y=(i*37+5)%100;
          return `<circle cx='${x}' cy='${y}' r='0.8' fill='rgba(255,220,180,${0.1+i%3*0.08})'/>`;
        }).join('')}
      </svg>`)}`,
    },
  },
  // ── City & Vibes ──────────────────────────────────────────────────────────
  {
    id: 'lo-fi',
    name: 'Lo-Fi',
    style: {
      background: `radial-gradient(ellipse at 50% 100%, #1a0060 0%, transparent 60%),
                   radial-gradient(ellipse at 20% 80%, #0a0040 0%, transparent 50%),
                   linear-gradient(180deg, #040020 0%, #0a0030 100%)`,
      backgroundImage: `${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        <rect x='0'   y='230' width='200' height='70' fill='rgba(10,0,40,0.7)'/>
        <rect x='10'  y='200' width='20' height='30'  fill='rgba(80,40,180,0.4)'/>
        <rect x='40'  y='185' width='15' height='45'  fill='rgba(60,20,160,0.35)'/>
        <rect x='65'  y='195' width='25' height='35'  fill='rgba(70,30,170,0.4)'/>
        <rect x='100' y='190' width='18' height='40'  fill='rgba(80,40,180,0.35)'/>
        <rect x='130' y='180' width='22' height='50'  fill='rgba(60,20,150,0.4)'/>
        <rect x='162' y='200' width='16' height='30'  fill='rgba(70,30,160,0.35)'/>
        <rect x='182' y='205' width='18' height='25'  fill='rgba(80,40,175,0.35)'/>
        <rect x='15'  y='210' width='4' height='4' fill='rgba(180,160,255,0.3)' rx='1'/>
        <rect x='23'  y='206' width='3' height='3' fill='rgba(180,160,255,0.25)' rx='1'/>
        <rect x='45'  y='195' width='3' height='3' fill='rgba(200,180,255,0.3)' rx='1'/>
        <circle cx='100' cy='50' r='15' fill='rgba(255,220,80,0.12)'/>
        <circle cx='100' cy='50' r='5' fill='rgba(255,230,100,0.3)'/>
      </svg>`)}`,
    },
  },
  {
    id: 'new-horizons',
    name: 'New Horizons',
    style: {
      background: `radial-gradient(ellipse at 50% 70%, #1a0050 0%, transparent 55%),
                   radial-gradient(ellipse at 50% 40%, #200060 0%, transparent 45%),
                   linear-gradient(180deg, #040018 0%, #0a0030 100%)`,
      backgroundImage: `${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        <path d='M60,260 Q100,140 140,260' fill='none' stroke='rgba(140,80,255,0.5)' stroke-width='4' stroke-linecap='round'/>
        <path d='M70,260 Q100,155 130,260' fill='none' stroke='rgba(160,100,255,0.3)' stroke-width='6'/>
        <ellipse cx='100' cy='260' rx='40' ry='8' fill='rgba(120,60,220,0.2)'/>
        <path d='M0,220 Q50,200 100,210 T200,200' fill='none' stroke='rgba(80,40,180,0.4)' stroke-width='1'/>
        <path d='M0,235 Q50,215 100,225 T200,215' fill='none' stroke='rgba(80,40,180,0.3)' stroke-width='1'/>
        <circle cx='100' cy='155' r='6' fill='rgba(200,160,255,0.5)'/>
        ${Array.from({length:15}).map((_,i)=>{
          const x=(i*47+23)%200, y=(i*31+11)%120;
          return `<circle cx='${x}' cy='${y}' r='0.8' fill='rgba(200,180,255,${0.15+i%4*0.1})'/>`;
        }).join('')}
      </svg>`)}`,
    },
  },
  // ── Music & Energy ────────────────────────────────────────────────────────
  {
    id: 'music-rings',
    name: 'Music',
    style: {
      background: '#050505',
      backgroundImage: `${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        <circle cx='100' cy='170' r='30'  fill='none' stroke='rgba(255,30,120,0.4)'  stroke-width='1.5'/>
        <circle cx='100' cy='170' r='55'  fill='none' stroke='rgba(255,30,120,0.3)'  stroke-width='1'/>
        <circle cx='100' cy='170' r='80'  fill='none' stroke='rgba(255,30,120,0.2)'  stroke-width='1'/>
        <circle cx='100' cy='170' r='105' fill='none' stroke='rgba(255,30,120,0.15)' stroke-width='0.8'/>
        <circle cx='100' cy='170' r='130' fill='none' stroke='rgba(255,30,120,0.1)'  stroke-width='0.6'/>
        <circle cx='100' cy='170' r='8'   fill='rgba(255,60,140,0.8)'/>
        <circle cx='100' cy='170' r='3'   fill='rgba(255,100,160,1)'/>
      </svg>`)}`,
    },
  },
  {
    id: 'celebration',
    name: 'Celebration',
    style: {
      background: `radial-gradient(ellipse at 50% 30%, #001060 0%, transparent 50%), #000820`,
      backgroundImage: `${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        ${['#FFD700','#FF6B9D','#00F5FF','#FF4500','#7B68EE','#00FF88','#FF1493'].flatMap((c,ci) =>
          Array.from({length:8}).map((_,i) => {
            const x=(ci*31+i*23+7)%190+5, y=(ci*47+i*37+11)%280+5;
            const rot = (ci*30+i*45)%360;
            const type = i%3;
            if(type===0) return `<rect x='${x}' y='${y}' width='4' height='10' fill='${c}' opacity='${0.4+i%3*0.15}' transform='rotate(${rot},${x+2},${y+5})'/>`;
            if(type===1) return `<circle cx='${x}' cy='${y}' r='3' fill='${c}' opacity='${0.3+i%3*0.12}'/>`;
            return `<polygon points='${x},${y} ${x+4},${y+8} ${x+8},${y}' fill='${c}' opacity='${0.35+i%3*0.1}'/>`;
          })
        ).join('')}
      </svg>`)}`,
    },
  },
  {
    id: 'lava',
    name: 'Lava',
    style: {
      background: `radial-gradient(ellipse at 30% 80%, #5c1500 0%, transparent 50%),
                   radial-gradient(ellipse at 70% 60%, #3a0e00 0%, transparent 45%),
                   #080300`,
      backgroundImage: `${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        <path d='M0,200 Q30,180 50,210 T100,195 T150,215 T200,200 L200,300 L0,300 Z' fill='rgba(180,40,0,0.25)'/>
        <path d='M0,240 Q40,220 70,245 T130,230 T200,240 L200,300 L0,300 Z' fill='rgba(220,60,0,0.2)'/>
        <line x1='40'  y1='300' x2='60'  y2='180' stroke='rgba(255,100,0,0.2)' stroke-width='4'/>
        <line x1='100' y1='300' x2='85'  y2='150' stroke='rgba(255,80,0,0.15)' stroke-width='6'/>
        <line x1='160' y1='300' x2='145' y2='200' stroke='rgba(255,120,0,0.18)' stroke-width='3'/>
        <line x1='80'  y1='300' x2='70'  y2='220' stroke='rgba(255,60,0,0.12)' stroke-width='2'/>
      </svg>`)}`,
    },
  },
  // ── Pop Culture ───────────────────────────────────────────────────────────
  {
    id: 'blackpink',
    name: 'BLACKPINK',
    style: {
      background: '#000000',
      backgroundImage: `${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        <line x1='0' y1='300' x2='200' y2='0' stroke='rgba(255,20,120,0.5)' stroke-width='2'/>
        <line x1='10' y1='300' x2='200' y2='15' stroke='rgba(255,40,140,0.2)' stroke-width='6'/>
        <line x1='-10' y1='290' x2='190' y2='0' stroke='rgba(255,20,120,0.15)' stroke-width='12'/>
        <line x1='30' y1='300' x2='200' y2='50' stroke='rgba(255,60,160,0.08)' stroke-width='20'/>
      </svg>`)}`,
    },
  },
  {
    id: 'brat',
    name: 'Brat',
    style: {
      background: '#000000',
      backgroundImage: `${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        <text x='50%' y='55%' font-family='Impact, Arial Black, sans-serif' font-size='52' 
              font-weight='900' fill='#b5ea3a' text-anchor='middle' dominant-baseline='middle'
              letter-spacing='-2'>brat</text>
      </svg>`)}`,
    },
  },
  {
    id: 'sky-garden',
    name: 'Sky Garden',
    style: {
      background: `radial-gradient(ellipse at 50% 40%, #001830 0%, transparent 60%),
                   linear-gradient(180deg, #020c18 0%, #04101e 100%)`,
      backgroundImage: `${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        ${Array.from({length:25}).map((_,i)=>{
          const x=(i*43+17)%200,y=(i*37+13)%130;
          return `<circle cx='${x}' cy='${y}' r='0.8' fill='rgba(200,220,255,${0.1+i%5*0.07})'/>`;
        }).join('')}
        <ellipse cx='60'  cy='160' rx='35' ry='18' fill='rgba(20,100,60,0.4)' transform='rotate(-8,60,160)'/>
        <ellipse cx='140' cy='150' rx='30' ry='15' fill='rgba(30,90,50,0.35)' transform='rotate(5,140,150)'/>
        <ellipse cx='100' cy='180' rx='45' ry='20' fill='rgba(25,110,55,0.38)'/>
        <ellipse cx='40'  cy='175' rx='25' ry='12' fill='rgba(20,90,45,0.3)'/>
        <ellipse cx='170' cy='165' rx='28' ry='13' fill='rgba(30,100,50,0.32)'/>
        <circle cx='55' cy='140'  r='4' fill='rgba(255,180,80,0.4)'/>
        <circle cx='130' cy='135' r='3' fill='rgba(255,160,60,0.35)'/>
        <circle cx='90' cy='155'  r='5' fill='rgba(255,200,100,0.3)'/>
      </svg>`)}`,
    },
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    style: {
      background: `linear-gradient(180deg, #5c1a00 0%, #8b2500 20%, #c43e00 40%, #e07020 60%, #c44080 80%, #601050 100%)`,
    },
  },
  // ── Extra Vibes ───────────────────────────────────────────────────────────
  {
    id: 'i-heart-you',
    name: 'I Heart You',
    style: {
      background: `radial-gradient(ellipse at 50% 50%, #ff2090 0%, #cc0060 50%, #aa0050 100%)`,
      backgroundImage: `${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        <circle cx='60'  cy='80'  r='40' fill='rgba(255,255,255,0.06)'/>
        <circle cx='160' cy='200' r='55' fill='rgba(255,255,255,0.05)'/>
        <circle cx='110' cy='150' r='25' fill='rgba(255,255,255,0.08)'/>
        <text x='50%' y='52%' font-size='60' text-anchor='middle' dominant-baseline='middle' fill='rgba(255,255,255,0.12)'>♥</text>
      </svg>`)}`,
    },
  },
  {
    id: 'thinking-of-you',
    name: 'Thinking of You',
    style: {
      background: `radial-gradient(ellipse at 40% 50%, #2060ff 0%, #0030cc 50%, #001a80 100%)`,
      backgroundImage: `${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        <circle cx='60'  cy='100' r='45' fill='rgba(255,255,255,0.08)' style='filter:blur(10px)'/>
        <circle cx='150' cy='200' r='55' fill='rgba(255,255,255,0.07)'/>
        <circle cx='100' cy='150' r='20' fill='rgba(255,255,255,0.1)'/>
        <text x='35'  y='120' font-size='28' fill='rgba(255,255,255,0.2)'>♥</text>
        <text x='120' y='220' font-size='36' fill='rgba(255,255,255,0.15)'>♥</text>
      </svg>`)}`,
    },
  },
  {
    id: 'loops',
    name: 'Loops',
    style: {
      background: '#000000',
      backgroundImage: `${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        <path d='M0,80 C50,20 150,140 200,80' fill='none' stroke='rgba(200,200,200,0.15)' stroke-width='15'/>
        <path d='M0,140 C60,80 140,200 200,140' fill='none' stroke='rgba(180,180,180,0.12)' stroke-width='18'/>
        <path d='M0,200 C70,140 130,260 200,200' fill='none' stroke='rgba(200,200,200,0.1)' stroke-width='20'/>
        <path d='M0,80 C50,20 150,140 200,80' fill='none' stroke='rgba(255,255,255,0.05)' stroke-width='2'/>
        <path d='M0,140 C60,80 140,200 200,140' fill='none' stroke='rgba(255,255,255,0.04)' stroke-width='2'/>
      </svg>`)}`,
    },
  },
  {
    id: 'lollipop',
    name: 'Lollipop',
    style: {
      background: `radial-gradient(ellipse at 30% 30%, #2d0060 0%, transparent 55%),
                   radial-gradient(ellipse at 80% 70%, #1a0040 0%, transparent 50%), #0a0020`,
      backgroundImage: `${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        <circle cx='50'  cy='60'  r='18' fill='rgba(255,100,160,0.3)' stroke='rgba(255,120,180,0.4)' stroke-width='1'/>
        <circle cx='50'  cy='60'  r='10' fill='rgba(255,60,120,0.25)'/>
        <line x1='50' y1='78' x2='50' y2='120' stroke='rgba(200,100,150,0.35)' stroke-width='2'/>
        <circle cx='150' cy='40'  r='14' fill='rgba(120,200,255,0.25)' stroke='rgba(140,220,255,0.35)' stroke-width='1'/>
        <line x1='150' y1='54' x2='150' y2='90' stroke='rgba(120,180,220,0.3)' stroke-width='2'/>
        <circle cx='30'  cy='200' r='20' fill='rgba(255,220,60,0.2)' stroke='rgba(255,240,80,0.3)' stroke-width='1'/>
        <line x1='30' y1='220' x2='30' y2='270' stroke='rgba(200,180,60,0.25)' stroke-width='2'/>
        <circle cx='160' cy='180' r='16' fill='rgba(160,255,120,0.2)' stroke='rgba(180,255,140,0.3)' stroke-width='1'/>
        <line x1='160' y1='196' x2='160' y2='240' stroke='rgba(140,200,100,0.25)' stroke-width='2'/>
      </svg>`)}`,
    },
  },
  {
    id: 'pizza',
    name: 'Pizza',
    style: {
      background: '#050505',
      backgroundImage: `${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        <g transform='translate(60,70) scale(0.9)'>
          <polygon points='40,0 80,80 0,80' fill='none' stroke='rgba(255,140,0,0.5)' stroke-width='2' stroke-linejoin='round'/>
          <polygon points='40,0 80,80 0,80' fill='rgba(255,100,0,0.08)'/>
          <circle cx='40' cy='45' r='5' fill='rgba(255,60,0,0.4)'/>
          <circle cx='25' cy='62' r='4' fill='rgba(255,60,0,0.35)'/>
          <circle cx='57' cy='60' r='4' fill='rgba(255,60,0,0.35)'/>
        </g>
        <circle cx='100' cy='200' r='60' fill='none' stroke='rgba(255,120,0,0.08)' stroke-width='40'/>
        <circle cx='100' cy='200' r='10' fill='rgba(255,150,0,0.1)'/>
      </svg>`)}`,
    },
  },
  {
    id: 'avocado',
    name: 'Avocado',
    style: {
      background: `linear-gradient(160deg, #012520 0%, #011a18 60%, #010f0e 100%)`,
      backgroundImage: `${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        <ellipse cx='60' cy='100' rx='22' ry='32' fill='rgba(60,120,40,0.35)' stroke='rgba(80,140,50,0.3)' stroke-width='1'/>
        <ellipse cx='60' cy='108' rx='12' ry='18' fill='rgba(100,190,80,0.2)'/>
        <circle  cx='60' cy='115' r='7'  fill='rgba(80,40,0,0.4)'/>
        <ellipse cx='140' cy='180' rx='25' ry='35' fill='rgba(50,110,35,0.35)' stroke='rgba(70,130,45,0.3)' stroke-width='1'/>
        <ellipse cx='140' cy='190' rx='14' ry='20' fill='rgba(90,175,70,0.2)'/>
        <circle  cx='140' cy='197' r='8'  fill='rgba(70,35,0,0.4)'/>
        <ellipse cx='110' cy='50' rx='18' ry='26' fill='rgba(55,115,38,0.3)' stroke='rgba(75,135,48,0.25)' stroke-width='1'/>
        <circle  cx='110' cy='62' r='6'  fill='rgba(75,38,0,0.35)'/>
      </svg>`)}`,
    },
  },
  {
    id: 'goth-charms',
    name: 'Goth Charms',
    style: {
      background: `radial-gradient(ellipse at 50% 30%, #1a1020 0%, transparent 60%), #0a0808`,
      backgroundImage: `${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        <circle cx='100' cy='80' r='25' fill='none' stroke='rgba(150,100,200,0.2)' stroke-width='1'/>
        <line x1='100' y1='105' x2='100' y2='200' stroke='rgba(130,80,180,0.2)' stroke-width='1'/>
        <line x1='70'  y1='140' x2='130' y2='140' stroke='rgba(130,80,180,0.15)' stroke-width='0.8'/>
        <circle cx='100' cy='200' r='8' fill='none' stroke='rgba(150,100,200,0.2)' stroke-width='1'/>
        <circle cx='70'  cy='140' r='5' fill='rgba(150,100,200,0.15)' stroke='rgba(150,100,200,0.3)' stroke-width='0.8'/>
        <circle cx='130' cy='140' r='5' fill='rgba(150,100,200,0.15)' stroke='rgba(150,100,200,0.3)' stroke-width='0.8'/>
        <text x='50%' y='75%' font-size='18' text-anchor='middle' fill='rgba(150,100,200,0.15)'>✦ ✦ ✦</text>
      </svg>`)}`,
    },
  },
  {
    id: 'besties',
    name: 'Besties',
    style: {
      background: `radial-gradient(ellipse at 50% 60%, #0040ff 0%, #0020cc 50%, #001080 100%)`,
      backgroundImage: `${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        <ellipse cx='70'  cy='180' rx='20' ry='50' fill='rgba(100,180,255,0.25)'/>
        <circle  cx='70'  cy='120' r='18' fill='rgba(120,200,255,0.2)'/>
        <ellipse cx='130' cy='185' rx='20' ry='50' fill='rgba(80,160,255,0.22)'/>
        <circle  cx='130' cy='125' r='18' fill='rgba(100,185,255,0.18)'/>
      </svg>`)}`,
    },
  },
  {
    id: 'splash',
    name: 'Splash',
    style: {
      background: `radial-gradient(ellipse at 40% 60%, #003899 0%, transparent 55%),
                   radial-gradient(ellipse at 70% 30%, #0020cc 0%, transparent 50%),
                   linear-gradient(160deg, #000c40 0%, #001060 100%)`,
      backgroundImage: `${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        <path d='M40,200 Q80,100 120,160 T200,120' fill='none' stroke='rgba(80,140,255,0.3)' stroke-width='3'/>
        <path d='M0,180 Q60,80 110,140 T200,100' fill='none' stroke='rgba(60,120,255,0.2)' stroke-width='6'/>
        <circle cx='120' cy='160' r='30' fill='rgba(40,100,255,0.15)'/>
        <circle cx='80'  cy='120' r='15' fill='rgba(60,120,255,0.12)'/>
      </svg>`)}`,
    },
  },
  {
    id: 'crimson',
    name: 'Crimson',
    style: {
      background: `radial-gradient(ellipse at 40% 40%, #3d0010 0%, transparent 55%),
                   radial-gradient(ellipse at 70% 80%, #280008 0%, transparent 50%),
                   #0a0005`,
    },
  },
  {
    id: 'emerald',
    name: 'Emerald',
    style: {
      background: `radial-gradient(ellipse at 30% 30%, #003820 0%, transparent 55%),
                   radial-gradient(ellipse at 70% 70%, #002515 0%, transparent 50%),
                   #010d06`,
    },
  },
  // ── NEW FIRE THEMES ──────────────────────────────────────────────────────────
  { id:'neon-tokyo', name:'Neon Tokyo', style:{ background:'#020208', backgroundImage:`${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'><rect x='0' y='200' width='200' height='100' fill='rgba(0,10,8,0.85)'/><rect x='0' y='175' width='25' height='125' fill='rgba(0,15,10,0.8)'/><rect x='30' y='158' width='18' height='142' fill='rgba(0,12,8,0.8)'/><rect x='55' y='182' width='28' height='118' fill='rgba(0,16,12,0.8)'/><rect x='90' y='165' width='22' height='135' fill='rgba(0,14,9,0.8)'/><rect x='120' y='150' width='28' height='150' fill='rgba(0,12,8,0.8)'/><rect x='158' y='172' width='22' height='128' fill='rgba(0,15,10,0.8)'/><rect x='10' y='214' width='10' height='4' rx='2' fill='rgba(0,255,140,0.6)'/><rect x='40' y='196' width='8' height='3' rx='1' fill='rgba(255,0,100,0.6)'/><rect x='95' y='204' width='11' height='4' rx='2' fill='rgba(0,180,255,0.6)'/><rect x='130' y='192' width='14' height='4' rx='2' fill='rgba(255,80,0,0.55)'/>${Array.from({length:18}).map((_,i)=>{const x=(i*17+3)%198,y=(i*23+7)%170,h=6+i%8;return `<line x1='${x}' y1='${y}' x2='${x+1}' y2='${y+h}' stroke='rgba(0,255,150,${0.04+i%4*0.015})' stroke-width='0.5'/>`;}).join('')}</svg>`)}`}},
  { id:'sakura', name:'Sakura', style:{ background:`radial-gradient(ellipse at 30% 40%, #2a0018 0%, transparent 55%), linear-gradient(180deg, #0d0008 0%, #180010 100%)`, backgroundImage:`${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'><path d='M0,300 Q30,220 60,180 Q90,140 80,80' fill='none' stroke='rgba(80,20,30,0.5)' stroke-width='6' stroke-linecap='round'/><path d='M60,180 Q100,160 130,120' fill='none' stroke='rgba(70,18,28,0.4)' stroke-width='3' stroke-linecap='round'/>${Array.from({length:22}).map((_,i)=>{const x=(i*41+13)%190+5,y=(i*53+7)%280+5,s=2.5+i%4;return `<circle cx='${x}' cy='${y}' r='${s*0.8}' fill='rgba(255,180,200,${0.12+i%4*0.05})'/><circle cx='${x+s}' cy='${y-s*0.5}' r='${s*0.7}' fill='rgba(255,160,190,${0.1+i%4*0.04})'/>`;}).join('')}</svg>`)}`}},
  { id:'vaporwave', name:'Vaporwave', style:{ background:`linear-gradient(180deg, #0d0030 0%, #1a0040 40%, #40001a 70%, #600025 100%)`, backgroundImage:`${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>${Array.from({length:11}).map((_,i)=>`<line x1='${i*20}' y1='300' x2='100' y2='148' stroke='rgba(200,0,255,0.15)' stroke-width='0.7'/>`).join('')}${Array.from({length:12}).map((_,i)=>{const y=150+i*i*1.5;return `<line x1='0' y1='${y}' x2='200' y2='${y}' stroke='rgba(255,0,200,${0.22-i*0.015})' stroke-width='0.8'/>`;}).join('')}<circle cx='100' cy='100' r='42' fill='rgba(255,140,0,0.18)'/><circle cx='100' cy='100' r='35' fill='rgba(255,180,0,0.22)'/>${Array.from({length:6}).map((_,i)=>`<rect x='65' y='${82+i*9}' width='70' height='5' fill='rgba(0,0,0,0.35)'/>`).join('')}</svg>`)}`}},
  { id:'matrix', name:'Matrix', style:{ background:'#000000', backgroundImage:`${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300' font-family='monospace'>${Array.from({length:20}).map((_,ci)=>{const x=ci*10+2;return Array.from({length:14}).map((_,ri)=>{const y=ri*22+(ci*5)%22,chars=['0','1','ア','ウ','カ','Z','X','ナ'],ch=chars[(ci+ri)%8],op=ri===0?0.9:ri<3?0.4:0.12,col=ri===0?`rgba(160,255,160,${op})`:`rgba(0,180,60,${op})`;return `<text x='${x}' y='${y}' font-size='9' fill='${col}'>${ch}</text>`;}).join('');}).join('')}</svg>`)}`}},
  { id:'blood-moon-vector', name:'Blood Moon', style:{ background:`radial-gradient(ellipse at 70% 25%, #400000 0%, transparent 45%), #050000`, backgroundImage:`${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'><circle cx='145' cy='65' r='50' fill='rgba(140,0,0,0.08)'/><circle cx='145' cy='65' r='35' fill='rgba(170,0,0,0.1)'/><circle cx='145' cy='65' r='22' fill='rgba(200,15,0,0.28)'/><circle cx='145' cy='65' r='16' fill='rgba(220,35,0,0.38)'/><circle cx='138' cy='58' r='4' fill='rgba(0,0,0,0.2)'/><circle cx='152' cy='71' r='3' fill='rgba(0,0,0,0.18)'/><polygon points='0,250 40,200 80,235 130,185 170,225 200,190 200,300 0,300' fill='rgba(28,0,0,0.75)'/>${Array.from({length:18}).map((_,i)=>{const x=(i*43+7)%198,y=(i*31+11)%140;return `<circle cx='${x}' cy='${y}' r='${i%5===0?1:0.6}' fill='rgba(255,160,160,${0.1+i%4*0.08})'/>`;}).join('')}</svg>`)}`}},
  { id:'stardust', name:'Stardust', style:{ background:'#030200', backgroundImage:`${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>${Array.from({length:80}).map((_,i)=>{const x=(i*37+9)%200,y=(i*53+7)%300,big=i%12===0,r=big?2:i%5===0?1.2:0.6,op=big?0.7:0.15+i%7*0.06,col=i%3===0?'255,220,100':i%3===1?'255,255,200':'220,200,100';return `<circle cx='${x}' cy='${y}' r='${r}' fill='rgba(${col},${op})'/>`;}).join('')}<line x1='30' y1='60' x2='90' y2='120' stroke='rgba(255,220,100,0.3)' stroke-width='1'/><circle cx='30' cy='60' r='2' fill='rgba(255,240,150,0.8)'/></svg>`)}`}},
  { id:'thunderstorm', name:'Thunderstorm', style:{ background:`linear-gradient(180deg, #050510 0%, #020208 100%)`, backgroundImage:`${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>${Array.from({length:35}).map((_,i)=>{const x=(i*13+7)%200,y=(i*17+3)%280;return `<line x1='${x}' y1='${y}' x2='${x-2}' y2='${y+10}' stroke='rgba(140,160,220,0.1)' stroke-width='0.6'/>`;}).join('')}<polyline points='80,0 65,75 82,75 52,180' fill='none' stroke='rgba(255,255,255,0.25)' stroke-width='4' stroke-linejoin='round'/><polyline points='80,0 65,75 82,75 52,180' fill='none' stroke='rgba(200,220,255,0.7)' stroke-width='1.5' stroke-linejoin='round'/><ellipse cx='60' cy='20' rx='50' ry='18' fill='rgba(18,18,32,0.7)'/><ellipse cx='140' cy='14' rx='62' ry='20' fill='rgba(15,15,28,0.75)'/></svg>`)}`}},
  { id:'koi', name:'Koi Fish', style:{ background:`radial-gradient(ellipse at 50% 50%, #001520 0%, #000c15 100%)`, backgroundImage:`${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'><ellipse cx='80' cy='120' rx='35' ry='12' fill='none' stroke='rgba(0,150,200,0.12)' stroke-width='1'/><ellipse cx='80' cy='120' rx='55' ry='20' fill='none' stroke='rgba(0,130,180,0.08)' stroke-width='0.8'/><ellipse cx='80' cy='120' rx='28' ry='10' fill='rgba(220,60,0,0.5)' transform='rotate(-20,80,120)'/><ellipse cx='80' cy='120' rx='20' ry='7' fill='rgba(240,80,0,0.4)' transform='rotate(-20,80,120)'/><circle cx='60' cy='113' r='4' fill='rgba(255,200,100,0.6)'/><circle cx='58' cy='112' r='1.5' fill='rgba(0,0,0,0.8)'/><path d='M105,118 Q118,108 115,128 Q108,135 105,125 Z' fill='rgba(220,60,0,0.35)' transform='rotate(-20,80,120)'/><ellipse cx='140' cy='220' rx='22' ry='8' fill='rgba(240,220,140,0.4)' transform='rotate(25,140,220)'/><circle cx='124' cy='214' r='1.2' fill='rgba(0,0,0,0.8)'/><ellipse cx='50' cy='250' rx='18' ry='8' fill='rgba(0,80,30,0.4)'/></svg>`)}`}},
  { id:'desert-night', name:'Desert Night', style:{ background:`radial-gradient(ellipse at 70% 20%, #1a1000 0%, transparent 50%), linear-gradient(180deg, #030208 0%, #0d0a00 100%)`, backgroundImage:`${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>${Array.from({length:25}).map((_,i)=>{const x=(i*43+11)%200,y=(i*31+7)%160;return `<circle cx='${x}' cy='${y}' r='${i%7===0?1.2:0.6}' fill='rgba(255,240,200,${0.12+i%5*0.07})'/>`;}).join('')}<circle cx='150' cy='50' r='22' fill='rgba(255,220,100,0.22)'/><circle cx='161' cy='43' r='19' fill='rgba(4,2,10,1)'/><path d='M0,290 Q50,230 100,260 T200,240 L200,300 L0,300 Z' fill='rgba(85,55,8,0.7)'/><path d='M0,300 Q40,258 90,272 T200,262 L200,300 Z' fill='rgba(65,42,4,0.8)'/></svg>`)}`}},
  { id:'arctic', name:'Arctic', style:{ background:`radial-gradient(ellipse at 50% 20%, #001840 0%, transparent 55%), linear-gradient(180deg, #000d20 0%, #001020 100%)`, backgroundImage:`${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'><polygon points='30,300 45,210 60,300' fill='rgba(140,200,255,0.15)'/><polygon points='55,300 75,185 92,300' fill='rgba(120,190,255,0.12)'/><polygon points='88,300 108,198 128,300' fill='rgba(140,200,255,0.14)'/><polygon points='130,300 150,215 168,300' fill='rgba(120,190,255,0.12)'/><polygon points='162,300 178,225 196,300' fill='rgba(140,200,255,0.1)'/>${Array.from({length:18}).map((_,i)=>{const x=(i*43+11)%198,y=(i*37+15)%290;return `<circle cx='${x}' cy='${y}' r='${i%5===0?1.5:0.7}' fill='rgba(220,240,255,${0.08+i%4*0.04})'/>`;}).join('')}</svg>`)}`}},
  { id:'holographic', name:'Holographic', style:{ background:`linear-gradient(135deg, #1a0030 0%, #000060 15%, #002060 30%, #003030 45%, #200020 75%, #1a0030 100%)`, backgroundImage:`${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>${Array.from({length:16}).map((_,i)=>{const y=i*19,c=['rgba(255,0,200,0.22)','rgba(0,200,255,0.18)','rgba(0,255,180,0.15)','rgba(255,100,0,0.15)'][i%4];return `<rect x='0' y='${y}' width='200' height='11' fill='${c}' opacity='${0.5+i%3*0.15}'/>`;}).join('')}</svg>`)}`}},
  { id:'rose-gold', name:'Rose Gold', style:{ background:`linear-gradient(155deg, #1a0808 0%, #2a0c0c 25%, #1e0c14 50%, #0d0508 100%)`, backgroundImage:`${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'><ellipse cx='60' cy='120' rx='80' ry='60' fill='rgba(212,150,120,0.12)'/><ellipse cx='140' cy='210' rx='80' ry='65' fill='rgba(180,100,100,0.1)'/><line x1='0' y1='95' x2='200' y2='75' stroke='rgba(212,160,130,0.07)' stroke-width='16'/><line x1='0' y1='195' x2='200' y2='175' stroke='rgba(200,140,120,0.05)' stroke-width='22'/></svg>`)}`}},
  { id:'neon-grid', name:'Neon Grid', style:{ background:`radial-gradient(ellipse at 50% 50%, #000a20 0%, #000510 100%)`, backgroundImage:`${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>${Array.from({length:11}).map((_,i)=>`<line x1='${i*20}' y1='0' x2='${i*20}' y2='300' stroke='rgba(0,200,255,${i===5?0.25:0.09})' stroke-width='${i===5?1.2:0.7}'/>`).join('')}${Array.from({length:16}).map((_,i)=>`<line x1='0' y1='${i*20}' x2='200' y2='${i*20}' stroke='rgba(0,200,255,0.08)' stroke-width='0.7'/>`).join('')}${Array.from({length:5}).map((_,i)=>Array.from({length:5}).map((_,j)=>`<circle cx='${60+i*20}' cy='${110+j*20}' r='1.5' fill='rgba(0,220,255,0.3)'/>`).join('')).join('')}</svg>`)}`}},
  { id:'candy', name:'Candy', style:{ background:`radial-gradient(ellipse at 30% 30%, #3a0040 0%, transparent 50%), linear-gradient(135deg, #1a0030 0%, #000830 100%)`, backgroundImage:`${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'><circle cx='40' cy='60' r='30' fill='rgba(255,100,200,0.1)'/><circle cx='160' cy='100' r='40' fill='rgba(100,200,255,0.08)'/><circle cx='80' cy='200' r='50' fill='rgba(200,100,255,0.09)'/><circle cx='160' cy='240' r='35' fill='rgba(100,255,200,0.07)'/><text x='20' y='40' font-size='12' fill='rgba(255,200,255,0.3)'>✦</text><text x='150' y='60' font-size='10' fill='rgba(200,255,255,0.25)'>✦</text><text x='100' y='160' font-size='14' fill='rgba(255,200,200,0.2)'>✦</text></svg>`)}`}},
  { id:'obsidian', name:'Obsidian', style:{ background:`radial-gradient(ellipse at 40% 30%, #0f0f14 0%, transparent 60%), #030304`, backgroundImage:`${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'><polygon points='100,20 160,80 140,160 60,160 40,80' fill='none' stroke='rgba(140,140,180,0.07)' stroke-width='1'/><polygon points='100,50 140,100 120,160 80,160 60,100' fill='none' stroke='rgba(120,120,160,0.05)' stroke-width='0.8'/><line x1='100' y1='20' x2='100' y2='160' stroke='rgba(150,150,200,0.06)' stroke-width='0.8'/><ellipse cx='100' cy='90' rx='40' ry='40' fill='rgba(100,100,160,0.03)'/></svg>`)}`}},
  { id:'rave', name:'Rave', style:{ background:'#000000', backgroundImage:`${svgBg(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'><line x1='100' y1='300' x2='20' y2='0' stroke='rgba(255,0,200,4)' stroke-width='1.5'/><line x1='100' y1='300' x2='180' y2='0' stroke='rgba(0,200,255,0.4)' stroke-width='1.5'/><line x1='100' y1='300' x2='100' y2='0' stroke='rgba(0,255,100,0.3)' stroke-width='1'/><line x1='100' y1='300' x2='0' y2='100' stroke='rgba(255,200,0,0.3)' stroke-width='1'/><line x1='100' y1='300' x2='200' y2='100' stroke='rgba(255,0,100,0.3)' stroke-width='1'/><line x1='100' y1='300' x2='20' y2='0' stroke='rgba(255,0,200,0.06)' stroke-width='12'/><line x1='100' y1='300' x2='180' y2='0' stroke='rgba(0,200,255,0.06)' stroke-width='12'/>${Array.from({length:18}).map((_,i)=>{const x=i*12,h=18+i%5*8;return `<rect x='${x}' y='${300-h}' width='9' height='${h}' fill='rgba(0,0,0,0.95)' rx='4'/>`;}).join('')}</svg>`)}`}},
  ...CINEMATIC_THEMES,
  ...AESTHETIC_THEMES,
];

// ─── Component ────────────────────────────────────────────────────────────────
interface CustomThemeSelectorProps {
  selectedTheme?: string;
  blur?: number;
  onApply: (data: { theme_id: string; theme_blur: number }) => void;
}

export function CustomThemeSelector({ selectedTheme = 'midnight', blur = 0, onApply }: CustomThemeSelectorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const supabase = createClient();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('chat-themes').upload(`custom/${fileName}`, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('chat-themes').getPublicUrl(`custom/${fileName}`);
      onApply({ theme_id: data.publicUrl, theme_blur: blur });
    } catch (err) {
      console.error('Upload error:', err);
      alert('Upload failed. Did you run the SQL migration?');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Upload Banner */}
      <div className="px-5 py-3 border-b border-white/5">
        <input type="file" ref={fileInputRef} onChange={handleUpload} accept="image/*" className="hidden" />
        <button
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center gap-3 px-4 py-3 bg-white/[0.03] hover:bg-white/[0.06] border border-dashed border-white/20 rounded-2xl transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex flex-col items-center justify-center flex-shrink-0 group-hover:bg-indigo-500/20 transition-colors">
            {uploading
              ? <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              : <Upload className="w-4 h-4 text-indigo-400" />}
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-white">Upload Custom Photo</p>
            <p className="text-[11px] text-white/40">Set your own background image</p>
          </div>
        </button>

        {selectedTheme.startsWith('http') && (
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-[11px] text-white/40">
              <span>Blur</span><span>{blur}px</span>
            </div>
            <input type="range" min="0" max="20" value={blur}
              onChange={e => onApply({ theme_id: selectedTheme, theme_blur: +e.target.value })}
              className="w-full accent-indigo-500 h-1" />
          </div>
        )}
      </div>

      {/* Theme Grid */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">Theme Library</p>
          <button
            onClick={() => {
              const all = [...PRESET_THEMES, ...CINEMATIC_THEMES];
              const random = all[Math.floor(Math.random() * all.length)];
              onApply({ theme_id: random.id, theme_blur: 0 });
            }}
            className="text-[10px] font-bold text-indigo-400 hover:text-white transition-colors flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10"
          >
            Shuffle
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {PRESET_THEMES.map(t => {
            const isSelected = selectedTheme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onApply({ theme_id: t.id, theme_blur: 0 })}
                className="flex flex-col items-center gap-2 group"
              >
                <div
                  className={`w-full aspect-[3/5] rounded-2xl relative overflow-hidden transition-all duration-150 shadow-lg ${
                    isSelected
                      ? 'ring-[2.5px] ring-white ring-offset-2 ring-offset-[#0f0f15] scale-[0.97]'
                      : 'ring-1 ring-white/10 group-hover:ring-white/25 group-hover:scale-[0.98]'
                  }`}
                  style={t.style as React.CSSProperties}
                >
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow">
                      <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-medium text-white/60 truncate w-full text-center leading-tight">
                  {t.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
