import { Link } from "react-router-dom"

const InfoBox = ({ text, link, btnText }) => (
  <div className="info-box neo-brutalism-blue">
    <p className="font-medium text-center sm:text-xl">{text}</p>
    <Link to={link} className="neo-brutalism-white neo-btn">
      {btnText} &rarr;
    </Link>
  </div>
)

const renderContent = {
  1: (
    <h1
      className="sm:text-xl sm:leading-snug text-center 
    neo-brutalism-blue py-4 px-8 text-white mx-5"
    >
      Hi, I am <span className="font-semibold">Alejandro</span>👋
      <br />A Software Developer from Granada
    </h1>
  ),
  2: (
    <InfoBox
      text="Welcome to Stage 2" //TODO: change text
      link="/about"
      btnText="Learn More"
    />
  ),
  3: (
    <InfoBox
      text="Welcome to Stage 3" //TODO: change text
      link="/projects"
      btnText="Visit Projects"
    />
  ),
  4: (
    <InfoBox
      text="Welcome to Stage 4" //TODO: change text
      link="/contact"
      btnText="Let's Talk"
    />
  ),
}

const HomeInfo = ({ currentStage }) => {
  return renderContent[currentStage] || null
}

export default HomeInfo
