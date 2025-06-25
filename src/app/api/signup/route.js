import clientPromise from '@/lib/mongodb'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request) {
  try {
    const body = await request.json()
    const { name, phone, email, college, branch, cgpa, graduationyear } = body

    // basic server-side validation
    if (
      !name ||
      !phone ||
      !email ||
      !college ||
      !branch ||
      cgpa === undefined ||
      !graduationyear
    ) {
      return NextResponse.json(
        { success: false, message: 'All fields are required.' },
        { status: 400 }
      )
    }

    // enforce graduationyear only 2024 or 2025
    if (!['2024', '2025'].includes(String(graduationyear))) {
      return NextResponse.json(
        { success: false, message: 'Graduation year must be 2024 or 2025.' },
        { status: 400 }
      )
    }

    // optional: enforce CGPA range 0–10
    const cgpaNum = parseFloat(cgpa)
    if (isNaN(cgpaNum) || cgpaNum < 0 || cgpaNum > 10) {
      return NextResponse.json(
        { success: false, message: 'CGPA must be between 0 and 10.' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db('APTITUDE')
    const users = db.collection('users')

    // check duplicate
    const exists = await users.findOne({ email })
    if (exists) {
      return NextResponse.json(
        { success: false, message: 'User already exists' },
        { status: 409 }
      )
    }

    // insert new user
    await users.insertOne({
      name,
      phone,
      email,
      college,
      branch,
      cgpa: cgpaNum,
      graduationyear
    })

    // set cookies for session & user details
    const cookieStore = cookies()
    cookieStore.set({ name: 'email',           value: email,                     path: '/' })
    cookieStore.set({ name: 'name',            value: name,                      path: '/' })
    cookieStore.set({ name: 'phone',           value: phone,                     path: '/' })
    cookieStore.set({ name: 'college',         value: college,                   path: '/' })
    cookieStore.set({ name: 'branch',          value: branch,                    path: '/' })
    cookieStore.set({ name: 'cgpa',            value: String(cgpaNum),           path: '/' })
    cookieStore.set({ name: 'graduationyear',  value: String(graduationyear),    path: '/' })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[/api/signup] error:', err)
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    )
  }
}