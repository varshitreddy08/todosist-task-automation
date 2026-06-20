import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left - Branding */}
      <div className="hidden lg:flex flex-col gradient-primary p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-white rounded-full blur-3xl" />
        </div>
        <Link href="/" className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold">TaskFlow</span>
        </Link>
        <div className="flex-1 flex flex-col justify-center relative z-10">
          <h1 className="text-4xl font-bold mb-4 leading-tight">
            Manage tasks smarter<br />with AI assistance
          </h1>
          <p className="text-white/80 text-lg mb-12 leading-relaxed">
            Join 50,000+ professionals who use TaskFlow to stay organized, meet deadlines, and achieve their goals.
          </p>
          <div className="space-y-4">
            {[
              'AI-powered natural language task creation',
              'Smart calendar with Google Calendar sync',
              'Team collaboration and shared workspaces',
              'Daily summaries and productivity analytics',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-white/90 text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 text-white/60 text-sm">
          © 2025 TaskFlow. All rights reserved.
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gradient">TaskFlow</span>
            </Link>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
