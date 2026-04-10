# LLM Integration Playbook

Apply this playbook when the frontend includes:
- AI chat interface or assistant widget
- "Generate with AI" buttons (copy, summary, images)
- Semantic search (search by meaning, not just keywords)
- Content moderation or classification features
- Vector-based recommendations ("similar items")
- AI-powered auto-fill or smart suggestions

---

## Decision: Which Pattern to Use

| Frontend Signal | Pattern | Guide |
|---|---|---|
| Chat widget, conversation history | Conversational AI | Section 2 |
| "Generate draft", "Summarize this" | Single-shot completion | Section 3 |
| "Search by meaning" | Semantic search + RAG | Section 4 |
| "Similar items", recommendations | Embeddings + vector similarity | Section 5 |
| Content moderation, classification | Classification API | Section 6 |

---

## 1. Adapter Pattern (mandatory)

Always isolate LLM provider behind an adapter. Provider-specific code must never appear in controllers or services.

```ts
// src/integrations/llm/llm.adapter.ts
export interface LLMAdapter {
  complete(prompt: string, options?: CompletionOptions): Promise<string>;
  stream(prompt: string, options?: CompletionOptions): AsyncIterable<string>;
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

export interface CompletionOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}
```

```ts
// src/integrations/llm/openai.adapter.ts
import OpenAI from 'openai';

export class OpenAIAdapter implements LLMAdapter {
  private readonly client: OpenAI;
  private readonly defaultModel = 'gpt-4o';
  private readonly embeddingModel = 'text-embedding-3-small';

  constructor(private readonly config: { apiKey: string }) {
    this.client = new OpenAI({ apiKey: config.apiKey });
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: options?.model ?? this.defaultModel,
      max_tokens: options?.maxTokens ?? 1024,
      temperature: options?.temperature ?? 0.7,
      messages: [
        ...(options?.systemPrompt
          ? [{ role: 'system' as const, content: options.systemPrompt }]
          : []),
        { role: 'user', content: prompt },
      ],
    });
    return response.choices[0].message.content ?? '';
  }

  async *stream(prompt: string, options?: CompletionOptions): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model: options?.model ?? this.defaultModel,
      stream: true,
      messages: [{ role: 'user', content: prompt }],
    });
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.embeddingModel,
      input: text,
    });
    return response.data[0].embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: this.embeddingModel,
      input: texts,
    });
    return response.data.map(d => d.embedding);
  }
}
```

---

## 2. Conversational AI — Chat Interface

### Entity Design

```
Conversation
  id, user_id → User, organization_id → Organization (if multi-tenant)
  title (auto-generated or user-set)
  created_at, updated_at

Message
  id, conversation_id → Conversation
  role: user | assistant | system
  content (text)
  token_count (for billing/limits)
  model_used
  created_at
```

### API Endpoints

| Method | Route | Auth | Summary |
|---|---|---|---|
| GET | /conversations | ✅ | List user conversations |
| POST | /conversations | ✅ | Start new conversation |
| GET | /conversations/:id/messages | ✅ | Load message history |
| POST | /conversations/:id/messages | ✅ | Send message, get AI response |
| DELETE | /conversations/:id | ✅ | Delete conversation |

### Streaming Response (SSE)

```ts
// conversations.controller.ts
@Post(':id/messages')
async sendMessage(
  @Param('id') id: string,
  @Body() dto: SendMessageDto,
  @Res() res: Response,
) {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const history = await this.conversationsService.getHistory(id);
  const messages = this.buildMessagesFromHistory(history, dto.content);

  let fullContent = '';
  for await (const chunk of this.llm.stream(messages)) {
    fullContent += chunk;
    res.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`);
  }

  // Persist both messages
  await this.conversationsService.saveMessages(id, [
    { role: 'user', content: dto.content },
    { role: 'assistant', content: fullContent },
  ]);

  res.write(`data: [DONE]\n\n`);
  res.end();
}
```

### System Prompt Management

Never hardcode system prompts in controllers. Store them in config:

```ts
// src/modules/conversations/system-prompts.ts
export const SYSTEM_PROMPTS = {
  default: `You are a helpful assistant for [Product Name]. 
    Be concise, accurate, and professional.
    If you don't know something, say so.`,

  codeReview: `You are an expert code reviewer. 
    Focus on correctness, security, and performance.`,
} as const;
```

---

## 3. Single-Shot Completion — "Generate with AI"

For one-off AI actions (generate email draft, summarize document, improve text):

```ts
// src/modules/ai/ai-generation.service.ts
export class AIGenerationService {
  async generateEmailDraft(data: {
    recipientName: string;
    purpose: string;
    tone: 'formal' | 'friendly' | 'casual';
  }): Promise<string> {
    const prompt = `
Write a professional email to ${data.recipientName}.
Purpose: ${data.purpose}
Tone: ${data.tone}
Keep it under 200 words. Return only the email body, no subject line.
    `.trim();

    return this.llm.complete(prompt, {
      temperature: 0.5,
      maxTokens: 300,
    });
  }

