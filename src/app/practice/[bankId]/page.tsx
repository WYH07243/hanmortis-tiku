"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Lightbulb,
  Clock,
  RotateCcw,
} from "lucide-react";

interface Question {
  id: string;
  type: string;
  content: any;
  explanation: string | null;
  difficulty: number;
  tags: string[];
}

interface BankInfo {
  id: string;
  name: string;
  description: string | null;
}

const typeLabels: Record<string, string> = {
  CHOICE: "选择题",
  TRUE_FALSE: "判断题",
  SHORT_ANSWER: "简答题",
  CALCULATION: "计算题",
};

const typeColors: Record<string, string> = {
  CHOICE: "bg-blue-500/20 text-blue-400",
  TRUE_FALSE: "bg-green-500/20 text-green-400",
  SHORT_ANSWER: "bg-amber-500/20 text-amber-400",
  CALCULATION: "bg-purple-500/20 text-purple-400",
};

export default function PracticeSessionPage() {
  const params = useParams();
  const router = useRouter();
  const bankId = params.bankId as string;

  const [bank, setBank] = useState<BankInfo | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 答题状态
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [trueFalseValue, setTrueFalseValue] = useState<boolean | null>(null);
  const [shortAnswerText, setShortAnswerText] = useState("");
  const [calculationValue, setCalculationValue] = useState("");

  // 提交状态
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState<any>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  // 统计
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());

  // 加载题目
  useEffect(() => {
    fetch(`/api/questions/banks/${bankId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setBank(data.bank);
          setQuestions(data.questions);
        }
      })
      .catch(() => setError("网络错误"))
      .finally(() => setLoading(false));
  }, [bankId]);

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  // 重置答题状态
  const resetAnswerState = useCallback(() => {
    setSelectedChoice(null);
    setTrueFalseValue(null);
    setShortAnswerText("");
    setCalculationValue("");
    setSubmitted(false);
    setIsCorrect(false);
    setCorrectAnswer(null);
    setShowExplanation(false);
  }, []);

  // 提交答案
  const handleSubmit = async () => {
    if (!currentQuestion || submitted) return;

    let userAnswer: any;
    switch (currentQuestion.type) {
      case "CHOICE":
        if (selectedChoice === null) return;
        userAnswer = { selectedIndex: selectedChoice };
        break;
      case "TRUE_FALSE":
        if (trueFalseValue === null) return;
        userAnswer = { value: trueFalseValue };
        break;
      case "SHORT_ANSWER":
        if (!shortAnswerText.trim()) return;
        userAnswer = { text: shortAnswerText };
        break;
      case "CALCULATION":
        if (!calculationValue.trim()) return;
        userAnswer = { value: calculationValue };
        break;
    }

    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    try {
      const res = await fetch("/api/practice/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          userAnswer,
          timeSpent,
          mode: "PRACTICE",
        }),
      });

      const data = await res.json();
      setSubmitted(true);
      setIsCorrect(data.isCorrect);
      setCorrectAnswer(data.correctAnswer);
      setAnsweredCount((c) => c + 1);
      if (data.isCorrect) setCorrectCount((c) => c + 1);
    } catch {
      setError("提交失败");
    }
  };

  // 下一题
  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      resetAnswerState();
      setCurrentIndex((i) => i + 1);
      setStartTime(Date.now());
    }
  };

  // 上一题
  const handlePrev = () => {
    if (currentIndex > 0) {
      resetAnswerState();
      setCurrentIndex((i) => i - 1);
    }
  };

  // 渲染题目内容
  const renderQuestionContent = () => {
    if (!currentQuestion) return null;
    const { type, content } = currentQuestion;
    const data = content.data;

    return (
      <div className="space-y-6">
        {/* 题型标签 */}
        <div className="flex items-center gap-3">
          <Badge className={typeColors[type] || "bg-gray-500/20 text-gray-400"}>
            {typeLabels[type] || type}
          </Badge>
          <Badge variant="outline" className="border-white/10 text-gray-500">
            难度: {"⭐".repeat(data.difficulty || 1)}
          </Badge>
        </div>

        {/* 题干 */}
        <div className="text-lg text-white leading-relaxed font-medium">
          {currentIndex + 1}. {data.stem}
        </div>

        {/* 选择题选项 */}
        {type === "CHOICE" && data.options && (
          <RadioGroup
            value={selectedChoice !== null ? String(selectedChoice) : undefined}
            onValueChange={(v) => setSelectedChoice(parseInt(v))}
            className="space-y-3"
          >
            {data.options.map((option: string, i: number) => {
              const label = String.fromCharCode(65 + i);
              const isSelected = selectedChoice === i;
              let optionClass = "border-white/10 hover:bg-white/5";

              if (submitted && i === correctAnswer?.data?.correctIndex) {
                optionClass = "border-green-500/50 bg-green-500/10";
              } else if (submitted && isSelected && !isCorrect) {
                optionClass = "border-red-500/50 bg-red-500/10";
              } else if (isSelected) {
                optionClass = "border-indigo-500/50 bg-indigo-500/10";
              }

              return (
                <div
                  key={i}
                  className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${optionClass}`}
                  onClick={() => !submitted && setSelectedChoice(i)}
                >
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0
                    ${isSelected && !submitted ? "bg-indigo-500 text-white" : "bg-white/5 text-gray-400"}
                    ${submitted && i === correctAnswer?.data?.correctIndex ? "bg-green-500 text-white" : ""}
                    ${submitted && isSelected && !isCorrect ? "bg-red-500 text-white" : ""}
                  `}>
                    {label}
                  </div>
                  <span className="text-gray-200">{option}</span>
                  {submitted && i === correctAnswer?.data?.correctIndex && (
                    <CheckCircle className="w-5 h-5 text-green-400 ml-auto" />
                  )}
                  {submitted && isSelected && !isCorrect && (
                    <XCircle className="w-5 h-5 text-red-400 ml-auto" />
                  )}
                </div>
              );
            })}
          </RadioGroup>
        )}

        {/* 判断题 */}
        {type === "TRUE_FALSE" && (
          <div className="flex gap-4">
            {[
              { value: true, label: "✓ 正确" },
              { value: false, label: "✗ 错误" },
            ].map((opt) => {
              const isSelected = trueFalseValue === opt.value;
              let btnClass = "border-white/10 hover:bg-white/5";

              if (submitted && opt.value === correctAnswer?.data?.correct) {
                btnClass = "border-green-500/50 bg-green-500/10 text-green-400";
              } else if (submitted && isSelected && !isCorrect) {
                btnClass = "border-red-500/50 bg-red-500/10 text-red-400";
              } else if (isSelected) {
                btnClass = "border-indigo-500/50 bg-indigo-500/10 text-indigo-400";
              }

              return (
                <Button
                  key={String(opt.value)}
                  variant="outline"
                  disabled={submitted}
                  onClick={() => setTrueFalseValue(opt.value)}
                  className={`flex-1 h-16 text-lg ${btnClass} ${isSelected ? "" : "text-gray-400"}`}
                >
                  {submitted && opt.value === correctAnswer?.data?.correct && (
                    <CheckCircle className="w-5 h-5 mr-2" />
                  )}
                  {submitted && isSelected && !isCorrect && (
                    <XCircle className="w-5 h-5 mr-2" />
                  )}
                  {opt.label}
                </Button>
              );
            })}
          </div>
        )}

        {/* 简答题 */}
        {type === "SHORT_ANSWER" && (
          <div className="space-y-3">
            <textarea
              value={shortAnswerText}
              onChange={(e) => setShortAnswerText(e.target.value)}
              disabled={submitted}
              placeholder="请输入你的答案..."
              rows={4}
              className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 resize-none focus:outline-none focus:border-indigo-500/50 disabled:opacity-50"
            />
          </div>
        )}

        {/* 计算题 */}
        {type === "CALCULATION" && (
          <div className="space-y-3">
            <Label className="text-gray-300">你的答案</Label>
            <Input
              value={calculationValue}
              onChange={(e) => setCalculationValue(e.target.value)}
              disabled={submitted}
              placeholder="请输入计算结果（可含单位）"
              className="bg-white/10 border-white/10 text-white placeholder:text-gray-500"
            />
          </div>
        )}

        {/* 提交后显示正确答案和解析 */}
        {submitted && (
          <div className="space-y-4">
            <div className={`p-4 rounded-xl ${isCorrect ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
              <div className="flex items-center gap-2 mb-2">
                {isCorrect ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                <span className={`font-medium ${isCorrect ? "text-green-400" : "text-red-400"}`}>
                  {isCorrect ? "回答正确！" : "回答错误"}
                </span>
              </div>

              {/* 显示正确答案 */}
              {!isCorrect && correctAnswer && (
                <div className="mt-3">
                  <p className="text-sm text-gray-400 mb-1">正确答案：</p>
                  <p className="text-green-400 font-medium">
                    {currentQuestion.type === "CHOICE" && correctAnswer.data.correctLabel + ". " + currentQuestion.content.data.options?.[correctAnswer.data.correctIndex]}
                    {currentQuestion.type === "TRUE_FALSE" && (correctAnswer.data.correct ? "正确 ✓" : "错误 ✗")}
                    {currentQuestion.type === "SHORT_ANSWER" && correctAnswer.data.referenceAnswer}
                    {currentQuestion.type === "CALCULATION" && correctAnswer.data.value + (correctAnswer.data.unit || "")}
                  </p>
                </div>
              )}
            </div>

            {/* 解析 */}
            {currentQuestion.explanation && (
              <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-medium text-indigo-400">解析</span>
                </div>
                <p className="text-sm text-gray-300">{currentQuestion.explanation}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <main className="md:ml-64 pt-16 md:pt-0 flex items-center justify-center min-h-screen">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <main className="md:ml-64 pt-16 md:pt-0 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <Button onClick={() => router.back()} variant="outline" className="border-white/10 text-gray-300">
              返回
            </Button>
          </div>
        </main>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <main className="md:ml-64 pt-16 md:pt-0 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-gray-400 mb-4">该题库还没有题目</p>
            <Button onClick={() => router.push("/import")} className="gap-2">
              去导入题目
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // 完成所有题目
  if (answeredCount >= questions.length && currentIndex === questions.length - 1 && submitted) {
    const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <main className="md:ml-64 pt-16 md:pt-0 flex items-center justify-center min-h-screen">
          <Card className="w-full max-w-md bg-white/5 border-white/10 backdrop-blur-sm mx-4">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-white">练习完成！🎉</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <div className="text-5xl font-bold text-indigo-400">{accuracy}%</div>
              <p className="text-gray-400">正确率</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <p className="text-2xl font-bold text-green-400">{correctCount}</p>
                  <p className="text-sm text-green-400/70">正确</p>
                </div>
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-2xl font-bold text-red-400">{answeredCount - correctCount}</p>
                  <p className="text-sm text-red-400/70">错误</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    resetAnswerState();
                    setCurrentIndex(0);
                    setCorrectCount(0);
                    setAnsweredCount(0);
                    setStartTime(Date.now());
                  }}
                  variant="outline"
                  className="flex-1 border-white/10 text-gray-300 gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  再练一次
                </Button>
                <Button
                  onClick={() => router.push("/practice")}
                  className="flex-1 gap-2"
                >
                  返回列表
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <main className="md:ml-64 pt-16 md:pt-0">
        <div className="max-w-3xl mx-auto p-6 md:p-8 space-y-6">
          {/* 顶部信息 */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => router.push("/practice")}
              className="text-gray-400 hover:text-white gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              {bank?.name || "返回"}
            </Button>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-400" />
                {correctCount}
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="w-4 h-4 text-red-400" />
                {answeredCount - correctCount}
              </span>
            </div>
          </div>

          {/* 进度条 */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-500">
              <span>第 {currentIndex + 1} / {questions.length} 题</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>

          {/* 题目卡片 */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="p-6 md:p-8">
              {renderQuestionContent()}
            </CardContent>
          </Card>

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              disabled={currentIndex === 0}
              onClick={handlePrev}
              className="border-white/10 text-gray-300 hover:text-white gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              上一题
            </Button>

            {!submitted ? (
              <Button
                onClick={handleSubmit}
                className="flex-1 gap-2 bg-gradient-to-r from-indigo-500 to-purple-600"
              >
                提交答案
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={currentIndex >= questions.length - 1}
                className="flex-1 gap-2"
              >
                下一题
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
