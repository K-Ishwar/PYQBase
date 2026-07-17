import Link from "next/link"
import { notFound } from "next/navigation"
import { Target, Landmark, ShieldCheck, Briefcase, Compass, BookOpen, CheckCircle, Clock } from "lucide-react"
import { MagneticButton } from "@/components/ui/MagneticButton"

const EXAM_INFO = {
  "upsc-cse": {
    name: "UPSC Civil Services",
    id: "UPSC CSE",
    description: "The Civil Services Examination (CSE) is a nationwide competitive examination in India conducted by the Union Public Service Commission for recruitment to higher Civil Services of the Government of India, including the Indian Administrative Service, Indian Foreign Service, and Indian Police Service.",
    icon: <Landmark className="w-12 h-12 text-primary" />,
    overview: {
      frequency: "Once a year",
      mode: "Offline (Pen & Paper)",
      stages: "3 Stages (Prelims, Mains, Interview)"
    },
    pattern: [
      { stage: "Phase I: Preliminary Exam", details: "Two objective-type papers (General Studies I and CSAT), 200 marks each. CSAT is qualifying (33%)." },
      { stage: "Phase II: Main Exam", details: "Nine descriptive papers. Two qualifying language papers, one Essay paper, four General Studies papers, and two Optional papers." },
      { stage: "Phase III: Interview", details: "Personality Test carrying 275 marks." }
    ],
    eligibility: [
      "Nationality: Must be a citizen of India for IAS, IPS, and IFS.",
      "Education: Must hold a bachelor's degree from a recognized university or possess an equivalent qualification.",
      "Age Limit: Minimum 21 years and maximum 32 years (General). Relaxable up to 35 years for OBC and 37 years for SC/ST.",
      "Number of Attempts: 6 attempts for General, 9 for OBC, and unlimited for SC/ST candidates up to the age limit.",
      "Physical Standards: Candidates must be physically fit according to physical standards for admission to Civil Services Examination."
    ]
  },
  "upsc-capf": {
    name: "UPSC CAPF (AC)",
    id: "UPSC CAPF",
    description: "The Central Armed Police Forces (Assistant Commandants) Examination is conducted by UPSC for recruitment of Assistant Commandants in the Border Security Force (BSF), Central Reserve Police Force (CRPF), Central Industrial Security Force (CISF), Indo-Tibetan Border Police (ITBP), and Sashastra Seema Bal (SSB).",
    icon: <ShieldCheck className="w-12 h-12 text-green-500" />,
    overview: {
      frequency: "Once a year",
      mode: "Offline (Pen & Paper)",
      stages: "3 Stages (Written, Physical, Interview)"
    },
    pattern: [
      { stage: "Paper I: General Ability & Intelligence", details: "Objective (MCQ) format, 250 marks. Covers General Mental Ability, General Science, Current Events, Indian Polity and Economy, History of India, and Indian and World Geography." },
      { stage: "Paper II: General Studies, Essay & Comprehension", details: "Descriptive format, 200 marks. Candidates have the option of writing the Essay Component in English or Hindi, but the medium of Precis Writing, Comprehension Components and other communications/ language skills will be English only." },
      { stage: "Physical & Medical Test", details: "Includes 100m race, 800m race, Long Jump, and Shot Put. Qualifying in nature." },
      { stage: "Interview/Personality Test", details: "Carries 150 marks. Conducted by the UPSC board." }
    ],
    eligibility: [
      "Nationality: Must be a citizen of India.",
      "Gender: Both Male and Female candidates are eligible for appointment to the post of Assistant Commandants.",
      "Education: Must hold a bachelor's degree from a recognized university.",
      "Age Limit: Minimum 20 years and maximum 25 years. Relaxations: up to 5 years for SC/ST, and up to 3 years for OBC.",
      "Physical Standards: Must meet stringent physical and medical standards prescribed in the official notification (e.g., minimum height: Men 165cm, Women 157cm)."
    ]
  },
  "mpsc-rajyseva": {
    name: "MPSC Rajyaseva",
    id: "MPSC Rajyseva",
    description: "The Maharashtra Public Service Commission (MPSC) State Services Examination is conducted for recruitment to various Group A and Group B posts in the Maharashtra State Government administration, such as Deputy Collector, DSP, and Tehsildar.",
    icon: <Briefcase className="w-12 h-12 text-orange-500" />,
    overview: {
      frequency: "Once a year",
      mode: "Offline (Pen & Paper)",
      stages: "3 Stages (Prelims, Mains, Interview)"
    },
    pattern: [
      { stage: "Preliminary Exam", details: "Two objective-type papers (GS and CSAT) of 200 marks each. CSAT is qualifying (33%)." },
      { stage: "Main Exam", details: "Descriptive format (recently updated to mirror UPSC pattern). Consists of 9 papers including language papers, Essay, four General Studies papers, and two Optional papers. Total 1750 marks." },
      { stage: "Interview", details: "Personality Test carrying 275 marks." }
    ],
    eligibility: [
      "Nationality & Domicile: Must be an Indian Citizen. While non-domiciles can apply, preference and reservations are strictly for Maharashtra domiciles.",
      "Language: Knowledge of Marathi is mandatory (must read, write, and speak).",
      "Education: Must have a bachelor's degree from a recognized university. Final year students can apply for Prelims.",
      "Age Limit: Minimum 19 years and maximum 38 years (Open category). Relaxable up to 43 years for reserved categories.",
      "Attempts: 6 attempts for Open category, 9 for OBC/remaining backward classes, and unlimited for SC/ST."
    ]
  },
  "upsc-cds": {
    name: "UPSC CDS",
    id: "UPSC CDS",
    description: "The Combined Defence Services (CDS) Examination is conducted by UPSC twice a year for recruitment into the Indian Military Academy (IMA), Officers Training Academy (OTA), Indian Naval Academy (INA), and Indian Air Force Academy (AFA).",
    icon: <Compass className="w-12 h-12 text-red-500" />,
    overview: {
      frequency: "Twice a year",
      mode: "Offline (Pen & Paper)",
      stages: "2 Stages (Written, SSB Interview)"
    },
    pattern: [
      { stage: "Written Exam (IMA, INA, AFA)", details: "Three objective papers: English, General Knowledge, and Elementary Mathematics (100 marks each, 2 hours each)." },
      { stage: "Written Exam (OTA)", details: "Two objective papers: English and General Knowledge (100 marks each, 2 hours each)." },
      { stage: "SSB Interview", details: "Intelligence and Personality Test, spanning 5 days. Includes Psychological Tests, Group Testing Officer Tasks (GTO), and Personal Interview." },
      { stage: "Medical Examination", details: "Rigorous medical check-up post-SSB recommendation." }
    ],
    eligibility: [
      "Nationality: Must be an unmarried Indian citizen.",
      "Education (IMA/OTA): Degree of a recognized University or equivalent.",
      "Education (INA): Degree in Engineering from a recognized University/Institution.",
      "Education (AFA): Degree of a recognized University (with Physics and Mathematics at 10+2 level) or Bachelor of Engineering.",
      "Age Limit: Varies by academy. Generally 19 to 24 years (IMA), 19 to 24 years (INA), 20 to 24 years (AFA), and 19 to 25 years (OTA).",
      "Marital Status: Candidates must be unmarried (except for certain OTA categories)."
    ]
  }
}

