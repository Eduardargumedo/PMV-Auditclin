import { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { ClipboardCheck, FileText, Send, Loader2, AlertCircle, ShieldCheck, Save, CheckCircle2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '@/src/lib/AuthProvider';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

const AUDIT_PROMPT = `Eres un experto en auditoría y calidad de la historia clínica en el sistema de salud colombiano, con amplio conocimiento en normativa vigente (CIE-10, CUPS, y estándares de documentación clínica). Tu función es actuar como evaluador formativo y constructivo que ayuda al médico a mejorar la calidad de sus registros clínicos.

## ROL Y TONO
- Habla directamente al médico en segunda persona (usted).
- Tu tono es profesional, respetuoso y formativo. No eres un juez, eres un aliado.
- Reconoce primero los aspectos positivos antes de señalar oportunidades de mejora.
- Usa lenguaje clínico preciso y contextualizado al sistema de salud colombiano.

## TAREA PRINCIPAL
Cuando el médico pegue el texto de una historia clínica, evalúala con base en los siguientes 9 criterios de calidad:

---
RÚBRICA DE EVALUACIÓN DE CALIDAD - HISTORIA CLÍNICA

CRITERIO 1 — TIPO DE EVALUACIÓN
Verifica que la historia especifique claramente el tipo de atención registrada (primera vez, control, urgencia, hospitalización, etc.).

CRITERIO 2 — ANÁLISIS SUBJETIVO
Evalúa si se documenta adecuadamente el motivo de consulta, la anamnesis, antecedentes relevantes (personales, familiares, farmacológicos, quirúrgicos, alérgicos) y la historia de la enfermedad actual con cronología clara.

CRITERIO 3 — EXAMEN FÍSICO
Evalúa de forma individual cada uno de estos componentes:
  3A. Tensión arterial sistólica y diastólica: ¿están registradas con valores numéricos y unidades (mmHg)?
  3B. TAM (Tensión Arterial Media): ¿está calculada o registrada?
  3C. Frecuencia cardíaca: ¿está documentada en lpm?
  3D. Frecuencia respiratoria: ¿está documentada en rpm?
  3E. Temperatura: ¿está registrada con unidades (°C)?
  3F. Hallazgos al examen físico: ¿se describen hallazgos por sistemas de forma organizada y con suficiente detalle clínico?

CRITERIO 4 — INTERPRETACIÓN DE PARACLÍNICOS
Verifica si los resultados de laboratorio, imágenes u otros estudios están interpretados clínicamente, no solo enunciados o transcritos.

CRITERIO 5 — ANÁLISIS Y PLAN DE CONDUCTA
Evalúa si existe un razonamiento clínico explícito que integre los hallazgos subjetivos, objetivos y paraclínicos, y que justifique las decisiones tomadas.

CRITERIO 6 — PLAN DE MANEJO
Verifica que el plan terapéutico esté claramente definido, sea coherente con el análisis clínico y contemple seguimiento.

CRITERIO 7 — DIAGNÓSTICOS CIE-10
Evalúa si los diagnósticos están codificados correctamente con CIE-10, incluyendo causa externa cuando aplica, y finalidades de la atención según la normativa colombiana vigente (Resolución 3374 de 2000 y normas relacionadas con RIPS).

CRITERIO 8 — INDICACIONES MÉDICAS
Verifica que las indicaciones estén escritas de forma clara, completa y comprensible, incluyendo medicamentos con dosis, vía y frecuencia cuando corresponda.

CRITERIO 9 — PROCEDIMIENTOS SOLICITADOS (CUPS)
Evalúa si los procedimientos solicitados están codificados con el código CUPS vigente en Colombia o si al menos están nombrados con terminología que permita su codificación correcta.
---

## ESTRUCTURA DE RESPUESTA OBLIGATORIA
Responde siempre en este orden:

1. RESUMEN GENERAL
   Impresión global de la historia clínica en 2 a 3 oraciones.

2. FORTALEZAS IDENTIFICADAS
   Describe narrativamente qué criterios están bien documentados y por qué eso tiene valor clínico, legal o administrativo.

3. OPORTUNIDADES DE MEJORA (por criterio)
   Para cada criterio con deficiencia o ausencia, explica:
   - Qué falta o está incompleto
   - Por qué es importante incluirlo (clínica, legal o normativamente)
   - Cómo podría corregirse, con ejemplo concreto cuando sea posible

4. RECOMENDACIONES PRIORITARIAS
   Las 3 acciones más urgentes que el médico debe implementar en sus próximas historias clínicas.

5. CIERRE MOTIVADOR
   Una frase breve que refuerce el valor de documentar con calidad.

## REGLAS IMPORTANTES
- Aplica la evaluación a cualquier especialidad médica.
- Si el texto NO parece ser una historia clínica, solicita amablemente el texto correcto.
- Si la historia es muy corta o incompleta, indícalo y evalúa lo disponible.
- Nunca inventes datos clínicos ni asumas información ausente en el texto.
- No emitas diagnósticos ni recomendaciones de tratamiento al paciente.
- Cuando identifiques ausencia de código CIE-10 o CUPS, menciona la obligatoriedad según normativa colombiana vigente.`;

export default function Reviewer() {
  const { user, login } = useAuth();
  const [input, setInput] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAudit = async () => {
    if (!input.trim()) return;
    if (!user) {
      setError("Debe iniciar sesión para realizar auditorías.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setSaveSuccess(false);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: input,
        config: {
          systemInstruction: AUDIT_PROMPT,
        },
      });

      if (response.text) {
        setResult(response.text);
      } else {
        throw new Error('No se pudo generar el análisis.');
      }
    } catch (err) {
      console.error(err);
      setError('Hubo un error al procesar la historia clínica. Por favor, intente de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const saveAudit = async () => {
    if (!user || !result || !input) return;
    
    setSaving(true);
    try {
      await addDoc(collection(db, 'audits'), {
        content: input,
        result: result,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      setSaveSuccess(true);
    } catch (err) {
      console.error("Error saving audit:", err);
      setError("No se pudo guardar la auditoría en el histórico.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-8 animate-in fade-in duration-700">
      {!user && (
        <div className="bg-blue-600 rounded-3xl p-8 text-white shadow-xl shadow-blue-200 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 transition-transform group-hover:scale-110 duration-700" />
          <div className="relative z-10 space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-light italic opacity-90">Bienvenido a AuditClin</h2>
              <h3 className="text-4xl font-bold tracking-tight">Potencie la calidad de sus registros médicos</h3>
            </div>
            <p className="text-blue-50/80 max-w-xl text-lg leading-relaxed">
              Inicie sesión con su cuenta de Google para comenzar a auditar historias clínicas y llevar un registro histórico de sus evaluaciones.
            </p>
            <button 
              onClick={login}
              className="bg-white text-blue-600 px-8 py-4 rounded-full font-bold hover:bg-blue-50 active:scale-95 transition-all shadow-lg flex items-center gap-3 cursor-pointer"
            >
              <ShieldCheck className="w-6 h-6" />
              Iniciar Sesión con Google
            </button>
          </div>
        </div>
      )}

      <div className={cn("grid gap-6 transition-opacity", !user && "opacity-50 pointer-events-none grayscale-[0.5]")}>
        {/* Input Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transition-all hover:shadow-md">
          <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-700 font-medium text-sm">
              <FileText className="w-4 h-4 text-blue-500" />
              Auditoría de Registro Clínico
            </div>
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold bg-white px-2 py-1 rounded-md border border-slate-100 shadow-sm">
              Auditoría IA
            </span>
          </div>
          <div className="p-4">
            <textarea
              className="w-full h-48 p-4 text-slate-800 bg-white border-none focus:ring-0 placeholder:text-slate-300 resize-none font-sans text-base leading-relaxed"
              placeholder="Describa o pegue la historia clínica aquí..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading || !user}
            />
          </div>
          <div className="p-4 bg-white border-t border-slate-50 flex justify-between items-center">
            <button
              onClick={() => setInput('Paciente masculino de 42 años quien consulta por cuadro clínico de 2 días de evolución consistente en dolor lumbar irradiado a miembro inferior derecho, tipo punzada, EVA 8/10. Refiere inicio tras levantar objeto pesado. Antecedentes: Obesidad grado I. Examen físico: Lasegue positivo derecho a 30 grados. Plan: Naproxeno 500mg c/12h por 5 días, calor local, reposo relativo por 3 días. Diagnóstico: M545.')}
              className="text-[10px] uppercase tracking-wider font-bold text-slate-400 hover:text-blue-500 transition-colors cursor-pointer flex items-center gap-1"
            >
              Cargar Ejemplo Clínico
            </button>
            <button
              onClick={handleAudit}
              disabled={loading || !input.trim() || !user}
              className={cn(
                "flex items-center gap-2 px-8 py-3 rounded-full text-white font-bold transition-all shadow-md active:scale-[0.98]",
                loading || !input.trim() || !user
                  ? "bg-slate-200 cursor-not-allowed" 
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-200/50 hover:shadow-xl cursor-pointer"
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <ClipboardCheck className="w-5 h-5" />
                  Ejecutar Auditoría
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 animate-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Results Area */}
        {result && (
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="p-6 border-b border-indigo-50 bg-indigo-50/20 flex items-center justify-between">
              <div className="flex items-center gap-3 text-indigo-900 font-bold">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                Informe de Calidad Clínica
              </div>
              
              {!saveSuccess ? (
                <button
                  onClick={saveAudit}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-200 text-indigo-600 font-bold text-xs hover:bg-indigo-50 transition-all cursor-pointer"
                >
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Guardando...' : 'Guardar en Histórico'}
                </button>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 text-green-600 font-bold text-xs border border-green-100">
                  <CheckCircle2 className="w-4 h-4" />
                  Guardado Exitosamente
                </div>
              )}
            </div>
            
            <div className="p-8 md:p-12 prose prose-slate prose-blue max-w-none prose-sm sm:prose-base prose-headings:font-serif prose-headings:font-bold">
              <div className="markdown-body">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {/* Empty State / Instruction */}
        {!result && !loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm text-blue-500 font-bold italic">C1-2</div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Subjetivo</h3>
              <p className="text-[11px] text-slate-500 leading-normal">Evaluamos motivo de consulta, anamnesis y antecedentes cronológicos.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm text-blue-500 font-bold italic">C3-6</div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Objetivo</h3>
              <p className="text-[11px] text-slate-500 leading-normal">Revisión exhaustiva de signos vitales, hallazgos y plan de conducta.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm text-blue-500 font-bold italic">C7-9</div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Formativo</h3>
              <p className="text-[11px] text-slate-500 leading-normal">Cumplimiento de estándares CIE-10, CUPS e indicaciones farmacológicas.</p>
            </div>
          </div>
        )}
      </div>

      <footer className="pt-8 text-center border-t border-slate-100 text-slate-400 space-y-2 pb-12">
        <p className="text-xs italic">"La calidad del registro es la calidad de la atención."</p>
        <p className="text-[10px] uppercase font-bold tracking-[0.2em]">Normativa Colombiana • Auditoría Médica</p>
      </footer>
    </div>
  );
}
