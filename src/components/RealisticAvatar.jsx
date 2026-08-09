import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// ─── STEP 1: LOAD THE 3D MODEL ────────────────────────────────
// The user needs to download a `.glb` from Ready Player Me and place it in the `public` folder
// as `avatar.glb`. Make sure it's exported with ARKit/Oculus Visemes enabled.
const AVATAR_URL = "/avatar.glb";

export default function RealisticAvatar({ isSpeaking, isListening, state }) {
  // Preload the GLTF model
  const { nodes, materials } = useGLTF(AVATAR_URL);
  
  const groupRef = useRef();
  const timeRef = useRef(0);
  
  // Animation state
  const [blinkValue, setBlinkValue] = useState(0);
  const headSwayRef = useRef({ targetX: 0, targetY: 0, currentX: 0, currentY: 0 });
  const speakPhaseRef = useRef(0);

  // Reference to nodes with morph targets
  const headMesh = nodes.Wolf3D_Head || nodes.Wolf3D_Avatar;
  const teethMesh = nodes.Wolf3D_Teeth;

  // Setup morph target indices
  const getMorphTargetIndex = (mesh, targetName) => {
    if (mesh && mesh.morphTargetDictionary) {
      return mesh.morphTargetDictionary[targetName];
    }
    return undefined;
  };

  const blinkLeftIdx = getMorphTargetIndex(headMesh, 'eyeBlinkLeft');
  const blinkRightIdx = getMorphTargetIndex(headMesh, 'eyeBlinkRight');
  const mouthOpenIdx = getMorphTargetIndex(headMesh, 'jawOpen');
  const mouthSmileIdx = getMorphTargetIndex(headMesh, 'mouthSmile');
  
  // ─── STEP 3: ADD BASIC ANIMATION ────────────────────────────
  // Blinking Logic
  useEffect(() => {
    const doBlink = () => {
      setBlinkValue(1);
      setTimeout(() => setBlinkValue(0), 150); // fast blink
      
      // double blink occasionally
      if (Math.random() > 0.7) {
        setTimeout(() => {
          setBlinkValue(1);
          setTimeout(() => setBlinkValue(0), 120);
        }, 250);
      }
    };
    
    const scheduleNext = () => {
      const delay = 2500 + Math.random() * 4000;
      return setTimeout(() => {
        doBlink();
        timerId = scheduleNext();
      }, delay);
    };
    
    let timerId = scheduleNext();
    return () => clearTimeout(timerId);
  }, []);

  // Head Sway Logic
  useEffect(() => {
    const interval = setInterval(() => {
      headSwayRef.current.targetX = (Math.random() - 0.5) * 0.15; // Look left/right
      headSwayRef.current.targetY = (Math.random() - 0.5) * 0.1;  // Look up/down
    }, 2000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  // Frame Loop for Animation
  useFrame((_, delta) => {
    timeRef.current += delta;
    const t = timeRef.current;

    // Apply Head Sway & Breathing
    if (groupRef.current) {
      // Smooth interpolation for head look direction
      const sway = headSwayRef.current;
      sway.currentX += (sway.targetX - sway.currentX) * 0.03;
      sway.currentY += (sway.targetY - sway.currentY) * 0.03;
      
      const headBone = nodes.Head || nodes.mixamorigHead;
      if (headBone) {
        headBone.rotation.x = sway.currentY;
        headBone.rotation.y = sway.currentX;
        headBone.rotation.z = Math.sin(t * 1.5) * 0.02; // Subtle side-to-side wobble
        
        if (isListening) {
          headBone.rotation.x += Math.sin(t * 2) * 0.02; // Nodding effect when listening
        }
      }
      
      // Breathing - subtle chest expansion / vertical movement
      const spineBone = nodes.Spine2 || nodes.mixamorigSpine2;
      if (spineBone) {
        spineBone.rotation.x = Math.sin(t * 1.2) * 0.02;
      }
      groupRef.current.position.y = -1.5 + Math.sin(t * 1.2) * 0.005;
    }

    // Apply Morph Targets (Facial Expressions)
    if (headMesh && headMesh.morphTargetInfluences) {
      // Blinking
      if (blinkLeftIdx !== undefined) headMesh.morphTargetInfluences[blinkLeftIdx] = blinkValue;
      if (blinkRightIdx !== undefined) headMesh.morphTargetInfluences[blinkRightIdx] = blinkValue;

      // Smiling (slight smile when idle/listening)
      if (mouthSmileIdx !== undefined) {
        const targetSmile = isListening ? 0.3 : 0.1;
        headMesh.morphTargetInfluences[mouthSmileIdx] += (targetSmile - headMesh.morphTargetInfluences[mouthSmileIdx]) * 0.1;
      }

      // ─── STEP 5: LIP SYNC ────────────────────────────────────
      if (mouthOpenIdx !== undefined) {
        let currentMouthOpen = headMesh.morphTargetInfluences[mouthOpenIdx];
        
        if (isSpeaking) {
          speakPhaseRef.current += delta * 15;
          const p = speakPhaseRef.current;
          
          // Generate procedural speech pattern using sine waves
          const speechValue = 
            Math.abs(Math.sin(p)) * 0.4 + 
            Math.abs(Math.sin(p * 1.5)) * 0.3 + 
            (Math.random() * 0.1);
            
          headMesh.morphTargetInfluences[mouthOpenIdx] = Math.min(speechValue, 0.9);
          
          if (teethMesh && teethMesh.morphTargetInfluences) {
            teethMesh.morphTargetInfluences[mouthOpenIdx] = Math.min(speechValue, 0.9);
          }
        } else {
          // Smoothly close mouth
          headMesh.morphTargetInfluences[mouthOpenIdx] += (0 - currentMouthOpen) * 0.2;
          if (teethMesh && teethMesh.morphTargetInfluences) {
            teethMesh.morphTargetInfluences[mouthOpenIdx] += (0 - currentMouthOpen) * 0.2;
          }
        }
      }
    }
  });

  return (
    <group ref={groupRef} position={[0, -1.5, 0]} dispose={null}>
      <primitive object={nodes.Hips || nodes.mixamorigHips || nodes.Scene || nodes.Root} />
      {/* Render all skinned meshes */}
      {Object.values(nodes).map((node) => {
        if (node.isSkinnedMesh) {
          return (
            <skinnedMesh
              key={node.name}
              geometry={node.geometry}
              material={node.material}
              skeleton={node.skeleton}
              morphTargetDictionary={node.morphTargetDictionary}
              morphTargetInfluences={node.morphTargetInfluences}
              castShadow
              receiveShadow
            />
          );
        }
        return null;
      })}
    </group>
  );
}

// Preload to avoid loading delay
useGLTF.preload(AVATAR_URL);
