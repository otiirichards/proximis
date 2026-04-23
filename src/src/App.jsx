import { useState, useMemo, useCallback, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg:       "#F4F1EB",
  card:     "#FFFFFF",
  primary:  "#0F4C35",
  accent:   "#C8973A",
  text:     "#1A1916",
  muted:    "#6B6860",
  hint:     "#B0AA9E",
  border:   "#E2DDCE",
  green:    "#0F4C35",
  greenL:   "#E8F2ED",
  greenT:   "#0A3324",
  red:      "#C0392B",
  redL:     "#FCEBEB",
  amber:    "#C8973A",
  amberL:   "#FDF3E3",
  blue:     "#1B5E9B",
  blueL:    "#EAF2FB",
  purple:   "#5B3FA6",
  purpleL:  "#F0EDFB",
};

const F = { fontFamily: "'Georgia', 'Times New Roman', serif" };
const FS = { fontFamily: "'Helvetica Neue', 'Arial', sans-serif" };

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const TODAY = new Date();
const PROG_THEMES = ["Urban Development","Climate & Environment","Housing & Land","Water & Sanitation","Governance","Gender & Inclusion","Resilience & DRR","Blended Finance"];
const ALL_THEMES = [...PROG_THEMES,"Education","Health","Private Sector Dev","Other"];
const INSTRUMENTS = ["Grants","Co-financing","Blended Finance","Trust Funds","Technical Assistance","Results-Based Financing"];
const DONOR_TYPES = ["Bilateral","Multilateral","Foundation","DFI","Trust Fund","Private Sector"];
const RELATIONSHIPS = ["None","Cold","Warm","Active","Strategic"];
const REL_SCORE = {None:0,Cold:8,Warm:18,Active:25,Strategic:30};
const PIPE_STAGES = ["Prospect","Engaged","Concept Note Submitted","Under Negotiation","Confirmed"];
const TP_TYPES = ["Meeting","Call","Email","Report submitted","Event","Site visit","Proposal submitted","Informal contact"];
const QUAL_LABELS = {1:"Routine",2:"Substantive",3:"Strategic"};
const QUAL_COLORS = {1:C.hint,2:C.blue,3:C.green};

const ST = {
  "Prospect":               {p:10,c:"#9CA3AF",bg:"#F9FAFB",tx:"#374151"},
  "Engaged":                {p:25,c:C.blue,bg:C.blueL,tx:"#1B4F8A"},
  "Concept Note Submitted": {p:40,c:C.amber,bg:C.amberL,tx:"#7A5A1A"},
  "Under Negotiation":      {p:65,c:"#0E7C5A",bg:"#E6F7F1",tx:"#084D37"},
  "Confirmed":              {p:90,c:C.green,bg:C.greenL,tx:C.greenT},
};

const TC = {
  Bilateral:       {bg:"#EAF2FB",tx:"#1B5E9B"},
  Multilateral:    {bg:"#E6F7F1",tx:"#084D37"},
  Foundation:      {bg:C.amberL,tx:"#7A5A1A"},
  DFI:             {bg:C.purpleL,tx:"#3D2880"},
  "Trust Fund":    {bg:C.greenL,tx:C.greenT},
  "Private Sector":{bg:"#F3F4F6",tx:"#374151"},
};
const RC = {
  None:     {bg:"#F3F4F6",tx:"#6B7280"},
  Cold:     {bg:C.blueL,tx:"#1B5E9B"},
  Warm:     {bg:C.amberL,tx:"#7A5A1A"},
  Active:   {bg:C.greenL,tx:C.greenT},
  Strategic:{bg:C.purpleL,tx:"#3D2880"},
};

const UNIVERSAL_MILESTONES = [
  {id:"m1",label:"Agreement / legal instrument signed",targetDays:14},
  {id:"m2",label:"First disbursement received",targetDays:30},
  {id:"m3",label:"Programme inception meeting",targetDays:21},
  {id:"m4",label:"Reporting framework established",targetDays:30},
  {id:"m5",label:"First progress report submitted",targetDays:90},
  {id:"m6",label:"Grant closure / final report",targetDays:30},
];
const OPTIONAL_MILESTONES = {
  Bilateral:    [{id:"o1",label:"Baseline assessment completed",targetDays:60},{id:"o2",label:"Mid-term review conducted",targetDays:180}],
  Multilateral: [{id:"o3",label:"Project Implementation Review (PIR)",targetDays:180},{id:"o4",label:"Steering committee convened",targetDays:90}],
  Foundation:   [{id:"o5",label:"Site visit / programme immersion",targetDays:120},{id:"o6",label:"Learning review completed",targetDays:180}],
  DFI:          [{id:"o7",label:"Financial audit completed",targetDays:180},{id:"o8",label:"Investment committee update",targetDays:90}],
  "Trust Fund": [{id:"o9",label:"Managing agent report submitted",targetDays:90}],
  "Private Sector":[{id:"o10",label:"Partnership review meeting",targetDays:90}],
};
const MS_STATUS = ["Not started","In progress","Completed","Blocked"];
const SS = {
  "Completed":   {bg:C.greenL,tx:C.greenT,dot:C.green},
  "In progress": {bg:C.blueL,tx:"#1B4F8A",dot:C.blue},
  "Blocked":     {bg:C.redL,tx:"#7B1C14",dot:C.red},
  "Not started": {bg:"#F3F4F6",tx:C.muted,dot:C.hint},
};

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT DATA — realistic fictional INGO "Meridian Africa"
// ─────────────────────────────────────────────────────────────────────────────
const DEF = {
donors:[
  {id:"d1",name:"UK FCDO",type:"Bilateral",relationship:"Active",grantMin:1000000,grantMax:10000000,contact:"Sarah Mitchell, Senior Programme Manager",cycle:"2026-09",geo:"East Africa, South Asia",themes:["Urban Development","Climate & Environment","Governance","Resilience & DRR","Housing & Land"],instruments:["Grants","Co-financing"],notes:"Strategic partner since 2019. New urban resilience window opens Q3 2026. Relationship with Sarah is strong — she championed the last renewal."},
  {id:"d2",name:"European Commission",type:"Multilateral",relationship:"Active",grantMin:2000000,grantMax:20000000,contact:"Marco Ferretti, DG INTPA Urban Unit",cycle:"2027-01",geo:"ACP Countries, East Africa",themes:["Urban Development","Water & Sanitation","Governance","Climate & Environment","Gender & Inclusion","Blended Finance"],instruments:["Grants","Co-financing","Blended Finance"],notes:"Horizon call for urban NbS expected Jan 2027. WASH call currently open — deadline approaching. Marco joined DG INTPA in late 2025."},
  {id:"d3",name:"Sida",type:"Bilateral",relationship:"Warm",grantMin:500000,grantMax:5000000,contact:"Anna Lindqvist, Urban Adviser",cycle:"2026-11",geo:"East Africa, Global",themes:["Climate & Environment","Gender & Inclusion","Governance","Urban Development"],instruments:["Grants"],notes:"Strong gender lens. Climate-housing nexus of increasing interest. Anna is responsive — last email answered within 48 hours."},
  {id:"d4",name:"USAID",type:"Bilateral",relationship:"Active",grantMin:500000,grantMax:10000000,contact:"James Okonkwo, Urban & WASH Programme",cycle:"2027-03",geo:"Kenya, Ethiopia, Uganda",themes:["Water & Sanitation","Governance","Urban Development","Gender & Inclusion"],instruments:["Grants","Technical Assistance"],notes:"CDCS alignment critical. James has been positive about our WASH approach. Nairobi mission is the entry point."},
  {id:"d5",name:"Bill & Melinda Gates Foundation",type:"Foundation",relationship:"Warm",grantMin:500000,grantMax:5000000,contact:"Dr Priya Nair, Urban Equity Lead",cycle:"2026-08",geo:"Sub-Saharan Africa, South Asia",themes:["Gender & Inclusion","Urban Development","Water & Sanitation"],instruments:["Grants"],notes:"Focus on equity and data. Prefers co-investment models. Priya visited our Nairobi site in March 2025 and was positive."},
  {id:"d6",name:"GEF",type:"Multilateral",relationship:"Cold",grantMin:2000000,grantMax:15000000,contact:"Ersin Esen, GEF Secretariat",cycle:"2026-10",geo:"Global",themes:["Climate & Environment","Blended Finance","Resilience & DRR"],instruments:["Grants","Blended Finance","Trust Funds"],notes:"CEO endorsement cycle takes 9-12 months. Last contact was 73 days ago. Ersin's last email was not responded to — this is a critical risk."},
  {id:"d7",name:"Norad",type:"Bilateral",relationship:"Warm",grantMin:500000,grantMax:3000000,contact:"Bjorn Haugen, Urban Governance",cycle:"2027-02",geo:"East Africa",themes:["Governance","Gender & Inclusion","Climate & Environment","Urban Development"],instruments:["Grants","Technical Assistance"],notes:"Open to long-term institutional support. Bjorn is engaged — last meeting was productive. Concept note agreed in principle."},
  {id:"d8",name:"Rockefeller Foundation",type:"Foundation",relationship:"Cold",grantMin:1000000,grantMax:5000000,contact:"TBD — need internal champion",cycle:"2026-11",geo:"Global, East Africa focus",themes:["Urban Development","Resilience & DRR"],instruments:["Grants"],notes:"100RC successor programmes active. Concept note submitted October 2025 — no response in 145 days. Need to find an internal champion urgently."},
  {id:"d9",name:"UN Women",type:"Multilateral",relationship:"Active",grantMin:300000,grantMax:2000000,contact:"Amina Hassan, East Africa Hub",cycle:"2026-07",geo:"East Africa",themes:["Gender & Inclusion","Governance","Urban Development"],instruments:["Grants","Technical Assistance"],notes:"Strong programmatic alignment on gender-responsive urban planning. Amina is a champion internally. Joint programme opportunity being explored."},
  {id:"d10",name:"African Development Bank",type:"DFI",relationship:"Cold",grantMin:5000000,grantMax:50000000,contact:"Dr Kofi Mensah, Urban Development Dept",cycle:"2027-06",geo:"Pan-Africa",themes:["Blended Finance","Urban Development","Climate & Environment"],instruments:["Grants","Co-financing","Blended Finance"],notes:"Significant opportunity for blended finance co-investment. Cold relationship — no formal meeting yet. Dr Mensah connected on LinkedIn in January."},
],
pipeline:[
  {id:"p1",name:"FCDO Urban Resilience Fund 2026",donor:"UK FCDO",amount:3000000,stage:"Confirmed",prob:90,date:"2026-06",thematic:"Urban Development",notes:"Grant agreement in final legal review. Expected signature end of April."},
  {id:"p2",name:"EU Urban WASH Programme",donor:"European Commission",amount:4000000,stage:"Concept Note Submitted",prob:40,date:"2026-12",thematic:"Water & Sanitation",notes:"Concept note submitted March 15. Response expected May 2026. Marco flagged positive initial read."},
  {id:"p3",name:"Sida Climate & Housing Grant",donor:"Sida",amount:2000000,stage:"Under Negotiation",prob:65,date:"2026-09",thematic:"Climate & Environment",notes:"Budget negotiation ongoing. Sida requesting stronger gender mainstreaming indicators."},
  {id:"p4",name:"Gates Gender & Inclusive Cities",donor:"Bill & Melinda Gates Foundation",amount:2000000,stage:"Confirmed",prob:90,date:"2026-07",thematic:"Gender & Inclusion",notes:"Grant letter received February 2026. First tranche disbursed."},
  {id:"p5",name:"GEF Blended Finance Facility",donor:"GEF",amount:5000000,stage:"Under Negotiation",prob:65,date:"2026-10",thematic:"Blended Finance",notes:"CEO endorsement pending. Relationship has gone cold — Ersin's last email unanswered. Critical risk to this opportunity."},
  {id:"p6",name:"Norad Urban Governance Support",donor:"Norad",amount:1000000,stage:"Engaged",prob:25,date:"2027-02",thematic:"Governance",notes:"Concept note agreed in principle. Formal submission planned for June 2026."},
  {id:"p7",name:"Rockefeller Urban Resilience Grant",donor:"Rockefeller Foundation",amount:1500000,stage:"Concept Note Submitted",prob:40,date:"2026-11",thematic:"Urban Development",notes:"Concept note submitted October 2025. No response in 145 days. Relationship cold."},
  {id:"p8",name:"USAID WASH for Cities",donor:"USAID",amount:1000000,stage:"Prospect",prob:10,date:"2027-06",thematic:"Water & Sanitation",notes:"Initial scoping conversation held. EOI to be submitted Q3 2026."},
],
budgets:[
  {id:"b1",programme:"Urban Resilience Programme",thematic:"Urban Development",required:8000000,period:"2026",notes:"Multi-city climate adaptation — Nairobi, Kampala, Dar es Salaam"},
  {id:"b2",programme:"Climate & Housing Initiative",thematic:"Climate & Environment",required:5000000,period:"2026",notes:"Green affordable housing — climate-resilient construction"},
  {id:"b3",programme:"WASH for Growing Cities",thematic:"Water & Sanitation",required:3500000,period:"2026",notes:"Urban WASH infrastructure — informal settlements focus"},
  {id:"b4",programme:"Urban Governance Reform",thematic:"Governance",required:2500000,period:"2026",notes:"Municipal capacity building — participatory planning"},
  {id:"b5",programme:"Gender & Inclusive Cities",thematic:"Gender & Inclusion",required:2000000,period:"2026",notes:"Women-led urban planning — gender-responsive budgeting"},
  {id:"b6",programme:"Blended Finance Facility",thematic:"Blended Finance",required:10000000,period:"2026",notes:"De-risk private investment in urban infrastructure"},
],
grants:[
  {id:"g1",programme:"Urban Resilience Programme",donor:"UK FCDO",thematic:"Urban Development",totalAmount:3000000,disbursed:3000000,spent:1850000,startDate:"2026-01",endDate:"2026-12",reportingDeadline:"2026-05-15",monthlyBudget:250000,notes:"Q1 report drafted. Deadline approaching — 16 days remaining."},
  {id:"g2",programme:"Gender & Inclusive Cities",donor:"Bill & Melinda Gates Foundation",thematic:"Gender & Inclusion",totalAmount:2000000,disbursed:1000000,spent:380000,startDate:"2026-02",endDate:"2027-01",reportingDeadline:"2026-07-31",monthlyBudget:166667,notes:"First tranche received. Second tranche subject to mid-term review."},
  {id:"g3",programme:"Climate & Housing Initiative",donor:"Sida",thematic:"Climate & Environment",totalAmount:2000000,disbursed:800000,spent:720000,startDate:"2026-01",endDate:"2026-12",reportingDeadline:"2026-05-31",monthlyBudget:166667,notes:"High absorption rate. Next disbursement request due end of May."},
  {id:"g4",programme:"WASH for Growing Cities",donor:"European Commission",thematic:"Water & Sanitation",totalAmount:1500000,disbursed:500000,spent:95000,startDate:"2026-03",endDate:"2027-02",reportingDeadline:"2026-09-30",monthlyBudget:125000,notes:"Low absorption in first 2 months. Procurement delays flagged."},
  {id:"g5",programme:"Blended Finance Facility",donor:"GEF",thematic:"Blended Finance",totalAmount:5000000,disbursed:2500000,spent:2300000,startDate:"2025-10",endDate:"2027-09",reportingDeadline:"2026-06-30",monthlyBudget:208333,notes:"On track. Second disbursement request to be prepared Q2 2026."},
  {id:"g6",programme:"Urban Governance Reform",donor:"Norad",thematic:"Governance",totalAmount:1000000,disbursed:1000000,spent:210000,startDate:"2026-02",endDate:"2027-01",reportingDeadline:"2026-08-31",monthlyBudget:83333,notes:"Full amount disbursed upfront. Underspend risk flagged."},
],
touchpoints:[
  {id:"tp1",donorId:"d1",type:"Meeting",date:"2026-04-10",quality:3,notes:"Quarterly review — strong alignment confirmed. Q2 disbursement on track."},
  {id:"tp2",donorId:"d1",type:"Report submitted",date:"2026-03-31",quality:2,notes:"Q1 progress report submitted on time."},
  {id:"tp3",donorId:"d1",type:"Email",date:"2026-03-15",quality:2,notes:"Shared updated results framework for comment."},
  {id:"tp4",donorId:"d1",type:"Call",date:"2026-02-20",quality:2,notes:"Budget revision discussed. Agreement reached."},
  {id:"tp5",donorId:"d1",type:"Event",date:"2026-01-28",quality:3,notes:"Joint side event at WUF12 Cairo — excellent visibility."},
  {id:"tp6",donorId:"d2",type:"Proposal submitted",date:"2026-03-15",quality:3,notes:"Concept note submitted to DG INTPA — WASH programme."},
  {id:"tp7",donorId:"d2",type:"Meeting",date:"2025-11-20",quality:3,notes:"Pre-consultation at Brussels HQ. Marco flagged interest."},
  {id:"tp8",donorId:"d2",type:"Email",date:"2025-10-05",quality:1,notes:"Expression of interest submitted."},
  {id:"tp9",donorId:"d3",type:"Meeting",date:"2026-03-20",quality:3,notes:"Budget negotiation — positive response from Anna."},
  {id:"tp10",donorId:"d3",type:"Email",date:"2026-02-14",quality:2,notes:"Concept note feedback received and responded to."},
  {id:"tp11",donorId:"d3",type:"Call",date:"2026-01-10",quality:2,notes:"Introductory call with new programme officer."},
  {id:"tp12",donorId:"d4",type:"Event",date:"2026-04-01",quality:2,notes:"Met at Urban Development Forum Nairobi."},
  {id:"tp13",donorId:"d4",type:"Email",date:"2026-03-05",quality:1,notes:"Introduction email following forum."},
  {id:"tp14",donorId:"d4",type:"Meeting",date:"2026-02-10",quality:2,notes:"Initial scoping meeting — USAID Nairobi mission."},
  {id:"tp15",donorId:"d5",type:"Meeting",date:"2026-04-05",quality:3,notes:"Mid-term review — very positive. Second tranche confirmed."},
  {id:"tp16",donorId:"d5",type:"Report submitted",date:"2026-03-31",quality:2,notes:"6-month progress report submitted on time."},
  {id:"tp17",donorId:"d5",type:"Call",date:"2026-02-28",quality:2,notes:"Check-in ahead of report submission."},
  {id:"tp18",donorId:"d6",type:"Email",date:"2026-02-10",quality:1,notes:"Sent PIF status update. No response received."},
  {id:"tp19",donorId:"d6",type:"Call",date:"2025-12-15",quality:2,notes:"GEF coordination call — CEO endorsement timeline discussed."},
  {id:"tp20",donorId:"d7",type:"Meeting",date:"2026-03-10",quality:2,notes:"Follow-up meeting. Concept note agreed in principle."},
  {id:"tp21",donorId:"d7",type:"Call",date:"2026-02-05",quality:2,notes:"Initial scoping call with Bjorn."},
  {id:"tp22",donorId:"d8",type:"Proposal submitted",date:"2025-10-20",quality:2,notes:"Concept note submitted. No response in 145 days."},
  {id:"tp23",donorId:"d9",type:"Meeting",date:"2026-04-08",quality:3,notes:"Joint programme scoping — very strong alignment with Amina."},
  {id:"tp24",donorId:"d9",type:"Call",date:"2026-03-22",quality:2,notes:"Follow-up on joint programme concept."},
  {id:"tp25",donorId:"d10",type:"Email",date:"2026-01-15",quality:1,notes:"Cold outreach to Dr Mensah following LinkedIn connection."},
],
tracks:[
  {id:"tr1",donor:"UK FCDO",donorType:"Bilateral",programme:"Urban Resilience Programme",confirmedDate:"2026-01-10",owner:"Timothy Richards",priority:"High",milestones:[
    {milestoneId:"m1",label:"Agreement / legal instrument signed",targetDays:14,type:"universal",status:"Completed",completedDate:"2026-01-18",notes:"Signed 8 days after confirmation.",isOptional:false},
    {milestoneId:"m2",label:"First disbursement received",targetDays:30,type:"universal",status:"Completed",completedDate:"2026-02-01",notes:"Full $3M disbursed upfront.",isOptional:false},
    {milestoneId:"m3",label:"Programme inception meeting",targetDays:21,type:"universal",status:"Completed",completedDate:"2026-02-15",notes:"Held virtually with FCDO London.",isOptional:false},
    {milestoneId:"m4",label:"Reporting framework established",targetDays:30,type:"universal",status:"Completed",completedDate:"2026-03-01",notes:"Quarterly reports, annual audit agreed.",isOptional:false},
    {milestoneId:"m5",label:"First progress report submitted",targetDays:90,type:"universal",status:"In progress",completedDate:null,notes:"Q1 report drafted. Due May 15 2026 — 16 days remaining.",isOptional:false},
    {milestoneId:"m6",label:"Grant closure / final report",targetDays:30,type:"universal",status:"Not started",completedDate:null,notes:"",isOptional:false},
    {milestoneId:"o1",label:"Baseline assessment completed",targetDays:60,type:"optional",status:"Completed",completedDate:"2026-03-20",notes:"Baseline conducted in 3 target cities.",isOptional:true},
    {milestoneId:"o2",label:"Mid-term review conducted",targetDays:180,type:"optional",status:"Not started",completedDate:null,notes:"Planned for September 2026.",isOptional:true},
  ]},
  {id:"tr2",donor:"Bill & Melinda Gates Foundation",donorType:"Foundation",programme:"Gender & Inclusive Cities",confirmedDate:"2026-02-01",owner:"Timothy Richards",priority:"High",milestones:[
    {milestoneId:"m1",label:"Agreement / legal instrument signed",targetDays:14,type:"universal",status:"Completed",completedDate:"2026-02-10",notes:"Agreement signed within 9 days.",isOptional:false},
    {milestoneId:"m2",label:"First disbursement received",targetDays:30,type:"universal",status:"Completed",completedDate:"2026-02-20",notes:"First tranche $1M received.",isOptional:false},
    {milestoneId:"m3",label:"Programme inception meeting",targetDays:21,type:"universal",status:"Completed",completedDate:"2026-03-05",notes:"BMGF programme officer attended in person.",isOptional:false},
    {milestoneId:"m4",label:"Reporting framework established",targetDays:30,type:"universal",status:"In progress",completedDate:null,notes:"Templates shared. Awaiting BMGF sign-off on indicators.",isOptional:false},
    {milestoneId:"m5",label:"First progress report submitted",targetDays:90,type:"universal",status:"Not started",completedDate:null,notes:"",isOptional:false},
    {milestoneId:"m6",label:"Grant closure / final report",targetDays:30,type:"universal",status:"Not started",completedDate:null,notes:"",isOptional:false},
    {milestoneId:"o5",label:"Site visit / programme immersion",targetDays:120,type:"optional",status:"Not started",completedDate:null,notes:"Planned for Q3 2026.",isOptional:true},
  ]},
  {id:"tr3",donor:"Sida",donorType:"Bilateral",programme:"Climate & Housing Initiative",confirmedDate:"2026-01-20",owner:"Timothy Richards",priority:"Medium",milestones:[
    {milestoneId:"m1",label:"Agreement / legal instrument signed",targetDays:14,type:"universal",status:"Completed",completedDate:"2026-02-05",notes:"Minor amendments to budget narrative required.",isOptional:false},
    {milestoneId:"m2",label:"First disbursement received",targetDays:30,type:"universal",status:"Completed",completedDate:"2026-02-25",notes:"First $800K tranche received.",isOptional:false},
    {milestoneId:"m3",label:"Programme inception meeting",targetDays:21,type:"universal",status:"Blocked",completedDate:null,notes:"Delayed — awaiting new Sida programme officer assignment following Anna's temporary secondment.",isOptional:false},
    {milestoneId:"m4",label:"Reporting framework established",targetDays:30,type:"universal",status:"Not started",completedDate:null,notes:"",isOptional:false},
    {milestoneId:"m5",label:"First progress report submitted",targetDays:90,type:"universal",status:"Not started",completedDate:null,notes:"",isOptional:false},
    {milestoneId:"m6",label:"Grant closure / final report",targetDays:30,type:"universal",status:"Not started",completedDate:null,notes:"",isOptional:false},
    {milestoneId:"o1",label:"Baseline assessment completed",targetDays:60,type:"optional",status:"Not started",completedDate:null,notes:"",isOptional:true},
  ]},
],
};

