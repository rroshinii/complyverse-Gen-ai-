import React, { useState } from 'react';
import { Search, Send, ShieldCheck, ExternalLink, Sparkles, Loader2, CheckCircle2, AlertCircle, Bot, User, HelpCircle } from 'lucide-react';
import { QAAnswer, Citation } from '../types';

interface EvidenceChatProps {
  onOpenSourceRef: (sourceRef: string) => void;
}

const SUGGESTED_PROMPTS = [
  'What are our technical encryption obligations for EU customer identifiers?',
  'What notice window is required before appointing new sub-processors?',
  'What is our contract breach notification SLA to Acme Corporation?',
  'Are there any pending SOC 2 audit submission deadlines this year?'
];

export const EvidenceChat: React.FC<EvidenceChatProps> = ({ onOpenSourceRef }) => {
  const [query, setQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Chat message history
  const [messages, setMessages] = useState<
    { id: string; role: 'user' | 'assistant'; text?: string; qaData?: QAAnswer; timestamp: string }[]
  >([
    {
      id: 'welcome-1',
      role: 'assistant',
      text: 'Hello! I am the **ComplyVerse Evidence Agent**. I answer enterprise compliance questions strictly grounded in our living knowledge graph. Every claim includes verifiable `source_ref` citations with zero hallucinations.',
      timestamp: new Date().toLocaleTimeString()
    }
  ]);

  const handleSendQuery = async (customText?: string) => {
    const textToSubmit = customText || query;
    if (!textToSubmit.trim()) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg = {
      id: userMsgId,
      role: 'user' as const,
      text: textToSubmit,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customText) setQuery('');
    setLoading(true);

    try {
      const res = await fetch(`/api/graph/search?q=${encodeURIComponent(textToSubmit)}`);
      const json = await res.json();

      if (json.success) {
        const assistantMsg = {
          id: `asst-${Date.now()}`,
          role: 'assistant' as const,
          qaData: json.data as QAAnswer,
          timestamp: new Date().toLocaleTimeString()
        };
        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch (err) {
      console.error('Evidence Agent search error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      
      {/* Header */}
      <div className="pb-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#ff8fc9]/10 border border-[#ff8fc9]/30 text-[#ff8fc9] text-xs font-mono mb-2">
            <ShieldCheck className="w-3.5 h-3.5" /> Agent Stage 04 • Citation-Backed QA
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-white">Compliance Evidence Assistant</h1>
          <p className="text-xs text-[#8792b0] mt-1">
            Zero-hallucination compliance queries. Uncitable claims are automatically dropped by the Evidence Agent.
          </p>
        </div>
      </div>

      {/* Quick Suggested Prompts */}
      <div className="space-y-2">
        <span className="text-xs font-mono text-[#8792b0]">Suggested Compliance Prompts:</span>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendQuery(prompt)}
              className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-[#ff8fc9]/40 hover:text-[#ff8fc9] text-xs font-mono transition-all text-left"
            >
              💬 {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Log */}
      <div className="space-y-6 min-h-[400px]">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-[#ff8fc9]/20 border border-[#ff8fc9]/40 text-[#ff8fc9] flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-3xl rounded-2xl p-5 space-y-4 ${
                msg.role === 'user'
                  ? 'bg-[#8b7bff]/20 border border-[#8b7bff]/40 text-white font-medium text-sm'
                  : 'glass-panel text-[#edeffb] border border-white/10'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-mono text-[#8792b0]">
                <span>{msg.role === 'user' ? 'You' : 'ComplyVerse Evidence Agent'}</span>
                <span>{msg.timestamp}</span>
              </div>

              {/* Text message or rich QAAnswer response */}
              {msg.text && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>}

              {msg.qaData && (
                <div className="space-y-5">
                  
                  {/* Overall Confidence Badge */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 text-xs font-mono">
                    <span className="text-[#8792b0]">Overall Evidence Confidence:</span>
                    <span className="text-emerald-400 font-bold">
                      {(msg.qaData.overallConfidence * 100).toFixed(0)}% Verified Grounding
                    </span>
                  </div>

                  {/* Main Answer text */}
                  <div className="text-sm text-white leading-relaxed space-y-2">
                    <p>{msg.qaData.answerText}</p>
                  </div>

                  {/* Claims & Citations Breakdown */}
                  {msg.qaData.claims && msg.qaData.claims.length > 0 && (
                    <div className="space-y-3 pt-3 border-t border-white/10">
                      <div className="text-xs font-mono uppercase tracking-wider text-[#4fd8ff] font-semibold">
                        Grounded Claim Verification Matrix
                      </div>

                      <div className="space-y-3">
                        {msg.qaData.claims.map((claim, cIdx) => (
                          <div key={cIdx} className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-white">{claim.claim}</span>
                              <span className="font-mono text-[11px] text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10">
                                {(claim.confidenceScore * 100).toFixed(0)}% Match
                              </span>
                            </div>

                            {/* Inline Citations */}
                            <div className="flex flex-wrap gap-2 pt-1">
                              {claim.citations.map((cit, citIdx) => (
                                <button
                                  key={citIdx}
                                  onClick={() => onOpenSourceRef(`${cit.documentName}, ${cit.sectionRef}`)}
                                  className="px-2.5 py-1 rounded-lg bg-[#4fd8ff]/10 border border-[#4fd8ff]/30 text-[#4fd8ff] hover:bg-[#4fd8ff]/20 font-mono text-[11px] transition-all flex items-center gap-1.5"
                                >
                                  <ShieldCheck className="w-3 h-3 text-[#4fd8ff]" />
                                  <span>{cit.documentName} ({cit.sectionRef})</span>
                                  <ExternalLink className="w-3 h-3 text-[#4fd8ff]" />
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-[#8b7bff]/20 border border-[#8b7bff]/40 text-[#8b7bff] flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#ff8fc9]/20 border border-[#ff8fc9]/40 text-[#ff8fc9] flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="glass-panel p-4 rounded-2xl border border-white/10 text-xs font-mono text-[#8792b0] flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-[#ff8fc9]" />
              <span>Evidence Agent querying knowledge graph nodes & cross-checking claims...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Box */}
      <div className="glass-panel p-3 rounded-2xl border border-white/10 flex items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSendQuery();
          }}
          placeholder="Ask any enterprise compliance question (e.g. 'What are our encryption obligations?')..."
          className="flex-1 px-4 py-2 bg-transparent text-xs text-white placeholder-[#5b6482] font-mono focus:outline-none"
        />
        <button
          onClick={() => handleSendQuery()}
          disabled={loading || !query.trim()}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8b7bff] to-[#ff8fc9] text-white text-xs font-heading font-bold shadow-[0_0_16px_rgba(139,123,255,0.3)] hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center gap-1.5"
        >
          <span>Ask</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
};
