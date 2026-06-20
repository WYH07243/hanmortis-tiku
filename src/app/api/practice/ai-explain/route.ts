import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const runtime = "nodejs";

function formatUserAnswer(question: any, userAnswer: any) {
  if (!userAnswer) return "用户还没有作答。";

  switch (question.type) {
    case "CHOICE": {
      const index = userAnswer.selectedIndex;
      const option = question.content?.data?.options?.[index];
      if (typeof index !== "number" || !option) return "用户还没有作答。";
      return `用户选择了 ${String.fromCharCode(65 + index)}. ${option}`;
    }
    case "TRUE_FALSE":
      return typeof userAnswer.value === "boolean"
        ? `用户选择了${userAnswer.value ? "正确" : "错误"}`
        : "用户还没有作答。";
    case "SHORT_ANSWER":
      return userAnswer.text?.trim() ? `用户答案：${userAnswer.text.trim()}` : "用户还没有作答。";
    case "CALCULATION":
      return userAnswer.value?.trim() ? `用户答案：${userAnswer.value.trim()}` : "用户还没有作答。";
    default:
      return "用户还没有作答。";
  }
}

function buildPrompt(question: any, userAnswer: any, submitted: boolean, correctAnswer: any) {
  const stem = question.content?.data?.stem || "";
  const options = Array.isArray(question.content?.data?.options)
    ? question.content.data.options.map((option: string, index: number) => `${String.fromCharCode(65 + index)}. ${option}`).join("\n")
    : "";
  const correct = submitted && correctAnswer ? JSON.stringify(correctAnswer.data) : "尚未判题";

  return `你是一个中文题库辅导老师。请只返回 JSON，不要输出 Markdown 代码块。\n\n题型：${question.type}\n题干：${stem}\n${options ? `选项：\n${options}\n` : ""}用户作答：${formatUserAnswer(question, userAnswer)}\n判题状态：${submitted ? "已提交" : "未提交"}\n标准答案数据：${correct}\n题目解析：${question.explanation || "无"}\n\n请返回如下结构的 JSON：\n{\n  \"summary\": \"先用 2-4 句解释题目考什么、应该怎么想\",\n  \"steps\": [\"步骤1\", \"步骤2\", \"步骤3\"],\n  \"answerFocus\": \"最后点明最该抓住的判断依据，若用户已答错可顺带指出偏差\"\n}`;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { question, userAnswer, submitted, correctAnswer } = await req.json();
    if (!question?.content?.data?.stem) {
      return NextResponse.json({ error: "题目信息不完整" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

    if (!apiKey) {
      return NextResponse.json(
        { error: "AI 解答尚未配置，请在部署环境中设置 OPENAI_API_KEY。" },
        { status: 503 }
      );
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "你是一个耐心、简洁、擅长讲题的中文老师。",
          },
          {
            role: "user",
            content: buildPrompt(question, userAnswer, submitted, correctAnswer),
          },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("AI 解答失败:", text);
      return NextResponse.json({ error: "AI 解答暂时不可用，请稍后再试。" }, { status: 502 });
    }

    const payload = await response.json();
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "AI 没有返回有效内容。" }, { status: 502 });
    }

    const parsed = JSON.parse(content);
    return NextResponse.json({
      summary: parsed.summary || "AI 暂未生成摘要。",
      steps: Array.isArray(parsed.steps) ? parsed.steps.filter(Boolean).slice(0, 5) : [],
      answerFocus: parsed.answerFocus || "请结合题干和标准答案进一步判断。",
    });
  } catch (error) {
    console.error("AI 解答接口异常:", error);
    return NextResponse.json({ error: "AI 解答暂时不可用，请稍后再试。" }, { status: 500 });
  }
}
