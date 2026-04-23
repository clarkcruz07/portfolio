import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';
const MAX_CONTEXT_CHUNKS = 4;
const MAX_CHUNK_LENGTH = 900;

const BASE_SYSTEM_PROMPT = `You are the TwoFolds Digital assistant.
Answer clearly, concisely, and naturally.
Do not use Markdown formatting such as bold markers, headings, or bullet syntax characters unless explicitly asked.
When knowledge context is provided, prioritize it over generic assumptions.
If the answer is not supported by the supplied knowledge context, say so plainly instead of inventing details.
Treat the loaded document as a product and company knowledge source.
Refer to it as the knowledge base, company document, or product context when needed.
Use the knowledge base for company-specific facts, credentials, services, projects, tools, and claims.
Use normal model reasoning for explanation, simplification, comparisons, tone, and conversational flow.
If the user asks something general that is not clearly company-specific, you may answer normally from general knowledge.
If the user asks something company-specific and the knowledge base does not support it, say that it is not currently in the knowledge base before giving a cautious general answer or asking for clarification.
Never present unsupported assumptions as confirmed facts about TwoFolds Digital, Clark, products, clients, or experience.
Use a helpful, confident tone and keep responses grounded in the supplied knowledge base when relevant.`;

const starterMessages = [
  {
    id: 'welcome',
    role: 'assistant',
    content: 'Ask us about projects, AI systems, IoT builds, services.'
  }
];

function parseStreamChunk(chunk) {
  return chunk
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('data: '))
    .map(line => line.slice(6))
    .filter(line => line && line !== '[DONE]');
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function cleanAssistantText(value) {
  return value
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/^[*-]\s+/gm, '');
}