export default function ExamInfoPage({ params }: { params: { examId: string } }) {
  const exam = EXAM_INFO[params.examId as keyof typeof EXAM_INFO]

  if (!exam) {
    notFound()
  }

  return (
    <div className="container py-10 max-w-5xl mx-auto space-y-16">
      {/* Hero Section */}
      <section className="relative rounded-3xl overflow-hidden glass p-10 md:p-16 flex flex-col md:flex-row items-center gap-10 border border-primary/10">
        <div className="absolute inset-0 mesh-bg opacity-20 z-0"></div>
        <div className="z-10 bg-card/80 p-8 rounded-3xl shadow-xl border border-black/5 dark:border-white/5 backdrop-blur-md">
          {exam.icon}
        </div>
        <div className="z-10 flex-1 text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">{exam.name}</h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl leading-relaxed">
            {exam.description}
          </p>
          
          <div className="flex flex-wrap gap-4 justify-center md:justify-start">
            <MagneticButton className="rounded-xl shadow-md shadow-primary/20 hover:shadow-lg transition-shadow bg-primary">
              <Link href={`/exams/${params.examId}/practice`} className="px-8 py-4 flex items-center gap-3 text-base font-bold text-primary-foreground hover:bg-primary-dark transition-colors rounded-xl">
                <Target className="w-5 h-5" />
                Start Practicing PYQs
              </Link>
            </MagneticButton>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-12">
          {/* Exam Pattern */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b pb-4">
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <BookOpen className="w-6 h-6" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight">Exam Pattern</h2>
            </div>
            <div className="space-y-4">
              {exam.pattern.map((p, idx) => (
                <div key={idx} className="bg-card border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-xl font-bold mb-2 text-primary">{p.stage}</h3>
                  <p className="text-muted-foreground">{p.details}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Eligibility */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b pb-4">
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight">Eligibility Criteria</h2>
            </div>
            <div className="bg-card border rounded-2xl p-8 shadow-sm">
              <ul className="space-y-4">
                {exam.eligibility.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-primary" />
                    <span className="text-muted-foreground leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <section className="bg-secondary/30 rounded-3xl p-8 border border-secondary">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Quick Overview
            </h3>
            <div className="space-y-6">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Frequency</p>
                <p className="font-bold">{exam.overview.frequency}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Mode of Exam</p>
                <p className="font-bold">{exam.overview.mode}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Stages</p>
                <p className="font-bold">{exam.overview.stages}</p>
              </div>
            </div>
          </section>
          
          <div className="bg-primary/5 rounded-3xl p-8 border border-primary/10 text-center">
            <h3 className="font-bold text-lg mb-4">Ready to test your knowledge?</h3>
            <Link href={`/exams/${params.examId}/practice`} className="inline-flex w-full justify-center px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors shadow-sm">
              Access PYQ Bank
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
