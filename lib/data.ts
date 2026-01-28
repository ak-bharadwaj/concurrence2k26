export interface Event {
  id: string;
  slug: string;
  name: string;
  category: "technical" | "cultural" | "workshops" | "gaming";
  shortDescription: string;
  fullDescription: string;
  rules: string[];
  teamSize: string;
  schedule: {
    day: string;
    date: string;
    time: string;
    venue: string;
  };
  facultyCoordinator: {
    name: string;
    phone: string;
  };
  studentCoordinator: {
    name: string;
    phone: string;
  };
  prizes: {
    first: string;
    second: string;
    third?: string;
  };
  registrationFee: number;
  image: string;
}

export const events: Event[] = [
  {
    id: "1",
    slug: "techsprint",
    name: "Techsprint",
    category: "technical",
    shortDescription: "A high-octane technical race solving real-world problems.",
    fullDescription: "Techsprint is the ultimate technical challenge where speed meets precision. Participants will race against the clock to solve a series of technical hurdles and engineering problems.",
    rules: [
      "Individual or team participation allowed.",
      "Time limits will be strictly enforced.",
      "Decisions of the judges are final.",
    ],
    teamSize: "1-3 members",
    schedule: {
      day: "Day 1",
      date: "February 27, 2026",
      time: "10:00 AM - 1:00 PM",
      venue: "CSE Labs",
    },
    facultyCoordinator: {
      name: "Dr. K. Subba Reddy",
      phone: "+91 98765 43210",
    },
    studentCoordinator: {
      name: "Student Coord 1",
      phone: "+91 87654 32109",
    },
    prizes: {
      first: "Rs. 10,000",
      second: "Rs. 5,000",
    },
    registrationFee: 200,
    image: "/events/techsprint.jpg",
  },
  {
    id: "2",
    slug: "ideathon-ideate-x",
    name: "Ideathon (Ideate X)",
    category: "technical",
    shortDescription: "Pitch your innovative ideas to solve global challenges.",
    fullDescription: "Ideate X is a platform for visionaries to showcase their innovative solutions. Whether it's a software product, a hardware prototype, or a social business model, bring your best ideas to the table.",
    rules: [
      "Teams of 2-4 members.",
      "Abstract submission required prior to event.",
      "Presentation time: 10 minutes + 5 minutes Q&A.",
    ],
    teamSize: "2-4 members",
    schedule: {
      day: "Day 1",
      date: "February 27, 2026",
      time: "2:00 PM - 5:00 PM",
      venue: "Main Seminar Hall",
    },
    facultyCoordinator: {
      name: "Dr. M. Sravan Kumar Reddy",
      phone: "+91 98765 43211",
    },
    studentCoordinator: {
      name: "Student Coord 2",
      phone: "+91 87654 32110",
    },
    prizes: {
      first: "Rs. 15,000",
      second: "Rs. 7,000",
    },
    registrationFee: 300,
    image: "/events/ideathon.jpg",
  },
  {
    id: "3",
    slug: "codejam",
    name: "Codejam",
    category: "technical",
    shortDescription: "Intense coding competition for algorithmic wizards.",
    fullDescription: "Codejam tests your ability to write efficient code under pressure. Solve algorithmic puzzles and data structure challenges to prove your mettle as a top-tier programmer.",
    rules: [
      "Individual participation.",
      "Standard competitive programming rules apply.",
      "Plagiarism checks will be conducted.",
    ],
    teamSize: "Individual",
    schedule: {
      day: "Day 2",
      date: "February 28, 2026",
      time: "10:00 AM - 1:00 PM",
      venue: "Computer Lab 2",
    },
    facultyCoordinator: {
      name: "Mr. P. Naveen Sundar Kumar",
      phone: "+91 98765 43212",
    },
    studentCoordinator: {
      name: "Student Coord 3",
      phone: "+91 87654 32111",
    },
    prizes: {
      first: "Rs. 10,000",
      second: "Rs. 5,000",
    },
    registrationFee: 150,
    image: "/events/codejam.jpg",
  },
  {
    id: "4",
    slug: "technical-talk",
    name: "Technical Talk",
    category: "technical",
    shortDescription: "Expert sessions on emerging technologies.",
    fullDescription: "Gain insights from industry experts and academic leaders on the latest trends in technology, including AI, Blockchain, and IoT.",
    rules: [
      "Open to all registered participants.",
      "Registration required for certificate.",
    ],
    teamSize: "Individual",
    schedule: {
      day: "Day 1",
      date: "February 27, 2026",
      time: "11:00 AM - 12:30 PM",
      venue: "Auditorium",
    },
    facultyCoordinator: {
      name: "Faculty Coord 4",
      phone: "+91 98765 43213",
    },
    studentCoordinator: {
      name: "Student Coord 4",
      phone: "+91 87654 32112",
    },
    prizes: {
      first: "Participation Certificate",
      second: "",
    },
    registrationFee: 0,
    image: "/events/techtalk.jpg",
  },
  {
    id: "5",
    slug: "poster-showcase",
    name: "Poster Showcase",
    category: "technical",
    shortDescription: "Visual presentation of research and projects.",
    fullDescription: "Present your research findings or project ideas through creative and informative posters. A great way to communicate complex technical concepts effectively.",
    rules: [
      "Posters must be printed in A2 size.",
      "Teams of 1-2 members.",
    ],
    teamSize: "1-2 members",
    schedule: {
      day: "Day 2",
      date: "February 28, 2026",
      time: "2:00 PM - 4:00 PM",
      venue: "Quadrangles",
    },
    facultyCoordinator: {
      name: "Faculty Coord 5",
      phone: "+91 98765 43214",
    },
    studentCoordinator: {
      name: "Student Coord 5",
      phone: "+91 87654 32113",
    },
    prizes: {
      first: "Rs. 5,000",
      second: "Rs. 3,000",
    },
    registrationFee: 200,
    image: "/events/poster.jpg",
  },
  {
    id: "6",
    slug: "prompt-craft",
    name: "Prompt Craft",
    category: "technical",
    shortDescription: "Master the art of AI prompting.",
    fullDescription: "A unique competition testing your skills in generating the best outputs from generative AI models through effective prompt engineering.",
    rules: [
      "Individual participation.",
      "Access to specific AI tools will be provided.",
    ],
    teamSize: "Individual",
    schedule: {
      day: "Day 1",
      date: "February 27, 2026",
      time: "3:00 PM - 5:00 PM",
      venue: "Computer Lab 3",
    },
    facultyCoordinator: {
      name: "Faculty Coord 6",
      phone: "+91 98765 43215",
    },
    studentCoordinator: {
      name: "Student Coord 6",
      phone: "+91 87654 32114",
    },
    prizes: {
      first: "Rs. 5,000",
      second: "Rs. 2,500",
    },
    registrationFee: 100,
    image: "/events/prompt.jpg",
  },
  {
    id: "7",
    slug: "invisible-code",
    name: "Invisible Code",
    category: "technical",
    shortDescription: "Coding in the dark - literally or metaphorically!",
    fullDescription: "A fun and challenging event where you type code without seeing the screen, or debugging code with invisible errors. Test your muscle memory and syntax knowledge.",
    rules: [
      "Monitors will be turned off.",
      "Syntax errors will attract penalties.",
    ],
    teamSize: "Individual",
    schedule: {
      day: "Day 2",
      date: "February 28, 2026",
      time: "11:00 AM - 1:00 PM",
      venue: "Computer Lab 4",
    },
    facultyCoordinator: {
      name: "Faculty Coord 7",
      phone: "+91 98765 43216",
    },
    studentCoordinator: {
      name: "Student Coord 7",
      phone: "+91 87654 32115",
    },
    prizes: {
      first: "Rs. 4,000",
      second: "Rs. 2,000",
    },
    registrationFee: 100,
    image: "/events/invisible.jpg",
  },
  {
    id: "8",
    slug: "skill-bootcamp",
    name: "Skill Bootcamp",
    category: "workshops",
    shortDescription: "Intensive hands-on training sessions.",
    fullDescription: "A dedicated workshop track to upskill participants in specific technologies like React, Node.js, or Cloud Computing.",
    rules: [
      "Registration mandatory.",
      "Participants must bring laptops.",
    ],
    teamSize: "Individual",
    schedule: {
      day: "Day 1",
      date: "February 27, 2026",
      time: "9:00 AM - 4:00 PM",
      venue: "Seminar Hall 2",
    },
    facultyCoordinator: {
      name: "Faculty Coord 8",
      phone: "+91 98765 43217",
    },
    studentCoordinator: {
      name: "Student Coord 8",
      phone: "+91 87654 32116",
    },
    prizes: {
      first: "Certificate",
      second: "",
    },
    registrationFee: 300,
    image: "/events/bootcamp.jpg",
  },
  {
    id: "9",
    slug: "code-rewind",
    name: "Code Rewind",
    category: "technical",
    shortDescription: "Reverse engineering challenge.",
    fullDescription: "Given a binary or an output, deduce the source code or logic. A test of your analytical and reverse-engineering skills.",
    rules: [
      "Individual participation.",
      "No decompilers allowed unless specified.",
    ],
    teamSize: "Individual",
    schedule: {
      day: "Day 2",
      date: "February 28, 2026",
      time: "2:00 PM - 4:00 PM",
      venue: "Computer Lab 1",
    },
    facultyCoordinator: {
      name: "Faculty Coord 9",
      phone: "+91 98765 43218",
    },
    studentCoordinator: {
      name: "Student Coord 9",
      phone: "+91 87654 32117",
    },
    prizes: {
      first: "Rs. 4,000",
      second: "Rs. 2,000",
    },
    registrationFee: 100,
    image: "/events/rewind.jpg",
  },
  {
    id: "10",
    slug: "techwiz",
    name: "Techwiz",
    category: "technical",
    shortDescription: "The ultimate technical quiz.",
    fullDescription: "Battle of wits! Test your knowledge across various domains of Computer Science and Engineering in this quiz competition.",
    rules: [
      "Teams of 2 members.",
      "Multiple rounds including buzzer round.",
    ],
    teamSize: "2 members",
    schedule: {
      day: "Day 1",
      date: "February 27, 2026",
      time: "3:00 PM - 5:00 PM",
      venue: "Seminar Hall 3",
    },
    facultyCoordinator: {
      name: "Faculty Coord 10",
      phone: "+91 98765 43219",
    },
    studentCoordinator: {
      name: "Student Coord 10",
      phone: "+91 87654 32118",
    },
    prizes: {
      first: "Rs. 5,000",
      second: "Rs. 2,500",
    },
    registrationFee: 150,
    image: "/events/techwiz.jpg",
  },
];

