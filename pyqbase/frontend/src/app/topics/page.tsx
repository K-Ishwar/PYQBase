import { redirect } from 'next/navigation'

export default function TopicsPage() {
  // Topics are nested under subjects, so we redirect the top-level /topics to /subjects
  redirect('/subjects')
}
