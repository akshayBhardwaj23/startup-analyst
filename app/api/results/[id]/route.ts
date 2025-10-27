import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as any;
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  // Get the user ID
  let userId = (session as any).user?.id as string | undefined;
  if (!userId && (session as any).user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: (session as any).user.email as string },
    });
    userId = user?.id;
  }
  if (!userId) {
    return NextResponse.json({ error: "User not found" }, { status: 500 });
  }

  // Fetch the analysis run
  const run = await prisma.analysisRun.findFirst({
    where: {
      id,
      userId,
    },
    select: {
      id: true,
      companyName: true,
      brief: true,
      fileUrls: true,
      fileNames: true,
      createdAt: true,
      companyId: true,
    },
  });

  if (!run) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }

  // Fetch previous runs for the same company
  const previous = await prisma.analysisRun.findMany({
    where: {
      userId,
      companyId: run.companyId,
      id: { not: run.id },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, createdAt: true, brief: true },
  });

  // Note: We don't have webSearch stored in the database, so it will be null
  // You might want to re-run the web search here if needed
  return NextResponse.json({
    brief: run.brief,
    companyName: run.companyName,
    createdAt: run.createdAt,
    webSearch: null, // Could be fetched again if needed
    previousRuns: previous,
  });
}
