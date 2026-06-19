import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ bankId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { bankId } = await params;

    const bank = await prisma.questionBank.findFirst({
      where: { id: bankId, userId: session.user.id },
      include: {
        questions: {
          select: {
            id: true,
            type: true,
            content: true,
            answer: true,
            explanation: true,
            difficulty: true,
            tags: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!bank) {
      return NextResponse.json({ error: "题库不存在" }, { status: 404 });
    }

    return NextResponse.json({
      bank: {
        id: bank.id,
        name: bank.name,
        description: bank.description,
      },
      questions: bank.questions.map((q) => ({
        id: q.id,
        type: q.type,
        content: q.content,
        // 不返回答案！客户端用单独的API验证
        explanation: q.explanation,
        difficulty: q.difficulty,
        tags: JSON.parse(q.tags || "[]"),
      })),
      total: bank.questions.length,
    });
  } catch (error) {
    console.error("获取题目失败:", error);
    return NextResponse.json({ error: "获取题目失败" }, { status: 500 });
  }
}
