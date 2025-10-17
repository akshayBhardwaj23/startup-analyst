import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function CompanyHistoryPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const session = (await getServerSession(authOptions as any)) as any;
  if (!session?.user) return null;
  const userId = session.user.id as string;
  const company = await prisma.company.findFirst({
    where: { id: companyId, userId },
  });
  if (!company) return null;
  const runs = await prisma.analysisRun.findMany({
    where: { companyId: company.id, userId },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="min-h-screen w-full px-5 py-10 sm:px-8 md:px-12">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {company.name} – Previous Analyses
        </h1>
        <div className="space-y-3">
          {runs.map((r: { id: string; createdAt: Date; brief: unknown }) => (
            <details
              key={r.id}
              className="rounded-md border border-white/10 bg-white/5"
            >
              <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
                {new Date(r.createdAt).toLocaleString()}
              </summary>
              <div className="p-3 text-sm overflow-auto">
                <pre className="whitespace-pre-wrap text-xs opacity-90">
                  {JSON.stringify(r.brief, null, 2)}
                </pre>
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