  async summarize(text: string, maxSentences = 3): Promise<string> {
    return this.llm.complete(
      `Summarize the following in ${maxSentences} sentences:\n\n${text}`,
      { temperature: 0.3 },
    );
  }
}
```

### Rate Limiting for AI Endpoints

AI calls are expensive. Apply per-user rate limits:

```
POST /ai/generate/*  → 20 requests per hour per user (plan-based)
POST /conversations/:id/messages → 50 per hour per user
```

---

## 4. Semantic Search + RAG

**RAG (Retrieval-Augmented Generation):** Search for relevant context, then generate answer based on that context.

### Vector Database Options

| Option | Best For |
|---|---|
| **pgvector** (PostgreSQL extension) | Already using PostgreSQL; small to medium scale |
| **Pinecone** | Managed, large scale, production-ready |
| **Weaviate** | Open-source, self-hosted, rich filtering |
| **Qdrant** | High performance, Rust-based, open-source |

### Pattern: pgvector (recommended starting point)

```sql
-- PostgreSQL migration
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE documents
  ADD COLUMN embedding vector(1536);  -- OpenAI text-embedding-3-small dimensions

CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops);
```

```ts
// Search by semantic similarity
async semanticSearch(query: string, limit = 10): Promise<Document[]> {
  const embedding = await this.llm.embed(query);

  return this.prisma.$queryRaw<Document[]>`
    SELECT id, title, content, 
           1 - (embedding <=> ${embedding}::vector) AS similarity
    FROM documents
    WHERE 1 - (embedding <=> ${embedding}::vector) > 0.7
    ORDER BY embedding <=> ${embedding}::vector
    LIMIT ${limit}
  `;
}
```

### RAG Flow

```ts
async answerFromDocs(question: string, organizationId: string): Promise<string> {
  // 1. Find relevant documents
  const queryEmbedding = await this.llm.embed(question);
  const relevantDocs = await this.semanticSearch(queryEmbedding, organizationId, 5);

  // 2. Build context
  const context = relevantDocs
    .map(doc => `[Source: ${doc.title}]\n${doc.content}`)
    .join('\n\n---\n\n');

  // 3. Generate answer with context
  const prompt = `
Answer the question based ONLY on the provided context.
If the answer isn't in the context, say "I don't have information about that."

Context:
${context}

Question: ${question}

Answer:`.trim();

  return this.llm.complete(prompt, {
    temperature: 0.2, // low temperature for factual answers
    systemPrompt: 'You answer questions based only on provided context.',
  });
}
```

### Embedding on Ingest

```ts
// When a document is created or updated, generate and store its embedding:
async indexDocument(document: Document): Promise<void> {
  const textToEmbed = `${document.title}\n\n${document.content}`;
  const embedding = await this.llm.embed(textToEmbed);

  await this.prisma.document.update({
    where: { id: document.id },
    data: { embedding },
  });
}
```

---

## 5. Embeddings for Recommendations

Find similar items by vector distance:

```ts
async findSimilar(itemId: string, limit = 5): Promise<Item[]> {
  const item = await this.prisma.item.findUnique({ where: { id: itemId } });

  return this.prisma.$queryRaw<Item[]>`
    SELECT id, name, description,
           1 - (embedding <=> ${item.embedding}::vector) AS similarity
    FROM items
    WHERE id != ${itemId}
    ORDER BY embedding <=> ${item.embedding}::vector
    LIMIT ${limit}
  `;
}
```

---

## 6. Content Moderation / Classification

Use LLM for content moderation (or OpenAI Moderation API for cost savings):

```ts
export class ModerationService {
  // OpenAI Moderation API — free and purpose-built
  async moderate(content: string): Promise<ModerationResult> {
    const response = await this.openai.moderations.create({ input: content });
    const result = response.results[0];

    return {
      flagged: result.flagged,
      categories: result.categories,
      scores: result.category_scores,
    };
  }

  // LLM-based classification for custom categories
  async classify(content: string, categories: string[]): Promise<string> {
    const prompt = `
Classify the following text into exactly one of these categories: ${categories.join(', ')}.
Respond with only the category name, nothing else.

Text: "${content}"
Category:`.trim();

    return this.llm.complete(prompt, { temperature: 0 });
  }
}
```

---

## 7. API Endpoints

| Method | Route | Auth | Summary |
|---|---|---|---|
| POST | /ai/generate/draft | ✅ | Generate text draft |
| POST | /ai/generate/summary | ✅ | Summarize content |
| POST | /ai/search/semantic | ✅ | Semantic search query |
| GET | /items/:id/similar | ✅ | Similar items by embedding |
| POST | /conversations | ✅ | Start conversation |
| POST | /conversations/:id/messages | ✅ | Send message (SSE stream) |
| POST | /admin/moderation/check | ✅ admin | Moderate content |

---

## 8. Environment Variables

```bash
# LLM Provider
OPENAI_API_KEY=sk-...
OPENAI_DEFAULT_MODEL=gpt-4o
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Anthropic (alternative)
ANTHROPIC_API_KEY=sk-ant-...

# Vector DB (if using Pinecone)
PINECONE_API_KEY=
PINECONE_INDEX=
PINECONE_ENVIRONMENT=

# Limits
AI_MAX_TOKENS_PER_REQUEST=4096
AI_RATE_LIMIT_PER_HOUR=50
AI_EMBEDDING_DIMENSION=1536
```

---

## 9. Cost Control Rules

- **Never call LLM in a loop** without pagination or batching
- **Cache embedding results** — same text → same vector. Store in DB; never re-embed
- **Cache completion results** for deterministic prompts (temperature: 0) with Redis
- **Track token usage** per user/org — store `token_count` on every Message record
- **Plan-based limits** — apply `feature-flags.md` patterns to gate AI features by plan
- **Timeout all LLM calls** — set `timeout: 30000` on the client; never block indefinitely

---

## 10. Security Rules

- **Never send raw user input** directly to LLM without sanitization — prevent prompt injection
- **Never include PII** (other users' emails, IDs, names) in prompts unless explicitly required
- **Audit all AI completions** — log prompt hash + response hash + user ID in AuditLog
- **Content moderation** before storing user-generated content in RAG index
- System prompts must be **server-side only** — never expose to client

---

## 11. File Structure

```
src/
├── integrations/
│   └── llm/
│       ├── llm.adapter.ts           ← interface: complete, stream, embed, embedBatch
│       ├── openai.adapter.ts        ← OpenAI implementation
│       └── anthropic.adapter.ts     ← Anthropic implementation (alternative)
├── modules/
│   ├── conversations/
│   │   ├── conversations.module.ts
│   │   ├── conversations.controller.ts
│   │   ├── conversations.service.ts
│   │   ├── system-prompts.ts        ← server-side prompt registry
│   │   └── dto/
│   │       └── send-message.dto.ts
│   ├── ai/
│   │   ├── ai.module.ts
│   │   ├── ai-generation.service.ts ← draft, summarize, classify
│   │   └── moderation.service.ts    ← OpenAI Moderation API + custom classify
│   └── search/
│       ├── search.module.ts
│       └── semantic-search.service.ts  ← pgvector similarity search + RAG
└── entities/
    ├── conversation.entity.ts
    ├── message.entity.ts
    └── document.entity.ts           ← stores embedding vector (pgvector)
```
