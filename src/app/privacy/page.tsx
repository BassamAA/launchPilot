import Link from "next/link";
import { RocketLaunchIcon } from "@heroicons/react/24/solid";
import { BRAND_NAME, BRAND_SUPPORT_EMAIL } from "@/lib/brand";

export const metadata = { title: `Privacy Policy — ${BRAND_NAME}` };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
              <RocketLaunchIcon className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-gray-900">{BRAND_NAME}</span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
        <p className="text-gray-400 text-sm mb-12">Last updated: March 2026</p>

        <div className="prose prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">What we collect</h2>
            <p className="text-gray-600 leading-relaxed">
              We collect your email address, your site URL, and the content you generate through {BRAND_NAME}. We also collect usage data (pages visited, features used) to improve the product.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">How we use it</h2>
            <p className="text-gray-600 leading-relaxed">
              Your data is used solely to provide the {BRAND_NAME} service — generating your marketing plan, storing your content, and tracking what you publish. We don't sell your data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Third-party services</h2>
            <p className="text-gray-600 leading-relaxed">
              {BRAND_NAME} uses Supabase (database and auth), Stripe (payments), Resend (transactional email), and Anthropic (AI content generation). Each service has its own privacy policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Data deletion</h2>
            <p className="text-gray-600 leading-relaxed">
              You can request deletion of your account and all associated data at any time by emailing{" "}
              <a href={`mailto:${BRAND_SUPPORT_EMAIL}`} className="text-brand-600 hover:underline">{BRAND_SUPPORT_EMAIL}</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Contact</h2>
            <p className="text-gray-600 leading-relaxed">
              Questions? Email{" "}
              <a href={`mailto:${BRAND_SUPPORT_EMAIL}`} className="text-brand-600 hover:underline">{BRAND_SUPPORT_EMAIL}</a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
