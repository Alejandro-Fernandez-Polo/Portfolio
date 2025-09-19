import { Suspense, useState } from "react"
import { useEffect } from "react"
import { Canvas } from "@react-three/fiber"
import { Loader } from "../components/Loader.jsx"
import Sky from "../models/Sky"
import HomeInfo from "../components/HomeInfo.jsx"
import Island from "../models/Island"
import Dragon from "../models/Dragon"
import Plane from "../models/Plane"

export function Home() {
  // Aplica overflow hidden al body cuando se monta Home

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);
  const [isRotating, setIsRotating] = useState(false)
  const [currentStage, setCurrentStage] = useState(1)

  const adjustIslandForScreenSize = () => {
    let screenScale, screenPosition

    if (window.innerWidth < 768) {
      screenScale = [0.9, 0.9, 0.9]
      screenPosition = [0, -4, -13]
    } else {
      screenScale = [1, 1, 1]
      screenPosition = [0, -4, -12.4]
    }

    return [screenScale, screenPosition]
  }

  const adjustPlaneForScreenSize = () => {
    let screenScale, screenPosition

    if (window.innerWidth < 768) {
      screenScale = [1.25, 1.25, 1.25]
      screenPosition = [0, -2.5, 0]
    } else {
      screenScale = [1.5, 1.5, 1.5]
      screenPosition = [0, -3, -1]
    }

    return [screenScale, screenPosition]
  }

  const [islandScale, islandPosition] = adjustIslandForScreenSize()
  const [planeScale, planePosition] = adjustPlaneForScreenSize()

  return (
    <section className="overflow-hidden w-full h-screen relative">
      <div
        className="absolute top-28 left-0 right-0 z-10 flex
      items-center justify-center"
      >
        {currentStage && <HomeInfo currentStage={currentStage} />}
      </div>
      <Canvas
        className={`w-full h-screen relative ${
          isRotating ? "cursor-grabbing" : "cursor-grab"
        }`}
        camera={{ near: 0.1, far: 1000 }}
      >
        <Suspense fallback={<Loader />}>
          <directionalLight position={[1, 1, 1]} intensity={2} />
          <ambientLight intensity={4} />
          <hemisphereLight
            skyColor={"#b1e1ff"}
            groundColor={"#000000"}
            intensity={1}
          />
          <Plane />
          <Sky isRotating={isRotating} />
          <Island
            scale={islandScale}
            position={islandPosition}
            isRotating={isRotating}
            setIsRotating={setIsRotating}
            setCurrentStage={setCurrentStage}
          />
          <Dragon
            isRotating={isRotating}
            scale={planeScale}
            position={planePosition}
            rotation={[0, 20, 0]}
          />
        </Suspense>
      </Canvas>
    </section>
  )
}
