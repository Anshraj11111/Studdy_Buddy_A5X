import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { courseAPI, doubtAPI, communityAPI, mentorAPI } from '../services/api'
import {
  GraduationCap, Users, BookOpen, MessageCircle, MessageSquare, Play, Clock,
  ArrowRight, Sun, Moon, Cpu, Bot, Wifi, Brain, Code, LayoutDashboard, Library,
  Trophy, School, HelpCircle, Heart, TrendingUp,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/* Optional: put real screenshots in /public/screens and set the paths  */
/* here. When null, a built-in preview is drawn instead.                */
/* Blur student names and photos before using a screenshot.            */
/* ------------------------------------------------------------------ */
const SCREENSHOTS = {
  dashboard: null, // e.g. '/screens/dashboard.png'
  community: null, // e.g. '/screens/community.png'
}

const card =
  'rounded-2xl border border-slate-200 bg-white dark:border-[#26264A] dark:bg-[#14142B]'
const lift =
  'transition duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/10'
const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0B0B1E]'
const container = 'mx-auto w-full max-w-6xl px-5 sm:px-8'

// Shown when the course API is empty or fails, so the page never looks broken.
const FALLBACK_COURSES = [
  { icon: Bot, title: 'Introduction to Robotics', body: 'Start with servo motors, sensors and Arduino, then build a real robot.' },
  { icon: Wifi, title: 'IoT with ESP32', body: 'Connect sensors to the cloud and deploy smart devices.' },
  { icon: Brain, title: 'AI/ML on Edge', body: 'Run TensorFlow Lite models on microcontrollers.' },
  { icon: Cpu, title: 'RTOS Fundamentals', body: 'Schedule tasks with FreeRTOS and structure embedded software.' },
  { icon: Code, title: 'Embedded C Programming', body: 'Write memory-efficient C for microcontrollers and robots.' },
]

const FEATURE_GROUPS = [
  {
    title: 'Learn at your own pace',
    body: 'Your courses, study material and progress in one place.',
    span: 'md:col-span-4',
    items: [
      { icon: LayoutDashboard, name: 'Dashboard', text: 'See enrolled courses, progress and XP at a glance.' },
      { icon: Library, name: 'Resources', text: 'Study material for every course, ready when you need it.' },
    ],
  },
  {
    title: 'Keep going',
    body: 'Finish lessons, earn XP, unlock rewards.',
    span: 'md:col-span-2',
    items: [{ icon: Trophy, name: 'Rewards', text: 'Collect XP and rewards for every step you complete.' }],
  },
  {
    title: 'Get unstuck',
    body: 'Ask, and someone who knows answers.',
    span: 'md:col-span-3',
    items: [
      { icon: HelpCircle, name: 'My Doubts', text: 'Post a doubt and get an answer.' },
      { icon: GraduationCap, name: 'Mentors', text: 'Learn from Robotics and IoT professionals.' },
      { icon: MessageSquare, name: 'Chats', text: 'Talk directly with mentors and classmates.' },
    ],
  },
  {
    title: 'Learn with others',
    body: 'Build alongside your school and your peers.',
    span: 'md:col-span-3',
    items: [
      { icon: School, name: 'My School', text: 'Your school\u2019s own space on the platform.' },
      { icon: Users, name: 'Communities', text: 'Share projects, follow topics, cheer each other on.' },
    ],
  },
]

const STEPS = [
  { title: 'Create your account', body: 'Sign up as an individual student or join through your school partnership. Both ways work!' },
  { title: 'Pick a course', body: 'Choose from Robotics, IoT, AI/ML or Embedded Systems. Start with basics or jump to advanced.' },
  { title: 'Learn and build', body: 'Complete lessons, build projects, ask doubts and earn XP. Learn at your own pace with mentor support.' },
]

const TRENDING = [
  { icon: Bot, name: 'Robotics Basics', text: 'Start with servo motors and Arduino' },
  { icon: Wifi, name: 'IoT with ESP32', text: 'Connect sensors to the cloud' },
  { icon: Brain, name: 'ML on Edge', text: 'Run TensorFlow Lite on microcontrollers' },
  { icon: Cpu, name: 'RTOS Fundamentals', text: 'FreeRTOS task scheduling explained' },
]

