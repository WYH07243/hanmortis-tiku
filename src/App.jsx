import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Route, Routes, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  HelpCircle,
  Home,
  Image as ImageIcon,
  Library,
  Upload,
  XCircle,
} from "lucide-react";
import mammoth from "mammoth/mammoth.browser";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
import seedBanks from "./data/questionBanks.json";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const LS_BANKS = "review-quiz:banks:v2";
const LS_RECORDS = "review-quiz:records:v2";
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => new Date().toISOString();
const TYPE_LABEL = { single: "选择题", judge: "判断题", blank: "填空题", short_answer: "简答题", calculation: "计算题" };

const SAMPLE = [{
  id: "sample-1",
  name: "复习题示例",
  description: "支持选择、判断、填空、简答、计算与概念图预览",
  createdAt: now(),
  updatedAt: now(),
  questions: [
    { id: uid(), type: "single", title: "在远程多次转发传输时，下面哪项陈述是科学的？", options: ["A. 模拟传输系统的累积噪声可控制到极小", "B. 数字传输系统的累积噪声可控制到极小", "C. 数字传输系统无累积噪声", "D. 模拟传输系统无累积噪声"], answer: "B", explanation: "数字通信可利用再生中继把噪声积累控制在较小范围，但不是绝对无噪声。", tags: ["通信原理"] },
    { id: uid(), type: "judge", title: "抽样频率必须高于信号最高频率的两倍才可无失真恢复。", answer: "正确", explanation: "这是奈奎斯特抽样定理的基本要求。", tags: ["判断"] },
    { id: uid(), type: "blank", title: "香农公式 C = B log2(1 + S/N) 中，B 表示____。", answer: "带宽", explanation: "B 是信道带宽，单位通常为 Hz。", tags: ["填空"] },
    { id: uid(), type: "short_answer", title: "简述数字通信系统相比模拟通信系统的主要优点。", answer: "抗干扰能力强、便于加密和差错控制、适合数字处理与综合业务传输。", explanation: "答题时围绕抗噪、编码、处理、复用展开即可。", tags: ["简答"] },
    { id: uid(), type: "calculation", title: "若信道带宽为 4 kHz，信噪比为 15，计算香农容量。", answer: "16 kbit/s", explanation: "C = 4000 log2(16) = 16000 bit/s。", tags: ["计算"] },
  ],
}];

function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; } }
function normalizeQuestion(q) { return { id: q.id || uid(), type: q.type || "short_answer", title: q.title || q.content || "未命名题目", options: Array.isArray(q.options) ? q.options : [], answer: q.answer || "", explanation: q.explanation || "", tags: Array.isArray(q.tags) ? q.tags : [], uncertain: !!q.uncertain }; }

function useStore() {
  const [banks, setBanks] = useState(() => {
    const stored = readJson(LS_BANKS, null);
    if (stored?.length) return stored;
    return (seedBanks?.length ? seedBanks : SAMPLE).map((b) => ({ ...b, id: b.id || uid(), questions: (b.questions || []).map(normalizeQuestion) }));
  });
  const [records, setRecords] = useState(() => readJson(LS_RECORDS, {}));
  useEffect(() => localStorage.setItem(LS_BANKS, JSON.stringify(banks)), [banks]);
  useEffect(() => localStorage.setItem(LS_RECORDS, JSON.stringify(records)), [records]);
  return {
    banks,
    records,
    saveBank: (bank) => setBanks((list) => [bank, ...list.filter((x) => x.id !== bank.id)]),
    removeBank: (id) => setBanks((list) => list.filter((x) => x.id !== id)),
    record: (question, ok, userAnswer) => setRecords((r) => ({ ...r, [question.id]: { question, ok, userAnswer, at: now() } })),
  };
}

