import { SearchBar } from "@/components/ui/SearchBar"
import { ExamCard } from "@/components/ui/ExamCard"
import { Shield, BookOpen, GraduationCap, Landmark, BookCopy, Globe, ArrowRight, Lightbulb, Leaf, Component } from "lucide-react"
import Link from "next/link"
import { DailyRevisionCard } from "@/components/ui/DailyRevisionCard"

export default function Home() {
  return (
    <div className="container py-16 md:py-24 max-w-6xl mx-auto space-y-24">
      {/* Hero Section */}
      <section className="flex flex-col items-center text-center space-y-8">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
          Every <span className="text-primary">PYQ</span>.<br className="hidden md:block" />
          Every Topic. One <span className="text-primary">Base</span>.
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
          Topic-wise Previous Year Questions for UPSC CSE, UPSC CAPF, MPSC Rajyseva & more.
        </p>
        
        <div className="w-full flex justify-center pt-4">
          <SearchBar />
        </div>
      </section>

      {/* SRS Daily Revision Section */}
      <section>
        <DailyRevisionCard />
      </section>

      {/* Choose Your Exam Section */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Choose Your Exam</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <ExamCard 
            title="UPSC CSE" 
            description="Union Public Service Commission" 
            icon={<Landmark className="h-8 w-8" />}
            href="/exams/upsc-cse" 
          />
          <ExamCard 
            title="UPSC CAPF" 
            description="Central Armed Police Forces" 
            icon={<ShieldCheck className="h-6 w-6 text-green-600" />} 
            href="/search?exam=UPSC CAPF"
          />
          <ExamCard 
            title="MPSC Rajyseva" 
            description="Maharashtra State Services" 
            icon={<Briefcase className="h-6 w-6 text-orange-600" />} 
            href="/search?exam=MPSC Rajyseva"
          />
          <ExamCard 
            title="UPSC CDS" 
            description="Combined Defence Services" 
            icon={<Compass className="h-6 w-6 text-red-600" />} 
            href="/search?exam=UPSC CDS"
          />
        </div>
      </section>

      {/* Browse by Subject Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Browse by Subject</h2>
          <Link href="/subjects" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <SubjectPill icon={<Landmark className="h-4 w-4" />} name="Polity" />
          <SubjectPill icon={<BookCopy className="h-4 w-4" />} name="History" />
          <SubjectPill icon={<Globe className="h-4 w-4" />} name="Geography" />
          <SubjectPill icon={<Component className="h-4 w-4" />} name="Economy" />
          <SubjectPill icon={<Leaf className="h-4 w-4" />} name="Environment" />
          <SubjectPill icon={<Lightbulb className="h-4 w-4" />} name="Science & Tech" />
          <SubjectPill icon={<BookOpen className="h-4 w-4" />} name="Art & Culture" />
        </div>
      </section>
    </div>
  );
}

function SubjectPill({ icon, name }: { icon: React.ReactNode; name: string }) {
  return (
    <Link 
      href={`/subjects/${name.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
      className="flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-medium hover:border-primary/50 hover:bg-primary/5 transition-colors"
    >
      <span className="text-primary">{icon}</span>
      {name}
    </Link>
  )
}
