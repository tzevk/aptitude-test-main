// app/api/results/route.js
import clientPromise from '@/lib/mongodb'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const body = await req.json()
    console.log('🎯 /api/results got body:', body)

    const { email, score, attempts, timestamp, tabSwitch, copyAttempts } = body

    // If email is missing, return 400
    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db('APTITUDE')
    const users = db.collection('users')
    const results = db.collection('results')

    // Lookup user info by email
    const user = await users.findOne({ email })
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    const { name, phone, branch, college } = user

    await results.insertOne({
      name,
      email,
      phone,
      college,
      branch,
      score,
      attempts,
      timestamp,
      tabSwitch: !!tabSwitch,           // convert to boolean
      copyAttempts: copyAttempts || 0   // default to 0
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ /api/results error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}