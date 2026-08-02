import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, Cpu, AlertCircle, ArrowRight, ShieldCheck, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { ExtractedEntity, IngestionResult } from '../types';

interface UploadReviewProps {
  onCommitSuccess: () => void;
  onOpenSourceRef?: (sourceRef: string) => void;
}

const SAMPLE_DOCS = [
  {
    title: 'EU GDPR Article 28 DPA (Data Processing Addendum)',
    fileName: 'Acme_GDPR_DPA_2024.pdf',
    text: `
DATA PROCESSING ADDENDUM (DPA) - ACME CORP & CLOUDSERVE
Section 1.1: Parties - Controller: Acme Corporation (USA). Processor: CloudServe Infrastructure Inc (Germany).
Section 3.2: Purpose of Processing - Processor shall process Customer Personal Data solely to deliver Cloud Hosting Services.
Section 4.2: Sub-processors - Processor shall provide at least 30 days prior written notice before engaging any new sub-processor. Controller retains right to object within 14 days.
Section 8.1: Data Breach Notification - In the event of a confirmed Personal Data Breach, Processor shall notify Controller in writing within 24 hours of becoming aware.
Section 14.3: Audit Rights - Processor shall deliver an annual SOC 2 Type II audit report to Controller by October 31 of each calendar year.
    `
  },
  {
    title: 'Cloud Vendor SLA & Technical Security Schedule',
    fileName: 'CloudServe_Security_SLA.pdf',
    text: `
CLOUDSERVE INFRASTRUCTURE SLA & SECURITY EXHIBIT
Clause 2.1: Technical Safeguards - All EU Customer Identifiers and Personal Data must be encrypted at rest and in transit using AES-256 algorithm certified to FIPS 140-2 Level 3.
Clause 5.4: Regional Transfer Limits - Primary data centers located in Frankfurt (Germany) and Dublin (Ireland). Secondary disaster recovery replica in Singapore.
Clause 9.1: Vulnerability Assessments - Processor shall perform quarterly penetration testing and deliver executive summary logs to Controller within 15 days of test completion.
    `
  },
  {
    title: 'Biometric AI Identification Vendor Proposal',
    fileName: 'BiometricAuth_Vendor_Proposal.pdf',
    text: `
PROPOSED SUB-PROCESSOR ENGAGEMENT AGREEMENT
Item 1: Service Scope - Provision of real-time facial recognition and biometric identity verification for end-user login authentication.
Item 3: Data Transfer - Biometric feature templates stored in AWS US-East (Virginia) data centers.
Item 7: Compliance Note - Requires explicit biometric consent collection under GDPR Article 9 and California CPRA.
    `
  }
];

