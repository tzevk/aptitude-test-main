'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { shuffleQuestions } from '@/utils/shuffle'
import { getCookie } from 'cookies-next'

export default function QuizPage() {
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState('')
  const [answers, setAnswers] = useState({})           // { questionIndex: chosenOption, … }
  const [timeLeft, setTimeLeft] = useState(1800)        // 30 minutes = 1800s
  const [warningGiven, setWarningGiven] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [tabSwitchDetected, setTabSwitchDetected] = useState(false)
  const [copyAttempts, setCopyAttempts] = useState(0)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const router = useRouter()
  const timerRef = useRef(null)

  // 1. Fetch and shuffle exactly 50 questions on mount
useEffect(() => {
  async function fetchQs() {
    try {
      // Read branch cookie set during signup
      const branch = getCookie('branch')?.trim() || ''

      // Build the URL     /api/questions?branch=Chemical
      const url = branch
        ? `/api/questions?branch=${encodeURIComponent(branch)}`
        : '/api/questions'

      const res  = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      // Server returns every match; shuffle + slice here (keeps your old logic)
      setQuestions(shuffleQuestions(data).slice(0, 50))

      console.log(`🌐 fetched ${data.length} docs for branch "${branch}"`)
    } catch (err) {
      console.error('Failed to load questions:', err)
    }
  }
  fetchQs()
}, [])

  // 2. Start countdown once questions are loaded (and not yet submitted)
  useEffect(() => {
    if (!questions.length || isSubmitted) return

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          handleSubmit()
          return 0
        }
        return t - 1
      })
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [questions, isSubmitted])

  // 3. Debug‐log answers whenever they change
  useEffect(() => {
    console.log('📋 Answers so far:', answers)
  }, [answers])

  // 4. Prevent multiple submits: all logic in handleSubmit()
  const handleSubmit = async () => {
    if (isSubmitted) return
    setIsSubmitted(true)
    clearInterval(timerRef.current)

    // Calculate how many are correct
    const correctCount = Object.entries(answers).filter(
      ([idx, ans]) => questions[+idx]?.answer === ans
    ).length

    const attemptedCount = Object.keys(answers).length
    const email = getCookie('email') || ''

    const payload = {
      email,
      score: correctCount,
      attempts: attemptedCount,
      tabSwitch: tabSwitchDetected,
      copyAttempts,
      timestamp: new Date().toISOString()
    }

    console.log('⏺ Sending to /api/results:', payload)

    try {
      await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    } catch (err) {
      console.error('❌ Error posting results:', err)
    }

    router.replace(`/result?score=${correctCount}&attempts=${attemptedCount}`)
  }

  // 5. Restore selectedOption when currentIndex or answers change
  useEffect(() => {
    setSelectedOption(answers[currentIndex] || '')
  }, [currentIndex, answers])

  // 6. Tab‐switch detection: one warning, then auto‐submit
  useEffect(() => {
    if (isSubmitted) return

    const handleVisibilityChange = () => {
      if (!document.hidden) return
      if (!warningGiven) {
        setWarningGiven(true)
        setShowModal(true)
      } else {
        setTabSwitchDetected(true)
        handleSubmit()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [warningGiven, isSubmitted])

// 7. Block copy/paste/contextmenu and count copyAttempts
useEffect(() => {
  if (isSubmitted) return

  const inc = () => setCopyAttempts(c => c + 1)

  const blockKeys = (e) => {
    if (
      (e.ctrlKey || e.metaKey) &&
      ['c', 'v', 'x', 'u'].includes(e.key.toLowerCase())
    ) {
      e.preventDefault()
      inc()
    }
  }

  const blockCtx = (e) => { e.preventDefault(); inc() }

// mobile / generic:
 const blockClipboard = (e) => { e.preventDefault(); inc() }
 const blockSelect    = (e) => { e.preventDefault(); inc() }

  document.addEventListener('keydown',       blockKeys)
  document.addEventListener('contextmenu',   blockCtx)
  document.addEventListener('copy',          blockClipboard)
  document.addEventListener('cut',           blockClipboard)
  document.addEventListener('paste',         blockClipboard)
  document.addEventListener('selectstart',   blockSelect)

  return () => {
    document.removeEventListener('keydown',       blockKeys)
    document.removeEventListener('contextmenu',   blockCtx)
   document.removeEventListener('copy',          blockClipboard)
   document.removeEventListener('cut',           blockClipboard)
   document.removeEventListener('paste',         blockClipboard)
   document.removeEventListener('selectstart',   blockSelect)
  }
}, [isSubmitted])

  // 8. Show a loading screen while questions are fetching
  if (!questions.length) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#64126D] text-white">
        Loading…
      </div>
    )
  }

  // 9. Compute UI values
  const current = questions[currentIndex]
  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const seconds = String(timeLeft % 60).padStart(2, '0')
  const progWidth = `${((1800 - timeLeft) / 1800) * 100}%`

  return (
      <div className="quiz-root min-h-screen flex items-center justify-center bg-[#64126D] p-4 sm:p-8">
      {/* Warning Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-[90%] max-w-sm bg-white rounded-2xl p-6 text-center">
            <h2 className="text-xl font-semibold mb-2 text-gray-700">⚠️ Warning</h2>
            <p className="text-sm text-gray-700 mb-4">
              Tab switch detected — one more will end your quiz.
            </p>
            <button
              onClick={() => setShowModal(false)}
              className="inline-flex justify-center rounded-full bg-[#86288F] px-5 py-2 text-white"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Quiz Card */}
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl p-6 sm:p-8 select-none">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src="/accent.png" alt="Logo" className="h-12 sm:h-16 w-auto" />
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <span className="font-medium text-gray-700 text-center sm:text-left">
            Question {currentIndex + 1} / {questions.length}
          </span>
          <span className="font-mono text-red-600 text-center sm:text-right">
            {minutes}:{seconds}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 rounded-full bg-gray-200 mb-6 overflow-hidden">
          <div
            className="h-full bg-red-500 transition-[width] duration-200"
            style={{ width: progWidth }}
          />
        </div>

        {/* Question Text */}
        <h2 className="text-lg sm:text-2xl font-semibold text-gray-800 mb-6 leading-snug">
          {current.question}
        </h2>

        {/* Options Grid */}
        <div className="grid gap-4 mb-6 grid-cols-1 sm:grid-cols-2 text-gray-800">
          {current.options.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                setSelectedOption(opt)
                setAnswers((prev) => ({ ...prev, [currentIndex]: opt }))
              }}
              className={`
                rounded-lg border p-4 text-left transition
                ${selectedOption === opt
                  ? 'bg-[#64126D] text-white'
                  : 'bg-white hover:bg-gray-50'}
              `}
            >
              {opt}
            </button>
          ))}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <button
            onClick={() => {
              if (currentIndex === 0) return
              setCurrentIndex((i) => i - 1)
            }}
            disabled={currentIndex === 0}
            className="rounded-lg px-6 py-2 bg-gray-900 text-white disabled:opacity-50"
          >
            Previous
          </button>

          <button
            onClick={() => {
              if (currentIndex + 1 < questions.length) {
                setCurrentIndex((i) => i + 1)
              } else {
                handleSubmit()
              }
            }}
            className="rounded-lg px-6 py-2 bg-green-600 text-white"
          >
            {currentIndex + 1 < questions.length ? 'Next' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}