'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Edges } from '@react-three/drei';
import * as THREE from 'three';

/* ─── Data Core Structure ─────────────────────────────────────── */
function DataCore({ mouseRef }: { mouseRef: React.MutableRefObject<{ x: number; y: number }> }) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);

  // Generate particles for data flow
  const particleCount = 200;
  const [positions, phases] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const ph = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      // Confine particles within the cube (roughly -1.2 to 1.2)
      pos[i * 3] = (Math.random() - 0.5) * 2.4;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 2.4;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 2.4;
      ph[i] = Math.random() * Math.PI * 2;
    }
    return [pos, ph];
  }, [particleCount]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Smooth parallax tracking
    const mx = mouseRef.current.x;
    const my = mouseRef.current.y;

    groupRef.current.rotation.y += (mx * 0.5 - groupRef.current.rotation.y) * 0.05;
    groupRef.current.rotation.x += (my * 0.5 - groupRef.current.rotation.x) * 0.05;
    
    // Slow base rotation
    groupRef.current.rotation.y += delta * 0.1;

    if (coreRef.current) {
      coreRef.current.rotation.x -= delta * 0.05;
      coreRef.current.rotation.y -= delta * 0.08;
    }

    if (particlesRef.current) {
      particlesRef.current.rotation.y += delta * 0.15;
      const positionsAttr = particlesRef.current.geometry.attributes.position;
      const time = state.clock.elapsedTime;
      
      for (let i = 0; i < particleCount; i++) {
        // Vertical data flow
        let y = positionsAttr.getY(i);
        y += delta * 0.5 * (Math.sin(time + phases[i]) * 0.5 + 0.5);
        if (y > 1.2) y = -1.2;
        positionsAttr.setY(i, y);
      }
      positionsAttr.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef}>
      <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.2}>
        
        {/* Outer Glass Shell */}
        <mesh>
          <boxGeometry args={[3, 3, 3]} />
          <meshPhysicalMaterial
            color="#000000"
            metalness={0.9}
            roughness={0.1}
            transmission={0.95}
            thickness={2}
            clearcoat={1}
            clearcoatRoughness={0.1}
            transparent
            opacity={1}
            side={THREE.DoubleSide}
          />
          <Edges
            threshold={15}
            color={new THREE.Color(0.2, 0.2, 0.2)}
          />
        </mesh>

        {/* Inner Encrypted Core */}
        <mesh ref={coreRef}>
          <boxGeometry args={[1.5, 1.5, 1.5]} />
          <meshStandardMaterial
            color="#0d0020"
            emissive="#4c1d95"
            emissiveIntensity={2}
            metalness={0.8}
            roughness={0.2}
            wireframe={true}
            transparent
            opacity={0.8}
          />
        </mesh>

        {/* Central Intense Glow */}
        <mesh scale={0.8}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial color="#6d28d9" transparent opacity={0.15} />
        </mesh>

        {/* Moving Data Particles */}
        <points ref={particlesRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[positions, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.05}
            color="#c4b5fd"
            transparent
            opacity={0.8}
            blending={THREE.AdditiveBlending}
            sizeAttenuation={true}
          />
        </points>

      </Float>
    </group>
  );
}

/* ─── Cinematic Lighting Rig ─────────────────────────────────────── */
function Lighting() {
  return (
    <>
      <ambientLight intensity={0.1} />
      
      {/* Key light — top-left, stark white/blue highlight */}
      <directionalLight position={[-5, 5, 5]} intensity={3} color="#ffffff" />
      
      {/* Fill light — soft visibility */}
      <pointLight position={[4, -2, 2]} intensity={2} color="#7c3aed" distance={20} decay={2} />
      
      {/* Rim light — edge glow */}
      <spotLight position={[-4, 2, -6]} intensity={5} color="#4f46e5" angle={0.5} penumbra={1} distance={20} decay={2} />
      
      {/* Bottom accent neon */}
      <pointLight position={[0, -5, 0]} intensity={4} color="#8b5cf6" distance={15} decay={2} />
    </>
  );
}

/* ─── Mouse tracker wrapper ─────────────────────────────────────── */
function SceneInner({ mouseRef }: { mouseRef: React.MutableRefObject<{ x: number; y: number }> }) {
  return (
    <>
      <Lighting />
      <DataCore mouseRef={mouseRef} />
    </>
  );
}

/* ─── Exported canvas ───────────────────────────────────────────── */
export default function Scene3D() {
  const mouseRef = useRef({ x: 0, y: 0 });

  return (
    <div
      style={{ width: '100%', height: '100%', position: 'relative' }}
      onMouseMove={(e) => {
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        mouseRef.current = {
          x: ((e.clientX - rect.left) / rect.width - 0.5) * 2,
          y: -((e.clientY - rect.top) / rect.height - 0.5) * 2,
        };
      }}
      onMouseLeave={() => { mouseRef.current = { x: 0, y: 0 }; }}
    >
      <Canvas
        camera={{ position: [0, 0, 8], fov: 45 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
        style={{ background: 'transparent' }}
      >
        <SceneInner mouseRef={mouseRef} />
      </Canvas>
    </div>
  );
}