// ─────────────────────────────────────────────────────────────────────────────
// PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────
function usePersisted(key, def) {
  const [state, setRaw] = useState(() => {
    try { const s = localStorage.getItem("prx_v1_" + key); if (s) return JSON.parse(s); } catch {}
    return def;
  });
  const set = useCallback(val => {
    setRaw(prev => {
      const next = typeof val === "function" ? val(prev) : val;
      try { localStorage.setItem("prx_v1_" + key, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [key]);
  return [state, set];
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────
const n = v => isFinite(Number(v)) ? Number(v) : 0;
const fmt = v => { v=n(v); if(v>=1e6) return "$"+(v/1e6).toFixed(1)+"M"; if(v>=1e3) return "$"+Math.round(v/1e3)+"K"; return "$"+Math.round(v).toLocaleString(); };
const toM = v => Math.round(n(v)/1e6*10)/10;
const pct = (a,b) => b>0?Math.round(n(a)/n(b)*100):0;
const daysFrom = d => { if(!d) return null; const[y,m,dd]=d.split("-").map(Number); return Math.round((TODAY-new Date(y,m-1,dd))/864e5); };
const fmtDate = d => { if(!d) return "—"; const[y,m,dd]=d.split("-").map(Number); return new Date(y,m-1,dd).toLocaleDateString("en",{day:"numeric",month:"short",year:"numeric"}); };
const mElapsed = s => { if(!s) return 0; const[sy,sm]=s.split("-").map(Number); return Math.max(0,(TODAY.getFullYear()-sy)*12+(TODAY.getMonth()-(sm-1))); };
const totMo = (s,e) => { const[sy,sm]=s.split("-").map(Number); const[ey,em]=e.split("-").map(Number); return Math.max(1,(ey-sy)*12+(em-sm)); };

const dScore = d => {
  let s=0;
  const m=(d.themes||[]).filter(t=>PROG_THEMES.includes(t)).length;
  s+=Math.round((m/PROG_THEMES.length)*35); s+=REL_SCORE[d.relationship]||0;
  const mn=n(d.grantMin),mx=n(d.grantMax);
  if(mx>0&&mx>=500000&&mn<=15000000){const ov=Math.min(mx,15e6)-Math.max(mn,500000);s+=Math.round(Math.min(Math.max(ov,0)/14.5e6,1)*20);}
  const ins=d.instruments||[];
  if(ins.includes("Blended Finance")||ins.includes("Trust Funds"))s+=15;
  else if(ins.includes("Grants"))s+=10; else if(ins.length)s+=5;
  return Math.min(100,Math.max(0,s));
};

const wt = o => n(o.amount)*n(o.prob)/100;
const calcT = (th,pl) => {
  const e=pl.filter(p=>p.thematic===th);
  const conf=e.filter(p=>n(p.prob)>=90).reduce((s,p)=>s+n(p.amount),0);
  const prob=e.filter(p=>n(p.prob)<90).reduce((s,p)=>s+n(p.amount)*n(p.prob)/100,0);
  return {conf,prob,wt:conf+prob};
};
const calcScen = (th,pl) => {
  const e=pl.filter(p=>p.thematic===th);
  const confirmed=e.filter(p=>n(p.prob)>=90).reduce((s,p)=>s+n(p.amount),0);
  const weighted=e.filter(p=>n(p.prob)<90).reduce((s,p)=>s+n(p.amount)*n(p.prob)/100,0);
  const full=e.filter(p=>n(p.prob)<90).reduce((s,p)=>s+n(p.amount),0);
  return {conservative:confirmed,base:confirmed+weighted,optimistic:confirmed+full};
};

const burnRate = g => n(g.disbursed)>0?n(g.spent)/n(g.disbursed):0;
const timePctG = g => Math.min(100,Math.round((mElapsed(g.startDate)/totMo(g.startDate,g.endDate))*100));
const expSpend = g => mElapsed(g.startDate)*n(g.monthlyBudget);

const assessBurn = g => {
  const actual=n(g.spent),disbursed=n(g.disbursed),elapsed=mElapsed(g.startDate);
  const tp=timePctG(g)/100,exp=expSpend(g);
  const variance=exp>0?(actual-exp)/exp:0;
  const mLeft=totMo(g.startDate,g.endDate)-elapsed;
  if(actual>=disbursed*0.88&&mLeft>=2) return{level:"Critical",label:"Overspend risk",bg:"#F7D0CD",tx:"#7B1C14",bar:C.red};
  if(exp>0&&variance<-0.35&&(exp>50000||tp>0.20)) return{level:"High",label:"Underspend risk",bg:C.redL,tx:"#9B2B24",bar:"#E57370"};
  if(exp>0&&variance<-0.15&&(exp>30000||tp>0.15)) return{level:"Medium",label:"Monitor closely",bg:C.amberL,tx:"#7A5A1A",bar:C.amber};
  if(exp>0&&variance>0.20&&burnRate(g)<0.88) return{level:"Low",label:"Ahead of plan",bg:C.blueL,tx:"#1B4F8A",bar:C.blue};
  return{level:"Low",label:"On track",bg:C.greenL,tx:C.greenT,bar:C.green};
};

const scoreEng = (id,tps) => {
  const tp=tps.filter(t=>t.donorId===id);
  if(!tp.length) return{recency:0,frequency:0,quality:0,diversity:0,responsiveness:0,overall:0,daysSinceLast:null};
  const sorted=[...tp].sort((a,b)=>new Date(b.date)-new Date(a.date));
  const days=daysFrom(sorted[0].date);
  const recency=Math.max(0,Math.round(100-(days/180)*100));
  const last90=tp.filter(t=>daysFrom(t.date)<=90).length;
  const frequency=Math.min(100,last90*20);
  const avgQ=tp.reduce((s,t)=>s+n(t.quality),0)/tp.length;
  const quality=Math.min(100,Math.round(avgQ*33.3));
  const diversity=Math.min(100,Math.round((new Set(tp.map(t=>t.type)).size/TP_TYPES.length)*100));
  const hq=tp.filter(t=>n(t.quality)>=2).length;
  const responsiveness=Math.min(100,Math.round((hq/tp.length)*100));
  const overall=Math.round(recency*0.30+frequency*0.25+quality*0.25+diversity*0.10+responsiveness*0.10);
  return{recency,frequency,quality,diversity,responsiveness,overall,daysSinceLast:days};
};

const engLabel = s => {
  if(s>=75) return{label:"Strong",bg:C.greenL,tx:C.greenT,bar:C.green};
  if(s>=50) return{label:"Active",bg:C.blueL,tx:"#1B4F8A",bar:C.blue};
  if(s>=25) return{label:"Cooling",bg:C.amberL,tx:"#7A5A1A",bar:C.amber};
  return{label:"At risk",bg:C.redL,tx:"#9B2B24",bar:C.red};
};

const trackStats = t => {
  const completed=t.milestones.filter(m=>m.status==="Completed").length;
  const total=t.milestones.length;
  const blocked=t.milestones.some(m=>m.status==="Blocked");
  const pctDone=Math.round((completed/total)*100);
  const curIdx=t.milestones.findIndex(m=>m.status==="In progress"||m.status==="Blocked");
  const curM=curIdx>-1?t.milestones[curIdx]:null;
  const daysActive=daysFrom(t.confirmedDate);
  let schedSt="on-schedule",daysOver=0;
  if(curM){const prev=t.milestones.slice(0,curIdx).filter(m=>m.status==="Completed");const sd=prev.length>0?prev[prev.length-1].completedDate:t.confirmedDate;if(sd){const dIn=daysFrom(sd);daysOver=dIn-curM.targetDays;schedSt=daysOver>0?"overdue":dIn>curM.targetDays*0.75?"approaching":"on-schedule";}}
  return{completed,total,blocked,pctDone,curIdx,curM,daysActive,schedSt,daysOver};
};

const trackRec = (t,s) => {
  if(s.blocked){const bm=t.milestones.find(m=>m.status==="Blocked");return{level:"Blocked",color:C.red,bg:C.redL,tx:"#7B1C14",text:`Blocked at "${bm?.label}". ${bm?.notes||""} Escalate to unblock — delays cascade into reporting and disbursement downstream.`};}
  if(s.schedSt==="overdue") return{level:"Behind schedule",color:"#E57370",bg:C.redL,tx:"#9B2B24",text:`"${s.curM?.label}" is ${s.daysOver} days beyond its ${s.curM?.targetDays}-day target. Assign a named owner and close within 7 days.`};
  if(s.schedSt==="approaching") return{level:"Approaching deadline",color:C.amber,bg:C.amberL,tx:"#7A5A1A",text:`"${s.curM?.label}" is approaching its ${s.curM?.targetDays}-day target. Prioritise completing this milestone this week.`};
  if(s.pctDone===100) return{level:"Fully activated",color:C.green,bg:C.greenL,tx:C.greenT,text:"All milestones complete. Management shifts to ongoing grant monitoring and relationship stewardship."};
  return{level:"On schedule",color:C.green,bg:C.greenL,tx:C.greenT,text:"Progressing to schedule. Ensure the next milestone is planned and owned before the current one closes."};
};

// ─────────────────────────────────────────────────────────────────────────────
// DECISION ENGINE — generates and scores priority actions
// ─────────────────────────────────────────────────────────────────────────────
function generateActions(donors, pipeline, budgets, grants, touchpoints, tracks) {
  const actions = [];

  pipeline.forEach(opp => {
    const donor = donors.find(d => d.name === opp.donor);
    if (!donor) return;
    const eng = scoreEng(donor.id, touchpoints);
    const gap = budgets.find(b => b.thematic === opp.thematic);
    const gapAmt = gap ? Math.max(0, n(gap.required) - calcT(gap.thematic, pipeline).wt) : 0;
    const gapPressure = gap ? gapAmt / n(gap.required) : 0;
    const expectedVal = wt(opp);
    const engRisk = eng.overall < 25 ? 0.8 : eng.overall < 50 ? 0.5 : eng.overall < 75 ? 0.2 : 0;
    const stageAge = opp.date ? Math.max(0, (new Date(opp.date + "-01") - TODAY) / (1000*60*60*24*30)) : 6;
    const timeSens = Math.max(0, 1 - stageAge / 12);

    // Re-engagement needed
    if (eng.overall < 40 && n(opp.prob) >= 25) {
      const score = Math.round(((expectedVal * 1.0) + (gapPressure * 0.8 * 2000000) + (engRisk * 1500000) + (timeSens * 500000)) / 1000000 * 10);
      actions.push({
        id: "eng_" + opp.id,
        type: "engagement",
        priority: score,
        title: `Re-engage ${donor.name} — relationship ${eng.overall < 25 ? "at risk" : "cooling"}`,
        subtitle: `${eng.daysSinceLast} days without contact · ${fmt(n(opp.amount))} opportunity · ${opp.thematic} gap`,
        why: `${donor.name}'s engagement score is ${eng.overall}/100. The ${fmt(n(opp.amount))} ${opp.name} opportunity is at ${n(opp.prob)}% probability — this will decline further without immediate relationship investment. ${gapAmt > 0 ? `The ${opp.thematic} programme has a ${fmt(gapAmt)} funding gap this donor could address.` : ""}`,
        action: "Schedule a call or meeting this week",
        effort: "30 min",
        urgencyColor: eng.overall < 25 ? C.red : C.amber,
        urgencyBg: eng.overall < 25 ? C.redL : C.amberL,
        icon: "🔴",
      });
    }

    // Concept note / proposal due
    if ((opp.stage === "Engaged" || opp.stage === "Prospect") && n(opp.prob) >= 10) {
      const score = Math.round(((expectedVal * 0.9) + (gapPressure * 0.7 * 2000000) + (timeSens * 800000)) / 1000000 * 8);
      actions.push({
        id: "pipe_" + opp.id,
        type: "pipeline",
        priority: score,
        title: `Advance ${opp.name} — concept note stage`,
        subtitle: `Currently at ${opp.stage} · ${fmt(n(opp.amount))} potential · close ${opp.date || "TBD"}`,
        why: `This opportunity has been at ${opp.stage} stage. Moving it to Concept Note Submitted would increase probability from ${n(opp.prob)}% to ~40%, adding ${fmt(n(opp.amount)*0.15)} to the weighted forecast. The ${opp.thematic} gap is ${gapAmt > 0 ? fmt(gapAmt) + " — urgent" : "manageable"}.`,
        action: "Draft and submit concept note",
        effort: "6 hrs",
        urgencyColor: C.blue,
        urgencyBg: C.blueL,
        icon: "📋",
      });
    }
  });

  // Reporting deadlines
  grants.forEach(g => {
    if (!g.reportingDeadline) return;
    const days = daysFrom(g.reportingDeadline);
    if (days < 0 && days > -60) { // upcoming in next 60 days (negative = future)
      const daysUntil = -days;
      if (daysUntil <= 30) {
        const urgency = daysUntil <= 14 ? 90 : 60;
        actions.push({
          id: "rep_" + g.id,
          type: "reporting",
          priority: urgency,
          title: `Submit progress report — ${g.programme}`,
          subtitle: `Due ${fmtDate(g.reportingDeadline)} · ${daysUntil} days remaining · ${g.donor}`,
          why: `The ${g.donor} reporting deadline for ${g.programme} is in ${daysUntil} days. Late or poor-quality reporting directly damages the relationship and risks the next disbursement tranche. Absorption rate is currently ${Math.round(burnRate(g)*100)}%.`,
          action: "Complete and submit progress report",
          effort: "8 hrs",
          urgencyColor: daysUntil <= 14 ? C.red : C.amber,
          urgencyBg: daysUntil <= 14 ? C.redL : C.amberL,
          icon: "📊",
        });
      }
    }
  });

  // Grant absorption risks
  grants.forEach(g => {
    const risk = assessBurn(g);
    if (risk.level === "Critical" || risk.level === "High") {
      actions.push({
        id: "burn_" + g.id,
        type: "burn",
        priority: risk.level === "Critical" ? 88 : 72,
        title: `Address absorption risk — ${g.programme}`,
        subtitle: `${risk.label} · ${Math.round(burnRate(g)*100)}% of disbursed spent · ${g.donor}`,
        why: `${g.programme} has an ${risk.level.toLowerCase()} absorption risk. ${risk.level === "Critical" ? `Funds are nearly exhausted — a disbursement request to ${g.donor} must be submitted immediately.` : `Spending is significantly below plan. ${g.donor} will flag this at the next reporting review. Accelerate programme activities.`}`,
        action: risk.level === "Critical" ? "Submit disbursement request immediately" : "Accelerate programme activities and document plan",
        effort: "2 hrs",
        urgencyColor: risk.bar,
        urgencyBg: risk.bg,
        icon: "⚠️",
      });
    }
  });

  // Confirmed without activation track
  const confirmedNoTrack = DEF.pipeline.filter(p => n(p.prob) >= 90 && !tracks.some(t => t.donor === p.donor && t.programme === p.name));
  confirmedNoTrack.forEach(p => {
    actions.push({
      id: "act_" + p.id,
      type: "activation",
      priority: 65,
      title: `Start activation track — ${p.donor}`,
      subtitle: `${p.name} confirmed · no inception milestones set · at risk of delayed start`,
      why: `${p.name} is confirmed at ${fmt(n(p.amount))} but has no activation track. Without structured milestone management, inception delays are common and directly affect the relationship with ${p.donor}. Start the track now.`,
      action: "Open Grant Activation and create track",
      effort: "30 min",
      urgencyColor: C.amber,
      urgencyBg: C.amberL,
      icon: "🚀",
    });
  });

  return actions.sort((a,b) => b.priority - a.priority).slice(0, 6);
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED UI COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
const inp = { ...FS, fontSize:13, padding:"8px 11px", border:`1px solid ${C.border}`, borderRadius:8, width:"100%", background:C.card, color:C.text, outline:"none", boxSizing:"border-box" };
const lbl = { ...FS, fontSize:10.5, color:C.muted, textTransform:"uppercase", letterSpacing:"0.06em", fontWeight:600 };
const BTN = {
  add:   { background:C.green, color:"#fff", border:"none" },
  edit:  { background:C.card, color:C.text, border:`1px solid ${C.border}` },
  del:   { background:C.redL, color:C.red, border:`1px solid #F5C6C3` },
  ghost: { background:C.card, color:C.muted, border:`1px solid ${C.border}` },
  save:  { background:C.green, color:"#fff", border:"none" },
};
const btn = (type, extra={}) => ({...BTN[type],...FS,padding:"7px 16px",borderRadius:8,fontSize:12.5,cursor:"pointer",fontWeight:BTN[type].background===C.green||type==="del"?600:400,...extra});

function Mc({label,val,sub,col,accent=false}){
  return(
    <div style={{background:accent?C.green:C.card,border:`1px solid ${accent?C.green:C.border}`,borderRadius:12,padding:"14px 16px"}}>
      <div style={{...FS,fontSize:10,color:accent?"rgba(255,255,255,0.6)":C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>{label}</div>
      <div style={{...F,fontSize:22,fontWeight:700,color:accent?"#fff":col||C.text,lineHeight:1.1}}>{val}</div>
      {sub&&<div style={{...FS,fontSize:11,color:accent?"rgba(255,255,255,0.7)":C.hint,marginTop:4}}>{sub}</div>}
    </div>
  );
}
function Pill({label,bg,tx,size="sm"}){
  const p = size==="sm"?"2px 8px":"3px 10px";
  return <span style={{...FS,display:"inline-block",fontSize:10,padding:p,borderRadius:10,fontWeight:600,background:bg,color:tx,whiteSpace:"nowrap"}}>{label}</span>;
}
function Card({children,style={}}){
  return <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden",...style}}>{children}</div>;
}
function CardHead({title,right,sub}){
  return(
    <div style={{padding:"13px 16px",borderBottom:`1px solid ${C.border}`,background:"#FAFAF7",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div>
        <div style={{...FS,fontSize:13,fontWeight:600,color:C.text}}>{title}</div>
        {sub&&<div style={{...FS,fontSize:11,color:C.muted,marginTop:1}}>{sub}</div>}
      </div>
      {right&&<div>{right}</div>}
    </div>
  );
}
function Collapsible({title,badge,children,defaultOpen=false,badgeBg=C.blueL,badgeTx=C.blue}){
  const[open,setOpen]=useState(defaultOpen);
  return(
    <div style={{borderTop:`1px solid ${C.border}`}}>
      <button onClick={()=>setOpen(o=>!o)} style={{width:"100%",background:open?"#FAFAF7":C.card,border:"none",padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",...FS}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:12.5,fontWeight:600,color:C.text}}>{title}</span>
          {badge&&<span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:8,background:badgeBg,color:badgeTx}}>{badge}</span>}
        </div>
        <span style={{fontSize:13,color:C.muted,display:"inline-block",transform:open?"rotate(180deg)":"none",transition:"transform 0.2s"}}>▾</span>
      </button>
      {open&&<div style={{padding:"14px 16px"}}>{children}</div>}
    </div>
  );
}
function FR({children,full=false}){return <div style={{display:"flex",flexDirection:"column",gap:4,gridColumn:full?"span 2":"auto"}}>{children}</div>;}
function L({children}){return <label style={lbl}>{children}</label>;}

const dayName = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][TODAY.getDay()];
const monthName = TODAY.toLocaleDateString("en",{month:"long",year:"numeric"});

// ─────────────────────────────────────────────────────────────────────────────
// TABS CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  {id:"home",      label:"Intelligence"},
  {id:"donors",    label:"Donor Map"},
  {id:"pipeline",  label:"Pipeline"},
  {id:"gap",       label:"Gap Matrix"},
  {id:"burn",      label:"Burn Rate"},
  {id:"engagement",label:"Engagement"},
  {id:"activation",label:"Activation"},
];

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────
export default function Proximis() {
  const[tab,setTab]=useState("home");
  const[donors,setDonors]=usePersisted("donors",DEF.donors);
  const[pipeline,setPipeline]=usePersisted("pipeline",DEF.pipeline);
  const[budgets,setBudgets]=usePersisted("budgets",DEF.budgets);
  const[grants,setGrants]=usePersisted("grants",DEF.grants);
  const[touchpoints,setTouchpoints]=usePersisted("touchpoints",DEF.touchpoints);
  const[tracks,setTracks]=usePersisted("tracks",DEF.tracks);

  const shared = {donors,setDonors,pipeline,setPipeline,budgets,setBudgets,grants,setGrants,touchpoints,setTouchpoints,tracks,setTracks};

  return(
    <div style={{...FS,color:C.text,fontSize:14,minHeight:"100vh",background:C.bg}}>
      {/* Top bar */}
      <div style={{background:C.green,padding:"0 24px",display:"flex",alignItems:"stretch",gap:0,position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 12px rgba(0,0,0,0.15)"}}>
        {/* Brand */}
        <div style={{display:"flex",alignItems:"center",paddingRight:28,borderRight:"1px solid rgba(255,255,255,0.15)",marginRight:4}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:28,height:28,borderRadius:6,background:C.accent,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{...F,fontSize:14,fontWeight:700,color:"#fff",lineHeight:1}}>P</span>
            </div>
            <span style={{...F,fontSize:17,fontWeight:700,color:"#fff",letterSpacing:"-0.3px"}}>Proximis</span>
          </div>
        </div>
        {/* Tabs */}
        {TABS.map(t=>{
          const active=tab===t.id;
          return(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{...FS,background:"none",border:"none",borderBottom:active?"2.5px solid "+C.accent:"2.5px solid transparent",
                padding:"0 16px",fontSize:12.5,cursor:"pointer",color:active?"#fff":"rgba(255,255,255,0.6)",
                fontWeight:active?600:400,marginBottom:0,whiteSpace:"nowrap",height:48,transition:"color 0.15s"}}>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{padding:"24px 24px 40px"}}>
        {tab==="home"       && <HomeScreen {...shared} onNav={setTab}/>}
        {tab==="donors"     && <DonorMap   {...shared}/>}
        {tab==="pipeline"   && <PipelineTab {...shared}/>}
        {tab==="gap"        && <GapMatrix  {...shared}/>}
        {tab==="burn"       && <BurnRate   {...shared}/>}
        {tab==="engagement" && <Engagement {...shared}/>}
        {tab==="activation" && <Activation {...shared} onNav={setTab}/>}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// HOME SCREEN — Intelligence Briefing
// ═════════════════════════════════════════════════════════════════════════════
function HomeScreen({donors,pipeline,budgets,grants,touchpoints,tracks,onNav}) {
  const actions = useMemo(() => generateActions(donors,pipeline,budgets,grants,touchpoints,tracks),[donors,pipeline,budgets,grants,touchpoints,tracks]);

  const totalRequired = budgets.reduce((s,b)=>s+n(b.required),0);
  const totalWt = pipeline.reduce((s,o)=>s+wt(o),0);
  const fundingGap = Math.max(0,totalRequired-totalWt);
  const grantsAtRisk = grants.filter(g=>["Critical","High"].includes(assessBurn(g).level)).length;
  const coolingRels = donors.filter(d=>{const e=scoreEng(d.id,touchpoints);return e.overall<50&&e.overall>0;}).length;
  const confirmedPipe = pipeline.filter(p=>n(p.prob)>=90).reduce((s,p)=>s+n(p.amount),0);

  // Alerts
  const alerts = [];
  grants.forEach(g => {
    if(!g.reportingDeadline) return;
    const days = daysFrom(g.reportingDeadline);
    if(days < 0 && days > -14) alerts.push({type:"deadline",msg:`Report due in ${-days} days — ${g.programme} / ${g.donor}`,color:C.red,bg:C.redL});
    else if(days < 0 && days > -30) alerts.push({type:"deadline",msg:`Report due in ${-days} days — ${g.programme} / ${g.donor}`,color:C.amber,bg:C.amberL});
  });
  donors.forEach(d => {
    const e = scoreEng(d.id,touchpoints);
    if(e.overall < 25 && e.daysSinceLast > 60) alerts.push({type:"relationship",msg:`${d.name} — ${e.daysSinceLast} days without contact. Engagement score: ${e.overall}/100`,color:C.red,bg:C.redL});
  });
  tracks.forEach(t => {
    const s = trackStats(t);
    if(s.blocked) alerts.push({type:"activation",msg:`${t.donor} activation blocked — ${t.milestones.find(m=>m.status==="Blocked")?.label}`,color:C.red,bg:C.redL});
  });

  return(
    <div>
      {/* Morning header */}
      <div style={{marginBottom:24}}>
        <div style={{...F,fontSize:26,fontWeight:700,color:C.text,lineHeight:1.2,marginBottom:4}}>
          Good {TODAY.getHours()<12?"morning":TODAY.getHours()<17?"afternoon":"evening"}.
        </div>
        <div style={{...FS,fontSize:13,color:C.muted}}>
          {dayName}, {TODAY.toLocaleDateString("en",{day:"numeric",month:"long",year:"numeric"})} &nbsp;·&nbsp; Here is where your portfolio stands today.
        </div>
      </div>

      {/* Portfolio pulse — each metric navigates to the relevant tab */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24}}>
        {[
          {label:"Weighted pipeline",val:fmt(totalWt),sub:`${pipeline.length} active opportunities`,col:C.green,dest:"pipeline",hint:"Open Pipeline"},
          {label:"Confirmed funding",val:fmt(confirmedPipe),sub:"Probability ≥ 90%",col:C.green,dest:"pipeline",hint:"Open Pipeline"},
          {label:"Funding gap",val:fmt(fundingGap),sub:"Against programme budgets",col:fundingGap>5000000?C.red:C.amber,dest:"gap",hint:"Open Gap Matrix"},
          {label:"Attention required",val:grantsAtRisk+coolingRels,sub:`${grantsAtRisk} grants at risk · ${coolingRels} relationships cooling`,col:grantsAtRisk+coolingRels>3?C.red:C.amber,dest:"burn",hint:"Open Burn Rate",accent:true},
        ].map(m=>(
          <div key={m.label}
            onClick={()=>onNav&&onNav(m.dest)}
            onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 18px rgba(0,0,0,0.12)";e.currentTarget.style.transform="translateY(-2px)";}}
            onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.transform="none";}}
            style={{background:m.accent?C.green:C.card,border:`1px solid ${m.accent?C.green:C.border}`,borderRadius:12,padding:"14px 16px",cursor:"pointer",transition:"box-shadow 0.15s, transform 0.12s",userSelect:"none"}}>
            <div style={{...FS,fontSize:10,color:m.accent?"rgba(255,255,255,0.6)":C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>{m.label}</div>
            <div style={{...F,fontSize:22,fontWeight:700,color:m.accent?"#fff":m.col||C.text,lineHeight:1.1}}>{m.val}</div>
            {m.sub&&<div style={{...FS,fontSize:11,color:m.accent?"rgba(255,255,255,0.7)":C.hint,marginTop:4}}>{m.sub}</div>}
            <div style={{...FS,fontSize:9.5,color:m.accent?"rgba(255,255,255,0.45)":C.hint,marginTop:7,letterSpacing:"0.02em"}}>{m.hint} ↗</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 360px",gap:16}}>
        {/* Priority actions */}
        <div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <div style={{...F,fontSize:17,fontWeight:700,color:C.text}}>This Week's Priorities</div>
            <div style={{...FS,fontSize:11,color:C.muted,padding:"3px 10px",background:C.amberL,borderRadius:20,fontWeight:600,color:C.amber}}>Ranked by impact</div>
          </div>
          {/* Action type → tab mapping */}
          {(()=>{
            const ACTION_TAB = {engagement:"engagement",pipeline:"pipeline",reporting:"burn",burn:"burn",activation:"activation"};
            const DEST_LABEL = {engagement:"Open Engagement →",pipeline:"Open Pipeline →",reporting:"Open Burn Rate →",burn:"Open Burn Rate →",activation:"Open Activation →"};
            return(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {actions.map((a,i)=>(
                  <div key={a.id}
                    onClick={()=>onNav&&onNav(ACTION_TAB[a.type]||"pipeline")}
                    style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden",borderLeft:`4px solid ${a.urgencyColor}`,cursor:"pointer",transition:"box-shadow 0.15s,transform 0.12s"}}
                    onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 6px 20px rgba(0,0,0,0.10)";e.currentTarget.style.transform="translateY(-2px)";}}
                    onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.transform="none";}}>
                    <div style={{padding:"14px 16px"}}>
                      <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                        <div style={{width:28,height:28,borderRadius:"50%",background:i===0?C.green:i===1?C.amber:C.border,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                          <span style={{...FS,fontSize:12,fontWeight:700,color:i<2?"#fff":C.muted}}>{i+1}</span>
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8,marginBottom:4}}>
                            <div style={{...FS,fontSize:13.5,fontWeight:600,color:C.text,lineHeight:1.3}}>{a.title}</div>
                            <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                              <span style={{...FS,fontSize:11,color:C.muted}}>{a.effort}</span>
                              <span style={{...FS,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:8,background:a.urgencyBg,color:a.urgencyColor}}>Score {a.priority}</span>
                            </div>
                          </div>
                          <div style={{...FS,fontSize:11.5,color:C.muted,marginBottom:8}}>{a.subtitle}</div>
                          <div style={{...FS,fontSize:11.5,color:"#3D3C38",lineHeight:1.65,marginBottom:10,padding:"8px 12px",background:"#FAFAF7",borderRadius:8}}>{a.why}</div>
                          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                            <div style={{display:"flex",alignItems:"center",gap:6}}>
                              <span style={{...FS,fontSize:10.5,fontWeight:600,color:C.green}}>→</span>
                              <span style={{...FS,fontSize:11.5,fontWeight:600,color:C.green}}>{a.action}</span>
                            </div>
                            <span style={{...FS,fontSize:10.5,fontWeight:600,color:C.muted,padding:"3px 10px",background:"#F4F1EB",borderRadius:8}}>{DEST_LABEL[a.type]||"Open →"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {actions.length===0&&(
                  <div style={{...FS,fontSize:13,color:C.muted,padding:"2rem",textAlign:"center",background:C.card,border:`1px solid ${C.border}`,borderRadius:12}}>
                    No priority actions identified — portfolio is in good shape.
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Right column — alerts + pipeline snapshot */}
        <div>
          {/* Alerts */}
          {alerts.length>0&&(
            <div style={{marginBottom:16}}>
              <div style={{...FS,fontSize:12,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10}}>Alerts</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {alerts.slice(0,5).map((a,i)=>{
                  const alertTab=a.type==="deadline"?"burn":a.type==="relationship"?"engagement":"activation";
                  return(
                    <div key={i} onClick={()=>onNav&&onNav(alertTab)}
                      style={{padding:"10px 12px",background:a.bg,border:`1px solid ${a.color}30`,borderRadius:8,borderLeft:`3px solid ${a.color}`,cursor:"pointer",transition:"opacity 0.15s"}}
                      onMouseEnter={e=>e.currentTarget.style.opacity="0.85"}
                      onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                      <div style={{...FS,fontSize:11.5,color:a.color,lineHeight:1.5}}>{a.msg}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pipeline snapshot */}
          <Card style={{cursor:"pointer"}} >
            <div onClick={()=>onNav&&onNav("pipeline")}
              onMouseEnter={e=>e.currentTarget.style.opacity="0.9"}
              onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
              <CardHead title="Pipeline snapshot" right={<span style={{...FS,fontSize:11,color:C.green,fontWeight:600}}>View all →</span>}/>
              <div style={{padding:"12px 14px"}}>
                {Object.keys(ST).map(stage=>{
                  const opps=pipeline.filter(o=>o.stage===stage);
                  const val=opps.reduce((s,o)=>s+n(o.amount),0);
                  const s=ST[stage];
                  if(!opps.length) return null;
                  return(
                    <div key={stage} style={{marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <span style={{width:7,height:7,borderRadius:"50%",background:s.c,display:"inline-block"}}></span>
                          <span style={{...FS,fontSize:11.5,color:C.text}}>{stage==="Concept Note Submitted"?"Concept Note":stage==="Under Negotiation"?"Negotiation":stage}</span>
                          <span style={{...FS,fontSize:10.5,color:C.muted}}>({opps.length})</span>
                        </div>
                        <span style={{...FS,fontSize:11.5,fontWeight:600,color:C.text}}>{fmt(val)}</span>
                      </div>
                      <div style={{height:3,background:C.border,borderRadius:2,overflow:"hidden"}}>
                        <div style={{height:"100%",background:s.c,width:pct(val,pipeline.reduce((x,o)=>x+n(o.amount),0))+"%",borderRadius:2}}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Engagement snapshot */}
          <Card style={{marginTop:12,cursor:"pointer"}}>
            <div onClick={()=>onNav&&onNav("engagement")}
              onMouseEnter={e=>e.currentTarget.style.opacity="0.9"}
              onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
              <CardHead title="Relationship health" right={<span style={{...FS,fontSize:11,color:C.green,fontWeight:600}}>View all →</span>}/>
              <div>
                {donors.slice(0,6).map(d=>{
                  const e=scoreEng(d.id,touchpoints);
                  const el=engLabel(e.overall);
                  return(
                    <div key={d.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 14px",borderBottom:`1px solid ${C.border}`}}>
                      <div style={{...FS,fontSize:12,fontWeight:600,color:C.text,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.name}</div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:60,height:3,background:C.border,borderRadius:2}}>
                          <div style={{height:"100%",background:el.bar,width:e.overall+"%",borderRadius:2}}></div>
                        </div>
                        <span style={{...FS,fontSize:11,fontWeight:600,color:el.bar,minWidth:20}}>{e.overall}</span>
                        <Pill label={el.label} bg={el.bg} tx={el.tx}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// DONOR MAP
// ═════════════════════════════════════════════════════════════════════════════
function DonorMap({donors,setDonors,pipeline,setPipeline,touchpoints}){
  const[showF,setShowF]=useState(false);const[editId,setEditId]=useState(null);const[form,setForm]=useState({});
  const[search,setSearch]=useState("");const[fType,setFType]=useState("");const[fPri,setFPri]=useState("");
  const[expanded,setExpanded]=useState({});

  const scored=donors.map(d=>({...d,sc:dScore(d),eng:scoreEng(d.id,touchpoints)}));
  const filtered=scored
    .filter(d=>(!search||(d.name||"").toLowerCase().includes(search.toLowerCase())||(d.geo||"").toLowerCase().includes(search.toLowerCase()))
      &&(!fType||d.type===fType)
      &&(!fPri||(fPri==="h"?d.sc>=70:fPri==="m"?(d.sc>=40&&d.sc<70):d.sc<40)))
    .sort((a,b)=>b.sc-a.sc);

  const high=scored.filter(d=>d.sc>=70).length;
  const warm=scored.filter(d=>["Warm","Active","Strategic"].includes(d.relationship)).length;

  function openF(id){const d=id?donors.find(x=>x.id===id):null;setForm(d?{...d}:{name:"",type:"Bilateral",relationship:"Warm",grantMin:"",grantMax:"",contact:"",cycle:"",geo:"",themes:[],instruments:[],notes:""});setEditId(id||null);setShowF(true);}
  function saveF(){if(!form.name)return;const rec={...form,id:editId||String(Date.now()),grantMin:n(form.grantMin),grantMax:n(form.grantMax),themes:Array.isArray(form.themes)?form.themes:[],instruments:Array.isArray(form.instruments)?form.instruments:[]};if(editId)setDonors(ds=>ds.map(d=>d.id===editId?rec:d));else setDonors(ds=>[...ds,rec]);setShowF(false);setEditId(null);}
  function push(id){const d=donors.find(x=>x.id===id);if(!d)return;setPipeline(p=>[...p,{id:String(Date.now()),name:d.name+" — new opportunity",donor:d.name,amount:n(d.grantMax)||n(d.grantMin)||0,stage:"Prospect",prob:10,date:d.cycle||"",thematic:(d.themes&&d.themes[0])||"Other",notes:"Via Donor Map"}]);}

  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        <Mc label="Donors mapped" val={donors.length} sub="Total in intelligence database"/>
        <Mc label="High priority" val={high} sub="Alignment score 70+" col={C.green}/>
        <Mc label="Warm or above" val={warm} sub="Active relationships" col={C.green}/>
        <Mc label="In pipeline" val={donors.filter(d=>pipeline.some(p=>p.donor===d.name)).length} sub="Pushed as prospects"/>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or geography…" style={{...inp,flex:1,minWidth:180}}/>
        <select value={fType} onChange={e=>setFType(e.target.value)} style={{...inp,width:"auto"}}><option value="">All types</option>{DONOR_TYPES.map(t=><option key={t}>{t}</option>)}</select>
        <select value={fPri} onChange={e=>setFPri(e.target.value)} style={{...inp,width:"auto"}}><option value="">All priorities</option><option value="h">High (70+)</option><option value="m">Medium</option><option value="l">Low</option></select>
        <button onClick={()=>openF(null)} style={btn("add")}>+ Add donor</button>
      </div>

      {showF&&(
        <Card style={{marginBottom:16}}>
          <CardHead title={editId?"Edit donor":"New donor profile"}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,padding:"14px 16px 0"}}>
            <FR full><L>Donor name</L><input value={form.name||""} onChange={e=>setForm(p=>({...p,name:e.target.value}))} style={inp} placeholder="e.g. UK FCDO"/></FR>
            <FR><L>Type</L><select value={form.type||"Bilateral"} onChange={e=>setForm(p=>({...p,type:e.target.value}))} style={inp}>{DONOR_TYPES.map(o=><option key={o}>{o}</option>)}</select></FR>
            <FR><L>Relationship</L><select value={form.relationship||"Warm"} onChange={e=>setForm(p=>({...p,relationship:e.target.value}))} style={inp}>{RELATIONSHIPS.map(o=><option key={o}>{o}</option>)}</select></FR>
            <FR><L>Grant min (USD)</L><input type="number" value={form.grantMin||""} onChange={e=>setForm(p=>({...p,grantMin:e.target.value}))} style={inp}/></FR>
            <FR><L>Grant max (USD)</L><input type="number" value={form.grantMax||""} onChange={e=>setForm(p=>({...p,grantMax:e.target.value}))} style={inp}/></FR>
            <FR><L>Key contact</L><input value={form.contact||""} onChange={e=>setForm(p=>({...p,contact:e.target.value}))} style={inp} placeholder="Name, title"/></FR>
            <FR><L>Next funding cycle</L><input type="month" value={form.cycle||""} onChange={e=>setForm(p=>({...p,cycle:e.target.value}))} style={inp}/></FR>
            <FR><L>Geography</L><input value={form.geo||""} onChange={e=>setForm(p=>({...p,geo:e.target.value}))} style={inp}/></FR>
            <FR full><L>Thematic priorities</L>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:4,marginTop:5}}>
                {ALL_THEMES.map(t=><label key={t} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,cursor:"pointer",...FS}}>
                  <input type="checkbox" checked={(form.themes||[]).includes(t)} onChange={e=>setForm(p=>({...p,themes:e.target.checked?[...(p.themes||[]),t]:(p.themes||[]).filter(x=>x!==t)}))} style={{width:"auto",margin:0}}/>{t}
                </label>)}
              </div>
            </FR>
            <FR full><L>Funding instruments</L>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:4,marginTop:5}}>
                {INSTRUMENTS.map(i=><label key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,cursor:"pointer",...FS}}>
                  <input type="checkbox" checked={(form.instruments||[]).includes(i)} onChange={e=>setForm(p=>({...p,instruments:e.target.checked?[...(p.instruments||[]),i]:(p.instruments||[]).filter(x=>x!==i)}))} style={{width:"auto",margin:0}}/>{i}
                </label>)}
              </div>
            </FR>
            <FR full><L>Notes / intelligence</L><input value={form.notes||""} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} style={inp} placeholder="Donor intelligence, relationship notes"/></FR>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"12px 16px"}}>
            <button onClick={()=>setShowF(false)} style={btn("ghost")}>Cancel</button>
            <button onClick={saveF} style={btn("save")}>Save donor</button>
          </div>
        </Card>
      )}

      <Card>
        {filtered.length===0&&<div style={{padding:"3rem",textAlign:"center",...FS,color:C.hint,fontSize:13}}>No donors match the current filters.</div>}
        {filtered.map((d,i)=>{
          const tc=TC[d.type]||{bg:"#F3F4F6",tx:"#374151"};
          const rc=RC[d.relationship]||{bg:"#F3F4F6",tx:C.muted};
          const sc=d.sc; const priC=sc>=70?C.green:sc>=40?C.amber:C.hint;
          const el=engLabel(d.eng.overall);
          const isOpen=expanded[d.id];
          const pushed=pipeline.some(p=>p.donor===d.name);
          return(
            <div key={d.id} style={{borderBottom:i<filtered.length-1?`1px solid ${C.border}`:"none"}}>
              <div style={{display:"flex",alignItems:"center",gap:12,padding:"11px 16px",cursor:"pointer",background:isOpen?"#FAFAF7":C.card,transition:"background 0.1s"}}
                onClick={()=>setExpanded(e=>({...e,[d.id]:!e[d.id]}))}>
                {/* Score bubble */}
                <div style={{width:38,height:38,borderRadius:"50%",background:priC+"18",border:`2px solid ${priC}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <span style={{...FS,fontSize:12,fontWeight:700,color:priC,lineHeight:1}}>{sc}</span>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
                    <span style={{...FS,fontSize:13,fontWeight:600,color:C.text}}>{d.name}</span>
                    <Pill label={d.type} bg={tc.bg} tx={tc.tx}/>
                    <Pill label={d.relationship} bg={rc.bg} tx={rc.tx}/>
                  </div>
                  <div style={{...FS,fontSize:11,color:C.muted}}>{d.geo||"—"} · {n(d.grantMin)||n(d.grantMax)?fmt(n(d.grantMin))+"–"+fmt(n(d.grantMax)):"Grant range not set"}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                  <Pill label={sc>=70?"High priority":sc>=40?"Medium":"Low"} bg={priC+"18"} tx={priC}/>
                  <Pill label={el.label} bg={el.bg} tx={el.tx}/>
                  <span style={{...FS,fontSize:13,color:C.hint}}>{isOpen?"▲":"▼"}</span>
                </div>
              </div>
              {isOpen&&(
                <div style={{padding:"12px 16px 14px 72px",background:"#FAFAF7",borderTop:`1px solid ${C.border}`}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                    <div>
                      <div style={{...FS,fontSize:10.5,color:C.muted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:5}}>Thematic priorities</div>
                      <div>{(d.themes||[]).map(t=><span key={t} style={{display:"inline-block",fontSize:10,padding:"2px 7px",borderRadius:4,background:PROG_THEMES.includes(t)?C.blueL:"#F3F4F6",color:PROG_THEMES.includes(t)?C.blue:C.muted,margin:"1px",...FS}}>{t}</span>)}</div>
                    </div>
                    <div>
                      <div style={{...FS,fontSize:10.5,color:C.muted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:5}}>Contact · Next cycle</div>
                      <div style={{...FS,fontSize:12,color:C.text,lineHeight:1.5}}>{d.contact||"—"}</div>
                      <div style={{...FS,fontSize:11,color:C.muted,marginTop:2}}>{d.cycle||"Cycle not set"}</div>
                    </div>
                  </div>
                  {d.notes&&<div style={{...FS,fontSize:11.5,color:C.muted,lineHeight:1.6,padding:"8px 12px",background:C.card,borderRadius:8,border:`1px solid ${C.border}`,marginBottom:10}}>{d.notes}</div>}
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={e=>{e.stopPropagation();openF(d.id);}} style={btn("edit")}>Edit</button>
                    <button onClick={e=>{e.stopPropagation();setDonors(ds=>ds.filter(x=>x.id!==d.id));}} style={btn("del")}>Delete</button>
                    <button onClick={e=>{e.stopPropagation();push(d.id);}} style={{...btn("add"),marginLeft:"auto"}}>Push to pipeline</button>
                    {pushed&&<span style={{...FS,fontSize:11,color:C.green,alignSelf:"center"}}>✓ In pipeline</span>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// PIPELINE
// ═════════════════════════════════════════════════════════════════════════════
function PipelineTab({pipeline,setPipeline}){
  const[showF,setShowF]=useState(false);const[editId,setEditId]=useState(null);const[form,setForm]=useState({});const[fStage,setFStage]=useState("");
  const total=pipeline.reduce((s,o)=>s+n(o.amount),0);
  const wtotal=pipeline.reduce((s,o)=>s+wt(o),0);
  const dcount=new Set(pipeline.map(o=>o.donor)).size;
  const stkeys=Object.keys(ST);const stotals={};stkeys.forEach(s=>stotals[s]=0);
  pipeline.forEach(o=>{if(stotals[o.stage]!==undefined)stotals[o.stage]+=n(o.amount);});
  const stageData=stkeys.map(s=>({name:s==="Concept Note Submitted"?"Concept Note":s==="Under Negotiation"?"Negotiation":s,val:toM(stotals[s]),col:ST[s].c}));
  const months={};
  for(let i=0;i<12;i++){const d=new Date(TODAY.getFullYear(),TODAY.getMonth()+i,1);months[d.toISOString().slice(0,7)]=0;}
  pipeline.forEach(o=>{if(o.date&&months[o.date]!==undefined)months[o.date]+=wt(o);});
  const forecastData=Object.entries(months).map(([k,v])=>{const d=new Date(k+"-01");return{month:d.toLocaleDateString("en",{month:"short",year:"2-digit"}),val:toM(v)};});
  const list=[...(fStage?pipeline.filter(o=>o.stage===fStage):pipeline)].sort((a,b)=>n(b.amount)-n(a.amount));
  function openF(id){const o=id?pipeline.find(x=>x.id===id):null;setForm(o?{...o}:{name:"",donor:"",amount:"",stage:"Prospect",prob:10,date:"",thematic:"Urban Development",notes:""});setEditId(id||null);setShowF(true);}
  function saveF(){if(!form.name||!form.donor||!form.amount)return;const rec={...form,id:editId||String(Date.now()),amount:n(form.amount),prob:Math.min(100,Math.max(0,n(form.prob)))};if(editId)setPipeline(ps=>ps.map(p=>p.id===editId?rec:p));else setPipeline(ps=>[...ps,rec]);setShowF(false);setEditId(null);}
  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        <Mc label="Total pipeline" val={fmt(total)} sub="Gross value all stages"/>
        <Mc label="Weighted forecast" val={fmt(wtotal)} sub="Probability-adjusted" col={C.green}/>
        <Mc label="Opportunities" val={pipeline.length} sub={`across ${dcount} donors`}/>
        <Mc label="Weighted probability" val={pct(wtotal,total)+"%"} sub="Value-weighted average"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <Card style={{padding:"14px 16px"}}>
          <div style={{...FS,fontSize:11,color:C.muted,textTransform:"uppercase",fontWeight:600,letterSpacing:"0.05em",marginBottom:12}}>By stage ($M)</div>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={stageData} margin={{top:4,right:4,bottom:4,left:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)"/>
              <XAxis dataKey="name" tick={{fontSize:9,...FS}}/><YAxis tick={{fontSize:9,...FS}} tickFormatter={v=>v>0?"$"+v+"M":0}/>
              <Tooltip formatter={v=>["$"+v+"M"]} contentStyle={{...FS,fontSize:11,borderRadius:8,border:`1px solid ${C.border}`}}/>
              <Bar dataKey="val" radius={[4,4,0,0]}>{stageData.map((e,i)=><Cell key={i} fill={e.col}/>)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card style={{padding:"14px 16px"}}>
          <div style={{...FS,fontSize:11,color:C.muted,textTransform:"uppercase",fontWeight:600,letterSpacing:"0.05em",marginBottom:12}}>12-month forecast ($M) — from {TODAY.toLocaleDateString("en",{month:"short",year:"numeric"})}</div>
          <ResponsiveContainer width="100%" height={170}>
            <LineChart data={forecastData} margin={{top:4,right:8,bottom:4,left:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)"/>
              <XAxis dataKey="month" tick={{fontSize:9,...FS}} angle={-30} textAnchor="end"/>
              <YAxis tick={{fontSize:9,...FS}} tickFormatter={v=>v>0?"$"+v+"M":0}/>
              <Tooltip formatter={v=>["$"+v+"M weighted"]} contentStyle={{...FS,fontSize:11,borderRadius:8,border:`1px solid ${C.border}`}}/>
              <Line dataKey="val" stroke={C.green} strokeWidth={2.5} dot={{r:3,fill:C.green}} connectNulls/>
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <Card>
        <CardHead title="Opportunities" right={
          <div style={{display:"flex",gap:8}}>
            <select value={fStage} onChange={e=>setFStage(e.target.value)} style={{...inp,width:"auto",fontSize:12}}><option value="">All stages</option>{PIPE_STAGES.map(s=><option key={s}>{s}</option>)}</select>
            <button onClick={()=>openF(null)} style={btn("add")}>+ Add</button>
          </div>
        }/>
        {showF&&(
          <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,background:"#FAFAF7"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <FR full><L>Opportunity name</L><input value={form.name||""} onChange={e=>setForm(p=>({...p,name:e.target.value}))} style={inp} placeholder="e.g. FCDO Urban Resilience Fund"/></FR>
              <FR><L>Donor</L><input value={form.donor||""} onChange={e=>setForm(p=>({...p,donor:e.target.value}))} style={inp}/></FR>
              <FR><L>Amount (USD)</L><input type="number" value={form.amount||""} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} style={inp}/></FR>
              <FR><L>Stage</L><select value={form.stage||"Prospect"} onChange={e=>{const pp=ST[e.target.value]?.p||10;setForm(f=>({...f,stage:e.target.value,prob:pp}));}} style={inp}>{PIPE_STAGES.map(s=><option key={s}>{s}</option>)}</select></FR>
              <FR><L>Probability %</L><input type="number" min="0" max="100" value={form.prob||10} onChange={e=>setForm(p=>({...p,prob:e.target.value}))} style={inp}/></FR>
              <FR><L>Expected close</L><input type="month" value={form.date||""} onChange={e=>setForm(p=>({...p,date:e.target.value}))} style={inp}/></FR>
              <FR><L>Thematic area</L><select value={form.thematic||"Urban Development"} onChange={e=>setForm(p=>({...p,thematic:e.target.value}))} style={inp}>{ALL_THEMES.map(t=><option key={t}>{t}</option>)}</select></FR>
              <FR full><L>Notes</L><input value={form.notes||""} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} style={inp}/></FR>
              {form.amount&&form.prob&&<div style={{gridColumn:"span 2",padding:"8px 12px",background:C.greenL,borderRadius:8,...FS,fontSize:12}}>
                <strong>{fmt(n(form.amount))}</strong> × <strong>{Math.round(n(form.prob))}%</strong> = weighted value <strong style={{color:C.green}}>{fmt(n(form.amount)*n(form.prob)/100)}</strong>
              </div>}
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:12}}>
              <button onClick={()=>setShowF(false)} style={btn("ghost")}>Cancel</button>
              <button onClick={saveF} style={btn("save")}>Save</button>
            </div>
          </div>
        )}
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,tableLayout:"fixed",...FS}}>
            <thead><tr style={{borderBottom:`1px solid ${C.border}`,background:"#FAFAF7"}}>
              {[["20%","Opportunity"],["12%","Donor"],["9%","Amount"],["13%","Stage"],["13%","Probability"],["9%","Weighted"],["8%","Close"],["16%","Actions"]].map(([w,h])=>(
                <th key={h} style={{textAlign:"left",padding:"9px 10px",fontSize:10,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:"0.05em",width:w,...FS}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{list.map(o=>{
              const s=ST[o.stage]||ST["Prospect"];
              const label=o.stage==="Concept Note Submitted"?"Concept Note":o.stage==="Under Negotiation"?"Negotiation":o.stage;
              return(
                <tr key={o.id} style={{borderBottom:`1px solid ${C.border}`}}>
                  <td style={{padding:"10px 10px",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:C.text}} title={o.name}>{o.name}</td>
                  <td style={{padding:"10px 10px",color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.donor}</td>
                  <td style={{padding:"10px 10px",color:C.text}}>{fmt(n(o.amount))}</td>
                  <td style={{padding:"10px 10px"}}><Pill label={label} bg={s.bg} tx={s.tx}/></td>
                  <td style={{padding:"10px 10px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <span style={{fontSize:11,minWidth:26,color:C.text}}>{Math.round(n(o.prob))}%</span>
                      <div style={{flex:1,height:3,background:C.border,borderRadius:2}}><div style={{height:"100%",borderRadius:2,background:s.c,width:Math.round(n(o.prob))+"%"}}></div></div>
                    </div>
                  </td>
                  <td style={{padding:"10px 10px",color:C.green,fontWeight:600}}>{fmt(Math.round(wt(o)))}</td>
                  <td style={{padding:"10px 10px",color:C.muted}}>{o.date||"—"}</td>
                  <td style={{padding:"6px 8px"}}>
                    <div style={{display:"flex",flexDirection:"column",gap:4}}>
                      <button onClick={()=>openF(o.id)} style={{...btn("edit"),textAlign:"center",padding:"3px 0",width:"100%"}}>Edit</button>
                      <button onClick={()=>setPipeline(ps=>ps.filter(p=>p.id!==o.id))} style={{...btn("del"),textAlign:"center",padding:"3px 0",width:"100%"}}>Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// GAP MATRIX
// ═════════════════════════════════════════════════════════════════════════════
function GapMatrix({pipeline,budgets,setBudgets,donors}){
  const[showF,setShowF]=useState(false);const[editId,setEditId]=useState(null);const[form,setForm]=useState({});
  const totalReq=budgets.reduce((s,b)=>s+n(b.required),0);
  let totalConf=0,totalWt2=0;budgets.forEach(b=>{const c=calcT(b.thematic,pipeline);totalConf+=c.conf;totalWt2+=c.wt;});
  const chartData=budgets.map(b=>{const req=n(b.required),c=calcT(b.thematic,pipeline);const conf=Math.min(c.conf,req),prob=Math.min(c.prob,Math.max(0,req-conf)),gap=Math.max(0,req-conf-prob);return{name:b.thematic.length>14?b.thematic.slice(0,12)+"…":b.thematic,Confirmed:toM(conf),Probable:toM(prob),Gap:toM(gap)};});
  function openF(id){const b=id?budgets.find(x=>x.id===id):null;setForm(b?{...b}:{programme:"",thematic:"Urban Development",required:"",period:"2026",notes:""});setEditId(id||null);setShowF(true);}
  function saveF(){if(!form.programme||!form.required)return;const rec={...form,id:editId||String(Date.now()),required:n(form.required)};if(editId)setBudgets(bs=>bs.map(b=>b.id===editId?rec:b));else setBudgets(bs=>[...bs,rec]);setShowF(false);setEditId(null);}

  const matchDonors=(thematic,gapAmt)=>donors.map(d=>{
    const thMatch=(d.themes||[]).includes(thematic);
    const grantFit=n(d.grantMax)>=gapAmt*0.3;
    const coverPct=n(d.grantMax)>0?Math.min(100,Math.round((n(d.grantMax)/gapAmt)*100)):0;
    const mScore=(thMatch?40:0)+(grantFit?25:0)+(REL_SCORE[d.relationship]||0)+Math.round(dScore(d)*0.1);
    return{...d,sc:dScore(d),mScore,thMatch,coverPct,grantFit};
  }).filter(d=>d.thMatch&&d.grantFit).sort((a,b)=>b.mScore-a.mScore);

  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        <Mc label="Total required" val={fmt(totalReq)} sub="All programme budget lines"/>
        <Mc label="Confirmed" val={fmt(totalConf)} sub="Secured funding" col={C.green}/>
        <Mc label="Weighted forecast" val={fmt(totalWt2)} sub="Pipeline probable" col={C.amber}/>
        <Mc label="Funding gap" val={fmt(Math.max(0,totalReq-totalWt2))} sub="Still to mobilise" col={C.red}/>
      </div>
      <Card style={{padding:"14px 16px",marginBottom:16}}>
        <div style={{...FS,fontSize:11,color:C.muted,textTransform:"uppercase",fontWeight:600,letterSpacing:"0.05em",marginBottom:8}}>Funding gap by thematic area ($M)</div>
        <div style={{display:"flex",gap:14,marginBottom:10}}>{[[C.green,"Confirmed"],[C.amber,"Weighted probable"],["#E57370","Remaining gap"]].map(([c,l])=><span key={l} style={{display:"flex",alignItems:"center",gap:5,...FS,fontSize:11,color:C.muted}}><span style={{width:10,height:10,borderRadius:2,background:c,display:"inline-block"}}></span>{l}</span>)}</div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} layout="vertical" margin={{top:4,right:4,bottom:4,left:10}}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)"/>
            <XAxis type="number" tick={{fontSize:9,...FS}} tickFormatter={v=>v>0?"$"+v+"M":0}/>
            <YAxis type="category" dataKey="name" tick={{fontSize:10,...FS}} width={95}/>
            <Tooltip formatter={(v,n)=>[v>0?"$"+v+"M":"—",n]} contentStyle={{...FS,fontSize:11,borderRadius:8,border:`1px solid ${C.border}`}}/>
            <Bar dataKey="Confirmed" fill={C.green} stackId="a"/>
            <Bar dataKey="Probable" fill={C.amber} stackId="a"/>
            <Bar dataKey="Gap" fill="#E57370" stackId="a" radius={[0,4,4,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Card style={{marginBottom:16}}>
        <CardHead title="Programme budget lines" right={<button onClick={()=>openF(null)} style={btn("add")}>+ Add programme</button>}/>
        {showF&&(
          <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,background:"#FAFAF7"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <FR full><L>Programme name</L><input value={form.programme||""} onChange={e=>setForm(p=>({...p,programme:e.target.value}))} style={inp}/></FR>
              <FR><L>Thematic area</L><select value={form.thematic||"Urban Development"} onChange={e=>setForm(p=>({...p,thematic:e.target.value}))} style={inp}>{ALL_THEMES.map(t=><option key={t}>{t}</option>)}</select></FR>
              <FR><L>Budget required (USD)</L><input type="number" value={form.required||""} onChange={e=>setForm(p=>({...p,required:e.target.value}))} style={inp}/></FR>
              <FR><L>Period</L><input value={form.period||"2026"} onChange={e=>setForm(p=>({...p,period:e.target.value}))} style={inp}/></FR>
              <FR full><L>Notes</L><input value={form.notes||""} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} style={inp}/></FR>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:12}}>
              <button onClick={()=>setShowF(false)} style={btn("ghost")}>Cancel</button>
              <button onClick={saveF} style={btn("save")}>Save</button>
            </div>
          </div>
        )}
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,tableLayout:"fixed",...FS}}>
          <thead><tr style={{borderBottom:`1px solid ${C.border}`,background:"#FAFAF7"}}>
            {[["18%","Programme"],["12%","Thematic"],["9%","Required"],["9%","Confirmed"],["9%","Weighted"],["8%","Gap"],["13%","Coverage"],["9%","Status"],["13%","Actions"]].map(([w,h])=>(
              <th key={h} style={{textAlign:"left",padding:"9px 10px",fontSize:10,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:"0.05em",width:w,...FS}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{budgets.map(b=>{
            const req=n(b.required),c=calcT(b.thematic,pipeline),gap=Math.max(0,req-c.wt);
            const gp=pct(gap,req),cp=pct(Math.min(c.conf,req),req),pp2=pct(Math.min(c.prob,Math.max(0,req-c.conf)),req);
            const st=gp<=10?{bg:C.greenL,tx:C.greenT,l:"Well funded"}:gp<=50?{bg:C.amberL,tx:"#7A5A1A",l:"Partial gap"}:{bg:C.redL,tx:"#9B2B24",l:"Critical gap"};
            return(
              <tr key={b.id} style={{borderBottom:`1px solid ${C.border}`}}>
                <td style={{padding:"10px 10px",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:C.text}} title={b.programme}>{b.programme}</td>
                <td style={{padding:"10px 10px",color:C.muted,fontSize:11}}>{b.thematic}</td>
                <td style={{padding:"10px 10px",color:C.text}}>{fmt(req)}</td>
                <td style={{padding:"10px 10px",color:C.green,fontWeight:600}}>{fmt(c.conf)}</td>
                <td style={{padding:"10px 10px",color:C.amber,fontWeight:600}}>{fmt(c.wt)}</td>
                <td style={{padding:"10px 10px",color:C.red,fontWeight:600}}>{gap>0?fmt(gap):"—"}</td>
                <td style={{padding:"10px 10px"}}>
                  <div style={{...FS,fontSize:10,color:C.muted,marginBottom:3}}>{gp}% gap</div>
                  <div style={{height:4,background:C.border,borderRadius:2,overflow:"hidden"}}>
                    <div style={{display:"flex",height:"100%"}}>
                      <div style={{width:cp+"%",background:C.green}}></div>
                      <div style={{width:pp2+"%",background:C.amber}}></div>
                      <div style={{width:Math.max(0,100-cp-pp2)+"%",background:"#E57370"}}></div>
                    </div>
                  </div>
                </td>
                <td style={{padding:"10px 10px"}}><Pill label={st.l} bg={st.bg} tx={st.tx}/></td>
                <td style={{padding:"6px 8px"}}>
                  <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    <button onClick={()=>openF(b.id)} style={{...btn("edit"),textAlign:"center",padding:"3px 0",width:"100%"}}>Edit</button>
                    <button onClick={()=>setBudgets(bs=>bs.filter(x=>x.id!==b.id))} style={{...btn("del"),textAlign:"center",padding:"3px 0",width:"100%"}}>Delete</button>
                  </div>
                </td>
              </tr>
            );
          })}</tbody>
        </table>

        <Collapsible title="Base scenario — what each programme has to work with" badge="Planning figures" badgeBg={C.greenL} badgeTx={C.greenT}>
          <div style={{paddingTop:8}}>
            {budgets.map(b=>{
              const req=n(b.required),c=calcScen(b.thematic,pipeline);
              const base=Math.min(c.base,req),cons=Math.min(c.conservative,req),opti=Math.min(c.optimistic,req);
              const gap=Math.max(0,req-c.base),basePct=pct(base,req);
              const statusCol=basePct>=95?C.green:basePct>=70?C.amber:C.red;
              const statusLabel=basePct>=95?"✓ Fully funded":basePct>=70?"◑ Partially funded":"✗ Underfunded";
              return(
                <div key={b.id} style={{padding:"12px 14px",border:`1px solid ${C.border}`,borderRadius:10,marginBottom:8,background:C.card}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                    <div>
                      <div style={{...FS,fontSize:13,fontWeight:600,color:C.text,marginBottom:2}}>{b.programme}</div>
                      <div style={{...FS,fontSize:11,color:C.muted}}>{b.thematic}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{...F,fontSize:18,fontWeight:700,color:C.green}}>{fmt(base)}</div>
                      <div style={{...FS,fontSize:10.5,color:statusCol,fontWeight:600}}>{statusLabel}</div>
                    </div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:8}}>
                    {[{l:"Conservative",v:cons,c:C.blue},{l:"Base",v:base,c:C.green},{l:"Optimistic",v:opti,c:C.amber}].map(s=>(
                      <div key={s.l} style={{textAlign:"center",background:"#FAFAF7",borderRadius:8,padding:"8px 4px"}}>
                        <div style={{...FS,fontSize:9.5,color:C.muted,marginBottom:3}}>{s.l}</div>
                        <div style={{...FS,fontSize:13.5,fontWeight:700,color:s.c}}>{fmt(s.v)}</div>
                      </div>
                    ))}
                  </div>
                  {gap>0&&<div style={{...FS,fontSize:11.5,color:C.red}}>Gap at base scenario: <strong>{fmt(gap)}</strong> ({100-basePct}% of budget unfunded)</div>}
                  <div style={{height:5,background:C.border,borderRadius:3,overflow:"hidden",marginTop:8}}>
                    <div style={{height:"100%",background:C.green,width:Math.min(basePct,100)+"%",borderRadius:3}}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </Collapsible>

        <Collapsible title="Gap priorities — ranked donor mobilisation focus" badge={`${budgets.filter(b=>Math.max(0,n(b.required)-calcT(b.thematic,pipeline).wt)>0).length} active gaps`} badgeBg={C.redL} badgeTx={C.red}>
          <div style={{paddingTop:8}}>
            {budgets.map(b=>{
              const req=n(b.required),c=calcT(b.thematic,pipeline),gap=Math.max(0,req-c.wt);
              if(gap<=0) return null;
              const matched=matchDonors(b.thematic,gap);
              return(
                <div key={b.id} style={{marginBottom:18}}>
                  <div style={{marginBottom:10}}>
                    <div style={{...FS,fontSize:13,fontWeight:700,color:C.text,marginBottom:2}}>{b.programme}</div>
                    <div style={{...FS,fontSize:11.5,color:C.muted}}>{b.thematic} · Gap: <strong style={{color:C.red}}>{fmt(gap)}</strong> of {fmt(req)}</div>
                  </div>
                  {matched.length===0&&<div style={{...FS,fontSize:11.5,color:C.muted,fontStyle:"italic"}}>No mapped donors match this thematic with sufficient grant capacity. Add relevant donors in Donor Map.</div>}
                  {matched.slice(0,4).map((d,i)=>{
                    const relC=RC[d.relationship]||{bg:"#F3F4F6",tx:C.muted};
                    const canCover=d.coverPct>=80?"Can fully cover the gap":d.coverPct>=40?"Can cover "+d.coverPct+"% of gap":"Partial contribution — "+d.coverPct+"% of gap";
                    const urgency=["Priority 1 — approach immediately","Priority 2 — this quarter","Priority 3 — next quarter","Priority 4 — monitor"][Math.min(i,3)];
                    const urgCol=[C.red,C.amber,C.blue,C.muted][Math.min(i,3)];
                    const relAction=d.relationship==="Active"||d.relationship==="Strategic"?"approach directly":"Warm"?"request a meeting promptly":"Cold"?"prepare a strong outreach hook first":"initiate relationship before pitching";
                    return(
                      <div key={d.id} style={{padding:"11px 14px",background:i===0?"#FAFAF7":C.card,border:`1px solid ${C.border}`,borderRadius:10,marginBottom:8}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                          <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
                            <span style={{...FS,fontSize:10,fontWeight:700,color:urgCol,padding:"2px 8px",borderRadius:8,background:urgCol+"18"}}>{urgency}</span>
                            <span style={{...FS,fontSize:13,fontWeight:700,color:C.text}}>{d.name}</span>
                            <Pill label={d.type} bg={TC[d.type]?.bg||"#F3F4F6"} tx={TC[d.type]?.tx||C.muted}/>
                            <Pill label={d.relationship} bg={relC.bg} tx={relC.tx}/>
                          </div>
                          <span style={{...FS,fontSize:12,fontWeight:700,color:d.sc>=70?C.green:d.sc>=40?C.amber:C.hint,whiteSpace:"nowrap"}}>{d.sc}/100</span>
                        </div>
                        <div style={{...FS,fontSize:11.5,color:"#3D3C38",lineHeight:1.7}}>
                          <strong>Thematic fit:</strong> funds {b.thematic}. <strong>Grant capacity:</strong> up to {fmt(n(d.grantMax))} — {canCover}. <strong>Relationship:</strong> {d.relationship} — {relAction}. <strong>Match score:</strong> {d.sc}/100.
                        </div>
                        {d.contact&&!d.contact.includes("TBD")&&<div style={{...FS,fontSize:11,color:C.muted,marginTop:5}}>Contact: <strong style={{color:C.text}}>{d.contact}</strong></div>}
                      </div>
                    );
                  })}
                </div>
              );
            }).filter(Boolean)}
          </div>
        </Collapsible>
      </Card>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// BURN RATE
// ═════════════════════════════════════════════════════════════════════════════
function BurnRate({grants,setGrants}){
  const[sel,setSel]=useState(grants[0]?.id);const[showF,setShowF]=useState(false);const[editId,setEditId]=useState(null);const[form,setForm]=useState({});
  const selected=grants.find(g=>g.id===sel)||grants[0];
  const selRisk=assessBurn(selected||{});
  const selBr=selected?Math.round(burnRate(selected)*100):0;
  const selTP=selected?timePctG(selected):0;
  const selExp=selected?expSpend(selected):0;
  const selVar=selExp>0?Math.round(((n(selected?.spent)-selExp)/selExp)*100):0;
  const selDays=selected?daysFrom(selected.reportingDeadline):0;
  const selBal=selected?Math.max(0,n(selected.disbursed)-n(selected.spent)):0;
  const totalD=grants.reduce((s,g)=>s+n(g.disbursed),0);
  const totalSp=grants.reduce((s,g)=>s+n(g.spent),0);
  const totalGr=grants.reduce((s,g)=>s+n(g.totalAmount),0);
  const portB=pct(totalSp,totalD);
  const crit=grants.filter(g=>assessBurn(g).level==="Critical").length;
  const high=grants.filter(g=>assessBurn(g).level==="High").length;
  const barD=grants.map(g=>({name:g.programme.length>16?g.programme.slice(0,14)+"…":g.programme,"Absorption rate":Math.round(burnRate(g)*100),"Time elapsed":timePctG(g),riskColor:assessBurn(g).bar}));
  function buildBC(g){
    if(!g)return[];const total=totMo(g.startDate,g.endDate),elapsed=mElapsed(g.startDate),show=Math.min(total,elapsed+4);const data=[];
    for(let i=0;i<=show;i++){const planned=Math.min(n(g.monthlyBudget)*i,n(g.totalAmount));const actual=elapsed>0&&i<=elapsed?Math.round(n(g.spent)*(i/elapsed)):i===0?0:null;const[sy,sm]=g.startDate.split("-").map(Number);const dt=new Date(sy,sm-1+i,1);data.push({month:dt.toLocaleDateString("en",{month:"short",year:"2-digit"}),"Planned spend":toM(planned),"Actual spend":actual!==null?toM(actual):null,"Disbursed ceiling":toM(n(g.disbursed))});}return data;
  }
  const burnD=buildBC(selected);
  function openF(id){const g=id?grants.find(x=>x.id===id):null;setForm(g?{...g}:{programme:"",donor:"",thematic:"Urban Development",totalAmount:"",disbursed:"",spent:"",startDate:"",endDate:"",reportingDeadline:"",monthlyBudget:"",notes:""});setEditId(id||null);setShowF(true);}
  function saveF(){if(!form.programme||!form.donor||!form.totalAmount)return;const rec={...form,id:editId||String(Date.now()),totalAmount:n(form.totalAmount),disbursed:n(form.disbursed),spent:n(form.spent),monthlyBudget:n(form.monthlyBudget)};if(editId)setGrants(gs=>gs.map(g=>g.id===editId?rec:g));else setGrants(gs=>[...gs,rec]);setShowF(false);setEditId(null);}
  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        <Mc label="Active grants" val={grants.length} sub="In monitoring"/>
        <Mc label="Portfolio absorption" val={portB+"%"} sub={fmt(totalSp)+" of "+fmt(totalD)+" disbursed"} col={portB>85?C.red:portB<25?C.amber:C.green}/>
        <Mc label="Undisbursed balance" val={fmt(totalGr-totalD)} sub="Future tranches" col={C.blue}/>
        <Mc label="Attention required" val={crit+high} sub={crit+" critical · "+high+" high risk"} col={crit>0?C.red:high>0?C.amber:C.green}/>
      </div>
      <Card style={{padding:"14px 16px",marginBottom:16}}>
        <div style={{...FS,fontSize:11,color:C.muted,textTransform:"uppercase",fontWeight:600,letterSpacing:"0.05em",marginBottom:4}}>Absorption rate vs time elapsed — portfolio</div>
        <div style={{...FS,fontSize:11,color:C.hint,marginBottom:10}}>Coloured bars = % of disbursed funds spent · Grey = % of grant period elapsed · Balanced bars = healthy grant</div>
        <ResponsiveContainer width="100%" height={185}>
          <BarChart data={barD} margin={{top:4,right:4,bottom:20,left:10}}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)"/>
            <XAxis dataKey="name" tick={{fontSize:9,...FS}} angle={-15} textAnchor="end"/>
            <YAxis tick={{fontSize:9,...FS}} tickFormatter={v=>v+"%"} domain={[0,100]}/>
            <Tooltip contentStyle={{...FS,fontSize:11,borderRadius:8,border:`1px solid ${C.border}`}} formatter={(v,name)=>{if(name==="Absorption rate")return[v+"%","Absorption rate"];return[v+"%","Time elapsed"];}}/>
            <Bar dataKey="Absorption rate" radius={[4,4,0,0]}>{barD.map((e,i)=><Cell key={i} fill={e.riskColor}/>)}</Bar>
            <Bar dataKey="Time elapsed" fill="rgba(107,104,96,0.2)" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <div style={{display:"grid",gridTemplateColumns:"240px 1fr",gap:12}}>
        <Card>
          <CardHead title="Active grants" right={<button onClick={()=>openF(null)} style={btn("add")}>+ Add</button>}/>
          {grants.map(g=>{const risk=assessBurn(g);const isA=sel===g.id;return(
            <div key={g.id} onClick={()=>setSel(g.id)} style={{padding:"11px 14px",borderBottom:`1px solid ${C.border}`,cursor:"pointer",background:isA?C.greenL:C.card,borderLeft:isA?`3px solid ${C.green}`:"3px solid transparent"}}>
              <div style={{...FS,fontSize:12,fontWeight:600,marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:C.text}}>{g.programme}</div>
              <div style={{...FS,fontSize:11,color:C.muted,marginBottom:5}}>{g.donor}</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><Pill label={risk.label} bg={risk.bg} tx={risk.tx}/><span style={{...FS,fontSize:11,color:C.muted}}>{Math.round(burnRate(g)*100)}%</span></div>
            </div>
          );})}
        </Card>
        {selected&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}}>
              {[{label:"Total grant",val:fmt(n(selected.totalAmount)),sub:"From "+selected.donor,col:C.text},{label:"Disbursed",val:fmt(n(selected.disbursed)),sub:pct(n(selected.disbursed),n(selected.totalAmount))+"% received",col:C.blue},{label:"Spent to date",val:fmt(n(selected.spent)),sub:selBr+"% of disbursed",col:selBr>88?C.red:selBr<25?C.amber:C.green},{label:"Available balance",val:fmt(selBal),sub:"Disbursed but unspent",col:C.purple},{label:"Undisbursed",val:fmt(Math.max(0,n(selected.totalAmount)-n(selected.disbursed))),sub:"Future tranches",col:C.muted},{label:"Reporting deadline",val:selDays&&selDays<0?(-selDays)+"d":"Overdue",sub:selected.reportingDeadline,col:selDays&&selDays>-14?C.red:selDays&&selDays>-30?C.amber:C.green}].map(m=><Mc key={m.label} {...m}/>)}
            </div>
            {showF&&(
              <Card style={{marginBottom:12}}>
                <CardHead title={editId?"Edit grant":"Add grant"}/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,padding:"14px 16px 0"}}>
                  {[{l:"Programme name",k:"programme",t:"text",full:true},{l:"Donor",k:"donor",t:"text"},{l:"Total grant (USD)",k:"totalAmount",t:"number"},{l:"Disbursed (USD)",k:"disbursed",t:"number"},{l:"Spent (USD)",k:"spent",t:"number"},{l:"Monthly budget (USD)",k:"monthlyBudget",t:"number"},{l:"Start",k:"startDate",t:"month"},{l:"End",k:"endDate",t:"month"},{l:"Reporting deadline",k:"reportingDeadline",t:"date"}].map(f=>(<FR key={f.k} full={f.full}><L>{f.l}</L><input type={f.t} value={form[f.k]||""} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} style={inp}/></FR>))}
                  <FR full><L>Notes</L><input value={form.notes||""} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} style={inp}/></FR>
                </div>
                <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"12px 16px"}}>
                  <button onClick={()=>setShowF(false)} style={btn("ghost")}>Cancel</button>
                  <button onClick={saveF} style={btn("save")}>Save</button>
                </div>
              </Card>
            )}
            <div style={{background:C.card,border:`1.5px solid ${selRisk.bar}`,borderRadius:12,padding:"14px 16px",marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{...FS,fontSize:12.5,fontWeight:600,color:C.text}}>{selected.programme}</div>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>openF(selected.id)} style={btn("edit")}>Edit</button>
                  <button onClick={()=>{const r=grants.filter(g=>g.id!==selected.id);setGrants(r);setSel(r[0]?.id);}} style={btn("del")}>Delete</button>
                </div>
              </div>
              {[{label:"Absorption rate — % of disbursed funds spent",val:selBr,color:selRisk.bar},{label:"Time elapsed — % of grant period completed",val:selTP,color:"rgba(107,104,96,0.4)"}].map(bar=>(
                <div key={bar.label} style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{...FS,fontSize:11.5,color:C.muted}}>{bar.label}</span><span style={{...FS,fontSize:12,fontWeight:700,color:bar.color}}>{bar.val}%</span></div>
                  <div style={{height:8,borderRadius:4,background:C.border,overflow:"hidden"}}><div style={{height:"100%",borderRadius:4,background:bar.color,width:Math.min(bar.val,100)+"%"}}></div></div>
                </div>
              ))}
              <div style={{padding:"8px 12px",background:"#FAFAF7",borderRadius:8,marginBottom:12,...FS,fontSize:11.5,lineHeight:1.6}}>
                <strong>Spend variance: </strong>
                <span style={{color:selVar>20?C.blue:selVar>0?C.green:Math.abs(selVar)<=15?C.green:C.red,fontWeight:700}}>{selVar>0?"+":""}{selVar}%</span>
                {selExp>0?` (${fmt(n(selected.spent))} spent vs ${fmt(selExp)} expected)`:" (first month — no variance to assess)"}
              </div>
              <div style={{padding:"10px 14px",background:selRisk.bg,borderRadius:8,...FS,fontSize:11.5,color:selRisk.tx,lineHeight:1.7}}>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
                  <span style={{fontSize:10,padding:"2px 8px",borderRadius:8,background:selRisk.bar,color:"#fff",fontWeight:700}}>{selRisk.level.toUpperCase()}</span>
                  <span style={{fontSize:12,fontWeight:700}}>{selRisk.label}</span>
                </div>
                {selRisk.level==="Critical"?`Spending at ${selBr}% of disbursed funds with significant time remaining. Submit disbursement request to ${selected.donor} immediately.`:
                 selRisk.level==="High"?`${selected.programme} is ${Math.abs(selVar)}% below expected pace. ${selected.donor} will flag this at the ${selected.reportingDeadline} review. Accelerate activities.`:
                 selRisk.level==="Medium"?`${selected.programme} is running behind plan. Review with programme team before the ${selected.reportingDeadline} deadline.`:
                 selRisk.label==="Ahead of plan"?`Spending ahead of plan. Verify expenditure is supported by deliverables and plan the next disbursement request to ${selected.donor}.`:
                 `${selected.programme} is tracking well. Maintain delivery momentum and begin preparing the next progress report ahead of the ${selected.reportingDeadline} deadline.`}
              </div>
              {selected.notes&&<div style={{marginTop:10,padding:"8px 12px",background:C.amberL,border:`1px solid ${C.amber}30`,borderRadius:8,...FS,fontSize:11.5,color:"#5A3E10",lineHeight:1.6}}><strong>Notes: </strong>{selected.notes}</div>}
            </div>
            <Card style={{padding:"14px 16px"}}>
              <div style={{...FS,fontSize:11,color:C.muted,textTransform:"uppercase",fontWeight:600,letterSpacing:"0.05em",marginBottom:4}}>Spend trajectory — {selected.programme} ($M)</div>
              <div style={{...FS,fontSize:11,color:C.hint,marginBottom:8}}>Planned (dashed green) · Actual (blue) · Disbursed ceiling — max spendable from this budget line (red)</div>
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={burnD} margin={{top:8,right:20,bottom:20,left:10}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)"/>
                  <XAxis dataKey="month" tick={{fontSize:9,...FS}} angle={-20} textAnchor="end"/>
                  <YAxis tick={{fontSize:9,...FS}} tickFormatter={v=>v>0?"$"+v+"M":0}/>
                  <Tooltip contentStyle={{...FS,fontSize:11,borderRadius:8,border:`1px solid ${C.border}`}} formatter={(v,name)=>{if(v===null||v===undefined)return[null,name];if(name==="Disbursed ceiling")return["$"+v+"M — max spendable",name];return["$"+v+"M",name];}}/>
                  <Line dataKey="Disbursed ceiling" stroke={C.red} strokeWidth={2} dot={false}/>
                  <Line dataKey="Planned spend" stroke={C.green} strokeWidth={2} dot={false} strokeDasharray="6 3"/>
                  <Line dataKey="Actual spend" stroke={C.blue} strokeWidth={2.5} dot={{r:3,fill:C.blue}} connectNulls={false}/>
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ENGAGEMENT
// ═════════════════════════════════════════════════════════════════════════════
function Engagement({donors,touchpoints,setTouchpoints}){
  const[selId,setSelId]=useState(donors[0]?.id);const[showTF,setShowTF]=useState(false);const[editTId,setEditTId]=useState(null);const[tForm,setTForm]=useState({donorId:"",type:"Meeting",date:"",quality:"2",notes:""});const[view,setView]=useState("map");
  const scored=useMemo(()=>donors.map(d=>({...d,eng:scoreEng(d.id,touchpoints),el:engLabel(scoreEng(d.id,touchpoints).overall)})),[donors,touchpoints]);
  const sel=scored.find(d=>d.id===selId)||scored[0];
  const selTps=touchpoints.filter(t=>t.donorId===selId).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const avgScore=Math.round(scored.reduce((s,d)=>s+d.eng.overall,0)/scored.length);
  const atRisk=scored.filter(d=>d.eng.overall<25).length;
  const overdue=scored.filter(d=>(d.eng.daysSinceLast||0)>60).length;
  const barD=[...scored].sort((a,b)=>b.eng.overall-a.eng.overall).map(d=>({name:d.name.length>12?d.name.slice(0,10)+"…":d.name,score:d.eng.overall,color:d.el.bar}));
  const radarD=sel?[{dim:"Recency",val:sel.eng.recency},{dim:"Frequency",val:sel.eng.frequency},{dim:"Quality",val:sel.eng.quality},{dim:"Diversity",val:sel.eng.diversity},{dim:"Responsiveness",val:sel.eng.responsiveness}]:[];
  function openTp(id){const t=id?touchpoints.find(x=>x.id===id):null;setTForm(t?{...t,quality:String(t.quality)}:{donorId:selId,type:"Meeting",date:"",quality:"2",notes:""});setEditTId(id||null);setShowTF(true);}
  function saveTp(){if(!tForm.donorId||!tForm.date)return;const rec={...tForm,id:editTId||String(Date.now()),quality:n(tForm.quality)};if(editTId)setTouchpoints(ts=>ts.map(t=>t.id===editTId?rec:t));else setTouchpoints(ts=>[...ts,rec]);setShowTF(false);setEditTId(null);}
  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        <Mc label="Donors tracked" val={donors.length} sub="In relationship portfolio"/>
        <Mc label="Portfolio health" val={avgScore+"/100"} sub="Average engagement score" col={avgScore>=60?C.green:avgScore>=35?C.amber:C.red}/>
        <Mc label="At risk" val={atRisk} sub="Score below 25" col={atRisk>0?C.red:C.green}/>
        <Mc label="Contact overdue" val={overdue} sub="No contact in 60+ days" col={overdue>0?C.amber:C.green}/>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center"}}>
        {[["map","Engagement map"],["timeline","Touchpoint timeline"]].map(([v,l])=>(
          <button key={v} onClick={()=>setView(v)} style={{...FS,background:view===v?C.green:"transparent",color:view===v?"#fff":C.muted,border:`1px solid ${view===v?C.green:C.border}`,padding:"7px 16px",borderRadius:8,fontSize:12,cursor:"pointer",fontWeight:view===v?600:400}}>{l}</button>
        ))}
        <button onClick={()=>openTp(null)} style={{...btn("add"),marginLeft:"auto"}}>+ Log touchpoint</button>
      </div>
      {showTF&&(
        <Card style={{marginBottom:14}}>
          <CardHead title={editTId?"Edit touchpoint":"Log touchpoint"}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,padding:"14px 16px 0"}}>
            <FR><L>Donor</L><select value={tForm.donorId||""} onChange={e=>setTForm(p=>({...p,donorId:e.target.value}))} style={inp}><option value="">Select…</option>{donors.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></FR>
            <FR><L>Type</L><select value={tForm.type||"Meeting"} onChange={e=>setTForm(p=>({...p,type:e.target.value}))} style={inp}>{TP_TYPES.map(t=><option key={t}>{t}</option>)}</select></FR>
            <FR><L>Date</L><input type="date" value={tForm.date||""} onChange={e=>setTForm(p=>({...p,date:e.target.value}))} style={inp}/></FR>
            <FR><L>Quality</L><select value={tForm.quality||"2"} onChange={e=>setTForm(p=>({...p,quality:e.target.value}))} style={inp}><option value="1">1 — Routine</option><option value="2">2 — Substantive</option><option value="3">3 — Strategic</option></select></FR>
            <FR full><L>Notes</L><input value={tForm.notes||""} onChange={e=>setTForm(p=>({...p,notes:e.target.value}))} style={inp} placeholder="What was discussed or agreed?"/></FR>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"12px 16px"}}>
            <button onClick={()=>setShowTF(false)} style={btn("ghost")}>Cancel</button>
            <button onClick={saveTp} style={btn("save")}>Save</button>
          </div>
        </Card>
      )}
      {view==="map"&&(
        <>
          <Card style={{padding:"14px 16px",marginBottom:14}}>
            <div style={{...FS,fontSize:11,color:C.muted,textTransform:"uppercase",fontWeight:600,letterSpacing:"0.05em",marginBottom:4}}>Engagement score by donor — portfolio view</div>
            <div style={{...FS,fontSize:11,color:C.hint,marginBottom:10}}>Weighted: Recency 30% · Frequency 25% · Quality 25% · Diversity 10% · Responsiveness 10%</div>
            <ResponsiveContainer width="100%" height={165}>
              <BarChart data={barD} margin={{top:4,right:4,bottom:20,left:10}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)"/>
                <XAxis dataKey="name" tick={{fontSize:9,...FS}} angle={-15} textAnchor="end"/>
                <YAxis tick={{fontSize:9,...FS}} domain={[0,100]}/>
                <Tooltip formatter={v=>[v+"/100","Engagement score"]} contentStyle={{...FS,fontSize:11,borderRadius:8,border:`1px solid ${C.border}`}}/>
                <Bar dataKey="score" radius={[4,4,0,0]}>{barD.map((e,i)=><Cell key={i} fill={e.color}/>)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Card>
              <CardHead title="Donor relationships" sub="Lowest engagement first — priority for action"/>
              {scored.sort((a,b)=>a.eng.overall-b.eng.overall).map(d=>{const isA=selId===d.id;return(
                <div key={d.id} onClick={()=>setSelId(d.id)} style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,cursor:"pointer",background:isA?C.greenL:C.card,borderLeft:isA?`3px solid ${C.green}`:"3px solid transparent"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                    <div style={{...FS,fontSize:12.5,fontWeight:600,maxWidth:150,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:C.text}}>{d.name}</div>
                    <div style={{display:"flex",alignItems:"center",gap:7}}>
                      <span style={{...FS,fontSize:14,fontWeight:700,color:d.el.bar}}>{d.eng.overall}</span>
                      <Pill label={d.el.label} bg={d.el.bg} tx={d.el.tx}/>
                    </div>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                    <span style={{...FS,fontSize:11,color:C.muted}}>{d.pipelineStage||"—"}</span>
                    <span style={{...FS,fontSize:11,color:d.eng.daysSinceLast>60?C.red:d.eng.daysSinceLast>30?C.amber:C.muted}}>{d.eng.daysSinceLast!==null?d.eng.daysSinceLast+"d ago":"No contact"}</span>
                  </div>
                  <div style={{height:3,background:C.border,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",borderRadius:2,background:d.el.bar,width:d.eng.overall+"%"}}></div></div>
                </div>
              );})}
            </Card>
            {sel&&(
              <div>
                <div style={{background:C.card,border:`1.5px solid ${sel.el.bar}`,borderRadius:12,padding:"14px 16px",marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                    <div><div style={{...FS,fontSize:14,fontWeight:600,color:C.text}}>{sel.name}</div><div style={{...FS,fontSize:11,color:C.muted,marginTop:2}}>{sel.type} · {sel.relationship}</div></div>
                    <div style={{textAlign:"right"}}><Pill label={sel.el.label} bg={sel.el.bg} tx={sel.el.tx}/><div style={{...F,fontSize:24,fontWeight:700,color:sel.el.bar,marginTop:5}}>{sel.eng.overall}<span style={{fontSize:13,fontWeight:400,color:C.muted}}>/100</span></div></div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,marginBottom:12}}>
                    {radarD.map(d=><div key={d.dim} style={{textAlign:"center",background:"#FAFAF7",borderRadius:8,padding:"8px 4px"}}>
                      <div style={{...FS,fontSize:9,color:C.muted,marginBottom:3}}>{d.dim}</div>
                      <div style={{...FS,fontSize:16,fontWeight:700,color:sel.el.bar}}>{d.val}</div>
                    </div>)}
                  </div>
                  <ResponsiveContainer width="100%" height={155}>
                    <RadarChart data={radarD} margin={{top:10,right:20,bottom:10,left:20}}>
                      <PolarGrid stroke={C.border}/><PolarAngleAxis dataKey="dim" tick={{fontSize:9,fill:C.muted,...FS}}/>
                      <Radar dataKey="val" stroke={sel.el.bar} fill={sel.el.bar} fillOpacity={0.15} strokeWidth={2}/>
                      <Tooltip formatter={v=>[v+"/100"]} contentStyle={{...FS,fontSize:11,borderRadius:8,border:`1px solid ${C.border}`}}/>
                    </RadarChart>
                  </ResponsiveContainer>
                  <div style={{marginTop:10,padding:"10px 14px",background:sel.el.bg,borderRadius:8,...FS,fontSize:11.5,color:sel.el.tx,lineHeight:1.7}}>
                    <strong>Recommended action: </strong>
                    {sel.eng.overall>=75?`Engagement with ${sel.name} is strong. Maintain at least one substantive contact per month and deepen the relationship beyond the primary contact.`:
                     sel.eng.overall>=50?`Engagement with ${sel.name} is active but has room to deepen. Last contact was ${sel.eng.daysSinceLast} days ago — schedule a proactive touchpoint this week.`:
                     sel.eng.overall>=25?`The ${sel.name} relationship is cooling — ${sel.eng.daysSinceLast} days since last contact. Schedule a substantive re-engagement call this week.`:
                     `The ${sel.name} relationship is at serious risk — ${sel.eng.daysSinceLast} days without meaningful contact. An immediate, personalised re-engagement strategy is needed.`}
                  </div>
                </div>
                <Card>
                  <CardHead title="Recent touchpoints" right={<button onClick={()=>openTp(null)} style={btn("add")}>+ Log</button>}/>
                  {selTps.length===0&&<div style={{padding:"1.5rem",textAlign:"center",...FS,color:C.hint,fontSize:12}}>No touchpoints logged for this donor.</div>}
                  {selTps.slice(0,5).map(tp=>(
                    <div key={tp.id} style={{padding:"9px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                          <span style={{...FS,fontSize:11,fontWeight:600,color:C.text}}>{tp.type}</span>
                          <span style={{...FS,fontSize:10,padding:"1px 6px",borderRadius:6,background:QUAL_COLORS[tp.quality]+"22",color:QUAL_COLORS[tp.quality],fontWeight:600}}>{QUAL_LABELS[tp.quality]}</span>
                          <span style={{...FS,fontSize:10.5,color:C.muted}}>{fmtDate(tp.date)}</span>
                        </div>
                        {tp.notes&&<div style={{...FS,fontSize:11,color:C.muted,lineHeight:1.5}}>{tp.notes}</div>}
                      </div>
                      <div style={{display:"flex",gap:4,flexShrink:0}}>
                        <button onClick={()=>openTp(tp.id)} style={btn("edit",{padding:"2px 8px",fontSize:10.5})}>Edit</button>
                        <button onClick={()=>setTouchpoints(ts=>ts.filter(t=>t.id!==tp.id))} style={btn("del",{padding:"2px 8px",fontSize:10.5})}>Del</button>
                      </div>
                    </div>
                  ))}
                </Card>
              </div>
            )}
          </div>
        </>
      )}
      {view==="timeline"&&(
        <Card>
          <CardHead title="All touchpoints — chronological"/>
          {[...touchpoints].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(tp=>{
            const donor=donors.find(d=>d.id===tp.donorId);
            return(
              <div key={tp.id} style={{padding:"10px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",gap:10,alignItems:"flex-start"}}>
                <div style={{width:3,minWidth:3,borderRadius:2,background:QUAL_COLORS[tp.quality],alignSelf:"stretch",margin:"2px 0"}}></div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                    <span style={{...FS,fontSize:12,fontWeight:600,color:C.text}}>{donor?.name||"Unknown"}</span>
                    <span style={{...FS,fontSize:11,fontWeight:600,color:C.text}}>{tp.type}</span>
                    <span style={{...FS,fontSize:10,padding:"1px 6px",borderRadius:6,background:QUAL_COLORS[tp.quality]+"22",color:QUAL_COLORS[tp.quality],fontWeight:600}}>{QUAL_LABELS[tp.quality]}</span>
                  </div>
                  {tp.notes&&<div style={{...FS,fontSize:11.5,color:C.muted,lineHeight:1.5}}>{tp.notes}</div>}
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{...FS,fontSize:11,color:C.muted}}>{fmtDate(tp.date)}</div>
                  <div style={{...FS,fontSize:10.5,color:C.hint}}>{daysFrom(tp.date)}d ago</div>
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ACTIVATION
// ═════════════════════════════════════════════════════════════════════════════
function Activation({tracks,setTracks,pipeline,donors,onNav}){
  const[selId,setSelId]=useState(tracks[0]?.id);const[showTF,setShowTF]=useState(false);const[editTId,setEditTId]=useState(null);const[tForm,setTForm]=useState({});const[showSF,setShowSF]=useState(false);const[editSIdx,setEditSIdx]=useState(null);const[sForm,setSForm]=useState({});const[view,setView]=useState("board");const[fPri,setFPri]=useState("");const[optMs,setOptMs]=useState([]);
  const sel=tracks.find(t=>t.id===selId)||tracks[0];const selStats=sel?trackStats(sel):null;const selRec=sel&&selStats?trackRec(sel,selStats):null;
  const allStats=tracks.map(t=>({...t,stats:trackStats(t)}));
  const blocked=allStats.filter(t=>t.stats.blocked).length;const behind=allStats.filter(t=>t.stats.schedSt==="overdue").length;
  const avgPct=Math.round(allStats.reduce((s,t)=>s+t.stats.pctDone,0)/Math.max(tracks.length,1));const fullyDone=allStats.filter(t=>t.stats.pctDone===100).length;
  const barD=allStats.map(t=>({name:t.donor.length>12?t.donor.slice(0,10)+"…":t.donor,pct:t.stats.pctDone,color:t.stats.blocked?C.red:t.stats.pctDone===100?C.green:t.stats.schedSt==="overdue"?"#E57370":C.blue}));
  const filtered=allStats.filter(t=>!fPri||t.priority===fPri);
  const confirmedNoTrack=pipeline.filter(p=>n(p.prob)>=90&&!tracks.some(t=>t.donor===p.donor&&t.programme===p.name));

  function openTF(id){const t=id?tracks.find(x=>x.id===id):null;const dt=t?t.donorType:"Bilateral";setTForm(t?{donor:t.donor,donorType:t.donorType,programme:t.programme,confirmedDate:t.confirmedDate,owner:t.owner,priority:t.priority}:{donor:"",donorType:"Bilateral",programme:"",confirmedDate:"",owner:"Timothy Richards",priority:"High"});if(t){setOptMs(t.milestones.filter(m=>m.isOptional).map(m=>({id:m.milestoneId,label:m.label,targetDays:m.targetDays,selected:true})));}else{setOptMs((OPTIONAL_MILESTONES[dt]||[]).map(m=>({...m,selected:true})));}setEditTId(id||null);setShowTF(true);}
  function updateOptType(nt){setTForm(p=>({...p,donorType:nt}));setOptMs((OPTIONAL_MILESTONES[nt]||[]).map(m=>({...m,selected:true})));}
  function saveTF(){if(!tForm.donor||!tForm.programme||!tForm.confirmedDate)return;const selOpts=optMs.filter(m=>m.selected&&m.label).map(m=>({milestoneId:m.id,label:m.label,targetDays:n(m.targetDays)||30,type:"optional",status:"Not started",completedDate:null,notes:"",isOptional:true}));const universal=UNIVERSAL_MILESTONES.map(m=>({milestoneId:m.id,label:m.label,targetDays:m.targetDays,type:"universal",status:"Not started",completedDate:null,notes:"",isOptional:false}));if(editTId){setTracks(ts=>ts.map(t=>{if(t.id!==editTId)return t;const eu=t.milestones.filter(m=>!m.isOptional);return{...t,...tForm,milestones:[...eu,...selOpts]};}));}else{const nt={...tForm,id:String(Date.now()),milestones:[...universal,...selOpts]};setTracks(ts=>[...ts,nt]);setSelId(nt.id);}setShowTF(false);setEditTId(null);}
  function delTrack(id){const r=tracks.filter(t=>t.id!==id);setTracks(r);if(selId===id&&r.length)setSelId(r[0].id);}
  function openSF(idx){if(!sel)return;const m=sel.milestones[idx];setSForm({status:m.status,completedDate:m.completedDate||"",notes:m.notes||""});setEditSIdx(idx);setShowSF(true);}
  function saveSF(){setTracks(ts=>ts.map(t=>{if(t.id!==selId)return t;const nm=[...t.milestones];nm[editSIdx]={...nm[editSIdx],...sForm,completedDate:sForm.completedDate||null};return{...t,milestones:nm};}));setShowSF(false);setEditSIdx(null);}
  function pushPipe(po){const donor=donors.find(d=>d.name===po.donor);const dt=donor?.type||"Bilateral";const nt={id:String(Date.now()),donor:po.donor,donorType:dt,programme:po.name,confirmedDate:new Date().toISOString().slice(0,10),owner:"Timothy Richards",priority:"High",milestones:[...UNIVERSAL_MILESTONES.map(m=>({milestoneId:m.id,label:m.label,targetDays:m.targetDays,type:"universal",status:"Not started",completedDate:null,notes:"",isOptional:false})),...(OPTIONAL_MILESTONES[dt]||[]).map(m=>({milestoneId:m.id,label:m.label,targetDays:m.targetDays,type:"optional",status:"Not started",completedDate:null,notes:"",isOptional:true}))]};setTracks(ts=>[...ts,nt]);setSelId(nt.id);}

  return(
    <div>
      {confirmedNoTrack.length>0&&(
        <div style={{padding:"10px 14px",background:C.amberL,border:`1px solid ${C.amber}40`,borderRadius:10,marginBottom:14,...FS,fontSize:12}}>
          <strong style={{color:"#7A5A1A"}}>Confirmed grants without activation tracks: </strong>
          {confirmedNoTrack.map(p=><button key={p.id} onClick={()=>pushPipe(p)} style={{...btn("add",{marginLeft:8,fontSize:11})}}>Start track — {p.donor} →</button>)}
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        <Mc label="Active tracks" val={tracks.length} sub="Activation journeys in progress"/>
        <Mc label="Average progress" val={avgPct+"%"} sub="Across all tracks" col={avgPct>=70?C.green:avgPct>=40?C.amber:C.blue}/>
        <Mc label="Blocked / behind" val={blocked+behind} sub={blocked+" blocked · "+behind+" behind schedule"} col={blocked+behind>0?C.red:C.green}/>
        <Mc label="Fully activated" val={fullyDone} sub="All milestones complete" col={fullyDone>0?C.green:C.muted}/>
      </div>
      <Card style={{padding:"14px 16px",marginBottom:14}}>
        <div style={{...FS,fontSize:11,color:C.muted,textTransform:"uppercase",fontWeight:600,letterSpacing:"0.05em",marginBottom:4}}>Activation progress by donor — % of milestones completed</div>
        <ResponsiveContainer width="100%" height={145}>
          <BarChart data={barD} margin={{top:4,right:4,bottom:20,left:10}}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)"/>
            <XAxis dataKey="name" tick={{fontSize:9,...FS}} angle={-15} textAnchor="end"/>
            <YAxis tick={{fontSize:9,...FS}} tickFormatter={v=>v+"%"} domain={[0,100]}/>
            <Tooltip formatter={v=>[v+"%","Milestones completed"]} contentStyle={{...FS,fontSize:11,borderRadius:8,border:`1px solid ${C.border}`}}/>
            <Bar dataKey="pct" radius={[4,4,0,0]}>{barD.map((e,i)=><Cell key={i} fill={e.color}/>)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",gap:8}}>{[["board","Track detail"],["kanban","Milestone board"]].map(([v,l])=><button key={v} onClick={()=>setView(v)} style={{...FS,background:view===v?C.green:"transparent",color:view===v?"#fff":C.muted,border:`1px solid ${view===v?C.green:C.border}`,padding:"7px 16px",borderRadius:8,fontSize:12,cursor:"pointer",fontWeight:view===v?600:400}}>{l}</button>)}</div>
        <div style={{display:"flex",gap:8}}>
          <select value={fPri} onChange={e=>setFPri(e.target.value)} style={{...inp,width:"auto",fontSize:12}}><option value="">All priorities</option><option>High</option><option>Medium</option><option>Low</option></select>
          <button onClick={()=>openTF(null)} style={btn("add")}>+ Add track</button>
        </div>
      </div>

      {showTF&&(
        <Card style={{marginBottom:14}}>
          <CardHead title={editTId?"Edit track":"New activation track"}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,padding:"14px 16px 0"}}>
            {[{l:"Donor / partner",k:"donor",t:"text"},{l:"Programme name",k:"programme",t:"text"},{l:"Confirmation date",k:"confirmedDate",t:"date"},{l:"Owner",k:"owner",t:"text"}].map(f=>(<FR key={f.k}><L>{f.l}</L><input type={f.t||"text"} value={tForm[f.k]||""} onChange={e=>setTForm(p=>({...p,[f.k]:e.target.value}))} style={inp}/></FR>))}
            <FR><L>Donor type</L><select value={tForm.donorType||"Bilateral"} onChange={e=>updateOptType(e.target.value)} style={inp}>{DONOR_TYPES.map(o=><option key={o}>{o}</option>)}</select></FR>
            <FR><L>Priority</L><select value={tForm.priority||"High"} onChange={e=>setTForm(p=>({...p,priority:e.target.value}))} style={inp}><option>High</option><option>Medium</option><option>Low</option></select></FR>
          </div>
          <div style={{padding:"12px 16px 0"}}>
            <div style={{...FS,fontSize:10.5,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8}}>Universal milestones — applied to all tracks</div>
            {UNIVERSAL_MILESTONES.map(m=><div key={m.id} style={{display:"flex",justifyContent:"space-between",padding:"6px 10px",background:"#FAFAF7",borderRadius:6,marginBottom:4,...FS,fontSize:11.5}}><span style={{color:C.text}}>{m.label}</span><span style={{color:C.muted}}>Target: {m.targetDays} days</span></div>)}
          </div>
          <div style={{padding:"12px 16px 0"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{...FS,fontSize:10.5,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:"0.05em"}}>{tForm.donorType||"Bilateral"} milestones — editable</div>
              <button onClick={()=>setOptMs(ms=>[...ms,{id:"c_"+Date.now(),label:"",targetDays:30,selected:true,custom:true}])} style={btn("add",{fontSize:11})}>+ Custom</button>
            </div>
            {optMs.length===0&&<div style={{...FS,fontSize:11.5,color:C.muted,padding:"8px 10px",background:"#FAFAF7",borderRadius:6}}>No milestones. Add custom ones above.</div>}
            {optMs.map((m,i)=>(
              <div key={m.id} style={{display:"grid",gridTemplateColumns:"auto 1fr auto auto",gap:8,alignItems:"center",padding:"6px 10px",background:m.selected?C.greenL:C.card,borderRadius:8,marginBottom:6,border:`1px solid ${m.selected?"#9FD4B4":C.border}`}}>
                <input type="checkbox" checked={m.selected} onChange={e=>setOptMs(ms=>ms.map((x,j)=>j===i?{...x,selected:e.target.checked}:x))} style={{width:"auto",margin:0,cursor:"pointer"}}/>
                <input value={m.label} onChange={e=>setOptMs(ms=>ms.map((x,j)=>j===i?{...x,label:e.target.value}:x))} style={{...inp,fontSize:12,padding:"4px 8px"}} placeholder="Milestone name"/>
                <div style={{display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}>
                  <span style={{...FS,fontSize:11,color:C.muted}}>Target:</span>
                  <input type="number" min="1" value={m.targetDays} onChange={e=>setOptMs(ms=>ms.map((x,j)=>j===i?{...x,targetDays:n(e.target.value)}:x))} style={{...inp,width:60,fontSize:12,padding:"4px 8px"}}/>
                  <span style={{...FS,fontSize:11,color:C.muted}}>days</span>
                </div>
                <button onClick={()=>setOptMs(ms=>ms.filter((_,j)=>j!==i))} style={btn("del",{padding:"3px 8px",fontSize:11})}>✕</button>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"12px 16px"}}>
            <button onClick={()=>setShowTF(false)} style={btn("ghost")}>Cancel</button>
            <button onClick={saveTF} style={btn("save")}>Save track</button>
          </div>
        </Card>
      )}

      {showSF&&editSIdx!==null&&sel&&(
        <Card style={{marginBottom:14}}>
          <CardHead title={`Update milestone — ${sel.milestones[editSIdx]?.label}`}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,padding:"14px 16px 0"}}>
            <FR><L>Status</L><select value={sForm.status||"Not started"} onChange={e=>setSForm(p=>({...p,status:e.target.value}))} style={inp}>{MS_STATUS.map(s=><option key={s}>{s}</option>)}</select></FR>
            <FR><L>Completion date</L><input type="date" value={sForm.completedDate||""} onChange={e=>setSForm(p=>({...p,completedDate:e.target.value}))} style={inp}/></FR>
            <FR full><L>Notes / blocker details</L><input value={sForm.notes||""} onChange={e=>setSForm(p=>({...p,notes:e.target.value}))} style={inp} placeholder="What happened? What is the next step?"/></FR>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"12px 16px"}}>
            <button onClick={()=>setShowSF(false)} style={btn("ghost")}>Cancel</button>
            <button onClick={saveSF} style={btn("save")}>Save milestone</button>
          </div>
        </Card>
      )}

      {view==="board"&&(
        <div style={{display:"grid",gridTemplateColumns:"250px 1fr",gap:12}}>
          <Card>
            <CardHead title="Active tracks"/>
            {filtered.map(t=>{const isA=selId===t.id;const ps={High:{bg:C.redL,tx:C.red},Medium:{bg:C.amberL,tx:C.amber},Low:{bg:"#F3F4F6",tx:C.muted}}[t.priority];
              return(<div key={t.id} onClick={()=>setSelId(t.id)} style={{padding:"11px 14px",borderBottom:`1px solid ${C.border}`,cursor:"pointer",background:isA?C.greenL:C.card,borderLeft:isA?`3px solid ${C.green}`:"3px solid transparent"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}><div style={{...FS,fontSize:12,fontWeight:600,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:C.text}}>{t.donor}</div><Pill label={t.priority} bg={ps.bg} tx={ps.tx}/></div>
                <div style={{...FS,fontSize:11,color:C.muted,marginBottom:6,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.programme}</div>
                <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{flex:1,height:4,background:C.border,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",background:t.stats.blocked?C.red:t.stats.pctDone===100?C.green:C.blue,width:t.stats.pctDone+"%",borderRadius:2}}></div></div><span style={{...FS,fontSize:11,fontWeight:600,color:C.muted,minWidth:28}}>{t.stats.pctDone}%</span></div>
                {t.stats.blocked&&<div style={{...FS,fontSize:10,color:C.red,marginTop:4,fontWeight:600}}>⚠ Blocked</div>}
              </div>);
            })}
          </Card>
          {sel&&selStats&&selRec&&(
            <div>
              <div style={{background:C.card,border:`1.5px solid ${selRec.color}`,borderRadius:12,padding:"14px 16px",marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div><div style={{...FS,fontSize:15,fontWeight:600,color:C.text}}>{sel.donor}</div><div style={{...FS,fontSize:12,color:C.muted,marginTop:2}}>{sel.programme} · {sel.donorType}</div><div style={{...FS,fontSize:11,color:C.hint,marginTop:1}}>Confirmed {fmtDate(sel.confirmedDate)} · {selStats.daysActive} days active · {sel.owner}</div></div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5}}><Pill label={selRec.level} bg={selRec.bg} tx={selRec.tx}/><div style={{...F,fontSize:24,fontWeight:700,color:selRec.color}}>{selStats.pctDone}<span style={{fontSize:13,fontWeight:400,color:C.muted}}>%</span></div><div style={{display:"flex",gap:6}}><button onClick={()=>openTF(selId)} style={btn("edit")}>Edit</button><button onClick={()=>delTrack(selId)} style={btn("del")}>Delete</button></div></div>
                </div>
                <div style={{height:8,background:C.border,borderRadius:4,overflow:"hidden",marginBottom:10}}><div style={{height:"100%",background:selRec.color,width:selStats.pctDone+"%",borderRadius:4}}></div></div>
                <div style={{padding:"10px 14px",background:selRec.bg,borderRadius:8,...FS,fontSize:11.5,color:selRec.tx,lineHeight:1.7}}><strong>Status: </strong>{selRec.text}</div>
              </div>
              <Card style={{marginBottom:10}}>
                <CardHead title="Universal milestones" sub="Applied to all grants regardless of donor type"/>
                {sel.milestones.filter(m=>!m.isOptional).map(m=>{
                  const ri=sel.milestones.indexOf(m);const sst=SS[m.status];const isAct=m.status==="In progress"||m.status==="Blocked";
                  const prev=sel.milestones.slice(0,ri).filter(x=>x.status==="Completed");const sd=prev.length>0?prev[prev.length-1].completedDate:sel.confirmedDate;
                  const dIn=sd?daysFrom(sd):null;const over=dIn!==null?dIn-m.targetDays:null;
                  const sn=isAct&&dIn!==null?over>0?{text:`${over}d beyond ${m.targetDays}d target`,col:C.red}:dIn>m.targetDays*0.75?{text:`${dIn}d of ${m.targetDays}d target`,col:C.amber}:{text:`${dIn}d of ${m.targetDays}d target`,col:C.green}:null;
                  return(<div key={m.milestoneId} style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,background:isAct?"#FAFAF7":C.card,borderLeft:isAct?`3px solid ${sst.dot}`:"3px solid transparent"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3,flexWrap:"wrap"}}><span style={{width:7,height:7,borderRadius:"50%",background:sst.dot,display:"inline-block",flexShrink:0}}></span><span style={{...FS,fontSize:12,fontWeight:600,color:C.text}}>{m.label}</span><Pill label={m.status} bg={sst.bg} tx={sst.tx}/>{m.completedDate&&<span style={{...FS,fontSize:10.5,color:C.muted}}>{fmtDate(m.completedDate)}</span>}{sn&&<span style={{...FS,fontSize:10,fontWeight:600,color:sn.col}}>{sn.text}</span>}</div>
                        <div style={{...FS,fontSize:10.5,color:C.hint,marginLeft:14}}>Target: {m.targetDays} days</div>
                        {m.notes&&<div style={{...FS,fontSize:11.5,color:C.muted,marginLeft:14,lineHeight:1.5,marginTop:2}}>{m.notes}</div>}
                      </div>
                      <button onClick={()=>openSF(ri)} style={btn("edit",{whiteSpace:"nowrap",marginLeft:10})}>Update</button>
                    </div>
                  </div>);
                })}
              </Card>
              {sel.milestones.filter(m=>m.isOptional).length>0&&(
                <Card>
                  <CardHead title={`${sel.donorType} milestones`} sub="Customisable per donor type"/>
                  {sel.milestones.filter(m=>m.isOptional).map(m=>{
                    const ri=sel.milestones.indexOf(m);const sst=SS[m.status];const isAct=m.status==="In progress"||m.status==="Blocked";
                    return(<div key={m.milestoneId} style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,background:isAct?"#FAFAF7":C.card,borderLeft:isAct?`3px solid ${sst.dot}`:"3px solid transparent"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                        <div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3,flexWrap:"wrap"}}><span style={{width:7,height:7,borderRadius:"50%",background:sst.dot,display:"inline-block",flexShrink:0}}></span><span style={{...FS,fontSize:12,fontWeight:600,color:C.text}}>{m.label}</span><Pill label={m.status} bg={sst.bg} tx={sst.tx}/>{m.completedDate&&<span style={{...FS,fontSize:10.5,color:C.muted}}>{fmtDate(m.completedDate)}</span>}</div><div style={{...FS,fontSize:10.5,color:C.hint,marginLeft:14}}>Target: {m.targetDays} days</div>{m.notes&&<div style={{...FS,fontSize:11.5,color:C.muted,marginLeft:14,lineHeight:1.5,marginTop:2}}>{m.notes}</div>}</div>
                        <button onClick={()=>openSF(ri)} style={btn("edit",{whiteSpace:"nowrap",marginLeft:10})}>Update</button>
                      </div>
                    </div>);
                  })}
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {view==="kanban"&&(
        <div style={{overflowX:"auto"}}>
          <div style={{display:"grid",gridTemplateColumns:`repeat(${UNIVERSAL_MILESTONES.length},minmax(140px,1fr))`,gap:8,minWidth:980}}>
            {UNIVERSAL_MILESTONES.map((md,mIdx)=>{
              const colItems=filtered.map(t=>({t,m:t.milestones.filter(x=>!x.isOptional)[mIdx]}));
              const done=colItems.filter(x=>x.m?.status==="Completed").length;
              return(<div key={md.id}>
                <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"10px 10px 0 0",padding:"9px 10px",borderBottom:`2px solid ${C.green}`,marginBottom:6}}>
                  <div style={{...FS,fontSize:10.5,fontWeight:700,color:C.green,marginBottom:2}}>{md.label}</div>
                  <div style={{...FS,fontSize:9.5,color:C.muted}}>Target: {md.targetDays}d · {done}/{colItems.length}</div>
                </div>
                {colItems.map(({t,m})=>{if(!m)return null;const sst=SS[m.status];return(<div key={t.id} onClick={()=>{setSelId(t.id);setView("board");}} style={{background:C.card,border:`0.5px solid ${sst.dot}40`,borderLeft:`3px solid ${sst.dot}`,borderRadius:8,padding:"9px 10px",marginBottom:6,cursor:"pointer"}}>
                  <div style={{...FS,fontSize:11,fontWeight:600,marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:C.text}}>{t.donor}</div>
                  <Pill label={m.status} bg={sst.bg} tx={sst.tx}/>
                  {m.completedDate&&<div style={{...FS,fontSize:9.5,color:C.muted,marginTop:3}}>{fmtDate(m.completedDate)}</div>}
                </div>);})}
              </div>);
            })}
          </div>
        </div>
      )}
    </div>
  );
}
