# Groq Model Comparison for Movie Recommendations

## Top 5 Models Ranked by Recommendation Quality

### 1. **llama-4-scout-17b-16e-instruct** ⭐ NEW RECOMMENDED
**Model ID:** `llama-4-scout-17b-16e-instruct`

**Performance:**
- MMLU Score: 79.6 (excellent general knowledge, matches 70B quality)
- Context Window: 10,000,000 tokens (10M) - massive context for extensive history
- Speed: 460+ tokens/second on Groq
- Architecture: Mixture of Experts (17B active, 109B total parameters)
- Multimodal: Native support for text, image, and video

**Pricing:**
- Input: $0.11 per 1M tokens
- Output: $0.34 per 1M tokens
- **Cost per request:** ~$0.0006-0.0008 (cheaper than 70B, well under budget)

**Best For:**
- High-quality movie recommendations
- Analyzing review text and generating reasoning
- Handling extremely large context (10M tokens vs 128K)
- Cost-effective quality option
- Multimodal capabilities (if needed for future features)

**Verdict:** ✅ **BEST CHOICE** - Matches 70B quality, 5x cheaper input cost, massive 10M token context window

---

### 2. **llama-3.3-70b-versatile** ⭐ PREVIOUS RECOMMENDED
**Model ID:** `llama-3.3-70b-versatile`

**Note:** `llama-3.1-70b-versatile` has been decommissioned. Use `llama-3.3-70b-versatile` instead.

**Performance:**
- MMLU Score: 79.3 (excellent general knowledge)
- MATH Score: 68.0 (good reasoning)
- Context Window: 131,072 tokens (128K) - can handle extensive review history
- Speed: 450+ tokens/second on Groq

**Pricing:**
- Input: $0.59 per 1M tokens
- Output: $0.79 per 1M tokens
- **Cost per request:** ~$0.003-0.004 (well under $0.50 budget)

**Best For:**
- High-quality movie recommendations
- Analyzing review text and generating reasoning
- Handling large context (many past meetings/reviews)
- Best quality/price balance

**Verdict:** ✅ **EXCELLENT** - Great quality and proven performance, but Llama 4 Scout offers similar quality with lower cost and much larger context window

---

### 3. **llama-3.1-405b-reasoning**
**Model ID:** `llama-3.1-405b-reasoning`

**Performance:**
- MMLU Score: 85.2 (highest quality)
- MATH Score: 73.8 (best reasoning)
- Context Window: 131,072 tokens (128K)
- Speed: Slower than 70B (larger model)

**Pricing:**
- Input: $3.00 per 1M tokens
- Output: $3.00 per 1M tokens
- **Cost per request:** ~$0.015-0.018 (still well under budget)

**Best For:**
- Maximum quality recommendations
- Complex reasoning tasks
- When quality is more important than cost

**Limitations:**
- ⚠️ May require paying customer status (access restrictions)
- 5x more expensive than 70B
- Diminishing returns vs 70B (only ~6% better on MMLU)

**Verdict:** ⚠️ **OVERKILL** - Best quality but expensive and may have access restrictions. 70B is 83% cheaper with only 6% less quality.

---

### 4. **mixtral-8x7b-32768**
**Model ID:** `mixtral-8x7b-32768`

**Performance:**
- MMLU Score: 70.6 (good but lower than Llama 3.1 70B)
- Context Window: 32,768 tokens (32K) - smaller than Llama 3.1
- Speed: Fast (smaller model)

**Pricing:**
- Input: $0.24 per 1M tokens
- Output: $0.24 per 1M tokens
- **Cost per request:** ~$0.0012-0.0015 (cheapest option)

**Best For:**
- Budget-conscious applications
- Basic recommendation needs
- When cost is primary concern

**Limitations:**
- 13% lower quality than Llama 3.1 70B (MMLU: 70.6 vs 79.3)
- Smaller context window (32K vs 128K)
- May struggle with complex review analysis

**Verdict:** 💰 **BUDGET OPTION** - Good if cost is critical, but quality trade-off is significant.

---

### 5. **llama-3.1-8b-instant**
**Model ID:** `llama-3.1-8b-instant`

**Performance:**
- MMLU Score: 66.7 (lowest quality)
- Context Window: 131,072 tokens (128K)
- Speed: Very fast (smallest model)

**Pricing:**
- Input: $0.05 per 1M tokens
- Output: $0.08 per 1M tokens
- **Cost per request:** ~$0.0002-0.0003 (extremely cheap)

**Best For:**
- Development/testing
- Simple tasks
- When quality is not critical

**Limitations:**
- 16% lower quality than 70B (MMLU: 66.7 vs 79.3)
- May produce less nuanced recommendations
- Not ideal for analyzing complex review patterns

**Verdict:** 🚫 **NOT RECOMMENDED** - Too low quality for meaningful movie recommendations.

---

## Cost Comparison (Per Request)

Estimated tokens per request:
- Input: ~2,500 tokens (meetings summary, reviews, preferences)
- Output: ~1,750 tokens (15 movie suggestions with reasons)

| Model | Input Cost | Output Cost | **Total/Request** | Under $0.50? |
|-------|-----------|-------------|-------------------|--------------|
| llama-3.1-8b-instant | $0.000125 | $0.00014 | **$0.00027** | ✅ Yes (0.05%) |
| llama-4-scout-17b-16e-instruct | $0.000275 | $0.000595 | **$0.00087** | ✅ Yes (0.2%) |
| mixtral-8x7b-32768 | $0.0006 | $0.00042 | **$0.00102** | ✅ Yes (0.2%) |
| llama-3.3-70b-versatile | $0.00148 | $0.00138 | **$0.00286** | ✅ Yes (0.6%) |
| llama-3.1-405b-reasoning | $0.0075 | $0.00525 | **$0.01275** | ✅ Yes (2.6%) |

All models are well under your $0.50 budget!

---

## Final Recommendation

### 🏆 **Use `llama-4-scout-17b-16e-instruct`**

**Why:**
1. **Best quality/price balance** - 79.6 MMLU score (matches 70B) at lower cost
2. **Massive context window** - 10M tokens (78x larger than 128K) can handle extensive review history
3. **Fast inference** - 460+ tokens/second on Groq
4. **Cost-effective** - Only $0.0009 per request (3x cheaper than 70B)
5. **Latest generation** - Llama 4 from Meta (released April 2025)
6. **Multimodal ready** - Native support for text, image, and video (future-proof)

**When to consider alternatives:**
- **70B**: If you need proven track record or prefer denser model architecture
- **405B**: Only if you need absolute best quality and don't mind 5x cost
- **Mixtral**: If you're extremely cost-sensitive and can accept lower quality
- **8B**: Only for development/testing, not production

---

## Implementation Note

In your code, use:
```typescript
model: "llama-4-scout-17b-16e-instruct"
```

This is the sweet spot for your use case: high-quality movie recommendations with detailed reasoning, analyzing review text, massive context capacity, and staying well within budget.
