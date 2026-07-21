"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ChevronRight, ChevronLeft, Shield, AlertTriangle, Heart,
  Zap, Eye, Package, FileQuestion, Copyright, User, Baby,
  CheckCircle2, Lock, Camera, Mic, Paperclip,
} from "lucide-react";

interface Category {
  id: string;
  label: string;
  icon: any;
  color: string;
  severity: "low" | "medium" | "high" | "critical";
  subcategories: string[];
  whoFlow?: boolean;
  specialScreen?: string;
}

const CATEGORIES: Category[] = [
  { id:"spam", label:"Spam & Scam", icon:Package, color:"#f59e0b", severity:"medium", subcategories:["Spam","Phishing","Investment Scam","Crypto Scam","Fake Giveaway","Fake Job Offer","Romance Scam","Lottery Scam","Fake Support Account","Identity Theft","Account Recovery Scam","Money Mule","Fake Business","QR Code Scam","Suspicious Links","Malware Distribution"] },
  { id:"harassment", label:"Harassment & Bullying", icon:AlertTriangle, color:"#ef4444", severity:"high", whoFlow:true, subcategories:["Personal Harassment","Group Harassment","Threatening Messages","Doxxing","Blackmail","Stalking","Revenge","Hate Campaign","Repeated Unwanted Contact","Impersonation Used For Harassment"] },
  { id:"violence", label:"Violence & Dangerous Orgs", icon:Zap, color:"#dc2626", severity:"critical", subcategories:["Credible Threat","Terrorism","Organized Crime","Gang Promotion","Human Trafficking","Violent Extremism","Animal Abuse","Calls for Violence","Graphic Violence","Weapons Distribution"] },
  { id:"selfharm", label:"Self Harm", icon:Heart, color:"#8b5cf6", severity:"critical", subcategories:["Suicide","Self Injury","Eating Disorder","Encouraging Self Harm","Suicide Threat","Dangerous Challenges"] },
  { id:"sexual", label:"Sexual Content", icon:Eye, color:"#f43f5e", severity:"critical", subcategories:["Sexual Activity","Child Safety","Grooming","Sexual Exploitation","Prostitution","Revenge Porn","Threatening To Share Intimate Images","Non-consensual Explicit Content","Adult Solicitation"] },
  { id:"illegal", label:"Illegal Goods", icon:Package, color:"#f97316", severity:"high", subcategories:["Drugs","Weapons","Alcohol","Tobacco","Gambling","Counterfeit Goods","Fake IDs","Illegal Software","Hacking Services"] },
  { id:"misinfo", label:"False Information", icon:FileQuestion, color:"#eab308", severity:"medium", subcategories:["Medical Misinformation","Election Misinformation","Fake News","Deepfake","Edited Media","AI Generated Deception"] },
  { id:"ip", label:"Intellectual Property", icon:Copyright, color:"#6366f1", severity:"medium", subcategories:["Copyright","Trademark","Brand Abuse","Stolen Content","Fake Brand Account"] },
  { id:"privacy", label:"Privacy Violations", icon:Shield, color:"#06b6d4", severity:"high", subcategories:["Personal Information Leak","Private Images","Private Videos","Address Leak","Phone Number Leak","Identity Documents","Banking Information","Face Recognition Abuse"] },
  { id:"fake", label:"Fake Account", icon:User, color:"#64748b", severity:"medium", subcategories:["Pretending To Be Me","Pretending To Be Someone Else","Fake Business","Fake Celebrity","Fake Government Account"] },
  { id:"underage", label:"Underage User", icon:Baby, color:"#10b981", severity:"critical", specialScreen:"underage", subcategories:[] },
];

const SEV_COLORS: Record<string,string> = { low:"#22c55e", medium:"#f59e0b", high:"#ef4444", critical:"#dc2626" };
const SEV_LABELS: Record<string,string> = { low:"Low Priority", medium:"Medium Priority", high:"High Priority", critical:"Critical — Immediate Review" };

const slide = {
  enter:(d:number)=>({x:d>0?"100%":"-100%",opacity:0}),
  center:{x:0,opacity:1,transition:{type:"spring" as const,damping:28,stiffness:260}},
  exit:(d:number)=>({x:d>0?"-100%":"100%",opacity:0,transition:{duration:0.18}}),
};

export interface ReportPayload { reportedUserId?:string; conversationId?:string; category:string; subcategory?:string; whoTarget?:string; evidenceNotes?:string; consentGranted:boolean; severity:string; }
type Screen="category"|"subcategory"|"who"|"evidence"|"consent"|"success"|"underage";
type Cat = Category;