const FAQ = [
  { q: 'Can I join without school partnership?', a: 'Yes! Students can create individual accounts and start learning immediately. School partnership is optional and provides additional benefits like batch tracking and institutional support.' },
  { q: 'What is Studdy Buddy?', a: 'Studdy Buddy is a learning platform by A5X Industries where students learn Robotics, IoT, AI/ML and Embedded Systems with expert mentor support, doubt resolution, and community learning.' },
  { q: 'Which courses are available?', a: 'We offer courses in Robotics Fundamentals, IoT with ESP32, AI/ML on Edge Devices, RTOS (Real-Time Operating Systems), and Embedded C Programming.' },
  { q: 'How much does it cost?', a: 'We offer both free and premium courses. Many fundamental courses are completely free to access. Premium courses provide advanced content and certification.' },
  { q: 'Who is A5X Industries?', a: 'A5X Industries is an Indian EdTech and Robotics company focused on bringing hands-on technology education to students through innovative learning platforms and school partnerships.' },
]

/* ---------------------------- helpers ----------------------------- */

/* Replace with your app's theme context if you already have one. */
function useTheme() {
  const [dark, setDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  )
  const toggle = () => {
    const next = !dark
    document.documentElement.classList.toggle('dark', next)
    try { localStorage.setItem('theme', next ? 'dark' : 'light') } catch { /* ignore */ }
    setDark(next)
  }
  return [dark, toggle]
}

function useScrolled(offset = 8) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > offset)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [offset])
  return scrolled
}

/* Fades and lifts its children in once, when they scroll into view. */
function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) { setShown(true); return }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setShown(true); io.disconnect() }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className={`sb-reveal ${shown ? 'in' : ''} ${className}`} style={{ '--d': `${delay}ms` }}>
      {children}
    </div>
  )
}

/* Counts up from 0 the first time it is visible. */
function CountUp({ to }) {
  const ref = useRef(null)
  const [n, setN] = useState(0)
  useEffect(() => {
    const el = ref.current
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!el || reduce || !('IntersectionObserver' in window)) { setN(to); return }
    let raf
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        io.disconnect()
        const t0 = performance.now()
        const tick = (t) => {
          const p = Math.min((t - t0) / 1200, 1)
          setN(Math.round(to * (1 - Math.pow(1 - p, 3))))
          if (p < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      },
      { threshold: 0.4 }
    )
    io.observe(el)
    return () => { io.disconnect(); cancelAnimationFrame(raf) }
  }, [to])
  return <span ref={ref}>{n}</span>
}

/* ------------------------- preview cards -------------------------- */