export const collegeInfo = {
  name: "RGM College of Engineering & Technology (Autonomous)",
  shortName: "RGMCET",
  address: "NH-40, Nandyal-518501 (Dist), A.P, India",
  phone: "+91 8514 275201",
  email: "principal@rgmcet.edu.in",
  website: "www.rgmcet.edu.in",
  mapEmbed:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1151.7825000000002!2d78.5033878!3d15.4746618!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bb5b9d301f221c1%3A0xc319175276e7b233!2sRajeev%20Gandhi%20Memorial%20College%20of%20Engineering%20and%20Technology!5e0!3m2!1sen!2sin!4v1700000000000",
  social: {
    instagram: "https://instagram.com/rgmcet",
    twitter: "https://twitter.com/rgmcet",
    facebook: "https://facebook.com/rgmcet",
    linkedin: "https://linkedin.com/school/rgmcet",
    youtube: "https://youtube.com/@rgmcet",
  },
  about:
    "Department of Computer Science and Engineering, RGM College of Engineering & Technology (Autonomous), Nandyal. Established in 1995, we are committed to excellence in technical education.",
};

export const festInfo = {
  name: "CONCURRENCE RIPPLE-2K26",
  tagline: "XIX NATIONAL LEVEL TECHNICAL SYMPOSIUM",
  dates: {
    start: "February 27, 2026",
    end: "February 28, 2026",
  },
  stats: {
    events: 10,
    prizes: "1,00,000+",
    participants: "3000+",
    colleges: "40+",
  },
};

