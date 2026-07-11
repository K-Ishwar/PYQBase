import { QuestionEditorForm } from '../QuestionEditorForm'

interface Props {
  params: { id: string }
}

export default function QuestionEditorPage({ params }: Props) {
  const isNew = params.id === 'new'
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          {isNew ? 'New Question' : `Edit Question`}
        </h1>
        <p className="mt-1 text-muted-foreground font-mono text-xs">
          {isNew ? 'A new UUID will be assigned on save' : params.id}
        </p>
      </div>
      <QuestionEditorForm questionId={isNew ? undefined : params.id} />
    </div>
  )
}
