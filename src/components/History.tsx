import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { useAuth } from '@/src/lib/AuthProvider';
import { FileText, Calendar, ChevronRight, Loader2, AlertCircle, History as HistoryIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface AuditRecord {
  id: string;
  content: string;
  result: string;
  createdAt: any;
}

export default function History() {
  const { user } = useAuth();
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAudit, setSelectedAudit] = useState<AuditRecord | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchAudits = async () => {
      try {
        const q = query(
          collection(db, 'audits'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as AuditRecord[];
        setAudits(data);
      } catch (error) {
        console.error("Error fetching audits:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAudits();
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-slate-500 font-medium">Cargando histórico...</p>
      </div>
    );
  }

  if (audits.length === 0) {
    return (
      <div className="text-center p-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
        <HistoryIcon className="w-12 h-12 text-slate-200 mx-auto mb-4" />
        <h3 className="text-slate-900 font-medium mb-1">Sin auditorías previas</h3>
        <p className="text-slate-500 text-sm">Sus auditorías guardadas aparecerán aquí.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
      <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-250px)] pr-2">
        {audits.map((audit) => (
          <button
            key={audit.id}
            onClick={() => setSelectedAudit(audit)}
            className={cn(
              "w-full text-left p-4 rounded-xl border transition-all group",
              selectedAudit?.id === audit.id
                ? "bg-blue-50 border-blue-200 shadow-sm"
                : "bg-white border-slate-100 hover:border-blue-200 hover:shadow-sm"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-slate-800 line-clamp-1">
                  {audit.content.substring(0, 50)}...
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Calendar className="w-3 h-3" />
                  {audit.createdAt?.toDate().toLocaleDateString('es-CO', { 
                    day: 'numeric', 
                    month: 'short', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
              <ChevronRight className={cn(
                "w-4 h-4 transition-transform",
                selectedAudit?.id === audit.id ? "text-blue-500 translate-x-1" : "text-slate-300 group-hover:text-blue-400 group-hover:translate-x-0.5"
              )} />
            </div>
          </button>
        ))}
      </div>

      <div className="relative">
        <AnimatePresence mode="wait">
          {selectedAudit ? (
            <motion.div
              key={selectedAudit.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full sticky top-4"
            >
              <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700 font-medium text-xs">
                  <FileText className="w-4 h-4 text-blue-500" />
                  Detalle de la Auditoría
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  ID: {selectedAudit.id.substring(0, 8)}
                </span>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(100vh-320px)] prose prose-slate prose-blue max-w-none prose-sm">
                <div className="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-100 italic text-slate-600">
                  <p className="text-[11px] uppercase font-bold text-slate-400 mb-2 not-italic">Texto Original:</p>
                  "{selectedAudit.content}"
                </div>
                <div className="markdown-body">
                  <ReactMarkdown>{selectedAudit.result}</ReactMarkdown>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex items-center justify-center p-12 border-2 border-dashed border-slate-100 rounded-2xl">
              <div className="text-center space-y-2">
                <FileText className="w-8 h-8 text-slate-200 mx-auto" />
                <p className="text-slate-400 text-sm">Seleccione una auditoría para ver el detalle</p>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
