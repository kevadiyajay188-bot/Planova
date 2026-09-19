/**
 * Document Processor
 * Splits documents into overlapping semantic chunks with metadata preservation.
 */

class DocumentProcessor {
  constructor(options = {}) {
    this.chunkSize = options.chunkSize || 300;
    this.chunkOverlap = options.chunkOverlap || 50;
  }

  processDocument(doc) {
    const text = doc.content || '';
    if (!text.trim()) return [];

    const lines = text.split('\n');
    const chunks = [];
    let currentChunk = [];
    let currentLength = 0;
    let chunkIndex = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      currentChunk.push(trimmed);
      currentLength += trimmed.length;

      if (currentLength >= this.chunkSize) {
        const chunkText = currentChunk.join('\n');
        chunks.push({
          id: `${doc.id}-chunk-${chunkIndex++}`,
          documentId: doc.id,
          documentTitle: doc.title || doc.name,
          text: chunkText,
          section: this.detectSection(currentChunk)
        });

        // Retain overlap lines for semantic continuity
        const keepLines = Math.max(1, Math.floor(currentChunk.length * (this.chunkOverlap / this.chunkSize)));
        currentChunk = currentChunk.slice(-keepLines);
        currentLength = currentChunk.reduce((acc, l) => acc + l.length, 0);
      }
    }

    if (currentChunk.length > 0) {
      chunks.push({
        id: `${doc.id}-chunk-${chunkIndex++}`,
        documentId: doc.id,
        documentTitle: doc.title || doc.name,
        text: currentChunk.join('\n'),
        section: this.detectSection(currentChunk)
      });
    }

    return chunks;
  }

  detectSection(lines) {
    for (const line of lines) {
      if (line.startsWith('#') || line.endsWith(':')) {
        return line.replace(/^#+\s*/, '').replace(/:$/, '').trim();
      }
    }
    return 'General';
  }
}

module.exports = { DocumentProcessor };

