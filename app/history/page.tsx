import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function HistoryPage() {
  const session = (await getServerSession(authOptions as any)) as any;
  if (!session?.user) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center px-5">
        <div className="text-sm opacity-80">
          Please sign in to view your history.
        </div>
      </div>
    );
  }
  const userId = session.user.id as string;
  const companies = await prisma.company.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { runs: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  return (
    <div className="min-h-screen w-full px-5 py-10 sm:px-8 md:px-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold tracking-tight mb-6">History</h1>
        <ul className="space-y-3">
          {companies.map((c: any) => (
            <li
              key={c.id}
              className="rounded-md border border-white/10 p-3 bg-white/5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{c.name}</div>
                  {c.runs[0] && (
                    <div className="text-xs opacity-70">
                      Last run: {new Date(c.runs[0].createdAt).toLocaleString()}
                    </div>
                  )}
                </div>
                <Link
                  href={`/history/${c.id}`}
                  className="text-xs px-3 py-1.5 rounded bg-indigo-500/20 border border-indigo-500/30 hover:bg-indigo-500/30"
                >
                  View
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
