import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const HEADING_HINT_PATTERN = /(题量|满分|作答时间|智能分析|单选题|多选题|判断题|简答题|计算题|共\d+题|第\d+部分|章节|作业)/;

function isRenderableQuestion(question: {
  type: string;
  content: any;
  answer: any;
}) {
  const stem = question?.content?.data?.stem?.trim?.() || "";
  if (!stem) return false;

  if (HEADING_HINT_PATTERN.test(stem) && !question?.answer?.data?.referenceAnswer) {
    return false;
  }

  switch (question.type) {
    case "CHOICE": {
      const options = question?.content?.data?.options;
      const correctIndex = question?.answer?.data?.correctIndex;
      return Array.isArray(options) && options.length >= 2 && Number.isInteger(correctIndex);
    }
    case "TRUE_FALSE":
      return typeof question?.answer?.data?.correct === "boolean";
    case "SHORT_ANSWER":
      return Boolean(question?.answer?.data?.referenceAnswer?.trim?.());
    case "CALCULATION":
      return Boolean(question?.answer?.data?.value?.toString?.().trim?.());
    default:
      return false;
  }
}

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

    const validQuestions = bank.questions.filter(isRenderableQuestion);

    return NextResponse.json({
      bank: {
        id: bank.id,
        name: bank.name,
        description: bank.description,
      },
      questions: validQuestions.map((q) => ({
        id: q.id,
        type: q.type,
        content: q.content,
        explanation: q.explanation,
        difficulty: q.difficulty,
        tags: JSON.parse(q.tags || "[]"),
      })),
      total: validQuestions.length,
      skipped: bank.questions.length - validQuestions.length,
    });
  } catch (error) {
    console.error("获取题目失败:", error);
    return NextResponse.json({ error: "获取题目失败" }, { status: 500 });
  }
}
