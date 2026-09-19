/**
 * In-Memory Vector Store with Cosine Similarity Search
 */

class VectorStore {
  constructor(embeddingService) {
    this.embeddingService = embeddingService;
    this.entries = []; // { id, text, vector, metadata }
  }

  addDocuments(chunks) {
    for (const chunk of chunks) {
      const vector = this.embeddingService.embedText(chunk.text);
      this.entries.push({
        id: chunk.id,
        text: chunk.text,
        vector,
        metadata: {
          documentId: chunk.documentId,
          documentTitle: chunk.documentTitle,
          section: chunk.section
        }
      });
    }
  }

  clear() {
    this.entries = [];
  }

  similaritySearch(query, topK = 3) {
    if (this.entries.length === 0) return [];
    const queryVec = this.embeddingService.embedText(query);

    const scored = this.entries.map(entry => {
      const score = this.embeddingService.cosineSimilarity(queryVec, entry.vector);
      return {
        id: entry.id,
        text: entry.text,
        metadata: entry.metadata,
        score
      };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }
}

module.exports = { VectorStore };

