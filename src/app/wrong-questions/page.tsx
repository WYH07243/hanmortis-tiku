"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BookX, Trash2, Lightbulb, RefreshCw } from "lucide-react";

interface WrongQuestionItem {
  id: string;
  questionId: string;
  wrongCount: number;
  lastWrongAt: string;
  question: {
    id: string;
    type: string;
    content: any;
    answer: any;
    explanation: string | null;
    difficulty: number;
    tags: string[];
  };
  bankName: string;
  bankId: string;
}

const typeLabels: Record<string, string> = {
  CHOICE: "选择题",
  TRUE_FALSE: "判断题",
  SHORT_ANSWER: "简答题",
  CALCULATION: "计算题",
};

export default function WrongQuestionsPage() {
  const router = useRouter();
  const [items, setItems] = useState<WrongQuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchWrongQuestions = useCallback(() => {
    setLoading(true);
    fetch("/api/wrong-questions")
      .then((res) => res.json())
      .then((data) => {
        if (data.wrongQuestions) {
          setItems(data.wrongQuestions);
        } else {
          setError(data.error || "获取错题本失败");
        }
      })
      .catch(() => setError("网络错误"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchWrongQuestions();
  }, [fetchWrongQuestions]);

  const handleDelete = async (questionId: string) => {
    await fetch("/api/wrong-questions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId }),
    });
    setItems((prev) => prev.filter((item) => item.questionId !== questionId));
  };

  const handleClearAll = async () => {
    if (!confirm("确定要清空所有错题吗？")) return;
    await fetch("/api/wrong-questions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setItems([]);
  };

  const renderAnswer = (item: WrongQuestionItem) => {
    const { type, answer } = item.question;
    const data = answer.data;

    switch (type) {
      case "CHOICE":
        return `正确答案: ${data.correctLabel}`;
      case "TRUE_FALSE":
        return `正确答案: ${data.correct ? "正确 ✓" : "错误 ✗"}`;
      case "SHORT_ANSWER":
        return `参考答案: ${data.referenceAnswer}`;
      case "CALCULATION":
        return `答案: ${data.value}${data.unit || ""}`;
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <main className="md:ml-64 pt-16 md:pt-0">
        <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">错题本</h1>
              <p className="text-gray-400 mt-1">
                {items.length > 0
                  ? `共 ${items.length} 道错题，加油攻克它们！`
                  : "没有错题，继续保持！"}
              </p>
            </div>
            {items.length > 0 && (
              <Button
                variant="outline"
                onClick={handleClearAll}
                className="gap-2 border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              >
                <Trash2 className="w-4 h-4" />
                清空
              </Button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto" />
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-red-400 mb-4">{error}</p>
              <Button onClick={fetchWrongQuestions} variant="outline" className="gap-2 border-white/10">
                <RefreshCw className="w-4 h-4" />
                重试
              </Button>
            </div>
          ) : items.length === 0 ? (
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardContent className="p-12 text-center">
                <BookX className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-400 mb-2">错题本是空的</h3>
                <p className="text-gray-500">去练习一下，答错的题目会自动收集到这里</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <Card
                  key={item.id}
                  className="bg-white/5 border-white/10 backdrop-blur-sm overflow-hidden"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        {/* 元信息 */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className="bg-red-500/20 text-red-400">
                            {typeLabels[item.question.type] || item.question.type}
                          </Badge>
                          <Badge variant="outline" className="border-white/10 text-gray-500">
                            {item.bankName}
                          </Badge>
                          <Badge variant="outline" className="border-white/10 text-gray-500">
                            错 {item.wrongCount} 次
                          </Badge>
                          <span className="text-xs text-gray-600">
                            {new Date(item.lastWrongAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* 题干 */}
                        <p className="text-white font-medium">
                          {item.question.content.data.stem}
                        </p>

                        {/* 展开的答案和解析 */}
                        {expandedId === item.id && (
                          <div className="space-y-3 pt-2">
                            <Separator className="bg-white/5" />
                            
                            {/* 正确答案 */}
                            <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                              <p className="text-sm text-green-400">{renderAnswer(item)}</p>
                            </div>

                            {/* 选项（如果是选择题） */}
                            {item.question.type === "CHOICE" && item.question.content.data.options && (
                              <div className="space-y-1">
                                {item.question.content.data.options.map((opt: string, i: number) => {
                                  const label = String.fromCharCode(65 + i);
                                  const isCorrect = i === item.question.answer.data.correctIndex;
                                  return (
                                    <p
                                      key={i}
                                      className={`text-sm pl-4 ${isCorrect ? "text-green-400 font-medium" : "text-gray-500"}`}
                                    >
                                      {label}. {opt} {isCorrect ? "✓" : ""}
                                    </p>
                                  );
                                })}
                              </div>
                            )}

                            {/* 解析 */}
                            {item.question.explanation && (
                              <div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
                                <div className="flex items-center gap-2 mb-1">
                                  <Lightbulb className="w-3.5 h-3.5 text-indigo-400" />
                                  <span className="text-xs font-medium text-indigo-400">解析</span>
                                </div>
                                <p className="text-sm text-gray-300">{item.question.explanation}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex flex-col gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setExpandedId(expandedId === item.id ? null : item.id)
                          }
                          className="text-gray-400 hover:text-white"
                        >
                          {expandedId === item.id ? "收起" : "查看答案"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.questionId)}
                          className="text-gray-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
