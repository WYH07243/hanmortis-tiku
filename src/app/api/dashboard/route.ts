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

    const userId = session.user.id;

    const [totalQuestions, totalBanks, wrongCount, recentRecords, accuracyData] =
      await Promise.all([
        // 总题目数
        prisma.question.count({
          where: { questionBank: { userId } },
        }),
        // 题库数
        prisma.questionBank.count({
          where: { userId },
        }),
        // 错题数
        prisma.wrongQuestion.count({
          where: { userId },
        }),
        // 今日练习数
        prisma.practiceRecord.findMany({
          where: {
            userId,
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
          select: { isCorrect: true },
        }),
        // 所有记录（用于计算正确率）
        prisma.practiceRecord.findMany({
          where: { userId },
          select: { isCorrect: true },
        }),
      ]);

    const todayCount = recentRecords.length;
    const todayCorrect = recentRecords.filter((r) => r.isCorrect).length;
    const totalAnswered = accuracyData.length;
    const totalCorrect = accuracyData.filter((r) => r.isCorrect).length;
    const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

    return NextResponse.json({
      totalQuestions,
      totalBanks,
      practicedToday: todayCount,
      wrongQuestions: wrongCount,
      accuracy,
    });
  } catch (error) {
    console.error("获取仪表盘数据失败:", error);
    return NextResponse.json({ error: "获取数据失败" }, { status: 500 });
  }
}
