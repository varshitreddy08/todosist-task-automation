import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { flashcard_decks, flashcards } from '@/db/schema'
import { eq, and, lte, desc } from 'drizzle-orm'
import { format } from 'date-fns'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const deckId = url.searchParams.get('deckId')
  const review = url.searchParams.get('review')
  const today = format(new Date(), 'yyyy-MM-dd')

  if (review === '1' && deckId) {
    const cards = await db.select().from(flashcards)
      .where(and(eq(flashcards.user_id, session.user.id), eq(flashcards.deck_id, deckId), lte(flashcards.due_date, today)))
    return NextResponse.json(cards)
  }

  if (deckId) {
    const cards = await db.select().from(flashcards)
      .where(and(eq(flashcards.user_id, session.user.id), eq(flashcards.deck_id, deckId)))
    return NextResponse.json(cards)
  }

  const decks = await db.select().from(flashcard_decks)
    .where(eq(flashcard_decks.user_id, session.user.id))
    .orderBy(desc(flashcard_decks.created_at))

  return NextResponse.json(decks)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const today = format(new Date(), 'yyyy-MM-dd')

  if (body.type === 'deck') {
    const [row] = await db.insert(flashcard_decks).values({
      user_id: session.user.id,
      name: body.name,
      subject: body.subject,
    }).returning()
    return NextResponse.json(row)
  }

  // Create card
  const [row] = await db.insert(flashcards).values({
    deck_id: body.deck_id,
    user_id: session.user.id,
    front: body.front,
    back: body.back,
    due_date: today,
  }).returning()
  return NextResponse.json(row)
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, rating } = await req.json() // rating: 1=again, 2=hard, 3=good, 4=easy

  const [card] = await db.select().from(flashcards)
    .where(and(eq(flashcards.id, id), eq(flashcards.user_id, session.user.id)))

  if (!card) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let easeFactor = card.ease_factor
  let interval = card.interval_days

  if (rating === 1) { interval = 1 }
  else if (rating === 2) { interval = Math.max(1, Math.round(interval * 1.2)); easeFactor = Math.max(130, easeFactor - 15) }
  else if (rating === 3) { interval = Math.round(interval * (easeFactor / 100)); }
  else { interval = Math.round(interval * (easeFactor / 100) * 1.3); easeFactor = Math.min(400, easeFactor + 15) }

  const dueDate = format(new Date(Date.now() + interval * 86400000), 'yyyy-MM-dd')

  const [updated] = await db.update(flashcards)
    .set({ interval_days: interval, ease_factor: easeFactor, due_date: dueDate })
    .where(eq(flashcards.id, id))
    .returning()

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  const type = url.searchParams.get('type') // 'deck' | 'card'

  if (type === 'deck') {
    await db.delete(flashcard_decks).where(and(eq(flashcard_decks.id, id!), eq(flashcard_decks.user_id, session.user.id)))
  } else {
    await db.delete(flashcards).where(and(eq(flashcards.id, id!), eq(flashcards.user_id, session.user.id)))
  }

  return NextResponse.json({ success: true })
}
