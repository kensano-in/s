'use client';

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, ContactShadows, RoundedBox, Sphere, Torus, Cone } from '@react-three/drei';
import * as THREE from 'three';

// Ultra-Premium Glass Material mimicking Lottie Glassmorphism packs
const GlassMaterial = ({ color }: { color: string }) => (
  <meshPhysicalMaterial
    color={color}
    transmission={0.9}
    opacity={1}
    metalness={0.1}
    roughness={0.1}
    ior={1.5}
    thickness={2}
    specularIntensity={1}
    clearcoat={1}
    clearcoatRoughness={0.1}
  />
);

// Inner solid glowing core for the 3D icons
const CoreMaterial = ({ color }: { color: string }) => (
  <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} toneMapped={false} />
);

// ------------------------------------------------------------------
// Specific 3D Icons
// ------------------------------------------------------------------

const ChatGeometry = ({ color }: { color: string }) => {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
    }
  });
  return (
    <group ref={group}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        <RoundedBox args={[2.5, 1.8, 0.8]} radius={0.3} smoothness={4}>
          <GlassMaterial color="#ffffff" />
        </RoundedBox>
        <Sphere args={[0.2]} position={[-0.5, 0, 0.5]}>
          <CoreMaterial color={color} />
        </Sphere>
        <Sphere args={[0.2]} position={[0.5, 0, 0.5]}>
          <CoreMaterial color={color} />
        </Sphere>
        {/* Tail */}
        <Cone args={[0.4, 0.8, 3]} position={[-0.8, -0.9, 0]} rotation={[0, 0, Math.PI / 4]}>
          <GlassMaterial color="#ffffff" />
        </Cone>
      </Float>
    </group>
  );
};

const ShieldGeometry = ({ color }: { color: string }) => {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (group.current) group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
  });
  return (
    <group ref={group}>
      <Float speed={2.5} rotationIntensity={0.5} floatIntensity={1.5}>
        {/* Simplified Shield Shape using a squashed cylinder */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.2, 0, 0.6, 6]} />
          <GlassMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, 0, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.6, 0, 0.2, 6]} />
          <CoreMaterial color={color} />
        </mesh>
      </Float>
    </group>
  );
};

const CardGeometry = ({ color }: { color: string }) => {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.3;
      group.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });
  return (
    <group ref={group}>
      <Float speed={2} rotationIntensity={0.8} floatIntensity={1}>
        <RoundedBox args={[2.8, 1.8, 0.4]} radius={0.1} smoothness={4}>
          <GlassMaterial color="#ffffff" />
        </RoundedBox>
        <mesh position={[0, 0.3, 0.21]}>
          <planeGeometry args={[2.8, 0.4]} />
          <meshBasicMaterial color={color} />
        </mesh>
      </Float>
    </group>
  );
};

const AlertGeometry = ({ color }: { color: string }) => {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (group.current) group.current.rotation.y = Math.sin(state.clock.elapsedTime * 1) * 0.2;
  });
  return (
    <group ref={group}>
      <Float speed={3} rotationIntensity={0.2} floatIntensity={2}>
        <Cone args={[1.5, 2.5, 3]} rotation={[0, 0, 0]}>
          <GlassMaterial color="#ffffff" />
        </Cone>
        <Sphere args={[0.2]} position={[0, -0.5, 0.6]}>
          <CoreMaterial color={color} />
        </Sphere>
        <mesh position={[0, 0.2, 0.6]}>
          <cylinderGeometry args={[0.1, 0.1, 0.8]} />
          <CoreMaterial color={color} />
        </mesh>
      </Float>
    </group>
  );
};

// ------------------------------------------------------------------
// Main Canvas Wrapper
// ------------------------------------------------------------------

interface IconProps {
  color?: string;
  size?: number;
}

const CanvasWrapper = ({ children, size = 64, color }: { children: React.ReactNode; size?: number; color?: string }) => (
  <div style={{ width: size, height: size, filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.5))' }}>
    <Canvas camera={{ position: [0, 0, 5], fov: 45 }} dpr={[1, 2]}>
      <ambientLight intensity={1} />
      <directionalLight position={[10, 10, 10]} intensity={2} />
      <directionalLight position={[-10, -10, -10]} intensity={0.5} />
      {children}
      <Environment>
        <group rotation={[Math.PI / 2, 0, 0]}>
          <mesh position={[0, 5, -10]}>
            <planeGeometry args={[20, 20]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[-10, 5, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[20, 20]} />
            <meshBasicMaterial color={color || '#ffffff'} />
          </mesh>
        </group>
      </Environment>
      <ContactShadows position={[0, -1.5, 0]} opacity={0.4} scale={5} blur={2} far={2} />
    </Canvas>
  </div>
);

// Exports that map to the Icons.tsx signatures
export const IconChat = ({ color = '#6366f1', size = 64 }: IconProps) => (
  <CanvasWrapper size={size} color={color}>
    <ChatGeometry color={color} />
  </CanvasWrapper>
);

export const IconShield = ({ color = '#8b5cf6', size = 64 }: IconProps) => (
  <CanvasWrapper size={size} color={color}>
    <ShieldGeometry color={color} />
  </CanvasWrapper>
);

export const IconCreditCard = ({ color = '#f59e0b', size = 64 }: IconProps) => (
  <CanvasWrapper size={size} color={color}>
    <CardGeometry color={color} />
  </CanvasWrapper>
);

export const IconAlertTri = ({ color = '#ef4444', size = 64 }: IconProps) => (
  <CanvasWrapper size={size} color={color}>
    <AlertGeometry color={color} />
  </CanvasWrapper>
);

export const IconUserPlus = ({ color = '#10b981', size = 64 }: IconProps) => (
  <CanvasWrapper size={size} color={color}>
    <ChatGeometry color={color} /> {/* Fallback to chat for now */}
  </CanvasWrapper>
);

// Temporary fallbacks for the rest of the icons so we don't break the app
export const IconWrench = IconChat;
export const IconZap = IconAlertTri;
export const IconBadge = IconShield;
export const IconArchive = IconCreditCard;
export const IconShieldOff = IconAlertTri;
export const IconMail = IconCreditCard;
export const IconLock = IconShield;
export const IconActivity = IconChat;
export const IconCheckCircle = IconShield;
export const IconGlobe = IconChat;
export const IconRisk = IconAlertTri;
export const IconUsers = IconChat;
export const IconFlag = IconAlertTri;
export const IconBan = IconAlertTri;
export const IconGrid = IconCreditCard;
export const IconBar = IconChat;
export const IconSearch = IconChat;

