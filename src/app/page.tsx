import Link from "next/link";
import Script from "next/script";
import { Button } from "@/components/ui";
import { HeroDemo } from "@/components/landing/HeroDemo";
import { PRICING_PLANS } from "@/lib/stripe";
import { BRAND_APP_HOST, BRAND_NAME, BRAND_SUPPORT_EMAIL } from "@/lib/brand";
import { buildFaqJsonLd, buildWebPageJsonLd, marketingPages } from "@/lib/seo";
import {
  RocketLaunchIcon,
  DocumentTextIcon,
  CheckIcon,
} from "@heroicons/react/24/solid";
import {
  GlobeAltIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon,
  BuildingStorefrontIcon,
  BoltIcon,
  BriefcaseIcon,
} from "@heroicons/react/24/outline";

const CHANNELS = [
  { icon: MagnifyingGlassIcon, label: "SEO Blog Posts", color: "text-emerald-600 bg-emerald-50" },
  { icon: ChatBubbleLeftRightIcon, label: "Twitter / X", color: "text-sky-600 bg-sky-50" },
  { icon: BriefcaseIcon, label: "LinkedIn", color: "text-blue-600 bg-blue-50" },
  { icon: EnvelopeIcon, label: "Email", color: "text-violet-600 bg-violet-50" },
  { icon: BuildingStorefrontIcon, label: "Directories", color: "text-indigo-600 bg-indigo-50" },
  { icon: GlobeAltIcon, label: "Launch surfaces", color: "text-orange-600 bg-orange-50" },
];

const STEPS = [
  {
    number: "01",
    icon: GlobeAltIcon,
    title: "Paste Your URL",
    description:
      `Drop your live SaaS URL. ${BRAND_NAME} crawls it, reads the positioning, and figures out what you built, who it is for, and where distribution should start.`,
  },
  {
    number: "02",
    icon: DocumentTextIcon,
    title: "Review Your Plan",
    description:
      "Get a sharp marketing brief, a 30-day distribution plan, and starter drafts for the channels that matter most first.",
  },
  {
    number: "03",
    icon: BoltIcon,
    title: "Ship Through The Queue",
    description:
      `Review, edit, approve, and publish from one workflow. Automation can layer in later, but the first win is consistent execution.`,
  },
];

const FAQS = [
  {
    q: "Do I need any marketing experience?",
    a: `No. ${BRAND_NAME} is built for technical founders who know how to build products but do not want to invent their distribution strategy from scratch every week.`,
  },
  {
    q: "Will it post without my permission?",
    a: `By default, no. ${BRAND_NAME} is queue-first. You review drafts before they ship, and only enable automation after the workflow is dialed in.`,
  },
  {
    q: "What if I don't like the generated content?",
    a: `Edit it in the queue, reject it, or regenerate it. The goal is not to replace your judgment — it is to give you a much better starting point and a repeatable workflow.`,
  },
  {
    q: "How is this different from just using ChatGPT?",
    a: `ChatGPT gives you isolated outputs. ${BRAND_NAME} turns your product into an operating system for distribution: brief, plan, drafts, queue, publishing workflow, and performance context — all tied to the same site.`,
  },
  {
    q: "Can I use this for multiple products?",
    a: "Yes — paid plans support multiple sites. Each site gets its own brief, plan, queue, and performance context.",
  },
  {
    q: "Who is this best for right now?",
    a: `${BRAND_NAME} is best suited today for indie SaaS founders, solo technical founders, and micro-SaaS builders who need consistent distribution more than vague AI copy.`,
  },
];

