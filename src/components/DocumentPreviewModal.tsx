import React from 'react';
import {
  X,
  FileText,
  Download,
  ExternalLink,
  Printer,
  CheckCircle2,
  Cpu,
  Layers,
} from 'lucide-react';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  filename: string;
  title: string;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  filename,
  title,
}) => {
  if (!isOpen) return null;

  const isSpec = filename.toLowerCase().includes('spec') || filename.toLowerCase().includes('manual') || filename.toLowerCase().includes('hardware');
  const isSimcom = filename.toUpperCase().includes('SIMCOM') || filename.toUpperCase().includes('A7671');
  const isJlc = filename.toUpperCase().includes('JLCPCB');
  const isPcbway = filename.toUpperCase().includes('PCBWAY');

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-300 overflow-hidden my-auto animate-in fade-in zoom-in-95 flex flex-col max-h-[88vh] mb-14 sm:mb-0">
        
        {/* Top Bar */}
        <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-indigo-600 rounded-lg">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-mono text-xs font-bold truncate max-w-md">{filename}</h3>
              <p className="text-[10px] text-slate-400">{title} · Archived Technical Document</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                alert(`Simulated download: "${filename}" saved to downloads folder.`);
              }}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors text-xs flex items-center gap-1 px-2.5"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Document Render Body */}
        <div className="p-6 overflow-y-auto bg-slate-100/70 text-slate-800 flex justify-center flex-1 min-h-0">
          <div className="bg-white p-8 rounded-lg shadow-md border border-slate-200 max-w-2xl w-full text-xs space-y-6">
            
            {/* Header Document Banner */}
            <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
              <div>
                <div className="font-bold text-base text-slate-950">
                  {isSimcom ? 'SIMCom Wireless Solutions Co., Ltd.' : isJlc ? 'JLCPCB Technical Review Division' : isPcbway ? 'PCBWay Engineering Services' : 'Technical Document Specification'}
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Reference File: {filename} · Authenticated Copy
                </div>
              </div>
              <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 font-mono">
                PDF
              </div>
            </div>

            {/* Simulated Content based on document type */}
            {isSpec ? (
              <div className="space-y-4">
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-950">
                  <div className="font-bold text-xs uppercase tracking-wider mb-1">
                    Technical Specification Abstract
                  </div>
                  <p className="leading-relaxed">
                    LTE Cat-1 bis Module with Integrated GNSS (Global Frequency Bands with US Band 71 support).
                    Compatible footprint with A7670G/A7671G series. Supports external host MCU command mode via UART.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">
                    Key Electrical & RF Characteristics:
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-700">
                    <li><strong>Form Factor:</strong> LGA 24.0 x 24.0 x 2.4 mm (100% pin-compatible)</li>
                    <li><strong>Variants:</strong> Primary: A7671G-MBXV (HW PN: S2-1307G, GNSS); Fallback: A7671G-LBXV (HW PN: S2-1309J, No GNSS)</li>
                    <li><strong>Frequency Bands:</strong> LTE-FDD B1/B2/B3/B4/B5/B7/B8/B12/B13/B18/B19/B20/B25/B26/B28/B66/B71</li>
                    <li><strong>Supply Voltage:</strong> 3.4V ~ 4.2V (Typical: 3.8V)</li>
                    <li><strong>Software SDK:</strong> External host MCU interface with standard 3GPP and SIMCom proprietary AT commands</li>
                  </ul>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-950">
                  <span className="font-bold">Authorized Distributor Channel: </span>
                  <span>AZLINK (Contact: melody@azlink-iot.com). Quotation and EVK sample dispatch verified.</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="font-bold text-xs text-slate-900 mb-1">
                    Communication Transcript & Outcome Record
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Official record from live supplier interaction. Verified by Procurement & Hardware Engineering team.
                  </p>
                </div>

                {isJlc && (
                  <div className="space-y-2 text-slate-700">
                    <h4 className="font-bold text-slate-900">Functional Testing Evaluation for 5,000 PCBs</h4>
                    <p className="leading-relaxed">
                      Confirmed that JLCPCB can perform automated test fixture testing for the 5,000 PCB order subject to technical review.
                      Deliverables required from customer:
                    </p>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Detailed functional testing procedure steps and acceptance criteria</li>
                      <li>Hex/binary firmware file for flashing onto MCU</li>
                      <li>Short video demonstration of expected LED test pass/fail sequence</li>
                    </ol>
                  </div>
                )}

                {isPcbway && (
                  <div className="space-y-2 text-slate-700">
                    <h4 className="font-bold text-slate-900">Functional Testing & Test Jig Fabrication Options</h4>
                    <p className="leading-relaxed">
                      PCBWay confirmed dual options for the 5,000-unit production run:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>Option A:</strong> PCBWay fabricates custom test jigs in-house according to provided Gerber test points.</li>
                      <li><strong>Option B:</strong> Customer supplies fabricated jigs directly to the assembly line.</li>
                      <li>Requires advance notification to sales representative prior to panelization.</li>
                    </ul>
                  </div>
                )}

                {isSimcom && (
                  <div className="space-y-2 text-slate-700">
                    <h4 className="font-bold text-slate-900">SIMCom Procurement & Commercial Quotation</h4>
                    <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[11px]">
                      <div>
                        <div className="text-slate-400">Model: A7671G-MBXV</div>
                        <div className="font-bold text-slate-900 text-sm">$6.72 USD / unit</div>
                        <div className="text-slate-500">EXW Hong Kong</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Model: A7671G-LBXV</div>
                        <div className="font-bold text-slate-900 text-sm">$5.42 USD / unit</div>
                        <div className="text-slate-500">EXW Hong Kong</div>
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-2">
                      Lead time: 6–8 weeks after payment confirmation. FoC sample modules + 1 EVK approved for dispatch.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Document Signature / Stamp */}
            <div className="border-t border-slate-200 pt-4 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                <span>Verified by Procurement Operations</span>
              </div>
              <span className="font-mono">Doc ID: {filename.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)}</span>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-900"
          >
            Close Viewer
          </button>
        </div>

      </div>
    </div>
  );
};