export default function ReportModal({ isOpen, onClose, reportedUserId, reportedUsername, conversationId, onSubmit }:{
  isOpen:boolean; onClose:()=>void; reportedUserId?:string; reportedUsername?:string; conversationId?:string; onSubmit?:(r:ReportPayload)=>Promise<void>;
}) {
  const [screen,setScreen]=useState<Screen>("category");
  const [dir,setDir]=useState(1);
  const [cat,setCat]=useState<Cat|null>(null);
  const [sub,setSub]=useState<string|null>(null);
  const [who,setWho]=useState<string|null>(null);
  const [notes,setNotes]=useState("");
  const [consent,setConsent]=useState(false);
  const [submitting,setSubmitting]=useState(false);
  const [reportId,setReportId]=useState<string|null>(null);

  const go=(s:Screen,d=1)=>{setDir(d);setScreen(s);};

  const reset=useCallback(()=>{setScreen("category");setDir(1);setCat(null);setSub(null);setWho(null);setNotes("");setConsent(false);setSubmitting(false);setReportId(null);},[]);
  const close=()=>{reset();onClose();};

  const pickCat=(c:Cat)=>{setCat(c);if((c as any).specialScreen==="underage")go("underage");else if(c.subcategories.length>0)go("subcategory");else go("evidence");};
  const pickSub=(s:string)=>{setSub(s);if(cat?.whoFlow)go("who");else go("evidence");};

  const submit=async()=>{
    if(!cat)return;
    setSubmitting(true);
    try{
      await onSubmit?.({reportedUserId,conversationId,category:cat.id,subcategory:sub??undefined,whoTarget:who??undefined,evidenceNotes:notes,consentGranted:consent,severity:cat.severity});
      setReportId(`RPT-${Date.now().toString(36).toUpperCase()}`);
      go("success");
    }catch(e){console.error(e);}finally{setSubmitting(false);}
  };

  if(!isOpen)return null;
  const sev=cat?.severity??"medium";

  return(
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center" onClick={e=>{if(e.target===e.currentTarget)close();}}>
      <motion.div className="absolute inset-0 bg-black/70" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} style={{backdropFilter:"blur(8px)"}}/>
      <motion.div
        className="relative w-full sm:max-w-md rounded-t-[28px] sm:rounded-[24px] overflow-hidden"
        initial={{y:"100%",opacity:0}} animate={{y:0,opacity:1}} exit={{y:"100%",opacity:0}}
        transition={{type:"spring",damping:32,stiffness:300}}
        style={{background:"#0c0c14",border:"1px solid rgba(255,255,255,0.08)",boxShadow:"0 24px 80px rgba(0,0,0,0.8)",maxHeight:"88vh"}}
      >
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-white/10"/></div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            {screen!=="category"&&screen!=="success"&&(
              <button onClick={()=>go(screen==="subcategory"?"category":screen==="who"?"subcategory":screen==="evidence"?(cat?.whoFlow?"who":cat?.subcategories.length?"subcategory":"category"):screen==="consent"?"evidence":"category",-1)} className="p-1 -ml-1 text-white/40 hover:text-white">
                <ChevronLeft size={20}/>
              </button>
            )}
            <h2 className="text-[15px] font-bold text-white">
              {screen==="category"&&"Report"}{screen==="subcategory"&&cat?.label}{screen==="who"&&"Who is being harassed?"}{screen==="evidence"&&"Add Evidence (Optional)"}{screen==="consent"&&"Privacy & Encryption"}{screen==="success"&&"Report Submitted"}{screen==="underage"&&"Underage User"}
            </h2>
          </div>
          <button onClick={close} className="p-1.5 text-white/40 hover:text-white hover:bg-white/[0.07] rounded-lg transition-all"><X size={18}/></button>
        </div>

        <div className="overflow-y-auto" style={{maxHeight:"calc(88vh - 120px)"}}>
          <AnimatePresence mode="wait" custom={dir}>
            {screen==="category"&&(
              <motion.div key="cat" custom={dir} variants={slide} initial="enter" animate="center" exit="exit" className="p-4 grid grid-cols-2 gap-2">
                {reportedUsername&&<div className="col-span-2 mb-2"><p className="text-[13px] text-white/40">Reporting <span className="text-white/70 font-semibold">@{reportedUsername}</span></p></div>}
                {CATEGORIES.map(c=>{const Icon=c.icon;return(
                  <motion.button key={c.id} onClick={()=>pickCat(c)} whileHover={{scale:1.02}} whileTap={{scale:0.97}}
                    className="flex flex-col items-start gap-2 p-3.5 rounded-[14px] bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] hover:border-white/[0.10] transition-all text-left">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{background:`${c.color}22`}}><Icon size={16} style={{color:c.color}}/></div>
                    <span className="text-[12.5px] font-semibold text-white/80 leading-tight">{c.label}</span>
                  </motion.button>
                );})}
              </motion.div>
            )}
            {screen==="subcategory"&&cat&&(
              <motion.div key="sub" custom={dir} variants={slide} initial="enter" animate="center" exit="exit" className="p-4 space-y-3">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{background:`${SEV_COLORS[sev]}14`,border:`1px solid ${SEV_COLORS[sev]}28`}}>
                  <div className="w-2 h-2 rounded-full" style={{background:SEV_COLORS[sev]}}/>
                  <span className="text-[12px] font-semibold" style={{color:SEV_COLORS[sev]}}>{SEV_LABELS[sev]}</span>
                </div>
                <div className="space-y-1">
                  {cat.subcategories.map((s: string)=>(
                    <motion.button key={s} onClick={()=>pickSub(s)} whileTap={{scale:0.98}}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-[12px] bg-white/[0.04] hover:bg-white/[0.07] border border-transparent hover:border-white/[0.07] transition-all text-left">
                      <span className="text-[13.5px] text-white/75">{s}</span>
                      <ChevronRight size={15} className="text-white/25 shrink-0"/>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
            {screen==="who"&&(
              <motion.div key="who" custom={dir} variants={slide} initial="enter" animate="center" exit="exit" className="p-4 space-y-2">
                {["Me","Someone Else"].map(o=>(
                  <motion.button key={o} onClick={()=>{setWho(o);go("evidence");}} whileTap={{scale:0.98}}
                    className="w-full flex items-center justify-between px-4 py-4 rounded-[14px] bg-white/[0.04] hover:bg-white/[0.07] border border-transparent hover:border-white/[0.07] transition-all text-left">
                    <span className="text-[14px] font-medium text-white/80">{o}</span>
                    <ChevronRight size={16} className="text-white/25 shrink-0"/>
                  </motion.button>
                ))}
              </motion.div>
            )}
            {screen==="evidence"&&(
              <motion.div key="evi" custom={dir} variants={slide} initial="enter" animate="center" exit="exit" className="p-4 space-y-4">
                <p className="text-[12.5px] text-white/40 px-1">Evidence is optional. All uploads remain encrypted until you grant access.</p>
                <div className="grid grid-cols-4 gap-2">
                  {([{icon:Camera,label:"Screenshot"},{icon:Camera,label:"Recording"},{icon:Mic,label:"Audio"},{icon:Paperclip,label:"File"}] as const).map(({icon:Icon,label})=>(
                    <button key={label} className="flex flex-col items-center gap-1.5 p-3 rounded-[12px] bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] transition-all">
                      <Icon size={18} className="text-white/40"/><span className="text-[10.5px] text-white/30">{label}</span>
                    </button>
                  ))}
                </div>
                <div>
                  <label className="block text-[12px] text-white/40 mb-2 px-1">Additional Notes</label>
                  <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={4} placeholder="Describe what happened…"
                    className="w-full px-4 py-3 rounded-[14px] text-[13.5px] text-white/80 placeholder-white/20 resize-none outline-none"
                    style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)"}}/>
                </div>
                <button onClick={()=>go("consent")} className="w-full py-3.5 rounded-[14px] text-[14px] font-semibold text-white" style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)"}}>Continue</button>
              </motion.div>
            )}
            {screen==="consent"&&(
              <motion.div key="consent" custom={dir} variants={slide} initial="enter" animate="center" exit="exit" className="p-5 space-y-5">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{background:"rgba(99,102,241,0.15)"}}><Lock size={28} className="text-indigo-400"/></div>
                  <div>
                    <h3 className="text-[16px] font-bold text-white mb-1">Your Messages are Encrypted</h3>
                    <p className="text-[12.5px] text-white/40 leading-relaxed">Verlyn uses End-to-End Encryption. Our team cannot read your messages unless you explicitly grant temporary access.</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {["Access limited to the reported conversation only","Expires automatically after 48–72 hours","Temporary keys permanently deleted after investigation","Transparent audit log maintained"].map(i=>(
                    <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 rounded-[10px] bg-white/[0.03]">
                      <Shield size={13} className="text-indigo-400 shrink-0 mt-0.5"/>
                      <span className="text-[12px] text-white/50">{i}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-2 py-2.5 rounded-[12px]" style={{background:`${SEV_COLORS[sev]}12`,border:`1px solid ${SEV_COLORS[sev]}24`}}>
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{background:SEV_COLORS[sev]}}/>
                  <span className="text-[12px] font-semibold" style={{color:SEV_COLORS[sev]}}>{SEV_LABELS[sev]}</span>
                </div>
                <div onClick={()=>setConsent(!consent)} className="flex items-start gap-3 p-4 rounded-[14px] cursor-pointer transition-all"
                  style={{background:consent?"rgba(99,102,241,0.10)":"rgba(255,255,255,0.04)",border:`1px solid ${consent?"rgba(99,102,241,0.3)":"rgba(255,255,255,0.07)"}`}}>
                  <div className="w-5 h-5 rounded-[6px] shrink-0 mt-0.5 flex items-center justify-center transition-all"
                    style={{background:consent?"#6366f1":"transparent",border:consent?"none":"1.5px solid rgba(255,255,255,0.2)"}}>
                    {consent&&<CheckCircle2 size={13} className="text-white"/>}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-white/80 mb-0.5">Grant Temporary Access</p>
                    <p className="text-[11.5px] text-white/35">Allow moderators to review the reported messages for investigation.</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <button onClick={submit} disabled={submitting} className="w-full py-3.5 rounded-[14px] text-[14px] font-bold text-white disabled:opacity-50 transition-all" style={{background:"linear-gradient(135deg,#ef4444,#dc2626)"}}>
                    {submitting?"Submitting…":consent?"Submit Report with Access":"Submit Without Access"}
                  </button>
                  <p className="text-center text-[11px] text-white/25">Without consent, only metadata and your notes will be shared.</p>
                </div>
              </motion.div>
            )}
            {screen==="underage"&&(
              <motion.div key="under" custom={dir} variants={slide} initial="enter" animate="center" exit="exit" className="p-5 space-y-4">
                <div className="p-4 rounded-[16px] space-y-2" style={{background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.16)"}}>
                  <p className="text-[13px] font-semibold text-emerald-400">Age Requirements</p>
                  <p className="text-[12.5px] text-white/50">Verlyn requires users to be 13+ years old (16+ in some regions per GDPR).</p>
                </div>
                <div className="space-y-1">
                  {["Child Safety Policy","Safety Center","Parent/Guardian Reporting","Country-Specific Requirements"].map(i=>(
                    <button key={i} className="w-full flex items-center justify-between px-4 py-3 rounded-[12px] bg-white/[0.04] hover:bg-white/[0.06] transition-all text-left">
                      <span className="text-[13px] text-white/70">{i}</span><ChevronRight size={14} className="text-white/25"/>
                    </button>
                  ))}
                </div>
                <button onClick={()=>go("evidence")} className="w-full py-3.5 rounded-[14px] text-[14px] font-semibold text-white" style={{background:"linear-gradient(135deg,#10b981,#059669)"}}>Continue Report</button>
              </motion.div>
            )}
            {screen==="success"&&(
              <motion.div key="ok" custom={dir} variants={slide} initial="enter" animate="center" exit="exit" className="p-6 flex flex-col items-center gap-5">
                <motion.div initial={{scale:0}} animate={{scale:1}} transition={{type:"spring",damping:20,stiffness:300,delay:0.1}}
                  className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{background:"rgba(99,102,241,0.15)"}}>
                  <CheckCircle2 size={40} className="text-indigo-400"/>
                </motion.div>
                <div className="text-center">
                  <h3 className="text-[18px] font-bold text-white mb-2">Report Submitted</h3>
                  <p className="text-[13px] text-white/40 leading-relaxed">Our team will review your report. You can check the status below.</p>
                </div>
                <div className="w-full px-4 py-3 rounded-[12px] bg-white/[0.04] border border-white/[0.07] flex items-center justify-between">
                  <span className="text-[12px] text-white/40">Report ID</span>
                  <span className="text-[13px] font-mono font-bold text-white/70">{reportId}</span>
                </div>
                <div className="w-full space-y-2">
                  {([{label:"View Report Status",icon:Eye},{label:"Community Guidelines",icon:FileQuestion},{label:"Safety Center",icon:Shield}] as const).map(({label,icon:Icon})=>(
                    <button key={label} className="w-full flex items-center gap-3 px-4 py-3 rounded-[12px] bg-white/[0.04] hover:bg-white/[0.06] transition-all text-left">
                      <Icon size={15} className="text-white/30"/><span className="text-[13px] text-white/60">{label}</span>
                    </button>
                  ))}
                </div>
                <button onClick={close} className="w-full py-3.5 rounded-[14px] text-[14px] font-semibold text-white/70 bg-white/[0.06] hover:bg-white/[0.09] transition-all">Done</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}


