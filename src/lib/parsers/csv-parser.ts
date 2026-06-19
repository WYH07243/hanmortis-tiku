import * as XLSX from "xlsx";
import Papa from "papaparse";
import type { ParsedQuestion, ParseResult, QuestionType } from "./types";

// CSV 模板的列名映射
const COLUMN_MAP: Record<string, string[]> = {
  type: ["题型", "type", "题目类型"],
  stem: ["题干", "stem", "题目", "问题"],
  options: ["选项", "options", "choices"],
  answer: ["答案", "answer", "正确答案"],
  explanation: ["解析", "explanation", "详解"],
  difficulty: ["难度", "difficulty"],
  tags: ["标签", "tags", "tag"],
};

function normalizeHeader(header: string): string {
  const trimmed = header.trim().toLowerCase();
  for (const [key, aliases] of Object.entries(COLUMN_MAP)) {
    if (aliases.some((a) => a.toLowerCase() === trimmed)) {
      return key;
    }
  }
  return trimmed;
}

function detectQuestionType(typeStr: string): QuestionType {
  const t = typeStr.trim().toLowerCase();
  if (t.includes("选择") || t === "choice" || t === "单选" || t === "多选") {
    return "CHOICE";
  }
  if (t.includes("判断") || t === "true_false" || t === "tf" || t.includes("对错")) {
    return "TRUE_FALSE";
  }
  if (t.includes("简答") || t.includes("问答") || t === "short_answer" || t === "sa") {
    return "SHORT_ANSWER";
  }
  if (t.includes("计算") || t === "calculation" || t === "calc") {
    return "CALCULATION";
  }
  return "CHOICE"; // 默认
}

function parseChoiceAnswer(answerStr: string): { correctIndex: number; correctLabel: string } {
  const trimmed = answerStr.trim().toUpperCase();
  // 尝试匹配 A/B/C/D/E/F
  const labelMatch = trimmed.match(/^([A-F])$/);
  if (labelMatch) {
    return {
      correctIndex: labelMatch[1].charCodeAt(0) - 65,
      correctLabel: labelMatch[1],
    };
  }
  // 尝试匹配数字索引
  const numMatch = trimmed.match(/^(\d+)$/);
  if (numMatch) {
    const idx = parseInt(numMatch[1]) - 1;
    return {
      correctIndex: idx,
      correctLabel: String.fromCharCode(65 + idx),
    };
  }
  return { correctIndex: 0, correctLabel: "A" };
}

function parseOptions(optionsStr: string): string[] {
  if (!optionsStr || !optionsStr.trim()) return [];
  
  // 尝试按常见分隔符拆分
  const trimmed = optionsStr.trim();
  
  // 格式: A. xxx B. xxx C. xxx D. xxx
  const letterMatch = trimmed.match(/[A-F][.\s、．)\s]+/g);
  if (letterMatch && letterMatch.length >= 2) {
    const parts = trimmed.split(/[A-F][.\s、．)\s]+/).filter(Boolean);
    return parts.map((p) => p.replace(/[A-F][.\s、．)\s]*$/, "").trim()).filter(Boolean);
  }
  
  // 格式: 换行分隔 或 | 分隔
  if (trimmed.includes("|")) {
    return trimmed.split("|").map((s) => s.trim()).filter(Boolean);
  }
  if (trimmed.includes("\n")) {
    return trimmed.split("\n").map((s) => s.trim()).filter(Boolean);
  }
  
  return [trimmed];
}

export function parseCSV(fileContent: string): ParseResult {
  const result: ParseResult = {
    success: true,
    questions: [],
    errors: [],
    totalProcessed: 0,
  };

  const parsed = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    result.errors.push(...parsed.errors.map((e) => `CSV解析错误: ${e.message}`));
  }

  const headers = parsed.meta.fields || [];
  const normalizedHeaders = headers.map(normalizeHeader);

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i] as Record<string, string>;
    try {
      const values: Record<string, string> = {};
      for (let j = 0; j < headers.length; j++) {
        values[normalizedHeaders[j]] = (row[headers[j]] || "").trim();
      }

      if (!values.stem) continue; // 跳过空行

      const type = values.type ? detectQuestionType(values.type) : "CHOICE";

      const question: ParsedQuestion = {
        type,
        content: { type, data: { stem: values.stem } as any },
        answer: { type, data: {} as any },
        explanation: values.explanation || undefined,
        difficulty: values.difficulty ? parseInt(values.difficulty) || 1 : 1,
        tags: values.tags ? values.tags.split(/[,，、]/).map((t) => t.trim()).filter(Boolean) : [],
      };

      // 根据题型解析内容和答案
      switch (type) {
        case "CHOICE": {
          const options = values.options ? parseOptions(values.options) : [];
          (question.content.data as any).options = options;
          const ans = parseChoiceAnswer(values.answer || "A");
          question.answer = {
            type: "CHOICE",
            data: { correctIndex: ans.correctIndex, correctLabel: ans.correctLabel },
          };
          break;
        }
        case "TRUE_FALSE": {
          const ansStr = (values.answer || "").trim().toLowerCase();
          const correct = ["√", "✓", "true", "yes", "对", "正确", "t", "1"].includes(ansStr);
          question.answer = {
            type: "TRUE_FALSE",
            data: { correct },
          };
          break;
        }
        case "SHORT_ANSWER": {
          const refAnswer = values.answer || "";
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
            data: { value: values.answer || "" },
          };
          break;
        }
      }

      result.questions.push(question);
      result.totalProcessed++;
    } catch (err: any) {
      result.errors.push(`第${i + 2}行解析失败: ${err.message}`);
    }
  }

  if (result.questions.length === 0 && result.errors.length === 0) {
    result.success = false;
    result.errors.push("未找到有效题目数据，请检查文件格式");
  }

  return result;
}

export function parseExcel(buffer: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const csvContent = XLSX.utils.sheet_to_csv(sheet);
  return parseCSV(csvContent);
}