export const UploadReview: React.FC<UploadReviewProps> = ({ onCommitSuccess, onOpenSourceRef }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'text'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState<string>('');
  const [documentName, setDocumentName] = useState<string>('Enterprise_Compliance_Doc.pdf');

  const [loading, setLoading] = useState<boolean>(false);
  const [ingestionResult, setIngestionResult] = useState<IngestionResult | null>(null);
  const [extractedEntities, setExtractedEntities] = useState<ExtractedEntity[]>([]);
  const [ingestionError, setIngestionError] = useState<string | null>(null);

  const [committing, setCommitting] = useState<boolean>(false);
  const [commitMessage, setCommitMessage] = useState<string | null>(null);

  // Load a sample contract template
  const handleSelectSample = (sample: typeof SAMPLE_DOCS[0]) => {
    setDocumentName(sample.fileName);
    setPastedText(sample.text.trim());
    setActiveTab('text');
    setIngestionError(null);
  };

  // Run Ingestion Agent API
  const handleRunIngestion = async () => {
    setLoading(true);
    setCommitMessage(null);
    setIngestionError(null);

    try {
      let bodyData: any = {
        fileName: documentName,
        textContent: pastedText
      };

      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('fileName', selectedFile.name);

        const res = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData
        });
        const json = await res.json();
        if (json.success) {
          setIngestionResult(json.data);
          setExtractedEntities(json.data.extractedEntities);
        } else {
          setIngestionError(json.error || 'Failed to process the uploaded file.');
        }
      } else {
        const res = await fetch('/api/documents/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyData)
        });
        const json = await res.json();
        if (json.success) {
          setIngestionResult(json.data);
          setExtractedEntities(json.data.extractedEntities);
        } else {
          setIngestionError(json.error || 'Failed to process the document text.');
        }
      }
    } catch (err: any) {
      console.error('Ingestion failed:', err);
      setIngestionError(err?.message || 'Ingestion request failed. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Update an extracted entity property
  const handleEntityChange = (index: number, field: keyof ExtractedEntity, value: any) => {
    const updated = [...extractedEntities];
    updated[index] = { ...updated[index], [field]: value };
    setExtractedEntities(updated);
  };

  // Run Graph Agent to commit entities
  const handleCommitToGraph = async () => {
    if (extractedEntities.length === 0) return;
    setCommitting(true);

    try {
      const res = await fetch('/api/documents/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entities: extractedEntities })
      });
      const json = await res.json();

      if (json.success) {
        setCommitMessage(
          `Success! Committed ${json.data.createdNodesCount} new nodes, merged ${json.data.mergedNodesCount} duplicates, created ${json.data.createdEdgesCount} edges.`
        );
        setTimeout(() => {
          onCommitSuccess();
        }, 1500);
      }
    } catch (err) {
      console.error('Commit failed:', err);
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#8b7bff]/10 border border-[#8b7bff]/30 text-[#8b7bff] text-xs font-mono mb-2">
            <Cpu className="w-3.5 h-3.5" /> Agent Stage 01 & 02
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-white">Document Ingestion & Entity Review</h1>
          <p className="text-xs text-[#8792b0] mt-1">
            Upload compliance documents to extract Parties, Obligations, Regulations, and Deadlines with citation tracking.
          </p>
        </div>

        {/* Quick Sample Pickers */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-xs text-[#8792b0] font-mono whitespace-nowrap">Load Sample:</span>
          {SAMPLE_DOCS.map((sample, i) => (
            <button
              key={i}
              onClick={() => handleSelectSample(sample)}
              className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-[#8b7bff]/40 hover:text-[#4fd8ff] text-xs font-mono transition-all text-left truncate max-w-[180px]"
              title={sample.title}
            >
              {sample.fileName}
            </button>
          ))}
        </div>
      </div>

      {/* Upload / Ingestion Form Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            
            <div className="flex items-center justify-between">
              <span className="font-heading font-semibold text-sm text-white">Document Input</span>
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg text-xs font-mono">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`px-2.5 py-1 rounded-md transition-all ${activeTab === 'upload' ? 'bg-[#8b7bff] text-white' : 'text-[#8792b0]'}`}
                >
                  File
                </button>
                <button
                  onClick={() => setActiveTab('text')}
                  className={`px-2.5 py-1 rounded-md transition-all ${activeTab === 'text' ? 'bg-[#8b7bff] text-white' : 'text-[#8792b0]'}`}
                >
                  Text
                </button>
              </div>
            </div>

            {/* Document Name input */}
            <div>
              <label className="text-xs font-mono text-[#8792b0] block mb-1">Document Identifier / File Name</label>
              <input
                type="text"
                value={documentName}
                onChange={e => setDocumentName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-[#8b7bff]"
              />
            </div>

            {/* File Dropzone or Text Area */}
            {activeTab === 'upload' ? (
              <div className="border-2 border-dashed border-white/15 hover:border-[#8b7bff]/50 rounded-2xl p-6 text-center space-y-3 cursor-pointer transition-all bg-white/5">
                <Upload className="w-8 h-8 text-[#8b7bff] mx-auto" />
                <div>
                  <label className="text-xs font-semibold text-white cursor-pointer hover:underline">
                    Click to select file
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt,.xlsx,.xls,.csv"
                      className="hidden"
                      onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedFile(e.target.files[0]);
                          setDocumentName(e.target.files[0].name);
                          setIngestionError(null);
                        }
                      }}
                    />
                  </label>
                  <p className="text-[11px] text-[#8792b0] mt-1 font-mono">PDF, DOCX, XLSX, CSV, TXT (Max 25MB)</p>
                </div>
                {selectedFile && (
                  <div className="p-2 rounded-lg bg-[#8b7bff]/20 text-[#4fd8ff] font-mono text-xs truncate">
                    Selected: {selectedFile.name}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="text-xs font-mono text-[#8792b0] block mb-1">Document Text Content</label>
                <textarea
                  rows={8}
                  value={pastedText}
                  onChange={e => setPastedText(e.target.value)}
                  placeholder="Paste contract clauses, policy text, or regulatory articles here..."
                  className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-[#8b7bff] resize-none"
                />
              </div>
            )}

            {/* Ingestion Submit Button */}
            <button
              onClick={handleRunIngestion}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#8b7bff] to-[#5b4fd6] text-white font-heading font-semibold text-xs shadow-[0_0_20px_rgba(139,123,255,0.3)] hover:shadow-[0_0_28px_rgba(139,123,255,0.5)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Ingestion Agent Analyzing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#4fd8ff]" />
                  <span>Run Ingestion Agent</span>
                </>
              )}
            </button>

            {/* Error Banner - shown when a file/text upload fails to parse or ingest */}
            {ingestionError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{ingestionError}</span>
              </div>
            )}

          </div>
        </div>

        {/* Extracted Entities Matrix Card */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-panel p-6 rounded-2xl space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
              <div>
                <h2 className="font-heading font-bold text-base text-white">Extracted Candidate Entities</h2>
                <p className="text-xs text-[#8792b0]">
                  {extractedEntities.length > 0
                    ? `Review and edit ${extractedEntities.length} extracted graph nodes before committing.`
                    : 'Run Ingestion Agent to preview extracted graph elements.'}
                </p>
              </div>

              {extractedEntities.length > 0 && (
                <button
                  onClick={handleCommitToGraph}
                  disabled={committing}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-heading font-semibold text-xs shadow-[0_0_16px_rgba(16,185,129,0.3)] hover:shadow-[0_0_24px_rgba(16,185,129,0.5)] transition-all flex items-center gap-2 self-start sm:self-auto disabled:opacity-50"
                >
                  {committing ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  )}
                  <span>Commit to Knowledge Graph</span>
                </button>
              )}
            </div>

            {/* Success Message Banner */}
            {commitMessage && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>{commitMessage}</span>
              </div>
            )}

            {/* Entity List / Table */}
            {extractedEntities.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#8792b0] font-mono space-y-3">
                <FileText className="w-10 h-10 text-[#5b6482] mx-auto" />
                <p>No extracted entities in queue. Select a sample contract or upload a document to begin.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {extractedEntities.map((entity, idx) => (
                  <div key={entity.tempId || idx} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all space-y-3">
                    
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {/* Type badge selector */}
                        <select
                          value={entity.type}
                          onChange={e => handleEntityChange(idx, 'type', e.target.value)}
                          className="px-2.5 py-1 rounded-lg bg-[#0a0e1c] border border-white/20 text-xs font-mono text-[#4fd8ff] focus:outline-none"
                        >
                          <option value="Party">Party</option>
                          <option value="Obligation">Obligation</option>
                          <option value="Regulation">Regulation</option>
                          <option value="Deadline">Deadline</option>
                          <option value="RiskFlag">RiskFlag</option>
                        </select>

                        <span className="text-[11px] font-mono text-[#8792b0]">
                          Confidence: {(entity.confidenceScore * 100).toFixed(0)}%
                        </span>
                      </div>

                      {/* Source Reference Tag */}
                      <div className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        <span>{entity.source_ref}</span>
                      </div>
                    </div>

                    {/* Label input */}
                    <div>
                      <input
                        type="text"
                        value={entity.label}
                        onChange={e => handleEntityChange(idx, 'label', e.target.value)}
                        className="w-full font-heading font-semibold text-sm text-white bg-transparent border-b border-white/10 focus:border-[#8b7bff] focus:outline-none pb-1"
                      />
                    </div>

                    {/* Description textarea */}
                    <div>
                      <textarea
                        rows={2}
                        value={entity.description}
                        onChange={e => handleEntityChange(idx, 'description', e.target.value)}
                        className="w-full text-xs text-[#8792b0] bg-black/20 p-2 rounded-lg border border-white/10 focus:outline-none focus:border-[#8b7bff] resize-none"
                      />
                    </div>

                  </div>
                ))}
              </div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
};
