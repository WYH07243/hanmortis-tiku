import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { questionId, userAnswer, timeSpent, mode } = await req.json();

    if (!questionId || userAnswer === undefined) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    // 获取题目正确答案
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      return NextResponse.json({ error: "题目不存在" }, { status: 404 });
    }

    const answer = question.answer as any;
    let isCorrect = false;

    // 根据题型判断对错
    switch (question.type) {
      case "CHOICE": {
        const userAns = userAnswer as { selectedIndex: number };
        isCorrect = userAns.selectedIndex === answer.data.correctIndex;
        break;
      }
      case "TRUE_FALSE": {
        const userAns = userAnswer as { value: boolean };
        isCorrect = userAns.value === answer.data.correct;
        break;
      }
      case "SHORT_ANSWER": {
        const userAns = userAnswer as { text: string };
        const userText = userAns.text?.trim().toLowerCase() || "";
        // 检查是否包含所有关键词
        const keywords = answer.data.keywords || [];
        if (keywords.length > 0) {
          isCorrect = keywords.every((kw: string) =>
            userText.includes(kw.toLowerCase())
          );
        } else {
          // 简单字符串匹配
          const refAnswer = (answer.data.referenceAnswer || "").toLowerCase();
          isCorrect = userText === refAnswer;
        }
        break;
      }
      case "CALCULATION": {
        const userAns = userAnswer as { value: string };
        const refValue = (answer.data.value || "").trim();
        const userValue = (userAns.value || "").trim();
        
        // 尝试数值比较
        const tolerance = answer.data.tolerance || 0.001;
        const refNum = parseFloat(refValue);
        const userNum = parseFloat(userValue);
        
        if (!isNaN(refNum) && !isNaN(userNum)) {
          isCorrect = Math.abs(refNum - userNum) <= tolerance;
        } else {
          isCorrect = userValue === refValue;
        }
        break;
      }
    }

    // 保存练习记录
    await prisma.practiceRecord.create({
      data: {
        userId: session.user.id,
        questionId,
        isCorrect,
        userAnswer: userAnswer as any,
        timeSpent: timeSpent || null,
        mode: mode || "PRACTICE",
      },
    });

    // 如果答错，更新错题本
    if (!isCorrect) {
      await prisma.wrongQuestion.upsert({
        where: {
          userId_questionId: {
            userId: session.user.id,
            questionId,
          },
        },
        create: {
          userId: session.user.id,
          questionId,
          wrongCount: 1,
        },
        update: {
          wrongCount: { increment: 1 },
          lastWrongAt: new Date(),
        },
      });
    } else {
      // 答对了，如果错题本里有就删除
      await prisma.wrongQuestion.deleteMany({
        where: {
          userId: session.user.id,
          questionId,
        },
      });
    }

    return NextResponse.json({
      isCorrect,
      correctAnswer: answer,
      explanation: question.explanation,
    });
  } catch (error) {
    console.error("提交答案失败:", error);
    return NextResponse.json({ error: "提交失败" }, { status: 500 });
  }
}
