const { DocumentProcessor } = require('./documentProcessor');
const { EmbeddingService } = require('./embeddingService');
const { VectorStore } = require('./vectorStore');

class RetrievalService {
  constructor(options = {}) {
    this.threshold = options.similarityThreshold || 0.12;
    this.processor = new DocumentProcessor();
    this.embeddingService = new EmbeddingService();
    this.vectorStore = new VectorStore(this.embeddingService);
    this.indexed = false;
    // Raw chunk storage for keyword fallback
    this._allChunks = [];
  }

  indexDocuments(documents = []) {
    this.vectorStore.clear();
    this._allChunks = [];
    let totalChunks = 0;
    for (const doc of documents) {
      const chunks = this.processor.processDocument(doc);
      this.vectorStore.addDocuments(chunks);
      this._allChunks.push(...chunks);
      totalChunks += chunks.length;
    }
    this.indexed = true;
    return { indexedDocuments: documents.length, totalChunks };
  }

  /**
   * Keyword-overlap score: fraction of query words that appear in a chunk.
   */
  _keywordScore(queryWords, chunkText) {
    if (!queryWords.length) return 0;
    const lower = chunkText.toLowerCase();
    const matches = queryWords.filter(w => lower.includes(w));
    return matches.length / queryWords.length;
  }

  search(query, topK = 3) {
    if (!query || !query.trim()) {
      return {
        answer: "Please provide a specific search query to search the club's knowledge base.",
        sources: [],
        found: false
      };
    }

    const cleanedQuery = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    const queryWords = cleanedQuery.split(/\s+/).filter(w => w.length > 2);

    // --- Vector similarity search ---
    const matches = this.vectorStore.similaritySearch(query, topK * 2);

    // --- Keyword-boosted scoring ---
    const scored = matches.map(m => {
      const kwScore = this._keywordScore(queryWords, m.text);
      return { ...m, boostedScore: m.score + kwScore * 0.4 };
    });

    // --- Keyword-only fallback for chunks missed by vector similarity ---
    const vectorIds = new Set(scored.map(m => m.id || m.text.slice(0, 40)));
    for (const chunk of this._allChunks) {
      const chunkId = (chunk.id || chunk.text || '').slice(0, 40);
      if (vectorIds.has(chunkId)) continue;
      const kwScore = this._keywordScore(queryWords, chunk.text || '');
      if (kwScore >= 0.4) {
        scored.push({
          ...chunk,
          score: 0,
          boostedScore: kwScore * 0.4
        });
      }
    }

    // Filter by threshold on boostedScore, require at least one query-word match
    const validMatches = scored
      .filter(m => {
        if (m.boostedScore < this.threshold) return false;
        const lowerChunk = (m.text || '').toLowerCase();
        return queryWords.some(w => lowerChunk.includes(w));
      })
      .sort((a, b) => b.boostedScore - a.boostedScore)
      .slice(0, topK);

    if (validMatches.length === 0) {
      return {
        answer: "I couldn't find enough information in the club's records.",
        sources: [],
        found: false,
        bestScore: scored[0]?.boostedScore || 0
      };
    }

    const sources = validMatches.map(m => {
      const title = m.metadata?.documentTitle || m.documentTitle || 'Club Document';
      const section = m.metadata?.section || m.section || '';
      const excerpt = (m.text || '').slice(0, 240) + ((m.text || '').length > 240 ? '...' : '');
      return { title, section, excerpt, relevanceScore: Math.round((m.boostedScore || 0) * 100) / 100 };
    });

    const answer = `Based on club records from [${sources[0].title}]:\n${validMatches[0].text}`;

    return {
      answer,
      evidence: validMatches.map(m => m.text).join('\n---\n'),
      sources,
      found: true,
      confidence: validMatches[0].boostedScore
    };
  }
}

module.exports = { RetrievalService };
