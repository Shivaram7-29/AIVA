import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ============================================================
// PROCEDURAL 3D HUMAN AVATAR — POLISHED VERSION
// Stylized professional interviewer with smooth organic shapes,
// natural idle animations, and multi-frequency lip-sync
// ============================================================

// ─── MATERIALS ─────────────────────────────────────────────
function useMaterials(gender) {
  return useMemo(() => ({
    skin: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#c4906a'),
      roughness: 0.5,
      metalness: 0.02,
    }),
    skinDark: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#a87355'),
      roughness: 0.6,
      metalness: 0.02,
    }),
    suit: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#16162a'),
      roughness: 0.65,
      metalness: 0.12,
    }),
    shirt: new THREE.MeshStandardMaterial({
      color: new THREE.Color(gender === 'female' ? '#d6d8e8' : '#e8e8f0'),
      roughness: 0.55,
      metalness: 0.0,
    }),
    tie: new THREE.MeshStandardMaterial({
      color: new THREE.Color(gender === 'female' ? '#8b5cf6' : '#4338ca'),
      roughness: 0.35,
      metalness: 0.18,
    }),
    hair: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#12100a'),
      roughness: 0.85,
      metalness: 0.05,
    }),
    eyeWhite: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#f5f3f0'),
      roughness: 0.25,
      metalness: 0.0,
    }),
    iris: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#2c1a0e'),
      roughness: 0.15,
      metalness: 0.1,
    }),
    pupil: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#030303'),
      roughness: 0.05,
      metalness: 0.0,
    }),
    lip: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#9a5e55'),
      roughness: 0.45,
      metalness: 0.0,
    }),
    brow: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#12100a'),
      roughness: 0.75,
      metalness: 0.0,
    }),
    mouthInside: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#3a1515'),
      roughness: 0.95,
      metalness: 0.0,
    }),
    teeth: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#f0ebe0'),
      roughness: 0.25,
      metalness: 0.0,
    }),
  }), [gender]);
}

