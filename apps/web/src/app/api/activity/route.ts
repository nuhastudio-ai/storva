import { repository } from '../../../lib/repository'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const page = Math.max(1, Number(url.searchParams.get('page') || 1))
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || 20)))

    const [items, total] = await Promise.all([
      repository.activity.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { file: { select: { name: true, relativePath: true, isFolder: true } } },
      }),
      repository.activity.count(),
    ])

    return Response.json({ items, total, page, pageSize: limit })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { userId, action, fileId, metadata } = await req.json()
    if (!userId || !action) return Response.json({ error: 'userId and action required' }, { status: 400 })

    const activity = await repository.activity.create({
      data: { userId, action, fileId, metadata: metadata ? JSON.stringify(metadata) : null },
    })
    return Response.json({ success: true, id: activity.id }, { status: 201 })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
