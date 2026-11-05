// Challenge copy and destinations are preserved from the official 2026 Space Apps Challenge catalog, with Arabic translations.
export type MissionTheme =
  | "lunar"
  | "earth"
  | "habitat"
  | "landing"
  | "health"
  | "radar"
  | "farms"
  | "flame"
  | "hotspots"
  | "analogs"
  | "mars"
  | "cosmic"
  | "flight"
  | "sound"

export type Mission =
  | {
      kind: "briefing"
      id: "briefing"
      label: string
      labelAr?: string
      title: string
      titleAr?: string
      accent: string
    }
  | {
      kind: "challenge"
      id: MissionTheme
      label: string
      labelAr: string
      title: string
      titleAr: string
      summary: string
      summaryAr: string
      difficulty: string[]
      subjects: string[]
      url: string
      accent: string
    }

export const difficultyTranslations: Record<string, string> = {
  "Beginner / Youth": "مبتدئ / ناشئون",
  Intermediate: "متوسط",
  Advanced: "متقدم",
}

export const subjectTranslations: Record<string, string> = {
  Astrophysics: "الفيزياء الفلكية",
  "Planets & Moons": "الكواكب والأقمار",
  "Space Exploration": "استكشاف الفضاء",
  "Earth Science": "علوم الأرض",
  Software: "البرمجيات",
  Games: "الألعاب",
  Sun: "الشمس",
  "Human Exploration": "الاستكشاف البشري",
  Moon: "القمر",
  Mars: "المريخ",
  "Arts & Multimedia": "الفنون والوسائط المتعددة",
}

