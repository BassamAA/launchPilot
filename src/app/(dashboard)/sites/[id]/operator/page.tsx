import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase";
import { OperatorChat } from "@/components/operator/OperatorChat";

export default async function OperatorPage({ params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-600">Operator</p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Talk to your growth operator</h1>
        <p className="mt-2 text-sm text-gray-500 max-w-2xl">
          This is the conversational layer for strategy, recommendations, and what to post next.
        </p>
      </div>

      <OperatorChat siteId={params.id} />
    </div>
  );
}
