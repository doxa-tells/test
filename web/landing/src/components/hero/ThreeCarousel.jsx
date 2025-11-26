import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useTexture, MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';

import partner1 from '../../assets/partners/9.svg';
import partner2 from '../../assets/partners/2.svg';
import partner3 from '../../assets/partners/3.svg';
import partner4 from '../../assets/partners/4.svg';
import partner5 from '../../assets/partners/5.svg';
import partner6 from '../../assets/partners/6.svg';
import partner7 from '../../assets/partners/7.svg';
import partner8 from '../../assets/partners/8.svg';

const LogoCard = ({ url, position, rotation }) => {
    const texture = useTexture(url);
    return (
        <mesh position={position} rotation={rotation}>
            {/* 👇 ИЗМЕНИЛИ ТУТ. Два одинаковых числа делают квадрат */}
            <planeGeometry args={[2.2, 2.2]} />

            <meshBasicMaterial
                map={texture}
                transparent={true}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
};

const ThreeCarousel = () => {
    const groupRef = useRef();
    // Берем картинки
    const logos = [partner1, partner2, partner3, partner4, partner5, partner6, partner7, partner8];
    const radius = 7;

    useFrame((state, delta) => {
        if (groupRef.current) {
            groupRef.current.rotation.y += delta * 0.4;
        }
    });

    return (
        <group ref={groupRef} position={[0, 0.5, 0]}>
            {logos.map((url, i) => {
                const angle = (i / logos.length) * Math.PI * 2;
                const x = Math.sin(angle) * radius;
                const z = Math.cos(angle) * radius;
                return (
                    <LogoCard
                        key={i}
                        url={url}
                        position={[x, 0, z]}
                        rotation={[0, angle, 0]}
                    />
                );
            })}
        </group>
    );
};

const CarouselScene = () => {
    return (
        <Canvas camera={{ position: [0, 3, 13], fov: 45 }}>
            <pointLight position={[-10, 5, 5]} color="#ccff00" intensity={500} distance={50} />
            <pointLight position={[10, 5, 5]} color="#0044ff" intensity={500} distance={50} />
            <ambientLight intensity={1} />

            <Suspense fallback={null}>
                <ThreeCarousel />
            </Suspense>

            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, 0]}>
                <planeGeometry args={[20, 20]} />
                <MeshReflectorMaterial
                    blur={[300, 100]}
                    resolution={512}
                    mixBlur={1}
                    mixStrength={50}
                    roughness={0.1}
                    depthScale={1.2}
                    minDepthThreshold={0.4}
                    maxDepthThreshold={1.4}
                    color="#101010"
                    metalness={0.5}
                />
            </mesh>
        </Canvas>
    );
};

export default React.memo(CarouselScene);
