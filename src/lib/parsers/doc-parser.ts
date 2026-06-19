import mammoth from "mammoth";
import type { ParsedQuestion, ParseResult, QuestionType } from "./types";

// ============== 智能识别正则规则引擎 ==============

// 题号模式: 1. 1、 1） (1) 一、 第1题
const QUESTION_NUM_PATTERN = /(?:^|\n)\s*(?:第\s*)?(\d+)\s*[\.、．\)）题]\s*/gm;

// 选择题选项: A. xxx B. xxx 或 A、 B、 或 A) B)
const CHOICE_OPTION_PATTERN = /[A-F][\.、．\)）]\s*/g;

// 答案标记: 【答案】 答案： 答案: 答：
const ANSWER_PATTERN = /(?:【?\s*答案\s*】?\s*[：:]\s*|^\s*答\s*[：:]\s*)/im;

// 解析标记: 【解析】 解析： 解析: 详解：
const EXPLANATION_PATTERN = /(?:【?\s*(?:解析|详解)\s*】?\s*[：:]\s*)/im;

// 判断题答案: √ × ✓ ✗ 对 错 正确 错误 true false
const TRUE_FALSE_ANSWER = /^[\s]*[√✓对正确trueT][\s]*$/i;
const FALSE_ANSWER = /^[\s]*[×✗错错误falseF][\s]*$/i;

// 难度标记: 【难度】 难度： 难度:
const DIFFICULTY_PATTERN = /(?:【?\s*难度\s*】?\s*[：:]\s*)([1-5])/i;

function detectTypeByContent(text: string): QuestionType {
  // 检查是否有选项 A. B. C. D. 模式
  const optionMatches = text.match(/[A-F][\.、．\)）]\s*\S/g);
  if (optionMatches && optionMatches.length >= 2) {
    return "CHOICE";
  }

  // 检查判断题特征
  if (/[（(]\s*[√✓×✗]\s*[）)]/.test(text) || /判断[对错]/.test(text)) {
    return "TRUE_FALSE";
  }

  // 检查计算题特征
  if (/计算|求解|推导|证明|求\s*\w+|算/.test(text)) {
    return "CALCULATION";
  }

  // 默认简答题
  if (/简答|问答|论述|简述|简述|说明/.test(text)) {
    return "SHORT_ANSWER";
  }

  // 有答案标记的一般是简答
  if (ANSWER_PATTERN.test(text)) {
    return "SHORT_ANSWER";
  }

  return "CHOICE"; // 无法确定时默认选择题
}

function extractChoiceOptions(text: string): string[] {
  const options: string[] = [];
  const regex = /([A-F])[\.、．\)）]\s*([^\n]*?)(?=\s*[A-F][\.、．\)）]|$)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    options.push(match[2].trim());
  }
  return options;
}

function extractAnswer(text: string): { answer: string; remaining: string } {
  const match = text.match(ANSWER_PATTERN);
  if (!match || match.index === undefined) {
    return { answer: "", remaining: text };
  }

  const before = text.substring(0, match.index);
  const after = text.substring(match.index + match[0].length);
  
  // 提取答案内容（到行尾或下一个标记之前）
  const answerEnd = after.search(/[\n\r]*(?:【|解析|详解|难度)/);
  const answer = answerEnd === -1 ? after.trim() : after.substring(0, answerEnd).trim();
  const remaining = answerEnd === -1 ? "" : after.substring(answerEnd).trim();

  return { answer, remaining: before + "\n" + remaining };
}

function extractExplanation(text: string): { explanation: string; remaining: string } {
  const match = text.match(EXPLANATION_PATTERN);
  if (!match || match.index === undefined) {
    return { explanation: "", remaining: text };
  }

  const before = text.substring(0, match.index);
  const after = text.substring(match.index + match[0].length);
  
  const explEnd = after.search(/[\n\r]*(?:【|难度)/);
  const explanation = explEnd === -1 ? after.trim() : after.substring(0, explEnd).trim();
  const remaining = explEnd === -1 ? "" : after.substring(explEnd).trim();

  return { explanation, remaining: before + "\n" + remaining };
}

function extractDifficulty(text: string): { difficulty: number; remaining: string } {
  const match = text.match(DIFFICULTY_PATTERN);
  if (!match) return { difficulty: 1, remaining: text };
  
  const remaining = text.replace(DIFFICULTY_PATTERN, "").trim();
  return { difficulty: parseInt(match[1]), remaining };
}

function cleanStem(text: string): string {
  return text
    .replace(/^\s*\d+[\.、．\)）题]\s*/, "")  // 去题号
    .replace(/\s*[（(]\s*[√✓×✗]\s*[）)]/, "")  // 去判断标记
    .replace(/\s*（\s*）/g, "（ ）")             // 填空题空格保留
    .trim();
}

