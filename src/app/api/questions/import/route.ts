import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseFile, detectFileType } from "@/lib/parsers";
import type { ParsedQuestion } from "@/lib/parsers/types";

export const runtime = "nodejs"; // Prisma 需要 Node.js runtime

export async function POST(req: Request) {
  try {
    // 验证登录
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const bankName = (formData.get("bankName") as string) || "默认题库";
    const bankDescription = (formData.get("bankDescription") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "请上传文件" }, { status: 400 });
    }

    // 检测文件类型
    const fileType = detectFileType(file.name);
    if (!fileType) {
      return NextResponse.json(
        { error: "不支持的文件格式，支持: CSV, Excel, DOCX, PDF, TXT" },
        { status: 400 }
      );
    }

    // 解析文件
    const buffer = await file.arrayBuffer();
    const parseResult = await parseFile(buffer, fileType, file.name);

    if (!parseResult.success && parseResult.questions.length === 0) {
      return NextResponse.json(
        {
          error: "文件解析失败",
          details: parseResult.errors,
        },
        { status: 400 }
      );
    }

    // 创建题库并保存题目
    const questionBank = await prisma.questionBank.create({
      data: {
        name: bankName,
        description: bankDescription || `从 ${file.name} 导入`,
        userId: session.user.id,
      },
    });

    const savedQuestions = [];
    for (const q of parseResult.questions) {
      try {
        const saved = await prisma.question.create({
          data: {
            questionBankId: questionBank.id,
            type: q.type,
            content: q.content as any,
            answer: q.answer as any,
            explanation: q.explanation,
            difficulty: q.difficulty || 1,
            tags: JSON.stringify(q.tags || []),
            sourceFile: file.name,
          },
        });
        savedQuestions.push(saved);
      } catch (err) {
        console.error("保存题目失败:", err);
        parseResult.errors.push(`保存题目 "${(q.content.data as any).stem?.substring(0, 50)}" 失败`);
      }
    }

    return NextResponse.json({
      success: true,
      bankId: questionBank.id,
      bankName: questionBank.name,
      savedCount: savedQuestions.length,
      totalProcessed: parseResult.totalProcessed,
      errors: parseResult.errors,
    });
  } catch (error) {
    console.error("导入失败:", error);
    return NextResponse.json(
      { error: "导入失败，请稍后重试" },
      { status: 500 }
    );
  }
}
