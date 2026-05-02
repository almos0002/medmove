import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Truck,
  Building2,
  Stethoscope,
  HeartHandshake,
  Pill,
  Boxes,
  Search,
  ClipboardList,
  PackageCheck,
  Send,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useSession } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const { data: session } = useSession()
  return (
    <div className="min-h-screen bg-white text-[var(--color-mm-ink)]">
      <SiteNav signedIn={!!session} />
      <Hero signedIn={!!session} />
      <Network />
      <Steps />
      <Showcase />
      <Trust />
      <Testimonials />
      <Cta signedIn={!!session} />
      <SiteFooter />
    </div>
  )
}

/* ────────────────────────────── Top navigation ─────────────────────────── */
function SiteNav({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[var(--color-mm-line)]">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 h-[72px] flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <Mark />
          <span className="font-display text-[20px] text-[var(--color-mm-accent)]">
            MedMove
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          <NavLink href="#network">Network</NavLink>
          <NavLink href="#how">How it works</NavLink>
          <NavLink href="#stories">Stories</NavLink>
          <NavLink href="#trust">Verification</NavLink>
        </nav>
        <div className="flex items-center gap-2">
          {signedIn ? (
            <Button asChild size="md" variant="primary">
              <Link to="/dashboard">
                Go to dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <>
              <Button
                asChild
                size="md"
                variant="ghost"
                className="hidden sm:inline-flex"
              >
                <Link to="/sign-in" search={{}}>
                  Log in
                </Link>
              </Button>
              <Button asChild size="md" variant="primary">
                <Link to="/sign-up">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="px-3.5 py-2 text-[14px] font-medium text-[var(--color-mm-ink)] squircle-xs hover:bg-black/[0.04] transition-colors"
    >
      {children}
    </a>
  )
}

function Mark() {
  return (
    <span className="inline-flex h-9 w-9 items-center justify-center bg-[var(--color-mm-accent)] text-white squircle-sm">
      <ShieldCheck className="h-4 w-4" strokeWidth={2.2} />
    </span>
  )
}

/* ─────────────────────────────────── Hero ──────────────────────────────── */
function Hero({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="border-b border-[var(--color-mm-line)]">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 pt-12 sm:pt-20 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 squircle border border-[var(--color-mm-line-strong)] text-[12px] font-medium text-[var(--color-mm-subtle)]">
              <span className="tick" />
              Verified-only network across 9 countries
            </span>
            <h1 className="mt-6 font-display text-[44px] sm:text-[60px] lg:text-[68px] leading-[1.05] tracking-tight text-[var(--color-mm-ink)]">
              Move medicine to the
              <br />
              <span className="text-[var(--color-mm-accent)]">people who need it.</span>
            </h1>
            <p className="mt-5 text-[17px] text-[var(--color-mm-subtle)] leading-relaxed max-w-xl">
              MedMove connects pharmacies, clinics, hospitals, NGOs and
              distributors so surplus, in-date medicine reaches patients —
              instead of being destroyed.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {!signedIn ? (
                <>
                  <Button asChild size="lg" variant="primary">
                    <Link to="/sign-up">
                      Get started <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="secondary">
                    <Link to="/sign-in" search={{}}>
                      Log in
                    </Link>
                  </Button>
                </>
              ) : (
                <Button asChild size="lg" variant="primary">
                  <Link to="/dashboard">
                    Open your dashboard <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
            <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
              <Stat n="2.4M" l="Units redirected" />
              <Stat n="184" l="Verified orgs" />
              <Stat n="11h" l="Median dispatch" />
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative">
              <div className="squircle-lg overflow-hidden border border-[var(--color-mm-line-strong)] bg-white">
                <img
                  src="/img/hero.png"
                  alt="A pharmacist holding a sealed medicine box"
                  className="block w-full aspect-[4/5] object-cover"
                  loading="eager"
                />
              </div>

              {/* Floating verified card */}
              <div className="absolute -left-3 sm:-left-6 top-8 bg-white border border-[var(--color-mm-line-strong)] squircle-md p-4 max-w-[260px]">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center bg-[var(--color-mm-accent)] text-white squircle-sm">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-[14px] font-semibold leading-tight">
                      Listing verified
                    </div>
                    <div className="text-[12px] text-[var(--color-mm-subtle)] mt-0.5">
                      2,400 units · expires Nov 2026
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating delivery card */}
              <div className="absolute -right-3 sm:-right-6 bottom-8 bg-white border border-[var(--color-mm-line-strong)] squircle-md p-4 max-w-[260px]">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center bg-white border border-[var(--color-mm-line-strong)] text-[var(--color-mm-ink)] squircle-sm">
                    <Truck className="h-5 w-5" strokeWidth={1.6} />
                  </span>
                  <div>
                    <div className="text-[14px] font-semibold leading-tight">
                      Out for delivery
                    </div>
                    <div className="text-[12px] text-[var(--color-mm-subtle)] mt-0.5">
                      Nairobi → Kisumu · in 4h 12m
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <div className="font-display text-[26px] leading-none tracking-tight text-[var(--color-mm-ink)]">
        {n}
      </div>
      <div className="mt-1.5 text-[12.5px] text-[var(--color-mm-subtle)]">{l}</div>
    </div>
  )
}

/* ────────────────────────────────── Network ─────────────────────────────── */
function Network() {
  const items: Array<{ icon: LucideIcon; t: string; b: string; img: string }> = [
    {
      icon: Pill,
      t: 'Pharmacies',
      b: 'List near-expiry stock and recover cost.',
      img: '/img/shelves.jpg',
    },
    {
      icon: Stethoscope,
      t: 'Clinics',
      b: 'Source verified medicine for your patients.',
      img: '/img/doctor.jpg',
    },
    {
      icon: Building2,
      t: 'Hospitals',
      b: 'Track every inbound and outbound transfer.',
      img: '/img/warehouse.jpg',
    },
    {
      icon: HeartHandshake,
      t: 'NGOs',
      b: 'Receive donations with a clean paper trail.',
      img: '/img/aid.jpg',
    },
    {
      icon: Boxes,
      t: 'Distributors',
      b: 'Move overstock into the network instead of returns.',
      img: '/img/supply.jpg',
    },
    {
      icon: Truck,
      t: 'Logistics',
      b: 'Pick up assigned deliveries and capture proof.',
      img: '/img/courier.jpg',
    },
  ]
  return (
    <section id="network" className="border-b border-[var(--color-mm-line)]">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-16 sm:py-20">
        <div className="flex items-end justify-between gap-6 flex-wrap mb-10">
          <div>
            <h2 className="font-display text-[32px] sm:text-[40px] leading-tight tracking-tight">
              Built for everyone in the supply chain
            </h2>
            <p className="mt-3 text-[16px] text-[var(--color-mm-subtle)] max-w-2xl">
              Six organization types. One verified ledger. Everyone sees only
              what they're allowed to act on.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {items.map((it) => (
            <article
              key={it.t}
              className="photo-card bg-white border border-[var(--color-mm-line-strong)] squircle-md overflow-hidden"
            >
              <div className="aspect-[5/4] overflow-hidden bg-white">
                <img
                  src={it.img}
                  alt={it.t}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-9 w-9 items-center justify-center bg-white border border-[var(--color-mm-line-strong)] squircle-xs">
                    <it.icon
                      className="h-4 w-4 text-[var(--color-mm-accent)]"
                      strokeWidth={1.8}
                    />
                  </span>
                  <h3 className="font-display text-[18px] text-[var(--color-mm-ink)]">
                    {it.t}
                  </h3>
                </div>
                <p className="mt-3 text-[14px] text-[var(--color-mm-subtle)] leading-relaxed">
                  {it.b}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ──────────────────────────────── How it works ─────────────────────────── */
function Steps() {
  const steps: Array<{ icon: LucideIcon; n: string; t: string; b: string }> = [
    {
      icon: ClipboardList,
      n: '01',
      t: 'Get verified',
      b: 'Upload your pharmacy licence and registration. Approval typically within 48 hours.',
    },
    {
      icon: Search,
      n: '02',
      t: 'List or request',
      b: 'Sellers post sealed, in-date stock with batch and expiry. Buyers post what their patients need.',
    },
    {
      icon: PackageCheck,
      n: '03',
      t: 'Admin matches',
      b: 'Each request is reviewed and approved. Untraceable stock never leaves the loop.',
    },
    {
      icon: Send,
      n: '04',
      t: 'Logistics deliver',
      b: 'A verified partner picks up, scans, and captures proof of every handover.',
    },
  ]
  return (
    <section
      id="how"
      className="border-b border-[var(--color-mm-line)] bg-white"
    >
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-16 sm:py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="eyebrow">How it works</span>
          <h2 className="mt-3 font-display text-[32px] sm:text-[40px] leading-tight tracking-tight">
            Four simple steps to redirect medicine
          </h2>
        </div>
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {steps.map((s) => (
            <li
              key={s.n}
              className="bg-white border border-[var(--color-mm-line-strong)] squircle-md p-6"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex h-12 w-12 items-center justify-center bg-[var(--color-mm-accent)] text-white squircle-sm">
                  <s.icon className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <span className="text-[13px] font-semibold text-[var(--color-mm-subtle)]">
                  {s.n}
                </span>
              </div>
              <h3 className="mt-5 font-display text-[18px] text-[var(--color-mm-ink)] leading-snug">
                {s.t}
              </h3>
              <p className="mt-2 text-[14px] text-[var(--color-mm-subtle)] leading-relaxed">
                {s.b}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ──────────────────────────────── Photo showcase ────────────────────────── */
function Showcase() {
  return (
    <section className="border-b border-[var(--color-mm-line)]">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-16 sm:py-20">
        <div className="grid grid-cols-12 gap-4 sm:gap-5">
          <PhotoTile
            src="/img/vials.jpg"
            label="In-date, sealed"
            caption="Every listing is documented at the batch level."
            className="col-span-12 sm:col-span-7 aspect-[16/10]"
          />
          <PhotoTile
            src="/img/handoff.png"
            label="Documented handoff"
            caption="Proof of delivery captured at every stop."
            className="col-span-12 sm:col-span-5 aspect-[4/5] sm:aspect-auto"
          />
          <PhotoTile
            src="/img/boxes.png"
            label="Sealed at source"
            caption="Stock never leaves licensed custody."
            className="col-span-6 sm:col-span-4 aspect-square"
          />
          <PhotoTile
            src="/img/aid.jpg"
            label="Reaches the field"
            caption="From a pharmacy shelf to a clinic that needs it."
            className="col-span-6 sm:col-span-4 aspect-square"
          />
          <PhotoTile
            src="/img/courier.jpg"
            label="Verified couriers"
            caption="Logistics partners are licensed and trackable."
            className="col-span-12 sm:col-span-4 aspect-[16/10] sm:aspect-square"
          />
        </div>
      </div>
    </section>
  )
}

function PhotoTile({
  src,
  label,
  caption,
  className,
}: {
  src: string
  label: string
  caption: string
  className: string
}) {
  return (
    <figure
      className={`photo-card relative bg-white border border-[var(--color-mm-line-strong)] squircle-md overflow-hidden ${className}`}
    >
      <img src={src} alt={label} loading="lazy" className="w-full h-full object-cover" />
      <figcaption className="absolute inset-x-3 bottom-3 bg-white border border-[var(--color-mm-line-strong)] squircle-sm px-4 py-3">
        <div className="text-[13px] font-semibold text-[var(--color-mm-ink)]">
          {label}
        </div>
        <div className="text-[12px] text-[var(--color-mm-subtle)] mt-0.5">
          {caption}
        </div>
      </figcaption>
    </figure>
  )
}

/* ────────────────────────────────── Trust ──────────────────────────────── */
function Trust() {
  const points = [
    {
      icon: ShieldCheck,
      t: 'Document-reviewed orgs',
      b: 'Pharmacy licences and business registrations are validated before access is granted.',
    },
    {
      icon: CheckCircle2,
      t: 'Capability scoped',
      b: 'List, request and deliver are independent toggles per organization. No global access.',
    },
    {
      icon: ClipboardList,
      t: 'Full audit log',
      b: 'Every status change is recorded with admin, timestamp and reason.',
    },
    {
      icon: PackageCheck,
      t: 'Zero counterfeit',
      b: 'No incidents on record across the network to date.',
    },
  ]
  return (
    <section
      id="trust"
      className="border-b border-[var(--color-mm-line)] bg-white"
    >
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-16 sm:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-5">
          <span className="eyebrow">Verification, not vibes</span>
          <h2 className="mt-3 font-display text-[32px] sm:text-[40px] leading-tight tracking-tight">
            We won't move <span className="text-[var(--color-mm-accent)]">unverifiable</span> medicine.
          </h2>
          <p className="mt-4 text-[16px] text-[var(--color-mm-subtle)] leading-relaxed max-w-md">
            Every organization is reviewed before it can list, request or
            deliver. There's no anonymous seller, no untraceable batch and no
            silent failure mode.
          </p>
          <div className="mt-7">
            <Button asChild variant="dark" size="lg">
              <Link to="/sign-up">
                Apply for verification <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {points.map((p) => (
            <div
              key={p.t}
              className="bg-white border border-[var(--color-mm-line-strong)] squircle-md p-5"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center bg-white border border-[var(--color-mm-line-strong)] squircle-sm">
                <p.icon
                  className="h-5 w-5 text-[var(--color-mm-accent)]"
                  strokeWidth={1.7}
                />
              </span>
              <h3 className="mt-4 font-display text-[16px] text-[var(--color-mm-ink)]">
                {p.t}
              </h3>
              <p className="mt-1.5 text-[13.5px] text-[var(--color-mm-subtle)] leading-relaxed">
                {p.b}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────────────── Testimonials ────────────────────────── */
function Testimonials() {
  const quotes = [
    {
      q: 'Anything within ninety days of expiry used to hit the incinerator. Now four out of five units find a clinic that needs them.',
      a: 'Wairimu N.',
      r: 'Head of Inventory · Pharmacy chain, Nairobi',
      img: '/img/shelves.jpg',
    },
    {
      q: 'The verification step is what convinced our procurement committee. We can audit every box back to its source pharmacy.',
      a: 'Dr. Adeyemi O.',
      r: 'Medical Director · Faith-based hospital, Lagos',
      img: '/img/doctor.jpg',
    },
    {
      q: 'Our drivers used to deliver blind. Now every handover is captured against an organization we know is licensed.',
      a: 'Joseph M.',
      r: 'Dispatch lead · Regional logistics partner',
      img: '/img/courier.jpg',
    },
  ]
  return (
    <section id="stories" className="border-b border-[var(--color-mm-line)]">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-16 sm:py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="eyebrow">From the network</span>
          <h2 className="mt-3 font-display text-[32px] sm:text-[40px] leading-tight tracking-tight">
            Trusted across the supply chain
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {quotes.map((q) => (
            <figure
              key={q.a}
              className="bg-white border border-[var(--color-mm-line-strong)] squircle-md overflow-hidden flex flex-col"
            >
              <div className="aspect-[16/10] overflow-hidden">
                <img src={q.img} alt="" loading="lazy" className="w-full h-full object-cover" />
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <blockquote className="text-[15px] text-[var(--color-mm-ink)] leading-relaxed">
                  “{q.q}”
                </blockquote>
                <figcaption className="mt-5 pt-5 border-t border-[var(--color-mm-line)] text-[13px]">
                  <div className="font-semibold text-[var(--color-mm-ink)]">
                    {q.a}
                  </div>
                  <div className="text-[var(--color-mm-subtle)] mt-0.5">
                    {q.r}
                  </div>
                </figcaption>
              </div>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────── CTA ───────────────────────────────── */
function Cta({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="border-b border-[var(--color-mm-line)]">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-20">
        <div className="bg-[var(--color-mm-accent)] text-white squircle-lg p-10 sm:p-14 grid grid-cols-1 lg:grid-cols-12 items-center gap-8">
          <div className="lg:col-span-8">
            <h2 className="font-display text-[32px] sm:text-[44px] leading-tight tracking-tight">
              Stop burning good medicine.
            </h2>
            <p className="mt-3 text-[16px] text-white/85 max-w-2xl leading-relaxed">
              Onboarding is free. Verification is included. Your organization
              is unlocked the moment your documents are approved.
            </p>
          </div>
          <div className="lg:col-span-4 flex lg:justify-end gap-3 flex-wrap">
            {!signedIn ? (
              <>
                <Button
                  asChild
                  size="lg"
                  className="bg-white text-[var(--color-mm-accent)] border-white hover:bg-[var(--color-mm-ink)] hover:text-white hover:border-[var(--color-mm-ink)]"
                >
                  <Link to="/sign-up">
                    Sign up <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="text-white border-white/40 hover:border-white"
                >
                  <Link to="/sign-in" search={{}}>
                    Log in
                  </Link>
                </Button>
              </>
            ) : (
              <Button
                asChild
                size="lg"
                className="bg-white text-[var(--color-mm-accent)] border-white hover:bg-[var(--color-mm-ink)] hover:text-white hover:border-[var(--color-mm-ink)]"
              >
                <Link to="/dashboard">
                  Go to dashboard <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ──────────────────────────────── Footer ───────────────────────────────── */
function SiteFooter() {
  return (
    <footer className="bg-white">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-14 grid grid-cols-12 gap-8">
        <div className="col-span-12 md:col-span-4">
          <div className="flex items-center gap-2.5">
            <Mark />
            <span className="font-display text-[20px] text-[var(--color-mm-accent)]">
              MedMove
            </span>
          </div>
          <p className="mt-4 text-[14px] text-[var(--color-mm-subtle)] leading-relaxed max-w-sm">
            A verified, closed-loop network for redirecting in-date, sealed
            medicine to the patients who need it.
          </p>
        </div>
        <FooterCol
          title="Network"
          items={[
            'Pharmacies',
            'Clinics',
            'Hospitals',
            'NGOs',
            'Distributors',
            'Logistics',
          ]}
        />
        <FooterCol
          title="Platform"
          items={['Verification', 'Listings', 'Requests', 'Deliveries', 'Audit log']}
        />
        <FooterCol
          title="Company"
          items={['About', 'Contact', 'Press', 'Privacy', 'Terms']}
        />
      </div>
      <div className="border-t border-[var(--color-mm-line)]">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[13px] text-[var(--color-mm-subtle)]">
          <span>© {new Date().getFullYear()} MedMove. All rights reserved.</span>
          <span>Verified-only network</span>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="col-span-6 md:col-span-2 lg:col-span-2">
      <h3 className="text-[13px] font-semibold text-[var(--color-mm-ink)]">
        {title}
      </h3>
      <ul className="mt-4 space-y-2.5 text-[14px] text-[var(--color-mm-subtle)]">
        {items.map((it) => (
          <li key={it}>
            <a href="#" className="hover:text-[var(--color-mm-ink)] transition-colors">
              {it}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