function guessType(text, options) {
  if (/判断题|正确|错误|对|错/.test(text) && options.length <= 2) return "judge";
  if (/计算|求|已知|证明|公式|dB|Hz|kHz|bit|bps/i.test(text)) return "calculation";
  if (/____|填空|空格|（\s*）|\(\s*\)/.test(text)) return "blank";
  if (options.length >= 2 || /[A-D][.、]/.test(text)) return "single";
  return "short_answer";
}

function splitBlocks(text) {
  const lines = text.replace(/\r/g, "\n").replace(/\u00a0/g, " ").split("\n").map((x) => x.trim()).filter(Boolean);
  const blocks = [];
  let cur = [];
  const start = /^(第?\s*\d+\s*[题、.．)]|\d+\s*[、.．)]|题目[:：]|[一二三四五六七八九十]+[、.．]\s*)/;
  for (const line of lines) {
    if (start.test(line) && cur.length) { blocks.push(cur.join("\n")); cur = [line]; }
    else cur.push(line);
  }
  if (cur.length) blocks.push(cur.join("\n"));
  return blocks;
}

function parseQuestions(text) {
  const ignored = [];
  const questions = splitBlocks(text).map((block) => {
    const options = [];
    let title = "", answer = "", explanation = "";
    for (const line of block.split("\n").map((x) => x.trim()).filter(Boolean)) {
      const opt = line.match(/^([A-H])[.、．)]\s*(.+)$/i);
      if (opt) options.push(`${opt[1].toUpperCase()}. ${opt[2]}`);
      else if (/^(正确答案|答案|参考答案)[:：]/.test(line)) answer = line.replace(/^(正确答案|答案|参考答案)[:：]\s*/, "");
      else if (/^(解析|分析|说明)[:：]/.test(line)) explanation = line.replace(/^(解析|分析|说明)[:：]\s*/, "");
      else if (!/^(一、|二、|三、|四、|单选题|多选题|填空题|简答题|计算题|判断题)/.test(line)) title += (title ? "\n" : "") + line.replace(/^(第?\s*\d+\s*[题、.．)]|\d+\s*[、.．)])\s*/, "");
    }
    return normalizeQuestion({ type: guessType(block, options), title, options, answer, explanation, uncertain: !answer || title.length < 6 });
  }).filter((q) => {
    const ok = q.title && q.title.length > 3 && !/^(作业|课程|姓名|学号|班级|满分|时间)/.test(q.title);
    if (!ok) ignored.push(q.title);
    return ok;
  });
  return { questions, ignored };
}

async function readFileText(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".docx")) return (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
  if (name.endsWith(".pdf")) {
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i += 1) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => item.str).join(" "));
    }
    return pages.join("\n");
  }
  const buf = await file.arrayBuffer();
  try { return new TextDecoder("utf-8", { fatal: true }).decode(buf); }
  catch { return new TextDecoder("gb18030").decode(buf); }
}

function answerHint(q) {
  if (q.type === "single") return `先排除绝对化选项，再找与题干关键词最匹配的一项。当前选项数：${q.options.length}。`;
  if (q.type === "judge") return "判断题先找“必须、一定、全部、无”等绝对词，再核对概念边界。";
  if (q.type === "calculation") return "先写公式，再统一单位，最后代入计算。答案不只看数字，也看单位。";
  if (q.type === "blank") return "填空题优先填写教材中的标准术语，避免口语化表达。";
  return "简答题按“定义/原理/特点/应用或结论”分点回答，关键词比长篇文字更重要。";
}
function aiSolve(q) { return `${answerHint(q)}\n${q.answer ? `参考答案：${q.answer}` : "暂无标准答案，可先根据题干关键词整理作答。"}\n${q.explanation ? `解析：${q.explanation}` : "建议补充出处、公式或关键词，后续复习会更稳。"}`; }

