/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/api/questions/route.js
import clientPromise    from '@/lib/mongodb'
import { NextResponse } from 'next/server'

export async function GET(req) {
  const url    = new URL(req.url)
  const branch = url.searchParams.get('branch')?.trim()     // e.g. "Chemical"
  const count  = 50                                         // hard-coded 50

  if (!branch) {
    return NextResponse.json(
      { error: 'Branch query parameter is required.' },
      { status: 400 }
    )
  }

  try {
    const client = await clientPromise
    const db     = client.db('APTITUDE')
    const col    = db.collection('questions')

    /* SAME ROUTE – just use aggregation instead of find+client shuffle */
    const docs = await col
      .aggregate([
        { $match: { branch } },          // filter branch
        { $sample: { size: count } }     // random 50 on the server
      ])
      .toArray()

    if (!docs.length) {
      return NextResponse.json(
        { error: 'No questions found for this branch.' },
        { status: 404 }
      )
    }

    /* shuffle options array of each question */
    const shuffled = docs.map(({ _id: _, options, ...rest }) => {
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[options[i], options[j]] = [options[j], options[i]]
      }
      return { ...rest, options }
    })

    return NextResponse.json(shuffled)          // identical response shape
  } catch (err) {
    console.error('❌ /api/questions error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch questions.' },
      { status: 500 }
    )
  }
}