const targetWords = 700;
const overlapWords = 90;

function wordsFromPage(page) {
  return page.text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => ({ word, pageNumber: page.pageNumber }));
}

export function chunkPages(pages) {
  const words = pages.flatMap(wordsFromPage);
  const chunks = [];

  for (let start = 0; start < words.length; start += targetWords - overlapWords) {
    const slice = words.slice(start, start + targetWords);
    if (!slice.length) {
      break;
    }

    chunks.push({
      chunkIndex: chunks.length,
      text: slice.map((entry) => entry.word).join(' '),
      sourcePage: slice[0].pageNumber
    });

    if (start + targetWords >= words.length) {
      break;
    }
  }

  if (!chunks.length) {
    throw new Error('Unable to create chunks from parsed PDF text');
  }

  return chunks;
}
