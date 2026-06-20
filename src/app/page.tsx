'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2, Zap, Brain, Calendar, Users, BarChart3,
  ArrowRight, Star, Shield, Clock, Target, Sparkles,
  ChevronRight, Play, Mail, Bell, Repeat, Layout,
  TrendingUp, Award, BookOpen, Layers
} from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
}
const stagger = { visible: { transition: { staggerChildren: 0.1 } } }

const features = [
  { icon: Brain, title: 'AI Task Planning', desc: 'Create tasks with natural language. Our AI understands "Submit report next Friday at 5 PM" instantly.', color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/30' },
  { icon: Calendar, title: 'Smart Calendar', desc: 'Daily, weekly, and monthly views with drag-and-drop scheduling and Google Calendar sync.', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  { icon: Users, title: 'Team Collaboration', desc: 'Invite members, assign tasks, share projects, and track team activity in real time.', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  { icon: Mail, title: 'Email Automation', desc: 'Schedule reminder emails, daily summaries, and weekly productivity reports automatically.', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30' },
  { icon: BarChart3, title: 'Productivity Analytics', desc: 'Track completion rates, productivity scores, streaks, and generate detailed reports.', color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-950/30' },
  { icon: Repeat, title: 'Workflow Automation', desc: 'Build custom automations. When a task is overdue → send email. When a project completes → generate report.', color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-950/30' },
  { icon: Target, title: 'Goals & Habits', desc: 'Track long-term goals, build daily habits, monitor streaks, and stay on top of your growth.', color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950/30' },
  { icon: Clock, title: 'Time Tracking', desc: 'Built-in Pomodoro timer, time entries per task, and focus mode to maximize deep work sessions.', color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
]

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    desc: 'Perfect for individuals getting started',
    features: ['Up to 50 tasks', '2 projects', 'Basic analytics', 'Email reminders', '1 GB storage'],
    cta: 'Get Started Free',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$9',
    period: '/month',
    desc: 'Everything you need to stay productive',
    features: ['Unlimited tasks', 'Unlimited projects', 'AI features', 'Advanced analytics', 'Calendar sync', 'Workflow automation', 'Priority support', '10 GB storage'],
    cta: 'Start Pro Trial',
    highlighted: true,
  },
  {
    name: 'Team',
    price: '$24',
    period: '/month',
    desc: 'Collaborate with your entire team',
    features: ['Everything in Pro', 'Up to 20 members', 'Shared workspaces', 'Team analytics', 'Admin controls', 'SSO', 'Unlimited storage'],
    cta: 'Start Team Trial',
    highlighted: false,
  },
]

const testimonials = [
  { name: 'Sarah Chen', role: 'Product Manager at Stripe', avatar: 'SC', quote: 'TaskFlow completely transformed how I manage my team. The AI planning feature saves me at least 2 hours every week.', stars: 5 },
  { name: 'Marcus Rodriguez', role: 'PhD Student, MIT', avatar: 'MR', quote: "As a student juggling research, classes, and projects — TaskFlow's study planner and deadline tracking is a lifesaver.", stars: 5 },
  { name: 'Aisha Patel', role: 'Founder, TechStartup', avatar: 'AP', quote: 'We migrated our whole team from Notion + Todoist to TaskFlow. One platform for everything. Absolutely worth it.', stars: 5 },
  { name: 'James Liu', role: 'Software Engineer', avatar: 'JL', quote: 'The natural language task creation is mind-blowing. I just type what I need done and TaskFlow figures out the rest.', stars: 5 },
  { name: 'Emma Thompson', role: 'Marketing Director', avatar: 'ET', quote: 'Weekly productivity reports keep me accountable. My completion rate went from 60% to 94% in just 3 months.', stars: 5 },
  { name: 'David Kim', role: 'Freelance Designer', avatar: 'DK', quote: "The Pomodoro timer + focus mode combo is incredible. Best deep work tool I've ever used.", stars: 5 },
]

const faqs = [
  { q: 'How does the AI task creation work?', a: 'Simply type a natural language description like "Submit quarterly report next Friday at 3 PM with high priority" and our AI (powered by Gemini) automatically extracts the title, due date, time, and priority.' },
  { q: 'Does TaskFlow integrate with Google Calendar?', a: 'Yes! TaskFlow syncs bidirectionally with Google Calendar and Outlook. Events appear in your TaskFlow calendar and TaskFlow tasks appear in your Google Calendar.' },
  { q: 'Can I invite my team?', a: 'Yes, on the Team plan you can invite up to 20 members, create shared workspaces, assign tasks, track team activity, and view team-level analytics.' },
  { q: 'Is my data secure?', a: 'Absolutely. We use Supabase with Row Level Security (RLS), all data is encrypted in transit and at rest, and we follow SOC 2 best practices.' },
  { q: 'Can I export my data?', a: 'Yes, you can export all your tasks, projects, and analytics data at any time as CSV or JSON. Your data is always yours.' },
  { q: 'Is there a mobile app?', a: 'TaskFlow is fully responsive and works beautifully on mobile browsers. Native iOS and Android apps are coming in Q3 2025.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-gradient">TaskFlow</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <Link href="#features" className="hover:text-foreground transition-colors">Features</Link>
            <Link href="#pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <Link href="#testimonials" className="hover:text-foreground transition-colors">Reviews</Link>
            <Link href="#faq" className="hover:text-foreground transition-colors">FAQ</Link>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" render={<Link href="/login">Sign in</Link>} />
            <Button
              className="gradient-primary text-white border-0"
              render={
                <Link href="/login" className="inline-flex items-center gap-1">
                  Start for free <ArrowRight className="ml-1 w-4 h-4" />
                </Link>
              }
            />
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute top-24 left-1/4 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-3xl" />
          <div className="absolute top-24 right-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-3xl" />
        </div>
        <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-4xl mx-auto">
          <motion.div variants={fadeUp}>
            <Badge className="mb-6 px-4 py-1.5 text-sm bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> AI-Powered Productivity Platform
            </Badge>
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-tight">
            Manage tasks smarter<br />
            <span className="text-gradient">with AI assistance</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            TaskFlow combines task management, AI planning, calendar scheduling, team collaboration, and productivity analytics — all in one beautiful platform.
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="gradient-primary text-white border-0 text-base px-8 h-12"
              render={
                <Link href="/login" className="inline-flex items-center gap-2">
                  Get started <ArrowRight className="w-5 h-5" />
                </Link>
              }
            />
            <Button size="lg" variant="outline" className="text-base px-8 h-12 gap-2">
              <Play className="w-4 h-4" /> Watch demo
            </Button>
          </motion.div>
          <motion.p variants={fadeUp} className="mt-6 text-sm text-muted-foreground">
            No credit card required · Free forever plan · Setup in 2 minutes
          </motion.p>
        </motion.div>

        {/* Hero dashboard mockup */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-20 max-w-6xl mx-auto"
        >
          <div className="relative rounded-2xl border shadow-2xl overflow-hidden bg-card">
            <div className="bg-muted/50 border-b px-4 py-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <div className="ml-4 flex-1 bg-background/60 rounded-md px-3 py-1 text-xs text-muted-foreground text-left">app.taskflow.io/dashboard</div>
            </div>
            <div className="grid grid-cols-12 min-h-[420px]">
              {/* Sidebar */}
              <div className="col-span-2 border-r bg-sidebar p-3 flex flex-col gap-1">
                <div className="p-2 rounded-lg bg-primary/10 flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-primary">TaskFlow</span>
                </div>
                {['Dashboard', 'Today', 'Upcoming', 'Projects', 'Calendar', 'Analytics'].map((item, i) => (
                  <div key={item} className={`px-2 py-1.5 rounded-md text-xs flex items-center gap-2 ${i === 0 ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-accent'}`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                    {item}
                  </div>
                ))}
                <div className="mt-auto border-t pt-2">
                  <div className="text-xs text-muted-foreground px-2">Projects</div>
                  {['Design Sprint', 'Q4 Planning', 'Research'].map(p => (
                    <div key={p} className="px-2 py-1 text-xs text-muted-foreground flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-sm bg-primary/40" />
                      {p}
                    </div>
                  ))}
                </div>
              </div>
              {/* Main */}
              <div className="col-span-7 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold">Good morning, Alex! 👋</h3>
                    <p className="text-xs text-muted-foreground">You have 8 tasks due today</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-md font-medium">+ Add Task</div>
                  </div>
                </div>
                {/* Task list */}
                <div className="space-y-2">
                  {[
                    { title: 'Review design mockups', priority: 'P1', done: true, project: 'Design Sprint' },
                    { title: 'Write project proposal', priority: 'P1', done: false, project: 'Q4 Planning' },
                    { title: 'Team standup meeting', priority: 'P2', done: false, project: 'Design Sprint' },
                    { title: 'Update API documentation', priority: 'P2', done: false, project: 'Research' },
                    { title: 'Review pull requests', priority: 'P3', done: false, project: 'Research' },
                  ].map((task, i) => (
                    <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg border text-xs ${task.done ? 'opacity-50 bg-muted/30' : 'bg-card hover:bg-accent/30'}`}>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${task.done ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
                        {task.done && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`flex-1 ${task.done ? 'line-through text-muted-foreground' : ''}`}>{task.title}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${task.priority === 'P1' ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400' : task.priority === 'P2' ? 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400'}`}>{task.priority}</span>
                      <span className="text-muted-foreground/60 text-[10px]">{task.project}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Right panel */}
              <div className="col-span-3 border-l p-4 flex flex-col gap-3">
                <div className="bg-primary/5 rounded-lg p-3">
                  <div className="text-xs font-medium mb-2 flex items-center gap-1.5"><Brain className="w-3.5 h-3.5 text-primary" /> AI Insights</div>
                  <p className="text-[11px] text-muted-foreground">Peak productivity 9–11am. Schedule deep work tasks during this window.</p>
                </div>
                <div className="bg-card rounded-lg border p-3">
                  <div className="text-xs font-medium mb-2">Today's Progress</div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: '40%' }} />
                    </div>
                    <span className="text-xs text-muted-foreground">2/5</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">40% complete</p>
                </div>
                <div className="bg-card rounded-lg border p-3">
                  <div className="text-xs font-medium mb-2 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> This Week</div>
                  <div className="flex items-end gap-1 h-12">
                    {[30, 60, 45, 80, 70, 90, 40].map((h, i) => (
                      <div key={i} className="flex-1 bg-primary/20 rounded-sm" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                  <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                    <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="py-16 border-y bg-muted/20">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { num: '50K+', label: 'Active Users' },
              { num: '2M+', label: 'Tasks Completed' },
              { num: '98%', label: 'Satisfaction Rate' },
              { num: '4.9/5', label: 'Average Rating' },
            ].map((stat) => (
              <motion.div key={stat.label} variants={fadeUp}>
                <div className="text-4xl font-bold text-gradient mb-2">{stat.num}</div>
                <div className="text-muted-foreground text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.div variants={fadeUp}><Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Features</Badge></motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl font-bold mb-4">Everything you need to be productive</motion.h2>
            <motion.p variants={fadeUp} className="text-xl text-muted-foreground max-w-2xl mx-auto">From AI-powered planning to team collaboration — TaskFlow has every tool you need in one place.</motion.p>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <motion.div key={f.title} variants={fadeUp} className="rounded-2xl border p-6 hover:shadow-lg transition-all hover:-translate-y-1 bg-card group">
                <div className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <f.icon className={`w-6 h-6 ${f.color}`} />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* AI Feature Highlight */}
      <section className="py-24 px-4 bg-muted/20">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp}><Badge className="mb-4 bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-violet-200 dark:border-violet-800">AI-Powered</Badge></motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl font-bold mb-6">Let AI do the<br /><span className="text-gradient">heavy planning</span></motion.h2>
            <motion.div variants={stagger} className="space-y-4">
              {[
                { icon: Brain, title: 'Natural Language Input', desc: 'Type "Prepare slides for Monday meeting at 2pm" and TaskFlow creates the task with correct date, time, and priority.' },
                { icon: Sparkles, title: 'AI Daily Planner', desc: 'Get a personalized optimal schedule for your day based on priorities, deadlines, and your productivity patterns.' },
                { icon: TrendingUp, title: 'Smart Prioritization', desc: 'AI analyzes your workload and suggests which tasks to tackle first to maximize output and minimize stress.' },
                { icon: BarChart3, title: 'Productivity Insights', desc: 'Receive weekly AI-generated insights about your patterns, strengths, and areas for improvement.' },
              ].map((item) => (
                <motion.div key={item.title} variants={fadeUp} className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="relative">
            <div className="rounded-2xl border bg-card shadow-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-semibold">AI Task Creator</div>
                  <div className="text-xs text-muted-foreground">Natural language input</div>
                </div>
              </div>
              <div className="bg-muted/50 rounded-xl p-4 mb-4 border">
                <div className="text-sm text-muted-foreground mb-1">You typed:</div>
                <div className="text-sm font-medium">"Submit quarterly report next Friday at 5 PM, high priority"</div>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 h-0.5 bg-border" />
                <div className="text-xs text-muted-foreground flex items-center gap-1"><Sparkles className="w-3 h-3 text-primary" /> AI parsed</div>
                <div className="flex-1 h-0.5 bg-border" />
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Title', value: 'Submit quarterly report', color: 'text-foreground' },
                  { label: 'Due Date', value: 'Friday, Jan 31', color: 'text-blue-600 dark:text-blue-400' },
                  { label: 'Due Time', value: '5:00 PM', color: 'text-blue-600 dark:text-blue-400' },
                  { label: 'Priority', value: 'P1 — Urgent', color: 'text-red-600 dark:text-red-400' },
                ].map((field) => (
                  <div key={field.label} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="text-xs text-muted-foreground">{field.label}</span>
                    <span className={`text-sm font-medium ${field.color}`}>{field.value}</span>
                  </div>
                ))}
              </div>
              <Button className="w-full mt-4 gradient-primary text-white border-0" size="sm">Create Task</Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.div variants={fadeUp}><Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Testimonials</Badge></motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl font-bold mb-4">Loved by thousands</motion.h2>
            <motion.p variants={fadeUp} className="text-xl text-muted-foreground">See what our users say about TaskFlow</motion.p>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <motion.div key={t.name} variants={fadeUp} className="rounded-2xl border p-6 bg-card hover:shadow-lg transition-all hover:-translate-y-1">
                <div className="flex gap-0.5 mb-4">
                  {Array(t.stars).fill(0).map((_, i) => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold">{t.avatar}</div>
                  <div>
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4 bg-muted/20">
        <div className="max-w-7xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.div variants={fadeUp}><Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Pricing</Badge></motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl font-bold mb-4">Simple, transparent pricing</motion.h2>
            <motion.p variants={fadeUp} className="text-xl text-muted-foreground">Start free, upgrade when you need more</motion.p>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <motion.div key={plan.name} variants={fadeUp} className={`rounded-2xl p-8 ${plan.highlighted ? 'gradient-primary text-white shadow-2xl scale-105 border-0' : 'border bg-card'} relative`}>
                {plan.highlighted && <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-xs font-bold px-4 py-1 rounded-full">Most Popular</div>}
                <div className={`text-sm font-medium mb-2 ${plan.highlighted ? 'text-white/80' : 'text-muted-foreground'}`}>{plan.name}</div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className={`text-sm ${plan.highlighted ? 'text-white/70' : 'text-muted-foreground'}`}>{plan.period}</span>
                </div>
                <p className={`text-sm mb-6 ${plan.highlighted ? 'text-white/80' : 'text-muted-foreground'}`}>{plan.desc}</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${plan.highlighted ? 'text-white/80' : 'text-primary'}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full ${plan.highlighted ? 'bg-white text-primary hover:bg-white/90 border-0' : 'gradient-primary text-white border-0'}`}
                  render={<Link href="/login">{plan.cta}</Link>}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.div variants={fadeUp}><Badge className="mb-4 bg-primary/10 text-primary border-primary/20">FAQ</Badge></motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl font-bold mb-4">Frequently asked questions</motion.h2>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="space-y-4">
            {faqs.map((faq, i) => (
              <motion.div key={i} variants={fadeUp} className="rounded-xl border bg-card p-6">
                <h3 className="font-semibold mb-3 flex items-start gap-2">
                  <ChevronRight className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  {faq.q}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed pl-7">{faq.a}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-4xl mx-auto text-center">
          <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl font-bold mb-6">
            Ready to be more productive?
          </motion.h2>
          <motion.p variants={fadeUp} className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Join 50,000+ users who use TaskFlow to manage their tasks, hit deadlines, and achieve their goals.
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="gradient-primary text-white border-0 text-base px-10 h-12"
              render={
                <Link href="/login" className="inline-flex items-center gap-2">
                  Get started — sign in or create account <ArrowRight className="w-5 h-5" />
                </Link>
              }
            />
          </motion.div>
          <motion.div variants={fadeUp} className="mt-12 flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> SOC 2 Compliant</div>
            <div className="flex items-center gap-2"><Award className="w-4 h-4 text-primary" /> 4.9/5 Rating</div>
            <div className="flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> 50K+ Users</div>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t py-16 px-4 bg-muted/20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl text-gradient">TaskFlow</span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">The AI-powered productivity platform for students, professionals, and teams.</p>
            </div>
            {[
              { title: 'Product', links: ['Features', 'Pricing', 'Changelog', 'Roadmap'] },
              { title: 'Company', links: ['About', 'Blog', 'Careers', 'Press'] },
              { title: 'Support', links: ['Documentation', 'Help Center', 'Status', 'Contact'] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="font-semibold mb-4 text-sm">{col.title}</h4>
                <ul className="space-y-3">
                  {col.links.map((link) => (
                    <li key={link}><Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{link}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div>© 2025 TaskFlow. All rights reserved.</div>
            <div className="flex items-center gap-6">
              <Link href="#" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Terms of Service</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Cookie Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
