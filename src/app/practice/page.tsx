"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ChevronRight, Library } from "lucide-react";

interface Bank {
  id: string;
  name: string;
  description: string | null;
  questionCount: number;
  updatedAt: string;
}

export default function PracticePage() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/questions/banks")
      .then((res) => res.json())
      .then((data) => {
        if (data.banks) {
          setBanks(data.banks);
        } else {
          setError(data.error || "获取题库失败");
        }
      })
      .catch(() => setError("网络错误"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <main className="md:ml-64 pt-16 md:pt-0">
        <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">练习</h1>
            <p className="text-gray-400 mt-1">选择题库开始练习</p>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto" />
              <p className="text-gray-500 mt-4">加载题库...</p>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-red-400">{error}</p>
            </div>
          ) : banks.length === 0 ? (
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardContent className="p-12 text-center">
                <Library className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-400 mb-2">还没有题库</h3>
                <p className="text-gray-500 mb-6">先导入一些题目吧</p>
                <Link
                  href="/import"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500/20 text-indigo-400 rounded-xl hover:bg-indigo-500/30 transition-colors"
                >
                  去导入题库
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {banks.map((bank) => (
                <Link key={bank.id} href={`/practice/${bank.id}`}>
                  <Card className="bg-white/5 border-white/10 hover:bg-white/[0.07] transition-all cursor-pointer group">
                    <CardContent className="p-5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <BookOpen className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                          <h3 className="font-medium text-white">{bank.name}</h3>
                          {bank.description && (
                            <p className="text-sm text-gray-500">{bank.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="bg-white/5 text-gray-400">
                          {bank.questionCount} 题
                        </Badge>
                        <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-gray-400 transition-colors" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
