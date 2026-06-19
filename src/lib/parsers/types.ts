// 题目类型
export type QuestionType = "CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" | "CALCULATION";

// 解析后的题目
export interface ParsedQuestion {
  type: QuestionType;
  content: QuestionContent;
  answer: Answer;
  explanation?: string;
  difficulty?: number;
  tags?: string[];
}

// 选择题内容
export interface ChoiceContent {
  stem: string;       // 题干
  options: string[];  // 选项 A, B, C, D...
}

// 判断题内容
export interface TrueFalseContent {
  stem: string;
}

// 简答题内容
export interface ShortAnswerContent {
  stem: string;
}

// 计算题内容
export interface CalculationContent {
  stem: string;
}

// 所有题目内容类型
export type QuestionContent =
  | { type: "CHOICE"; data: ChoiceContent }
  | { type: "TRUE_FALSE"; data: TrueFalseContent }
  | { type: "SHORT_ANSWER"; data: ShortAnswerContent }
  | { type: "CALCULATION"; data: CalculationContent };

// 选择题答案
export interface ChoiceAnswer {
  correctIndex: number;  // 正确答案索引 (0-based)
  correctLabel: string;  // 正确答案标签 A/B/C/D
}

// 判断题答案
export interface TrueFalseAnswer {
  correct: boolean;
}

// 简答题答案
export interface ShortAnswerAnswer {
  referenceAnswer: string;
  keywords: string[];  // 关键词（用于自动评分）
}

// 计算题答案
export interface CalculationAnswer {
  value: string;       // 最终答案
  unit?: string;       // 单位
  tolerance?: number;  // 容差
}

// 所有答案类型
export type Answer =
  | { type: "CHOICE"; data: ChoiceAnswer }
  | { type: "TRUE_FALSE"; data: TrueFalseAnswer }
  | { type: "SHORT_ANSWER"; data: ShortAnswerAnswer }
  | { type: "CALCULATION"; data: CalculationAnswer };

// 解析结果
export interface ParseResult {
  success: boolean;
  questions: ParsedQuestion[];
  errors: string[];
  totalProcessed: number;
}
