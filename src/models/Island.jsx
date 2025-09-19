/**
 * IMPORTANT: Loading glTF models into a Three.js scene is a lot of work.
 * Before we can configure or animate our model’s meshes, we need to iterate through
 * each part of our model’s meshes and save them separately.
 *
 * But luckily there is an app that turns gltf or glb files into jsx components
 * For this model, visit https://gltf.pmnd.rs/
 * And get the code. And then add the rest of the things.
 * YOU DON'T HAVE TO WRITE EVERYTHING FROM SCRATCH
 */

import { a } from "@react-spring/three"
import { useEffect, useRef, useCallback } from "react"
import { useGLTF } from "@react-three/drei"
import { useFrame, useThree } from "@react-three/fiber"

import islandScene from "../assets/3d/island.glb"

const Island = ({ isRotating, setIsRotating, setCurrentStage, ...props }) => {
  // Ref for rotating the model about its center
  const thorGroupRef = useRef()

  const { gl, viewport } = useThree()
  const { nodes, materials } = useGLTF(islandScene)

  const lastX = useRef(0)
  const rotationSpeed = useRef(0)
  const dampingFactor = 0.95
  const handlePointerDown = useCallback(
    (event) => {
      event.stopPropagation()
      event.preventDefault()
      setIsRotating(true)
      const clientX = event.touches ? event.touches[0].clientX : event.clientX
      lastX.current = clientX
    },
    [setIsRotating]
  )

  const handlePointerUp = useCallback(
    (event) => {
      event.stopPropagation()
      event.preventDefault()
      setIsRotating(false)
    },
    [setIsRotating]
  )

  const handlePointerMove = useCallback(
    (event) => {
      event.stopPropagation()
      event.preventDefault()
      if (isRotating) {
        const clientX = event.touches ? event.touches[0].clientX : event.clientX
        const delta = (clientX - lastX.current) / viewport.width
        thorGroupRef.current.rotation.y += delta * 0.01 * Math.PI
        lastX.current = clientX
        rotationSpeed.current = delta * 0.01 * Math.PI
      }
    },
    [isRotating, viewport.width]
  )

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "ArrowLeft") {
        if (!isRotating) setIsRotating(true)
        thorGroupRef.current.rotation.y += 0.008 * Math.PI
        rotationSpeed.current = 0.0125
      } else if (event.key === "ArrowRight") {
        if (!isRotating) setIsRotating(true)
        thorGroupRef.current.rotation.y -= 0.008 * Math.PI
        rotationSpeed.current = -0.0125
      }
    },
    [isRotating, setIsRotating]
  )

  const handleKeyUp = useCallback(
    (event) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        setIsRotating(false)
      }
    },
    [setIsRotating]
  )

  useFrame(() => {
    if (!isRotating) {
      rotationSpeed.current *= dampingFactor

      if (Math.abs(rotationSpeed.current) < 0.001) {
        rotationSpeed.current = 0
      }

      thorGroupRef.current.rotation.y += rotationSpeed.current
    } else {
      const rotation = thorGroupRef.current.rotation.y

      // ...existing code...
      // Desplazar 30 grados (pi/6 radianes) a la izquierda
      const shiftedRotation = (((rotation - Math.PI / 6) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

      const sector = Math.PI / 2;
      const offset = sector / 4; // 1/4 de cada cuadrante

      // Divide el círculo en 4 sectores, solo activa en la mitad central de cada cuadrante
      if (
        shiftedRotation >= offset &&
        shiftedRotation < sector - offset
      ) {
        setCurrentStage(4); // Norte
      } else if (
        shiftedRotation >= sector + offset &&
        shiftedRotation < 2 * sector - offset
      ) {
        setCurrentStage(3); // Este
      } else if (
        shiftedRotation >= 2 * sector + offset &&
        shiftedRotation < 3 * sector - offset
      ) {
        setCurrentStage(2); // Sur
      } else if (
        shiftedRotation >= 3 * sector + offset &&
        shiftedRotation < 4 * sector - offset
      ) {
        setCurrentStage(1); // Oeste
      } else {
        setCurrentStage(null);
      }
    }
  })

  useEffect(() => {
    const canvas = gl.domElement
    canvas.addEventListener("pointerdown", handlePointerDown)
    canvas.addEventListener("pointerup", handlePointerUp)
    canvas.addEventListener("pointermove", handlePointerMove)
    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("keyup", handleKeyUp)
    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown)
      canvas.removeEventListener("pointerup", handlePointerUp)
      canvas.removeEventListener("pointermove", handlePointerMove)
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("keyup", handleKeyUp)
    }
  }, [
    gl,
    handlePointerDown,
    handlePointerUp,
    handlePointerMove,
    handleKeyDown,
    handleKeyUp,
  ])

  // The pivot position should be the center of the model. Adjust as needed (example: [0,0,0])
  return (
    <a.group ref={thorGroupRef} {...props}>
      <group position={[0, 0, 0]} dispose={null}>
        <group rotation={[-Math.PI / 2, 0, 0]} scale={0.004}>
          <group rotation={[Math.PI / 2, 0, 0]}>
            <group scale={100}>
              <mesh
                castShadow
                receiveShadow
                geometry={nodes.VikingShipObjects001_Objects_0.geometry}
                material={materials.Objects}
              />
              <mesh
                castShadow
                receiveShadow
                geometry={nodes.VikingShipObjects001_Objects_0_1.geometry}
                material={materials.Objects}
              />
            </group>
            <group rotation={[-Math.PI / 2, 0, 0]} scale={100}>
              <mesh
                castShadow
                receiveShadow
                geometry={nodes.Circle011_SerpentBake_0.geometry}
                material={materials.SerpentBake}
              />
              <mesh
                castShadow
                receiveShadow
                geometry={nodes.Circle011_EyeFire_0.geometry}
                material={materials.EyeFire}
              />
            </group>
            <group
              position={[349.569, 32.319, 176.636]}
              rotation={[-1.727, -0.23, -2.646]}
              scale={100}
            >
              <mesh
                castShadow
                receiveShadow
                geometry={nodes.Keel002_Boat1Bake_0.geometry}
                material={materials.Boat1Bake}
              />
              <mesh
                castShadow
                receiveShadow
                geometry={nodes.Keel002_EyeFire_0.geometry}
                material={materials.EyeFire}
              />
            </group>
            <group
              position={[-1018.201, -380.534, 1332.674]}
              rotation={[-1.046, 0.725, -0.082]}
              scale={100}
            >
              <mesh
                castShadow
                receiveShadow
                geometry={nodes.Hide003_Boat2Bake_0.geometry}
                material={materials.Boat2Bake}
              />
              <mesh
                castShadow
                receiveShadow
                geometry={nodes.Hide003_EyeFire_0.geometry}
                material={materials.EyeFire}
              />
            </group>
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Rock021_RockBake_0.geometry}
              material={materials.RockBake}
              rotation={[-Math.PI / 2, 0, 0]}
              scale={100}
            />
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Plane044_WaterBake_0.geometry}
              material={materials.WaterBake}
              position={[0, 27.066, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              scale={[100, 100, 170.018]}
            />
          </group>
        </group>
      </group>
    </a.group>
  )
}

export default Island
