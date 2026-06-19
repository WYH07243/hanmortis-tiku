"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Upload, BookX, Trophy, TrendingUp, Library } from "lucide-react";
import Link from "next/link";

interface DashboardStats {
  totalQuestions: number;
  totalBanks: number;
  practicedToday: number;
  wrongQuestions: number;
  accuracy: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalQuestions: 0,
    totalBanks: 0,
    practicedToday: 0,
    wrongQuestions: 0,
    accuracy: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setStats(data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      {/* 主内容区 */}
      <main className="md:ml-64 pt-16 md:pt-0">
        <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-8">
          {/* 标题 */}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              👋 仪表盘
            </h1>
            <p className="text-gray-400 mt-1">概览你的学习进度</p>
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardContent className="p-4 md:p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">题库数</p>
                    <p className="text-xl font-bold text-white mt-1">
                      {loading ? "-" : stats.totalBanks}
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <Library className="w-4 h-4 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardContent className="p-4 md:p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">总题目</p>
                    <p className="text-xl font-bold text-white mt-1">
                      {loading ? "-" : stats.totalQuestions}
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-indigo-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardContent className="p-4 md:p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">今日练习</p>
                    <p className="text-xl font-bold text-white mt-1">
                      {loading ? "-" : stats.practicedToday}
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardContent className="p-4 md:p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">错题数</p>
                    <p className="text-xl font-bold text-white mt-1">
                      {loading ? "-" : stats.wrongQuestions}
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center">
                    <BookX className="w-4 h-4 text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardContent className="p-4 md:p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">正确率</p>
                    <p className="text-xl font-bold text-white mt-1">
                      {loading ? "-" : stats.accuracy + "%"}
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-amber-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 快捷操作 */}
          <div className="grid md:grid-cols-3 gap-6">
            <Link href="/import">
              <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all cursor-pointer group h-full">
                <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">导入题库</h3>
                    <p className="text-sm text-gray-500 mt-1">CSV · Excel · DOCX · PDF · TXT</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/practice">
              <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all cursor-pointer group h-full">
                <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <BookOpen className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">开始练习</h3>
                    <p className="text-sm text-gray-500 mt-1">4 种题型 · 自动批改 · 智能评分</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/wrong-questions">
              <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all cursor-pointer group h-full">
                <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <BookX className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">错题本</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {stats.wrongQuestions > 0
                        ? `${stats.wrongQuestions} 道待攻克`
                        : "暂无错题，继续保持！"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
