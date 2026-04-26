import { useState, useMemo, useCallback, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg:"#F4F1EB", card:"#FFFFFF", primary:"#0F4C35", accent:"#C8973A",
  text:"#1A1916", muted:"#6B6860", hint:"#B0AA9E", border:"#E2DDCE",
  green:"#0F4C35", greenL:"#E8F2ED", greenT:"#0A3324",
  red:"#C0392B", redL:"#FCEBEB", amber:"#C8973A", amberL:"#FDF3E3",
  blue:"#1B5E9B", blueL:"#EAF2FB", purple:"#5B3FA6", purpleL:"#F0EDFB",
};
const F  = { fontFamily:"'Georgia','Times New Roman',serif" };
const FS = { fontFamily:"'Helvetica Neue','Arial',sans-serif" };

// ─────────────────────────────────────────────────────────────────────────────
// TAG LIBRARY DEFAULTS — fully editable per organisation in Settings
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_THEMES = [
  "Urban Development","Climate & Environment","Housing & Land",
  "Water & Sanitation","Governance","Gender & Inclusion",
  "Resilience & DRR","Blended Finance","Education","Health",
  "Agroecology","Human Rights","Peacebuilding","Private Sector Dev","Other",
];
const DEFAULT_INSTRUMENTS = [
  "Grants","Co-financing","Blended Finance","Trust Funds",
  "Technical Assistance","Results-Based Financing",
  "Loans","Guarantees","Equity Investment","CSR Funding","Other",
];

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const TODAY      = new Date();
const DONOR_TYPES  = ["Bilateral","Multilateral","Foundation","DFI","Trust Fund","Private Sector"];
// PARTNERSHIP STATUS — describes the nature / depth of the formal relationship (Donor Map)
const RELATIONSHIPS = ["None","Cold","Warm","Active","Strategic"];
const REL_SCORE     = {None:0,Cold:8,Warm:18,Active:25,Strategic:30};
const PIPE_STAGES   = ["Prospect","Engaged","Concept Note Submitted","Under Negotiation","Confirmed"];
const TP_TYPES      = ["Meeting","Call","Email","Report submitted","Event","Site visit","Proposal submitted","Informal contact"];
const QUAL_LABELS   = {1:"Routine",2:"Substantive",3:"Strategic"};
const QUAL_COLORS   = {1:C.hint,2:C.blue,3:C.green};
const MS_STATUS     = ["Not started","In progress","Completed","Blocked"];

// ─────────────────────────────────────────────────────────────────────────────
// PARTNERSHIP STATUS colours (Donor Map)
// ─────────────────────────────────────────────────────────────────────────────
const RC = {
  None:     {bg:"#F3F4F6",tx:"#6B7280"},
  Cold:     {bg:C.blueL,  tx:"#1B5E9B"},
  Warm:     {bg:C.amberL, tx:"#7A5A1A"},
  Active:   {bg:C.greenL, tx:C.greenT},
  Strategic:{bg:C.purpleL,tx:"#3D2880"},
};

// ─────────────────────────────────────────────────────────────────────────────
// ENGAGEMENT HEALTH labels (Engagement tab — touchpoint quality and recency)
// Deliberately different vocabulary from Partnership Status to avoid confusion
// Dormant / Fading / Consistent / Thriving — NOT None/Cold/Warm/Active/Strategic
// ─────────────────────────────────────────────────────────────────────────────
const engLabel = s => {
  if(s>=75) return {label:"Thriving",   bg:C.greenL, tx:C.greenT,  bar:C.green};
  if(s>=50) return {label:"Consistent", bg:C.blueL,  tx:"#1B4F8A", bar:C.blue};
  if(s>=25) return {label:"Fading",     bg:C.amberL, tx:"#7A5A1A", bar:C.amber};
  return           {label:"Dormant",    bg:C.redL,   tx:"#9B2B24", bar:C.red};
};

const TC = {
  Bilateral:      {bg:"#EAF2FB",tx:"#1B5E9B"},
  Multilateral:   {bg:"#E6F7F1",tx:"#084D37"},
  Foundation:     {bg:C.amberL, tx:"#7A5A1A"},
  DFI:            {bg:C.purpleL,tx:"#3D2880"},
  "Trust Fund":   {bg:C.greenL, tx:C.greenT},
  "Private Sector":{bg:"#F3F4F6",tx:"#374151"},
};

const ST = {
  "Prospect":               {p:10,c:"#9CA3AF",bg:"#F9FAFB",tx:"#374151"},
  "Engaged":                {p:25,c:C.blue,   bg:C.blueL,  tx:"#1B4F8A"},
  "Concept Note Submitted": {p:40,c:C.amber,  bg:C.amberL, tx:"#7A5A1A"},
  "Under Negotiation":      {p:65,c:"#0E7C5A",bg:"#E6F7F1",tx:"#084D37"},
  "Confirmed":              {p:90,c:C.green,  bg:C.greenL, tx:C.greenT},
};

const SS = {
  "Completed":  {bg:C.greenL, tx:C.greenT,  dot:C.green},
  "In progress":{bg:C.blueL,  tx:"#1B4F8A", dot:C.blue},
  "Blocked":    {bg:C.redL,   tx:"#7B1C14", dot:C.red},
  "Not started":{bg:"#F3F4F6",tx:C.muted,   dot:C.hint},
};

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT SCORING WEIGHTS — all editable by the user in Settings
// Includes relationship status point values (ascending order enforced)
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_WEIGHTS = {
  probWeight:0.8, gapWeight:0.7, relWeight:0.6, urgWeight:0.9,
  themeWeight:35, grantWeight:20, instrWeight:15,
  relNone:0, relCold:8, relWarm:18, relActive:25, relStrategic:30,
};

