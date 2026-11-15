const SYSTEM_PROMPT = `You are Studdy Buddy AI - a friendly study assistant helping students from Class 6 to Class 12 with their learning journey!

🎯 Your Mission:
- Help students understand Robotics, Programming, AI/ML, IoT, Electronics, and other school subjects
- Make learning fun and easy to understand
- Explain concepts like a helpful senior student or teacher would

📚 How to Respond:
1. **Use Simple Language**: Explain like you're talking to a friend
   - Use Hindi-English mix (Hinglish) when helpful
   - Avoid complex technical jargon
   - If using technical terms, explain them simply

2. **Step-by-Step Learning**:
   - Break down complex topics into small, easy steps
   - Use real-world examples from daily life
   - Connect concepts to things students already know

3. **Be Encouraging**:
   - Celebrate their questions (there are no "silly" questions!)
   - Use encouraging phrases like "Great question!", "Let me help you understand this!"
   - Make them feel confident about learning

4. **Interactive Teaching**:
   - Ask if they understood before moving forward
   - Suggest simple experiments or activities they can try
   - Use analogies and stories to explain concepts

5. **Age-Appropriate Content**:
   - For Class 6-8: Use very simple examples (like toys, games, everyday objects)
   - For Class 9-10: Introduce basic concepts with school curriculum examples
   - For Class 11-12: Go deeper but still keep it practical

6. **Practical Examples**:
   - Relate programming to games, apps they use
   - Explain robotics with examples like remote-controlled cars, automated doors
   - Connect AI to Instagram filters, Google search, voice assistants

Remember: Your goal is to make every student feel "I can understand this!" and "This is interesting!" 🌟

Always respond in a friendly, supportive, and easy-to-understand way!`;

// Priority-ordered list — tested live, fastest & most reliable first.
// If one fails/rate-limits, automatically tries next.
const MODEL_CHAIN = [
  // Tier 1 — fastest responders (< 2s)
  'liquid/lfm-2.5-1.2b-instruct:free',
  'liquid/lfm-2.5-1.2b-thinking:free',

  // Tier 2 — reliable mid-speed (2–3s)
  'google/gemma-4-26b-a4b-it:free',
  'openai/gpt-oss-120b:free',

  // Tier 3 — slower but solid fallbacks (3–6s)
  'openai/gpt-oss-20b:free',
  'nvidia/nemotron-nano-12b-v2-vl:free',
  'moonshotai/kimi-k2.6:free',
  'nvidia/nemotron-3-super-120b-a12b:free',

  // Tier 4 — extras that sometimes work
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'nvidia/nemotron-nano-9b-v2:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'z-ai/glm-4.5-air:free',
  'qwen/qwen3-coder:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
  'poolside/laguna-xs.2:free',
  'poolside/laguna-m.1:free',
];

// ── Single model call ────────────────────────────────────────────────────────
async function callModel(apiKey, model, messages, maxTokens = 1024) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.APP_URL || 'https://studdy-buddy-a5x.vercel.app',
      'X-Title': 'Studdy Buddy AI',
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
    signal: AbortSignal.timeout(20000),
  });

  const data = await res.json();

  if (!res.ok) {
    const errMsg = data?.error?.message || `HTTP ${res.status}`;
    const err = new Error(errMsg);
    err.status = res.status;
    err.skip = res.status === 429 || res.status === 404 ||
      errMsg.toLowerCase().includes('rate') ||
      errMsg.toLowerCase().includes('upstream') ||
      errMsg.toLowerCase().includes('no endpoints') ||
      errMsg.toLowerCase().includes('provider');
    throw err;
  }

  const choice = data.choices?.[0];
  const content = choice?.message?.content;
  if (!content || !content.trim()) {
    const err = new Error('Empty response');
    err.skip = true;
    throw err;
  }

  return {
    content: content.trim(),
    // finish_reason: 'length' means token limit hit — response is incomplete
    truncated: choice?.finish_reason === 'length',
  };
}

// ── Continuation: if response was cut short, ask next model to continue ──────
async function continueGeneration(apiKey, originalMessages, partialReply, chainStartIndex) {
  console.log('[AI] Response truncated — continuing with next model...');

  // Build continuation context: original convo + partial reply so far
  const continuationMessages = [
    ...originalMessages,
    { role: 'assistant', content: partialReply },
    {
      role: 'user',
      content: 'Your previous response was cut off. Please continue exactly from where you stopped, without repeating what was already said.',
    },
  ];

  for (let i = chainStartIndex; i < MODEL_CHAIN.length; i++) {
    const model = MODEL_CHAIN[i];
    try {
      console.log(`[AI] Continuation with: ${model}`);
      const { content, truncated } = await callModel(
        process.env.OPENROUTER_API_KEY, model, continuationMessages, 1024
      );
      console.log(`[AI] ✅ Continuation success: ${model}`);
      // If still truncated, merge and try to continue again (max 1 more time)
      if (truncated) {
        return partialReply + '\n' + content + '\n[Response reached limit]';
      }
      return partialReply + '\n' + content;
    } catch (err) {
      console.warn(`[AI] Continuation failed on ${model}: ${err.message.substring(0, 60)}`);
      if (err.skip) continue;
      break;
    }
  }

  // Could not continue — return what we have
  return partialReply + '\n*(Response was cut short)*';
}

// ── Fallback chain ───────────────────────────────────────────────────────────
async function chatWithAI_internal(message, history = []) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || !apiKey.trim()) throw new Error('OPENROUTER_API_KEY not configured');

  // If env overrides primary model, put it first
  const primaryModel = process.env.OPENROUTER_MODEL;
  const chain = primaryModel && !MODEL_CHAIN.includes(primaryModel)
    ? [primaryModel, ...MODEL_CHAIN]
    : primaryModel
      ? [primaryModel, ...MODEL_CHAIN.filter(m => m !== primaryModel)]
      : MODEL_CHAIN;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-6).map(h => ({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.content,
    })),
    { role: 'user', content: message.trim() },
  ];

  let lastError = null;

  for (let i = 0; i < chain.length; i++) {
    const model = chain[i];
    try {
      console.log(`[AI] Trying: ${model}`);
      const { content, truncated } = await callModel(apiKey, model, messages);
      console.log(`[AI] ✅ Success: ${model} | truncated: ${truncated}`);

      // If token limit hit, continue the response with the next model
      let finalReply = content;
      if (truncated) {
        finalReply = await continueGeneration(apiKey, messages, content, i + 1);
      }

      return { reply: finalReply, model };
    } catch (err) {
      console.warn(`[AI] ❌ ${model}: ${err.message.substring(0, 80)}`);
      lastError = err;
      if (err.skip) continue;
      throw err;
    }
  }

  throw lastError || new Error('All models exhausted');
}

// ── Main handler ─────────────────────────────────────────────────────────────
export const chatWithAI = async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ success: false, message: 'AI service not configured.' });
    }

    const { reply, model } = await chatWithAI_internal(message, history);
    return res.json({ success: true, reply, provider: 'openrouter', model });

  } catch (error) {
    console.error('[AI Chat] All models failed:', error.message);

    if (error.status === 429 || error.message?.includes('rate') || error.message?.includes('exhausted')) {
      return res.status(429).json({
        success: false,
        message: 'AI is temporarily busy. Please try again in a moment.',
      });
    }

    if (error.message?.includes('not configured')) {
      return res.status(500).json({ success: false, message: 'AI service not configured.' });
    }

    return res.status(500).json({
      success: false,
      message: 'AI service temporarily unavailable. Please try again.',
    });
  }
};
