//TODO: poner mis datos
import { meta, shopify, starbucks, tesla, atg, pergolas } from "../assets/images"
import {
  reactlogo,
  contact,
  css,
  express,
  git,
  github,
  html,
  javascript,
  linkedin,
  mongodb,
  nodejs,
  codigodesconocido,
  react,
  vehicle,
  tailwindcss,
  design,
  postman,
  laravel,
  php,
  java,
  sql,
  wordpress,
  bootstrap,
  docker,
} from "../assets/icons"

export const skills = [
  {
    imageUrl: php,
    name: "Php",
    type: "Backend",
  },
  {
    imageUrl: java,
    name: "Java",
    type: "Backend",
  },
  {
    imageUrl: laravel,
    name: "Laravel",
    type: "Backend",
  },
  {
    imageUrl: sql,
    name: "SQL",
    type: "Database",
  },
  {
    imageUrl: wordpress,
    name: "WordPress",
    type: "CMS",
  },
  {
    imageUrl: docker,
    name: "Docker",
    type: "DevOps",
  },
  {
    imageUrl: html,
    name: "HTML",
    type: "Frontend",
  },
  {
    imageUrl: css,
    name: "CSS",
    type: "Frontend",
  },
  {
    imageUrl: javascript,
    name: "JavaScript",
    type: "Frontend",
  },
  {
    imageUrl: react,
    name: "React",
    type: "Frontend",
  },
  {
    imageUrl: nodejs,
    name: "Node.js",
    type: "Backend",
  },
  {
    imageUrl: tailwindcss,
    name: "Tailwind CSS",
    type: "Frontend",
  },
  {
    imageUrl: git,
    name: "Git",
    type: "Version Control",
  },
  {
    imageUrl: github,
    name: "GitHub",
    type: "Version Control",
  },
  {
    imageUrl: express,
    name: "Express",
    type: "Backend",
  },
  {
    imageUrl: mongodb,
    name: "MongoDB",
    type: "Database",
  },
  {
    imageUrl: bootstrap,
    name: "Bootstrap",
    type: "Frontend",
  },
  {
    imageUrl: postman,
    name: "POSTMAN",
    type: "Testing",
  },
]

export const experiences = [
  {
    title: "Web Developer Intern",
    company_name: "ATG Analytical",
    icon: atg,
    iconBg: "#FBCEBC",
    date: "April 2024 - June 2024",
    points: [
      "Built the corporate website from scratch using WordPress, JavaScript, HTML, and CSS.",
      "Improved functionality and design based on company requirements.",
      "Worked with agile methodologies and solved technical issues independently.",
      "Successfully delivered a production-ready website that boosted the company's online presence.",
    ],
  },
  {
    title: "Carpentry Assistant",
    company_name: "Pérgolas y Estructuras Javier Aibar",
    icon: pergolas,
    // TODO: revisar este color
    iconBg: "#CDC3AF",
    date: "June 2023 - September 2023",
    points: [
      "Developed strong work discipline and adaptability in a hands-on environment.",
      "Collaborated closely with team members to complete projects efficiently.",
      "Gained valuable teamwork and responsibility skills transferable to any industry.",
    ],
  },

  // {
  //   title: "React.js Developer",
  //   company_name: "Starbucks",
  //   icon: starbucks,
  //   iconBg: "#accbe1",
  //   date: "March 2020 - April 2021",
  //   points: [
  //     "Developing and maintaining web applications using React.js and other related technologies.",
  //     "Collaborating with cross-functional teams including designers, product managers, and other developers to create high-quality products.",
  //     "Implementing responsive design and ensuring cross-browser compatibility.",
  //     "Participating in code reviews and providing constructive feedback to other developers.",
  //   ],
  // },
  // {
  //   title: "React Native Developer",
  //   company_name: "Tesla",
  //   icon: tesla,
  //   iconBg: "#fbc3bc",
  //   date: "Jan 2021 - Feb 2022",
  //   points: [
  //     "Developing and maintaining web applications using React.js and other related technologies.",
  //     "Collaborating with cross-functional teams including designers, product managers, and other developers to create high-quality products.",
  //     "Implementing responsive design and ensuring cross-browser compatibility.",
  //     "Participating in code reviews and providing constructive feedback to other developers.",
  //   ],
  // },
  // {
  //   title: "Web Developer",
  //   company_name: "Shopify",
  //   icon: shopify,
  //   iconBg: "#b7e4c7",
  //   date: "Jan 2022 - Jan 2023",
  //   points: [
  //     "Developing and maintaining web applications using React.js and other related technologies.",
  //     "Collaborating with cross-functional teams including designers, product managers, and other developers to create high-quality products.",
  //     "Implementing responsive design and ensuring cross-browser compatibility.",
  //     "Participating in code reviews and providing constructive feedback to other developers.",
  //   ],
  // },
  // {
  //   title: "Full stack Developer",
  //   company_name: "Meta",
  //   icon: meta,
  //   iconBg: "#a2d2ff",
  //   date: "Jan 2023 - Present",
  //   points: [
  //     "Developing and maintaining web applications using React.js and other related technologies.",
  //     "Collaborating with cross-functional teams including designers, product managers, and other developers to create high-quality products.",
  //     "Implementing responsive design and ensuring cross-browser compatibility.",
  //     "Participating in code reviews and providing constructive feedback to other developers.",
  //   ],
  // },
]

