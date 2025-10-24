import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ResultView from "@/app/components/ResultView";

export default async function ResultPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const session = (await getServerSession(authOptions as any)) as any;
  if (!session?.user) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center px-5">
        <div className="text-sm opacity-80">
          Please sign in to view the result.
        </div>
      </div>
    );
  }
  const run = await prisma.analysisRun.findFirst({
    where: { id: runId, userId: session.user.id as string },
    include: { company: true },
  });
  if (!run) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center px-5">
        <div className="text-sm opacity-80">Result not found.</div>
      </div>
    );
  }
  const brief = run.brief as any;
  const name = run.companyName || run.company?.name || "Startup";
  return (
    <div className="min-h-screen w-full bg-white dark:bg-slate-950">
      <div className="px-5 py-10 sm:px-8 md:px-12 fade-in">
        <ResultView
          brief={brief}
          companyName={name}
          createdAt={run.createdAt.toISOString()}
        />
      </div>
    </div>
  );
}