function splitQuestions(text: string): string[] {
  // 按题号拆分
  const questions: string[] = [];
  const lines = text.split(/\n\r?|\r\n?/);
  let currentQuestion = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentQuestion) currentQuestion += "\n";
      continue;
    }

    // 检测新题开始
    const isNewQuestion = /^\s*(?:第\s*)?\d+\s*[\.、．\)）题]\s*/.test(trimmed);
    
    if (isNewQuestion && currentQuestion.trim()) {
      questions.push(currentQuestion.trim());
      currentQuestion = trimmed;
    } else {
      currentQuestion += (currentQuestion ? "\n" : "") + trimmed;
    }
  }

  if (currentQuestion.trim()) {
    questions.push(currentQuestion.trim());
  }

  return questions;
}

function parseOneQuestion(text: string): ParsedQuestion | null {
  let remaining = text.trim();
  if (!remaining) return null;

  // 提取难度
  const { difficulty, remaining: r1 } = extractDifficulty(remaining);
  remaining = r1;

  // 提取解析
  const { explanation, remaining: r2 } = extractExplanation(remaining);
  remaining = r2;

  // 提取答案
  const { answer: answerStr, remaining: r3 } = extractAnswer(remaining);
  remaining = r3;

  // 检测题型
  const type = detectTypeByContent(remaining);

  // 清理题干
  const stem = cleanStem(remaining);

  const question: ParsedQuestion = {
    type,
    content: { type, data: { stem } as any },
    answer: { type, data: {} as any },
    explanation: explanation || undefined,
    difficulty,
  };

  // 根据题型构建答案
  switch (type) {
    case "CHOICE": {
      const options = extractChoiceOptions(remaining);
      (question.content.data as any).options = options;
      
      const ans = answerStr.trim().toUpperCase();
      const labelMatch = ans.match(/^([A-F])$/);
      if (labelMatch) {
        question.answer = {
          type: "CHOICE",
          data: {
            correctIndex: labelMatch[1].charCodeAt(0) - 65,
            correctLabel: labelMatch[1],
          },
        };
      } else {
        // 尝试从答案文本匹配选项
        const idx = options.findIndex(
          (opt) => opt.trim() === ans || ans.includes(opt.trim())
        );
        question.answer = {
          type: "CHOICE",
          data: {
            correctIndex: Math.max(0, idx),
            correctLabel: String.fromCharCode(65 + Math.max(0, idx)),
          },
        };
      }
      break;
    }
    case "TRUE_FALSE": {
      const correct = TRUE_FALSE_ANSWER.test(answerStr);
      question.answer = {
        type: "TRUE_FALSE",
        data: { correct },
      };
      break;
    }
    case "SHORT_ANSWER": {
      const refAnswer = answerStr || "";
      question.answer = {
        type: "SHORT_ANSWER",
        data: {
          referenceAnswer: refAnswer,
          keywords: refAnswer.split(/[,，、\s]+/).filter((k) => k.length > 1),
        },
      };
      break;
    }
    case "CALCULATION": {
      question.answer = {
        type: "CALCULATION",
        data: { value: answerStr || "" },
      };
      break;
    }
  }

  return question;
}

export function parsePlainText(text: string): ParseResult {
  const result: ParseResult = {
    success: true,
    questions: [],
    errors: [],
    totalProcessed: 0,
  };

  // 移除页码等噪音
  const cleaned = text
    .replace(/^\s*\d+\s*\/\s*\d+\s*$/gm, "")  // 页码
    .replace(/第\s*\d+\s*页/g, "");

  const parts = splitQuestions(cleaned);

  for (let i = 0; i < parts.length; i++) {
    try {
      const question = parseOneQuestion(parts[i]);
      if (question) {
        result.questions.push(question);
        result.totalProcessed++;
      }
    } catch (err: any) {
      result.errors.push(`第${i + 1}题解析失败: ${err.message}`);
    }
  }

  if (result.questions.length === 0) {
    result.success = false;
    result.errors.push("未识别到题目，请确认文档格式包含题号标记");
  }

  return result;
}

export async function parseDocx(buffer: ArrayBuffer): Promise<ParseResult> {
  const { value: text } = await mammoth.extractRawText({ buffer: Buffer.from(buffer) as any });
  return parsePlainText(text);
}

export async function parsePdf(buffer: ArrayBuffer): Promise<ParseResult> {
  // pdfjs-dist 需要动态导入（ESM）
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;
  
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str)
      .join(" ");
    pages.push(pageText);
  }

  return parsePlainText(pages.join("\n"));
}

export async function parseTxt(text: string): Promise<ParseResult> {
  return parsePlainText(text);
}
