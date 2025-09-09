import { Link } from "react-router-dom"
import { arrow } from "../assets/icons"

const InfoBox = ({ text, link, btnText }) => (
  <div className="mx-5 relative flex text-white flex-col gap-3 max-w-2xl neo-brutalism-blue pt-4 pb-12 px-8">
    <p className="font-medium text-center sm:text-xl">{text}</p>
    <Link
      to={link}
      className="neo-brutalism-white py-3 px-6 rounded-lg text-blue-500 text-center font-semibold sm:w-1/2 w-[90%] -bottom-5 absolute mx-auto right-0 left-0 flex justify-center items-center gap-3"
    >
      {btnText}
      <img src={arrow} alt="arrow" className="w-4 h-4 object-contain" />
    </Link>
  </div>
)

const renderContent = {
  1: (
    <h1
      className="sm:text-xl sm:leading-snug text-center 
    neo-brutalism-blue py-4 px-8 text-white mx-5">
      Hi, I am <span className="font-semibold">Alejandro</span>👋
      <br />A Software Developer from Granada
    </h1>
  ),
  2: (
    <InfoBox
      text="Welcome to Stage 2"
      link="/about"
      btnText="Learn More"
    />
  ),
  3: (
    <InfoBox
      text="Welcome to Stage 3"
      link="/projects"
      btnText="Visit Projects"
    />
  ),
  4: (
    <InfoBox
      text="Welcome to Stage 4"
      link="/contact"
      btnText="Let's Talk"
    />
  ),
}

const HomeInfo = ({ currentStage }) => {
  return renderContent[currentStage] || null
}

export default HomeInfo
