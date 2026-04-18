// Next.js instrumentation hook — runs once when the Node.js server starts.
// Used to spin up background workers (kill-switch cron, health check, autonomy consumers).

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initCronJobs } = await import('@/lib/cron');
    initCronJobs();
  }
}
