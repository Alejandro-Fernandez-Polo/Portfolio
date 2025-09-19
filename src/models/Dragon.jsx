import { useGLTF, useAnimations } from "@react-three/drei"
import { useEffect, useRef } from "react"

import dragonScene from "../assets/3d/dragon.glb"

const Dragon = ({ isRotating, ...props}) => {
const ref = useRef()
const { scene, animations } = useGLTF(dragonScene)
const { actions } = useAnimations(animations, ref)

  useEffect(() => {
    if (isRotating) {
      actions["stand"].stop()
      actions["run"].play()
    } else {
      actions["run"].stop()
      actions["stand"].play()
    }
  }, [actions, isRotating])

  return (
    <mesh {...props} ref={ref}>
      <primitive object={scene} />
    </mesh>
  )
}

export default Dragon