// ─────────────────────────────────────────────────────────────────────────────
// FIELD CONFIGURATION — default visibility and mandatory settings per entity
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_FIELD_CONFIG = {
  donors:[
    {id:"relationship",label:"Partnership status",visible:true,mandatory:false,system:false},
    {id:"grantMin",label:"Grant minimum (USD)",visible:true,mandatory:false,system:false},
    {id:"grantMax",label:"Grant maximum (USD)",visible:true,mandatory:false,system:false},
    {id:"cycle",label:"Next funding cycle",visible:true,mandatory:false,system:false},
    {id:"geo",label:"Geography",visible:true,mandatory:false,system:false},
    {id:"themes",label:"Thematic priorities",visible:true,mandatory:false,system:false},
    {id:"instruments",label:"Funding instruments",visible:true,mandatory:false,system:false},
    {id:"contacts",label:"Key contacts",visible:true,mandatory:false,system:false},
    {id:"notes",label:"Intelligence notes",visible:true,mandatory:false,system:false},
  ],
  pipeline:[
    {id:"prob",label:"Probability %",visible:true,mandatory:false,system:false},
    {id:"date",label:"Expected close",visible:true,mandatory:false,system:false},
    {id:"programmeId",label:"Linked programme",visible:true,mandatory:false,system:false},
    {id:"themes",label:"Thematic areas",visible:true,mandatory:false,system:false},
    {id:"notes",label:"Notes",visible:true,mandatory:false,system:false},
  ],
  budgets:[
    {id:"themes",label:"Thematic areas",visible:true,mandatory:false,system:false},
    {id:"period",label:"Period",visible:true,mandatory:false,system:false},
    {id:"notes",label:"Notes",visible:true,mandatory:false,system:false},
  ],
  grants:[
    {id:"disbursed",label:"Disbursed (USD)",visible:true,mandatory:false,system:false},
    {id:"spent",label:"Spent (USD)",visible:true,mandatory:false,system:false},
    {id:"monthlyBudget",label:"Monthly budget (USD)",visible:true,mandatory:false,system:false},
    {id:"startDate",label:"Start date",visible:true,mandatory:false,system:false},
    {id:"endDate",label:"End date",visible:true,mandatory:false,system:false},
    {id:"reportingDeadline",label:"Reporting deadline",visible:true,mandatory:false,system:false},
    {id:"notes",label:"Notes",visible:true,mandatory:false,system:false},
  ],
  touchpoints:[
    {id:"quality",label:"Quality rating",visible:true,mandatory:false,system:false},
    {id:"notes",label:"Notes",visible:true,mandatory:false,system:false},
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVATION MILESTONE TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────
const UNIVERSAL_MILESTONES = [
  {id:"m1",label:"Agreement / legal instrument signed",targetDays:14},
  {id:"m2",label:"First disbursement received",targetDays:30},
  {id:"m3",label:"Programme inception meeting held",targetDays:21},
  {id:"m4",label:"Reporting framework established",targetDays:30},
  {id:"m5",label:"First progress report submitted",targetDays:90},
  {id:"m6",label:"Grant closure and final report",targetDays:30},
];
const OPTIONAL_MILESTONES = {
  Bilateral:      [{id:"o1",label:"Baseline assessment completed",targetDays:60},{id:"o2",label:"Mid-term review conducted",targetDays:180}],
  Multilateral:   [{id:"o3",label:"Project Implementation Review (PIR)",targetDays:180},{id:"o4",label:"Steering committee convened",targetDays:90}],
  Foundation:     [{id:"o5",label:"Site visit / programme immersion",targetDays:120},{id:"o6",label:"Learning review completed",targetDays:180}],
  DFI:            [{id:"o7",label:"Financial audit completed",targetDays:180},{id:"o8",label:"Investment committee update",targetDays:90}],
  "Trust Fund":   [{id:"o9",label:"Managing agent report submitted",targetDays:90}],
  "Private Sector":[{id:"o10",label:"Partnership review meeting",targetDays:90}],
};

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT DATA — fictional INGO "Meridian Africa"
// ─────────────────────────────────────────────────────────────────────────────
const DEF = {
donors:[
  {id:"d1",name:"UK FCDO",type:"Bilateral",relationship:"Active",grantMin:1000000,grantMax:10000000,
   themes:["Urban Development","Climate & Environment","Governance","Resilience & DRR"],
   instruments:["Grants","Co-financing"],
   geo:"East Africa, South Asia",cycle:"2026-09",
   contacts:[{id:"c1",name:"Sarah Mitchell",title:"Senior Programme Manager",email:"s.mitchell@fcdo.gov.uk",prevOrgs:"DFID, ODI",notes:"Championed the last renewal. Key internal advocate."}],
   notes:"Strategic partner since 2019. New urban resilience window opens Q3 2026."},
  {id:"d2",name:"European Commission",type:"Multilateral",relationship:"Active",grantMin:2000000,grantMax:20000000,
   themes:["Urban Development","Water & Sanitation","Governance","Climate & Environment","Gender & Inclusion"],
   instruments:["Grants","Co-financing","Blended Finance"],
   geo:"ACP Countries, East Africa",cycle:"2027-01",
   contacts:[{id:"c2",name:"Marco Ferretti",title:"Urban Unit, DG INTPA",email:"marco.ferretti@ec.europa.eu",prevOrgs:"World Bank Urban",notes:"Joined DG INTPA late 2025. Positive at Brussels pre-consultation."}],
   notes:"WASH call deadline approaching. Horizon NbS call expected Jan 2027."},
  {id:"d3",name:"Sida",type:"Bilateral",relationship:"Warm",grantMin:500000,grantMax:5000000,
   themes:["Climate & Environment","Gender & Inclusion","Governance","Urban Development"],
   instruments:["Grants"],
   geo:"East Africa, Global",cycle:"2026-11",
   contacts:[{id:"c3",name:"Anna Lindqvist",title:"Urban Adviser",email:"anna.lindqvist@sida.se",prevOrgs:"UN Women",notes:"Very responsive. Currently on secondment."}],
   notes:"Strong gender lens. Climate-housing nexus of increasing interest."},
  {id:"d4",name:"USAID",type:"Bilateral",relationship:"Active",grantMin:500000,grantMax:10000000,
   themes:["Water & Sanitation","Governance","Urban Development","Gender & Inclusion"],
   instruments:["Grants","Technical Assistance"],
   geo:"Kenya, Ethiopia, Uganda",cycle:"2027-03",
   contacts:[{id:"c4",name:"James Okonkwo",title:"Urban & WASH Programme",email:"jokonkwo@usaid.gov",prevOrgs:"DAI",notes:"Positive about our WASH approach."}],
   notes:"CDCS alignment critical. EOI to be submitted Q3 2026."},
  {id:"d5",name:"Bill & Melinda Gates Foundation",type:"Foundation",relationship:"Warm",grantMin:500000,grantMax:5000000,
   themes:["Gender & Inclusion","Urban Development","Water & Sanitation"],
   instruments:["Grants"],
   geo:"Sub-Saharan Africa, South Asia",cycle:"2026-08",
   contacts:[{id:"c5",name:"Dr Priya Nair",title:"Urban Equity Lead",email:"pnair@gatesfoundation.org",prevOrgs:"Rockefeller Foundation",notes:"Visited Nairobi site March 2025. Positive."}],
   notes:"Focus on equity and data. Co-investment models preferred."},
  {id:"d6",name:"GEF",type:"Multilateral",relationship:"Cold",grantMin:2000000,grantMax:15000000,
   themes:["Climate & Environment","Blended Finance","Resilience & DRR"],
   instruments:["Grants","Blended Finance","Trust Funds"],
   geo:"Global",cycle:"2026-10",
   contacts:[{id:"c6",name:"Ersin Esen",title:"GEF Secretariat",email:"e.esen@thegef.org",prevOrgs:"UNEP",notes:"Last email unanswered. 73 days since last contact."}],
   notes:"Relationship at serious risk. CEO endorsement pending on current facility."},
  {id:"d7",name:"Norad",type:"Bilateral",relationship:"Warm",grantMin:500000,grantMax:3000000,
   themes:["Governance","Gender & Inclusion","Climate & Environment","Urban Development"],
   instruments:["Grants","Technical Assistance"],
   geo:"East Africa",cycle:"2027-02",
   contacts:[{id:"c7",name:"Bjorn Haugen",title:"Urban Governance",email:"bjorn.haugen@norad.no",prevOrgs:"Norwegian MFA",notes:"Engaged. Last meeting productive."}],
   notes:"Open to long-term institutional support."},
  {id:"d8",name:"Rockefeller Foundation",type:"Foundation",relationship:"Cold",grantMin:1000000,grantMax:5000000,
   themes:["Urban Development","Resilience & DRR"],
   instruments:["Grants"],
   geo:"Global, East Africa focus",cycle:"2026-11",
   contacts:[{id:"c8",name:"TBD",title:"Internal champion needed",email:"",prevOrgs:"",notes:"Concept note submitted Oct 2025. No response in 145 days."}],
   notes:"100RC successor programmes active. No response to concept note in 145 days."},
  {id:"d9",name:"UN Women",type:"Multilateral",relationship:"Active",grantMin:300000,grantMax:2000000,
   themes:["Gender & Inclusion","Governance","Urban Development"],
   instruments:["Grants","Technical Assistance"],
   geo:"East Africa",cycle:"2026-07",
   contacts:[{id:"c9",name:"Amina Hassan",title:"East Africa Hub",email:"a.hassan@unwomen.org",prevOrgs:"UNFPA",notes:"Strong internal champion. Joint programme being explored."}],
   notes:"Strong alignment on gender-responsive urban planning."},
  {id:"d10",name:"African Development Bank",type:"DFI",relationship:"Cold",grantMin:5000000,grantMax:50000000,
   themes:["Blended Finance","Urban Development","Climate & Environment"],
   instruments:["Co-financing","Blended Finance","Guarantees"],
   geo:"Pan-Africa",cycle:"2027-06",
   contacts:[{id:"c10",name:"Dr Kofi Mensah",title:"Urban Development Dept",email:"k.mensah@afdb.org",prevOrgs:"World Bank",notes:"LinkedIn connection Jan 2026. No formal meeting yet."}],
   notes:"Significant blended finance opportunity. Cold relationship."},
],
pipeline:[
  {id:"p1",name:"FCDO Urban Resilience Fund 2026",donor:"UK FCDO",amount:3000000,stage:"Confirmed",prob:90,date:"2026-06",themes:["Urban Development","Climate & Environment"],programmeId:"b1",notes:"Agreement in final legal review."},
  {id:"p2",name:"EU Urban WASH Programme",donor:"European Commission",amount:4000000,stage:"Concept Note Submitted",prob:40,date:"2026-12",themes:["Water & Sanitation","Urban Development"],programmeId:"b3",notes:"Submitted March 15. Response expected May 2026."},
  {id:"p3",name:"Sida Climate & Housing Grant",donor:"Sida",amount:2000000,stage:"Under Negotiation",prob:65,date:"2026-09",themes:["Climate & Environment","Housing & Land"],programmeId:"b2",notes:"Budget negotiation ongoing."},
  {id:"p4",name:"Gates Gender & Inclusive Cities",donor:"Bill & Melinda Gates Foundation",amount:2000000,stage:"Confirmed",prob:90,date:"2026-07",themes:["Gender & Inclusion","Urban Development"],programmeId:"b5",notes:"Grant letter received Feb 2026."},
  {id:"p5",name:"GEF Blended Finance Facility",donor:"GEF",amount:5000000,stage:"Under Negotiation",prob:65,date:"2026-10",themes:["Blended Finance","Climate & Environment"],programmeId:"b6",notes:"CEO endorsement pending. Relationship cold."},
  {id:"p6",name:"Norad Urban Governance Support",donor:"Norad",amount:1000000,stage:"Engaged",prob:25,date:"2027-02",themes:["Governance"],programmeId:"b4",notes:"Concept note agreed in principle."},
  {id:"p7",name:"Rockefeller Urban Resilience Grant",donor:"Rockefeller Foundation",amount:1500000,stage:"Concept Note Submitted",prob:40,date:"2026-11",themes:["Urban Development","Resilience & DRR"],programmeId:"b1",notes:"No response in 145 days."},
  {id:"p8",name:"USAID WASH for Cities",donor:"USAID",amount:1000000,stage:"Prospect",prob:10,date:"2027-06",themes:["Water & Sanitation","Governance"],programmeId:"b3",notes:"EOI to be submitted Q3 2026."},
],
budgets:[
  {id:"b1",programme:"Urban Resilience Programme",themes:["Urban Development","Climate & Environment"],required:8000000,period:"2026",notes:"Multi-city climate adaptation: Nairobi, Kampala, Dar es Salaam"},
  {id:"b2",programme:"Climate & Housing Initiative",themes:["Climate & Environment","Housing & Land"],required:5000000,period:"2026",notes:"Green affordable housing; climate-resilient construction"},
  {id:"b3",programme:"WASH for Growing Cities",themes:["Water & Sanitation","Urban Development"],required:3500000,period:"2026",notes:"Urban WASH infrastructure in informal settlements"},
  {id:"b4",programme:"Urban Governance Reform",themes:["Governance"],required:2500000,period:"2026",notes:"Municipal capacity building; participatory planning"},
  {id:"b5",programme:"Gender & Inclusive Cities",themes:["Gender & Inclusion","Urban Development"],required:2000000,period:"2026",notes:"Women-led urban planning; gender-responsive budgeting"},
  {id:"b6",programme:"Blended Finance Facility",themes:["Blended Finance","Climate & Environment"],required:10000000,period:"2026",notes:"De-risk private investment in urban infrastructure"},
],
grants:[
  {id:"g1",programme:"Urban Resilience Programme",donor:"UK FCDO",themes:["Urban Development"],totalAmount:3000000,disbursed:3000000,spent:1850000,startDate:"2026-01",endDate:"2026-12",reportingDeadline:"2026-05-15",monthlyBudget:250000,notes:"Q1 report drafted. Deadline in 16 days."},
  {id:"g2",programme:"Gender & Inclusive Cities",donor:"Bill & Melinda Gates Foundation",themes:["Gender & Inclusion"],totalAmount:2000000,disbursed:1000000,spent:380000,startDate:"2026-02",endDate:"2027-01",reportingDeadline:"2026-07-31",monthlyBudget:166667,notes:"First tranche received."},
  {id:"g3",programme:"Climate & Housing Initiative",donor:"Sida",themes:["Climate & Environment"],totalAmount:2000000,disbursed:800000,spent:720000,startDate:"2026-01",endDate:"2026-12",reportingDeadline:"2026-05-31",monthlyBudget:166667,notes:"High absorption rate."},
  {id:"g4",programme:"WASH for Growing Cities",donor:"European Commission",themes:["Water & Sanitation"],totalAmount:1500000,disbursed:500000,spent:95000,startDate:"2026-03",endDate:"2027-02",reportingDeadline:"2026-09-30",monthlyBudget:125000,notes:"Low absorption. Procurement delays flagged."},
  {id:"g5",programme:"Blended Finance Facility",donor:"GEF",themes:["Blended Finance"],totalAmount:5000000,disbursed:2500000,spent:2300000,startDate:"2025-10",endDate:"2027-09",reportingDeadline:"2026-06-30",monthlyBudget:208333,notes:"On track."},
  {id:"g6",programme:"Urban Governance Reform",donor:"Norad",themes:["Governance"],totalAmount:1000000,disbursed:1000000,spent:210000,startDate:"2026-02",endDate:"2027-01",reportingDeadline:"2026-08-31",monthlyBudget:83333,notes:"Full amount disbursed upfront. Underspend risk."},
],
touchpoints:[
  {id:"tp1",donorId:"d1",type:"Meeting",date:"2026-04-10",quality:3,notes:"Quarterly review. Strong alignment confirmed."},
  {id:"tp2",donorId:"d1",type:"Report submitted",date:"2026-03-31",quality:2,notes:"Q1 progress report submitted on time."},
  {id:"tp3",donorId:"d1",type:"Email",date:"2026-03-15",quality:2,notes:"Shared updated results framework for comment."},
  {id:"tp4",donorId:"d1",type:"Call",date:"2026-02-20",quality:2,notes:"Budget revision discussed. Agreement reached."},
  {id:"tp5",donorId:"d1",type:"Event",date:"2026-01-28",quality:3,notes:"Joint side event at WUF12 Cairo."},
  {id:"tp6",donorId:"d2",type:"Proposal submitted",date:"2026-03-15",quality:3,notes:"Concept note submitted to DG INTPA."},
  {id:"tp7",donorId:"d2",type:"Meeting",date:"2025-11-20",quality:3,notes:"Pre-consultation at Brussels HQ."},
  {id:"tp8",donorId:"d2",type:"Email",date:"2025-10-05",quality:1,notes:"Expression of interest submitted."},
  {id:"tp9",donorId:"d3",type:"Meeting",date:"2026-03-20",quality:3,notes:"Budget negotiation. Positive response from Anna."},
  {id:"tp10",donorId:"d3",type:"Email",date:"2026-02-14",quality:2,notes:"Concept note feedback received and responded to."},
  {id:"tp11",donorId:"d3",type:"Call",date:"2026-01-10",quality:2,notes:"Introductory call with new programme officer."},
  {id:"tp12",donorId:"d4",type:"Event",date:"2026-04-01",quality:2,notes:"Met at Urban Development Forum Nairobi."},
  {id:"tp13",donorId:"d4",type:"Email",date:"2026-03-05",quality:1,notes:"Introduction email following forum."},
  {id:"tp14",donorId:"d4",type:"Meeting",date:"2026-02-10",quality:2,notes:"Initial scoping meeting at USAID Nairobi."},
  {id:"tp15",donorId:"d5",type:"Meeting",date:"2026-04-05",quality:3,notes:"Mid-term review. Very positive."},
  {id:"tp16",donorId:"d5",type:"Report submitted",date:"2026-03-31",quality:2,notes:"6-month progress report submitted on time."},
  {id:"tp17",donorId:"d5",type:"Call",date:"2026-02-28",quality:2,notes:"Check-in ahead of report submission."},
  {id:"tp18",donorId:"d6",type:"Email",date:"2026-02-10",quality:1,notes:"Sent PIF status update. No response received."},
  {id:"tp19",donorId:"d6",type:"Call",date:"2025-12-15",quality:2,notes:"GEF coordination call. CEO endorsement timeline discussed."},
  {id:"tp20",donorId:"d7",type:"Meeting",date:"2026-03-10",quality:2,notes:"Follow-up meeting. Concept note agreed in principle."},
  {id:"tp21",donorId:"d7",type:"Call",date:"2026-02-05",quality:2,notes:"Initial scoping call with Bjorn."},
  {id:"tp22",donorId:"d8",type:"Proposal submitted",date:"2025-10-20",quality:2,notes:"Concept note submitted. No response in 145 days."},
  {id:"tp23",donorId:"d9",type:"Meeting",date:"2026-04-08",quality:3,notes:"Joint programme scoping. Strong alignment with Amina."},
  {id:"tp24",donorId:"d9",type:"Call",date:"2026-03-22",quality:2,notes:"Follow-up on joint programme concept."},
  {id:"tp25",donorId:"d10",type:"Email",date:"2026-01-15",quality:1,notes:"Cold outreach following LinkedIn connection."},
],
tracks:[
  {id:"tr1",donor:"UK FCDO",donorType:"Bilateral",programme:"Urban Resilience Programme",confirmedDate:"2026-01-10",owner:"Timothy Richards",priority:"High",milestones:[
    {milestoneId:"m1",label:"Agreement / legal instrument signed",targetDays:14,type:"universal",status:"Completed",completedDate:"2026-01-18",notes:"Signed 8 days after confirmation.",isOptional:false},
    {milestoneId:"m2",label:"First disbursement received",targetDays:30,type:"universal",status:"Completed",completedDate:"2026-02-01",notes:"Full $3M disbursed upfront.",isOptional:false},
    {milestoneId:"m3",label:"Programme inception meeting held",targetDays:21,type:"universal",status:"Completed",completedDate:"2026-02-15",notes:"Held virtually with FCDO London.",isOptional:false},
    {milestoneId:"m4",label:"Reporting framework established",targetDays:30,type:"universal",status:"Completed",completedDate:"2026-03-01",notes:"Quarterly reports and annual audit agreed.",isOptional:false},
    {milestoneId:"m5",label:"First progress report submitted",targetDays:90,type:"universal",status:"In progress",completedDate:null,notes:"Q1 report drafted. Due 15 May 2026; 16 days remaining.",isOptional:false},
    {milestoneId:"m6",label:"Grant closure and final report",targetDays:30,type:"universal",status:"Not started",completedDate:null,notes:"",isOptional:false},
    {milestoneId:"o1",label:"Baseline assessment completed",targetDays:60,type:"optional",status:"Completed",completedDate:"2026-03-20",notes:"Baseline conducted in 3 target cities.",isOptional:true},
    {milestoneId:"o2",label:"Mid-term review conducted",targetDays:180,type:"optional",status:"Not started",completedDate:null,notes:"Planned September 2026.",isOptional:true},
  ]},
  {id:"tr2",donor:"Bill & Melinda Gates Foundation",donorType:"Foundation",programme:"Gender & Inclusive Cities",confirmedDate:"2026-02-01",owner:"Timothy Richards",priority:"High",milestones:[
    {milestoneId:"m1",label:"Agreement / legal instrument signed",targetDays:14,type:"universal",status:"Completed",completedDate:"2026-02-10",notes:"Agreement signed within 9 days.",isOptional:false},
    {milestoneId:"m2",label:"First disbursement received",targetDays:30,type:"universal",status:"Completed",completedDate:"2026-02-20",notes:"First tranche $1M received.",isOptional:false},
    {milestoneId:"m3",label:"Programme inception meeting held",targetDays:21,type:"universal",status:"Completed",completedDate:"2026-03-05",notes:"BMGF programme officer attended in person.",isOptional:false},
    {milestoneId:"m4",label:"Reporting framework established",targetDays:30,type:"universal",status:"In progress",completedDate:null,notes:"Templates shared. Awaiting BMGF sign-off on indicators.",isOptional:false},
    {milestoneId:"m5",label:"First progress report submitted",targetDays:90,type:"universal",status:"Not started",completedDate:null,notes:"",isOptional:false},
    {milestoneId:"m6",label:"Grant closure and final report",targetDays:30,type:"universal",status:"Not started",completedDate:null,notes:"",isOptional:false},
    {milestoneId:"o5",label:"Site visit / programme immersion",targetDays:120,type:"optional",status:"Not started",completedDate:null,notes:"Planned Q3 2026.",isOptional:true},
  ]},
  {id:"tr3",donor:"Sida",donorType:"Bilateral",programme:"Climate & Housing Initiative",confirmedDate:"2026-01-20",owner:"Timothy Richards",priority:"Medium",milestones:[
    {milestoneId:"m1",label:"Agreement / legal instrument signed",targetDays:14,type:"universal",status:"Completed",completedDate:"2026-02-05",notes:"Minor amendments to budget narrative required.",isOptional:false},
    {milestoneId:"m2",label:"First disbursement received",targetDays:30,type:"universal",status:"Completed",completedDate:"2026-02-25",notes:"First $800K tranche received.",isOptional:false},
    {milestoneId:"m3",label:"Programme inception meeting held",targetDays:21,type:"universal",status:"Blocked",completedDate:null,notes:"Delayed: awaiting new Sida programme officer following Anna's secondment.",isOptional:false},
    {milestoneId:"m4",label:"Reporting framework established",targetDays:30,type:"universal",status:"Not started",completedDate:null,notes:"",isOptional:false},
    {milestoneId:"m5",label:"First progress report submitted",targetDays:90,type:"universal",status:"Not started",completedDate:null,notes:"",isOptional:false},
    {milestoneId:"m6",label:"Grant closure and final report",targetDays:30,type:"universal",status:"Not started",completedDate:null,notes:"",isOptional:false},
    {milestoneId:"o1",label:"Baseline assessment completed",targetDays:60,type:"optional",status:"Not started",completedDate:null,notes:"",isOptional:true},
  ]},
],
};

// ─────────────────────────────────────────────────────────────────────────────
// PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────
function usePersisted(key, def) {
  const [state, setRaw] = useState(() => {
    try { const s = localStorage.getItem("prx_v1_"+key); if(s) return JSON.parse(s); } catch {}
    return def;
  });
  const set = useCallback(val => {
    setRaw(prev => {
      const next = typeof val==="function" ? val(prev) : val;
      try { localStorage.setItem("prx_v1_"+key, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [key]);
  return [state, set];
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────
const n      = v => isFinite(Number(v)) ? Number(v) : 0;
const fmt    = v => { v=n(v); if(v>=1e6) return "$"+(v/1e6).toFixed(1)+"M"; if(v>=1e3) return "$"+Math.round(v/1e3)+"K"; return "$"+Math.round(v).toLocaleString(); };
const toM    = v => Math.round(n(v)/1e6*10)/10;
const pct    = (a,b) => b>0?Math.round(n(a)/n(b)*100):0;
const daysFrom = d => { if(!d) return null; const[y,m,dd]=d.split("-").map(Number); return Math.round((TODAY-new Date(y,m-1,dd))/864e5); };
const fmtDate  = d => { if(!d) return "n/a"; const[y,m,dd]=d.split("-").map(Number); return new Date(y,m-1,dd).toLocaleDateString("en",{day:"numeric",month:"short",year:"numeric"}); };
const mElapsed = s => { if(!s) return 0; const[sy,sm]=s.split("-").map(Number); return Math.max(0,(TODAY.getFullYear()-sy)*12+(TODAY.getMonth()-(sm-1))); };
const totMo    = (s,e) => { const[sy,sm]=s.split("-").map(Number); const[ey,em]=e.split("-").map(Number); return Math.max(1,(ey-sy)*12+(em-sm)); };
const thArr    = e => Array.isArray(e.themes) ? e.themes : (e.thematic ? [e.thematic] : []);
const wt       = o => n(o.amount)*n(o.prob)/100;
const dayName  = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][TODAY.getDay()];

// ─────────────────────────────────────────────────────────────────────────────
// SCORING
// Instruments are scored separately from themes — they are not the same thing
// ─────────────────────────────────────────────────────────────────────────────
function dScore(d, orgThemes, weights=DEFAULT_WEIGHTS) {
  let s = 0;
  const dt=thArr(d), ot=orgThemes||[];
  if(dt.length>0 && ot.length>0) {
    const overlap=dt.filter(t=>ot.includes(t)).length;
    s += Math.round(Math.min(overlap/Math.max(ot.length,1),1)*weights.themeWeight);
  }
  s += REL_SCORE[d.relationship]||0;
  // Use dynamic relationship score from weights if available
  const relScores={None:weights.relNone??0,Cold:weights.relCold??8,Warm:weights.relWarm??18,Active:weights.relActive??25,Strategic:weights.relStrategic??30};
  s -= REL_SCORE[d.relationship]||0; // remove static
  s += relScores[d.relationship]||0; // add dynamic
  const mn=n(d.grantMin),mx=n(d.grantMax);
  if(mx>0&&mx>=500000&&mn<=15000000){
    const ov=Math.min(mx,15e6)-Math.max(mn,500000);
    s += Math.round(Math.min(Math.max(ov,0)/14.5e6,1)*weights.grantWeight);
  }
  // Instruments scored on their own axis — not conflated with themes
  const ins=d.instruments||[];
  if(ins.some(i=>["Blended Finance","Trust Funds","Guarantees"].includes(i))) s+=weights.instrWeight;
  else if(ins.some(i=>["Grants","Co-financing"].includes(i))) s+=Math.round(weights.instrWeight*0.7);
  else if(ins.length) s+=Math.round(weights.instrWeight*0.3);
  return Math.min(100,Math.max(0,s));
}

// Gap calculation using explicit programme linkage first, theme fallback for unlinked
function calcGap(b, pipeline) {
  const linked   = pipeline.filter(p=>p.programmeId===b.id);
  const unlinked = pipeline.filter(p=>!p.programmeId && thArr(p).some(t=>thArr(b).includes(t)));
  const all = [...linked,...unlinked];
  const conf = all.filter(p=>n(p.prob)>=90).reduce((s,p)=>s+n(p.amount),0);
  const prob = all.filter(p=>n(p.prob)<90).reduce((s,p)=>s+wt(p),0);
  return {conf, prob, wt:conf+prob, linkedCount:linked.length};
}
function calcScen(b, pipeline) {
  const linked   = pipeline.filter(p=>p.programmeId===b.id);
  const unlinked = pipeline.filter(p=>!p.programmeId && thArr(p).some(t=>thArr(b).includes(t)));
  const all=[...linked,...unlinked];
  const conf=all.filter(p=>n(p.prob)>=90).reduce((s,p)=>s+n(p.amount),0);
  const prob=all.filter(p=>n(p.prob)<90).reduce((s,p)=>s+wt(p),0);
  const full=all.filter(p=>n(p.prob)<90).reduce((s,p)=>s+n(p.amount),0);
  return {conservative:conf,base:conf+prob,optimistic:conf+full};
}

const burnRate = g => n(g.disbursed)>0?n(g.spent)/n(g.disbursed):0;
const timePctG = g => Math.min(100,Math.round((mElapsed(g.startDate)/totMo(g.startDate,g.endDate))*100));
const expSpend = g => mElapsed(g.startDate)*n(g.monthlyBudget);

const assessBurn = g => {
  const actual=n(g.spent),elapsed=mElapsed(g.startDate);
  const tp=timePctG(g)/100,exp=expSpend(g);
  const variance=exp>0?(actual-exp)/exp:0;
  const mLeft=totMo(g.startDate,g.endDate)-elapsed;
  if(actual>=n(g.disbursed)*0.88&&mLeft>=2) return{level:"Critical",label:"Overspend risk",bg:"#F7D0CD",tx:"#7B1C14",bar:C.red};
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
  if(s.blocked){const bm=t.milestones.find(m=>m.status==="Blocked");return{level:"Blocked",color:C.red,bg:C.redL,tx:"#7B1C14",text:`Blocked at: "${bm?.label}". ${bm?.notes||""} Escalate to resolve; delays cascade into reporting and disbursement.`};}
  if(s.schedSt==="overdue") return{level:"Behind schedule",color:"#E57370",bg:C.redL,tx:"#9B2B24",text:`"${s.curM?.label}" is ${s.daysOver} days beyond its ${s.curM?.targetDays}-day target. Assign a named owner and close within 7 days.`};
  if(s.schedSt==="approaching") return{level:"Approaching deadline",color:C.amber,bg:C.amberL,tx:"#7A5A1A",text:`"${s.curM?.label}" is approaching its ${s.curM?.targetDays}-day target. Prioritise this milestone this week.`};
  if(s.pctDone===100) return{level:"Fully activated",color:C.green,bg:C.greenL,tx:C.greenT,text:"All milestones complete. Shift focus to grant monitoring and relationship stewardship."};
  return{level:"On schedule",color:C.green,bg:C.greenL,tx:C.greenT,text:"Progressing to schedule. Ensure the next milestone is planned and owned before the current one closes."};
};

// ─────────────────────────────────────────────────────────────────────────────
// DECISION ENGINE — no em dashes in output text
// ─────────────────────────────────────────────────────────────────────────────
function generateActions(donors,pipeline,budgets,grants,touchpoints,tracks,weights=DEFAULT_WEIGHTS){
  const orgThemes=[...new Set(budgets.flatMap(b=>thArr(b)))];
  const actions=[];

  pipeline.forEach(opp=>{
    const donor=donors.find(d=>d.name===opp.donor);if(!donor)return;
    const eng=scoreEng(donor.id,touchpoints);
    const budget=opp.programmeId?budgets.find(b=>b.id===opp.programmeId):budgets.find(b=>thArr(b).some(t=>thArr(opp).includes(t)));
    const gapAmt=budget?Math.max(0,n(budget.required)-calcGap(budget,pipeline).wt):0;
    const gapPressure=budget?gapAmt/Math.max(n(budget.required),1):0;
    const expVal=wt(opp);
    const engRisk=eng.overall<25?weights.relWeight:eng.overall<50?weights.relWeight*0.65:eng.overall<75?weights.relWeight*0.25:0;
    const stageAge=opp.date?Math.max(0,(new Date(opp.date+"-01")-TODAY)/(1000*60*60*24*30)):6;
    const timeSens=Math.max(0,1-stageAge/12);

    if(eng.overall<40&&n(opp.prob)>=25){
      const score=Math.round(((expVal*weights.probWeight)+(gapPressure*weights.gapWeight*2000000)+(engRisk*1500000)+(timeSens*weights.urgWeight*500000))/1000000*10);
      actions.push({
        id:"eng_"+opp.id,type:"engagement",priority:score,
        title:`Re-engage ${donor.name}: relationship ${eng.overall<25?"at risk":"fading"}`,
        subtitle:`${eng.daysSinceLast} days without contact; ${fmt(n(opp.amount))} opportunity`,
        why:`${donor.name}'s engagement health is ${eng.overall}/100 (${engLabel(eng.overall).label}). The ${fmt(n(opp.amount))} ${opp.name} is at ${n(opp.prob)}% probability and will decline further without contact.${gapAmt>0?" The linked programme has a "+fmt(gapAmt)+" gap this donor can address.":""}`,
        action:"Schedule a substantive call or meeting this week",
        effort:"30 min",urgencyColor:eng.overall<25?C.red:C.amber,urgencyBg:eng.overall<25?C.redL:C.amberL,
      });
    }
    if((opp.stage==="Engaged"||opp.stage==="Prospect")&&n(opp.prob)>=10){
      const score=Math.round(((expVal*0.9*weights.probWeight)+(gapPressure*weights.gapWeight*2000000)+(timeSens*weights.urgWeight*800000))/1000000*8);
      actions.push({
        id:"pipe_"+opp.id,type:"pipeline",priority:score,
        title:`Advance ${opp.name}: move to concept note stage`,
        subtitle:`Currently at ${opp.stage}; ${fmt(n(opp.amount))} potential; close ${opp.date||"TBD"}`,
        why:`Advancing from ${opp.stage} to Concept Note increases probability from ${n(opp.prob)}% to approximately 40%, adding ${fmt(n(opp.amount)*0.15)} to the weighted forecast.${gapAmt>0?" Programme gap is "+fmt(gapAmt)+": this opportunity directly addresses it.":""}`,
        action:"Draft and submit concept note",
        effort:"6 hrs",urgencyColor:C.blue,urgencyBg:C.blueL,
      });
    }
  });

  grants.forEach(g=>{
    if(!g.reportingDeadline)return;
    const days=daysFrom(g.reportingDeadline);
    if(days<0&&days>-30){
      const du=-days;const urgency=du<=14?90:60;
      actions.push({
        id:"rep_"+g.id,type:"reporting",priority:urgency,
        title:`Submit progress report: ${g.programme}`,
        subtitle:`Due ${fmtDate(g.reportingDeadline)}; ${du} days remaining; ${g.donor}`,
        why:`The ${g.donor} reporting deadline for ${g.programme} is in ${du} days. Late or poor-quality reporting damages the relationship and risks the next disbursement tranche. Absorption rate: ${Math.round(burnRate(g)*100)}%.`,
        action:"Complete and submit progress report",
        effort:"8 hrs",urgencyColor:du<=14?C.red:C.amber,urgencyBg:du<=14?C.redL:C.amberL,
      });
    }
  });

  grants.forEach(g=>{
    const risk=assessBurn(g);
    if(risk.level==="Critical"||risk.level==="High"){
      actions.push({
        id:"burn_"+g.id,type:"burn",priority:risk.level==="Critical"?88:72,
        title:`Address absorption risk: ${g.programme}`,
        subtitle:`${risk.label}; ${Math.round(burnRate(g)*100)}% of disbursed spent; ${g.donor}`,
        why:`${g.programme} has a ${risk.level.toLowerCase()} absorption risk. ${risk.level==="Critical"?`Funds are nearly exhausted; a disbursement request to ${g.donor} must be submitted immediately.`:`Spending is significantly below plan. ${g.donor} will flag this at the next reporting review.`}`,
        action:risk.level==="Critical"?"Submit disbursement request immediately":"Accelerate programme activities and document a recovery plan",
        effort:"2 hrs",urgencyColor:risk.bar,urgencyBg:risk.bg,
      });
    }
  });

  pipeline.filter(p=>n(p.prob)>=90&&!tracks.some(t=>t.donor===p.donor&&t.programme===p.name)).forEach(p=>{
    actions.push({
      id:"act_"+p.id,type:"activation",priority:65,
      title:`Start activation track: ${p.donor}`,
      subtitle:`${p.name} confirmed; no inception milestones set; delayed start risk`,
      why:`${p.name} is confirmed at ${fmt(n(p.amount))} but has no activation track. Inception delays are common without structured milestone management and directly affect the ${p.donor} relationship.`,
      action:"Open Grant Activation and create track",
      effort:"30 min",urgencyColor:C.amber,urgencyBg:C.amberL,
    });
  });

  return actions.sort((a,b)=>b.priority-a.priority).slice(0,6);
}

// ─────────────────────────────────────────────────────────────────────────────
// CROSS-ITEM PORTFOLIO INTELLIGENCE — pattern detection across modules
// ─────────────────────────────────────────────────────────────────────────────
function generatePatterns(donors, pipeline, budgets, grants, touchpoints) {
  const patterns = [];

  // 1. Absorption risk clustering — 2+ grants critical/high simultaneously
  const riskGrants = grants.filter(g=>["Critical","High"].includes(assessBurn(g).level));
  if(riskGrants.length >= 2) {
    const crit = riskGrants.filter(g=>assessBurn(g).level==="Critical");
    const high  = riskGrants.filter(g=>assessBurn(g).level==="High");
    patterns.push({
      id:"pat_absorption", type:"systemic", icon:"⚠",
      title:`${riskGrants.length} grants showing simultaneous absorption risk`,
      detail:`${riskGrants.map(g=>g.programme).join(", ")}. When multiple grants show absorption problems at the same time, the root cause is rarely isolated to individual grants. This pattern signals a systemic delivery bottleneck: procurement delays, staffing gaps, or programme design issues affecting capacity across the portfolio.`,
      recommendation:"Convene a cross-programme delivery review before submitting any individual disbursement requests. Identify the shared bottleneck and address it at portfolio level, not grant by grant.",
      color:C.red, bg:C.redL, destTab:"burn",
    });
  }

  // 2. Pipeline concentration risk — 40%+ weighted pipeline in one donor or theme
  const totalWtP = pipeline.reduce((s,o)=>s+wt(o),0);
  if(totalWtP > 0) {
    const donorTotals = {};
    pipeline.forEach(o=>{ donorTotals[o.donor]=(donorTotals[o.donor]||0)+wt(o); });
    const topDonor = Object.entries(donorTotals).sort((a,b)=>b[1]-a[1])[0];
    if(topDonor && topDonor[1]/totalWtP > 0.4) {
      patterns.push({
        id:"pat_concentration_donor", type:"strategic", icon:"📊",
        title:`Pipeline concentration: ${Math.round(topDonor[1]/totalWtP*100)}% dependent on ${topDonor[0]}`,
        detail:`${fmt(topDonor[1])} of your ${fmt(totalWtP)} weighted pipeline sits with a single donor. If ${topDonor[0]} shifts strategy, delays a decision, or reduces its programme, your portfolio faces a structural funding shortfall that cannot be corrected quickly.`,
        recommendation:"Diversify the pipeline by identifying and advancing at least two additional opportunities in different donor categories within the next quarter.",
        color:C.amber, bg:C.amberL, destTab:"pipeline",
      });
    }
  }

  // 3. Thematic gap convergence — multiple programmes underfunded in same theme
  const themeGapMap = {};
  budgets.forEach(b=>{
    const gap=Math.max(0,n(b.required)-calcGap(b,pipeline).wt);
    if(gap>0) thArr(b).forEach(t=>{ themeGapMap[t]=(themeGapMap[t]||[]);themeGapMap[t].push({prog:b.programme,gap}); });
  });
  Object.entries(themeGapMap).forEach(([theme,items])=>{
    if(items.length >= 2) {
      const totalGap = items.reduce((s,i)=>s+i.gap,0);
      patterns.push({
        id:"pat_theme_"+theme, type:"strategic", icon:"🔍",
        title:`Structural gap: ${theme} unfunded across ${items.length} programmes`,
        detail:`${items.map(i=>i.prog).join(", ")} all have unmet funding needs in ${theme}, totalling ${fmt(totalGap)}. This is not a pipeline execution problem; it is a donor portfolio gap. You have insufficient ${theme} donors mapped at the right scale.`,
        recommendation:`Audit your ${theme} donor map. Add at least 3 new prospects with explicit ${theme} focus and sufficient grant size to meaningfully reduce this structural gap.`,
        color:C.blue, bg:C.blueL, destTab:"gap",
      });
    }
  });

  // 4. Engagement cooling by donor type — 3+ donors of same type Fading or Dormant
  DONOR_TYPES.forEach(type=>{
    const typeDonors = donors.filter(d=>d.type===type);
    const cooling = typeDonors.filter(d=>{const e=scoreEng(d.id,touchpoints);return e.overall<50&&e.overall>0;});
    if(cooling.length >= 3) {
      patterns.push({
        id:"pat_cooling_"+type, type:"relationship", icon:"❄",
        title:`${cooling.length} ${type} relationships simultaneously cooling`,
        detail:`${cooling.map(d=>d.name).join(", ")} are all showing Fading or Dormant engagement health. When multiple donors of the same type cool simultaneously, it often signals a sector-wide shift, a staffing change on their side, or that your organisation has deprioritised this donor category.`,
        recommendation:`Review your ${type} engagement strategy. Identify whether this is a sector-wide signal or an internal resourcing issue. Schedule substantive touchpoints with each of the ${cooling.length} affected donors this month.`,
        color:C.amber, bg:C.amberL, destTab:"engagement",
      });
    }
  });

  return patterns;
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA ACCURACY — computes overall portfolio data health %
// ─────────────────────────────────────────────────────────────────────────────
function computeDataAccuracy(donors, pipeline, touchpoints) {
  if(!donors.length) return {score:0, completeness:0, coverage:0, linkage:0, currency:0, issues:[]};
  const issues = [];

  // 1. Profile completeness — donors with themes + grant range + at least 1 contact
  const complete = donors.filter(d=>thArr(d).length>0&&n(d.grantMax)>0&&(d.contacts||[]).some(c=>c.name));
  const completeness = Math.round(complete.length/donors.length*100);
  const incomplete = donors.filter(d=>!(thArr(d).length>0&&n(d.grantMax)>0&&(d.contacts||[]).some(c=>c.name)));
  if(incomplete.length>0) issues.push({level:"warn",msg:`${incomplete.length} donor profile${incomplete.length>1?"s":""} incomplete: missing themes, grant range, or key contact (${incomplete.slice(0,3).map(d=>d.name).join(", ")}${incomplete.length>3?" and others":""}).`});

  // 2. Touchpoint coverage — donors with 3+ touchpoints
  const covered = donors.filter(d=>touchpoints.filter(t=>t.donorId===d.id).length>=3);
  const coverage = Math.round(covered.length/donors.length*100);
  const uncovered = donors.filter(d=>touchpoints.filter(t=>t.donorId===d.id).length<3);
  if(uncovered.length>0) issues.push({level:"info",msg:`${uncovered.length} donor${uncovered.length>1?"s":""} have fewer than 3 touchpoints logged. Engagement health scores for these donors are estimates only.`});

  // 3. Programme linkage — pipeline opportunities with explicit programme link
  const linked = pipeline.filter(p=>p.programmeId);
  const linkage = pipeline.length>0 ? Math.round(linked.length/pipeline.length*100) : 100;
  const unlinked = pipeline.filter(p=>!p.programmeId);
  if(unlinked.length>0) issues.push({level:"info",msg:`${unlinked.length} pipeline opportunit${unlinked.length>1?"ies":"y"} not linked to a specific programme. Gap matrix calculations for these use theme matching, which is less precise.`});

  // 4. Pipeline currency — opportunities with a close date set
  const dated = pipeline.filter(p=>p.date);
  const currency = pipeline.length>0 ? Math.round(dated.length/pipeline.length*100) : 100;
  const undated = pipeline.filter(p=>!p.date);
  if(undated.length>0) issues.push({level:"info",msg:`${undated.length} pipeline opportunit${undated.length>1?"ies":"y"} missing an expected close date. Time sensitivity scoring is unavailable for these.`});

  const score = Math.round((completeness+coverage+linkage+currency)/4);
  return {score, completeness, coverage, linkage, currency, issues};
}
// ─────────────────────────────────────────────────────────────────────────────
const inp  = { ...FS,fontSize:13,padding:"8px 11px",border:`1px solid ${C.border}`,borderRadius:8,width:"100%",background:C.card,color:C.text,outline:"none",boxSizing:"border-box" };
const lbl  = { ...FS,fontSize:10.5,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600 };
const BTN  = {
  add:  {background:C.green,color:"#fff",border:"none"},
  edit: {background:C.card, color:C.text, border:`1px solid ${C.border}`},
  del:  {background:C.redL, color:C.red,  border:`1px solid #F5C6C3`},
  ghost:{background:C.card, color:C.muted,border:`1px solid ${C.border}`},
  save: {background:C.green,color:"#fff",border:"none"},
};
const btn  = (type,extra={}) => ({...BTN[type],...FS,padding:"7px 16px",borderRadius:8,fontSize:12.5,cursor:"pointer",fontWeight:BTN[type].background===C.green||type==="del"?600:400,...extra});

function Pill({label,bg,tx}){
  return <span style={{...FS,display:"inline-block",fontSize:10,padding:"2px 8px",borderRadius:10,fontWeight:600,background:bg,color:tx,whiteSpace:"nowrap"}}>{label}</span>;
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
function L({children,mandatory=false}){return <label style={lbl}>{children}{mandatory&&<span style={{color:C.red,marginLeft:2}}>*</span>}</label>;}

function TagSelector({options,selected=[],onChange,label,hint}){
  return(
    <FR full>
      <L>{label}</L>
      {hint&&<div style={{...FS,fontSize:10.5,color:C.hint,marginBottom:3}}>{hint}</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:4,marginTop:2}}>
        {options.map(t=>(
          <label key={t} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,cursor:"pointer",...FS}}>
            <input type="checkbox" checked={selected.includes(t)} onChange={e=>onChange(e.target.checked?[...selected,t]:selected.filter(x=>x!==t))} style={{width:"auto",margin:0}}/>
            {t}
          </label>
        ))}
      </div>
    </FR>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────────────────────────────────────
const TABS=[
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
export default function Proximis(){
  const[tab,setTab]=useState("home");
  const[showSettings,setShowSettings]=useState(false);
  const[settingsSection,setSettingsSection]=useState("themes");
  const[now,setNow]=useState(new Date());
  const[donors,setDonors]             =usePersisted("donors",     DEF.donors);
  const[pipeline,setPipeline]         =usePersisted("pipeline",   DEF.pipeline);
  const[budgets,setBudgets]           =usePersisted("budgets",    DEF.budgets);
  const[grants,setGrants]             =usePersisted("grants",     DEF.grants);
  const[touchpoints,setTouchpoints]   =usePersisted("touchpoints",DEF.touchpoints);
  const[tracks,setTracks]             =usePersisted("tracks",     DEF.tracks);
  const[tagLib,setTagLib]             =usePersisted("tagLib",     {themes:DEFAULT_THEMES,instruments:DEFAULT_INSTRUMENTS});
  const[weights,setWeights]           =usePersisted("weights",    DEFAULT_WEIGHTS);
  const[fieldConfig,setFieldConfig]   =usePersisted("fieldConfig",DEFAULT_FIELD_CONFIG);

  // Auto-refresh every 60 seconds
  useEffect(()=>{
    const timer=setInterval(()=>setNow(new Date()),60000);
    return()=>clearInterval(timer);
  },[]);

  const dataAccuracy = useMemo(()=>computeDataAccuracy(donors,pipeline,touchpoints),[donors,pipeline,touchpoints]);
  const accColor = dataAccuracy.score>=80?C.green:dataAccuracy.score>=50?C.amber:C.red;

  const shared={donors,setDonors,pipeline,setPipeline,budgets,setBudgets,grants,setGrants,touchpoints,setTouchpoints,tracks,setTracks,tagLib,setTagLib,weights,setWeights,fieldConfig,setFieldConfig};

  const openSettings=(section="themes")=>{setSettingsSection(section);setShowSettings(true);};

  return(
    <div style={{...FS,color:C.text,fontSize:14,minHeight:"100vh",background:C.bg}}>
      <div style={{background:C.green,padding:"0 24px",display:"flex",alignItems:"stretch",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 12px rgba(0,0,0,0.15)"}}>
        <div style={{display:"flex",alignItems:"center",paddingRight:24,borderRight:`1px solid rgba(255,255,255,0.15)`,marginRight:4}}>
          <div style={{width:28,height:28,borderRadius:6,background:C.accent,display:"flex",alignItems:"center",justifyContent:"center",marginRight:8}}>
            <span style={{...F,fontSize:14,fontWeight:700,color:"#fff"}}>P</span>
          </div>
          <span style={{...F,fontSize:17,fontWeight:700,color:"#fff",letterSpacing:"-0.3px"}}>Proximis</span>
        </div>
        {TABS.map(t=>{
          const active=tab===t.id;
          return(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{...FS,background:"none",border:"none",borderBottom:active?"2.5px solid "+C.accent:"2.5px solid transparent",padding:"0 16px",fontSize:12.5,cursor:"pointer",color:active?"#fff":"rgba(255,255,255,0.6)",fontWeight:active?600:400,height:48,whiteSpace:"nowrap",transition:"color 0.15s"}}>
              {t.label}
            </button>
          );
        })}
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:10}}>
          {/* Data accuracy % indicator */}
          <button onClick={()=>openSettings("accuracy")}
            title={`Portfolio data health: ${dataAccuracy.score}%. Click for details.`}
            style={{...FS,background:"rgba(0,0,0,0.2)",border:`1px solid ${accColor}60`,borderRadius:8,padding:"5px 12px",fontSize:12,color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:accColor,display:"inline-block",flexShrink:0}}></span>
            <span style={{color:accColor,fontWeight:700}}>{dataAccuracy.score}%</span>
            <span style={{color:"rgba(255,255,255,0.6)"}}>Data</span>
          </button>
          <button onClick={()=>openSettings("themes")} style={{...FS,background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:8,padding:"6px 14px",fontSize:12,color:"#fff",cursor:"pointer"}}>
            Settings
          </button>
        </div>
      </div>

      {showSettings&&<SettingsModal tagLib={tagLib} setTagLib={setTagLib} weights={weights} setWeights={setWeights} fieldConfig={fieldConfig} setFieldConfig={setFieldConfig} dataAccuracy={dataAccuracy} initialSection={settingsSection} onClose={()=>setShowSettings(false)}/>}

      <div style={{padding:"24px 24px 40px"}}>
        {tab==="home"        && <HomeScreen    {...shared} onNav={setTab} now={now}/>}
        {tab==="donors"      && <DonorMap      {...shared}/>}
        {tab==="pipeline"    && <PipelineTab   {...shared}/>}
        {tab==="gap"         && <GapMatrix     {...shared}/>}
        {tab==="burn"        && <BurnRate      {...shared}/>}
        {tab==="engagement"  && <Engagement    {...shared}/>}
        {tab==="activation"  && <Activation    {...shared} onNav={setTab}/>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS MODAL
// ─────────────────────────────────────────────────────────────────────────────
function SettingsModal({tagLib,setTagLib,weights,setWeights,fieldConfig,setFieldConfig,dataAccuracy,initialSection="themes",onClose}){
  const[section,setSection]=useState(initialSection);
  const[newTheme,setNewTheme]=useState("");
  const[newInstr,setNewInstr]=useState("");

  const addTheme=()=>{if(newTheme.trim()&&!tagLib.themes.includes(newTheme.trim())){setTagLib(t=>({...t,themes:[...t.themes,newTheme.trim()]}));setNewTheme("");}};
  const removeTheme=t=>setTagLib(l=>({...l,themes:l.themes.filter(x=>x!==t)}));
  const addInstr=()=>{if(newInstr.trim()&&!tagLib.instruments.includes(newInstr.trim())){setTagLib(t=>({...t,instruments:[...t.instruments,newInstr.trim()]}));setNewInstr("");}};
  const removeInstr=i=>setTagLib(l=>({...l,instruments:l.instruments.filter(x=>x!==i)}));

  // Field config helpers
  const getFC=(entity,id)=>(fieldConfig[entity]||[]).find(f=>f.id===id)||{visible:true,mandatory:false};
  const updateFC=(entity,id,patch)=>setFieldConfig(fc=>({...fc,[entity]:(fc[entity]||[]).map(f=>f.id===id?{...f,...patch}:f)}));

  const W=weights;
  // Enforce ascending order on rel score sliders
  const setRel=(k,val,prev,next)=>{
    const prevVal=W[prev]??0, nextVal=W[next]??100;
    const clamped=Math.max(prevVal,Math.min(nextVal,val));
    setWeights(w=>({...w,[k]:clamped}));
  };

  const sections=[
    {id:"themes",label:"Thematic areas"},
    {id:"instruments",label:"Funding instruments"},
    {id:"scoring",label:"Scoring weights"},
    {id:"fields",label:"Field configuration"},
    {id:"accuracy",label:"Data accuracy"},
  ];

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:C.card,borderRadius:16,width:680,maxHeight:"85vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"18px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:C.green}}>
          <div style={{...F,fontSize:16,fontWeight:700,color:"#fff"}}>Platform settings</div>
          <button onClick={onClose} style={{...FS,background:"rgba(255,255,255,0.15)",border:"none",borderRadius:8,color:"#fff",padding:"5px 12px",cursor:"pointer",fontSize:13}}>Close</button>
        </div>
        <div style={{display:"flex",flex:1,overflow:"hidden"}}>
          <div style={{width:160,borderRight:`1px solid ${C.border}`,padding:"12px 0",flexShrink:0}}>
            {sections.map(s=>(
              <button key={s.id} onClick={()=>setSection(s.id)}
                style={{...FS,width:"100%",textAlign:"left",padding:"10px 16px",border:"none",background:section===s.id?C.greenL:"transparent",color:section===s.id?C.green:C.muted,fontWeight:section===s.id?600:400,fontSize:12.5,cursor:"pointer",borderLeft:section===s.id?`3px solid ${C.green}`:"3px solid transparent"}}>
                {s.label}
              </button>
            ))}
          </div>
          <div style={{flex:1,overflow:"auto",padding:"20px"}}>

            {section==="themes"&&(
              <div>
                <div style={{...FS,fontSize:11,color:C.muted,lineHeight:1.6,marginBottom:14}}>
                  Define the thematic areas used across the platform for donors, programmes, pipeline, and grants. Each organisation can build its own taxonomy. Add or remove as needed.
                </div>
                <div style={{display:"flex",gap:8,marginBottom:14}}>
                  <input value={newTheme} onChange={e=>setNewTheme(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTheme()} placeholder="Add new thematic area..." style={{...inp,flex:1}}/>
                  <button onClick={addTheme} style={btn("add")}>Add</button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                  {tagLib.themes.map(t=>(
                    <div key={t} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:"#FAFAF7",border:`1px solid ${C.border}`,borderRadius:8}}>
                      <span style={{...FS,fontSize:12,color:C.text}}>{t}</span>
                      <button onClick={()=>removeTheme(t)} style={{...FS,background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:14,padding:"0 4px"}}>x</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {section==="instruments"&&(
              <div>
                <div style={{...FS,fontSize:11,color:C.muted,lineHeight:1.6,marginBottom:14}}>
                  Funding instruments describe how donors deploy capital: grants, loans, guarantees, blended finance, and so on. These are scored separately from thematic priorities in the alignment calculation. Add or remove to match your funding context.
                </div>
                <div style={{display:"flex",gap:8,marginBottom:14}}>
                  <input value={newInstr} onChange={e=>setNewInstr(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addInstr()} placeholder="Add new instrument..." style={{...inp,flex:1}}/>
                  <button onClick={addInstr} style={btn("add")}>Add</button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                  {tagLib.instruments.map(i=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:"#FAFAF7",border:`1px solid ${C.border}`,borderRadius:8}}>
                      <span style={{...FS,fontSize:12,color:C.text}}>{i}</span>
                      <button onClick={()=>removeInstr(i)} style={{...FS,background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:14,padding:"0 4px"}}>x</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {section==="scoring"&&(
              <div>
                <div style={{...FS,fontSize:11,color:C.muted,lineHeight:1.6,marginBottom:16}}>
                  Adjust the weights used to generate priority action scores and donor alignment scores. These are starting defaults; your organisation has the final say. Changes apply immediately across the platform.
                </div>
                <div style={{marginBottom:20}}>
                  <div style={{...FS,fontSize:12,fontWeight:600,color:C.text,marginBottom:12,paddingBottom:6,borderBottom:`1px solid ${C.border}`}}>Action scoring formula weights</div>
                  <div style={{...FS,fontSize:11,color:C.muted,fontStyle:"italic",marginBottom:12}}>Score = (Expected value x Probability weight) + (Gap pressure x Gap weight) + (Engagement risk x Relationship weight) + (Time sensitivity x Urgency weight), divided by effort hours</div>
                  {[
                    {k:"probWeight",label:"Probability weight",hint:"How much expected funding value influences the score"},
                    {k:"gapWeight",label:"Gap pressure weight",hint:"How urgently an unfunded programme gap escalates priority"},
                    {k:"relWeight",label:"Relationship risk weight",hint:"How much a fading relationship elevates urgency"},
                    {k:"urgWeight",label:"Urgency weight",hint:"How much deadline proximity drives the score"},
                  ].map(f=>(
                    <div key={f.k} style={{marginBottom:12}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                        <span style={{...FS,fontSize:12,fontWeight:600,color:C.text}}>{f.label}</span>
                        <span style={{...FS,fontSize:13,fontWeight:700,color:C.green}}>{W[f.k]}</span>
                      </div>
                      <div style={{...FS,fontSize:10.5,color:C.hint,marginBottom:5}}>{f.hint}</div>
                      <input type="range" min="0" max="1" step="0.05" value={W[f.k]} onChange={e=>setWeights(w=>({...w,[f.k]:parseFloat(e.target.value)}))} style={{width:"100%",accentColor:C.green}}/>
                    </div>
                  ))}
                </div>
                <div style={{marginBottom:20}}>
                  <div style={{...FS,fontSize:12,fontWeight:600,color:C.text,marginBottom:12,paddingBottom:6,borderBottom:`1px solid ${C.border}`}}>Donor alignment scoring (max 100 points)</div>
                  {[
                    {k:"themeWeight",label:"Thematic alignment",hint:"Points for overlap between donor themes and your programme themes",min:0,max:50,step:1},
                    {k:"grantWeight",label:"Grant size fit",hint:"Points for grant size compatibility with your portfolio",min:0,max:30,step:1},
                    {k:"instrWeight",label:"Instrument suitability",hint:"Points for instruments that work for your funding model; scored separately from themes",min:0,max:20,step:1},
                  ].map(f=>(
                    <div key={f.k} style={{marginBottom:12}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                        <span style={{...FS,fontSize:12,fontWeight:600,color:C.text}}>{f.label}</span>
                        <span style={{...FS,fontSize:13,fontWeight:700,color:C.green}}>{W[f.k]} pts</span>
                      </div>
                      <div style={{...FS,fontSize:10.5,color:C.hint,marginBottom:5}}>{f.hint}</div>
                      <input type="range" min={f.min} max={f.max} step={f.step} value={W[f.k]} onChange={e=>setWeights(w=>({...w,[f.k]:parseInt(e.target.value)}))} style={{width:"100%",accentColor:C.green}}/>
                    </div>
                  ))}
                </div>
                {/* Relationship status score sliders */}
                <div style={{marginBottom:20}}>
                  <div style={{...FS,fontSize:12,fontWeight:600,color:C.text,marginBottom:8,paddingBottom:6,borderBottom:`1px solid ${C.border}`}}>Relationship status score scale</div>
                  <div style={{...FS,fontSize:11,color:C.muted,marginBottom:12}}>Points awarded per partnership status level. Values must remain in ascending order: None cannot exceed Cold, Cold cannot exceed Warm, and so on. These contribute up to 30 points in donor alignment scoring.</div>
                  {[
                    {k:"relNone",    label:"None",     prev:null,        next:"relCold"},
                    {k:"relCold",    label:"Cold",     prev:"relNone",   next:"relWarm"},
                    {k:"relWarm",    label:"Warm",     prev:"relCold",   next:"relActive"},
                    {k:"relActive",  label:"Active",   prev:"relWarm",   next:"relStrategic"},
                    {k:"relStrategic",label:"Strategic",prev:"relActive",next:null},
                  ].map(f=>(
                    <div key={f.k} style={{marginBottom:10,display:"flex",alignItems:"center",gap:12}}>
                      <span style={{...FS,fontSize:11,fontWeight:600,color:C.text,minWidth:70}}>{f.label}</span>
                      <input type="range" min={f.prev?W[f.prev]??0:0} max={f.next?W[f.next]??30:30} step={1} value={W[f.k]??0}
                        onChange={e=>setRel(f.k,parseInt(e.target.value),f.prev,f.next)}
                        style={{flex:1,accentColor:C.green}}/>
                      <span style={{...FS,fontSize:13,fontWeight:700,color:C.green,minWidth:28,textAlign:"right"}}>{W[f.k]??0}</span>
                    </div>
                  ))}
                </div>
                <button onClick={()=>setWeights(DEFAULT_WEIGHTS)} style={btn("ghost",{fontSize:12})}>Reset all weights to system defaults</button>
              </div>
            )}

            {/* ── FIELD CONFIGURATION ──────────────────────────────── */}
            {section==="fields"&&(
              <div>
                <div style={{...FS,fontSize:11,color:C.muted,lineHeight:1.6,marginBottom:16}}>
                  Control which fields appear on forms across the platform. Toggle visibility to hide fields your organisation does not use. Mark fields as mandatory to enforce data quality — mandatory fields are marked with a red asterisk and forms cannot be submitted without them. Core system fields (donor name, donor type, opportunity name, programme name) cannot be toggled off.
                </div>
                {[
                  {entity:"donors",label:"Donor profiles"},
                  {entity:"pipeline",label:"Pipeline opportunities"},
                  {entity:"budgets",label:"Programme budgets"},
                  {entity:"grants",label:"Active grants"},
                  {entity:"touchpoints",label:"Touchpoints"},
                ].map(({entity,label})=>(
                  <div key={entity} style={{marginBottom:20}}>
                    <div style={{...FS,fontSize:12,fontWeight:600,color:C.text,marginBottom:10,paddingBottom:6,borderBottom:`1px solid ${C.border}`}}>{label}</div>
                    {(fieldConfig[entity]||[]).map(f=>(
                      <div key={f.id} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 10px",background:"#FAFAF7",borderRadius:8,marginBottom:6,border:`1px solid ${C.border}`}}>
                        <span style={{...FS,fontSize:12,color:C.text,flex:1}}>{f.label}</span>
                        <label style={{display:"flex",alignItems:"center",gap:5,...FS,fontSize:11,color:C.muted,cursor:"pointer"}}>
                          <input type="checkbox" checked={f.visible!==false} onChange={e=>updateFC(entity,f.id,{visible:e.target.checked})} style={{width:"auto",margin:0}}/>
                          Visible
                        </label>
                        <label style={{display:"flex",alignItems:"center",gap:5,...FS,fontSize:11,color:f.mandatory?C.red:C.muted,cursor:"pointer"}}>
                          <input type="checkbox" checked={!!f.mandatory} onChange={e=>updateFC(entity,f.id,{mandatory:e.target.checked})} style={{width:"auto",margin:0}}/>
                          <span style={{fontWeight:f.mandatory?700:400}}>Mandatory{f.mandatory&&" *"}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                ))}
                <button onClick={()=>setFieldConfig(DEFAULT_FIELD_CONFIG)} style={btn("ghost",{fontSize:12})}>Reset field configuration to defaults</button>
              </div>
            )}

            {/* ── DATA ACCURACY ────────────────────────────────────── */}
            {section==="accuracy"&&(
              <div>
                <div style={{...FS,fontSize:11,color:C.muted,lineHeight:1.6,marginBottom:16}}>
                  Data accuracy measures how much you should trust the intelligence this platform generates. Better data means more reliable recommendations. Each measure below identifies a specific gap to address.
                </div>
                {/* Overall score */}
                <div style={{padding:"16px",background:dataAccuracy.score>=80?C.greenL:dataAccuracy.score>=50?C.amberL:C.redL,borderRadius:12,marginBottom:20,display:"flex",alignItems:"center",gap:16}}>
                  <div style={{...F,fontSize:40,fontWeight:700,color:dataAccuracy.score>=80?C.green:dataAccuracy.score>=50?C.amber:C.red,lineHeight:1}}>{dataAccuracy.score}%</div>
                  <div>
                    <div style={{...FS,fontSize:13,fontWeight:600,color:C.text}}>Overall portfolio data health</div>
                    <div style={{...FS,fontSize:11,color:C.muted,marginTop:3}}>{dataAccuracy.score>=80?"Your data is in good shape. Recommendations are reliable.":dataAccuracy.score>=50?"Some data gaps exist. Recommendations may be partially imprecise.":"Significant data gaps. Address the issues below to improve recommendation quality."}</div>
                  </div>
                </div>
                {/* Four sub-scores */}
                {[
                  {label:"Profile completeness",score:dataAccuracy.completeness,hint:"Donors with themes, grant range, and at least one named contact"},
                  {label:"Touchpoint coverage",score:dataAccuracy.coverage,hint:"Donors with 3 or more touchpoints logged for reliable engagement scoring"},
                  {label:"Programme linkage",score:dataAccuracy.linkage,hint:"Pipeline opportunities explicitly linked to a programme budget line"},
                  {label:"Pipeline currency",score:dataAccuracy.currency,hint:"Pipeline opportunities with an expected close date set"},
                ].map(m=>(
                  <div key={m.label} style={{marginBottom:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <span style={{...FS,fontSize:12,fontWeight:600,color:C.text}}>{m.label}</span>
                      <span style={{...FS,fontSize:13,fontWeight:700,color:m.score>=80?C.green:m.score>=50?C.amber:C.red}}>{m.score}%</span>
                    </div>
                    <div style={{...FS,fontSize:10.5,color:C.hint,marginBottom:5}}>{m.hint}</div>
                    <div style={{height:6,background:C.border,borderRadius:3,overflow:"hidden"}}>
                      <div style={{height:"100%",background:m.score>=80?C.green:m.score>=50?C.amber:C.red,width:m.score+"%",borderRadius:3,transition:"width 0.3s"}}></div>
                    </div>
                  </div>
                ))}
                {/* Issues */}
                {dataAccuracy.issues.length>0&&(
                  <div style={{marginTop:20}}>
                    <div style={{...FS,fontSize:12,fontWeight:600,color:C.text,marginBottom:10}}>Issues to address</div>
                    {dataAccuracy.issues.map((iss,i)=>(
                      <div key={i} style={{padding:"10px 12px",background:iss.level==="warn"?C.amberL:C.blueL,border:`1px solid ${iss.level==="warn"?C.amber:C.blue}30`,borderRadius:8,marginBottom:8,...FS,fontSize:11.5,color:iss.level==="warn"?"#7A5A1A":"#1B4F8A",lineHeight:1.6}}>
                        {iss.msg}
                      </div>
                    ))}
                  </div>
                )}
                {dataAccuracy.issues.length===0&&(
                  <div style={{padding:"12px",background:C.greenL,borderRadius:8,...FS,fontSize:12,color:C.greenT}}>No data quality issues detected. Portfolio data is well maintained.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME SCREEN — Intelligence briefing
// ─────────────────────────────────────────────────────────────────────────────
function HomeScreen({donors,pipeline,budgets,grants,touchpoints,tracks,weights,onNav,now=new Date()}){
  const actions=useMemo(()=>generateActions(donors,pipeline,budgets,grants,touchpoints,tracks,weights),[donors,pipeline,budgets,grants,touchpoints,tracks,weights]);
  const patterns=useMemo(()=>generatePatterns(donors,pipeline,budgets,grants,touchpoints),[donors,pipeline,budgets,grants,touchpoints]);
  const totalRequired=budgets.reduce((s,b)=>s+n(b.required),0);
  const totalWt=pipeline.reduce((s,o)=>s+wt(o),0);
  const fundingGap=Math.max(0,totalRequired-totalWt);
  const grantsAtRisk=grants.filter(g=>["Critical","High"].includes(assessBurn(g).level)).length;
  const coolingRels=donors.filter(d=>{const e=scoreEng(d.id,touchpoints);return e.overall<50&&e.overall>0;}).length;
  const confirmedPipe=pipeline.filter(p=>n(p.prob)>=90).reduce((s,p)=>s+n(p.amount),0);
  const hour=now.getHours();
  const dayNow=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][now.getDay()];

  const alerts=[];
  grants.forEach(g=>{
    if(!g.reportingDeadline)return;
    const days=daysFrom(g.reportingDeadline);
    if(days<0&&days>-14) alerts.push({type:"deadline",msg:`Report due in ${-days} days: ${g.programme} / ${g.donor}`,color:C.red,bg:C.redL,tab:"burn"});
    else if(days<0&&days>-30) alerts.push({type:"deadline",msg:`Report due in ${-days} days: ${g.programme} / ${g.donor}`,color:C.amber,bg:C.amberL,tab:"burn"});
  });
  donors.forEach(d=>{
    const e=scoreEng(d.id,touchpoints);
    if(e.overall<25&&e.daysSinceLast>60) alerts.push({type:"relationship",msg:`${d.name}: ${e.daysSinceLast} days without contact; engagement health ${e.overall}/100`,color:C.red,bg:C.redL,tab:"engagement"});
  });
  tracks.forEach(t=>{
    const s=trackStats(t);
    if(s.blocked) alerts.push({type:"activation",msg:`${t.donor} activation blocked: ${t.milestones.find(m=>m.status==="Blocked")?.label}`,color:C.red,bg:C.redL,tab:"activation"});
  });

  const ACTION_TAB={engagement:"engagement",pipeline:"pipeline",reporting:"burn",burn:"burn",activation:"activation"};
  const DEST_LABEL={engagement:"Open Engagement",pipeline:"Open Pipeline",reporting:"Open Burn Rate",burn:"Open Burn Rate",activation:"Open Activation"};

  return(
    <div>
      <div style={{marginBottom:24}}>
        <div style={{...F,fontSize:26,fontWeight:700,color:C.text,lineHeight:1.2,marginBottom:4}}>
          Good {hour<12?"morning":hour<17?"afternoon":"evening"}.
        </div>
        <div style={{...FS,fontSize:13,color:C.muted}}>
          {dayNow}, {now.toLocaleDateString("en",{day:"numeric",month:"long",year:"numeric"})} &nbsp;·&nbsp; Here is where your portfolio stands today.
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24}}>
        {[
          {label:"Weighted pipeline",val:fmt(totalWt),sub:`${pipeline.length} active opportunities`,col:C.green,dest:"pipeline",hint:"Open Pipeline"},
          {label:"Confirmed funding",val:fmt(confirmedPipe),sub:"Probability 90% or above",col:C.green,dest:"pipeline",hint:"Open Pipeline"},
          {label:"Funding gap",val:fmt(fundingGap),sub:"Against programme budgets",col:fundingGap>5000000?C.red:C.amber,dest:"gap",hint:"Open Gap Matrix"},
          {label:"Attention required",val:grantsAtRisk+coolingRels,sub:`${grantsAtRisk} grants at risk; ${coolingRels} relationships fading`,col:grantsAtRisk+coolingRels>3?C.red:C.amber,dest:"burn",hint:"Open Burn Rate",accent:true},
        ].map(m=>(
          <div key={m.label} onClick={()=>onNav(m.dest)}
            onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 18px rgba(0,0,0,0.12)";e.currentTarget.style.transform="translateY(-2px)";}}
            onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.transform="none";}}
            style={{background:m.accent?C.green:C.card,border:`1px solid ${m.accent?C.green:C.border}`,borderRadius:12,padding:"14px 16px",cursor:"pointer",transition:"box-shadow 0.15s,transform 0.12s",userSelect:"none"}}>
            <div style={{...FS,fontSize:10,color:m.accent?"rgba(255,255,255,0.6)":C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>{m.label}</div>
            <div style={{...F,fontSize:22,fontWeight:700,color:m.accent?"#fff":m.col||C.text,lineHeight:1.1}}>{m.val}</div>
            {m.sub&&<div style={{...FS,fontSize:11,color:m.accent?"rgba(255,255,255,0.7)":C.hint,marginTop:4}}>{m.sub}</div>}
            <div style={{...FS,fontSize:9.5,color:m.accent?"rgba(255,255,255,0.45)":C.hint,marginTop:7}}>{m.hint} ↗</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 360px",gap:16}}>
        <div>
          {/* ── PORTFOLIO PATTERNS — cross-item intelligence ──────── */}
          {patterns.length>0&&(
            <div style={{marginBottom:20}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <div style={{...F,fontSize:16,fontWeight:700,color:C.text}}>Portfolio Patterns</div>
                <div style={{...FS,fontSize:11,padding:"3px 10px",background:C.redL,borderRadius:20,fontWeight:600,color:C.red}}>Strategic attention required</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {patterns.map(p=>(
                  <div key={p.id} onClick={()=>onNav(p.destTab||"home")}
                    onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.10)";e.currentTarget.style.transform="translateY(-1px)";}}
                    onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.transform="none";}}
                    style={{background:p.bg,border:`1.5px solid ${p.color}40`,borderLeft:`4px solid ${p.color}`,borderRadius:10,padding:"13px 16px",cursor:"pointer",transition:"box-shadow 0.15s,transform 0.12s"}}>
                    <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:6}}>
                      <span style={{fontSize:16,flexShrink:0}}>{p.icon}</span>
                      <div style={{flex:1}}>
                        <div style={{...FS,fontSize:13,fontWeight:700,color:C.text,marginBottom:4}}>{p.title}</div>
                        <div style={{...FS,fontSize:11.5,color:"#3D3C38",lineHeight:1.6,marginBottom:8}}>{p.detail}</div>
                        <div style={{...FS,fontSize:11.5,fontWeight:600,color:p.color}}>Recommended response: {p.recommendation}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── THIS WEEK'S PRIORITIES ────────────────────────────── */}
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <div style={{...F,fontSize:17,fontWeight:700,color:C.text}}>This Week's Priorities</div>
            <div style={{...FS,fontSize:11,padding:"3px 10px",background:C.amberL,borderRadius:20,fontWeight:600,color:C.amber}}>Ranked by impact; click to act</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {actions.map((a,i)=>(
              <div key={a.id} onClick={()=>onNav(ACTION_TAB[a.type]||"pipeline")}
                onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 6px 20px rgba(0,0,0,0.10)";e.currentTarget.style.transform="translateY(-2px)";}}
                onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.transform="none";}}
                style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden",borderLeft:`4px solid ${a.urgencyColor}`,cursor:"pointer",transition:"box-shadow 0.15s,transform 0.12s"}}>
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
                          <span style={{...FS,fontSize:10.5,fontWeight:600,color:C.green}}> - &gt; </span>
                          <span style={{...FS,fontSize:11.5,fontWeight:600,color:C.green}}>{a.action}</span>
                        </div>
                        <span style={{...FS,fontSize:10,color:C.hint,padding:"2px 8px",background:"#F4F1EB",borderRadius:6}}>{DEST_LABEL[a.type]||"Open"} ↗</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {actions.length===0&&<div style={{...FS,fontSize:13,color:C.muted,padding:"2rem",textAlign:"center",background:C.card,border:`1px solid ${C.border}`,borderRadius:12}}>No priority actions identified: portfolio is in good shape.</div>}
          </div>

          {/* ── EXTERNAL FUNDING SIGNALS — ReliefWeb ─────────────── */}
          <ReliefWebSignals orgThemes={budgets.flatMap(b=>thArr(b)).filter((t,i,a)=>a.indexOf(t)===i)}/>
        </div>

        <div>
          {alerts.length>0&&(
            <div style={{marginBottom:16}}>
              <div style={{...FS,fontSize:12,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10}}>Alerts</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {alerts.slice(0,5).map((a,i)=>(
                  <div key={i} onClick={()=>onNav(a.tab||"burn")}
                    onMouseEnter={e=>e.currentTarget.style.opacity="0.85"}
                    onMouseLeave={e=>e.currentTarget.style.opacity="1"}
                    style={{padding:"10px 12px",background:a.bg,border:`1px solid ${a.color}30`,borderRadius:8,borderLeft:`3px solid ${a.color}`,cursor:"pointer",transition:"opacity 0.15s"}}>
                    <div style={{...FS,fontSize:11.5,color:a.color,lineHeight:1.5}}>{a.msg}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <Card>
            <div onClick={()=>onNav("pipeline")} style={{cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.opacity="0.92"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
              <CardHead title="Pipeline snapshot" right={<span style={{...FS,fontSize:11,color:C.green,fontWeight:600}}>View all ↗</span>}/>
              <div style={{padding:"12px 14px"}}>
                {Object.keys(ST).map(stage=>{
                  const opps=pipeline.filter(o=>o.stage===stage);
                  const val=opps.reduce((s,o)=>s+n(o.amount),0);
                  const s=ST[stage];
                  if(!opps.length)return null;
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
          <Card style={{marginTop:12}}>
            <div onClick={()=>onNav("engagement")} style={{cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.opacity="0.92"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
              <CardHead title="Engagement health" sub="Touchpoint quality and recency" right={<span style={{...FS,fontSize:11,color:C.green,fontWeight:600}}>View all ↗</span>}/>
              <div>
                {donors.slice(0,6).map(d=>{
                  const e=scoreEng(d.id,touchpoints);
                  const el=engLabel(e.overall);
                  return(
                    <div key={d.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 14px",borderBottom:`1px solid ${C.border}`}}>
                      <div style={{...FS,fontSize:12,fontWeight:600,color:C.text,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.name}</div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:60,height:3,background:C.border,borderRadius:2}}><div style={{height:"100%",background:el.bar,width:e.overall+"%",borderRadius:2}}></div></div>
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

// ─────────────────────────────────────────────────────────────────────────────
// RELIEFWEB SIGNALS — live funding opportunity intelligence
// ─────────────────────────────────────────────────────────────────────────────
function ReliefWebSignals({orgThemes=[]}) {
  const[signals,setSignals]=useState([]);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState(null);
  const[lastFetch,setLastFetch]=useState(null);
  const[open,setOpen]=useState(false);

  const fetchSignals=async()=>{
    setLoading(true);setError(null);
    try {
      const query=encodeURIComponent("call for proposals OR funding opportunity OR grant announcement OR open call");
      const url=`https://api.reliefweb.int/v1/reports?appname=proximis&query[value]=${query}&query[fields][]=title&limit=20&sort[]=date.created:desc&fields[include][]=title&fields[include][]=date.created&fields[include][]=source&fields[include][]=url&fields[include][]=body`;
      const res=await fetch(url);
      if(!res.ok) throw new Error("API unavailable");
      const data=await res.json();
      const items=(data.data||[]).map(item=>{
        const title=(item.fields?.title||"").toLowerCase();
        const body=(item.fields?.body||"").toLowerCase();
        const text=title+" "+body;
        const matched=orgThemes.filter(t=>text.includes(t.toLowerCase().split(" ")[0]));
        const relevance=matched.length;
        const source=Array.isArray(item.fields?.source)?item.fields.source[0]?.name:item.fields?.source?.name||"Unknown source";
        const dateStr=item.fields?.["date.created"]||item.fields?.date?.created||"";
        return {
          id:item.id,
          title:item.fields?.title||"Untitled",
          source,
          url:item.fields?.url||`https://reliefweb.int/report/${item.id}`,
          date:dateStr?new Date(dateStr).toLocaleDateString("en",{day:"numeric",month:"short",year:"numeric"}):"",
          relevance,
          matched,
        };
      });
      // Sort by relevance then date, show top 8
      const scored=items.sort((a,b)=>b.relevance-a.relevance).slice(0,8);
      setSignals(scored);
      setLastFetch(new Date());
    } catch(e) {
      setError("Unable to reach ReliefWeb. Check your connection or try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(()=>{fetchSignals();},[]);

  const highRelevance=signals.filter(s=>s.relevance>0).length;

  return(
    <div style={{marginTop:16}}>
      <div
        onClick={()=>setOpen(o=>!o)}
        style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",background:C.card,border:`1px solid ${C.border}`,borderRadius:open?"12px 12px 0 0":12,cursor:"pointer",userSelect:"none"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{...F,fontSize:14,fontWeight:700,color:C.text}}>External Funding Signals</div>
          {loading&&<span style={{...FS,fontSize:11,color:C.muted}}>Fetching from ReliefWeb...</span>}
          {!loading&&highRelevance>0&&<span style={{...FS,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:10,background:C.greenL,color:C.greenT}}>{highRelevance} relevant</span>}
          {!loading&&signals.length>0&&<span style={{...FS,fontSize:10,padding:"2px 8px",borderRadius:10,background:"#F3F4F6",color:C.muted}}>{signals.length} total</span>}
          {lastFetch&&<span style={{...FS,fontSize:10,color:C.hint}}>Updated {lastFetch.toLocaleTimeString("en",{hour:"2-digit",minute:"2-digit"})}</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={e=>{e.stopPropagation();fetchSignals();}} style={{...FS,background:"none",border:`1px solid ${C.border}`,borderRadius:6,padding:"3px 10px",fontSize:11,color:C.muted,cursor:"pointer"}}>Refresh</button>
          <span style={{...FS,fontSize:12,color:C.hint,display:"inline-block",transform:open?"rotate(180deg)":"none",transition:"transform 0.2s"}}>▾</span>
        </div>
      </div>
      {open&&(
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderTop:"none",borderRadius:"0 0 12px 12px",overflow:"hidden"}}>
          {error&&<div style={{padding:"14px 16px",...FS,fontSize:12,color:C.red}}>{error}</div>}
          {loading&&!error&&(
            <div style={{padding:"20px",textAlign:"center",...FS,fontSize:12,color:C.muted}}>Fetching latest funding calls from ReliefWeb...</div>
          )}
          {!loading&&!error&&signals.length===0&&(
            <div style={{padding:"14px 16px",...FS,fontSize:12,color:C.muted}}>No results returned. Try refreshing or check your connection.</div>
          )}
          {!loading&&signals.length>0&&(
            <>
              <div style={{padding:"10px 16px 4px",display:"flex",gap:8,alignItems:"center"}}>
                <span style={{...FS,fontSize:10.5,color:C.muted}}>Live data from</span>
                <a href="https://reliefweb.int" target="_blank" rel="noopener noreferrer" style={{...FS,fontSize:10.5,color:C.blue}}>ReliefWeb (OCHA)</a>
                <span style={{...FS,fontSize:10.5,color:C.muted}}>· Relevance scored against your programme themes</span>
              </div>
              {signals.map((s,i)=>(
                <div key={s.id} style={{padding:"11px 16px",borderTop:`1px solid ${C.border}`,display:"flex",alignItems:"flex-start",gap:10,background:s.relevance>0?"#FAFAF7":C.card}}>
                  {/* Relevance indicator */}
                  <div style={{width:28,height:28,borderRadius:"50%",background:s.relevance>0?C.greenL:"#F3F4F6",border:`2px solid ${s.relevance>0?C.green:C.hint}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                    <span style={{...FS,fontSize:10,fontWeight:700,color:s.relevance>0?C.green:C.hint}}>{s.relevance>0?s.relevance:"—"}</span>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer"
                      style={{...FS,fontSize:12.5,fontWeight:600,color:C.text,textDecoration:"none",display:"block",marginBottom:3,lineHeight:1.4}}
                      onMouseEnter={e=>e.target.style.color=C.blue}
                      onMouseLeave={e=>e.target.style.color=C.text}>
                      {s.title}
                    </a>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                      <span style={{...FS,fontSize:10.5,color:C.muted}}>{s.source}</span>
                      {s.date&&<span style={{...FS,fontSize:10.5,color:C.hint}}>{s.date}</span>}
                      {s.matched.length>0&&s.matched.slice(0,3).map(t=>(
                        <span key={t} style={{...FS,fontSize:9.5,padding:"1px 6px",borderRadius:4,background:C.blueL,color:C.blue,fontWeight:600}}>{t}</span>
                      ))}
                    </div>
                    {s.relevance>0&&(
                      <div style={{...FS,fontSize:11,color:C.greenT,marginTop:4}}>Matches {s.matched.length} of your programme theme{s.matched.length>1?"s":""}: {s.matched.join(", ")}. Review for portfolio relevance.</div>
                    )}
                  </div>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" style={{...FS,fontSize:10,color:C.blue,textDecoration:"none",whiteSpace:"nowrap",marginTop:2}}>View ↗</a>
                </div>
              ))}
              <div style={{padding:"10px 16px",borderTop:`1px solid ${C.border}`,background:"#FAFAF7"}}>
                <span style={{...FS,fontSize:10.5,color:C.hint}}>Showing up to 8 most relevant results. Signals with a match score are directly relevant to your programme themes. Visit ReliefWeb for the full funding landscape.</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DONOR MAP
// ─────────────────────────────────────────────────────────────────────────────
function DonorMap({donors,setDonors,pipeline,setPipeline,touchpoints,budgets,tagLib,weights}){
  const[showF,setShowF]=useState(false);const[editId,setEditId]=useState(null);const[form,setForm]=useState({});
  const[search,setSearch]=useState("");const[fType,setFType]=useState("");const[fPri,setFPri]=useState("");
  const[expanded,setExpanded]=useState({});

  const orgThemes=useMemo(()=>[...new Set(budgets.flatMap(b=>thArr(b)))],[budgets]);

  const scored=donors.map(d=>({...d,sc:dScore(d,orgThemes,weights),eng:scoreEng(d.id,touchpoints)}));
  const filtered=scored
    .filter(d=>(!search||(d.name||"").toLowerCase().includes(search.toLowerCase())||(d.geo||"").toLowerCase().includes(search.toLowerCase()))
      &&(!fType||d.type===fType)
      &&(!fPri||(fPri==="h"?d.sc>=70:fPri==="m"?(d.sc>=40&&d.sc<70):d.sc<40)))
    .sort((a,b)=>b.sc-a.sc);

  const high=scored.filter(d=>d.sc>=70).length;
  const warm=scored.filter(d=>["Warm","Active","Strategic"].includes(d.relationship)).length;

  function openF(id){
    const d=id?donors.find(x=>x.id===id):null;
    setForm(d?{...d,themes:thArr(d),instruments:d.instruments||[],contacts:d.contacts||[]}:{name:"",type:"Bilateral",relationship:"Warm",grantMin:"",grantMax:"",themes:[],instruments:[],geo:"",cycle:"",contacts:[],notes:""});
    setEditId(id||null);setShowF(true);
  }
  function saveF(){
    if(!form.name)return;
    const rec={...form,id:editId||String(Date.now()),grantMin:n(form.grantMin),grantMax:n(form.grantMax),themes:form.themes||[],instruments:form.instruments||[],contacts:form.contacts||[]};
    if(editId)setDonors(ds=>ds.map(d=>d.id===editId?rec:d));else setDonors(ds=>[...ds,rec]);
    setShowF(false);setEditId(null);
  }
  function push(id){
    const d=donors.find(x=>x.id===id);if(!d)return;
    setPipeline(p=>[...p,{id:String(Date.now()),name:d.name+" new opportunity",donor:d.name,amount:n(d.grantMax)||n(d.grantMin)||0,stage:"Prospect",prob:10,date:d.cycle||"",themes:thArr(d),programmeId:"",notes:"Via Donor Map"}]);
  }
  function addContact(){setForm(f=>({...f,contacts:[...(f.contacts||[]),{id:String(Date.now()),name:"",title:"",email:"",prevOrgs:"",notes:""}]}));}
  function updateContact(idx,field,val){setForm(f=>({...f,contacts:f.contacts.map((c,i)=>i===idx?{...c,[field]:val}:c)}));}
  function removeContact(idx){setForm(f=>({...f,contacts:f.contacts.filter((_,i)=>i!==idx)}));}

  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[
          {l:"Donors mapped",v:donors.length,s:"Total in intelligence database",c:C.text},
          {l:"High priority",v:high,s:"Alignment score 70 or above",c:C.green},
          {l:"Partnership warm or above",v:warm,s:"Warm, Active, or Strategic status",c:C.green},
          {l:"In pipeline",v:donors.filter(d=>pipeline.some(p=>p.donor===d.name)).length,s:"Pushed as opportunities",c:C.text},
        ].map(m=>(
          <div key={m.l} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px"}}>
            <div style={{...FS,fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>{m.l}</div>
            <div style={{...F,fontSize:22,fontWeight:700,color:m.c}}>{m.v}</div>
            <div style={{...FS,fontSize:11,color:C.hint,marginTop:4}}>{m.s}</div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or geography..." style={{...inp,flex:1,minWidth:180}}/>
        <select value={fType} onChange={e=>setFType(e.target.value)} style={{...inp,width:"auto"}}><option value="">All types</option>{DONOR_TYPES.map(t=><option key={t}>{t}</option>)}</select>
        <select value={fPri} onChange={e=>setFPri(e.target.value)} style={{...inp,width:"auto"}}><option value="">All priorities</option><option value="h">High (70+)</option><option value="m">Medium (40-69)</option><option value="l">Low (below 40)</option></select>
        <button onClick={()=>openF(null)} style={btn("add")}>+ Add donor</button>
      </div>

      {showF&&(
        <Card style={{marginBottom:16}}>
          <CardHead title={editId?"Edit donor profile":"New donor profile"}/>
          <div style={{padding:"14px 16px"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              <FR full><L>Donor name</L><input value={form.name||""} onChange={e=>setForm(p=>({...p,name:e.target.value}))} style={inp} placeholder="e.g. UK FCDO"/></FR>
              <FR><L>Donor type</L><select value={form.type||"Bilateral"} onChange={e=>setForm(p=>({...p,type:e.target.value}))} style={inp}>{DONOR_TYPES.map(o=><option key={o}>{o}</option>)}</select></FR>
              <FR><L>Partnership status</L>
                <select value={form.relationship||"Warm"} onChange={e=>setForm(p=>({...p,relationship:e.target.value}))} style={inp}>{RELATIONSHIPS.map(o=><option key={o}>{o}</option>)}</select>
                <div style={{...FS,fontSize:10,color:C.hint,marginTop:2}}>Partnership status describes the nature of the formal relationship. Engagement health (shown in Engagement tab) is separate and tracks touchpoint quality.</div>
              </FR>
              <FR><L>Grant minimum (USD)</L><input type="number" value={form.grantMin||""} onChange={e=>setForm(p=>({...p,grantMin:e.target.value}))} style={inp}/></FR>
              <FR><L>Grant maximum (USD)</L><input type="number" value={form.grantMax||""} onChange={e=>setForm(p=>({...p,grantMax:e.target.value}))} style={inp}/></FR>
              <FR><L>Next funding cycle</L><input type="month" value={form.cycle||""} onChange={e=>setForm(p=>({...p,cycle:e.target.value}))} style={inp}/></FR>
              <FR><L>Geography</L><input value={form.geo||""} onChange={e=>setForm(p=>({...p,geo:e.target.value}))} style={inp}/></FR>
              <TagSelector label="Thematic priorities" options={tagLib.themes} selected={form.themes||[]} onChange={v=>setForm(p=>({...p,themes:v}))} hint="Select all themes this donor funds. Scored against your programme themes for alignment."/>
              <div style={{gridColumn:"span 2"}}>
                <L>Funding instruments</L>
                <div style={{...FS,fontSize:10.5,color:C.hint,marginBottom:6,marginTop:2}}>Instruments describe how this donor deploys capital. Scored separately from thematic alignment and not conflated with themes.</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:4}}>
                  {tagLib.instruments.map(i=>(
                    <label key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,cursor:"pointer",...FS}}>
                      <input type="checkbox" checked={(form.instruments||[]).includes(i)} onChange={e=>setForm(p=>({...p,instruments:e.target.checked?[...(p.instruments||[]),i]:(p.instruments||[]).filter(x=>x!==i)}))} style={{width:"auto",margin:0}}/>{i}
                    </label>
                  ))}
                </div>
              </div>
              <FR full><L>Intelligence notes</L><input value={form.notes||""} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} style={inp} placeholder="Funding signals, strategy shifts, relationship notes"/></FR>
            </div>
            <div style={{borderTop:`1px solid ${C.border}`,paddingTop:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{...FS,fontSize:11,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:"0.05em"}}>Key contacts</div>
                <button onClick={addContact} style={btn("add",{fontSize:11,padding:"4px 12px"})}>+ Add contact</button>
              </div>
              {(form.contacts||[]).map((c,idx)=>(
                <div key={c.id} style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,padding:"10px",background:"#FAFAF7",borderRadius:8,marginBottom:8,border:`1px solid ${C.border}`}}>
                  {[{k:"name",l:"Full name"},{k:"title",l:"Title / role"},{k:"email",l:"Email address"},{k:"prevOrgs",l:"Previous organisations"}].map(f=>(
                    <FR key={f.k}><L>{f.l}</L><input value={c[f.k]||""} onChange={e=>updateContact(idx,f.k,e.target.value)} style={{...inp,fontSize:12}}/></FR>
                  ))}
                  <FR full><L>Notes on this contact</L><input value={c.notes||""} onChange={e=>updateContact(idx,"notes",e.target.value)} style={{...inp,fontSize:12}} placeholder="Relationship history, communication preferences"/></FR>
                  <div style={{gridColumn:"span 2",textAlign:"right"}}><button onClick={()=>removeContact(idx)} style={btn("del",{fontSize:11,padding:"4px 12px"})}>Remove</button></div>
                </div>
              ))}
              {!(form.contacts||[]).length&&<div style={{...FS,fontSize:12,color:C.hint}}>No contacts added. At least one key contact is recommended.</div>}
            </div>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"12px 16px",borderTop:`1px solid ${C.border}`}}>
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
          const sc=d.sc;const priC=sc>=70?C.green:sc>=40?C.amber:C.hint;
          const el=engLabel(d.eng.overall);
          const isOpen=expanded[d.id];
          const pushed=pipeline.some(p=>p.donor===d.name);
          return(
            <div key={d.id} style={{borderBottom:i<filtered.length-1?`1px solid ${C.border}`:"none"}}>
              <div style={{display:"flex",alignItems:"center",gap:12,padding:"11px 16px",cursor:"pointer",background:isOpen?"#FAFAF7":C.card,transition:"background 0.1s"}}
                onClick={()=>setExpanded(e=>({...e,[d.id]:!e[d.id]}))}>
                <div style={{width:38,height:38,borderRadius:"50%",background:priC+"18",border:`2px solid ${priC}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <span style={{...FS,fontSize:12,fontWeight:700,color:priC,lineHeight:1}}>{sc}</span>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3,flexWrap:"wrap"}}>
                    <span style={{...FS,fontSize:13,fontWeight:600,color:C.text}}>{d.name}</span>
                    <Pill label={d.type} bg={tc.bg} tx={tc.tx}/>
                    <Pill label={"Partnership: "+d.relationship} bg={rc.bg} tx={rc.tx}/>
                  </div>
                  <div style={{...FS,fontSize:11,color:C.muted}}>{d.geo||"Geography not set"} · {n(d.grantMin)||n(d.grantMax)?fmt(n(d.grantMin))+" to "+fmt(n(d.grantMax)):"Grant range not set"}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                  <Pill label={sc>=70?"High priority":sc>=40?"Medium":"Low"} bg={priC+"18"} tx={priC}/>
                  <Pill label={"Health: "+el.label} bg={el.bg} tx={el.tx}/>
                  <span style={{...FS,fontSize:13,color:C.hint}}>{isOpen?"▲":"▼"}</span>
                </div>
              </div>
              {isOpen&&(
                <div style={{padding:"12px 16px 14px 72px",background:"#FAFAF7",borderTop:`1px solid ${C.border}`}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                    <div>
                      <div style={{...FS,fontSize:10.5,color:C.muted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:5}}>Thematic priorities</div>
                      <div>{thArr(d).map(t=><span key={t} style={{display:"inline-block",fontSize:10,padding:"2px 7px",borderRadius:4,background:C.blueL,color:C.blue,margin:"1px",...FS}}>{t}</span>)}</div>
                      <div style={{...FS,fontSize:10.5,color:C.muted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:5,marginTop:10}}>Funding instruments</div>
                      <div>{(d.instruments||[]).map(i=><span key={i} style={{display:"inline-block",fontSize:10,padding:"2px 7px",borderRadius:4,background:C.amberL,color:C.amber,margin:"1px",...FS}}>{i}</span>)}</div>
                    </div>
                    <div>
                      <div style={{...FS,fontSize:10.5,color:C.muted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:5}}>Key contacts</div>
                      {(d.contacts||[]).slice(0,2).map(c=>(
                        <div key={c.id} style={{...FS,fontSize:12,color:C.text,lineHeight:1.6}}>{c.name}{c.title?", "+c.title:""}{c.email?<span style={{color:C.muted}}> ({c.email})</span>:null}</div>
                      ))}
                      {!(d.contacts||[]).length&&<div style={{...FS,fontSize:12,color:C.hint}}>No contacts recorded</div>}
                      <div style={{...FS,fontSize:10.5,color:C.muted,textTransform:"uppercase",letterSpacing:"0.05em",marginTop:10,marginBottom:2}}>Next funding cycle</div>
                      <div style={{...FS,fontSize:12,color:C.text}}>{d.cycle||"Not set"}</div>
                    </div>
                  </div>
                  {d.notes&&<div style={{...FS,fontSize:11.5,color:C.muted,lineHeight:1.6,padding:"8px 12px",background:C.card,borderRadius:8,border:`1px solid ${C.border}`,marginBottom:10}}>{d.notes}</div>}
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={e=>{e.stopPropagation();openF(d.id);}} style={btn("edit")}>Edit</button>
                    <button onClick={e=>{e.stopPropagation();setDonors(ds=>ds.filter(x=>x.id!==d.id));}} style={btn("del")}>Delete</button>
                    <button onClick={e=>{e.stopPropagation();push(d.id);}} style={{...btn("add"),marginLeft:"auto"}}>Push to pipeline</button>
                    {pushed&&<span style={{...FS,fontSize:11,color:C.green,alignSelf:"center"}}>In pipeline</span>}
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

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE
// ─────────────────────────────────────────────────────────────────────────────
function PipelineTab({pipeline,setPipeline,budgets,tagLib}){
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

  function openF(id){
    const o=id?pipeline.find(x=>x.id===id):null;
    setForm(o?{...o,themes:thArr(o)}:{name:"",donor:"",amount:"",stage:"Prospect",prob:10,date:"",themes:[],programmeId:"",notes:""});
    setEditId(id||null);setShowF(true);
  }
  function saveF(){
    if(!form.name||!form.donor||!form.amount)return;
    const rec={...form,id:editId||String(Date.now()),amount:n(form.amount),prob:Math.min(100,Math.max(0,n(form.prob))),themes:form.themes||[]};
    if(editId)setPipeline(ps=>ps.map(p=>p.id===editId?rec:p));else setPipeline(ps=>[...ps,rec]);
    setShowF(false);setEditId(null);
  }

  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[
          {l:"Total pipeline",v:fmt(total),s:"Gross value, all stages",c:C.text},
          {l:"Weighted forecast",v:fmt(wtotal),s:"Probability-adjusted",c:C.green},
          {l:"Opportunities",v:pipeline.length,s:`Across ${dcount} donors`,c:C.text},
          {l:"Weighted probability",v:pct(wtotal,total)+"%",s:"Value-weighted average",c:C.text},
        ].map(m=>(
          <div key={m.l} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px"}}>
            <div style={{...FS,fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>{m.l}</div>
            <div style={{...F,fontSize:22,fontWeight:700,color:m.c}}>{m.v}</div>
            <div style={{...FS,fontSize:11,color:C.hint,marginTop:4}}>{m.s}</div>
          </div>
        ))}
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
          <div style={{...FS,fontSize:11,color:C.muted,textTransform:"uppercase",fontWeight:600,letterSpacing:"0.05em",marginBottom:12}}>12-month forecast ($M) from {TODAY.toLocaleDateString("en",{month:"short",year:"numeric"})}</div>
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
              <FR full><L>Opportunity name</L><input value={form.name||""} onChange={e=>setForm(p=>({...p,name:e.target.value}))} style={inp}/></FR>
              <FR><L>Donor</L><input value={form.donor||""} onChange={e=>setForm(p=>({...p,donor:e.target.value}))} style={inp}/></FR>
              <FR><L>Amount (USD)</L><input type="number" value={form.amount||""} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} style={inp}/></FR>
              <FR><L>Stage</L><select value={form.stage||"Prospect"} onChange={e=>{const pp=ST[e.target.value]?.p||10;setForm(f=>({...f,stage:e.target.value,prob:pp}));}} style={inp}>{PIPE_STAGES.map(s=><option key={s}>{s}</option>)}</select></FR>
              <FR><L>Probability %</L><input type="number" min="0" max="100" value={form.prob||10} onChange={e=>setForm(p=>({...p,prob:e.target.value}))} style={inp}/></FR>
              <FR><L>Expected close</L><input type="month" value={form.date||""} onChange={e=>setForm(p=>({...p,date:e.target.value}))} style={inp}/></FR>
              <FR full>
                <L>Linked programme</L>
                <div style={{...FS,fontSize:10.5,color:C.hint,marginBottom:4}}>Linking an opportunity to a specific programme ensures the gap matrix credits funding to the correct programme, not just to any programme sharing a similar theme.</div>
                <select value={form.programmeId||""} onChange={e=>setForm(p=>({...p,programmeId:e.target.value}))} style={inp}>
                  <option value="">Not linked to a programme yet</option>
                  {budgets.map(b=><option key={b.id} value={b.id}>{b.programme}</option>)}
                </select>
              </FR>
              <TagSelector label="Thematic areas" options={tagLib.themes} selected={form.themes||[]} onChange={v=>setForm(p=>({...p,themes:v}))}/>
              <FR full><L>Notes</L><input value={form.notes||""} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} style={inp}/></FR>
              {form.amount&&form.prob&&(
                <div style={{gridColumn:"span 2",padding:"8px 12px",background:C.greenL,borderRadius:8,...FS,fontSize:12}}>
                  Weighted value: <strong style={{color:C.green}}>{fmt(n(form.amount)*n(form.prob)/100)}</strong>
                  {form.programmeId&&<span style={{color:C.muted,marginLeft:12}}>Linked to: {budgets.find(b=>b.id===form.programmeId)?.programme}</span>}
                </div>
              )}
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
              {[["18%","Opportunity"],["11%","Donor"],["9%","Amount"],["12%","Stage"],["11%","Probability"],["9%","Weighted"],["8%","Close"],["11%","Programme"],["11%","Actions"]].map(([w,h])=>(
                <th key={h} style={{textAlign:"left",padding:"9px 10px",fontSize:10,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:"0.05em",width:w,...FS}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{list.map(o=>{
              const s=ST[o.stage]||ST["Prospect"];
              const label=o.stage==="Concept Note Submitted"?"Concept Note":o.stage==="Under Negotiation"?"Negotiation":o.stage;
              const linkedProg=o.programmeId?budgets.find(b=>b.id===o.programmeId):null;
              return(
                <tr key={o.id} style={{borderBottom:`1px solid ${C.border}`}}>
                  <td style={{padding:"10px 10px",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:C.text}} title={o.name}>{o.name}</td>
                  <td style={{padding:"10px 10px",color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.donor}</td>
                  <td style={{padding:"10px 10px"}}>{fmt(n(o.amount))}</td>
                  <td style={{padding:"10px 10px"}}><Pill label={label} bg={s.bg} tx={s.tx}/></td>
                  <td style={{padding:"10px 10px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <span style={{fontSize:11,minWidth:26}}>{Math.round(n(o.prob))}%</span>
                      <div style={{flex:1,height:3,background:C.border,borderRadius:2}}><div style={{height:"100%",borderRadius:2,background:s.c,width:Math.round(n(o.prob))+"%"}}></div></div>
                    </div>
                  </td>
                  <td style={{padding:"10px 10px",color:C.green,fontWeight:600}}>{fmt(Math.round(wt(o)))}</td>
                  <td style={{padding:"10px 10px",color:C.muted}}>{o.date||"n/a"}</td>
                  <td style={{padding:"10px 10px"}}>
                    {linkedProg
                      ?<span style={{...FS,fontSize:10,padding:"2px 6px",borderRadius:4,background:C.greenL,color:C.greenT,fontWeight:600}}>{linkedProg.programme.length>14?linkedProg.programme.slice(0,12)+"...":linkedProg.programme}</span>
                      :<span style={{...FS,fontSize:10,color:C.hint}}>Unlinked</span>}
                  </td>
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

// ─────────────────────────────────────────────────────────────────────────────
// GAP MATRIX
// ─────────────────────────────────────────────────────────────────────────────
function GapMatrix({pipeline,budgets,setBudgets,donors,tagLib,weights}){
  const[showF,setShowF]=useState(false);const[editId,setEditId]=useState(null);const[form,setForm]=useState({});
  const orgThemes=useMemo(()=>[...new Set(budgets.flatMap(b=>thArr(b)))],[budgets]);

  const totalReq=budgets.reduce((s,b)=>s+n(b.required),0);
  let totalConf=0,totalWtG=0;
  budgets.forEach(b=>{const c=calcGap(b,pipeline);totalConf+=c.conf;totalWtG+=c.wt;});

  const chartData=budgets.map(b=>{
    const req=n(b.required),c=calcGap(b,pipeline);
    const conf=Math.min(c.conf,req),prob=Math.min(c.prob,Math.max(0,req-conf)),gap=Math.max(0,req-conf-prob);
    return{name:b.programme.length>14?b.programme.slice(0,12)+"...":b.programme,Confirmed:toM(conf),Probable:toM(prob),Gap:toM(gap)};
  });

  function openF(id){
    const b=id?budgets.find(x=>x.id===id):null;
    setForm(b?{...b,themes:thArr(b)}:{programme:"",themes:[],required:"",period:"2026",notes:""});
    setEditId(id||null);setShowF(true);
  }
  function saveF(){
    if(!form.programme||!form.required)return;
    const rec={...form,id:editId||String(Date.now()),required:n(form.required),themes:form.themes||[]};
    if(editId)setBudgets(bs=>bs.map(b=>b.id===editId?rec:b));else setBudgets(bs=>[...bs,rec]);
    setShowF(false);setEditId(null);
  }

  const matchDonors=(b,gapAmt)=>donors.map(d=>{
    const dt=thArr(d),bt=thArr(b);
    const thMatch=dt.some(t=>bt.includes(t));
    const grantFit=n(d.grantMax)>=gapAmt*0.3;
    const coverPct=n(d.grantMax)>0?Math.min(100,Math.round((n(d.grantMax)/gapAmt)*100)):0;
    const sc=dScore(d,orgThemes||[],weights);
    return{...d,sc,thMatch,coverPct,grantFit};
  }).filter(d=>d.thMatch&&d.grantFit).sort((a,b)=>b.sc-a.sc);

  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[
          {l:"Total required",v:fmt(totalReq),s:"All programme budgets",c:C.text},
          {l:"Confirmed",v:fmt(totalConf),s:"Secured funding",c:C.green},
          {l:"Weighted forecast",v:fmt(totalWtG),s:"Pipeline probable",c:C.amber},
          {l:"Funding gap",v:fmt(Math.max(0,totalReq-totalWtG)),s:"Still to mobilise",c:C.red},
        ].map(m=>(
          <div key={m.l} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px"}}>
            <div style={{...FS,fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>{m.l}</div>
            <div style={{...F,fontSize:22,fontWeight:700,color:m.c}}>{m.v}</div>
            <div style={{...FS,fontSize:11,color:C.hint,marginTop:4}}>{m.s}</div>
          </div>
        ))}
      </div>
      <Card style={{padding:"14px 16px",marginBottom:16}}>
        <div style={{...FS,fontSize:11,color:C.muted,textTransform:"uppercase",fontWeight:600,letterSpacing:"0.05em",marginBottom:8}}>Funding gap by programme ($M)</div>
        <div style={{display:"flex",gap:14,marginBottom:10}}>{[[C.green,"Confirmed"],[C.amber,"Weighted probable"],["#E57370","Remaining gap"]].map(([c,l])=><span key={l} style={{display:"flex",alignItems:"center",gap:5,...FS,fontSize:11,color:C.muted}}><span style={{width:10,height:10,borderRadius:2,background:c,display:"inline-block"}}></span>{l}</span>)}</div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} layout="vertical" margin={{top:4,right:4,bottom:4,left:10}}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)"/>
            <XAxis type="number" tick={{fontSize:9,...FS}} tickFormatter={v=>v>0?"$"+v+"M":0}/>
            <YAxis type="category" dataKey="name" tick={{fontSize:10,...FS}} width={95}/>
            <Tooltip formatter={(v,name)=>[v>0?"$"+v+"M":"n/a",name]} contentStyle={{...FS,fontSize:11,borderRadius:8,border:`1px solid ${C.border}`}}/>
            <Bar dataKey="Confirmed" fill={C.green} stackId="a"/>
            <Bar dataKey="Probable"  fill={C.amber}  stackId="a"/>
            <Bar dataKey="Gap"       fill="#E57370"  stackId="a" radius={[0,4,4,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Card style={{marginBottom:16}}>
        <CardHead title="Programme budget lines" right={<button onClick={()=>openF(null)} style={btn("add")}>+ Add programme</button>}/>
        {showF&&(
          <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,background:"#FAFAF7"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <FR full><L>Programme name</L><input value={form.programme||""} onChange={e=>setForm(p=>({...p,programme:e.target.value}))} style={inp}/></FR>
              <FR><L>Budget required (USD)</L><input type="number" value={form.required||""} onChange={e=>setForm(p=>({...p,required:e.target.value}))} style={inp}/></FR>
              <FR><L>Period</L><input value={form.period||"2026"} onChange={e=>setForm(p=>({...p,period:e.target.value}))} style={inp}/></FR>
              <TagSelector label="Thematic areas (select all that apply)" options={tagLib.themes} selected={form.themes||[]} onChange={v=>setForm(p=>({...p,themes:v}))} hint="Multiple themes can be selected. Pipeline opportunities are matched against all of them."/>
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
            {[["18%","Programme"],["14%","Themes"],["9%","Required"],["9%","Confirmed"],["9%","Weighted"],["8%","Gap"],["12%","Coverage"],["8%","Linked"],["13%","Actions"]].map(([w,h])=>(
              <th key={h} style={{textAlign:"left",padding:"9px 10px",fontSize:10,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:"0.05em",width:w,...FS}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{budgets.map(b=>{
            const req=n(b.required),c=calcGap(b,pipeline),gap=Math.max(0,req-c.wt);
            const gp=pct(gap,req),cp=pct(Math.min(c.conf,req),req),pp2=pct(Math.min(c.prob,Math.max(0,req-c.conf)),req);
            const st=gp<=10?{bg:C.greenL,tx:C.greenT,l:"Well funded"}:gp<=50?{bg:C.amberL,tx:"#7A5A1A",l:"Partial gap"}:{bg:C.redL,tx:"#9B2B24",l:"Critical gap"};
            return(
              <tr key={b.id} style={{borderBottom:`1px solid ${C.border}`}}>
                <td style={{padding:"10px 10px",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:C.text}} title={b.programme}>{b.programme}</td>
                <td style={{padding:"10px 10px"}}>
                  <div style={{display:"flex",flexWrap:"wrap",gap:2}}>
                    {thArr(b).map(t=><span key={t} style={{fontSize:9,padding:"1px 5px",borderRadius:3,background:C.blueL,color:C.blue,...FS}}>{t}</span>)}
                  </div>
                </td>
                <td style={{padding:"10px 10px"}}>{fmt(req)}</td>
                <td style={{padding:"10px 10px",color:C.green,fontWeight:600}}>{fmt(c.conf)}</td>
                <td style={{padding:"10px 10px",color:C.amber,fontWeight:600}}>{fmt(c.wt)}</td>
                <td style={{padding:"10px 10px",color:C.red,fontWeight:600}}>{gap>0?fmt(gap):"n/a"}</td>
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
                <td style={{padding:"10px 10px"}}>
                  <span style={{...FS,fontSize:11,color:c.linkedCount>0?C.green:C.hint,fontWeight:600}}>{c.linkedCount}</span>
                  <span style={{...FS,fontSize:10,color:C.hint}}> linked</span>
                </td>
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

        <Collapsible title="Base scenario: what each programme has to work with" badge="Planning" badgeBg={C.greenL} badgeTx={C.greenT}>
          {budgets.map(b=>{
            const req=n(b.required),c=calcScen(b,pipeline);
            const base=Math.min(c.base,req);const basePct=pct(base,req);
            const statusCol=basePct>=95?C.green:basePct>=70?C.amber:C.red;
            return(
              <div key={b.id} style={{padding:"12px 14px",border:`1px solid ${C.border}`,borderRadius:10,marginBottom:8,background:C.card}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div>
                    <div style={{...FS,fontSize:13,fontWeight:600,color:C.text,marginBottom:4}}>{b.programme}</div>
                    <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{thArr(b).map(t=><span key={t} style={{fontSize:9,padding:"1px 5px",borderRadius:3,background:C.blueL,color:C.blue,...FS}}>{t}</span>)}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{...F,fontSize:18,fontWeight:700,color:C.green}}>{fmt(base)}</div>
                    <div style={{...FS,fontSize:10.5,color:statusCol,fontWeight:600}}>{basePct>=95?"Fully funded":basePct>=70?"Partially funded":"Underfunded"}</div>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:8}}>
                  {[{l:"Conservative",v:Math.min(c.conservative,req),c:C.blue},{l:"Base",v:base,c:C.green},{l:"Optimistic",v:Math.min(c.optimistic,req),c:C.amber}].map(s=>(
                    <div key={s.l} style={{textAlign:"center",background:"#FAFAF7",borderRadius:8,padding:"8px 4px"}}>
                      <div style={{...FS,fontSize:9.5,color:C.muted,marginBottom:3}}>{s.l}</div>
                      <div style={{...FS,fontSize:13.5,fontWeight:700,color:s.c}}>{fmt(s.v)}</div>
                    </div>
                  ))}
                </div>
                <div style={{height:5,background:C.border,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",background:C.green,width:Math.min(basePct,100)+"%",borderRadius:3}}></div></div>
              </div>
            );
          })}
        </Collapsible>

        <Collapsible title="Gap priorities: ranked donor mobilisation focus" badge={`${budgets.filter(b=>Math.max(0,n(b.required)-calcGap(b,pipeline).wt)>0).length} active gaps`} badgeBg={C.redL} badgeTx={C.red}>
          {budgets.map(b=>{
            const req=n(b.required),c=calcGap(b,pipeline),gap=Math.max(0,req-c.wt);
            if(gap<=0)return null;
            const matched=matchDonors(b,gap);
            return(
              <div key={b.id} style={{marginBottom:18}}>
                <div style={{marginBottom:10}}>
                  <div style={{...FS,fontSize:13,fontWeight:700,color:C.text,marginBottom:2}}>{b.programme}</div>
                  <div style={{...FS,fontSize:11.5,color:C.muted}}>Themes: {thArr(b).join(", ")} · Gap: <strong style={{color:C.red}}>{fmt(gap)}</strong> of {fmt(req)}</div>
                </div>
                {matched.length===0&&<div style={{...FS,fontSize:11.5,color:C.muted,fontStyle:"italic"}}>No mapped donors match these themes with sufficient grant capacity. Add relevant donors in Donor Map.</div>}
                {matched.slice(0,4).map((d,i)=>{
                  const relC=RC[d.relationship]||{bg:"#F3F4F6",tx:C.muted};
                  const canCover=d.coverPct>=80?"can fully cover the gap":d.coverPct>=40?"can cover "+d.coverPct+"% of gap":"partial contribution: "+d.coverPct+"% of gap";
                  const priority=["Priority 1: approach immediately","Priority 2: this quarter","Priority 3: next quarter","Priority 4: monitor"][Math.min(i,3)];
                  const urgCol=[C.red,C.amber,C.blue,C.muted][Math.min(i,3)];
                  const relAction=d.relationship==="Active"||d.relationship==="Strategic"?"approach directly for a substantive conversation":d.relationship==="Warm"?"request a meeting this month":d.relationship==="Cold"?"prepare a strong introductory hook before any outreach":"build the relationship before making any ask";
                  return(
                    <div key={d.id} style={{padding:"11px 14px",background:i===0?"#FAFAF7":C.card,border:`1px solid ${C.border}`,borderRadius:10,marginBottom:8}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                        <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
                          <span style={{...FS,fontSize:10,fontWeight:700,color:urgCol,padding:"2px 8px",borderRadius:8,background:urgCol+"18"}}>{priority}</span>
                          <span style={{...FS,fontSize:13,fontWeight:700,color:C.text}}>{d.name}</span>
                          <Pill label={d.type} bg={TC[d.type]?.bg||"#F3F4F6"} tx={TC[d.type]?.tx||C.muted}/>
                          <Pill label={"Partnership: "+d.relationship} bg={relC.bg} tx={relC.tx}/>
                        </div>
                        <span style={{...FS,fontSize:12,fontWeight:700,color:d.sc>=70?C.green:d.sc>=40?C.amber:C.hint}}>{d.sc}/100</span>
                      </div>
                      <div style={{...FS,fontSize:11.5,color:"#3D3C38",lineHeight:1.7}}>
                        <strong>Thematic fit:</strong> funds {thArr(b).filter(t=>thArr(d).includes(t)).join(", ")||"related areas"}. <strong>Grant capacity:</strong> up to {fmt(n(d.grantMax))}; {canCover}. <strong>Partnership status:</strong> {d.relationship}; {relAction}. <strong>Alignment score:</strong> {d.sc}/100.
                      </div>
                      {d.contacts&&d.contacts[0]&&d.contacts[0].name&&!d.contacts[0].name.startsWith("TBD")&&<div style={{...FS,fontSize:11,color:C.muted,marginTop:5}}>Contact: <strong style={{color:C.text}}>{d.contacts[0].name}{d.contacts[0].title?", "+d.contacts[0].title:""}</strong></div>}
                    </div>
                  );
                })}
              </div>
            );
          }).filter(Boolean)}
        </Collapsible>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BURN RATE
// ─────────────────────────────────────────────────────────────────────────────
function BurnRate({grants,setGrants}){
  const[sel,setSel]=useState(grants[0]?.id);const[showF,setShowF]=useState(false);const[editId,setEditId]=useState(null);const[form,setForm]=useState({});
  const selected=grants.find(g=>g.id===sel)||grants[0];
  const selRisk=selected?assessBurn(selected):{level:"Low",label:"On track",bg:C.greenL,tx:C.greenT,bar:C.green};
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
  const barD=grants.map(g=>({name:g.programme.length>16?g.programme.slice(0,14)+"...":g.programme,"Absorption rate":Math.round(burnRate(g)*100),"Time elapsed":timePctG(g),riskColor:assessBurn(g).bar}));

  function buildBC(g){
    if(!g)return[];
    const total2=totMo(g.startDate,g.endDate),elapsed=mElapsed(g.startDate),show=Math.min(total2,elapsed+4);
    const data=[];
    for(let i=0;i<=show;i++){
      const planned=Math.min(n(g.monthlyBudget)*i,n(g.totalAmount));
      const actual=elapsed>0&&i<=elapsed?Math.round(n(g.spent)*(i/elapsed)):i===0?0:null;
      const[sy,sm]=g.startDate.split("-").map(Number);
      const dt=new Date(sy,sm-1+i,1);
      data.push({month:dt.toLocaleDateString("en",{month:"short",year:"2-digit"}),"Planned spend":toM(planned),"Actual spend":actual!==null?toM(actual):null,"Disbursed ceiling":toM(n(g.disbursed))});
    }
    return data;
  }
  const burnD=buildBC(selected);
  function openF(id){const g=id?grants.find(x=>x.id===id):null;setForm(g?{...g}:{programme:"",donor:"",totalAmount:"",disbursed:"",spent:"",startDate:"",endDate:"",reportingDeadline:"",monthlyBudget:"",notes:""});setEditId(id||null);setShowF(true);}
  function saveF(){if(!form.programme||!form.donor||!form.totalAmount)return;const rec={...form,id:editId||String(Date.now()),totalAmount:n(form.totalAmount),disbursed:n(form.disbursed),spent:n(form.spent),monthlyBudget:n(form.monthlyBudget)};if(editId)setGrants(gs=>gs.map(g=>g.id===editId?rec:g));else setGrants(gs=>[...gs,rec]);setShowF(false);setEditId(null);}

  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[
          {l:"Active grants",v:grants.length,s:"In monitoring",c:C.text},
          {l:"Portfolio absorption",v:portB+"%",s:fmt(totalSp)+" of "+fmt(totalD)+" disbursed",c:portB>85?C.red:portB<25?C.amber:C.green},
          {l:"Undisbursed balance",v:fmt(totalGr-totalD),s:"Future tranches",c:C.blue},
          {l:"Attention required",v:crit+high,s:crit+" critical; "+high+" high risk",c:crit>0?C.red:high>0?C.amber:C.green},
        ].map(m=>(
          <div key={m.l} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px"}}>
            <div style={{...FS,fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>{m.l}</div>
            <div style={{...F,fontSize:22,fontWeight:700,color:m.c}}>{m.v}</div>
            <div style={{...FS,fontSize:11,color:C.hint,marginTop:4}}>{m.s}</div>
          </div>
        ))}
      </div>
      <Card style={{padding:"14px 16px",marginBottom:16}}>
        <div style={{...FS,fontSize:11,color:C.muted,textTransform:"uppercase",fontWeight:600,letterSpacing:"0.05em",marginBottom:4}}>Absorption rate vs time elapsed: portfolio</div>
        <div style={{...FS,fontSize:11,color:C.hint,marginBottom:10}}>Coloured bars show % of disbursed funds spent; grey shows % of grant period elapsed. Balanced bars indicate a healthy grant.</div>
        <ResponsiveContainer width="100%" height={185}>
          <BarChart data={barD} margin={{top:4,right:4,bottom:20,left:10}}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)"/>
            <XAxis dataKey="name" tick={{fontSize:9,...FS}} angle={-15} textAnchor="end"/>
            <YAxis tick={{fontSize:9,...FS}} tickFormatter={v=>v+"%"} domain={[0,100]}/>
            <Tooltip contentStyle={{...FS,fontSize:11,borderRadius:8,border:`1px solid ${C.border}`}} formatter={(v,name)=>name==="Absorption rate"?[v+"%","Absorption rate"]:[v+"%","Time elapsed"]}/>
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
              {[
                {l:"Total grant",v:fmt(n(selected.totalAmount)),s:"From "+selected.donor,c:C.text},
                {l:"Disbursed",v:fmt(n(selected.disbursed)),s:pct(n(selected.disbursed),n(selected.totalAmount))+"% received",c:C.blue},
                {l:"Spent to date",v:fmt(n(selected.spent)),s:selBr+"% of disbursed",c:selBr>88?C.red:selBr<25?C.amber:C.green},
                {l:"Available balance",v:fmt(selBal),s:"Disbursed but unspent",c:C.purple},
                {l:"Undisbursed",v:fmt(Math.max(0,n(selected.totalAmount)-n(selected.disbursed))),s:"Future tranches",c:C.muted},
                {l:"Reporting deadline",v:selDays&&selDays<0?(-selDays)+"d remaining":"Overdue",s:selected.reportingDeadline,c:selDays&&selDays>-14?C.red:selDays&&selDays>-30?C.amber:C.green},
              ].map(m=>(
                <div key={m.l} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px"}}>
                  <div style={{...FS,fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>{m.l}</div>
                  <div style={{...F,fontSize:22,fontWeight:700,color:m.c,lineHeight:1.1}}>{m.v}</div>
                  <div style={{...FS,fontSize:11,color:C.hint,marginTop:4}}>{m.s}</div>
                </div>
              ))}
            </div>
            {showF&&(
              <Card style={{marginBottom:12}}>
                <CardHead title={editId?"Edit grant":"Add grant"}/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,padding:"14px 16px 0"}}>
                  {[{l:"Programme name",k:"programme",t:"text",full:true},{l:"Donor",k:"donor",t:"text"},{l:"Total grant (USD)",k:"totalAmount",t:"number"},{l:"Disbursed (USD)",k:"disbursed",t:"number"},{l:"Spent (USD)",k:"spent",t:"number"},{l:"Monthly budget (USD)",k:"monthlyBudget",t:"number"},{l:"Start",k:"startDate",t:"month"},{l:"End",k:"endDate",t:"month"},{l:"Reporting deadline",k:"reportingDeadline",t:"date"}].map(f=>(<FR key={f.k} full={f.full}><L>{f.l}</L><input type={f.t||"text"} value={form[f.k]||""} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} style={inp}/></FR>))}
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
              {[{label:"Absorption rate: % of disbursed funds spent",val:selBr,color:selRisk.bar},{label:"Time elapsed: % of grant period completed",val:selTP,color:"rgba(107,104,96,0.4)"}].map(bar=>(
                <div key={bar.label} style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{...FS,fontSize:11.5,color:C.muted}}>{bar.label}</span><span style={{...FS,fontSize:12,fontWeight:700,color:bar.color}}>{bar.val}%</span></div>
                  <div style={{height:8,borderRadius:4,background:C.border,overflow:"hidden"}}><div style={{height:"100%",borderRadius:4,background:bar.color,width:Math.min(bar.val,100)+"%"}}></div></div>
                </div>
              ))}
              <div style={{padding:"8px 12px",background:"#FAFAF7",borderRadius:8,marginBottom:12,...FS,fontSize:11.5,lineHeight:1.6}}>
                <strong>Spend variance: </strong>
                <span style={{color:selVar>20?C.blue:selVar>0?C.green:Math.abs(selVar)<=15?C.green:C.red,fontWeight:700}}>{selVar>0?"+":""}{selVar}%</span>
                {selExp>0?` (${fmt(n(selected.spent))} spent vs ${fmt(selExp)} expected)`:" (insufficient elapsed time to assess)"}
              </div>
              <div style={{padding:"10px 14px",background:selRisk.bg,borderRadius:8,...FS,fontSize:11.5,color:selRisk.tx,lineHeight:1.7}}>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
                  <span style={{fontSize:10,padding:"2px 8px",borderRadius:8,background:selRisk.bar,color:"#fff",fontWeight:700}}>{selRisk.level.toUpperCase()}</span>
                  <span style={{fontSize:12,fontWeight:700}}>{selRisk.label}</span>
                </div>
                {selRisk.level==="Critical"?`Spending at ${selBr}% of disbursed funds with significant time remaining. Submit a disbursement request to ${selected.donor} immediately.`:
                 selRisk.level==="High"?`${selected.programme} is ${Math.abs(selVar)}% below expected pace. ${selected.donor} will flag this at the ${selected.reportingDeadline} review. Accelerate programme activities now.`:
                 selRisk.level==="Medium"?`${selected.programme} is running behind plan. Review with the programme team before the ${selected.reportingDeadline} deadline.`:
                 selRisk.label==="Ahead of plan"?`Spending is ahead of plan. Verify expenditure is supported by deliverables and prepare the next disbursement request to ${selected.donor}.`:
                 `${selected.programme} is tracking well. Maintain delivery momentum and begin preparing the next progress report ahead of the ${selected.reportingDeadline} deadline.`}
              </div>
              {selected.notes&&<div style={{marginTop:10,padding:"8px 12px",background:C.amberL,border:`1px solid ${C.amber}30`,borderRadius:8,...FS,fontSize:11.5,color:"#5A3E10",lineHeight:1.6}}><strong>Notes: </strong>{selected.notes}</div>}
            </div>
            <Card style={{padding:"14px 16px"}}>
              <div style={{...FS,fontSize:11,color:C.muted,textTransform:"uppercase",fontWeight:600,letterSpacing:"0.05em",marginBottom:4}}>Spend trajectory: {selected.programme} ($M)</div>
              <div style={{...FS,fontSize:11,color:C.hint,marginBottom:8}}>Planned spend (dashed green); actual spend (blue); disbursed ceiling i.e. maximum spendable (red)</div>
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={burnD} margin={{top:8,right:20,bottom:20,left:10}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)"/>
                  <XAxis dataKey="month" tick={{fontSize:9,...FS}} angle={-20} textAnchor="end"/>
                  <YAxis tick={{fontSize:9,...FS}} tickFormatter={v=>v>0?"$"+v+"M":0}/>
                  <Tooltip contentStyle={{...FS,fontSize:11,borderRadius:8,border:`1px solid ${C.border}`}} formatter={(v,name)=>{if(v===null||v===undefined)return[null,name];if(name==="Disbursed ceiling")return["$"+v+"M (max spendable)",name];return["$"+v+"M",name];}}/>
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

// ─────────────────────────────────────────────────────────────────────────────
// ENGAGEMENT
// ─────────────────────────────────────────────────────────────────────────────
function Engagement({donors,touchpoints,setTouchpoints}){
  const[selId,setSelId]=useState(donors[0]?.id);const[showTF,setShowTF]=useState(false);const[editTId,setEditTId]=useState(null);const[tForm,setTForm]=useState({donorId:"",type:"Meeting",date:"",quality:"2",notes:""});const[view,setView]=useState("map");
  const scored=useMemo(()=>donors.map(d=>({...d,eng:scoreEng(d.id,touchpoints),el:engLabel(scoreEng(d.id,touchpoints).overall)})),[donors,touchpoints]);
  const sel=scored.find(d=>d.id===selId)||scored[0];
  const selTps=touchpoints.filter(t=>t.donorId===selId).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const avgScore=Math.round(scored.reduce((s,d)=>s+d.eng.overall,0)/Math.max(scored.length,1));
  const dormant=scored.filter(d=>d.eng.overall<25).length;
  const overdue=scored.filter(d=>(d.eng.daysSinceLast||0)>60).length;
  const barD=[...scored].sort((a,b)=>b.eng.overall-a.eng.overall).map(d=>({name:d.name.length>12?d.name.slice(0,10)+"...":d.name,score:d.eng.overall,color:d.el.bar}));
  const radarD=sel?[{dim:"Recency",val:sel.eng.recency},{dim:"Frequency",val:sel.eng.frequency},{dim:"Quality",val:sel.eng.quality},{dim:"Diversity",val:sel.eng.diversity},{dim:"Responsiveness",val:sel.eng.responsiveness}]:[];
  function openTp(id){const t=id?touchpoints.find(x=>x.id===id):null;setTForm(t?{...t,quality:String(t.quality)}:{donorId:selId,type:"Meeting",date:"",quality:"2",notes:""});setEditTId(id||null);setShowTF(true);}
  function saveTp(){if(!tForm.donorId||!tForm.date)return;const rec={...tForm,id:editTId||String(Date.now()),quality:n(tForm.quality)};if(editTId)setTouchpoints(ts=>ts.map(t=>t.id===editTId?rec:t));else setTouchpoints(ts=>[...ts,rec]);setShowTF(false);setEditTId(null);}

  return(
    <div>
      <div style={{...FS,fontSize:11,color:C.muted,padding:"9px 14px",background:C.blueL,borderRadius:8,border:`1px solid ${C.blue}30`,marginBottom:16,lineHeight:1.6}}>
        <strong>Two distinct measures shown here.</strong> Engagement health (Thriving / Consistent / Fading / Dormant) reflects touchpoint quality and recency. Partnership status in the Donor Map (Strategic / Active / Warm / Cold / None) reflects the nature of the formal relationship. Both matter and neither replaces the other.
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[
          {l:"Donors tracked",v:donors.length,s:"In relationship portfolio",c:C.text},
          {l:"Portfolio health",v:avgScore+"/100",s:"Average engagement health",c:avgScore>=60?C.green:avgScore>=35?C.amber:C.red},
          {l:"Dormant",v:dormant,s:"Engagement health below 25",c:dormant>0?C.red:C.green},
          {l:"Contact overdue",v:overdue,s:"No contact in 60 or more days",c:overdue>0?C.amber:C.green},
        ].map(m=>(
          <div key={m.l} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px"}}>
            <div style={{...FS,fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>{m.l}</div>
            <div style={{...F,fontSize:22,fontWeight:700,color:m.c}}>{m.v}</div>
            <div style={{...FS,fontSize:11,color:C.hint,marginTop:4}}>{m.s}</div>
          </div>
        ))}
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
            <FR><L>Donor</L><select value={tForm.donorId||""} onChange={e=>setTForm(p=>({...p,donorId:e.target.value}))} style={inp}><option value="">Select...</option>{donors.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></FR>
            <FR><L>Touchpoint type</L><select value={tForm.type||"Meeting"} onChange={e=>setTForm(p=>({...p,type:e.target.value}))} style={inp}>{TP_TYPES.map(t=><option key={t}>{t}</option>)}</select></FR>
            <FR><L>Date</L><input type="date" value={tForm.date||""} onChange={e=>setTForm(p=>({...p,date:e.target.value}))} style={inp}/></FR>
            <FR><L>Quality</L><select value={tForm.quality||"2"} onChange={e=>setTForm(p=>({...p,quality:e.target.value}))} style={inp}><option value="1">1 - Routine</option><option value="2">2 - Substantive</option><option value="3">3 - Strategic</option></select></FR>
            <FR full><L>Notes: what was discussed or agreed?</L><input value={tForm.notes||""} onChange={e=>setTForm(p=>({...p,notes:e.target.value}))} style={inp} placeholder="Outcome, follow-up actions, relationship signals"/></FR>
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
            <div style={{...FS,fontSize:11,color:C.muted,textTransform:"uppercase",fontWeight:600,letterSpacing:"0.05em",marginBottom:4}}>Engagement health by donor: portfolio view</div>
            <div style={{...FS,fontSize:11,color:C.hint,marginBottom:10}}>Weighted: Recency 30%; Frequency 25%; Quality 25%; Diversity 10%; Responsiveness 10%</div>
            <ResponsiveContainer width="100%" height={165}>
              <BarChart data={barD} margin={{top:4,right:4,bottom:20,left:10}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)"/>
                <XAxis dataKey="name" tick={{fontSize:9,...FS}} angle={-15} textAnchor="end"/>
                <YAxis tick={{fontSize:9,...FS}} domain={[0,100]}/>
                <Tooltip formatter={v=>[v+"/100","Engagement health"]} contentStyle={{...FS,fontSize:11,borderRadius:8,border:`1px solid ${C.border}`}}/>
                <Bar dataKey="score" radius={[4,4,0,0]}>{barD.map((e,i)=><Cell key={i} fill={e.color}/>)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Card>
              <CardHead title="Donor relationships" sub="Lowest engagement health first: most urgent for attention"/>
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
                    <span style={{...FS,fontSize:11,color:C.muted}}>Partnership: {d.relationship}</span>
                    <span style={{...FS,fontSize:11,color:d.eng.daysSinceLast>60?C.red:d.eng.daysSinceLast>30?C.amber:C.muted}}>{d.eng.daysSinceLast!==null?d.eng.daysSinceLast+"d ago":"No contact logged"}</span>
                  </div>
                  <div style={{height:3,background:C.border,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",borderRadius:2,background:d.el.bar,width:d.eng.overall+"%"}}></div></div>
                </div>
              );})}
            </Card>
            {sel&&(
              <div>
                <div style={{background:C.card,border:`1.5px solid ${sel.el.bar}`,borderRadius:12,padding:"14px 16px",marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                    <div>
                      <div style={{...FS,fontSize:14,fontWeight:600,color:C.text}}>{sel.name}</div>
                      <div style={{...FS,fontSize:11,color:C.muted,marginTop:2}}>Type: {sel.type} · Partnership: {sel.relationship}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <Pill label={"Health: "+sel.el.label} bg={sel.el.bg} tx={sel.el.tx}/>
                      <div style={{...F,fontSize:24,fontWeight:700,color:sel.el.bar,marginTop:5}}>{sel.eng.overall}<span style={{fontSize:13,fontWeight:400,color:C.muted}}>/100</span></div>
                    </div>
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
                    <strong>Recommended approach: </strong>
                    {sel.eng.overall>=75?`Engagement with ${sel.name} is thriving. Sustain the relationship through substantive, scheduled touchpoints. Institutional donors respond poorly to contact without a clear purpose; quality matters more than frequency.`:
                     sel.eng.overall>=50?`Engagement with ${sel.name} is consistent but has room to deepen. Last contact was ${sel.eng.daysSinceLast} days ago. Plan a proactive touchpoint this month anchored to something substantive: a report, a policy development, or a sector event you both attend.`:
                     sel.eng.overall>=25?`The ${sel.name} relationship is fading; ${sel.eng.daysSinceLast} days since last meaningful contact. Re-engage with a specific, substantive purpose. A generic check-in will not move this relationship forward.`:
                     `The ${sel.name} relationship is dormant; ${sel.eng.daysSinceLast} days without meaningful contact. An immediate, targeted re-engagement strategy is needed. Identify a clear hook before reaching out.`}
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
          <CardHead title="All touchpoints: chronological"/>
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

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVATION
// ─────────────────────────────────────────────────────────────────────────────
function Activation({tracks,setTracks,pipeline,donors,onNav}){
  const[selId,setSelId]=useState(tracks[0]?.id);const[showTF,setShowTF]=useState(false);const[editTId,setEditTId]=useState(null);const[tForm,setTForm]=useState({});const[showSF,setShowSF]=useState(false);const[editSIdx,setEditSIdx]=useState(null);const[sForm,setSForm]=useState({});const[view,setView]=useState("board");const[fPri,setFPri]=useState("");const[optMs,setOptMs]=useState([]);
  const sel=tracks.find(t=>t.id===selId)||tracks[0];const selStats=sel?trackStats(sel):null;const selRec=sel&&selStats?trackRec(sel,selStats):null;
  const allStats=tracks.map(t=>({...t,stats:trackStats(t)}));
  const blocked=allStats.filter(t=>t.stats.blocked).length;const behind=allStats.filter(t=>t.stats.schedSt==="overdue").length;
  const avgPct=Math.round(allStats.reduce((s,t)=>s+t.stats.pctDone,0)/Math.max(tracks.length,1));const fullyDone=allStats.filter(t=>t.stats.pctDone===100).length;
  const barD=allStats.map(t=>({name:t.donor.length>12?t.donor.slice(0,10)+"...":t.donor,pct:t.stats.pctDone,color:t.stats.blocked?C.red:t.stats.pctDone===100?C.green:t.stats.schedSt==="overdue"?"#E57370":C.blue}));
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
          {confirmedNoTrack.map(p=><button key={p.id} onClick={()=>pushPipe(p)} style={{...btn("add",{marginLeft:8,fontSize:11})}}>Start track: {p.donor}</button>)}
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[
          {l:"Active tracks",v:tracks.length,s:"Activation journeys in progress",c:C.text},
          {l:"Average progress",v:avgPct+"%",s:"Across all tracks",c:avgPct>=70?C.green:avgPct>=40?C.amber:C.blue},
          {l:"Blocked or behind",v:blocked+behind,s:blocked+" blocked; "+behind+" behind schedule",c:blocked+behind>0?C.red:C.green},
          {l:"Fully activated",v:fullyDone,s:"All milestones complete",c:fullyDone>0?C.green:C.muted},
        ].map(m=>(
          <div key={m.l} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px"}}>
            <div style={{...FS,fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>{m.l}</div>
            <div style={{...F,fontSize:22,fontWeight:700,color:m.c}}>{m.v}</div>
            <div style={{...FS,fontSize:11,color:C.hint,marginTop:4}}>{m.s}</div>
          </div>
        ))}
      </div>
      <Card style={{padding:"14px 16px",marginBottom:14}}>
        <div style={{...FS,fontSize:11,color:C.muted,textTransform:"uppercase",fontWeight:600,letterSpacing:"0.05em",marginBottom:4}}>Activation progress by donor: % of milestones completed</div>
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
            <div style={{...FS,fontSize:10.5,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8}}>Universal milestones: applied to all tracks regardless of donor type</div>
            {UNIVERSAL_MILESTONES.map(m=><div key={m.id} style={{display:"flex",justifyContent:"space-between",padding:"6px 10px",background:"#FAFAF7",borderRadius:6,marginBottom:4,...FS,fontSize:11.5}}><span style={{color:C.text}}>{m.label}</span><span style={{color:C.muted}}>Target: {m.targetDays} days</span></div>)}
          </div>
          <div style={{padding:"12px 16px 0"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{...FS,fontSize:10.5,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:"0.05em"}}>{tForm.donorType||"Bilateral"} milestones: editable and customisable</div>
              <button onClick={()=>setOptMs(ms=>[...ms,{id:"c_"+Date.now(),label:"",targetDays:30,selected:true,custom:true}])} style={btn("add",{fontSize:11})}>+ Custom</button>
            </div>
            {optMs.map((m,i)=>(
              <div key={m.id} style={{display:"grid",gridTemplateColumns:"auto 1fr auto auto",gap:8,alignItems:"center",padding:"6px 10px",background:m.selected?C.greenL:C.card,borderRadius:8,marginBottom:6,border:`1px solid ${m.selected?"#9FD4B4":C.border}`}}>
                <input type="checkbox" checked={m.selected} onChange={e=>setOptMs(ms=>ms.map((x,j)=>j===i?{...x,selected:e.target.checked}:x))} style={{width:"auto",margin:0,cursor:"pointer"}}/>
                <input value={m.label} onChange={e=>setOptMs(ms=>ms.map((x,j)=>j===i?{...x,label:e.target.value}:x))} style={{...inp,fontSize:12,padding:"4px 8px"}} placeholder="Milestone name"/>
                <div style={{display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}>
                  <span style={{...FS,fontSize:11,color:C.muted}}>Target:</span>
                  <input type="number" min="1" value={m.targetDays} onChange={e=>setOptMs(ms=>ms.map((x,j)=>j===i?{...x,targetDays:n(e.target.value)}:x))} style={{...inp,width:60,fontSize:12,padding:"4px 8px"}}/>
                  <span style={{...FS,fontSize:11,color:C.muted}}>days</span>
                </div>
                <button onClick={()=>setOptMs(ms=>ms.filter((_,j)=>j!==i))} style={btn("del",{padding:"3px 8px",fontSize:11})}>x</button>
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
          <CardHead title={`Update milestone: ${sel.milestones[editSIdx]?.label}`}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,padding:"14px 16px 0"}}>
            <FR><L>Status</L><select value={sForm.status||"Not started"} onChange={e=>setSForm(p=>({...p,status:e.target.value}))} style={inp}>{MS_STATUS.map(s=><option key={s}>{s}</option>)}</select></FR>
            <FR><L>Completion date</L><input type="date" value={sForm.completedDate||""} onChange={e=>setSForm(p=>({...p,completedDate:e.target.value}))} style={inp}/></FR>
            <FR full><L>Notes: what happened; what is the next step?</L><input value={sForm.notes||""} onChange={e=>setSForm(p=>({...p,notes:e.target.value}))} style={inp}/></FR>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"12px 16px"}}>
            <button onClick={()=>setShowSF(false)} style={btn("ghost")}>Cancel</button>
            <button onClick={saveSF} style={btn("save")}>Save</button>
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
                {t.stats.blocked&&<div style={{...FS,fontSize:10,color:C.red,marginTop:4,fontWeight:600}}>Blocked</div>}
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
                      <div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3,flexWrap:"wrap"}}><span style={{width:7,height:7,borderRadius:"50%",background:sst.dot,display:"inline-block",flexShrink:0}}></span><span style={{...FS,fontSize:12,fontWeight:600,color:C.text}}>{m.label}</span><Pill label={m.status} bg={sst.bg} tx={sst.tx}/>{m.completedDate&&<span style={{...FS,fontSize:10.5,color:C.muted}}>{fmtDate(m.completedDate)}</span>}{sn&&<span style={{...FS,fontSize:10,fontWeight:600,color:sn.col}}>{sn.text}</span>}</div><div style={{...FS,fontSize:10.5,color:C.hint,marginLeft:14}}>Target: {m.targetDays} days</div>{m.notes&&<div style={{...FS,fontSize:11.5,color:C.muted,marginLeft:14,lineHeight:1.5,marginTop:2}}>{m.notes}</div>}</div>
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
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3,flexWrap:"wrap"}}><span style={{width:7,height:7,borderRadius:"50%",background:sst.dot,display:"inline-block",flexShrink:0}}></span><span style={{...FS,fontSize:12,fontWeight:600,color:C.text}}>{m.label}</span><Pill label={m.status} bg={sst.bg} tx={sst.tx}/>{m.completedDate&&<span style={{...FS,fontSize:10.5,color:C.muted}}>{fmtDate(m.completedDate)}</span>}</div><div style={{...FS,fontSize:10.5,color:C.hint,marginLeft:14}}>Target: {m.targetDays} days</div>{m.notes&&<div style={{...FS,fontSize:11.5,color:C.muted,marginLeft:14,lineHeight:1.5,marginTop:2}}>{m.notes}</div>}</div>
                      <button onClick={()=>openSF(ri)} style={btn("edit",{whiteSpace:"nowrap",marginLeft:10})}>Update</button></div>
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