function Shell({ children }) {
  return <div className="app"><aside className="side"><Link className="brand" to="/"><BookOpen /><span>复习题</span></Link><nav><NavLink to="/"><Home />首页</NavLink><NavLink to="/library"><Library />题库</NavLink><NavLink to="/import"><Upload />导入</NavLink><NavLink to="/wrong-questions"><XCircle />错题</NavLink></nav><div className="side-note">DOCX / PDF / TXT / JSON 可直接导入，数据保存在浏览器本地。</div></aside><main className="main">{children}</main></div>;
}
function Header({ title, desc }) { return <header className="header"><h1>{title}</h1><p>{desc}</p></header>; }

function HomePage({ banks, records }) {
  const total = banks.reduce((n, b) => n + b.questions.length, 0);
  const wrong = Object.values(records).filter((r) => !r.ok).length;
  return <Shell><section className="hero"><div><h1>复习题</h1><p>重新构建的复习网站：导入资料、自动识别题型、练习答题、错题复盘、AI 提示和概念图。</p><div className="actions"><Link className="btn primary" to="/import">导入题库 <ArrowRight size={18} /></Link><Link className="btn" to="/library">开始练习</Link></div></div><div className="stats"><b>{banks.length}</b><span>题库</span><b>{total}</b><span>题目</span><b>{wrong}</b><span>错题</span></div></section><ConceptMap banks={banks} /></Shell>;
}
function ConceptMap({ banks }) {
  const tags = [...new Set(banks.flatMap((b) => b.questions.flatMap((q) => q.tags?.length ? q.tags : [TYPE_LABEL[q.type]])))].slice(0, 10);
  return <section className="panel"><div className="panel-head"><h2><ImageIcon />概念图</h2><span>网页内直接显示为图形</span></div><div className="map"><div className="node core">复习题</div>{tags.map((t, i) => <div className={`node n${i}`} key={t}>{t}</div>)}</div></section>;
}

function LibraryPage({ banks, removeBank }) {
  return <Shell><Header title="题库" desc="选择一个题库开始做题，或导入新的资料。" /><div className="grid">{banks.map((b) => <article className="bank" key={b.id}><h3>{b.name}</h3><p>{b.description || "无描述"}</p><div className="meta"><span>{b.questions.length} 题</span><span>{new Date(b.updatedAt || b.createdAt).toLocaleDateString()}</span></div><div className="actions"><Link className="btn primary" to={`/practice/${b.id}`}>练习</Link><button className="btn danger" onClick={() => removeBank(b.id)}>删除</button></div></article>)}</div></Shell>;
}

