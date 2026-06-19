"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Upload, FileText, CheckCircle, AlertCircle, Download, X } from "lucide-react";

export default function ImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [bankName, setBankName] = useState("");
  const [bankDescription, setBankDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!bankName) {
        setBankName(selectedFile.name.replace(/\.[^.]+$/, ""));
      }
      setError("");
      setResult(null);
    }
  }, [bankName]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      if (!bankName) {
        setBankName(droppedFile.name.replace(/\.[^.]+$/, ""));
      }
      setError("");
      setResult(null);
    }
  }, [bankName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("请选择文件");
      return;
    }

    setUploading(true);
    setProgress(20);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bankName", bankName || "默认题库");
      formData.append("bankDescription", bankDescription);

      setProgress(50);

      const res = await fetch("/api/questions/import", {
        method: "POST",
        body: formData,
      });

      setProgress(80);

      const data = await res.json();

      if (res.ok) {
        setResult(data);
        setProgress(100);
      } else {
        setError(data.error || "导入失败");
        setProgress(0);
      }
    } catch (err) {
      setError("网络错误，请稍后重试");
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent =
      "题型,题干,选项,答案,解析,难度,标签\n" +
      "选择题,以下哪个是通信系统的基本组成？,A. 信源 B. 信道 C. 信宿 D. 以上都是,D,通信系统由信源、信道和信宿组成,1,通信原理\n" +
      "判断题,模拟信号可以无限细分。,,正确,,2,基础概念\n" +
      "简答题,什么是调制？,,调制是将基带信号变换为适合信道传输的频带信号的过程,1,\n" +
      "计算题,已知信号频率f=1kHz，求周期T。,,0.001s,T=1/f=1/1000=0.001s,2,";

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "题库导入模板.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <main className="md:ml-64 pt-16 md:pt-0">
        <div className="max-w-3xl mx-auto p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">导入题库</h1>
              <p className="text-gray-400 mt-1">支持 CSV、Excel、DOCX、PDF、TXT 格式</p>
            </div>
            <Button
              variant="outline"
              onClick={handleDownloadTemplate}
              className="gap-2 border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
            >
              <Download className="w-4 h-4" />
              下载模板
            </Button>
          </div>

          {/* 上传区域 */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 拖拽上传 */}
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
                    transition-all duration-200
                    ${file
                      ? "border-indigo-500/50 bg-indigo-500/5"
                      : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
                    }
                  `}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls,.docx,.pdf,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {file ? (
                    <div className="space-y-3">
                      <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/20 flex items-center justify-center">
                        <FileText className="w-7 h-7 text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{file.name}</p>
                        <p className="text-sm text-gray-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                          setResult(null);
                        }}
                        className="text-sm text-gray-400 hover:text-red-400 transition-colors"
                      >
                        移除文件
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-14 h-14 mx-auto rounded-2xl bg-white/5 flex items-center justify-center">
                        <Upload className="w-7 h-7 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-gray-300">
                          拖拽文件到此处，或<span className="text-indigo-400">点击选择</span>
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          支持 CSV、Excel (.xlsx/.xls)、Word (.docx)、PDF、TXT
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 题库信息 */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankName" className="text-gray-300">题库名称</Label>
                    <Input
                      id="bankName"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="例如：通信原理作业1-3"
                      className="bg-white/10 border-white/10 text-white placeholder:text-gray-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankDescription" className="text-gray-300">描述（可选）</Label>
                    <Input
                      id="bankDescription"
                      value={bankDescription}
                      onChange={(e) => setBankDescription(e.target.value)}
                      placeholder="简单描述这个题库..."
                      className="bg-white/10 border-white/10 text-white placeholder:text-gray-500"
                    />
                  </div>
                </div>

                {/* 进度条 */}
                {uploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">正在处理...</span>
                      <span className="text-gray-400">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}

                {/* 错误 */}
                {error && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                {/* 结果 */}
                {result && (
                  <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 space-y-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <div>
                        <p className="text-green-400 font-medium">导入成功！</p>
                        <p className="text-sm text-green-400/70">
                          成功导入 {result.savedCount} 道题目到「{result.bankName}」
                        </p>
                      </div>
                    </div>
                    {result.errors && result.errors.length > 0 && (
                      <div className="text-sm text-amber-400 space-y-1">
                        <p className="font-medium">警告：</p>
                        {result.errors.slice(0, 5).map((err: string, i: number) => (
                          <p key={i} className="text-amber-400/70">• {err}</p>
                        ))}
                        {result.errors.length > 5 && (
                          <p className="text-amber-400/50">
                            还有 {result.errors.length - 5} 条警告...
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={!file || uploading}
                  className="w-full gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? "导入中..." : "开始导入"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
