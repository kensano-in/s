'use client';

import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ── PERFORMANCE-OPTIMIZED PARTICLE FIELD ──────────────────────────
// Lower count on mobile, no pointer tracking on touch, GPU-safe

const PARTICLE_COUNT = typeof window !== 'undefined' && window.innerWidth < 768 ? 120 : 180;
const CONNECTION_THRESHOLD = 2.4;

function ParticleField() {
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef  = useRef<THREE.LineSegments>(null);

  const [positions, connections] = useMemo(() => {
    const pos   = new Float32Array(PARTICLE_COUNT * 3);
    const nodes: THREE.Vector3[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const r     = 5 + Math.random() * 3;
      const theta = 2 * Math.PI * Math.random();
      const phi   = Math.acos(2 * Math.random() - 1);
      const x     = r * Math.sin(phi) * Math.cos(theta);
      const y     = r * Math.sin(phi) * Math.sin(theta);
      const z     = r * Math.cos(phi);
      pos[i * 3]     = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      nodes.push(new THREE.Vector3(x, y, z));
    }

    const linePos: number[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].distanceTo(nodes[j]) < CONNECTION_THRESHOLD) {
          linePos.push(nodes[i].x, nodes[i].y, nodes[i].z, nodes[j].x, nodes[j].y, nodes[j].z);
        }
      }
    }

    return [pos, new Float32Array(linePos)];
  }, []);

  // Stable ref for rotation to avoid re-renders
  const rotRef = useRef({ x: 0, y: 0 });

  useFrame(({ clock, pointer }) => {
    if (!pointsRef.current || !linesRef.current) return;
    const t = clock.getElapsedTime();
    // Smooth lerp toward pointer for natural feel
    rotRef.current.x += (t * 0.04 + pointer.y * 0.08 - rotRef.current.x) * 0.05;
    rotRef.current.y += (t * 0.06 + pointer.x * 0.08 - rotRef.current.y) * 0.05;
    pointsRef.current.rotation.x = rotRef.current.x;
    pointsRef.current.rotation.y = rotRef.current.y;
    linesRef.current.rotation.x  = rotRef.current.x;
    linesRef.current.rotation.y  = rotRef.current.y;
  });

  return (
    <group>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.055}
          color="#b4aef8"
          transparent
          opacity={0.75}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[connections, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color="#6366f1"
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}

function CoreGlow() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const s = 1 + Math.sin(clock.getElapsedTime() * 0.7) * 0.04;
    meshRef.current.scale.set(s, s, s);
  });
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2.2, 32, 32]} />
      <meshBasicMaterial
        color="#312e81"
        transparent
        opacity={0.04}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

export default function NetworkGraph() {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {/* Radial ambient */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(79,70,229,0.10) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {mounted && !isMobile && (
        <Canvas
          camera={{ position: [0, 0, 10], fov: 58 }}
          dpr={[1, typeof window !== 'undefined' && window.devicePixelRatio > 2 ? 2 : Math.min(window?.devicePixelRatio ?? 1, 2)]}
          gl={{
            antialias: false,
            alpha: true,
            powerPreference: 'high-performance',
            depth: false,
            stencil: false,
          }}
          frameloop="always"
          performance={{ min: 0.6 }}
        >
          <CoreGlow />
          <ParticleField />
        </Canvas>
      )}

      {/* Vignette — edges bleed into black */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 90% 90% at 50% 50%, transparent 40%, rgba(0,0,0,0.7) 75%, #000 100%)',
        pointerEvents: 'none',
      }} />
    </div>
  );
}
