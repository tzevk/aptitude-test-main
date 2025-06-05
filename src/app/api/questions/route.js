// src/app/api/questions/route.js
import clientPromise from '@/lib/mongodb'
import { NextResponse } from 'next/server'

export async function GET(req) {
  const url = new URL(req.url)
  const branch = url.searchParams.get('branch')

  try {
    const client = await clientPromise
    const db = client.db('APTITUDE')
    const collection = db.collection('questions')

    const filter = branch ? { branch } : {}
    const questions = await collection.find(filter).toArray()

    // Remove _id from response
    const cleanQuestions = questions.map((doc) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, ...rest } = doc
      return rest
    })

    return NextResponse.json(cleanQuestions)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}