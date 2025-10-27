import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as any;
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { companyId } = await params;
  if (!companyId) {
    return NextResponse.json(
      { error: "Company ID is required" },
      { status: 400 }
    );
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

  // Fetch the company
  const company = await prisma.company.findFirst({
    where: { id: companyId, userId },
  });

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  // Fetch all analysis runs for this company
  const runs = await prisma.analysisRun.findMany({
    where: { companyId: company.id, userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      industry: true,
      stage: true,
    },
  });

  return NextResponse.json({
    company: { name: company.name },
    runs,
  });
}
