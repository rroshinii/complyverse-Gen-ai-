import React from 'react';
import { X, ShieldCheck, FileText, ExternalLink, Copy, Check } from 'lucide-react';

interface DocumentViewerModalProps {
  sourceRef: string | null;
  onClose: () => void;
}

const DOCUMENT_MOCK_DATABASE: Record<string, string> = {
  'Acme_DPA_2024.pdf': `
DATA PROCESSING ADDENDUM (DPA) - ACME CORPORATION & CLOUDSERVE
------------------------------------------------------------------
Section 1. Scope & Definitions
1.1 "Customer Personal Data" means any personal data processed by Processor on behalf of Controller under the Agreement.

Section 4. Sub-processors
4.2 Prior Written Notice: Processor shall provide at least 30 calendar days advance written notice to Controller before engaging any new sub-processor or replacing an existing sub-processor. Controller may object in writing within 14 days of notice.

Section 8. Data Breach Notification & Incident Handling
8.1 SLA Notice: In the event of a confirmed Personal Data Breach, Processor shall notify Controller in writing within 24 hours of discovery. Notification shall include nature of incident, affected data categories, and mitigation measures.

Section 14. Audit & Compliance Reports
14.3 Annual SOC 2 Audit: Processor shall furnish an updated SOC 2 Type II audit report to Controller annually by October 31.
  `,
  'CloudServe_Schedule_B.pdf': `
CLOUDSERVE SCHEDULE B - SUB-PROCESSOR REGIONS & SECURITY
------------------------------------------------------------------
Exhibit 1: Primary Data Center Regions
- Primary EU Operations: Frankfurt, Germany (AWS eu-central-1) & Dublin, Ireland (AWS eu-west-1).
- Secondary Disaster Recovery Replication: Singapore (AWS ap-southeast-1).

Exhibit 2: Technical & Organizational Safeguards
- Encryption Standard: All customer EU personal identifiers and data residing in cloud storage or in transit across public networks must be encrypted using AES-256 algorithm certified to FIPS 140-2 Level 3.
  `,
  'EU_2016_679_GDPR.pdf': `
EUROPEAN UNION GENERAL DATA PROTECTION REGULATION (GDPR)
------------------------------------------------------------------
Article 28(3): Contracts between Data Controllers and Data Processors
Processing by a processor shall be governed by a contract... that sets out the subject-matter, duration, nature and purpose of processing, and that the processor shall not engage another processor without prior specific or general written authorization of the controller.

Article 33: Notification of a Personal Data Breach
In the case of a personal data breach, the controller shall without undue delay and, where feasible, not later than 72 hours after having become aware of it, notify the personal data breach to the supervisory authority.
  `
};

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ sourceRef, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!sourceRef) return null;

  // Extract doc name from sourceRef (e.g. "Acme_DPA_2024.pdf, Section 4.2")
  const docNamePart = sourceRef.split(',')[0].trim();
  const rawText =
    DOCUMENT_MOCK_DATABASE[docNamePart] ||
    `
SOURCE REFERENCE CLAUSE EXCERPT
------------------------------------------------------------------
Ref: ${sourceRef}

"The Processor shall process Customer Personal Data strictly in accordance with documented instructions, maintain technical encryption safeguards, and enforce strict sub-processor notice windows."
  `;

  const handleCopy = () => {
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex justify-end transition-all">
      <div className="w-full max-w-2xl bg-[#0a0e1c] border-l border-white/10 h-full p-6 overflow-y-auto space-y-6 animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#4fd8ff]" />
            <div>
              <h3 className="font-heading font-bold text-base text-white">Source Document Viewer</h3>
              <p className="text-xs text-[#8792b0] font-mono">{sourceRef}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#8792b0] hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Verification Tag */}
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>100% Traceable Knowledge Graph Evidence Citation</span>
          </span>
          <button
            onClick={handleCopy}
            className="p-1 rounded text-[#8792b0] hover:text-white flex items-center gap-1"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* Document Content display */}
        <div className="p-5 rounded-2xl bg-black/60 border border-white/10 font-mono text-xs text-[#edeffb] leading-relaxed whitespace-pre-wrap space-y-2">
          {rawText}
        </div>

      </div>
    </div>
  );
};
