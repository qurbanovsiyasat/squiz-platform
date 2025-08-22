import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

export default function ForumPostPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Forum Yazısı #{id}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Forum yazısı səhifəsi - inkişaf mərhələsindədir</p>
        </CardContent>
      </Card>
    </div>
  )
}