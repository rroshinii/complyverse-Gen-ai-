// pdf-parse was removed: it bundles a vendored copy of pdf.js from 2017
// (v1.10.100) that fails with "bad XRef entry" on plenty of perfectly valid,
// modern PDFs (confirmed while testing this fix - qpdf validated the file as
// fully spec-compliant, yet pdf-parse still rejected it). pdfjs-dist is the
// actively-maintained Mozilla PDF.js package and correctly parses the same
// file, so it's used directly here via its Node-compatible "legacy" build.
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

export interface UploadedFileLike {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const data = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({
    data,
    useWorkerFetch: false,
    // Falls back to Node's own font metrics instead of requiring the
    // standard_fonts asset directory to be bundled/deployed separately -
    // simpler and more robust in a serverless function.
    useSystemFonts: true
  });

  try {
    const doc = await loadingTask.promise;
    const pageTexts: string[] = [];
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .join(' ');
      pageTexts.push(pageText);
    }
    return pageTexts.join('\n');
  } finally {
    await loadingTask.destroy();
  }
}

/**
 * Extracts readable text from an uploaded file buffer based on its real content type,
 * instead of blindly calling buffer.toString('utf-8') on everything.
 * PDF, DOCX, and XLSX/XLS are all binary/zip-based formats under the hood - decoding
 * them as raw utf-8 text produces garbage, which silently corrupts every downstream
 * extraction, graph, and citation. This was the reason only pasted text or the
 * pre-loaded samples appeared to "work": the upload picker accepted .docx/.xlsx, but
 * nothing was actually parsing them, so the ingestion agent was fed unusable content.
 */
export async function extractTextFromUpload(file: UploadedFileLike): Promise<string> {
  const name = file.originalname.toLowerCase();
  const isPdf = file.mimetype === 'application/pdf' || name.endsWith('.pdf');
  const isDocx = name.endsWith('.docx') ||
    file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const isSpreadsheet = name.endsWith('.xlsx') || name.endsWith('.xls') ||
    file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.mimetype === 'application/vnd.ms-excel';

  try {
    if (isPdf) {
      const text = (await extractTextFromPdf(file.buffer)).trim();
      if (!text) {
        throw new Error('PDF parsed but contained no extractable text (likely a scanned/image-only PDF).');
      }
      return text;
    }

    if (isDocx) {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      const text = (result.value || '').trim();
      if (!text) {
        throw new Error('DOCX parsed but contained no extractable text.');
      }
      return text;
    }

    if (isSpreadsheet) {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetTexts = workbook.SheetNames.map(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        return `Sheet: ${sheetName}\n${csv}`;
      });
      const text = sheetTexts.join('\n\n').trim();
      if (!text) {
        throw new Error('Spreadsheet parsed but contained no readable rows.');
      }
      return text;
    }

    // Plain text / CSV formats are already readable as utf-8 text -
    // the ingestion agent's prompt handles tabular content fine as raw text.
    const text = file.buffer.toString('utf-8');
    if (!text.trim()) {
      throw new Error('File appears to be empty.');
    }
    return text;
  } catch (err: any) {
    console.error(`Parsing failed for "${file.originalname}":`, err.message);
    throw new Error(`Could not extract text from "${file.originalname}": ${err.message}`);
  }
}