export default function LandingPage() {
  const faqJsonLd = buildFaqJsonLd(FAQS);
  const pageJsonLd = buildWebPageJsonLd({
    title: `${BRAND_NAME} — Distribution system for indie SaaS founders`,
    description:
      `Paste your SaaS URL and ${BRAND_NAME} turns it into a 30-day distribution plan, ready-to-review drafts, and a simple publishing workflow.`,
    path: "/",
  });

  return (
    <div className="min-h-screen bg-white">
      <Script id="homepage-jsonld" type="application/ld+json">
        {JSON.stringify(pageJsonLd)}
      </Script>
      <Script id="homepage-faq-jsonld" type="application/ld+json">
        {JSON.stringify(faqJsonLd)}
      </Script>
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <RocketLaunchIcon className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">{BRAND_NAME}</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How it works</a>
            <a href="#channels" className="hover:text-gray-900 transition-colors">Channels</a>
            <a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-gray-900 transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">
              Sign in
            </Link>
            <Link href="/signup">
              <Button size="sm">Analyze My Product Free →</Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-50 text-brand-700 rounded-full text-sm font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
            Distribution system for indie SaaS founders
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-8xl font-bold text-gray-900 leading-[1.05] tracking-tight mb-4">
            Your product is live.{" "}
            <span className="text-brand-500">Now build distribution that compounds.</span>
          </h1>

          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-8 leading-relaxed">
            Paste your SaaS URL. Get a sharp marketing brief, a 30-day distribution plan, and ready-to-review drafts for blog, X, LinkedIn, email, and launch surfaces.
          </p>

          <div className="mb-5">
            <HeroDemo />
          </div>

          <p className="text-sm text-gray-400">
            7-day free trial · No credit card · Strategy first, automation second
          </p>
        </div>

        <div className="max-w-6xl mx-auto mt-16 rounded-2xl border border-gray-200 shadow-2xl overflow-hidden bg-gray-50">
          <div className="bg-gray-800 h-9 flex items-center px-4 gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <div className="mx-auto text-xs text-gray-400 font-mono">{BRAND_APP_HOST}</div>
          </div>
          <div className="p-8 bg-[#f8fafc]">
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                { label: "Content Generated", value: "42", color: "text-brand-600" },
                { label: "Approved", value: "28", color: "text-emerald-600" },
                { label: "Published", value: "14", color: "text-sky-600" },
                { label: "Est. Reach", value: "8.2K", color: "text-orange-600" },
              ].map((stat) => (
                <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-card">
                  <p className="text-xs text-gray-400 mb-1">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {[
                { channel: "✍️ Blog", title: "Why technical founders underinvest in distribution", status: "Approved", statusColor: "text-emerald-600 bg-emerald-50" },
                { channel: "𝕏 Twitter", title: "You do not need more startup advice. You need consistent...", status: "Pending", statusColor: "text-amber-600 bg-amber-50" },
                { channel: "💼 LinkedIn", title: "A founder update that explains the product in plain English", status: "Pending", statusColor: "text-amber-600 bg-amber-50" },
                { channel: "📋 Directory", title: "Launch directory submission — ready to copy/paste", status: "Ready", statusColor: "text-brand-600 bg-brand-50" },
              ].map((item) => (
                <div key={item.title} className="bg-white rounded-xl border border-gray-100 shadow-card p-4 flex items-center gap-3">
                  <span className="text-lg w-8 flex-shrink-0">{item.channel.split(" ")[0]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.channel.split(" ").slice(1).join(" ")}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${item.statusColor}`}>
                    {item.status}
                  </span>
                  <button className="hidden sm:block px-3 py-1.5 bg-brand-500 text-white text-xs font-medium rounded-lg flex-shrink-0">
                    Review
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              From product URL to execution plan in minutes
            </h2>
            <p className="text-lg text-gray-500">
              Start with strategy, then move into drafts, review, publishing, and learning.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((step) => (
              <div key={step.number} className="relative">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-8 h-full">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-4xl font-black text-gray-100">{step.number}</span>
                    <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                      <step.icon className="w-5 h-5 text-brand-600" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-gray-500 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="channels" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              One place to plan, draft, and publish
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              {BRAND_NAME} starts with the channels founders can actually sustain. Strategy comes first. Drafts and publishing follow.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {CHANNELS.map(({ icon: Icon, label, color }) => (
              <div key={label} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-gray-900">{label}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-brand-500">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-brand-100 text-sm font-semibold uppercase tracking-widest mb-4">Built in public</p>
          <h2 className="text-3xl font-bold text-white mb-4">
            {BRAND_NAME} markets itself using {BRAND_NAME}.
          </h2>
          <p className="text-brand-100 text-lg leading-relaxed max-w-2xl mx-auto mb-8">
            The blog, launch pages, and founder distribution engine are all being built with the same system. The goal is not fake autonomy. The goal is a repeatable publishing loop that compounds.
          </p>
          <div className="grid gap-4 text-left sm:grid-cols-3 mb-8">
            {[
              "Hosted blog pages can rank and compound over time.",
              "Tracked links tie content to clicks, signups, and revenue.",
              "Higher-risk channels stay in review instead of posting blindly.",
            ].map((proof) => (
              <div key={proof} className="rounded-2xl bg-white/10 px-4 py-4 text-sm leading-6 text-white/90 ring-1 ring-white/15">
                {proof}
              </div>
            ))}
          </div>
          <a
            href={`/blog/breakthroughpilot`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-brand-700 font-semibold rounded-lg text-sm hover:bg-brand-50 transition-colors"
          >
            Read the live blog →
          </a>
        </div>
      </section>

      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12 text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Built for technical founders who need consistency</h2>
            <p className="text-lg text-gray-500 max-w-3xl mx-auto">
              Most founders do not need more vague AI copy. They need positioning, channel priorities, ready drafts, and a queue that helps them actually ship.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {marketingPages.map((page) => (
              <Link
                key={page.slug}
                href={`/${page.slug}`}
                className="rounded-3xl border border-gray-100 bg-white p-7 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-600">{page.eyebrow}</p>
                <h3 className="mt-4 text-2xl font-bold text-gray-900">{page.title}</h3>
                <p className="mt-4 text-sm leading-6 text-gray-600">{page.description}</p>
                <p className="mt-6 text-sm font-semibold text-brand-600">Read page →</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Simple pricing, serious execution
            </h2>
            <p className="text-lg text-gray-500">
              Start with strategy and execution support. Add automation once the loop is working.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PRICING_PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl border p-8 ${
                  plan.highlighted
                    ? "border-brand-400 shadow-brand ring-2 ring-brand-200"
                    : "border-gray-100 shadow-card"
                }`}
              >
                {plan.highlighted && (
                  <div className="inline-block px-3 py-1 bg-brand-500 text-white text-xs font-bold rounded-full mb-4">
                    MOST POPULAR
                  </div>
                )}
                <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                <p className="text-sm text-gray-500 mb-6">{plan.description}</p>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-4xl font-black text-gray-900">${plan.price}</span>
                  <span className="text-gray-400">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <CheckIcon className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link href="/signup">
                  <Button
                    variant={plan.highlighted ? "primary" : "outline"}
                    className="w-full"
                    size="lg"
                  >
                    {plan.highlighted ? "Start Free Trial" : "Get Started"}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="py-24 px-6 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 text-center mb-16">
            Questions? Answered.
          </h2>
          <div className="space-y-8">
            {FAQS.map((faq) => (
              <div key={faq.q} className="border-b border-gray-100 pb-8 last:border-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{faq.q}</h3>
                <p className="text-gray-500 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-red-100 bg-red-50 p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-red-700">The weak approach</p>
            <h2 className="mt-4 text-3xl font-bold text-gray-900">Prompting ChatGPT every time you need marketing</h2>
            <ul className="mt-6 space-y-3 text-sm leading-6 text-gray-700">
              <li>• You start from scratch every time.</li>
              <li>• There is no persistent strategy across channels.</li>
              <li>• Publishing and approvals live somewhere else.</li>
              <li>• You rarely connect content to actual conversions.</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">The stronger approach</p>
            <h2 className="mt-4 text-3xl font-bold text-gray-900">Using {BRAND_NAME} as a distribution operating system</h2>
            <ul className="mt-6 space-y-3 text-sm leading-6 text-gray-700">
              <li>• Your live product becomes the source of truth.</li>
              <li>• The app builds strategy before it writes content.</li>
              <li>• Drafts, review, publishing, tracking, and iteration stay in one loop.</li>
              <li>• You can see what content creates clicks, signups, activation, and revenue.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Your product already exists.<br />
            <span className="text-brand-500">Your distribution system should too.</span>
          </h2>
          <p className="text-lg text-gray-500 mb-10">
            Paste your URL. Get a clear plan, generate starter drafts, and start shipping this week.
          </p>
          <Link href="/signup">
            <Button size="lg" className="px-10 py-4 text-base">
              <RocketLaunchIcon className="w-5 h-5" />
              Analyze My Product Free →
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-gray-100 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
              <RocketLaunchIcon className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-gray-900">{BRAND_NAME}</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link href="/privacy" className="hover:text-gray-600">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-600">Terms</Link>
            <a href={`mailto:${BRAND_SUPPORT_EMAIL}`} className="hover:text-gray-600">Contact</a>
          </div>
          <p className="text-sm text-gray-400">© 2026 {BRAND_NAME}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
