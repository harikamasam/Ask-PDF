import fs from 'node:fs/promises';
import pdfParse from 'pdf-parse';

export async function parsePdf(filePath) {
  const buffer = await fs.readFile(filePath);
  const pageTexts = [];

  const data = await pdfParse(buffer, {
    pagerender: async (pageData) => {
      const textContent = await pageData.getTextContent();
      const pageText = textContent.items
        .map((item) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      pageTexts.push(pageText);
      return pageText;
    }
  });

  const pages = pageTexts.length
    ? pageTexts.map((text, index) => ({ pageNumber: index + 1, text }))
    : [{ pageNumber: 1, text: data.text || '' }];

  const text = pages.map((page) => page.text).join('\n\n').trim();

  if (!text) {
    throw new Error('No extractable text found in this PDF');
  }

  return { text, pages, pageCount: data.numpages || pages.length };
}
