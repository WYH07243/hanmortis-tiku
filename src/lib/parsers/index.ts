import { parseCSV, parseExcel } from "./csv-parser";
import { parseDocx, parsePdf, parseTxt, parsePlainText } from "./doc-parser";
import type { ParseResult } from "./types";

export type { ParseResult, ParsedQuestion, QuestionType, QuestionContent, Answer } from "./types";

export type FileType = "csv" | "xlsx" | "xls" | "docx" | "pdf" | "txt";

export async function parseFile(
  buffer: ArrayBuffer,
  fileType: FileType,
  fileName?: string
): Promise<ParseResult> {
  switch (fileType) {
    case "csv": {
      const text = new TextDecoder("utf-8").decode(buffer);
      return parseCSV(text);
    }
    case "xlsx":
    case "xls":
      return parseExcel(buffer);
    case "docx":
      return parseDocx(buffer);
    case "pdf":
      return parsePdf(buffer);
    case "txt": {
      const text = new TextDecoder("utf-8").decode(buffer);
      return parseTxt(text);
    }
    default:
      return {
        success: false,
        questions: [],
        errors: [`不支持的文件类型: ${fileType}`],
        totalProcessed: 0,
      };
  }
}

export function detectFileType(fileName: string): FileType | null {
  const ext = fileName.split(".").pop()?.toLowerCase();
  const validTypes: FileType[] = ["csv", "xlsx", "xls", "docx", "pdf", "txt"];
  return validTypes.includes(ext as FileType) ? (ext as FileType) : null;
}

export { parseCSV, parseExcel, parseDocx, parsePdf, parseTxt, parsePlainText };