function ImportPage({ saveBank }) {
  const [name, setName] = useState("复习题"), [raw, setRaw] = useState(""), [result, setResult] = useState(null), [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const onFile = async (e) => { const file = e.target.files?.[0]; if (!file) return; setBusy(true); const text = await readFileText(file); setName(file.name.replace(/\.(txt|json|docx|pdf)$/i, "") || "复习题"); setRaw(text); setResult(parseQuestions(text)); setBusy(false); };
  const parsed = result || parseQuestions(raw);
  const save = () => { const bank = { id: uid(), name: name || "复习题", description: `从资料导入，共 ${parsed.questions.length} 题`, createdAt: now(), updatedAt: now(), questions: parsed.questions }; saveBank(bank); navigate(`/practice/${bank.id}`); };
  return <Shell><Header title="导入题库" desc="可导入 TXT、DOCX、PDF、JSON。系统会识别题目、答案、解析和干扰文本。" /><section className="panel import"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="题库名称" /><label className="drop"><Upload />选择文件<input type="file" accept=".txt,.json,.docx,.pdf" onChange={onFile} /></label><textarea value={raw} onChange={(e) => { setRaw(e.target.value); setResult(null); }} placeholder={"1. 题干\nA. 选项\nB. 选项\n正确答案：B\n解析：..."} /><div className="review"><b>{busy ? "读取中..." : `识别到 ${parsed.questions.length} 题`}</b><span>{parsed.questions.filter((q) => q.uncertain).length} 题需人工核对，忽略 {parsed.ignored.length} 项干扰文本</span><button className="btn primary" disabled={!parsed.questions.length} onClick={save}>保存并开始</button></div></section></Shell>;
}

function PracticePage({ banks, record }) {
  const { bankId } = useParams();
  const bank = banks.find((b) => b.id === bankId) || banks[0];
  const [idx, setIdx] = useState(0), [answer, setAnswer] = useState(""), [checked, setChecked] = useState(null), [tip, setTip] = useState("");
  const inputRef = useRef(null), q = bank?.questions[idx];
  useEffect(() => { setAnswer(""); setChecked(null); setTip(""); inputRef.current?.focus(); }, [idx, bankId]);
  if (!bank || !q) return <Shell><Header title="没有题目" desc="请先导入题库。" /><Link className="btn primary" to="/import">去导入</Link></Shell>;
  const submit = () => { const standard = String(q.answer || "").trim().toLowerCase(); const mine = String(answer || "").trim().toLowerCase(); const right = ["short_answer", "calculation"].includes(q.type) ? mine.length > 0 && (standard ? standard.includes(mine) || mine.includes(standard) : true) : standard === mine || standard.startsWith(mine); setChecked(right); record(q, right, answer); };
  return <Shell><Header title={bank.name} desc={`第 ${idx + 1} / ${bank.questions.length} 题`} /><section className="question"><div className="qbar"><span>{TYPE_LABEL[q.type]}</span>{q.uncertain && <em>需核对</em>}</div><h2>{q.title}</h2>{q.options?.length > 0 && <div className="options">{q.options.map((op) => <button key={op} className={answer === op[0] ? "selected" : ""} onClick={() => setAnswer(op[0])}>{op}</button>)}</div>}{q.type === "judge" && <div className="options two">{["正确", "错误"].map((op) => <button key={op} className={answer === op ? "selected" : ""} onClick={() => setAnswer(op)}>{op}</button>)}</div>}{!["single", "judge"].includes(q.type) && <textarea ref={inputRef} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="在这里作答，简答题和计算题都支持。" />}<div className="actions"><button className="btn" onClick={() => setTip(answerHint(q))}><HelpCircle size={18} />先给提示</button><button className="btn" onClick={() => setTip(aiSolve(q))}><Brain size={18} />AI 解答</button><button className="btn primary" onClick={submit}>提交答案</button><button className="btn" onClick={() => setIdx(Math.min(idx + 1, bank.questions.length - 1))}>下一题</button></div>{tip && <pre className="tip">{tip}</pre>}{checked !== null && <div className={checked ? "result ok" : "result bad"}>{checked ? <CheckCircle2 /> : <XCircle />}{checked ? "回答正确" : `需复习，参考答案：${q.answer || "暂无"}`}</div>}</section></Shell>;
}

function WrongPage({ records }) {
  const wrong = Object.values(records).filter((r) => !r.ok).reverse();
  return <Shell><Header title="错题本" desc="自动收集提交错误的题目。" /><div className="list">{wrong.length ? wrong.map((r) => <article className="wrong" key={r.question.id + r.at}><b>{r.question.title}</b><p>你的答案：{r.userAnswer || "空"}</p><p>参考答案：{r.question.answer || "暂无"}</p></article>) : <p className="empty">还没有错题。</p>}</div></Shell>;
}

export default function App() {
  const store = useStore();
  const banks = useMemo(() => store.banks, [store.banks]);
  return <Routes><Route path="/" element={<HomePage banks={banks} records={store.records} />} /><Route path="/dashboard" element={<HomePage banks={banks} records={store.records} />} /><Route path="/library" element={<LibraryPage banks={banks} removeBank={store.removeBank} />} /><Route path="/import" element={<ImportPage saveBank={store.saveBank} />} /><Route path="/practice" element={<PracticePage banks={banks} record={store.record} />} /><Route path="/practice/:bankId" element={<PracticePage banks={banks} record={store.record} />} /><Route path="/wrong-questions" element={<WrongPage records={store.records} />} /><Route path="*" element={<HomePage banks={banks} records={store.records} />} /></Routes>;
}
