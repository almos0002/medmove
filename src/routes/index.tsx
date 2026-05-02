import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowUpRight,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  ShieldCheck,
  Truck,
  Building2,
  Stethoscope,
  HeartHandshake,
  Pill,
  Boxes,
  Quote,
} from 'lucide-react'
import { useSession } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const { data: session } = useSession()
  return (
    <div className="min-h-screen bg-white text-[var(--color-mm-ink)] selection:bg-[var(--color-mm-accent)] selection:text-white">
      <SiteNav signedIn={!!session} />
      <Hero signedIn={!!session} />
      <Marquee />
      <Stats />
      <HowItWorks />
      <BuiltFor />
      <VerificationStory />
      <Testimonials />
      <Compliance />
      <Cta signedIn={!!session} />
      <SiteFooter />
    </div>
  )
}

/* ───────────────────────────── Top navigation ───────────────────────────── */
function SiteNav({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur border-b border-[var(--color-mm-line)]">
      <div className="max-w-[1280px] mx-auto px-6 sm:px-10 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <Mark />
          <span className="font-display text-[22px] leading-none">
            MedMove
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm">
          <a href="#how" className="hover:text-[var(--color-mm-accent)] transition-colors">How it works</a>
          <a href="#network" className="hover:text-[var(--color-mm-accent)] transition-colors">Network</a>
          <a href="#trust" className="hover:text-[var(--color-mm-accent)] transition-colors">Verification</a>
          <a href="#stories" className="hover:text-[var(--color-mm-accent)] transition-colors">Stories</a>
        </nav>
        <div className="flex items-center gap-2">
          {signedIn ? (
            <Button asChild size="sm" variant="primary">
              <Link to="/dashboard">Dashboard <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          ) : (
            <>
              <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
                <Link to="/sign-in" search={{}}>Sign in</Link>
              </Button>
              <Button asChild size="sm" variant="primary">
                <Link to="/sign-up">Open an account</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

function Mark() {
  return (
    <span className="inline-flex h-9 w-9 items-center justify-center bg-[var(--color-mm-ink)] text-white squircle-sm">
      <ShieldCheck className="h-4 w-4" strokeWidth={2} />
    </span>
  )
}

/* ────────────────────────────────── Hero ────────────────────────────────── */
function Hero({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="border-b border-[var(--color-mm-line)]">
      <div className="max-w-[1280px] mx-auto px-6 sm:px-10 pt-16 sm:pt-24 pb-12 grid grid-cols-12 gap-x-8 gap-y-10">
        <div className="col-span-12 lg:col-span-7">
          <div className="eyebrow flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="tick" /> Vol.01 — 2026
            </span>
            <span className="h-px w-12 bg-[var(--color-mm-line-strong)]" />
            <span>The medicine ledger</span>
          </div>
          <h1 className="mt-7 font-display text-[clamp(56px,9.2vw,148px)] leading-[0.92] tracking-tight">
            Medicine,
            <br />
            <em className="italic text-[var(--color-mm-accent)]">redirected.</em>
          </h1>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-12 gap-6 sm:gap-8">
            <p className="sm:col-span-7 text-[17px] leading-relaxed text-[var(--color-mm-muted)] max-w-xl">
              MedMove is a verified network where pharmacies, clinics,
              hospitals, NGOs and distributors move surplus, in-date medicine
              to the patients who need it — instead of the incinerator.
            </p>
            <div className="sm:col-span-5 sm:border-l sm:border-[var(--color-mm-line)] sm:pl-8 flex flex-col justify-end">
              <div className="eyebrow text-[var(--color-mm-muted)]">Audited & verifiable</div>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-mm-muted)]">
                Every organization is reviewed before it can list, request, or
                deliver. Every transfer is logged.
              </p>
            </div>
          </div>
          {!signedIn && (
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" variant="primary">
                <Link to="/sign-up">
                  Open an account <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link to="/sign-in" search={{}}>I already have one</Link>
              </Button>
            </div>
          )}
        </div>
        <div className="col-span-12 lg:col-span-5">
          <div className="relative squircle-md overflow-hidden border border-[var(--color-mm-line)]">
            <img
              src="/img/hero.png"
              alt="A pharmacist holding a sealed medicine box"
              className="block w-full aspect-[4/5] object-cover"
              loading="eager"
            />
            <div className="absolute left-4 bottom-4 right-4 bg-white border border-[var(--color-mm-line-strong)] squircle-xs px-4 py-3 flex items-center gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center bg-[var(--color-mm-accent)] text-white squircle-xs">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <div>
                <div className="text-[13px] font-medium leading-tight">Listing #4821 verified</div>
                <div className="text-[11px] text-[var(--color-mm-muted)]">2,400 units · expires 11/2026</div>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <ImgTile src="/img/shelves.jpg" alt="Pharmacy shelves" />
            <ImgTile src="/img/vials.jpg" alt="Medicine vials" />
            <ImgTile src="/img/courier.jpg" alt="Courier handoff" />
          </div>
        </div>
      </div>
    </section>
  )
}

function ImgTile({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="squircle-xs overflow-hidden border border-[var(--color-mm-line)]">
      <img src={src} alt={alt} className="block w-full aspect-square object-cover" loading="lazy" />
    </div>
  )
}

/* ────────────────────────────── Trust marquee ───────────────────────────── */
function Marquee() {
  const items = [
    'Pharmacy chains',
    'Independent clinics',
    'Public hospitals',
    'Faith-based NGOs',
    'Wholesale distributors',
    'Last-mile logistics',
    'Mission hospitals',
    'Community pharmacies',
  ]
  return (
    <section className="border-b border-[var(--color-mm-line)] bg-white">
      <div className="max-w-[1280px] mx-auto px-6 sm:px-10 py-6 flex items-center gap-6 overflow-hidden">
        <span className="eyebrow shrink-0">Trusted across the supply chain</span>
        <div className="h-px flex-1 bg-[var(--color-mm-line)]" />
        <ul className="flex items-center gap-6 sm:gap-8 text-[13px] tracking-tight text-[var(--color-mm-muted)] overflow-hidden">
          {items.map((it) => (
            <li key={it} className="font-display italic whitespace-nowrap">{it}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ─────────────────────────────────── Stats ──────────────────────────────── */
function Stats() {
  const items = [
    { n: '2.4M', l: 'Sealed units redirected since 2025' },
    { n: '184', l: 'Verified organizations across 9 countries' },
    { n: '11hr', l: 'Median time from request to dispatch' },
    { n: '0', l: 'Counterfeit incidents on-record' },
  ]
  return (
    <section className="border-b border-[var(--color-mm-line)]">
      <div className="max-w-[1280px] mx-auto px-6 sm:px-10 py-16 grid grid-cols-2 lg:grid-cols-4 gap-y-10 gap-x-8">
        {items.map((it, i) => (
          <div key={it.n} className={i === 0 ? '' : 'lg:border-l lg:border-[var(--color-mm-line)] lg:pl-8'}>
            <div className="font-display text-[clamp(48px,6vw,84px)] leading-none tracking-tight">
              {it.n}
            </div>
            <div className="mt-3 text-sm text-[var(--color-mm-muted)] max-w-[200px] leading-snug">
              {it.l}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ───────────────────────────── How it works ─────────────────────────────── */
function HowItWorks() {
  const steps = [
    {
      n: '01',
      t: 'Verify your organization',
      b: 'Upload your pharmacy licence and business registration. MedMove admins review before any medicine action is unlocked — typically within 48 hours.',
      img: '/img/doctor.jpg',
      tag: 'Document review',
    },
    {
      n: '02',
      t: 'List or request medicine',
      b: 'Sellers list sealed, in-date stock with batch and expiry. Buyers request what their patients actually need.',
      img: '/img/shelves.jpg',
      tag: 'Listings & requests',
    },
    {
      n: '03',
      t: 'Admin closes the loop',
      b: 'Each request is matched, reviewed, and approved. Counterfeit-prone or untraceable stock is rejected at the source.',
      img: '/img/aid.jpg',
      tag: 'Admin approval',
    },
    {
      n: '04',
      t: 'Logistics partners deliver',
      b: 'Dispatch is assigned to a verified logistics partner. Every handover, scan, and signature is recorded.',
      img: '/img/courier.jpg',
      tag: 'Last-mile delivery',
    },
  ]
  return (
    <section id="how" className="border-b border-[var(--color-mm-line)]">
      <div className="max-w-[1280px] mx-auto px-6 sm:px-10 py-20">
        <SectionHeading
          eyebrow="How MedMove works"
          title={<><span className="italic">Four steps</span>, fully audited.</>}
          lede="No spreadsheets, no guesswork. The same closed-loop runs whether you're moving 200 units to a rural clinic or 20,000 units across a region."
        />
        <ol className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-x-12 md:gap-y-14">
          {steps.map((s, i) => (
            <li key={s.n} className={i % 2 === 1 ? 'md:mt-16' : ''}>
              <div className="relative squircle-sm overflow-hidden border border-[var(--color-mm-line)]">
                <img src={s.img} alt={s.t} className="block w-full aspect-[5/4] object-cover" loading="lazy" />
                <div className="absolute top-4 left-4">
                  <span className="inline-flex items-center gap-2 bg-white border border-[var(--color-mm-line-strong)] squircle-xs px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em]">
                    <span className="tick" /> {s.tag}
                  </span>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-12 gap-4">
                <div className="col-span-2 numeral text-[44px] leading-none">{s.n}</div>
                <div className="col-span-10">
                  <h3 className="font-display text-2xl leading-tight">{s.t}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-mm-muted)]">{s.b}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ──────────────────────────── Built for / network ───────────────────────── */
function BuiltFor() {
  const items = [
    { icon: Pill, t: 'Pharmacies', b: 'List near-expiry stock instead of writing it off. Recover cost, prevent waste.' },
    { icon: Stethoscope, t: 'Clinics', b: 'Source verified medicine for patients you would otherwise turn away.' },
    { icon: Building2, t: 'Hospitals', b: 'Inbound and outbound transfers tracked through your existing pharmacy team.' },
    { icon: HeartHandshake, t: 'NGOs', b: 'Receive donations and surplus stock — fully documented for your funders.' },
    { icon: Boxes, t: 'Distributors', b: 'Move overstocked SKUs into the network instead of returning to manufacturer.' },
    { icon: Truck, t: 'Logistics partners', b: 'Pick up assigned deliveries and capture proof of handover at every step.' },
  ]
  return (
    <section id="network" className="border-b border-[var(--color-mm-line)] bg-white">
      <div className="max-w-[1280px] mx-auto px-6 sm:px-10 py-20 grid grid-cols-12 gap-10">
        <div className="col-span-12 lg:col-span-4">
          <div className="eyebrow">The network</div>
          <h2 className="mt-4 font-display text-[clamp(40px,5.4vw,72px)] leading-[0.95] tracking-tight">
            One ledger.<br />
            <span className="italic text-[var(--color-mm-accent)]">Six</span> kinds of organizations.
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-[var(--color-mm-muted)] max-w-md">
            Each capability — list, request, deliver — is unlocked per
            organization based on documented type and verification state.
          </p>
          <div className="mt-8 squircle-md overflow-hidden border border-[var(--color-mm-line)]">
            <img src="/img/warehouse.jpg" alt="Warehouse" className="block w-full aspect-[4/3] object-cover" loading="lazy" />
          </div>
        </div>
        <div className="col-span-12 lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-px bg-[var(--color-mm-line)] border border-[var(--color-mm-line)] squircle-sm overflow-hidden">
          {items.map((it) => (
            <div key={it.t} className="bg-white p-7">
              <span className="inline-flex h-9 w-9 items-center justify-center border border-[var(--color-mm-line-strong)] squircle-xs">
                <it.icon className="h-4 w-4" strokeWidth={1.6} />
              </span>
              <h3 className="mt-5 font-display text-2xl leading-tight">{it.t}</h3>
              <p className="mt-2 text-sm text-[var(--color-mm-muted)] leading-relaxed">{it.b}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ───────────────────── Verification trust narrative ─────────────────────── */
function VerificationStory() {
  const points = [
    'Pharmacy licence on file, validated against issuing authority',
    'Business registration cross-checked with national registry',
    'Capabilities scoped per organization type — never global',
    'Every status change recorded with admin, timestamp, reason',
  ]
  return (
    <section id="trust" className="border-b border-[var(--color-mm-line)]">
      <div className="max-w-[1280px] mx-auto px-6 sm:px-10 py-20 grid grid-cols-12 gap-10">
        <div className="col-span-12 lg:col-span-6 lg:order-2">
          <div className="eyebrow flex items-center gap-3">
            <span className="tick" /> Verification — the part nobody else does
          </div>
          <h2 className="mt-5 font-display text-[clamp(40px,5.4vw,72px)] leading-[0.95] tracking-tight">
            We won't move<br />
            <span className="italic">unverifiable</span> medicine.
          </h2>
          <p className="mt-6 text-[15px] leading-relaxed text-[var(--color-mm-muted)] max-w-lg">
            Every organization is document-reviewed before it can list,
            request, or deliver. There is no public marketplace, no anonymous
            seller, no untraceable batch.
          </p>
          <ul className="mt-8 space-y-4">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-3 text-[15px] leading-snug">
                <span className="mt-1.5 inline-flex h-5 w-5 items-center justify-center border border-[var(--color-mm-ink)] squircle-xs">
                  <CheckCircle2 className="h-3 w-3" strokeWidth={2} />
                </span>
                {p}
              </li>
            ))}
          </ul>
          <div className="mt-10 inline-flex items-center gap-3 border-t border-[var(--color-mm-line-strong)] pt-5">
            <span className="numeral text-5xl">0</span>
            <div className="text-sm text-[var(--color-mm-muted)] max-w-[200px] leading-snug">
              counterfeit incidents recorded on the network to date
            </div>
          </div>
        </div>
        <div className="col-span-12 lg:col-span-6 lg:order-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="squircle-sm overflow-hidden border border-[var(--color-mm-line)] col-span-2">
              <img src="/img/handoff.png" alt="Documented handoff" className="block w-full aspect-[5/3] object-cover" loading="lazy" />
            </div>
            <div className="squircle-sm overflow-hidden border border-[var(--color-mm-line)]">
              <img src="/img/supply.jpg" alt="Sealed supply boxes" className="block w-full aspect-[5/4] object-cover" loading="lazy" />
            </div>
            <div className="squircle-sm overflow-hidden border border-[var(--color-mm-line)] bg-white p-5 flex flex-col">
              <span className="eyebrow">Document on file</span>
              <div className="mt-4 flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center border border-[var(--color-mm-line-strong)] squircle-xs">
                  <FileCheck2 className="h-4 w-4" strokeWidth={1.6} />
                </span>
                <div>
                  <div className="text-[13px] font-medium">PHM-2024-00123</div>
                  <div className="text-[11px] text-[var(--color-mm-muted)]">Pharmacy licence · approved</div>
                </div>
              </div>
              <div className="mt-auto pt-5 border-t border-[var(--color-mm-line)] text-[11px] text-[var(--color-mm-muted)]">
                Reviewed by admin · 14 Mar 2026
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────── Testimonials ───────────────────────────── */
function Testimonials() {
  const quotes = [
    {
      q: 'Before MedMove, anything within ninety days of expiry hit the incinerator. Now four out of five units find a clinic that needs them.',
      a: 'Wairimu N.',
      r: 'Head of Inventory · Nairobi-based pharmacy chain',
    },
    {
      q: 'The verification step is what convinced our procurement committee. We can audit every box back to its source pharmacy.',
      a: 'Dr. Adeyemi O.',
      r: 'Medical Director · Faith-based hospital, Lagos',
    },
    {
      q: 'Our drivers used to deliver blind. Now every handover is captured against an organization we know is licensed.',
      a: 'Joseph M.',
      r: 'Dispatch lead · Regional logistics partner',
    },
  ]
  return (
    <section id="stories" className="border-b border-[var(--color-mm-line)]">
      <div className="max-w-[1280px] mx-auto px-6 sm:px-10 py-20">
        <SectionHeading
          eyebrow="From the network"
          title={<>Voices from <span className="italic">three sides</span> of the ledger.</>}
        />
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
          {quotes.map((q) => (
            <figure key={q.a} className="border border-[var(--color-mm-line)] squircle-sm bg-white p-7 flex flex-col">
              <Quote className="h-6 w-6 text-[var(--color-mm-accent)]" strokeWidth={1.5} />
              <blockquote className="mt-5 font-display text-[22px] leading-snug">
                “{q.q}”
              </blockquote>
              <figcaption className="mt-auto pt-7 border-t border-[var(--color-mm-line)] text-[13px]">
                <div className="font-medium">{q.a}</div>
                <div className="text-[var(--color-mm-muted)] mt-0.5">{q.r}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────── Compliance ─────────────────────────────── */
function Compliance() {
  const tiles = [
    { t: 'Documents on file', b: 'Pharmacy licence, business registration, optional GDP/GSP cert.' },
    { t: 'Status transitions', b: 'pending → verified → suspended. Every change is logged with reason and admin.' },
    { t: 'Capability scoping', b: 'List, request, and deliver are independent toggles per organization.' },
    { t: 'Audit-ready exports', b: 'CSV per transfer, per organization, per status change. No black boxes.' },
  ]
  return (
    <section className="border-b border-[var(--color-mm-line)] bg-white">
      <div className="max-w-[1280px] mx-auto px-6 sm:px-10 py-20 grid grid-cols-12 gap-10">
        <div className="col-span-12 lg:col-span-5">
          <div className="eyebrow">Built for compliance teams</div>
          <h2 className="mt-4 font-display text-[clamp(40px,5vw,68px)] leading-[0.95] tracking-tight">
            Paper-trail<br />
            <span className="italic">first.</span> Software second.
          </h2>
          <p className="mt-6 text-[15px] leading-relaxed text-[var(--color-mm-muted)] max-w-md">
            Every action on MedMove leaves a record your auditors and funders
            can read. We designed the ledger before we designed the UI.
          </p>
        </div>
        <div className="col-span-12 lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-px bg-[var(--color-mm-line)] border border-[var(--color-mm-line)] squircle-sm overflow-hidden">
          {tiles.map((t, i) => (
            <div key={t.t} className="bg-white p-7">
              <div className="numeral text-[28px] leading-none text-[var(--color-mm-accent)]">
                {String(i + 1).padStart(2, '0')}
              </div>
              <h3 className="mt-4 font-display text-xl leading-tight">{t.t}</h3>
              <p className="mt-2 text-sm text-[var(--color-mm-muted)] leading-relaxed">{t.b}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────── Final CTA ──────────────────────────────── */
function Cta({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="border-b border-[var(--color-mm-line)]">
      <div className="max-w-[1280px] mx-auto px-6 sm:px-10 py-24 text-center">
        <div className="eyebrow">Open an account in five minutes</div>
        <h2 className="mt-6 font-display text-[clamp(56px,9vw,140px)] leading-[0.9] tracking-tight max-w-5xl mx-auto">
          Stop burning <span className="italic text-[var(--color-mm-accent)]">good medicine.</span>
        </h2>
        <p className="mt-8 text-[16px] leading-relaxed text-[var(--color-mm-muted)] max-w-xl mx-auto">
          Onboarding is free. Verification is included. The network unlocks
          the moment your documents are approved.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {!signedIn ? (
            <>
              <Button asChild size="lg" variant="primary">
                <Link to="/sign-up">
                  Open an account <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link to="/sign-in" search={{}}>Sign in instead</Link>
              </Button>
            </>
          ) : (
            <Button asChild size="lg" variant="primary">
              <Link to="/dashboard">
                Go to your workspace <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}

/* ──────────────────────────────── Footer ────────────────────────────────── */
function SiteFooter() {
  return (
    <footer className="bg-white">
      <div className="max-w-[1280px] mx-auto px-6 sm:px-10 py-14 grid grid-cols-12 gap-8">
        <div className="col-span-12 md:col-span-5">
          <div className="flex items-center gap-2.5">
            <Mark />
            <span className="font-display text-[22px]">MedMove</span>
          </div>
          <p className="mt-5 text-sm text-[var(--color-mm-muted)] max-w-sm leading-relaxed">
            A verified, closed-loop network for redirecting in-date,
            sealed medicine to the patients who need it.
          </p>
        </div>
        <FooterCol title="Network" items={['Pharmacies', 'Clinics', 'Hospitals', 'NGOs', 'Distributors', 'Logistics partners']} />
        <FooterCol title="Platform" items={['Verification', 'Listings', 'Requests', 'Deliveries', 'Audit log']} />
        <FooterCol title="Company" items={['About', 'Contact', 'Press', 'Privacy', 'Terms']} />
      </div>
      <div className="border-t border-[var(--color-mm-line)]">
        <div className="max-w-[1280px] mx-auto px-6 sm:px-10 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-[var(--color-mm-muted)]">
          <span>© {new Date().getFullYear()} MedMove. Verified-only network.</span>
          <span className="font-display italic">Medicine, redirected.</span>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="col-span-6 md:col-span-2">
      <div className="eyebrow">{title}</div>
      <ul className="mt-5 space-y-3 text-sm text-[var(--color-mm-muted)]">
        {items.map((it) => (
          <li key={it}>
            <a href="#" className="hover:text-[var(--color-mm-ink)] transition-colors">{it}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ──────────────────────────── Section heading ───────────────────────────── */
function SectionHeading({
  eyebrow,
  title,
  lede,
}: {
  eyebrow: string
  title: React.ReactNode
  lede?: string
}) {
  return (
    <div className="grid grid-cols-12 gap-8 items-end">
      <div className="col-span-12 md:col-span-7">
        <div className="eyebrow">{eyebrow}</div>
        <h2 className="mt-5 font-display text-[clamp(40px,5.4vw,72px)] leading-[0.95] tracking-tight">
          {title}
        </h2>
      </div>
      {lede && (
        <p className="col-span-12 md:col-span-5 text-[15px] leading-relaxed text-[var(--color-mm-muted)] max-w-md md:justify-self-end">
          {lede}
        </p>
      )}
    </div>
  )
}
