import React, { Suspense, Component } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, ContactShadows } from '@react-three/drei';
import RealisticAvatar from './RealisticAvatar';
import ProceduralAvatar from './ProceduralAvatar';

// Simple Error Boundary to fallback if RealisticAvatar (the .glb file) fails to load
class AvatarErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.warn("Could not load realistic 3D avatar. Falling back to procedural avatar.", error);
  }

  render() {
    if (this.state.hasError) {
      return <ProceduralAvatar {...this.props.avatarProps} />;
    }
    return this.props.children;
  }
}

// ============================================================
// 3D AVATAR SCENE — Canvas + Lighting + Camera
// Renders the realistic 3D interviewer in a cinematic setup
// ============================================================

export default function Avatar3DScene({ isSpeaking, isListening, state = 'idle' }) {
  return (
    <Canvas
      camera={{
        position: [0, -0.1, 1.2], // Lowered camera slightly to frame upper body correctly
        fov: 30,
        near: 0.1,
        far: 100,
      }}
      shadows
      dpr={[1, 2]}
      style={{
        width: '100%',
        height: '100%',
        background: 'transparent',
      }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      }}
    >
      {/* Ambient fill light */}
      <ambientLight intensity={0.6} color="#ffffff" />

      {/* Key light — warm directional from top-right */}
      <directionalLight
        position={[3, 4, 5]}
        intensity={1.5}
        color="#fff5e6"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      {/* Fill light — cool from left */}
      <directionalLight
        position={[-3, 2, 3]}
        intensity={0.8}
        color="#c4d4ff"
      />

      {/* Rim light — subtle backlight */}
      <pointLight
        position={[0, 2, -3]}
        intensity={1.0}
        color="#6366f1"
      />

      {/* Subtle bottom accent */}
      <pointLight
        position={[0, -1, 2]}
        intensity={0.3}
        color="#818cf8"
      />

      {/* The 3D Avatar */}
      <AvatarErrorBoundary avatarProps={{ isSpeaking, isListening, state }}>
        <Suspense fallback={null}>
          <RealisticAvatar
            isSpeaking={isSpeaking}
            isListening={isListening}
            state={state}
          />
        </Suspense>
      </AvatarErrorBoundary>

      {/* Contact shadow under the avatar */}
      <ContactShadows
        position={[0, -1.5, 0]}
        opacity={0.4}
        scale={5}
        blur={2}
        far={2}
        color="#1e1b4b"
      />
    </Canvas>
  );
}
