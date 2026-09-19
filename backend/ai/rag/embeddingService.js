/**
 * Embedding Service
 * Generates normalized vectors for semantic similarity search.
 */

class EmbeddingService {
  constructor(dimensions = 128) {
    this.dimensions = dimensions;
  }

  /**
   * Generates a dense normalized vector from text using hashed character n-grams and token frequencies.
   */
  embedText(text) {
    const vector = new Float32Array(this.dimensions);
    const cleaned = String(text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    const tokens = cleaned.split(/\s+/).filter(Boolean);

    if (tokens.length === 0) return vector;

    // Token hashing with position & weight
    for (const token of tokens) {
      const hash = this.hashString(token);
      const index = Math.abs(hash) % this.dimensions;
      vector[index] += 1.0;

      // Character 3-grams for typo and morphological tolerance
      if (token.length >= 3) {
        for (let i = 0; i <= token.length - 3; i++) {
          const gram = token.slice(i, i + 3);
          const gramHash = this.hashString(gram);
          const gramIndex = Math.abs(gramHash) % this.dimensions;
          vector[gramIndex] += 0.35;
        }
      }
    }

    // L2 Normalize
    let norm = 0;
    for (let i = 0; i < this.dimensions; i++) {
      norm += vector[i] * vector[i];
    }
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let i = 0; i < this.dimensions; i++) {
        vector[i] /= norm;
      }
    }

    return vector;
  }

  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dot = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
    }
    return Math.max(0, Math.min(1, dot));
  }

  hashString(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}

module.exports = { EmbeddingService };

