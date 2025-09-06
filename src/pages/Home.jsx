import { Suspense } from "react"
import { Canvas } from "@react-three/fiber"
import { Loader } from "../components/Loader.jsx"
import Island from "../models/Island"
import Sky from "../models/Sky"
import Bird from "../models/Bird"
import Plane from "../models/Plane"

export function Home() {
  const adjustIslandForScreenSize = () => {
  let screenScale, screenPosition

  if (window.innerWidth < 768) {
    screenScale = [0.9, 0.9, 0.9]
    screenPosition = [0, -6.5, -43.4]
  } else {
    screenScale = [1, 1, 1]
    screenPosition = [0, -6.5, -43.4]
  }

    return [screenScale, screenPosition]
  }

  const [islandScale, islandPosition] = adjustIslandForScreenSize()

  return (
    <section className="w-full h-screen relative">
      {/* <div className="absolute top-28 left-0 rigth-0 z-10 flex
      items-center justify-center">
        POPUP
      </div> */}
      <Canvas
        className="w-full h-screen relative"
        camera={{ near: 0.1, far: 1000 }}
      >
        <Suspense fallback={<Loader />}>
          <directionalLight position={[1, 1, 1]} intensity={2} />
          <ambientLight intensity={0.5} />
          <hemisphereLight
            skyColor={"#b1e1ff"}
            groundColor={"#000000"}
            intensity={1}
          />
          <Bird />
          <Sky />
          <Island
            scale={islandScale}
            position={islandPosition}
            rotation={[0.1, 4.7077, 0]}
          />
          <Plane />
        </Suspense>
      </Canvas>
    </section>
  )
}