export const missions: Mission[] = [
  {
    kind: "briefing",
    id: "briefing",
    label: "MISSION BRIEFING",
    labelAr: "موجز المهمة",
    title: "Mission Briefing",
    titleAr: "موجز المهمة",
    accent: "#b8a5ff",
  },
  {
    kind: "challenge",
    id: "lunar",
    label: "LUNAR ARCHIVES",
    labelAr: "أرشيف القمر",
    title:
      "Abandoned but Not Forgotten: Storytelling about NASA's Discarded Equipment on the Moon and Mars",
    titleAr: "لم يُنسَ ولم يُهمل: قصص معدات ناسا المتروكة على القمر والمريخ",
    summary:
      "Tell the stories of equipment NASA left on the Moon and Mars, and the discoveries it helped make possible.",
    summaryAr:
      "اروِ قصص المعدات التي تركتها ناسا على القمر والمريخ، والاكتشافات العلمية التي ساعدت في تحقيقها.",
    difficulty: ["Beginner / Youth", "Intermediate"],
    subjects: ["Space Exploration", "Planets & Moons", "Astrophysics"],
    url: "https://www.spaceappschallenge.org/2026/challenges/nasas-discarded-equipment-storytelling/",
    accent: "#d4c8ff",
  },
  {
    kind: "challenge",
    id: "earth",
    label: "EARTH WATCH",
    labelAr: "رصد الأرض",
    title: "Be An Earth System Trend Detective!",
    titleAr: "كن محققًا في اتجاهات نظام الأرض!",
    summary:
      "Use NASA data to investigate how Earth's environment changes over time, where changes happen, and whether those changes are scientifically significant.",
    summaryAr:
      "استخدم بيانات ناسا للتحقيق في كيفية تغير بيئة الأرض بمرور الوقت، وأين تحدث التغيرات، وما إذا كانت ذات دلالة علمية.",
    difficulty: ["Advanced"],
    subjects: ["Earth Science", "Software"],
    url: "https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/",
    accent: "#7cdacb",
  },
  {
    kind: "challenge",
    id: "habitat",
    label: "JUNIOR ASTRONAUTS",
    labelAr: "رواد الفضاء الناشئون",
    title: "Build a Junior Astronaut Mission Trainer",
    titleAr: "صمّم مدرّب مهمات لرائد فضاء ناشئ",
    summary:
      "Create a game where students manage a Moon or Mars base, balancing life support, radiation protection, power, and food to keep their crew alive.",
    summaryAr:
      "ابتكر لعبة يدير فيها الطلاب قاعدة على القمر أو المريخ، مع موازنة دعم الحياة والحماية من الإشعاع والطاقة والغذاء لإبقاء طاقمهم على قيد الحياة.",
    difficulty: ["Beginner / Youth", "Intermediate"],
    subjects: ["Games", "Planets & Moons", "Software", "Space Exploration"],
    url: "https://www.spaceappschallenge.org/2026/challenges/junior-astronaut-mission-trainer/",
    accent: "#f1bf8d",
  },
  {
    kind: "challenge",
    id: "landing",
    label: "LUNAR NAVIGATION",
    labelAr: "الملاحة القمرية",
    title: "CLPS Lunar Mission Browser",
    titleAr: "أداة لاستكشاف مهمات CLPS القمرية",
    summary:
      "Build a tool to compare Moon landing sites and dates, showing sunlight and Earth visibility to help evaluate power generation and communication opportunities.",
    summaryAr:
      "ابنِ أداة لمقارنة مواقع وتواريخ الهبوط على القمر، مع إظهار ضوء الشمس ورؤية الأرض للمساعدة في تقييم فرص توليد الطاقة والاتصال.",
    difficulty: ["Intermediate", "Advanced"],
    subjects: ["Human Exploration", "Moon", "Software"],
    url: "https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/",
    accent: "#d2d6ed",
  },
  {
    kind: "challenge",
    id: "health",
    label: "CREW HEALTH",
    labelAr: "صحة الطاقم",
    title: "Create Health Monitoring Software for Astronauts on Space Missions",
    titleAr: "أنشئ برنامجًا لمراقبة صحة رواد الفضاء في المهمات الفضائية",
    summary:
      "Build software that tracks astronauts' health indicators and helps them monitor their condition during long-duration space missions.",
    summaryAr:
      "طوّر برمجية لتتبع المؤشرات الصحية لرواد الفضاء ومساعدتهم على مراقبة حالتهم أثناء المهمات الفضائية الطويلة.",
    difficulty: ["Intermediate"],
    subjects: ["Human Exploration", "Software", "Space Exploration"],
    url: "https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/",
    accent: "#f6a5c6",
  },
  {
    kind: "challenge",
    id: "radar",
    label: "RADAR DETECTIVE",
    labelAr: "استكشاف الرادار",
    title: "Dancing with the SARs",
    titleAr: "الرقص مع رادارات الفتحة الاصطناعية (SAR)",
    summary:
      "Use radar satellite data from the NASA-ISRO NISAR mission to build an interactive tool that reveals changes to Earth's surface, from wildfires to earthquakes.",
    summaryAr:
      "استخدم بيانات الرادار الفضائي من مهمة NISAR المشتركة بين ناسا وإيسرو لبناء أداة تفاعلية تكشف التغيرات على سطح الأرض، من حرائق الغابات إلى الزلازل.",
    difficulty: ["Intermediate", "Advanced"],
    subjects: ["Earth Science"],
    url: "https://www.spaceappschallenge.org/2026/challenges/dancing-with-the-sars/",
    accent: "#7bd4e8",
  },
  {
    kind: "challenge",
    id: "farms",
    label: "SMART AGRICULTURE",
    labelAr: "الزراعة الذكية",
    title: "Field Shift: Adapting Farms with NASA Data",
    titleAr: "تحوّل الحقول: تكييف المزارع باستخدام بيانات ناسا",
    summary:
      "Create a decision-support tool that combines NASA Earth observations, soil conditions, and farming needs to help farmers explore resilient crop-rotation strategies.",
    summaryAr:
      "ابتكر أداة لدعم اتخاذ القرار تجمع بين بيانات رصد الأرض من ناسا، وظروف التربة، واحتياجات الزراعة لمساعدة المزارعين في استكشاف استراتيجيات مرنة لتناوب المحاصيل.",
    difficulty: ["Intermediate", "Advanced"],
    subjects: ["Arts & Multimedia", "Earth Science", "Software"],
    url: "https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/",
    accent: "#b4d98b",
  },
  {
    kind: "challenge",
    id: "flame",
    label: "ZERO-G FIRE LAB",
    labelAr: "مختبر حرائق انعدام الجاذبية",
    title:
      "Flame in Freefall: AI-Powered Fire Safety Insights from Microgravity Combustion Data",
    titleAr: "لهيب في السقوط الحر: رؤى لسلامة الحرائق بالذكاء الاصطناعي من بيانات الاحتراق في الجاذبية الصغرى",
    summary:
      "Build an AI-powered dashboard that organizes NASA's microgravity fire experiments and reveals insights that could improve fire safety on future space missions.",
    summaryAr:
      "ابنِ لوحة تحكم مدعومة بالذكاء الاصطناعي تنظم تجارب حرائق ناسا في انعدام الجاذبية وتقدم رؤى تعزز سلامة الحرائق في مهمات الفضاء المستقبلية.",
    difficulty: ["Intermediate", "Advanced"],
    subjects: ["Space Exploration"],
    url: "https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/",
    accent: "#ffa77f",
  },
  {
    kind: "challenge",
    id: "hotspots",
    label: "FIRE TRACKER",
    labelAr: "راصد بؤر الحرائق",
    title: "Harmonization of MODIS and VIIRS Hot Spots",
    titleAr: "مواءمة بؤر الحرائق الساخنة بين MODIS وVIIRS",
    summary:
      "Combine fire records from two satellite systems into one consistent calendar to help identify wildfire patterns, unusual burning activity, and critical periods.",
    summaryAr:
      "اجمع سجلات الحرائق من نظامي أقمار صناعية في تقويم موحد للمساعدة في تحديد أنماط حرائق الغابات، والأنشطة غير المعتادة، والفترات الحرجة.",
    difficulty: ["Intermediate", "Advanced"],
    subjects: ["Earth Science", "Software"],
    url: "https://www.spaceappschallenge.org/2026/challenges/modis-and-viirs-hot-spots/",
    accent: "#ffb98c",
  },
  {
    kind: "challenge",
    id: "analogs",
    label: "EARTH ANALOGS",
    labelAr: "بيئات الأرض النظيرة",
    title:
      "Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars",
    titleAr: "حدّد مواقع على الأرض تحاكي مواقع القواعد القمرية الدائمة والمريخ",
    summary:
      "Use Earth, Moon, and Mars data to discover places on Earth that resemble potential lunar or Martian base locations and help prepare for future exploration.",
    summaryAr:
      "استخدم بيانات الأرض والقمر والمريخ لاكتشاف أماكن على الأرض تشبه مواقع القواعد المحتملة على القمر أو المريخ للمساعدة في الاستعداد للاستكشاف المستقبلي.",
    difficulty: ["Beginner / Youth", "Intermediate", "Advanced"],
    subjects: [
      "Earth Science",
      "Planets & Moons",
      "Software",
      "Space Exploration",
    ],
    url: "https://www.spaceappschallenge.org/2026/challenges/permanent-moon-base-locations-and-mars/",
    accent: "#dcc3a0",
  },
  {
    kind: "challenge",
    id: "mars",
    label: "MARTIAN EXPLORER",
    labelAr: "مستكشف المريخ",
    title: "Interplanetary Survival Guide: Martian Map",
    titleAr: "دليل النجاة بين الكواكب: خريطة المريخ",
    summary:
      "Create an interactive Mars map combining NASA datasets to help future astronauts navigate terrain, plan routes, and conduct scientific exploration safely.",
    summaryAr:
      "صمّم خريطة تفاعلية للمريخ تجمع بين مجموعات بيانات ناسا لمساعدة رواد الفضاء المستقبليين على استكشاف التضاريس، وتخطيط المسارات، وإجراء الأبحاث بأمان.",
    difficulty: ["Intermediate"],
    subjects: [
      "Human Exploration",
      "Mars",
      "Planets & Moons",
      "Software",
      "Space Exploration",
    ],
    url: "https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/",
    accent: "#f3a184",
  },
  {
    kind: "challenge",
    id: "cosmic",
    label: "COSMIC DETECTIVE",
    labelAr: "المستكشف الكوني",
    title: "Planet X and SPHEREx",
    titleAr: "الكوكب إكس ومهمة SPHEREx",
    summary:
      "Build a public-friendly tool for exploring SPHEREx sky images and spotting how celestial objects change position over time.",
    summaryAr:
      "ابنِ أداة سهلة الاستخدام للجمهور لاستكشاف صور السماء من مهمة SPHEREx ورصد كيفية تغير مواقع الأجرام السماوية بمرور الوقت.",
    difficulty: ["Advanced"],
    subjects: ["Astrophysics", "Planets & Moons", "Software"],
    url: "https://www.spaceappschallenge.org/2026/challenges/planet-x-and-spherex/",
    accent: "#aab4ff",
  },
  {
    kind: "challenge",
    id: "flight",
    label: "FLIGHT SIMULATOR",
    labelAr: "محاكي الطيران الفضائي",
    title: "Space Mission Design Game",
    titleAr: "لعبة تصميم المهمات الفضائية",
    summary:
      "Create a game where players design and manage a space mission, balance limited resources, make engineering decisions, and discover how those choices affect mission success.",
    summaryAr:
      "ابتكر لعبة يصمم فيها اللاعبون مهمة فضائية ويديرونها، ويوازنون الموارد المحدودة، ويتخذون قرارات هندسية لمعرفة أثرها على نجاح المهمة.",
    difficulty: ["Beginner / Youth", "Intermediate"],
    subjects: ["Games", "Space Exploration"],
    url: "https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/",
    accent: "#95ccf5",
  },
  {
    kind: "challenge",
    id: "sound",
    label: "EARTH IN SOUND",
    labelAr: "الأرض بالصوت",
    title: "The Earth Information Jukebox",
    titleAr: "صندوق موسيقى معلومات الأرض",
    summary:
      "Turn NASA's visualizations of Earth into sound by creating an interactive experience that makes our changing planet accessible through both sight and hearing.",
    summaryAr:
      "حوّل البيانات والتصورات البصرية لناسا عن الأرض إلى أصوات عبر تجربة تفاعلية تجعل استكشاف كوكبنا متاحاً من خلال الرؤية والسمع معاً.",
    difficulty: ["Beginner / Youth", "Intermediate"],
    subjects: ["Arts & Multimedia", "Earth Science", "Software"],
    url: "https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/",
    accent: "#b7a1f5",
  },
]
