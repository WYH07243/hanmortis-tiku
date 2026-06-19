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

    const wrongQuestions = await prisma.wrongQuestion.findMany({
      where: { userId: session.user.id },
      include: {
        question: {
          select: {
            id: true,
            type: true,
            content: true,
            answer: true,
            explanation: true,
            difficulty: true,
            tags: true,
            questionBank: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { lastWrongAt: "desc" },
    });

    return NextResponse.json({
      wrongQuestions: wrongQuestions.map((wq) => ({
        id: wq.id,
        questionId: wq.questionId,
        wrongCount: wq.wrongCount,
        lastWrongAt: wq.lastWrongAt,
        question: {
          id: wq.question.id,
          type: wq.question.type,
          content: wq.question.content,
          answer: wq.question.answer,
          explanation: wq.question.explanation,
          difficulty: wq.question.difficulty,
          tags: JSON.parse(wq.question.tags || "[]"),
        },
        bankName: wq.question.questionBank.name,
        bankId: wq.question.questionBank.id,
      })),
      total: wrongQuestions.length,
    });
  } catch (error) {
    console.error("获取错题本失败:", error);
    return NextResponse.json({ error: "获取错题本失败" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { questionId } = await req.json();

    if (questionId) {
      // 删除单个错题
      await prisma.wrongQuestion.deleteMany({
        where: { userId: session.user.id, questionId },
      });
    } else {
      // 清空所有错题
      await prisma.wrongQuestion.deleteMany({
        where: { userId: session.user.id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除错题失败:", error);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
