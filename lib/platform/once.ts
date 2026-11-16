/**
 * Run an async initializer at most once per process.
 * On failure the latch resets so the next call retries.
 */
export function oncePerProcess(run: () => Promise<void>): () => Promise<void> {
  let pending: Promise<void> | null = null
  return () => {
    if (!pending) {
      pending = run().catch((err) => {
        pending = null
        throw err
      })
    }
    return pending
  }
}
