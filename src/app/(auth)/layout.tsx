import { AuthBackground } from '@/components/auth/auth-background'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0a12] text-white">
      {/* 3D scene fills the whole page */}
      <AuthBackground />

      {/* Content grid: brand panel + form card */}
      <div className="relative z-10 grid min-h-screen w-full lg:grid-cols-2">
        {/* Brand / marketing side */}
        <section className="hidden flex-col justify-between p-10 lg:flex">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl shadow-lg shadow-orange-500/30"
              style={{ background: 'linear-gradient(135deg, #ff7a4d, #ff4d6d)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white">
                <path d="M5 12l4 4 10-10" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-xl font-semibold tracking-tight">TaskFlow</span>
          </div>

          <div data-anim="hero" className="max-w-xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs tracking-wide text-white/70 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
              A calmer way to run your day
            </p>
            <h1 className="text-balance text-5xl font-semibold leading-[1.05] tracking-tight">
              Capture everything.
              <br />
              <span className="bg-gradient-to-r from-orange-300 via-orange-400 to-rose-400 bg-clip-text text-transparent">
                Do what matters.
              </span>
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/70">
              Your inbox, calendar, and history in one clean place. Real-time syncing so nothing slips through.
            </p>

            <ul className="mt-8 grid gap-3 text-[13px] text-white/75">
              {[
                'Inbox with natural-language quick add',
                'Calendar side panel for scheduling',
                'Complete history of everything you finish',
              ].map((line) => (
                <li key={line} className="flex items-center gap-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10">
                    <svg viewBox="0 0 12 12" className="h-3 w-3 text-orange-300">
                      <path d="M2.5 6l2.5 2.5L10 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-white/40">© {new Date().getFullYear()} TaskFlow · All systems nominal</p>
        </section>

        {/* Form side */}
        <section className="flex items-center justify-center p-6 sm:p-10">
          <div
            data-anim="card"
            className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-8 shadow-[0_20px_80px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl"
          >
            {children}
          </div>
        </section>
      </div>
    </div>
  )
}