function splitIntoChunks(text) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map(paragraph => normalizeWhitespace(paragraph))
    .filter(Boolean);

  const chunks = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    const nextChunk = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph;
    if (nextChunk.length <= MAX_CHUNK_LENGTH) {
      currentChunk = nextChunk;
      continue;
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    if (paragraph.length <= MAX_CHUNK_LENGTH) {
      currentChunk = paragraph;
      continue;
    }

    for (let index = 0; index < paragraph.length; index += MAX_CHUNK_LENGTH) {
      chunks.push(paragraph.slice(index, index + MAX_CHUNK_LENGTH));
    }
    currentChunk = '';
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function scoreChunk(query, chunk) {
  const queryTerms = query
    .toLowerCase()
    .split(/[^a-z0-9.+#-]+/i)
    .filter(term => term.length > 2);
  const lowerChunk = chunk.toLowerCase();

  let score = 0;
  for (const term of queryTerms) {
    if (lowerChunk.includes(term)) {
      score += 3;
    }
  }

  if (queryTerms.length > 1 && lowerChunk.includes(queryTerms.join(' '))) {
    score += 5;
  }

  return score;
}

function selectRelevantChunks(query, chunks) {
  return chunks
    .map(chunk => ({ chunk, score: scoreChunk(query, chunk) }))
    .filter(item => item.score >= 3)
    .sort((left, right) => right.score - left.score)
    .slice(0, MAX_CONTEXT_CHUNKS)
    .map(item => item.chunk);
}

async function extractPdfText(url) {
  const loadingTask = pdfjsLib.getDocument(url);
  const pdfDocument = await loadingTask.promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map(item => ('str' in item ? item.str : ''))
      .join(' ');
    pages.push(normalizeWhitespace(text));
  }

  return pages.join('\n\n');
}

export default function GroqChatbot() {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  const cvUrl = import.meta.env.VITE_SUPABASE_CV_URL;
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(starterMessages);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');
  const [knowledgeChunks, setKnowledgeChunks] = useState([]);
  const [knowledgeStatus, setKnowledgeStatus] = useState('idle');
  const bodyRef = useRef(null);

  useEffect(() => {
    if (!bodyRef.current) return;
    bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, isOpen]);

  useEffect(() => {
    if (!cvUrl) {
      setKnowledgeStatus('missing');
      return;
    }

    let isCancelled = false;

    const loadKnowledge = async () => {
      try {
        setKnowledgeStatus('loading');
        const pdfText = await extractPdfText(cvUrl);
        const chunks = splitIntoChunks(pdfText);

        if (!isCancelled) {
          setKnowledgeChunks(chunks);
          setKnowledgeStatus(chunks.length ? 'ready' : 'empty');
        }
      } catch (loadError) {
        if (!isCancelled) {
          setKnowledgeStatus('error');
          console.error(loadError);
        }
      }
    };

    loadKnowledge();

    return () => {
      isCancelled = true;
    };
  }, [cvUrl]);

  const handleSubmit = async event => {
    event.preventDefault();

    const trimmedInput = input.trim();
    if (!trimmedInput || isStreaming) return;

    if (!apiKey) {
      setError('Add VITE_GROQ_API_KEY to your local .env file to enable the chatbot.');
      return;
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmedInput
    };
    const assistantId = `assistant-${Date.now()}`;
    const relevantChunks = selectRelevantChunks(trimmedInput, knowledgeChunks);
    const knowledgeContext = relevantChunks.length
      ? `Knowledge context from the company document:\n\n${relevantChunks
          .map((chunk, index) => `[Excerpt ${index + 1}]\n${chunk}`)
          .join('\n\n')}`
      : `No matching knowledge base excerpts were retrieved for this question.
Answer using general reasoning if appropriate, but do not present unsupported details as facts about TwoFolds Digital or its experience.`;

    setInput('');
    setError('');
    setIsOpen(true);
    setMessages(current => [
      ...current,
      userMessage,
      { id: assistantId, role: 'assistant', content: '' }
    ]);
    setIsStreaming(true);

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          stream: true,
          temperature: 0.4,
          messages: [
            { role: 'system', content: BASE_SYSTEM_PROMPT },
            ...(knowledgeContext ? [{ role: 'system', content: knowledgeContext }] : []),
            ...messages
              .filter(message => message.role === 'user' || message.role === 'assistant')
              .map(message => ({
                role: message.role,
                content: message.content
              })),
            { role: 'user', content: trimmedInput }
          ]
        })
      });

      if (!response.ok || !response.body) {
        throw new Error('Groq request failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() ?? '';

        for (const chunk of chunks) {
          for (const dataLine of parseStreamChunk(chunk)) {
            const payload = JSON.parse(dataLine);
            const token = payload.choices?.[0]?.delta?.content ?? '';

            if (!token) continue;

            setMessages(current =>
              current.map(message =>
                message.id === assistantId
                  ? { ...message, content: cleanAssistantText(`${message.content}${token}`) }
                  : message
              )
            );
          }
        }
      }
    } catch (streamError) {
      setError('The Groq chatbot could not respond right now. Check the API key, PDF URL, and network access.');
      setMessages(current =>
        current.map(message =>
          message.id === assistantId
            ? {
                ...message,
                content: cleanAssistantText(message.content || 'I am temporarily offline. Please try again in a moment.')
              }
            : message
        )
      );
      console.error(streamError);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className={`chatbot-shell ${isOpen ? 'chatbot-open' : ''}`}>
      {!isOpen && (
        <button
          type="button"
          className="chatbot-toggle"
          onClick={() => setIsOpen(true)}
          aria-expanded={isOpen}
          aria-controls="chatbot-panel"
        >
          <span className="chatbot-toggle-dot" />
          <span>Ask us</span>
        </button>
      )}

      {isOpen && (
        <aside className="chatbot-panel" id="chatbot-panel" aria-label="TwoFolds chatbot">
          <div className="chatbot-panel-header">
            <div>
              <strong>TwoFolds Support</strong>
            </div>
            <button type="button" className="chatbot-close" onClick={() => setIsOpen(false)} aria-label="Close chat">
              x
            </button>
          </div>

          <div className="chatbot-messages" ref={bodyRef}>
            {messages.map(message => (
              <div key={message.id} className={`chatbot-message chatbot-${message.role}`}>
                <span>{message.content || (isStreaming && message.role === 'assistant' ? 'Thinking...' : '')}</span>
              </div>
            ))}
          </div>

          <form className="chatbot-form" onSubmit={handleSubmit}>
            <div className="chatbot-input-shell">
              <textarea
                value={input}
                onChange={event => setInput(event.target.value)}
                placeholder="Ask us anything..."
                rows={2}
              />
              <button type="submit" className="chatbot-submit" disabled={isStreaming} aria-label="Send message">
                <svg className="chatbot-send-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M4 20 20 12 4 4l2.8 6.2L14 12l-7.2 1.8L4 20z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            {error ? <p className="chatbot-error">{error}</p> : null}
            <p className="chatbot-powered-by">
              Powered by: Clark
           {/*  {knowledgeStatus === 'ready' ? ' | Knowledge base loaded' : ''}
              {knowledgeStatus === 'loading' ? ' | Loading knowledge base...' : ''}
              {knowledgeStatus === 'error' ? ' | Knowledge base unavailable' : ''} */} 
            </p>
          </form>
        </aside>
      )}
    </div>
  );
}
