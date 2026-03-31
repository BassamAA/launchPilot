import OnboardingPageClient from "@/components/onboarding/OnboardingPageClient";

export default function OnboardingPage({
  searchParams,
}: {
  searchParams: { url?: string };
}) {
  return <OnboardingPageClient prefillUrl={searchParams.url || ""} />;
}
