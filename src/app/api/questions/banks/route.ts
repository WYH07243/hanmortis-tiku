import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const banks = await prisma.questionBank.findMany({
      where: { userId: session.user.id },
      include: {
        _count: { select: { questions: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      banks: banks.map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        questionCount: b._count.questions,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      })),
    });
  } catch (error) {
    console.error("获取题库列表失败:", error);
    return NextResponse.json({ error: "获取题库失败" }, { status: 500 });
  }
}
