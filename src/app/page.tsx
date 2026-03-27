import Link from "next/link";
import { Button } from "@/components/ui";
import { HeroDemo } from "@/components/landing/HeroDemo";
import { PRICING_PLANS } from "@/lib/stripe";
import { BRAND_APP_HOST, BRAND_NAME, BRAND_SUPPORT_EMAIL } from "@/lib/brand";
import {
  RocketLaunchIcon,
  DocumentTextIcon,
  CalendarIcon,
  CheckIcon,
  StarIcon,
} from "@heroicons/react/24/solid";
import {
  GlobeAltIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  VideoCameraIcon,
  MagnifyingGlassIcon,
  BuildingStorefrontIcon,
} from "@heroicons/react/24/outline";

const CHANNELS = [
  { icon: MagnifyingGlassIcon, label: "SEO Blog Posts", color: "text-emerald-600 bg-emerald-50" },
  { icon: ChatBubbleLeftRightIcon, label: "Twitter / X", color: "text-sky-600 bg-sky-50" },
  { icon: GlobeAltIcon, label: "Reddit", color: "text-orange-600 bg-orange-50" },
  { icon: EnvelopeIcon, label: "Cold Email", color: "text-violet-600 bg-violet-50" },
  { icon: VideoCameraIcon, label: "TikTok / Reels", color: "text-pink-600 bg-pink-50" },
  { icon: BuildingStorefrontIcon, label: "Directories", color: "text-indigo-600 bg-indigo-50" },
];

const STEPS = [
  {
    number: "01",
    icon: GlobeAltIcon,
    title: "Paste Your URL",
    description:
      `Drop your live site URL. ${BRAND_NAME} crawls it, reads every word, and figures out exactly what you've built and who needs it.`,
  },
  {
    number: "02",
    icon: DocumentTextIcon,
    title: "Review Your Plan",
    description:
      "Get a complete marketing brief, a 30-day action plan, and all the content pre-written — blog posts, tweets, Reddit drafts, cold emails, TikTok scripts, directory submissions.",
  },
  {
    number: "03",
    icon: RocketLaunchIcon,
    title: "Approve & Launch",
    description:
      `Review content in your queue, edit anything you want, and approve. ${BRAND_NAME} handles the rest — tracking what goes live, what's pending, and what's working.`,
  },
];