function DashboardPreview() {
  if (SCREENSHOTS.dashboard) {
    return (
      <img
        src={SCREENSHOTS.dashboard}
        alt="Studdy Buddy student dashboard"
        className="w-full rounded-2xl border border-slate-200 shadow-xl dark:border-[#26264A]"
      />
    )
  }
  const rows = [
    ['Introduction to Robotics', 72],
    ['IoT with ESP32', 40],
    ['Embedded C Programming', 15],
  ]
  return (
    <div className={`${card} p-5 shadow-xl shadow-indigo-500/10`} aria-hidden="true">
      <div className="mb-4 flex items-center justify-between">
        <p className="sb-display text-base font-bold text-slate-900 dark:text-white">My dashboard</p>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-400/15 dark:text-amber-300">
          1,240 XP
        </span>
      </div>
      <div className="space-y-3">
        {rows.map(([name, pct], i) => (
          <div key={name} className="rounded-xl bg-slate-50 p-3 dark:bg-[#1B1B3A]">
            <div className="mb-2 flex justify-between text-sm font-medium text-slate-800 dark:text-slate-100">
              <span>{name}</span>
              <span className="text-indigo-700 dark:text-indigo-300">{pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 dark:bg-[#26264A]">
              <div
                className="sb-grow h-2 rounded-full bg-indigo-600"
                style={{ width: `${pct}%`, '--d': `${700 + i * 150}ms` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PostPreview({ className = '' }) {
  return (
    <div className={`${card} p-4 shadow-xl shadow-indigo-500/10 ${className}`} aria-hidden="true">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-white">A</div>
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Aarav</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Student</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-700 dark:text-slate-200">
        My line-following robot finally stays on the track. Thanks for the PID tip, Meera di!
      </p>
      <div className="mt-3 flex gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1"><Heart className="h-4 w-4" /> 24</span>
        <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" /> 6</span>
      </div>
    </div>
  )
}

/* ----------------------------- page ------------------------------- */

export default function Landing() {
  const [dark, toggleTheme] = useTheme()
  const scrolled = useScrolled()
  const [courses, setCourses] = useState([])
  const [stats, setStats] = useState({ students: 0, courses: 0, mentors: 0, doubts: 0, communities: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [coursesRes, doubtsRes, communitiesRes, mentorsRes] = await Promise.all([
          courseAPI.list({ page: 1, limit: 50 }),
          doubtAPI.list(1, 1).catch(() => ({ data: { data: { total: 0 } } })),
          communityAPI.list(1, 1).catch(() => ({ data: { data: { total: 0 } } })),
          mentorAPI.getAll().catch(() => ({ data: { data: { mentors: [] } } })),
        ])
        const list = coursesRes.data.data?.courses || []
        console.log('📚 REAL COURSES FROM API:', list)
        console.log('📊 Total courses found:', list.length)
        setCourses(list)

        const students = new Set()
        list.forEach((c) => {
          c.enrolledStudents?.forEach((s) => s?._id && students.add(s._id))
        })
        
        // Get real mentor count from mentor API
        const mentorsList = mentorsRes.data.data?.mentors || []
        console.log('👨‍🏫 REAL MENTORS:', mentorsList.length)
        
        setStats({
          students: students.size,
          courses: coursesRes.data.data?.total ?? list.length,
          mentors: mentorsList.length, // Real mentor count
          doubts: doubtsRes.data.data?.total || 0,
          communities: communitiesRes.data.data?.total || 0,
        })
      } catch (err) {
        console.error('Failed to load landing data:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Only show numbers that are real and non-zero.
  const statItems = [
    ['Students learning', stats.students],
    ['Courses', stats.courses],
    ['Mentors', stats.mentors],
    ['Doubts asked', stats.doubts],
    ['Communities', stats.communities],
  ].filter(([, n]) => n > 0)

  const shownCourses = courses.slice(0, 6)

  return (
    <div className="sb-body min-h-screen overflow-x-clip bg-slate-50 text-slate-900 dark:bg-[#0B0B1E] dark:text-white">
      <Helmet>
        <title>Studdy Buddy A5X – Learn Robotics, IoT, AI/ML & Embedded Systems | A5X Industries</title>
        <meta name="description" content="Learn Robotics, IoT, AI/ML and Embedded Systems with Studdy Buddy by A5X Industries. Join students learning hands-on technology with expert mentors, doubt solving and community support." />
        <meta name="keywords" content="A5X, A5X Industries, Studdy Buddy, robotics courses, IoT courses India, AI ML learning, embedded systems, Arduino programming, ESP32, online robotics, STEM education, technology courses for students, school students tech courses, robotics learning platform" />
        <link rel="canonical" href="https://studdybuddy.a5x.in/" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Studdy Buddy A5X – Learn Robotics, IoT & AI/ML | A5X Industries" />
        <meta property="og:description" content="Join students learning Robotics, IoT, AI/ML with expert mentors and hands-on projects. By A5X Industries." />
        <meta property="og:url" content="https://studdybuddy.a5x.in/" />
        <meta property="og:type" content="website" />
        
        {/* Twitter */}
        <meta name="twitter:title" content="Studdy Buddy A5X – Learn Robotics, IoT & AI/ML" />
        <meta name="twitter:description" content="Learn technology with expert mentors. Robotics, IoT, AI/ML courses for students." />
      </Helmet>
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Sora:wght@600;700;800&display=swap');
        .sb-display{font-family:'Sora',ui-sans-serif,system-ui,sans-serif}
        .sb-body{font-family:'DM Sans',ui-sans-serif,system-ui,sans-serif}
        html{scroll-behavior:smooth}

        @keyframes sb-rise{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
        @keyframes sb-fade{from{opacity:0}to{opacity:1}}
        @keyframes sb-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes sb-grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
        @keyframes sb-glow{0%,100%{opacity:.55;transform:scale(1)}50%{opacity:.9;transform:scale(1.08)}}

        .sb-rise{animation:sb-rise .8s cubic-bezier(.2,.7,.2,1) both;animation-delay:var(--d,0ms)}
        .sb-fade{animation:sb-fade .35s ease both}
        .sb-float{animation:sb-float 7s ease-in-out infinite;animation-delay:var(--d,0ms)}
        .sb-glow{animation:sb-glow 8s ease-in-out infinite}
        .sb-grow{transform-origin:left;animation:sb-grow 1.1s cubic-bezier(.2,.7,.2,1) both;animation-delay:var(--d,0ms)}

        .sb-reveal{opacity:0;transform:translateY(26px);
          transition:opacity .8s cubic-bezier(.2,.7,.2,1),transform .8s cubic-bezier(.2,.7,.2,1);
          transition-delay:var(--d,0ms)}
        .sb-reveal.in{opacity:1;transform:none}

        @media (prefers-reduced-motion: reduce){
          html{scroll-behavior:auto}
          .sb-rise,.sb-fade,.sb-float,.sb-glow,.sb-grow{animation:none}
          .sb-reveal{opacity:1;transform:none;transition:none}
        }
      `}</style>

      {/* Header */}
      <header
        className={`sticky top-0 z-50 border-b bg-white/85 backdrop-blur transition-shadow duration-300 dark:bg-[#0B0B1E]/85 ${
          scrolled
            ? 'border-slate-200 shadow-sm shadow-slate-900/5 dark:border-[#26264A]'
            : 'border-transparent'
        }`}
      >
        <div className={`${container} flex items-center justify-between gap-4 py-3`}>
          <Link to="/" className={`flex items-center gap-2 rounded-lg ${focusRing}`}>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="sb-display text-lg font-bold">Studdy Buddy</span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300 md:flex" aria-label="Sections">
            {[['#courses', 'Courses'], ['#features', 'Features'], ['#community', 'Community'], ['#schools', 'For schools']].map(([href, label]) => (
              <a key={href} href={href} className={`rounded transition-colors hover:text-indigo-600 dark:hover:text-indigo-300 ${focusRing}`}>{label}</a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
              className={`flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition-colors hover:bg-slate-100 dark:border-[#26264A] dark:text-slate-200 dark:hover:bg-[#14142B] ${focusRing}`}
            >
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <Link to="/login" className={`rounded-lg px-4 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-[#14142B] ${focusRing}`}>
              Login
            </Link>
            <Link to="/signup" className={`rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-indigo-700 active:translate-y-0 ${focusRing}`}>
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 text-slate-300/70 dark:text-[#26264A]/70"
            style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 0)', backgroundSize: '28px 28px' }}
            aria-hidden="true"
          />
          <div className={`${container} relative grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_1fr] lg:py-24`}>
            <div>
              <p className="sb-rise inline-block rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-800 dark:bg-indigo-400/15 dark:text-indigo-200" style={{ '--d': '0ms' }}>
                By A5X Industries
              </p>
              <h1 className="sb-display sb-rise mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl" style={{ '--d': '90ms' }}>
                Build real robots and IoT devices with expert guidance.
              </h1>
              <p className="sb-rise mt-5 max-w-xl text-lg leading-relaxed text-slate-600 dark:text-slate-300" style={{ '--d': '180ms' }}>
                Learn Robotics, IoT, AI/ML and Embedded Systems at your own pace. Join as an individual student or through your school partnership. Expert mentors, doubt solving, and a supportive community.
              </p>
              <div className="sb-rise mt-8 flex flex-wrap gap-3" style={{ '--d': '270ms' }}>
                <Link to="/signup" className={`group inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-600/30 active:translate-y-0 ${focusRing}`}>
                  Create your account
                  <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <a href="#courses" className={`rounded-xl border border-slate-300 bg-white px-6 py-3.5 font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0 dark:border-[#26264A] dark:bg-[#14142B] dark:text-slate-100 dark:hover:bg-[#1B1B3A] ${focusRing}`}>
                  See courses
                </a>
              </div>
              <p className="sb-rise mt-5 text-sm text-slate-600 dark:text-slate-400" style={{ '--d': '350ms' }}>
                Already a student?{' '}
                <Link to="/login" className={`rounded font-semibold text-indigo-700 underline-offset-4 hover:underline dark:text-indigo-300 ${focusRing}`}>Log in</Link>
                {' • '}
                <span className="text-slate-500">Open to all students • No school partnership required</span>
              </p>
            </div>

            <div className="sb-rise relative lg:pb-16 lg:pl-6" style={{ '--d': '220ms' }}>
              <div className="sb-glow pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-indigo-500/25 blur-3xl" aria-hidden="true" />
              <div className="relative">
                <DashboardPreview />
              </div>
              <div className="sb-float mt-4 lg:absolute lg:-bottom-2 lg:-left-6 lg:mt-0 lg:w-72" style={{ '--d': '1200ms' }}>
                <PostPreview />
              </div>
            </div>
          </div>
        </section>

        {/* Real numbers only */}
        {statItems.length > 0 && (
          <section aria-label="Platform numbers" className="border-y border-slate-200 bg-white dark:border-[#26264A] dark:bg-[#14142B]">
            <div className={`${container} grid grid-cols-2 gap-6 py-8 text-center sm:grid-cols-3 lg:grid-cols-5`}>
              {statItems.map(([label, n], i) => (
                <Reveal key={label} delay={i * 80}>
                  <p className="sb-display text-3xl font-bold text-indigo-700 dark:text-indigo-300"><CountUp to={n} />+</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{label}</p>
                </Reveal>
              ))}
            </div>
          </section>
        )}

        {/* Courses */}
        <section id="courses" className="scroll-mt-20 py-20">
          <div className={container}>
            <Reveal>
              <h2 className="sb-display text-3xl font-bold sm:text-4xl">Courses</h2>
            </Reveal>

            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {loading && [0, 1, 2].map((i) => (
                <div key={i} className={`${card} h-64 animate-pulse`} aria-hidden="true" />
              ))}

              {!loading && shownCourses.length > 0 && shownCourses.map((course, i) => {
                const lectures = course.modules?.reduce((a, m) => a + (m.lectures?.length || 0), 0) || 0
                return (
                  <Reveal key={course._id} delay={(i % 3) * 90} className="h-full">
                    <article className={`${card} ${lift} group flex h-full flex-col overflow-hidden`}>
                      <div className="h-40 overflow-hidden bg-gradient-to-br from-indigo-600 to-purple-600">
                        {course.thumbnail ? (
                          <img src={course.thumbnail} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <BookOpen className="h-12 w-12 text-white/50" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="sb-display text-lg font-bold leading-snug">{course.title}</h3>
                          {course.isFree && (
                            <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300">Free</span>
                          )}
                          {course.isPremium && !course.isFree && (
                            <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-400/15 dark:text-amber-300">Premium</span>
                          )}
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                          {course.description || 'Learn new skills step by step with guided lessons.'}
                        </p>
                        <div className="mt-auto pt-5">
                          <Link to="/signup" className={`flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 ${focusRing}`}>
                            Enroll now
                          </Link>
                        </div>
                      </div>
                    </article>
                  </Reveal>
                )
              })}

              {!loading && shownCourses.length === 0 && (
                <div className="col-span-full py-12 text-center">
                  <BookOpen className="mx-auto h-16 w-16 text-slate-300 dark:text-slate-600" />
                  <p className="mt-4 text-lg font-medium text-slate-600 dark:text-slate-400">No courses available yet</p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-500">Check back soon for new courses!</p>
                </div>
              )}
            </div>

            <Reveal className="mt-8">
              <Link to="/signup" className={`group inline-flex items-center gap-2 rounded font-semibold text-indigo-700 dark:text-indigo-300 ${focusRing}`}>
                Sign up to see all courses
                <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Reveal>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 pb-20">
          <div className={container}>
            <Reveal>
              <h2 className="sb-display text-3xl font-bold sm:text-4xl">Everything in one place</h2>
              <p className="mt-3 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
                Learning, help and community live in the same app, so nothing gets lost between tabs.
              </p>
            </Reveal>
            <div className="mt-10 grid gap-6 md:grid-cols-6">
              {FEATURE_GROUPS.map((g, i) => (
                <Reveal key={g.title} delay={i * 100} className={`${g.span} h-full`}>
                  <div
                    className={`${lift} h-full rounded-2xl border p-6 ${
                      i === 1
                        ? 'border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500'
                        : 'border-slate-200 bg-white dark:border-[#26264A] dark:bg-[#14142B]'
                    }`}
                  >
                    <h3 className="sb-display text-xl font-bold">{g.title}</h3>
                    <p className={`mt-1 text-sm ${i === 1 ? 'text-indigo-100' : 'text-slate-600 dark:text-slate-300'}`}>{g.body}</p>
                    <ul className="mt-5 grid gap-4 sm:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
                      {g.items.map(({ icon: Icon, name, text }) => (
                        <li key={name} className="group flex gap-3">
                          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110 ${i === 1 ? 'bg-white/15 text-white' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-200'}`}>
                            <Icon className="h-5 w-5" />
                          </span>
                          <div>
                            <p className="font-semibold">{name}</p>
                            <p className={`text-sm leading-relaxed ${i === 1 ? 'text-indigo-100' : 'text-slate-600 dark:text-slate-300'}`}>{text}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Community */}
        <section id="community" className="scroll-mt-20 border-y border-slate-200 bg-white py-20 dark:border-[#26264A] dark:bg-[#14142B]">
          <div className={`${container} grid items-center gap-12 lg:grid-cols-2`}>
            <Reveal>
              <h2 className="sb-display text-3xl font-bold sm:text-4xl">Learn with people who build too</h2>
              <p className="mt-4 max-w-lg text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                Share your projects, follow other students, and join the topics everyone is talking about this week.
              </p>
              <Link to="/signup" className={`group mt-7 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-indigo-700 active:translate-y-0 ${focusRing}`}>
                Join the community
                <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Reveal>

            <Reveal delay={150}>
              {SCREENSHOTS.community ? (
                <img src={SCREENSHOTS.community} alt="Studdy Buddy community feed" className="w-full rounded-2xl border border-slate-200 shadow-xl dark:border-[#26264A]" />
              ) : (
                <div className="grid gap-4 sm:grid-cols-[1.2fr_1fr]" aria-hidden="true">
                  <PostPreview />
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-[#26264A] dark:bg-[#0B0B1E]">
                    <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                      <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-300" /> Trending topics
                    </p>
                    <ul className="space-y-3">
                      {TRENDING.map(({ icon: Icon, name, text }) => (
                        <li key={name} className="flex gap-2">
                          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-300" />
                          <div>
                            <p className="text-sm font-semibold">{name}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">{text}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </Reveal>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 py-20">
          <div className={container}>
            <Reveal><h2 className="sb-display text-3xl font-bold sm:text-4xl">How it works</h2></Reveal>
            <ol className="mt-10 grid gap-8 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title}>
                  <Reveal delay={i * 120} className="flex gap-4">
                    <span className="sb-display flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-bold text-white">{i + 1}</span>
                    <div>
                      <h3 className="text-lg font-semibold">{s.title}</h3>
                      <p className="mt-1 text-slate-600 dark:text-slate-300">{s.body}</p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* For schools */}
        <section id="schools" className="scroll-mt-20 pb-20">
          <div className={container}>
            <Reveal>
              <div className="grid items-center gap-8 rounded-3xl bg-indigo-600 p-8 text-white sm:p-12 md:grid-cols-[1.4fr_1fr]">
                <div>
                  <h2 className="sb-display text-3xl font-bold">Schools & Institutions</h2>
                  <p className="mt-3 max-w-xl text-indigo-100">
                    Partner with A5X Industries to bring hands-on Robotics and IoT education to your students with dedicated support, progress tracking, and curriculum integration.
                  </p>
                  <p className="mt-2 text-sm text-indigo-200">
                    ✨ Students can also join individually without school partnership
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 md:justify-end">
                  <a 
                    href="https://wa.me/918269858259?text=Hi%2C%20I%27m%20interested%20in%20partnering%20with%20A5X%20Industries%20for%20our%20school" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-indigo-800 transition hover:-translate-y-0.5 hover:bg-indigo-50 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-600"
                  >
                    <MessageCircle className="h-5 w-5" />
                    Partner with us
                  </a>
                  <Link to="/signup" className="rounded-xl border border-white/70 px-6 py-3 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-600">
                    Join as student
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 pb-20">
          <div className={`${container} max-w-3xl`}>
            <Reveal><h2 className="sb-display text-3xl font-bold sm:text-4xl">Questions</h2></Reveal>
            <div className="mt-8 space-y-3">
              {FAQ.map(({ q, a }, i) => (
                <Reveal key={q} delay={i * 70}>
                  <details className={`${card} group px-5 py-4 transition-colors open:border-indigo-300 dark:open:border-indigo-500/50`}>
                    <summary className={`flex cursor-pointer list-none items-center justify-between gap-4 rounded font-semibold ${focusRing}`}>
                      {q}
                      <span className="text-xl leading-none text-indigo-600 transition-transform duration-300 group-open:rotate-45 dark:text-indigo-300" aria-hidden="true">+</span>
                    </summary>
                    <p className="sb-fade mt-3 leading-relaxed text-slate-600 dark:text-slate-300">{a}</p>
                  </details>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-slate-200 bg-white py-16 text-center dark:border-[#26264A] dark:bg-[#14142B]">
          <div className={container}>
            <Reveal>
              <h2 className="sb-display text-3xl font-bold sm:text-4xl">Start your first project this week</h2>
              <p className="mx-auto mt-3 max-w-xl text-lg text-slate-600 dark:text-slate-300">
                Create your account, pick a course and ask your first doubt today.
              </p>
              <Link to="/signup" className={`group mt-8 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:-translate-y-0.5 hover:bg-indigo-700 active:translate-y-0 ${focusRing}`}>
                Create your account
                <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Reveal>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#0B0B1E] py-10 text-slate-400">
        <div className={`${container} grid gap-8 md:grid-cols-[1.5fr_1fr_1fr]`}>
          <div>
            <div className="flex items-center gap-2 text-white">
              <GraduationCap className="h-5 w-5 text-indigo-400" />
              <span className="sb-display font-bold">Studdy Buddy</span>
            </div>
            <p className="mt-3 max-w-xs text-sm">
              A learning platform by{' '}
              <a href="https://a5x.in" target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-300 hover:underline">A5X Industries</a>.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Platform</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><a href="#courses" className="transition-colors hover:text-indigo-300">Courses</a></li>
              <li><a href="#features" className="transition-colors hover:text-indigo-300">Features</a></li>
              <li><a href="#community" className="transition-colors hover:text-indigo-300">Community</a></li>
              <li><a href="#faq" className="transition-colors hover:text-indigo-300">Questions</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Legal</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/privacy-policy" className="transition-colors hover:text-indigo-300">Privacy Policy</Link></li>
              <li><Link to="/terms-conditions" className="transition-colors hover:text-indigo-300">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <p className={`${container} mt-8 border-t border-[#26264A] pt-6 text-center text-xs`}>
          &copy; {new Date().getFullYear()} Studdy Buddy, A5X Industries. All rights reserved.
        </p>
      </footer>
    </div>
  )
}