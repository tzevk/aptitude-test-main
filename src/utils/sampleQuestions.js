
export function sampleQuestions(arr, k = 50) {
  const n = arr.length
  if (n <= k) return arr.slice()

  // initialize reservoir with first k items
  const reservoir = arr.slice(0, k)

  // for each item i ≥ k, randomly replace one in the reservoir
  for (let i = k; i < n; i++) {
    const j = Math.floor(Math.random() * (i + 1))
    if (j < k) {
      reservoir[j] = arr[i]
    }
  }

  return reservoir
}