const FAQS = [
  {
    q: "Do I need any marketing experience?",
    a: `None. ${BRAND_NAME} is built for developers and founders who know how to build but have never done marketing. It handles the strategy, the writing, and the execution planning.`,
  },
  {
    q: "Will it spam people or post without my permission?",
    a: "Never. You approve every piece of content before it goes anywhere. The only exceptions are low-risk items you explicitly mark as auto-publishable (like directory submissions). Reddit drafts are always human-reviewed.",
  },
  {
    q: "What if I don't like the generated content?",
    a: `Edit it inline in the approval queue. Or reject it and request a regeneration. Every content card has an edit button — it's your voice, ${BRAND_NAME} just does the first draft.`,
  },
  {
    q: "How is this different from just using ChatGPT?",
    a: `ChatGPT writes when you ask it to. ${BRAND_NAME} analyzes your site, builds a multi-channel strategy tailored to your specific product and audience, generates all content with that context, schedules it, and tracks what gets published. It's an execution engine, not a chat interface.`,
  },
  {
    q: "Can I use this for multiple products?",
    a: "Yes — Growth and Agency plans support multiple sites. Each site gets its own marketing brief, 30-day plan, and content queue. Completely independent operations.",
  },
  {
    q: "Does it work for already-launched products too?",
    a: `Absolutely. Whether you launched yesterday or a year ago with no traction, ${BRAND_NAME} builds you a fresh marketing operation from scratch.`,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
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

      {/* Hero */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-50 text-brand-700 rounded-full text-sm font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
            AI-powered marketing for indie hackers
          </div>

          <h1 className="text-6xl md:text-8xl font-bold text-gray-900 leading-[1.05] tracking-tight mb-4">
            Your product is live.{" "}
            <span className="text-brand-500">Where are your customers?</span>
          </h1>

          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-8 leading-relaxed">
            {BRAND_NAME} analyzes your website, builds a complete marketing strategy,
            generates all the content, and executes across SEO, social, Reddit, email,
            and directories — all on autopilot.
          </p>

          {/* Interactive hero input */}
          <div className="mb-5">
            <HeroDemo />
          </div>

          <p className="text-sm text-gray-400">
            7-day free trial · No credit card · Analysis in 30 seconds
          </p>
        </div>

        {/* Hero mockup */}
        <div className="max-w-6xl mx-auto mt-16 rounded-2xl border border-gray-200 shadow-2xl overflow-hidden bg-gray-50">
          <div className="bg-gray-800 h-9 flex items-center px-4 gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <div className="mx-auto text-xs text-gray-400 font-mono">{BRAND_APP_HOST}</div>
          </div>
          <div className="p-8 bg-[#f8fafc]">
            <div className="grid grid-cols-4 gap-4 mb-6">
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
                { channel: "✍️ Blog", title: "Why Freelancers Hate Invoicing (And How to Fix It)", status: "Approved", statusColor: "text-emerald-600 bg-emerald-50" },
                { channel: "𝕏 Twitter", title: "Hot take: your landing page is probably for you, not...", status: "Pending", statusColor: "text-amber-600 bg-amber-50" },
                { channel: "🔴 Reddit", title: "r/freelance — comment on 'what invoicing tools do you use'", status: "Pending", statusColor: "text-amber-600 bg-amber-50" },
                { channel: "📋 Directory", title: "Product Hunt submission — ready to copy/paste", status: "Ready", statusColor: "text-brand-600 bg-brand-50" },
              ].map((item) => (
                <div key={item.title} className="bg-white rounded-xl border border-gray-100 shadow-card p-4 flex items-center gap-4">
                  <span className="text-lg w-8">{item.channel.split(" ")[0]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.channel.split(" ").slice(1).join(" ")}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${item.statusColor}`}>
                    {item.status}
                  </span>
                  <button className="px-3 py-1.5 bg-brand-500 text-white text-xs font-medium rounded-lg">
                    Approve
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              From URL to customers in minutes
            </h2>
            <p className="text-lg text-gray-500">
              No onboarding forms. No strategy decks. Just paste and go.
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

      {/* Channels */}
      <section id="channels" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Every channel, one platform
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              {BRAND_NAME} generates platform-native content for every major marketing channel.
              Not generic copy — tailored to your product, your customer, and each platform's culture.
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

      {/* Social Proof Placeholder */}
      <section className="py-16 px-6 bg-brand-500">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-brand-100 text-lg mb-4">Trusted by indie hackers shipping products</p>
          <div className="flex items-center justify-center gap-1 mb-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <StarIcon key={i} className="w-5 h-5 text-yellow-300" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {[
              {
                quote: `I shipped 3 products in the last year and none of them had more than 50 users. ${BRAND_NAME} changed that — my last launch hit 400 signups in week 1.`,
                author: "Founder, SaaS indie hacker",
              },
              {
                quote: `I'm a developer, not a marketer. ${BRAND_NAME} wrote content that genuinely sounds like me. Approved 80% of it without edits.`,
                author: "Solo founder",
              },
              {
                quote: "The marketing brief alone was worth it. It told me things about my own product I hadn't articulated in 6 months of building.",
                author: "Bootstrapped founder",
              },
            ].map((t, i) => (
              <div key={i} className="bg-white/10 rounded-xl p-6 text-left">
                <p className="text-white/90 text-sm leading-relaxed mb-4">"{t.quote}"</p>
                <p className="text-brand-200 text-xs font-medium">— {t.author}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Simple pricing, serious results
            </h2>
            <p className="text-lg text-gray-500">
              7-day free trial on Growth. No credit card required.
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

      {/* FAQ */}
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

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Your next customer is out there.<br />
            <span className="text-brand-500">Go find them.</span>
          </h2>
          <p className="text-lg text-gray-500 mb-10">
            Paste your URL. Get your marketing plan in minutes.
            Start publishing this week.
          </p>
          <Link href="/signup">
            <Button size="lg" className="px-10 py-4 text-base">
              <RocketLaunchIcon className="w-5 h-5" />
              Analyze My Product Free →
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
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