export const schedule = [
  {
    day: "Day 1",
    date: "February 27, 2026",
    events: [
      { time: "9:00 AM", event: "Inauguration Ceremony", venue: "Main Auditorium" },
      { time: "10:00 AM", event: "Techsprint Begins", venue: "CSE Labs" },
      { time: "11:00 AM", event: "Technical Talk", venue: "Upcoming" },
      { time: "2:00 PM", event: "Ideathon (Ideate X)", venue: "Seminar Hall" },
      { time: "3:00 PM", event: "Techwiz", venue: "Seminar Hall 3" },
    ],
  },
  {
    day: "Day 2",
    date: "February 28, 2026",
    events: [
      { time: "10:00 AM", event: "Codejam", venue: "Computer Lab 2" },
      { time: "11:00 AM", event: "Invisible Code", venue: "Computer Lab 4" },
      { time: "2:00 PM", event: "Poster Showcase", venue: "Quadrangles" },
      { time: "2:00 PM", event: "Code Rewind", venue: "Computer Lab 1" },
      { time: "4:00 PM", event: "Valedictory & Prize Distribution", venue: "Main Auditorium" },
    ],
  },
];

export const faqs = [
  {
    question: "Who can participate in Concurrence Ripple 2k26?",
    answer:
      "The symposium is open to students from all engineering colleges. Some events may have specific branch prerequisites.",
  },
  {
    question: "How do I register?",
    answer:
      "You can register online through this website. Click on the 'Register Now' button and fill in your details.",
  },
  {
    question: "What is the registration fee?",
    answer:
      "Registration fees vary per event. Please check the individual event details or the registration page.",
  },
  {
    question: "Is accommodation provided?",
    answer:
      "Yes, limited accommodation is available for outstation participants. Please contact the coordinators for prior booking.",
  },
  {
    question: "Will I get a participation certificate?",
    answer:
      "Yes, certificates will be awarded to all registered participants who attend the event.",
  },
];

export const categories = [
  { id: "all", name: "All Events", color: "from-neon-cyan to-neon-blue" },
  { id: "technical", name: "Technical", color: "from-blue-500 to-cyan-500" },
  { id: "workshops", name: "Workshops", color: "from-green-500 to-emerald-500" },
];
