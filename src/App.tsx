import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, AlertTriangle, ShieldCheck, Loader2, Send, RefreshCw, Paperclip, X, Image as ImageIcon, Video, File as FileIcon } from 'lucide-react';
import { auditContent, AuditFile } from './services/geminiService';
import { cn } from './lib/utils';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';

interface AuditResult {
  riskScores: {
    communityStandards: { score: number, reason: string };
    advertisingStandards: { score: number, reason: string };
    ageRestrictions: { score: number, reason: string };
    overall: { score: number, reason: string };
  };
  potentialViolations: Array<{
    policyName: string;
    layer: string;
    details: string;
  }>;
  worstCaseScenario: string;
  strictSolutions: string[];
}

export default function App() {
  const [inputContent, setInputContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isAuditing, setIsAuditing] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [rawTextResult, setRawTextResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles].slice(0, 3));
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-3 h-3 text-blue-400" />;
    if (type.startsWith('video/')) return <Video className="w-3 h-3 text-purple-400" />;
    return <FileIcon className="w-3 h-3 text-emerald-400" />;
  };

  const readFiles = async (filesToRead: File[]): Promise<AuditFile[]> => {
    return Promise.all(
      filesToRead.map((file) => {
        return new Promise<AuditFile>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64Data = result.split(',')[1];
            resolve({
              data: base64Data,
              mimeType: file.type,
              name: file.name,
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      })
    );
  };

  const extractJson = (text: string): AuditResult | null => {
    try {
      const match = text.match(/```json\n([\s\S]*)\n```/) || text.match(/```\n([\s\S]*)\n```/);
      if (match) return JSON.parse(match[1]);
      return JSON.parse(text.trim());
    } catch(e) {
      console.error("Failed to parse JSON:", e);
      return null;
    }
  };

  const handleAudit = async () => {
    if (!inputContent.trim() && files.length === 0) {
      setError('Vui lòng nhập nội dung hoặc đính kèm file cần kiểm duyệt.');
      return;
    }

    setIsAuditing(true);
    setError(null);
    setResult(null);
    setRawTextResult(null);

    try {
      const auditFiles = await readFiles(files);
      const auditTextResponse = await auditContent(inputContent, auditFiles, '');
      const parsedData = extractJson(auditTextResponse);
      
      if (parsedData && parsedData.riskScores) {
        setResult(parsedData);
      } else {
        setRawTextResult(auditTextResponse);
      }
    } catch (err: any) {
      setError(err?.message || 'Đã xảy ra lỗi trong quá trình kiểm duyệt. Vui lòng thử lại sau.');
    } finally {
      setIsAuditing(false);
    }
  };

  const handleReset = () => {
    setInputContent('');
    setFiles([]);
    setResult(null);
    setRawTextResult(null);
    setError(null);
  };

  const chartData = result ? [
    { name: 'Cộng Đồng', score: result.riskScores.communityStandards.score },
    { name: 'Quảng Cáo', score: result.riskScores.advertisingStandards.score },
    { name: 'Lứa Tuổi', score: result.riskScores.ageRestrictions.score },
  ] : [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 md:p-6 flex flex-col overflow-hidden select-none selection:bg-red-500/30">
      {/* Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 mb-6 shrink-0 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center font-bold text-white shrink-0">M</div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white uppercase">
              Meta Content Risk Auditor <span className="text-red-500 font-mono">v2.026</span>
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest hidden sm:block">Senior Level Security Intelligence Platform</p>
          </div>
        </div>
        <div className="flex gap-2 sm:gap-4 shrink-0">
          <div className="px-3 py-1 border border-slate-800 bg-slate-900 text-[10px] font-mono text-slate-400 uppercase hidden md:flex items-center">
            VAI TRÒ: SENIOR AUDITOR
          </div>
          <div className={cn(
            "px-3 py-1 border text-[10px] font-mono uppercase flex items-center",
            isAuditing ? "border-orange-900 bg-orange-950/20 text-orange-400" : (result || rawTextResult) ? "border-red-900 bg-red-950/20 text-red-400" : "border-slate-800 bg-slate-900 text-slate-400"
          )}>
            Status: {isAuditing ? "Scanning" : (result || rawTextResult) ? "Audit Complete" : "Awaiting Input"}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0 overflow-y-auto lg:overflow-hidden">
        
        {/* Left Column: Content Review */}
        <div className={cn("col-span-12 flex flex-col gap-4 h-full", (result || rawTextResult) ? "lg:col-span-4" : "lg:col-span-6 lg:col-start-4")}>
          <div className="bg-slate-900/50 border border-slate-800 p-4 flex flex-col flex-1 min-h-[300px]">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-500" />
                Content Input Analysis
              </span>
              <span className={cn("w-2 h-2 rounded-full", isAuditing ? "bg-red-500 animate-pulse" : "bg-blue-500")}></span>
            </div>
            
            <div 
              className={cn(
                "flex-1 flex flex-col bg-slate-950 border transition-all duration-300 relative",
                isAuditing ? "border-slate-800" : "border-slate-800 focus-within:ring-1 focus-within:ring-red-500/50 focus-within:border-red-500/50"
              )}
            >
              <textarea
                value={inputContent}
                onChange={(e) => setInputContent(e.target.value)}
                placeholder="Nhập nội dung text, kịch bản video... (Có thể để trống nếu đã chọn file đính kèm)"
                className="flex-1 w-full h-[150px] lg:h-auto bg-transparent p-3 font-mono text-xs leading-relaxed text-slate-300 resize-none 
                  placeholder:text-slate-600 focus:outline-none custom-scrollbar"
                disabled={isAuditing}
              />
              
              {files.length > 0 && (
                <div className="p-2 border-t border-slate-800 bg-slate-900/50 flex flex-wrap gap-2 shrink-0">
                  {files.map((file, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-300">
                      {getFileIcon(file.type)}
                      <span className="truncate max-w-[120px]">{file.name}</span>
                      <button 
                        onClick={() => handleRemoveFile(i)}
                        disabled={isAuditing}
                        className="hover:text-red-400 p-0.5 rounded transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="p-2 border-t border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/50">
                <div className="flex items-center gap-2">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileSelect} 
                    multiple 
                    accept="image/*,video/*,.pdf,.txt" 
                    className="hidden" 
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isAuditing}
                    className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors flex items-center gap-2"
                    title="Đính kèm file (Ảnh, Video, PDF...)"
                  >
                    <Paperclip className="w-4 h-4" />
                    <span className="text-[10px] font-mono font-bold uppercase">Đính kèm (Video / Image / Text)</span>
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 font-mono hidden sm:inline-block">
                  {files.length}/3 files
                </span>
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 p-3 bg-red-950/30 border border-red-900/50 text-red-400 text-xs rounded flex items-start gap-2 shrink-0"
              >
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <p className="leading-relaxed">{error}</p>
              </motion.div>
            )}

            <div className="mt-4 flex items-center gap-3 shrink-0">
              <button
                onClick={handleAudit}
                disabled={isAuditing || (!inputContent.trim() && files.length === 0)}
                className={cn(
                  "flex-1 py-3 text-white font-bold text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2",
                  isAuditing || (!inputContent.trim() && files.length === 0)
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
                    : "bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20 active:scale-[0.99]"
                )}
              >
                {isAuditing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang quét...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Kiểm Duyệt Ngay
                  </>
                )}
              </button>

              {((result || rawTextResult) || inputContent || files.length > 0) && !isAuditing && (
                <button
                  onClick={handleReset}
                  className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors border border-slate-700"
                  title="Làm mới"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {result && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900/50 border border-slate-800 p-4 flex flex-col shrink-0"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Worst-Case Scenario</span>
              </div>
              <div className="bg-red-950/30 border border-red-900/50 p-4 rounded">
                <div className="text-red-400 font-bold text-xs uppercase mb-1 underline">AI Projection</div>
                <p className="text-[11px] leading-relaxed text-slate-300 italic">
                  {result.worstCaseScenario}
                </p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Center Column: Core Audit Engine (only show if result exists) */}
        {(result || isAuditing) && (
          <div className="col-span-12 lg:col-span-4 bg-slate-900/30 lg:border-x border-slate-800 p-4 lg:py-0 relative min-h-[400px]">
             {isAuditing ? (
               <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                 <div className="relative">
                    <div className="w-16 h-16 border-[6px] border-slate-800 rounded-full"></div>
                    <div className="w-16 h-16 border-[6px] border-red-600 rounded-full border-t-transparent animate-spin absolute inset-0"></div>
                    <ShieldAlert className="w-5 h-5 text-red-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <p className="mt-6 text-red-500 font-mono text-xs tracking-widest uppercase animate-pulse">Running Deep Scan Protocol...</p>
               </div>
             ) : (
                result && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col h-full py-4 space-y-8"
                  >
                    <div className="text-center">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Risk Assessment Score</div>
                      <div className="relative inline-block">
                        <div className="w-48 h-48 flex items-center justify-center relative">
                          <svg className="w-48 h-48 transform -rotate-90 absolute inset-0">
                            <circle
                              cx="96"
                              cy="96"
                              r="80"
                              stroke="rgba(30, 41, 59, 1)"
                              strokeWidth="12"
                              fill="none"
                            />
                            <circle
                              cx="96"
                              cy="96"
                              r="80"
                              stroke={result.riskScores.overall.score >= 8 ? '#dc2626' : result.riskScores.overall.score >= 5 ? '#f97316' : '#eab308'}
                              strokeWidth="12"
                              fill="none"
                              strokeDasharray={2 * Math.PI * 80}
                              strokeDashoffset={(2 * Math.PI * 80) - ((result.riskScores.overall.score / 10) * (2 * Math.PI * 80))}
                              strokeLinecap="round"
                              className="transition-all duration-1000 ease-out"
                            />
                          </svg>
                          <div className="text-center z-10 flex flex-col items-center">
                            <span className="text-7xl font-bold text-white leading-none">{result.riskScores.overall.score}</span>
                            <div className={cn(
                              "text-[10px] font-mono uppercase mt-2 font-bold",
                              result.riskScores.overall.score >= 8 ? "text-red-500" : result.riskScores.overall.score >= 5 ? "text-orange-500" : "text-yellow-500"
                            )}>
                               {result.riskScores.overall.score >= 8 ? 'Critical Risk' : result.riskScores.overall.score >= 5 ? 'High Risk' : 'Medium Risk'}
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="mt-4 text-xs italic text-slate-400 max-w-[250px] mx-auto">
                        {result.riskScores.overall.reason}
                      </p>
                    </div>

                    <div className="flex-1 min-h-[200px]">
                      <div className="flex justify-between items-end border-b border-slate-800 pb-2 mb-4">
                        <span className="text-[10px] font-mono text-slate-500">Multi-Layer Scan Signals</span>
                      </div>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 30, left: 30, bottom: 0 }}>
                          <XAxis type="number" domain={[0, 10]} hide />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 'bold'}} width={80} />
                          <Bar dataKey="score" barSize={12} radius={[0, 4, 4, 0]}>
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.score >= 8 ? '#dc2626' : entry.score >= 5 ? '#f97316' : '#eab308'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>
                )
             )}
          </div>
        )}

        {/* Right Column: Specific Violations & Solutions (only show if result exists) */}
        {result && !isAuditing && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="col-span-12 lg:col-span-4 flex flex-col gap-4 h-[600px] lg:h-auto"
          >
            <div className="bg-slate-900 border border-slate-800 p-4 h-1/2 flex flex-col">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 shrink-0">Policy Citations</span>
              <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                {result.potentialViolations.map((violation, idx) => (
                  <div key={idx} className={cn("p-3 bg-slate-950 border-l-2", violation.layer.includes("cộng đồng") ? "border-amber-500" : violation.layer.includes("quảng cáo") ? "border-blue-500" : "border-rose-500")}>
                    <div className="text-[11px] font-bold text-white uppercase">{violation.policyName}</div>
                    <div className="text-[9px] font-mono text-slate-500 mt-0.5">{violation.layer}</div>
                    <p className="text-[10px] text-slate-300 leading-tight mt-2">{violation.details}</p>
                  </div>
                ))}
                {result.potentialViolations.length === 0 && (
                  <div className="text-xs text-slate-500 italic p-2">Không tìm thấy vi phạm cụ thể.</div>
                )}
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 p-4 flex-1 flex flex-col">
              <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider mb-3 shrink-0">Mandatory Audit Corrections</span>
              <ul className="space-y-3 text-[11px] font-mono text-slate-300 overflow-y-auto custom-scrollbar pr-2 mb-4">
                {result.strictSolutions.map((solution, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-red-500 shrink-0">[!]</span>
                    <span className="leading-snug">{solution}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto shrink-0">
                <button 
                  onClick={handleReset}
                  className="w-full py-3 border border-red-900/50 bg-red-950/20 hover:bg-red-900/30 text-red-500 font-bold text-xs uppercase tracking-widest transition-colors"
                >
                  Clear & Re-Scan
                </button>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Fallback for raw text if JSON parsing failed but we got a response */}
        {rawTextResult && !isAuditing && !result && (
          <div className="col-span-12 lg:col-span-8 bg-slate-900/30 border border-slate-800 p-6 overflow-y-auto">
            <h3 className="text-red-500 font-mono text-sm tracking-widest uppercase mb-4">Fallback Response (JSON Parse Error)</h3>
            <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono custom-scrollbar">{rawTextResult}</pre>
          </div>
        )}
      </div>

      {/* Mandatory Footer */}
      <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
        <div className="text-[10px] text-slate-500 max-w-[600px] italic text-center md:text-left">
          Lưu ý: Các đánh giá này dựa trên tiêu chuẩn hiện hành và có tính chất tham khảo. Quyết định cuối cùng luôn thuộc về hệ thống kiểm duyệt thực tế của Facebook.
        </div>
        <div className="text-[10px] font-mono text-slate-400 text-center md:text-right">
          Bản quyền thông tin thuộc về <span className="text-blue-400">Tùng Tinh Tấn</span><br/>
          Contact: tung.edtech@gmail.com | 0833821008
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 1);
          border-left: 1px solid rgba(30, 41, 59, 1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(220, 38, 38, 0.4);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(220, 38, 38, 0.8);
        }
      `}</style>
    </div>
  );
}