export const socialLinks = [
  {
    name: "Contact",
    iconUrl: contact,
    link: "/contact",
  },
  {
    name: "GitHub",
    iconUrl: github,
    link: "https://github.com/Alejandro-Fernandez-Polo",
  },
  {
    name: "LinkedIn",
    iconUrl: linkedin,
    link: "https://www.linkedin.com/in/alejandro-fern%C3%A1ndez-polo/",
  },
]

export const projects = [
  //TODO: Añadir tecnologías usadas
  {
    iconUrl: codigodesconocido,
    theme: "btn-back-black",
    name: "Codigo Desconocido",
    description:
      "Codigo Desconocido is an escape room management platform with a web admin panel, backend services, chat server, and Dockerized infrastructure. It enables users to book, manage, and interact with escape rooms for both educational and entertainment purposes.",
    link: "https://github.com/Alejandro-Fernandez-Polo/DAW/tree/main/Final_project/Codigo-Desconocido",
  },
  {
    iconUrl: vehicle,
    theme: "btn-back-green",
    name: "Vehicle Fleet Management",
    description:
      "This project is an electric vehicle fleet management system, developed as part of the Object-Oriented Programming (OOP) practice at UNED. It enables the management of users, vehicles, rates, maintenance, and assignments, applying key OOP principles such as inheritance, polymorphism, and encapsulation.",
    link: "https://github.com/Alejandro-Fernandez-Polo/UNED/tree/main/POO/PEC_POO_24-25",
  },
  {
    iconUrl: design,
    theme: "btn-back-pink",
    name: "Design Projects",
    description:
      "These projects reflect my development as a web designer, each highlighting different skills in HTML, CSS, and JavaScript. They illustrate my growth through diverse assignments and practices, with this portfolio representing the culmination and most polished result of that journey.",
    link: "https://github.com/Alejandro-Fernandez-Polo/DAW/tree/main/Design",
  },
  {
    iconUrl: reactlogo,
    theme: "btn-back-blue",
    name: "React Practice Projects",
    description:
      "My React practice projects highlight my hands-on experience building interactive and dynamic applications. They focus on component-driven development, state management, and responsive interfaces, reflecting the experimentation behind my learning journey. This portfolio combines those skills into a cohesive and polished final work.",
    link: "https://github.com/Alejandro-Fernandez-Polo/Learn_React/tree/main/projects",
  },
  // {
  //   iconUrl: estate,
  //   theme: "btn-back-red",
  //   name: "Real-Estate Application",
  //   description:
  //     "Developed a web application for real estate listings, facilitating property searches and connecting buyers with sellers.",
  //   link: "https://github.com/adrianhajdin/projects_realestate",
  // },
  // {
  //   iconUrl: summiz,
  //   theme: "btn-back-yellow",
  //   name: "AI Summarizer Application",
  //   description:
  //     "App that leverages AI to automatically generate concise & informative summaries from lengthy text content, or blogs.",
  //   link: "https://github.com/adrianhajdin/project_ai_summarizer",
  // },
]
