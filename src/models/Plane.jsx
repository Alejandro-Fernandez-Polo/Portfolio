import { useAnimations, useGLTF } from "@react-three/drei"
import { useRef, useEffect } from "react"

import planeScene from "../assets/3d/plane.glb"
import { useFrame } from "@react-three/fiber"

const Plane = () => {
  const { scene, animations } = useGLTF(planeScene)
  const planenRef = useRef()
  const { actions } = useAnimations(animations, planenRef)

  useEffect(() => {
    actions["Take 001"].play()
  }, [])

  useFrame(({ clock }) => {
    // t controla el avance temporal, multiplicar por <1 lo hace más lento
    const t = clock.elapsedTime * 0.5; // velocidad reducida

    // radio del círculo (más grande para vuelo más amplio)
    const radius = 7;

  // Movimiento circular en XZ
  planenRef.current.position.x = Math.cos(t) * radius;
  planenRef.current.position.z = Math.sin(t) * radius - 12; // más lejos de la cámara

  // Movimiento vertical (sube y baja suavemente, altura base aumentada)
  planenRef.current.position.y = Math.sin(t * 2) * 0.5 + 5;

    // Orienta el pájaro en la dirección del movimiento
    planenRef.current.rotation.y = -t + Math.PI / 2;
  });

  // La posición inicial en Z no afecta el movimiento, pero puedes ajustarla si lo deseas
  return (
    <mesh ref={planenRef} position={[-0, -15, -12]} scale={[0.5, 0.5, 0.5]}>
      <primitive object={scene} />
    </mesh>
  )
}

export default Plane
