import React, { Suspense, Component } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import RealisticAvatar from './RealisticAvatar';
import ProceduralAvatar from './ProceduralAvatar';
import InteractiveAvatar from './InteractiveAvatar';

// Simple Error Boundary to fallback if RealisticAvatar (the .glb file) fails to load
class AvatarErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
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

class SceneErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <InteractiveAvatar {...this.props.avatarProps} />;
    }
    return this.props.children;
  }
}

export default function Avatar3DScene({ gender = 'male', isSpeaking, isListening, state = 'idle' }) {
  const avatarProps = { gender, isSpeaking, isListening, state };
  return (
    <SceneErrorBoundary avatarProps={avatarProps}>
      <Canvas
        camera={{
          position: [0, -0.1, 1.2],
          fov: 30,
          near: 0.1,
          far: 100,
        }}
        shadows
        dpr={[1, 2]}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <ambientLight intensity={0.6} color="#ffffff" />
        <directionalLight
          position={[3, 4, 5]}
          intensity={1.5}
          color="#fff5e6"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <directionalLight position={[-3, 2, 3]} intensity={0.8} color="#c4d4ff" />
        <pointLight position={[0, 2, -3]} intensity={1.0} color="#6366f1" />
        <pointLight position={[0, -1, 2]} intensity={0.3} color="#818cf8" />

        <AvatarErrorBoundary avatarProps={avatarProps}>
          <Suspense fallback={null}>
            <RealisticAvatar {...avatarProps} />
          </Suspense>
        </AvatarErrorBoundary>

        <ContactShadows
          position={[0, -1.5, 0]}
          opacity={0.4}
          scale={5}
          blur={2}
          far={2}
          color="#1e1b4b"
        />
      </Canvas>
    </SceneErrorBoundary>
  );
}