// ============================================================
//  EYE COMPONENT
// ============================================================
function Eye({ position, blinkScale, mat }) {
  const [gazeOffset, setGazeOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      setGazeOffset({
        x: (Math.random() - 0.5) * 0.01,
        y: (Math.random() - 0.5) * 0.006,
      });
    }, 2000 + Math.random() * 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <group position={position}>
      {/* Eye socket recess */}
      <mesh position={[0, 0, -0.006]}>
        <sphereGeometry args={[0.044, 24, 24]} />
        <primitive object={mat.skinDark} attach="material" />
      </mesh>

      {/* Eye white + contents — scale Y for blink */}
      <group scale={[1, blinkScale, 1]}>
        <mesh>
          <sphereGeometry args={[0.038, 28, 28]} />
          <primitive object={mat.eyeWhite} attach="material" />
        </mesh>

        {/* Iris */}
        <mesh position={[gazeOffset.x, gazeOffset.y, 0.026]}>
          <sphereGeometry args={[0.017, 20, 20]} />
          <primitive object={mat.iris} attach="material" />
        </mesh>

        {/* Pupil */}
        <mesh position={[gazeOffset.x, gazeOffset.y, 0.034]}>
          <sphereGeometry args={[0.009, 16, 16]} />
          <primitive object={mat.pupil} attach="material" />
        </mesh>

        {/* Specular highlight */}
        <mesh position={[0.007 + gazeOffset.x, 0.007 + gazeOffset.y, 0.037]}>
          <sphereGeometry args={[0.004, 10, 10]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.6} roughness={0.0} metalness={0.0} transparent opacity={0.9} />
        </mesh>
      </group>

      {/* Eyelids — grow to cover eye during blink */}
      <mesh position={[0, 0.022, 0.018]} scale={[1.15, blinkScale < 0.3 ? 2.8 : 1, 1]}>
        <sphereGeometry args={[0.035, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <primitive object={mat.skin} attach="material" />
      </mesh>
      <mesh position={[0, -0.022, 0.018]} rotation={[Math.PI, 0, 0]} scale={[1.1, blinkScale < 0.3 ? 2.2 : 1, 1]}>
        <sphereGeometry args={[0.033, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <primitive object={mat.skin} attach="material" />
      </mesh>
    </group>
  );
}

// ============================================================
//  EYEBROW COMPONENT
// ============================================================
function Eyebrow({ position, rotation = [0, 0, 0], raise = 0, mat }) {
  return (
    <mesh position={[position[0], position[1] + raise * 0.01, position[2]]} rotation={rotation}>
      <capsuleGeometry args={[0.005, 0.05, 8, 16]} />
      <primitive object={mat.brow} attach="material" />
    </mesh>
  );
}

// ============================================================
//  MOUTH COMPONENT — with multi-shape lip-sync
// ============================================================
function Mouth({ mouthOpen, mouthWidth, mat }) {
  return (
    <group position={[0, -0.08, 0.135]}>
      {/* Upper lip */}
      <mesh position={[0, 0.005, 0]} scale={[mouthWidth, 1, 1]}>
        <capsuleGeometry args={[0.005, 0.04, 8, 16]} />
        <primitive object={mat.lip} attach="material" />
      </mesh>

      {/* Lower lip — drops with mouth open */}
      <mesh position={[0, -0.007 - mouthOpen * 0.022, 0]} scale={[mouthWidth, 1, 1]}>
        <capsuleGeometry args={[0.006, 0.045, 8, 16]} />
        <primitive object={mat.lip} attach="material" />
      </mesh>

      {/* Mouth cavity (dark inside) */}
      {mouthOpen > 0.12 && (
        <mesh position={[0, -0.002 - mouthOpen * 0.01, -0.004]} scale={[mouthWidth * 0.8, mouthOpen * 1.2, 1]}>
          <sphereGeometry args={[0.018, 12, 12]} />
          <primitive object={mat.mouthInside} attach="material" />
        </mesh>
      )}

      {/* Teeth row */}
      {mouthOpen > 0.25 && (
        <mesh position={[0, 0.001, -0.001]} scale={[mouthWidth * 0.7, 1, 1]}>
          <capsuleGeometry args={[0.003, 0.025, 4, 8]} />
          <primitive object={mat.teeth} attach="material" />
        </mesh>
      )}
    </group>
  );
}

// ============================================================
//  NOSE
// ============================================================
function Nose({ mat }) {
  return (
    <group position={[0, -0.01, 0.155]}>
      <mesh position={[0, 0.025, -0.008]}>
        <capsuleGeometry args={[0.008, 0.04, 8, 16]} />
        <primitive object={mat.skin} attach="material" />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.016, 16, 16]} />
        <primitive object={mat.skin} attach="material" />
      </mesh>
      <mesh position={[-0.012, -0.004, 0]}>
        <sphereGeometry args={[0.008, 10, 10]} />
        <primitive object={mat.skinDark} attach="material" />
      </mesh>
      <mesh position={[0.012, -0.004, 0]}>
        <sphereGeometry args={[0.008, 10, 10]} />
        <primitive object={mat.skinDark} attach="material" />
      </mesh>
    </group>
  );
}

// ============================================================
//  EAR
// ============================================================
function Ear({ position, scaleX = 1, mat }) {
  return (
    <group position={position} scale={[scaleX, 1, 1]}>
      <mesh rotation={[0, 0, scaleX > 0 ? -0.15 : 0.15]}>
        <capsuleGeometry args={[0.014, 0.03, 8, 12]} />
        <primitive object={mat.skin} attach="material" />
      </mesh>
      <mesh position={[0.004 * scaleX, 0, 0.005]}>
        <sphereGeometry args={[0.008, 8, 8]} />
        <primitive object={mat.skinDark} attach="material" />
      </mesh>
    </group>
  );
}

// ============================================================
//  MAIN AVATAR
// ============================================================
export default function ProceduralAvatar({ gender = 'male', isSpeaking, isListening }) {
  const groupRef = useRef();
  const headRef = useRef();
  const mat = useMaterials(gender);

  const [blinkScale, setBlinkScale] = useState(1);
  const [mouthOpen, setMouthOpen] = useState(0);
  const [mouthWidth, setMouthWidth] = useState(1);
  const timeRef = useRef(0);
  const speakPhaseRef = useRef(0);
  const headSwayRef = useRef({ targetX: 0, targetY: 0, currentX: 0, currentY: 0 });

  // ─── Blinking ────────────────────────────────────────────
  useEffect(() => {
    const doBlink = () => {
      setBlinkScale(0.05);
      setTimeout(() => setBlinkScale(1), 110);
      if (Math.random() > 0.7) {
        setTimeout(() => {
          setBlinkScale(0.05);
          setTimeout(() => setBlinkScale(1), 90);
        }, 230);
      }
    };
    const scheduleNext = () => {
      const delay = 2500 + Math.random() * 5000;
      return setTimeout(() => { doBlink(); timerId = scheduleNext(); }, delay);
    };
    let timerId = scheduleNext();
    return () => clearTimeout(timerId);
  }, []);

  // ─── Head sway ───────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      headSwayRef.current.targetX = (Math.random() - 0.5) * 0.05;
      headSwayRef.current.targetY = (Math.random() - 0.5) * 0.03;
    }, 2500 + Math.random() * 3000);
    return () => clearInterval(interval);
  }, []);

  const browRaise = isListening ? 0.5 : 0;

  // ─── Frame loop ──────────────────────────────────────────
  useFrame((_, delta) => {
    timeRef.current += delta;
    const t = timeRef.current;

    // Breathing
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(t * 1.2) * 0.003 - 0.08;
    }

    // Head sway (smooth lerp)
    const sway = headSwayRef.current;
    sway.currentX += (sway.targetX - sway.currentX) * 0.025;
    sway.currentY += (sway.targetY - sway.currentY) * 0.025;

    if (headRef.current) {
      headRef.current.rotation.y = sway.currentX;
      headRef.current.rotation.x = sway.currentY;
      if (isListening) {
        headRef.current.rotation.x += Math.sin(t * 2) * 0.012;
      }
    }

    // Lip sync
    if (isSpeaking) {
      speakPhaseRef.current += delta * 14;
      const p = speakPhaseRef.current;
      const openness =
        Math.abs(Math.sin(p)) * 0.35 +
        Math.abs(Math.sin(p * 1.73)) * 0.25 +
        Math.abs(Math.sin(p * 0.47)) * 0.15 +
        Math.random() * 0.08;
      setMouthOpen(Math.min(openness, 0.85));
      setMouthWidth(1 + Math.sin(p * 0.8) * 0.12);
    } else {
      setMouthOpen(prev => prev * 0.88);
      setMouthWidth(prev => 1 + (prev - 1) * 0.92);
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.08, 0]}>
      <group ref={headRef}>

        {/* ══════ HEAD — smooth compound shape ══════ */}
        {/* Cranium */}
        <mesh position={[0, 0.05, 0]} scale={[1, 1.1, 1]}>
          <sphereGeometry args={[0.14, 32, 32]} />
          <primitive object={mat.skin} attach="material" />
        </mesh>

        {/* Face plane (slightly flatter front) */}
        <mesh position={[0, 0.01, 0.06]}>
          <sphereGeometry args={[0.12, 28, 28]} />
          <primitive object={mat.skin} attach="material" />
        </mesh>

        {/* Jaw */}
        <mesh position={[0, -0.06, 0.03]} scale={[0.85, 0.7, 0.85]}>
          <sphereGeometry args={[0.12, 24, 24]} />
          <primitive object={mat.skin} attach="material" />
        </mesh>

        {/* Chin */}
        <mesh position={[0, -0.1, 0.06]}>
          <sphereGeometry args={[0.035, 16, 16]} />
          <primitive object={mat.skin} attach="material" />
        </mesh>

        {/* Cheekbones */}
        <mesh position={[-0.08, 0.0, 0.09]}>
          <sphereGeometry args={[0.035, 14, 14]} />
          <primitive object={mat.skin} attach="material" />
        </mesh>
        <mesh position={[0.08, 0.0, 0.09]}>
          <sphereGeometry args={[0.035, 14, 14]} />
          <primitive object={mat.skin} attach="material" />
        </mesh>

        {/* ══════ HAIR ══════ */}
        {/* Top */}
        <mesh position={[0, 0.13, -0.01]} scale={[1.05, 1, 1]}>
          <sphereGeometry args={[0.148, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <primitive object={mat.hair} attach="material" />
        </mesh>
        {/* Sides */}
        <mesh position={[-0.125, 0.07, -0.01]}>
          <capsuleGeometry args={[0.025, 0.06, 8, 12]} />
          <primitive object={mat.hair} attach="material" />
        </mesh>
        <mesh position={[0.125, 0.07, -0.01]}>
          <capsuleGeometry args={[0.025, 0.06, 8, 12]} />
          <primitive object={mat.hair} attach="material" />
        </mesh>
        {/* Back */}
        <mesh position={[0, 0.06, -0.09]}>
          <sphereGeometry args={[0.13, 20, 20, -Math.PI * 0.6, Math.PI * 1.2, Math.PI * 0.2, Math.PI * 0.6]} />
          <primitive object={mat.hair} attach="material" />
        </mesh>
        {gender === 'female' && (
          <>
            <mesh position={[-0.13, 0.01, -0.02]} scale={[0.8, 1.5, 0.8]}>
              <sphereGeometry args={[0.06, 18, 18]} />
              <primitive object={mat.hair} attach="material" />
            </mesh>
            <mesh position={[0.13, 0.01, -0.02]} scale={[0.8, 1.5, 0.8]}>
              <sphereGeometry args={[0.06, 18, 18]} />
              <primitive object={mat.hair} attach="material" />
            </mesh>
          </>
        )}

        {/* ══════ EYES ══════ */}
        <Eye position={[-0.045, 0.035, 0.115]} blinkScale={blinkScale} mat={mat} />
        <Eye position={[0.045, 0.035, 0.115]} blinkScale={blinkScale} mat={mat} />

        {/* ══════ EYEBROWS ══════ */}
        <Eyebrow position={[-0.047, 0.075, 0.115]} rotation={[0.1, 0, 0.1]} raise={browRaise} mat={mat} />
        <Eyebrow position={[0.047, 0.075, 0.115]} rotation={[0.1, 0, -0.1]} raise={browRaise} mat={mat} />

        {/* ══════ NOSE ══════ */}
        <Nose mat={mat} />

        {/* ══════ MOUTH ══════ */}
        <Mouth mouthOpen={mouthOpen} mouthWidth={mouthWidth} mat={mat} />

        {/* ══════ EARS ══════ */}
        <Ear position={[-0.142, 0.025, 0]} scaleX={1} mat={mat} />
        <Ear position={[0.142, 0.025, 0]} scaleX={-1} mat={mat} />
      </group>

      {/* ══════ NECK ══════ */}
      <mesh position={[0, -0.17, 0.01]}>
        <capsuleGeometry args={[0.04, 0.06, 12, 16]} />
        <primitive object={mat.skin} attach="material" />
      </mesh>

      {/* ══════ SHOULDERS / TORSO ══════ */}
      <group position={[0, -0.32, 0]}>
        {/* Shoulder bar */}
        <mesh>
          <capsuleGeometry args={[0.055, 0.28, 12, 16]} />
          <primitive object={mat.suit} attach="material" />
        </mesh>
        {/* Shoulder rounds */}
        <mesh position={[-0.19, 0, 0.01]}>
          <sphereGeometry args={[0.055, 16, 16]} />
          <primitive object={mat.suit} attach="material" />
        </mesh>
        <mesh position={[0.19, 0, 0.01]}>
          <sphereGeometry args={[0.055, 16, 16]} />
          <primitive object={mat.suit} attach="material" />
        </mesh>

        {/* Chest */}
        <mesh position={[0, -0.1, 0.01]}>
          <capsuleGeometry args={[0.13, 0.06, 12, 16]} />
          <primitive object={mat.suit} attach="material" />
        </mesh>
        <mesh position={[0, -0.2, 0.01]}>
          <capsuleGeometry args={[0.12, 0.06, 12, 16]} />
          <primitive object={mat.suit} attach="material" />
        </mesh>

        {/* Shirt collar */}
        <mesh position={[-0.03, 0.07, 0.045]} rotation={[0, 0, -0.3]}>
          <boxGeometry args={[0.05, 0.04, 0.012]} />
          <primitive object={mat.shirt} attach="material" />
        </mesh>
        <mesh position={[0.03, 0.07, 0.045]} rotation={[0, 0, 0.3]}>
          <boxGeometry args={[0.05, 0.04, 0.012]} />
          <primitive object={mat.shirt} attach="material" />
        </mesh>

        {/* Shirt V area */}
        <mesh position={[0, 0.04, 0.055]}>
          <boxGeometry args={[0.05, 0.06, 0.008]} />
          <primitive object={mat.shirt} attach="material" />
        </mesh>

        {/* Tie */}
        <mesh position={[0, 0.0, 0.06]}>
          <capsuleGeometry args={[0.01, 0.1, 6, 10]} />
          <primitive object={mat.tie} attach="material" />
        </mesh>
        {/* Tie knot */}
        <mesh position={[0, 0.06, 0.062]}>
          <sphereGeometry args={[0.01, 8, 8]} />
          <primitive object={mat.tie} attach="material" />
        </mesh>

        {/* Lapels */}
        <mesh position={[-0.06, 0.02, 0.05]} rotation={[0, 0.15, -0.15]}>
          <boxGeometry args={[0.04, 0.1, 0.008]} />
          <primitive object={mat.suit} attach="material" />
        </mesh>
        <mesh position={[0.06, 0.02, 0.05]} rotation={[0, -0.15, 0.15]}>
          <boxGeometry args={[0.04, 0.1, 0.008]} />
          <primitive object={mat.suit} attach="material" />
        </mesh>
      </group>
    </group>
  );
}
