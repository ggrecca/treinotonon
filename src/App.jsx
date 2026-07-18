
import React, {useEffect, useLayoutEffect, useMemo, useRef, useState} from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import {
  Dumbbell, BarChart3, Scale, CheckCircle2, Circle, Save, Trash2, TimerReset,
  Play, Pause, History, PlusCircle, ClipboardList, X, Copy, Edit3, ArrowUp,
  ArrowDown, Settings2, Eye, EyeOff, Users, UserPlus, ArrowLeft, ArrowRight,
  LoaderCircle, RefreshCw, WifiOff, AlertTriangle, AlertCircle, Info
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from "recharts";
import { authService, configurationError, isSupabaseConfigured } from "./services/authService";
import { dataService } from "./services/dataService";
import { EXERCISE_LIBRARY } from "./data/exerciseLibrary";
import { buildRepPlan, expandRepTargetsForSets, isDropSetType, isRestPauseType, isSegmentedRepType, normalizeRepTargets, parseDropTargets, parseRepTargets, parseSingleRepTarget, repTargetLabelsForEditing, setRepTargetLabelForEditing, targetLabel } from "./utils/repTargets";
import { Card } from "./components/Card";
import { DashboardSwitcher } from "./components/DashboardSwitcher";
import { WorkoutSwitcher } from "./components/WorkoutSwitcher";
import { buildPasswordRecoveryRedirect, cleanPasswordRecoveryUrl, readPasswordRecoveryLocation, validateNewPassword } from "./utils/authRecovery";
import { editorDraftKey, editorValuesDiffer, readEditorDraft, removeEditorDraft, writeEditorDraft } from "./utils/editorDrafts";
import { canRunRemoteMutation, deriveSyncState } from "./utils/syncState";
import { buildExerciseEvolution, buildExerciseSummary, buildTrainerAnalytics, sessionsForSubject } from "./utils/trainerAnalytics";
import { enqueueToast } from "./utils/toasts";
import { executeAssignmentBatch, mergeAssignmentsById } from "./utils/assignmentBatch";
import "./style.css";

const today = (value=new Date()) => {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0,10);
};
const APP_NAME = "Treino Tonon";
const APP_VERSION = "1.0.0";
const APP_RELEASE_LABEL = "Julho de 2026";
const TYPES = ["NORMAL", "PROG", "CONJ", "REST PAUSE", "DROP SET"];
const EXECUTION_METHODS = [
  {value:"NORMAL", label:"Normal", description:"Mesma meta em todas as séries."},
  {value:"PROG", label:"Progressivo", description:"Metas diferentes a cada série."},
  {value:"DROP SET", label:"Drop set", description:"Quedas de carga sem descanso longo."},
  {value:"REST PAUSE", label:"Rest-pause", description:"Série principal e mini-séries curtas."},
];
const OBJECTIVES = ["Força", "Hipertrofia", "Resistência", "Mobilidade", "Recuperação"];
const THEME_STORAGE_KEY = "treino-tonon-theme";

function readStoredTheme(){
  try {
    const stored = globalThis.localStorage?.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "";
  } catch {
    return "";
  }
}

function persistStoredTheme(nextTheme){
  try {
    globalThis.localStorage?.setItem(THEME_STORAGE_KEY, nextTheme === "light" ? "light" : "dark");
  } catch {
    // Preferência visual não deve bloquear o app se o storage estiver indisponível.
  }
}

const baseWorkoutGroups = {};

const flatten = (groups) => groups.flatMap(g => g.items);
function save(key, value){
  // Ponte temporária para fluxos compostos/legados sem método de domínio dedicado.
  void dataService.saveValue(key, value).catch(error=>console.error(`Erro ao salvar ${key}:`, error));
}
function clampSeconds(n){ return Math.max(1, Math.min(3600, Number(n) || 50)); }
function makeId(){ return globalThis.crypto?.randomUUID?.() || String(Date.now() + Math.random()); }
function isUuid(value){ return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || "")); }
function numericValue(v){ const m = String(v || "").replace(",", ".").match(/\d+(\.\d+)?/); return m ? Number(m[0]) : 0; }
function firstFilled(...values){
  return values.find(value => String(value ?? "").trim() !== "") ?? "";
}
function bodyFatValue(record){
  return firstFilled(record?.bodyFatFinal, record?.bf, record?.bodyFatCalculated, record?.bodyFatManual);
}
function decimalText(value){
  const n = Number(value);
  return Number.isFinite(n) ? String(Math.round(n * 10) / 10).replace(".", ",") : "";
}
function bfMethodLabel(method){
  if(method === "jp3") return "Jackson & Pollock 3 dobras";
  if(method === "jp7") return "Jackson & Pollock 7 dobras";
  if(method === "navy") return "Navy / Circunferências";
  return "Manual";
}
function calculateBodyFat(data){
  const method = data.bodyFatMethod || "manual";
  const sex = data.sex || "";
  const age = numericValue(data.age);
  const skinfold = key => numericValue(data[key]);
  const measure = key => numericValue(data[key]);
  if(method === "manual") return {method, label:bfMethodLabel(method), message:""};
  if(!sex) return {method, label:bfMethodLabel(method), message:"Informe o sexo para calcular o BF."};
  if((method === "jp3" || method === "jp7") && !age) return {method, label:bfMethodLabel(method), message:"Informe a idade para calcular o BF."};
  let sum = 0;
  let density = 0;
  if(method === "jp3"){
    const keys = sex === "female" ? ["skinfoldTriceps","skinfoldSuprailiac","skinfoldThigh"] : ["skinfoldChest","skinfoldAbdominal","skinfoldThigh"];
    const values = keys.map(skinfold);
    if(values.some(value => !value)) return {method, label:bfMethodLabel(method), message:"Preencha as medidas necessárias para este método."};
    sum = values.reduce((total,value)=>total + value, 0);
    density = sex === "female"
      ? 1.0994921 - 0.0009929 * sum + 0.0000023 * (sum ** 2) - 0.0001392 * age
      : 1.10938 - 0.0008267 * sum + 0.0000016 * (sum ** 2) - 0.0002574 * age;
  }
  if(method === "jp7"){
    const values = ["skinfoldChest","skinfoldMidaxillary","skinfoldTriceps","skinfoldSubscapular","skinfoldAbdominal","skinfoldSuprailiac","skinfoldThigh"].map(skinfold);
    if(values.some(value => !value)) return {method, label:bfMethodLabel(method), message:"Preencha as medidas necessárias para este método."};
    sum = values.reduce((total,value)=>total + value, 0);
    density = sex === "female"
      ? 1.097 - 0.00046971 * sum + 0.00000056 * (sum ** 2) - 0.00012828 * age
      : 1.112 - 0.00043499 * sum + 0.00000055 * (sum ** 2) - 0.00028826 * age;
  }
  if(method === "navy"){
    const height = measure("height") / 2.54;
    const neck = measure("neck") / 2.54;
    const waist = (measure("abdomen") || measure("cintura")) / 2.54;
    const hip = measure("hip") / 2.54;
    const girth = sex === "female" ? waist + hip - neck : waist - neck;
    if(!height || !neck || !waist || (sex === "female" && !hip) || girth <= 0) return {method, label:bfMethodLabel(method), message:"Preencha as medidas necessárias para este método."};
    const bodyFat = sex === "female"
      ? 163.205 * Math.log10(girth) - 97.684 * Math.log10(height) - 78.387
      : 86.010 * Math.log10(girth) - 70.041 * Math.log10(height) + 36.76;
    return {method, label:bfMethodLabel(method), calculated:decimalText(bodyFat), final:decimalText(bodyFat), message:""};
  }
  if(!density) return {method, label:bfMethodLabel(method), message:"Preencha as medidas necessárias para este método."};
  const bodyFat = 495 / density - 450;
  return {method, label:bfMethodLabel(method), calculated:decimalText(bodyFat), final:decimalText(bodyFat), density:decimalText(density), skinfoldSum:decimalText(sum), message:""};
}
function plannedSetCount(v){ return Math.max(1, Math.min(12, Math.round(numericValue(v) || 1))); }
function plannedReps(v){ return String(numericValue(v) || "").trim(); }
function restToSeconds(v, fallback=50){
  const text = String(v || "").trim();
  const mmss = text.match(/^(\d{1,2}):(\d{2})$/);
  if(mmss) return clampSeconds(Number(mmss[1])*60 + Number(mmss[2]));
  const number = numericValue(text);
  return number ? clampSeconds(number) : clampSeconds(fallback);
}
function formatDuration(totalSeconds){
  const seconds = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(seconds/3600);
  const m = Math.floor((seconds%3600)/60);
  const s = seconds%60;
  return h ? `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}` : `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function sameCalendarDay(a, b){
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function formatShortDate(value){
  const date = value instanceof Date ? value : new Date(value);
  if(Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR", {day:"2-digit", month:"2-digit"});
}

function formatDayAndDate(value){
  const date = value instanceof Date ? value : new Date(value);
  if(Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR", {weekday:"short", day:"2-digit", month:"2-digit"}).replace(".", "");
}

function formatRelativeOrShortDate(value){
  const date = value instanceof Date ? value : new Date(value);
  if(Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((target.getTime() - base.getTime()) / (24 * 60 * 60 * 1000));
  if(diffDays === 0) return formatShortDate(date);
  if(diffDays === -1) return "Ontem";
  if(diffDays > -7 && diffDays < 0) return `Há ${Math.abs(diffDays)} dias`;
  return formatShortDate(date);
}

function formatCompactDurationLabel(value){
  const text = String(value || "").trim();
  if(!text) return "";
  const parts = text.split(":").map(Number);
  if(parts.every(Number.isFinite)) {
    const seconds = parts.length === 3
      ? (parts[0] * 3600) + (parts[1] * 60) + parts[2]
      : (parts[0] * 60) + parts[1];
    const minutes = Math.max(1, Math.round(seconds / 60));
    return `${minutes} min`;
  }
  return text;
}

function estimateWorkoutDurationLabel(items, fallbackRest=50){
  const list = Array.isArray(items) ? items : [];
  const totalSets = list.reduce((sum, item)=>sum + plannedSetCount(item?.sets), 0);
  if(!totalSets) return "";
  const activeSeconds = totalSets * 45;
  const restSeconds = list.reduce((sum, item)=>sum + Math.max(plannedSetCount(item?.sets) - 1, 0) * restToSeconds(item?.rest, fallbackRest), 0);
  const minutes = Math.max(1, Math.round((activeSeconds + restSeconds) / 60));
  return `${minutes} min`;
}

function monthCursor(date){
  return {year:date.getFullYear(), month:date.getMonth()};
}

function shiftMonth(cursor, delta){
  const date = new Date(cursor.year, cursor.month + delta, 1);
  return monthCursor(date);
}

function formatMonthLabel(cursor){
  const label = new Date(cursor.year, cursor.month, 1).toLocaleDateString("pt-BR", {month:"long", year:"numeric"});
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function itemToTags(item){
  const tags = [];
  if(item.group) tags.push(item.group);
  if(item.type && item.type !== "NORMAL") tags.push(item.type);
  return tags;
}

function normalizeExerciseName(value){
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g," ")
    .replace(/\b(com|no|na|de|da|do|em)\b/g,"")
    .replace(/\s+/g," ")
    .trim();
}

function normalizeFilterText(value){
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .toLowerCase()
    .trim();
}

function scheduledWeekdays(workout){
  const raw = [workout?.frequency, workout?.weeklyFrequency, workout?.days, workout?.weekdays]
    .flatMap(value=>Array.isArray(value) ? value : [value])
    .filter(Boolean)
    .join(" ");
  const value = normalizeFilterText(raw).replace(/[^a-z0-9]+/g," ").trim();
  const labels = [
    [0,["dom", "domingo"]], [1,["seg", "segunda"]], [2,["ter", "terca"]],
    [3,["qua", "quarta"]], [4,["qui", "quinta"]], [5,["sex", "sexta"]], [6,["sab", "sabado"]]
  ];
  return labels.filter(([, aliases])=>aliases.some(alias=>new RegExp(`(^|\\s)${alias}(?=\\s|$)`).test(value))).map(([day])=>day);
}

function exerciseFilterText(exercise){
  return normalizeFilterText([
    exercise?.name,
    exercise?.category,
    exercise?.group,
    exercise?.primaryGroup,
    ...(Array.isArray(exercise?.secondaryGroups) ? exercise.secondaryGroups : String(exercise?.secondaryGroups || "").split(",")),
    ...(Array.isArray(exercise?.equipmentList) ? exercise.equipmentList : String(exercise?.equipmentList || exercise?.equipment || "").split(",")),
    ...(Array.isArray(exercise?.tags) ? exercise.tags : String(exercise?.tags || "").split(",")),
    exercise?.notes,
    exercise?.technicalNotes
  ].join(" "));
}

function applyExerciseFilters(list, filters={}){
  const search = normalizeFilterText(filters.search);
  const category = String(filters.category || "Todos");
  const primaryGroup = String(filters.primaryGroup || "Todos");
  const equipment = String(filters.equipment || "Todos");
  const tag = String(filters.tag || "Todos");
  return (list || []).filter(exercise => {
    const equipmentList = normalizeList(exercise.equipmentList || exercise.equipment);
    const tags = normalizeList(exercise.tags);
    const text = exerciseFilterText(exercise);
    if(search && !text.includes(search)) return false;
    if(category !== "Todos" && (exercise.category || exercise.group || "Outro") !== category) return false;
    if(primaryGroup !== "Todos" && (exercise.primaryGroup || exercise.group || "Outro") !== primaryGroup) return false;
    if(equipment !== "Todos" && !equipmentList.includes(equipment)) return false;
    if(tag !== "Todos" && !tags.includes(tag)) return false;
    return true;
  });
}

function normalizeList(value){
  if(Array.isArray(value)) return value.map(item=>String(item || "").trim()).filter(Boolean);
  return String(value || "").split(",").map(item=>item.trim()).filter(Boolean);
}

const equipmentTerms = new Set([
  "barra","barra w","halter","halteres","maquina","máquina","cabo","polia","banco","smith","peso corporal",
  "elastico","elástico","mini band","kettlebell","bike","esteira","escada","eliptico","elíptico",
  "corda","trenó","bola","roda","barra fixa","paralelas","leg press","hack","banco inclinado","banco declinado",
  "banco scott","anilha"
]);

function splitExerciseMetadata(ex={}){
  const rawEquipment = normalizeList(ex.equipmentList || ex.equipment_list || ex.equipment);
  const rawTags = normalizeList(ex.tags);
  const equipmentList = [...rawEquipment];
  const tags = [];
  rawTags.forEach(tag => {
    const normalized = normalizeFilterText(tag);
    if(equipmentTerms.has(normalized) || normalized.includes("maquina") || normalized.includes("máquina") || normalized.includes("cabo") || normalized.includes("polia") || normalized.includes("halter") || normalized.includes("barra") || normalized.includes("banco") || normalized.includes("smith")) {
      equipmentList.push(tag);
    } else {
      tags.push(tag);
    }
  });
  return {
    equipmentList:Array.from(new Set(equipmentList.filter(Boolean))),
    tags:Array.from(new Set(tags.filter(Boolean)))
  };
}

function getExerciseType(item){
  return item?.type || (item?.tags || []).find(t=>TYPES.includes(t)) || "NORMAL";
}

function withWorkoutExerciseIdentity(item){
  const workoutExerciseId = isUuid(item?.workoutExerciseId) ? item.workoutExerciseId : isUuid(item?.id) ? item.id : makeId();
  return {...item, id:workoutExerciseId, workoutExerciseId};
}

function customToGroups(workout){
  if(!workout?.items) return [];
  const groups = [];
  let currentConj = null;
  workout.items.forEach(item => {
    const itemType = getExerciseType(item);
    const normalized = {...withWorkoutExerciseIdentity(item), type:itemType === "CONJ" ? "NORMAL" : itemType, tags:itemToTags(item)};
    if(item.conjugateBlockId || itemType === "CONJ"){
      const blockId = String(item.conjugateBlockId || "");
      // Old workouts retain their consecutive-item fallback. New/copy data has
      // an explicit ID, so adjacent bi-sets never merge by accident.
      if(!currentConj || (blockId && currentConj.conjugateBlockId !== blockId)){
        currentConj = {type:"conj", conjugateBlockId:blockId || undefined, conjugateKind:item.conjugateKind || "Bi-set", items:[]};
        groups.push(currentConj);
      }
      currentConj.items.push(normalized);
    } else {
      currentConj = null;
      groups.push({type:"single", items:[normalized]});
    }
  });
  return groups;
}

function groupsToCustomItems(groups){
  return (groups || []).flatMap(group => {
    const conjugateBlockId = group.type === "conj" ? (group.conjugateBlockId || makeId()) : "";
    return (group.items || []).map((item, index) => ({
    ...withWorkoutExerciseIdentity(item),
    name:item.name, sets:item.sets, reps:item.reps, load:item.load || "", rest:item.rest, group:item.group || (item.tags || [])[0] || "",
    type:getExerciseType(item) === "CONJ" ? "NORMAL" : getExerciseType(item), objective:item.objective || "Hipertrofia", notes:item.notes || "",
    targetRepsBySet:normalizeRepTargets(item.targetRepsBySet?.length ? item.targetRepsBySet : item.reps),
    useRepTargetsBySet:!!normalizeRepTargets(item.targetRepsBySet).length,
      ...(conjugateBlockId ? {conjugateBlockId, conjugatePosition:index + 1, conjugateKind:group.conjugateKind || "Bi-set"} : {})
    }));
  });
}

function libraryKey(item){
  return normalizeExerciseName(item?.name) || String(item?.id || "").trim().toLowerCase();
}

function workoutExerciseToLibrary(item){
  const group = String(item.group || (item.tags || [])[0] || "Outro").trim() || "Outro";
  return {
    id:item.id || `workout-${libraryKey(item)}`,
    name:String(item.name || "").trim(),
    category:group,
    group,
    primaryGroup:group,
    secondaryGroups:[],
    equipmentList:[],
    tags:normalizeList(item.tags).filter(tag=>tag !== group && !TYPES.includes(tag)),
    notes:"",
    technicalNotes:""
  };
}

const blankExercise = {name:"", category:"", group:"", primaryGroup:"", secondaryGroups:[], equipmentList:[], tags:[], sets:"3", reps:"10", load:"", rest:"00:50", type:"NORMAL", objective:"Hipertrofia", notes:"", technicalNotes:"", targetRepsBySet:[], targetLoadsBySet:[], dropTargetsBySet:[], useRepTargetsBySet:false};
const blankWorkout = {name:"", items:[], editingId:null, editingKey:null, editingWorkoutKey:null, editingIndex:null, type:"personal", studentId:"", studentEmail:""};
const logoSrc = "/assets/logo-transp.png";
const customWorkoutToken = workout => String(workout?.id || "");
const advancedRepTypes = new Set(["PROG", "REST PAUSE", "CONJ"]);

function repTargetsForExercise(exercise){
  if(isSegmentedRepType(getExerciseType(exercise))) {
    return normalizeRepTargets(exercise?.targetRepsBySet?.length ? exercise.targetRepsBySet : parseDropTargets(exercise?.reps));
  }
  return normalizeRepTargets(exercise?.targetRepsBySet?.length ? exercise.targetRepsBySet : exercise?.reps);
}

function exerciseWithRepTargets(exercise){
  const reps = String(exercise?.reps ?? "");
  const explicitTargets = normalizeRepTargets(exercise?.targetRepsBySet);
  const parsedTargets = isSegmentedRepType(getExerciseType(exercise)) ? parseDropTargets(reps) : parseRepTargets(reps);
  const useExplicitTargets = exercise?.useRepTargetsBySet !== false && explicitTargets.length;
  const targetRepsBySet = useExplicitTargets ? explicitTargets : parsedTargets;
  return {
    ...exercise,
    reps,
    targetRepsBySet,
    targetLoadsBySet:Array.isArray(exercise?.targetLoadsBySet) ? exercise.targetLoadsBySet.map(value=>String(value ?? "")) : [],
    dropTargetsBySet:Array.isArray(exercise?.dropTargetsBySet) ? exercise.dropTargetsBySet.map(row=>Array.isArray(row) ? row.map(cell=>({reps:String(cell?.reps ?? ""), load:String(cell?.load ?? "")})) : []) : [],
    useRepTargetsBySet:!!exercise?.useRepTargetsBySet || explicitTargets.length > 1
  };
}

function repTargetFieldLabels(exercise){
  return repTargetLabelsForEditing(exercise?.targetRepsBySet, plannedSetCount(exercise?.sets), exercise?.reps);
}

function setRepTargetLabel(exercise, index, value){
  // Preserve empty positions while the user edits. The values are normalized
  // to structured targets only when the exercise/workout is saved.
  return setRepTargetLabelForEditing(exercise?.targetRepsBySet, plannedSetCount(exercise?.sets), index, value, exercise?.reps);
}

function loadTargetFieldLabels(exercise){
  const count = plannedSetCount(exercise?.sets);
  const raw = Array.isArray(exercise?.targetLoadsBySet) ? exercise.targetLoadsBySet : [];
  return Array.from({length:count},(_,index)=>index < raw.length ? String(raw[index] ?? "") : String(exercise?.load || ""));
}

function setLoadTargetLabel(exercise, index, value){
  const values = loadTargetFieldLabels(exercise);
  values[index] = value;
  return values;
}

function dropTargetMatrix(exercise){
  const count = plannedSetCount(exercise?.sets);
  const baseSegments = segmentedRepValues(exercise);
  const raw = Array.isArray(exercise?.dropTargetsBySet) ? exercise.dropTargetsBySet : [];
  const segmentCount = Math.max(2, baseSegments.length, ...raw.map(row=>Array.isArray(row) ? row.length : 0));
  return Array.from({length:count},(_,setIndex)=>Array.from({length:segmentCount},(_,segmentIndex)=>{
    const saved = raw?.[setIndex]?.[segmentIndex] || {};
    return {
      reps:String(saved.reps ?? baseSegments[segmentIndex] ?? ""),
      load:String(saved.load ?? exercise?.load ?? "")
    };
  }));
}

function setDropTargetValue(exercise, setIndex, segmentIndex, field, value){
  const matrix = dropTargetMatrix(exercise).map(row=>row.map(cell=>({...cell})));
  matrix[setIndex][segmentIndex] = {...matrix[setIndex][segmentIndex], [field]:value};
  return matrix;
}

function repTargetWarning(exercise){
  const count = plannedSetCount(exercise?.sets);
  const totalTargets = normalizeRepTargets(exercise?.targetRepsBySet).length;
  return totalTargets > count ? `Há ${totalTargets} metas para ${count} séries. Na execução serão exibidas as ${count} primeiras.` : "";
}

function shouldSuggestRepTargets(exercise){
  return advancedRepTypes.has(getExerciseType(exercise)) || parseRepTargets(exercise?.reps).length > 1;
}

function exerciseRepSummary(exercise){
  const separator = isSegmentedRepType(getExerciseType(exercise)) ? " + " : " / ";
  return repTargetsForExercise(exercise).map(targetLabel).filter(Boolean).join(separator) || exercise?.reps || "";
}

function methodRepHint(exercise){
  const type = getExerciseType(exercise);
  if(isDropSetType(type)) return "Defina repetições e carga de cada drop em cada série.";
  if(isRestPauseType(type)) return "Defina a série principal e as mini-séries após pausas curtas.";
  if(String(type || "").toUpperCase() === "PROG") return "Defina repetições e carga para cada série.";
  return "";
}

function normalizedExecutionMethod(type){
  const value = String(type || "NORMAL").toUpperCase();
  return value === "CONJ" ? "NORMAL" : value;
}

function segmentedRepValues(exercise, minimum=2){
  const raw = String(exercise?.reps || "").split("+").map(value=>value.trim());
  const values = raw.length > 1 ? raw : [raw[0] || "", ""];
  while(values.length < minimum) values.push("");
  return values;
}

function methodSummary(exercise){
  const type = normalizedExecutionMethod(getExerciseType(exercise));
  const option = EXECUTION_METHODS.find(item=>item.value === type);
  return option?.label || type;
}

function indexedWorkoutGroups(items=[]){
  const groups = [];
  let current = null;
  items.forEach((item,index)=>{
    const blockId = String(item?.conjugateBlockId || "");
    if(blockId){
      if(!current || current.blockId !== blockId){
        current = {type:"conj", blockId, conjugateKind:item.conjugateKind || "Bi-set", entries:[]};
        groups.push(current);
      }
      current.entries.push({item,index});
      return;
    }
    current = null;
    groups.push({type:"single", entries:[{item,index}]});
  });
  return groups;
}

function normalizeAllPreviewConjugates(items=[]){
  const counts = new Map();
  items.forEach(item=>{
    if(item?.conjugateBlockId) counts.set(item.conjugateBlockId,(counts.get(item.conjugateBlockId) || 0) + 1);
  });
  const positions = new Map();
  return items.map(item=>{
    const blockId = item?.conjugateBlockId;
    if(!blockId || (counts.get(blockId) || 0) < 2) return {...item, type:normalizedExecutionMethod(item.type), conjugateBlockId:"", conjugatePosition:null, conjugateKind:""};
    const position = (positions.get(blockId) || 0) + 1;
    positions.set(blockId,position);
    return {...item, type:normalizedExecutionMethod(item.type), conjugatePosition:position};
  });
}

function normalizeEmail(value){
  return String(value || "").trim().toLowerCase();
}

function normalizeAccountRole(role){
  return ["coach", "both", "trainer", "admin"].includes(String(role || "").toLowerCase()) ? "coach" : "athlete";
}

function workoutSourceId(workoutItem){
  return String(workoutItem?.sourceWorkoutId || workoutItem?.sourceTemplateId || "");
}

function cloneWorkoutExerciseForAssignment(item){
  const {
    id,
    createdAt,
    updatedAt,
    userId,
    workoutId,
    workout_id,
    workoutExerciseId,
    workout_exercise_id,
    prescribedSetId,
    prescribed_set_id,
    prescribedDropId,
    prescribed_drop_id,
    ...rest
  } = item || {};
  const clonedId = makeId();
  return {
    ...rest,
    // A copied prescription is a new row, but it keeps one stable identity for
    // the whole lifecycle (local state, cloud, execution and history).
    id:clonedId,
    workoutExerciseId:clonedId,
    targetRepsBySet: Array.isArray(rest.targetRepsBySet)
      ? rest.targetRepsBySet.map(target => typeof target === "object" ? ({...target}) : target)
      : rest.targetRepsBySet,
    targetLoadsBySet:Array.isArray(rest.targetLoadsBySet) ? [...rest.targetLoadsBySet] : rest.targetLoadsBySet,
    dropTargetsBySet:Array.isArray(rest.dropTargetsBySet) ? rest.dropTargetsBySet.map(row=>Array.isArray(row) ? row.map(cell=>({...cell})) : []) : rest.dropTargetsBySet,
    drops: Array.isArray(rest.drops) ? rest.drops.map(cloneWorkoutExerciseForAssignment) : rest.drops,
    sets: Array.isArray(rest.sets) ? rest.sets.map(cloneWorkoutExerciseForAssignment) : rest.sets,
  };
}

function cloneWorkoutItemsForAssignment(items){
  const blockIds = new Map();
  return (items || []).map(item => {
    const clone = cloneWorkoutExerciseForAssignment(exerciseWithRepTargets({...item}));
    if(item?.conjugateBlockId){
      if(!blockIds.has(item.conjugateBlockId)) blockIds.set(item.conjugateBlockId, makeId());
      clone.conjugateBlockId = blockIds.get(item.conjugateBlockId);
      clone.conjugatePosition = Number(item.conjugatePosition) || 1;
    }
    return clone;
  });
}

function ProductFooter(){
  return <footer className="productFooter" aria-label="Informações do aplicativo">
    <div className="productFooterMark" aria-hidden="true">TT</div>
    <p className="productFooterVersion">Treino Tonon <span>·</span> Versão {APP_VERSION} <span>·</span> {APP_RELEASE_LABEL}</p>
    <p className="productFooterCopyright">© 2026 Gustavo Grecca Garcia. Todos os direitos reservados.</p>
    <p className="productFooterCredit">Criado por Gustavo Grecca Garcia em parceria com ChatGPT.</p>
  </footer>;
}

function App(){
  const [screen,setScreen]=useState("dashboard");
  const [appMode,setAppMode]=useState("atleta");
  const [workout,setWorkout]=useState("");
  const [draft,setDraft]=useState({});
  const [sessions,setSessions]=useState([]);
  const [workoutSessions,setWorkoutSessions]=useState([]);
  const [body,setBody]=useState([]);
  const [customWorkouts,setCustomWorkouts]=useState([]);
  const [editedBaseWorkouts,setEditedBaseWorkouts]=useState({});
  const [hiddenBaseWorkouts,setHiddenBaseWorkouts]=useState([]);
  const [hiddenCustomWorkouts,setHiddenCustomWorkouts]=useState([]);
  const [profile,setProfile]=useState({name:"", age:""});
  const [timerSetpoint,setTimerSetpoint]=useState(50);
  const [autoStartRestTimer,setAutoStartRestTimer]=useState(true);
  const [theme,setTheme]=useState(()=>readStoredTheme() || "dark");
  const [timer,setTimer]=useState({seconds:50, running:false});
  const [openSession,setOpenSession]=useState(null);
  const [historyFilter,setHistoryFilter]=useState("todos");
  const [evolutionPeriod,setEvolutionPeriod]=useState("90");
  const [evolutionMetric,setEvolutionMetric]=useState("peso");
  const [expandedHistoryExercise,setExpandedHistoryExercise]=useState("");
  const [newWorkout,setNewWorkout]=useState(blankWorkout);
  const [newExercise,setNewExercise]=useState(blankExercise);
  const [showWorkoutEditor,setShowWorkoutEditor]=useState(false);
  const [librarySearch,setLibrarySearch]=useState("");
  const [showWorkoutLibrary,setShowWorkoutLibrary]=useState(false);
  const [userLibrary,setUserLibrary]=useState([]);
  const [hiddenLibrary,setHiddenLibrary]=useState([]);
  const [selectedExercise,setSelectedExercise]=useState("");
  const [dashboardFilter,setDashboardFilter]=useState("todos");
  const [exerciseForm,setExerciseForm]=useState({...blankExercise, editingName:null});
  const [showExerciseEditor,setShowExerciseEditor]=useState(false);
  const [libraryGroup,setLibraryGroup]=useState("Todos");
  const [libraryPrimaryGroup,setLibraryPrimaryGroup]=useState("Todos");
  const [libraryEquipment,setLibraryEquipment]=useState("Todos");
  const [libraryTag,setLibraryTag]=useState("Todos");
  const [workoutLibrarySearch,setWorkoutLibrarySearch]=useState("");
  const [workoutLibraryCategory,setWorkoutLibraryCategory]=useState("Todos");
  const [workoutLibraryPrimaryGroup,setWorkoutLibraryPrimaryGroup]=useState("Todos");
  const [workoutLibraryEquipment,setWorkoutLibraryEquipment]=useState("Todos");
  const [workoutLibraryTag,setWorkoutLibraryTag]=useState("Todos");
  const [workoutLibraryFiltersOpen,setWorkoutLibraryFiltersOpen]=useState(false);
  const [activeSession,setActiveSession]=useState(null);
  const activeSessionHydratedRef = useRef(false);
  const activeSessionUserRef = useRef("");
  const [sessionTick,setSessionTick]=useState(Date.now());
  const [activeExerciseIndex,setActiveExerciseIndex]=useState(null);
  const [sessionView,setSessionView]=useState("exercise");
  const [restExerciseIndex,setRestExerciseIndex]=useState(null);
  const [restEndsAt,setRestEndsAt]=useState(null);
  const [exerciseRestOverrides,setExerciseRestOverrides]=useState({});
  const [showRestPicker,setShowRestPicker]=useState(false);
  const [restCustomSeconds,setRestCustomSeconds]=useState("");
  const [pendingExerciseCompletion,setPendingExerciseCompletion]=useState(null);
  const [pendingDeferredExercise,setPendingDeferredExercise]=useState(null);
  const [showFullWorkoutNote,setShowFullWorkoutNote]=useState(false);
  const [sessionSummary,setSessionSummary]=useState(null);
  const [finishConfirm,setFinishConfirm]=useState(false);
  const [pendingWorkoutStartKey,setPendingWorkoutStartKey]=useState("");
  const [toasts,setToasts]=useState([]);
  const [currentUser,setCurrentUser]=useState(null);
  const [authReady,setAuthReady]=useState(false);
  const [authBusy,setAuthBusy]=useState(false);
  const [authMessage,setAuthMessage]=useState("");
  const [showNameEditor,setShowNameEditor]=useState(false);
  const [accountMode,setAccountMode]=useState("signIn");
  const [signUpRole,setSignUpRole]=useState("athlete");
  const [showAuthPassword,setShowAuthPassword]=useState(false);
  const [passwordResetMode,setPasswordResetMode]=useState(false);
  const [passwordResetSent,setPasswordResetSent]=useState(false);
  const [passwordRecovery,setPasswordRecovery]=useState(()=>{
    const recovery = readPasswordRecoveryLocation();
    if(recovery.errorMessage) return {phase:"invalid", message:recovery.errorMessage};
    return recovery.requested ? {phase:"checking", message:""} : {phase:"idle", message:""};
  });
  const [dataMode,setDataMode]=useState("local");
  const [bootstrapState,setBootstrapState]=useState("loading");
  const [loadError,setLoadError]=useState("");
  const [networkOnline,setNetworkOnline]=useState(()=>globalThis.navigator?.onLine !== false);
  const [syncRetrying,setSyncRetrying]=useState(false);
  const [pendingSyncCount,setPendingSyncCount]=useState(0);
  const hasSafeDataRef = useRef(false);
  const [bodyMessage,setBodyMessage]=useState("");
  const [coachStudents,setCoachStudents]=useState([]);
  const [studentSearch,setStudentSearch]=useState("");
  const [studentSort,setStudentSort]=useState("name");
  const [workoutSearch,setWorkoutSearch]=useState("");
  const [workoutSort,setWorkoutSort]=useState("name");
  const [workoutArchiveView,setWorkoutArchiveView]=useState("active");
  const [selectedStudentId,setSelectedStudentId]=useState("");
  const [studentDetailView,setStudentDetailView]=useState("");
  const [endingStudentLink,setEndingStudentLink]=useState(null);
  const [editingStudentLink,setEditingStudentLink]=useState(null);
  const [studentMessage,setStudentMessage]=useState("");
  const [assignmentWorkoutId,setAssignmentWorkoutId]=useState("");
  const [assignmentSelection,setAssignmentSelection]=useState({self:false, students:{}});
  const [assignmentRetryEntries,setAssignmentRetryEntries]=useState([]);
  const [assignmentResult,setAssignmentResult]=useState(null);
  const assignmentCompletedCountRef = useRef(0);
  const [selectedWorkoutDetailKey,setSelectedWorkoutDetailKey]=useState("");
  const [selectedWorkoutExerciseIndex,setSelectedWorkoutExerciseIndex]=useState(null);
  const [editingWorkoutExerciseIndex,setEditingWorkoutExerciseIndex]=useState(null);
  const [selectedExerciseDetailId,setSelectedExerciseDetailId]=useState("");
  const [selectedBodyRecord,setSelectedBodyRecord]=useState(null);
  const [showStudentBodyForm,setShowStudentBodyForm]=useState(false);
  const [showProfileBodyEditor,setShowProfileBodyEditor]=useState(false);
  const [showInviteForm,setShowInviteForm]=useState(false);
  const [generatedInvite,setGeneratedInvite]=useState(null);
  const [navigationStack,setNavigationStack]=useState([]);
  const [openActionMenuId,setOpenActionMenuId]=useState("");
  const [athleteCalendarCursor,setAthleteCalendarCursor]=useState(()=>monthCursor(new Date()));
  const [dismissedInviteIds,setDismissedInviteIds]=useState([]);
  const [inviteModalLink,setInviteModalLink]=useState(null);
  const [dirtyScopes,setDirtyScopes]=useState({});
  const [pendingNavigation,setPendingNavigation]=useState(null);
  const [pendingActions,setPendingActions]=useState({});
  const pendingActionKeysRef = useRef(new Set());
  const workoutEditorBaselineRef = useRef(blankWorkout);
  const exerciseEditorBaselineRef = useRef({...blankExercise, editingName:null});
  const bypassDirtyGuardRef = useRef(false);
  const restoringNavigationRef = useRef(false);
  const suppressNextNavigationPushRef = useRef(false);

  function applyAppData(data, options={}){
    setSessions(data.sessions);
    setWorkoutSessions(data.workoutSessions);
    setBody(data.body);
    setDraft(data.draft);
    setTimerSetpoint(data.timerSetpoint);
    setAutoStartRestTimer(data.autoStartRestTimer !== false);
    const savedTheme = readStoredTheme();
    setTheme(savedTheme || (data.theme === "light" ? "light" : "dark"));
    setTimer({seconds:data.timerSetpoint, running:false});
    setCustomWorkouts(data.customWorkouts);
    setEditedBaseWorkouts(data.editedBaseWorkouts);
    setHiddenBaseWorkouts(data.hiddenBaseWorkouts);
    setHiddenCustomWorkouts(data.hiddenCustomWorkouts || []);
    setProfile(data.profile);
    setUserLibrary(data.userLibrary);
    setHiddenLibrary(data.hiddenLibrary);
    setCoachStudents(data.coachStudents || []);
    if(options.syncMode) {
      const role = normalizeAccountRole(data.profile?.role);
      const nextMode = role === "coach" && data.appMode === "treinador" ? "treinador" : "atleta";
      setAppMode(nextMode);
    }
    hasSafeDataRef.current = true;
  }

  async function refreshAppData(options={}){
    if(options.retrying) setSyncRetrying(true);
    try {
      const data = await dataService.getAppData();
      applyAppData(data);
      setDataMode(await dataService.getMode());
      setLoadError("");
      setBootstrapState("loaded");
      return data;
    } catch(error) {
      setLoadError(error?.message || "Não foi possível carregar seus dados.");
      setBootstrapState("error");
      throw error;
    } finally {
      if(options.retrying) setSyncRetrying(false);
    }
  }

  async function loadApplication(isAlive=()=>true, options={}){
    const recoveryReturn = readPasswordRecoveryLocation();
    if(options.retrying) setSyncRetrying(true);
    else if(!hasSafeDataRef.current) setBootstrapState("loading");
    setLoadError("");
    try {
      if(isSupabaseConfigured) setDataMode("cloud");
      const user = await authService.getCurrentUser();
      if(!isAlive()) return;
      setCurrentUser(user);
      if(recoveryReturn.requested && !recoveryReturn.errorMessage) {
        setPasswordRecovery(user
          ? {phase:"ready", message:""}
          : {phase:"invalid", message:"Este link de recuperação é inválido, expirou ou já foi usado. Solicite um novo link."});
      }
      if(isSupabaseConfigured && !user){
        setBootstrapState("loaded");
        return;
      }
      const [data, mode] = await Promise.all([dataService.getAppData(), dataService.getMode()]);
      if(!isAlive()) return;
      applyAppData(data, {syncMode:true});
      setDataMode(mode);
      setBootstrapState("loaded");
    } catch(error) {
      if(!isAlive()) return;
      if(!configurationError) console.error("Erro ao carregar dados iniciais:", error);
      setLoadError(error?.message || "Não foi possível carregar seus dados.");
      setBootstrapState("error");
      if(recoveryReturn.requested) {
        setPasswordRecovery({phase:"invalid", message:"Não foi possível validar o link agora. Verifique sua conexão ou solicite um novo link."});
      }
    } finally {
      if(isAlive()) setAuthReady(true);
      if(options.retrying) setSyncRetrying(false);
    }
  }

  function retryApplicationLoad(){
    void loadApplication(()=>true, {retrying:true});
  }

  useEffect(()=>{
    if(!isSupabaseConfigured) return undefined;
    return authService.onAuthStateChange(event=>{
      if(event === "PASSWORD_RECOVERY") {
        setPasswordRecovery({phase:"ready", message:""});
      }
    });
  },[]);

  useEffect(()=>{
    let alive = true;
    void loadApplication(()=>alive);
    return () => { alive = false; };
  },[]);

  useEffect(()=>{
    const updateOnline = () => setNetworkOnline(globalThis.navigator?.onLine !== false);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  },[]);

  const currentUserId = currentUser?.id || profile.userId || "local-user";
  const currentUserEmail = normalizeEmail(currentUser?.email || profile.email);
  const currentUserName = currentUser?.name || profile.name || "";
  const currentUserDisplayName = currentUserName || "Usuário";
  const currentUserSelfLabel = `${currentUserDisplayName} (Eu)`;
  const currentUserRole = normalizeAccountRole(currentUser?.role || profile.role);
  const canUseCoachMode = currentUserRole === "coach";
  const workoutEditorDirty = showWorkoutEditor && editorValuesDiffer(newWorkout, workoutEditorBaselineRef.current);
  const exerciseEditorDirty = showExerciseEditor && editorValuesDiffer(exerciseForm, exerciseEditorBaselineRef.current);
  const assignmentDirty = !!assignmentWorkoutId && (assignmentSelection.self || Object.values(assignmentSelection.students || {}).some(Boolean));
  const hasUnsavedChanges = workoutEditorDirty || exerciseEditorDirty || assignmentDirty || Object.values(dirtyScopes).some(Boolean);
  const isCloudData = isSupabaseConfigured || dataMode === "cloud";
  const globalSyncState = deriveSyncState({
    isCloud:isCloudData,
    online:networkOnline,
    bootstrapState,
    retrying:syncRetrying,
    pendingCount:pendingSyncCount,
    hasSafeData:hasSafeDataRef.current,
  });
  const remoteMutationsAllowed = canRunRemoteMutation({isCloud:isCloudData, online:networkOnline, bootstrapState, retrying:syncRetrying});
  const professionalScreens = useMemo(()=>new Set(["alunos","exercicios","evolucao","analises"]),[]);
  const athleteScreens = useMemo(()=>new Set(["dashboard","criar","treino","historico","dados"]),[]);
  const lastRoleGuardUserRef = useRef("");

  function markDirty(scope){
    setDirtyScopes(current=>current[scope] ? current : {...current, [scope]:true});
  }

  function ensureMutationAllowed(){
    if(remoteMutationsAllowed) return true;
    const message = globalSyncState === "offline"
      ? "Sem conexão com a nuvem. Seus dados carregados continuam disponíveis, mas esta ação precisa de internet."
      : "Aguarde a atualização dos dados antes de fazer esta alteração.";
    notify(message, "warning");
    return false;
  }

  function isActionPending(key){
    return !!pendingActions[key];
  }

  async function runPendingAction(key, action){
    const actionKey = String(key || "action");
    if(pendingActionKeysRef.current.has(actionKey)) return;
    pendingActionKeysRef.current.add(actionKey);
    setPendingActions(current=>({...current, [actionKey]:true}));
    setPendingSyncCount(current=>current + 1);
    try{
      return await action();
    } finally {
      pendingActionKeysRef.current.delete(actionKey);
      setPendingActions(current=>{
        if(!current[actionKey]) return current;
        const next = {...current};
        delete next[actionKey];
        return next;
      });
      setPendingSyncCount(current=>Math.max(0, current - 1));
    }
  }

  function clearDirty(scope){
    setDirtyScopes(current=>current[scope] ? {...current, [scope]:false} : current);
  }

  function workoutDraftEntity(value=newWorkout){
    return value.editingWorkoutKey || value.editingKey || value.editingId || (Number.isInteger(value.editingIndex) ? `index-${value.editingIndex}` : "new");
  }

  function exerciseDraftEntity(value=exerciseForm){
    return value.editingId || value.editingName || "new";
  }

  function currentDraftEntity(scope){
    if(scope === "workout-editor") return workoutDraftEntity();
    if(scope === "exercise-editor") return exerciseDraftEntity();
    if(scope === "student-body" || scope === "student-admin") return selectedStudentProfile?.id || editingStudentLink?.id || "student";
    if(scope === "workout-assignment") return assignmentWorkoutId || "assignment";
    return "current";
  }

  function currentDraftKey(scope, entityId=currentDraftEntity(scope)){
    return editorDraftKey(currentUserId, scope, entityId);
  }

  function namedFormValues(formId){
    const form = document.getElementById(formId);
    if(!form) return {};
    return Array.from(form.elements || []).reduce((values,field)=>{
      if(!field.name || field.disabled || field.type === "file" || field.type === "submit" || field.type === "button") return values;
      if((field.type === "radio" || field.type === "checkbox") && !field.checked) {
        if(field.type === "checkbox") values[field.name] = false;
        return values;
      }
      values[field.name] = field.type === "checkbox" ? true : field.value;
      return values;
    },{});
  }

  function draftFormId(scope){
    return {
      "profile-body":"profile-body-form",
      "student-body":"student-body-form",
      "student-admin":"student-admin-form",
      "profile-name":"profile-name-form",
    }[scope] || "";
  }

  function persistCurrentDraft(scope){
    let value = null;
    if(scope === "workout-editor") value = {kind:"controlled", data:newWorkout};
    else if(scope === "exercise-editor") value = {kind:"controlled", data:exerciseForm};
    else if(scope === "workout-assignment") value = {kind:"controlled", data:assignmentSelection};
    else {
      const formId = draftFormId(scope);
      value = {kind:"form", data:namedFormValues(formId)};
    }
    const saved = writeEditorDraft(globalThis.localStorage, currentDraftKey(scope), value);
    notify(saved ? "Rascunho salvo neste navegador." : "Não foi possível salvar o rascunho.", saved ? "info" : "warning");
    return saved;
  }

  function restoreControlledDraft(scope, entityId, fallback){
    const saved = readEditorDraft(globalThis.localStorage, currentDraftKey(scope, entityId));
    if(saved?.value?.kind !== "controlled" || !saved.value.data) return fallback;
    requestAnimationFrame(()=>notify("Rascunho restaurado.", "info"));
    return saved.value.data;
  }

  function restoreFormDraft(scope, formId, entityId=currentDraftEntity(scope)){
    const saved = readEditorDraft(globalThis.localStorage, currentDraftKey(scope, entityId));
    if(saved?.value?.kind !== "form" || !saved.value.data) return;
    requestAnimationFrame(()=>{
      const form = document.getElementById(formId);
      if(!form) return;
      Object.entries(saved.value.data).forEach(([name,value])=>{
        const field = form.elements.namedItem(name);
        if(!field || field instanceof RadioNodeList) return;
        if(field.type === "checkbox" || field.type === "radio") field.checked = !!value;
        else field.value = String(value ?? "");
        field.dispatchEvent(new Event("input", {bubbles:true}));
        field.dispatchEvent(new Event("change", {bubbles:true}));
      });
      markDirty(scope);
      notify("Rascunho restaurado.", "info");
    });
  }

  function activeDirtyScope(){
    if(workoutEditorDirty) return "workout-editor";
    if(exerciseEditorDirty) return "exercise-editor";
    if(dirtyScopes["profile-body"]) return "profile-body";
    if(dirtyScopes["student-body"]) return "student-body";
    if(dirtyScopes["student-admin"]) return "student-admin";
    if(dirtyScopes["profile-name"]) return "profile-name";
    if(assignmentDirty) return "workout-assignment";
    return "";
  }

  function requestProtectedAction(action){
    if(bypassDirtyGuardRef.current) {
      action();
      return true;
    }
    const scope = activeDirtyScope();
    if(!scope) {
      action();
      return true;
    }
    setPendingNavigation({scope, action});
    return false;
  }

  function resolvePendingNavigation(choice){
    const pending = pendingNavigation;
    if(!pending) return;
    if(choice === "continue") {
      setPendingNavigation(null);
      return;
    }
    if(choice === "save") persistCurrentDraft(pending.scope);
    if(choice === "discard") removeEditorDraft(globalThis.localStorage, currentDraftKey(pending.scope));
    clearDirty(pending.scope);
    setPendingNavigation(null);
    bypassDirtyGuardRef.current = true;
    try {
      pending.action();
    } finally {
      queueMicrotask(()=>{ bypassDirtyGuardRef.current = false; });
    }
  }

  function openStudentBodyEditor(student){
    setStudentDetailView("bodyForm");
    setShowStudentBodyForm(true);
    restoreFormDraft("student-body", "student-body-form", student?.id || "student");
  }

  function openStudentAdminEditor(student){
    setStudentMessage("");
    setEditingStudentLink(student);
    restoreFormDraft("student-admin", "student-admin-form", student?.id || "student");
  }

  function openProfileBodyEditor(){
    setShowProfileBodyEditor(true);
    restoreFormDraft("profile-body", "profile-body-form", "current");
  }

  function openProfileNameEditor(){
    setShowNameEditor(true);
    restoreFormDraft("profile-name", "profile-name-form", "current");
  }

  function closeDirtyScope(scope, action){
    if(!bypassDirtyGuardRef.current && (dirtyScopes[scope] || (scope === "workout-assignment" && assignmentDirty))) {
      requestProtectedAction(action);
      return;
    }
    action();
  }

  function dirtyScopeLabel(scope){
    return {
      "workout-editor":"treino",
      "exercise-editor":"exercício",
      "profile-body":"dados corporais",
      "student-body":"dados corporais do aluno",
      "student-admin":"cadastro do aluno",
      "profile-name":"nome do perfil",
      "workout-assignment":"seleção da atribuição",
    }[scope] || "formulário";
  }

  useEffect(()=>{
    if(!hasUnsavedChanges) return undefined;
    const warnBeforeUnload = event => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return ()=>window.removeEventListener("beforeunload", warnBeforeUnload);
  },[hasUnsavedChanges]);

  const activeStudentLinks = useMemo(()=>coachStudents.filter(link =>
    link.status === "active" && (link.studentId === currentUserId || normalizeEmail(link.studentEmail) === currentUserEmail)
  ),[coachStudents, currentUserId, currentUserEmail]);

  const pendingCoachInvites = useMemo(()=>coachStudents.filter(link =>
    link.status === "pending" && normalizeEmail(link.studentEmail) === currentUserEmail
  ),[coachStudents, currentUserEmail]);

  useEffect(()=>{
    setDismissedInviteIds(current => current.filter(id => pendingCoachInvites.some(link => link.id === id)));
  },[pendingCoachInvites]);

  useEffect(()=>{
    if(appMode !== "atleta") return;
    if(inviteModalLink?.id && pendingCoachInvites.some(link => link.id === inviteModalLink.id)) return;
    const nextInvite = pendingCoachInvites.find(link => !dismissedInviteIds.includes(link.id));
    if(nextInvite) setInviteModalLink(nextInvite);
  },[appMode, pendingCoachInvites, dismissedInviteIds, inviteModalLink]);

  const trainerLinks = useMemo(()=>coachStudents.filter(link => link.coachId === currentUserId || normalizeEmail(link.coachEmail) === currentUserEmail),[coachStudents, currentUserId, currentUserEmail]);
  const activeTrainerLinks = useMemo(()=>trainerLinks.filter(link=>link.status === "active"),[trainerLinks]);
  const selectedStudent = useMemo(()=>{
    if(selectedStudentId === "__self__") return {
      id:"__self__",
      isSelf:true,
      status:"active",
      studentId:currentUserId,
      studentName:currentUserSelfLabel,
      studentEmail:currentUserEmail,
      coachId:currentUserId,
      coachName:currentUserName,
      coachEmail:currentUserEmail
    };
    return trainerLinks.find(link=>link.id === selectedStudentId) || null;
  },[trainerLinks, selectedStudentId, currentUserId, currentUserEmail, currentUserName, currentUserSelfLabel]);

  useEffect(()=>{
    if(!authReady) return;
    const guardUserId = currentUser?.id || "local";
    const firstRolePassForUser = lastRoleGuardUserRef.current !== guardUserId;
    if(firstRolePassForUser) lastRoleGuardUserRef.current = guardUserId;

    const athleteHasInvalidScreen = !athleteScreens.has(screen);
    const athleteHasTrainerState = Boolean(
      selectedStudentId ||
      studentDetailView ||
      assignmentWorkoutId ||
      showWorkoutEditor ||
      showWorkoutLibrary ||
      showExerciseEditor ||
      selectedExerciseDetailId ||
      showStudentBodyForm ||
      showInviteForm ||
      editingWorkoutExerciseIndex !== null ||
      selectedBodyRecord?.scope === "student" ||
      editingStudentLink ||
      endingStudentLink
    );

    if(!canUseCoachMode && (appMode !== "atleta" || athleteHasInvalidScreen || athleteHasTrainerState)) {
      resetAthleteModeState();
      setAppMode("atleta");
    }

    if(!canUseCoachMode) {
      return;
    }

    if(appMode === "atleta" && (athleteHasInvalidScreen || athleteHasTrainerState)) {
      resetAthleteModeState();
      return;
    }

    if(appMode === "atleta" && showWorkoutEditor) {
      setShowWorkoutEditor(false);
      setShowWorkoutLibrary(false);
      setEditingWorkoutExerciseIndex(null);
      setNewWorkout(blankWorkout);
      setNewExercise(blankExercise);
    }

    if(!["atleta","treinador"].includes(appMode)) setAppMode("treinador");
    if(firstRolePassForUser && !["dashboard","alunos","criar","exercicios","dados","treino","historico"].includes(screen)) setScreen("dashboard");
  },[
    authReady,
    currentUser,
    canUseCoachMode,
    appMode,
    screen,
    athleteScreens,
    selectedStudentId,
    studentDetailView,
    assignmentWorkoutId,
    showWorkoutEditor,
    showWorkoutLibrary,
    showExerciseEditor,
    selectedExerciseDetailId,
    showStudentBodyForm,
    showInviteForm,
    editingWorkoutExerciseIndex,
    selectedBodyRecord,
    editingStudentLink,
    endingStudentLink
  ]);

  function isCurrentUserWorkoutOwner(workoutItem){
    if(!workoutItem?.ownerId) return true;
    return workoutItem.ownerId === currentUserId || normalizeEmail(workoutItem.ownerEmail) === currentUserEmail;
  }

  function canStartWorkoutItem(workoutItem, mode=appMode){
    const type = workoutItem?.type || "personal";
    if(mode !== "atleta") return false;
    if(workoutItem?.isActive === false || type === "template") return false;
    if(type === "personal") return isCurrentUserWorkoutOwner(workoutItem);
    if(type === "student"){
      if(workoutItem.studentId) return workoutItem.studentId === currentUserId;
      return normalizeEmail(workoutItem.studentEmail) === currentUserEmail;
    }
    return false;
  }

  function canManageWorkoutItem(workoutItem){
    const type = workoutItem?.type || "personal";
    if(type === "student") return workoutItem.coachId === currentUserId || normalizeEmail(workoutItem.coachEmail) === currentUserEmail;
    if(type === "template") return workoutItem.coachId === currentUserId || workoutItem.ownerId === currentUserId || normalizeEmail(workoutItem.coachEmail) === currentUserEmail;
    return isCurrentUserWorkoutOwner(workoutItem);
  }

  function isTrainerWorkoutTemplate(workoutItem){
    const type = workoutItem?.type || "";
    if(type === "student" || type === "personal") return false;
    return canManageWorkoutItem(workoutItem);
  }

  function canShowWorkoutForMode(workoutItem){
    if(appMode === "treinador") return isTrainerWorkoutTemplate(workoutItem);
    return canStartWorkoutItem(workoutItem, "atleta");
  }

  function canStartCurrentWorkout(){
    return !activeSession && canStartWorkoutItem(currentWorkoutMeta, appMode) && currentItems.length > 0;
  }

  const allWorkouts = useMemo(()=>{
    const base = {};
    if(appMode !== "treinador") {
      Object.entries(baseWorkoutGroups).forEach(([key, groups])=>{
        const edited = editedBaseWorkouts[key];
        base[key] = edited?.items ? customToGroups(edited) : groups;
      });
    }
    const custom = {};
    customWorkouts.forEach(w=>{ if(canShowWorkoutForMode(w) && isUuid(w.id)) custom[w.id] = customToGroups(w); });
    return {...base, ...custom};
  },[customWorkouts, editedBaseWorkouts, appMode, currentUserId, currentUserEmail, activeStudentLinks]);

  const allWorkoutLabels = useMemo(()=>{
    const labels = {};
    if(appMode !== "treinador") {
      Object.keys(baseWorkoutGroups).forEach(key=>{
        labels[key] = editedBaseWorkouts[key]?.name || `Treino ${key}`;
      });
    }
    customWorkouts.forEach((w,idx)=>{ if(canShowWorkoutForMode(w) && isUuid(w.id)) labels[w.id] = w.type === "student" ? `${w.name} · enviado` : w.name || `Personalizado ${idx+1}`; });
    return labels;
  },[customWorkouts, editedBaseWorkouts, appMode, currentUserId, currentUserEmail, activeStudentLinks]);

  const hiddenWorkoutKeys = useMemo(()=>{
    const hidden = new Set(hiddenBaseWorkouts);
    customWorkouts.forEach(w=>{
      if(hiddenCustomWorkouts.includes(customWorkoutToken(w))) hidden.add(customWorkoutToken(w));
    });
    return hidden;
  },[hiddenBaseWorkouts, hiddenCustomWorkouts, customWorkouts]);

  const workouts = useMemo(()=>Object.fromEntries(
    Object.entries(allWorkouts).filter(([key])=>!hiddenWorkoutKeys.has(key))
  ),[allWorkouts, hiddenWorkoutKeys]);

  const workoutLabels = useMemo(()=>Object.fromEntries(
    Object.entries(allWorkoutLabels).filter(([key])=>!hiddenWorkoutKeys.has(key))
  ),[allWorkoutLabels, hiddenWorkoutKeys]);

  const fullLibrary = useMemo(()=>{
    const map = new Map();
    const hidden = new Set(hiddenLibrary.map(name => normalizeExerciseName(name)));
    const addExercise = (exercise, preferExisting=false) => {
      const ex = catalogExercise(exercise);
      const key = libraryKey(ex);
      if(!ex.name || hidden.has(normalizeExerciseName(ex.name)) || hidden.has(key)) return;
      if(preferExisting && map.has(key)) return;
      map.set(key, {...map.get(key), ...ex});
    };
    EXERCISE_LIBRARY.forEach(ex => addExercise(ex, true));
    userLibrary.forEach(ex => addExercise(ex));
    Object.values(allWorkouts).flatMap(groups => flatten(groups || [])).forEach(item => {
      addExercise(workoutExerciseToLibrary(item), true);
    });
    return Array.from(map.values()).sort((a,b)=>a.name.localeCompare(b.name));
  },[userLibrary, hiddenLibrary, allWorkouts]);

  function resolveWorkoutCoachName(workoutMeta){
    if(!workoutMeta) return "";
    const coachId = String(workoutMeta.coachId || "");
    const byId = coachId ? activeStudentLinks.find(link=>String(link.coachId || "") === coachId) : null;
    if(byId?.coachName) return byId.coachName;
    if(workoutMeta.coachName) return workoutMeta.coachName;
    const coachEmail = normalizeEmail(workoutMeta.coachEmail);
    const byEmail = coachEmail ? activeStudentLinks.find(link=>normalizeEmail(link.coachEmail) === coachEmail) : null;
    return byEmail?.coachName || "";
  }

  function enrichWorkoutExercise(item){
    const stableIds = [item?.exerciseId, item?.libraryExerciseId, item?.sourceExerciseId, item?.catalogExerciseId, item?.id]
      .filter(Boolean)
      .map(value=>String(value));
    const libraryExercise = fullLibrary.find(ex=>stableIds.includes(String(ex.id)))
      || fullLibrary.find(ex=>normalizeExerciseName(ex.name) === normalizeExerciseName(item?.name));
    if(!libraryExercise) return item || {};
    return {
      ...libraryExercise,
      ...item,
      category:item?.category || libraryExercise.category || "",
      group:item?.group || libraryExercise.group || libraryExercise.primaryGroup || "",
      primaryGroup:item?.primaryGroup || libraryExercise.primaryGroup || libraryExercise.group || "",
      secondaryGroups:item?.secondaryGroups?.length ? item.secondaryGroups : libraryExercise.secondaryGroups || [],
      equipment:item?.equipment || libraryExercise.equipment || "",
      equipmentList:item?.equipmentList?.length ? item.equipmentList : libraryExercise.equipmentList || [],
      technicalNotes:item?.technicalNotes || libraryExercise.technicalNotes || libraryExercise.notes || ""
    };
  }

  function viewSnapshot(){
    return {
      screen,
      selectedStudentId,
      studentDetailView,
      selectedWorkoutDetailKey,
      selectedWorkoutExerciseIndex,
      editingWorkoutExerciseIndex,
      selectedExerciseDetailId,
      selectedBodyRecord,
      showStudentBodyForm,
      showProfileBodyEditor,
      showInviteForm,
      openSession,
      assignmentWorkoutId,
      showWorkoutEditor,
      showExerciseEditor
    };
  }

  function viewKey(snapshot=viewSnapshot()){
    return [
      snapshot.screen,
      snapshot.selectedStudentId || "",
      snapshot.studentDetailView || "",
      snapshot.selectedWorkoutDetailKey || "",
      snapshot.selectedWorkoutExerciseIndex ?? "",
      snapshot.editingWorkoutExerciseIndex ?? "",
      snapshot.selectedExerciseDetailId || "",
      snapshot.selectedBodyRecord?.id || snapshot.selectedBodyRecord?.date || "",
      snapshot.showStudentBodyForm ? "body-form" : "",
      snapshot.showProfileBodyEditor ? "profile-body-editor" : "",
      snapshot.showInviteForm ? "invite-form" : "",
      snapshot.openSession?.id || snapshot.openSession?.date || "",
      snapshot.assignmentWorkoutId || "",
      snapshot.showWorkoutEditor ? "workout-editor" : "",
      snapshot.showExerciseEditor ? "exercise-editor" : ""
    ].join("|");
  }

  function isInternalSnapshot(snapshot=viewSnapshot(), mode=appMode){
    const allowedMainScreens = mode === "treinador"
      ? ["dashboard","alunos","criar","exercicios","dados"]
      : ["dashboard","criar","historico","dados"];
    return Boolean(
      snapshot.screen === "treino" ||
      snapshot.selectedStudentId ||
      snapshot.studentDetailView ||
      snapshot.selectedWorkoutDetailKey ||
      snapshot.selectedWorkoutExerciseIndex !== null ||
      snapshot.editingWorkoutExerciseIndex !== null ||
      snapshot.selectedExerciseDetailId ||
      snapshot.selectedBodyRecord ||
      snapshot.showStudentBodyForm ||
      snapshot.showProfileBodyEditor ||
      snapshot.showInviteForm ||
      snapshot.openSession?.items ||
      snapshot.assignmentWorkoutId ||
      snapshot.showWorkoutEditor ||
      snapshot.showExerciseEditor ||
      !allowedMainScreens.includes(snapshot.screen)
    );
  }

  function suppressNextNavigationPush(){
    suppressNextNavigationPushRef.current = true;
  }

  function popNavigationSnapshotIf(predicate){
    setNavigationStack(stack => {
      if(!stack.length) return stack;
      const top = stack[stack.length - 1];
      return predicate(top) ? stack.slice(0, -1) : stack;
    });
  }

  function closeSelectedWorkoutExercise(){
    suppressNextNavigationPush();
    popNavigationSnapshotIf(snapshot =>
      snapshot.selectedWorkoutDetailKey === selectedWorkoutDetailKey &&
      snapshot.selectedWorkoutExerciseIndex === null
    );
    setSelectedWorkoutExerciseIndex(null);
  }

  function closeSelectedBodyRecord(){
    const recordScope = selectedBodyRecord?.scope;
    const shouldReturnStudentBodyHistory = screen === "alunos" && selectedStudentProfile;
    suppressNextNavigationPush();
    popNavigationSnapshotIf(snapshot => !snapshot.selectedBodyRecord);
    setSelectedBodyRecord(null);
    if(recordScope === "student" || shouldReturnStudentBodyHistory) {
      setStudentDetailView("bodyHistory");
      setShowStudentBodyForm(false);
    }
  }

  function restoreViewSnapshot(snapshot){
    if(!snapshot) return;
    const canRestoreWorkoutEditor = appMode === "treinador" && !!snapshot.showWorkoutEditor;
    restoringNavigationRef.current = true;
    setScreen(snapshot.screen || "dashboard");
    setSelectedStudentId(snapshot.selectedStudentId || "");
    setStudentDetailView(snapshot.studentDetailView || "");
    setSelectedWorkoutDetailKey(snapshot.selectedWorkoutDetailKey || "");
    setSelectedWorkoutExerciseIndex(snapshot.selectedWorkoutExerciseIndex ?? null);
    setEditingWorkoutExerciseIndex(canRestoreWorkoutEditor ? snapshot.editingWorkoutExerciseIndex ?? null : null);
    setSelectedExerciseDetailId(snapshot.selectedExerciseDetailId || "");
    setSelectedBodyRecord(snapshot.selectedBodyRecord || null);
    setShowStudentBodyForm(!!snapshot.showStudentBodyForm);
    setShowProfileBodyEditor(!!snapshot.showProfileBodyEditor);
    setShowInviteForm(!!snapshot.showInviteForm);
    setOpenSession(snapshot.openSession || null);
    setAssignmentWorkoutId(appMode === "treinador" ? snapshot.assignmentWorkoutId || "" : "");
    setAssignmentSelection({self:false, students:{}});
    setShowWorkoutLibrary(canRestoreWorkoutEditor && !!snapshot.showWorkoutLibrary);
    setShowWorkoutEditor(canRestoreWorkoutEditor);
    setShowExerciseEditor(!!snapshot.showExerciseEditor);
    requestAnimationFrame(()=>{ restoringNavigationRef.current = false; });
  }

  const previousViewRef = useRef(null);

  useEffect(()=>{
    const snapshot = viewSnapshot();
    const key = viewKey(snapshot);
    const internal = isInternalSnapshot(snapshot);
    const previous = previousViewRef.current;
    if(restoringNavigationRef.current || suppressNextNavigationPushRef.current){
      suppressNextNavigationPushRef.current = false;
      previousViewRef.current = {key, snapshot, internal};
      return;
    }
    if(previous && internal && previous.key !== key){
      setNavigationStack(stack => [...stack, previous.snapshot]);
    }
    if(previous && !internal && previous.internal){
      setNavigationStack([]);
    }
    previousViewRef.current = {key, snapshot, internal};
  },[
    screen,
    selectedStudentId,
    studentDetailView,
    selectedWorkoutDetailKey,
    selectedWorkoutExerciseIndex,
    editingWorkoutExerciseIndex,
    selectedExerciseDetailId,
    selectedBodyRecord,
    showStudentBodyForm,
    showProfileBodyEditor,
    showInviteForm,
    openSession,
    assignmentWorkoutId,
    showWorkoutEditor,
    showWorkoutLibrary,
    showExerciseEditor,
    appMode
  ]);

  useEffect(()=>{
    const resolved = resolveWorkout(workout);
    if(resolved.key && workout !== resolved.key) setWorkout(resolved.key);
  },[workouts, allWorkouts, workout]);

  useLayoutEffect(()=>{
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo({top:0, left:0, behavior:"auto"});
  },[
    screen,
    appMode,
    selectedStudentId,
    studentDetailView,
    selectedWorkoutDetailKey,
    selectedWorkoutExerciseIndex,
    editingWorkoutExerciseIndex,
    selectedExerciseDetailId,
    selectedBodyRecord,
    showStudentBodyForm,
    showProfileBodyEditor,
    showInviteForm,
    openSession,
    assignmentWorkoutId,
    showWorkoutEditor,
    showWorkoutLibrary,
    showExerciseEditor
  ]);

  useEffect(()=>{
    document.body.dataset.theme = theme === "light" ? "light" : "dark";
  },[theme]);

  useEffect(()=>{
    if(!timer.running || !restEndsAt) return;
    const tick = ()=>{
      const seconds = Math.max(0, Math.ceil((restEndsAt - Date.now()) / 1000));
      setTimer({seconds, running:seconds > 0});
      if(seconds === 0) {
        setRestEndsAt(null);
        navigator.vibrate?.(350);
      }
    };
    tick();
    const id=setInterval(tick,1000);
    return ()=>clearInterval(id);
  },[timer.running, restEndsAt]);

  useEffect(()=>{
    if(!activeSession) return;
    const id=setInterval(()=>setSessionTick(Date.now()),1000);
    return ()=>clearInterval(id);
  },[activeSession]);

  const activeSessionStorageKey = userId => `treino-tonon-active-session:${userId || "local"}`;

  useEffect(()=>{
    if(!authReady || activeSessionUserRef.current === currentUserId) return;
    activeSessionHydratedRef.current = false;
    activeSessionUserRef.current = currentUserId;
    setActiveSession(null);
    setActiveExerciseIndex(null);
    setSessionView("exercise");
    setRestExerciseIndex(null);
    setRestEndsAt(null);
    setExerciseRestOverrides({});
    setTimer({seconds:0, running:false});
    try{
      const raw = localStorage.getItem(activeSessionStorageKey(currentUserId));
      const snapshot = raw ? JSON.parse(raw) : null;
      const persistedWorkoutId = snapshot?.session?.workoutId || snapshot?.session?.workoutKey || snapshot?.session?.workout;
      const resolved = snapshot?.session ? resolveWorkout(persistedWorkoutId, {fallback:false}) : null;
      const belongsToUser = snapshot?.userId === currentUserId && (!snapshot.session?.studentId || snapshot.session.studentId === currentUserId);
      if(snapshot?.session && belongsToUser && resolved?.key && resolved.workoutId === persistedWorkoutId){
        setActiveSession(snapshot.session);
        setActiveExerciseIndex(snapshot.activeExerciseIndex ?? null);
        setRestExerciseIndex(snapshot.restExerciseIndex ?? null);
        setExerciseRestOverrides(snapshot.exerciseRestOverrides || {});
        const remaining = snapshot.restEndsAt ? Math.max(0, Math.ceil((snapshot.restEndsAt - Date.now()) / 1000)) : (snapshot.timer?.seconds || 0);
        setRestEndsAt(remaining > 0 && snapshot.timer?.running ? snapshot.restEndsAt : null);
        setTimer({seconds:remaining, running:remaining > 0 && !!snapshot.timer?.running});
      } else if(snapshot?.session) notify("A prescrição original não está mais disponível.", "info");
    }catch{}
    activeSessionHydratedRef.current = true;
  },[authReady, currentUserId]);

  useEffect(()=>{
    if(!activeSessionHydratedRef.current) return;
    try{
      const key = activeSessionStorageKey(currentUserId);
      if(!activeSession) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify({
        userId:currentUserId,
        session:activeSession,
        activeExerciseIndex,
        restExerciseIndex,
        exerciseRestOverrides,
        timer,
        restEndsAt
      }));
    }catch{}
  },[activeSession, currentUserId, activeExerciseIndex, restExerciseIndex, exerciseRestOverrides, timer, restEndsAt]);

  useEffect(()=>{
    const timers = toasts
      .filter(toast=>toast.duration > 0)
      .map(toast=>setTimeout(
        ()=>setToasts(current=>current.filter(item=>item.id !== toast.id)),
        Math.max(0, toast.createdAt + toast.duration - Date.now()),
      ));
    return ()=>timers.forEach(clearTimeout);
  },[toasts]);

  function closeActionMenus(){
    setOpenActionMenuId("");
  }

  useEffect(()=>{
    const handlePointerDown = event => {
      if(event.target?.closest?.("[data-action-menu]")) return;
      closeActionMenus();
    };
    const handleKeyDown = event => {
      if(event.key === "Escape") closeActionMenus();
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  },[]);

  useEffect(()=>{
    closeActionMenus();
  },[
    screen,
    appMode,
    selectedStudentId,
    studentDetailView,
    selectedWorkoutDetailKey,
    selectedWorkoutExerciseIndex,
    editingWorkoutExerciseIndex,
    selectedExerciseDetailId,
    selectedBodyRecord,
    showStudentBodyForm,
    showProfileBodyEditor,
    showInviteForm,
    openSession,
    assignmentWorkoutId,
    showWorkoutEditor,
    showWorkoutLibrary,
    showExerciseEditor
  ]);

  function dismissToast(id){
    setToasts(current=>current.filter(toast=>toast.id !== id));
  }

  function notify(message, type="success", options={}){
    setToasts(current=>enqueueToast(current, {
      id:makeId(),
      message,
      type,
      duration:options.duration,
      onRetry:options.onRetry,
      retryLabel:options.retryLabel,
    }));
  }

  function hasWorkoutGroups(groups){
    return Array.isArray(groups) && groups.some(group=>Array.isArray(group?.items) && group.items.length > 0);
  }

  function resolveWorkout(workoutKey, options={}){
    const requestedKey = String(workoutKey || "");
    const candidates = options.fallback === false ? [requestedKey] : [...new Set([requestedKey, ...Object.keys(workouts), ...Object.keys(allWorkouts)])];
    for(const key of candidates){
      const groups = hasWorkoutGroups(workouts[key]) ? workouts[key] : hasWorkoutGroups(allWorkouts[key]) ? allWorkouts[key] : null;
      if(!groups) continue;
      const metadata = workoutMetaForKey(key);
      const workoutId = isUuid(metadata.id) ? metadata.id : key;
      return {key, workoutId, groups, items:flatten(groups), metadata, label:workoutLabels[key] || allWorkoutLabels[key] || metadata.name || "Treino"};
    }
    return {key:"", workoutId:"", groups:[], items:[], metadata:{}, label:""};
  }
  function resolveWorkoutGroups(workoutKey){ return resolveWorkout(workoutKey).groups; }

  const currentWorkout = resolveWorkout(workout);
  const currentGroups = currentWorkout.groups;
  const currentItems = currentWorkout.items;
  const activeSessionItems = activeSession?.plannedItems || [];
  const sessionExerciseOrder = activeSession?.exerciseOrder || activeSessionItems.map((_, index)=>index);
  const sessionBlocks = activeSession?.sessionBlocks || activeSessionItems.map((_, index)=>({type:"single", indexes:[index]}));
  const displayGroups = activeSession
    ? sessionBlocks
      .map(block=>({
        type:block.type || "single",
        indexes:[...(block.indexes || [])].sort((a,b)=>sessionExerciseOrder.indexOf(a) - sessionExerciseOrder.indexOf(b))
      }))
      .sort((a,b)=>Math.min(...a.indexes.map(index=>sessionExerciseOrder.indexOf(index))) - Math.min(...b.indexes.map(index=>sessionExerciseOrder.indexOf(index))))
      .map(block=>({type:block.type, items:block.indexes.map(index=>activeSessionItems[index])}))
    : currentGroups;
  const displayItems = activeSession ? activeSessionItems : currentItems;
  const displayItemIndexMap = useMemo(()=>{
    const map = new WeakMap();
    displayItems.forEach((item, index)=>map.set(item, index));
    return map;
  },[displayItems]);
  function workoutMetaForKey(key){
    if(baseWorkoutGroups[key]) return editedBaseWorkouts[key] || {};
    const raw = String(key || "");
    const byId = customWorkouts.find(item=>String(item.id) === raw);
    if(byId) return byId;
    const legacyIndex = /^P\d+$/.test(raw) ? Number(raw.slice(1)) - 1 : -1;
    return legacyIndex >= 0 ? customWorkouts[legacyIndex] || {} : {};
  }
  function customWorkoutIndexForKey(key){
    const raw = String(key || "");
    const byId = customWorkouts.findIndex(item=>String(item.id) === raw);
    return byId >= 0 ? byId : /^P\d+$/.test(raw) ? Number(raw.slice(1)) - 1 : -1;
  }

  const currentWorkoutMeta = currentWorkout.metadata;
  const currentWorkoutId = isUuid(currentWorkoutMeta.id) ? currentWorkoutMeta.id : "";
  const sessionExerciseState = activeSession ? activeSession.exercises || {} : {};
  const displayWorkoutLabel = activeSession ? activeSession.workoutLabel : workoutLabels[workout];
  const displayWorkoutKey = activeSession ? activeSession.workout : workout;
  const doneCount = activeSession ? Object.values(sessionExerciseState).filter(ex=>ex.done).length : currentItems.filter((_,i)=>draft[`${today()}-${workout}-${i}-done`]).length;
  const firstPendingExerciseIndex = activeSession ? displayItems.findIndex((_,idx)=>!sessionExerciseState[idx]?.done) : -1;
  const currentExecutionExerciseIndex = activeSession
    ? activeExerciseIndex !== null ? activeExerciseIndex : firstPendingExerciseIndex >= 0 ? firstPendingExerciseIndex : null
    : null;
  const pct = displayItems.length ? Math.round(doneCount/displayItems.length*100) : 0;
  const sessionElapsedSeconds = activeSession ? Math.floor((sessionTick - activeSession.startedAt)/1000) : 0;

  const activeExecutionItem = activeSession && currentExecutionExerciseIndex !== null
    ? activeSessionItems[currentExecutionExerciseIndex] || null
    : null;
  const activeExecutionState = activeSession && currentExecutionExerciseIndex !== null
    ? sessionExerciseState[currentExecutionExerciseIndex] || {sets:[], done:false}
    : null;
  const activeExecutionBlock = activeSession && currentExecutionExerciseIndex !== null
    ? sessionBlocks.find(block=>block.indexes?.includes(currentExecutionExerciseIndex)) || null
    : null;
  const activeExecutionBlockPosition = activeExecutionBlock?.indexes?.indexOf(currentExecutionExerciseIndex) ?? -1;
  const activeExecutionOrderPosition = currentExecutionExerciseIndex !== null
    ? sessionExerciseOrder.indexOf(currentExecutionExerciseIndex)
    : -1;
  const previousExecutionExerciseIndex = activeExecutionOrderPosition > 0
    ? sessionExerciseOrder[activeExecutionOrderPosition - 1]
    : null;
  const nextExecutionExerciseIndex = activeExecutionOrderPosition >= 0 && activeExecutionOrderPosition < sessionExerciseOrder.length - 1
    ? sessionExerciseOrder[activeExecutionOrderPosition + 1]
    : null;
  const activeExecutionEnrichedItem = activeExecutionItem && appMode === "atleta" ? enrichWorkoutExercise(activeExecutionItem) : activeExecutionItem;
  const activeExecutionEquipment = activeExecutionEnrichedItem
    ? (Array.isArray(activeExecutionEnrichedItem.equipmentList) && activeExecutionEnrichedItem.equipmentList.length
      ? activeExecutionEnrichedItem.equipmentList.join(" · ")
      : activeExecutionEnrichedItem.equipment || "")
    : "";
  const activeExecutionTargetSummary = activeExecutionItem ? exerciseRepSummary(activeExecutionItem) : "";
  const activeExecutionCurrentSetIndex = activeExecutionState?.sets?.findIndex(set=>!set.done) ?? -1;

  useEffect(()=>{
    if(screen === "treino" && activeSession?.workout && workout !== activeSession.workout) {
      setWorkout(activeSession.workout);
    }
  },[screen, activeSession, workout]);

  function setDraftVal(k,v){ const n={...draft,[k]:v}; setDraft(n); save("draft",n); }

  function editTimerSetpoint(){
    setRestCustomSeconds("");
    setShowRestPicker(true);
  }

  function applyRestDuration(seconds){
    const value = clampSeconds(seconds);
    const index = restExerciseIndex ?? activeExerciseIndex;
    if(activeSession && index !== null && index !== undefined){
      setExerciseRestOverrides(prev => ({...prev, [index]: value}));
      setRestExerciseIndex(index);
      setTimer({seconds:value, running:false});
    } else {
      setTimerSetpoint(value);
      void dataService.saveSettings({timerSetpoint:value}).catch(error=>{
        console.error("Erro ao salvar tempo de descanso:", error);
        notify("Não foi possível salvar a preferência de descanso.", "warning");
      });
      setTimer({seconds:value, running:false});
    }
    setShowRestPicker(false);
  }

  async function toggleAutoStartRestTimer(enabled){
    const previous = autoStartRestTimer;
    setAutoStartRestTimer(enabled);
    try{
      await dataService.saveSettings({autoStartRestTimer: enabled});
    } catch(error){
      console.error("Erro ao salvar início automático:", error);
      setAutoStartRestTimer(previous);
      notify("Não foi possível salvar essa preferência.", "warning");
    }
  }

  async function changeTheme(nextTheme){
    const previous = theme;
    const normalizedTheme = nextTheme === "light" ? "light" : "dark";
    persistStoredTheme(normalizedTheme);
    setTheme(normalizedTheme);
    try{
      await dataService.saveSettings({theme: normalizedTheme});
      notify(normalizedTheme === "light" ? "Tema claro aplicado." : "Tema escuro aplicado.", "info");
    } catch(error){
      console.error("Erro ao salvar tema:", error);
      persistStoredTheme(previous);
      setTheme(previous);
      notify("Não foi possível salvar o tema.", "warning");
    }
  }

  function lastLoad(exerciseName){
    for(const s of sessions){
      for(const item of s.items || []){
        if(item.exercise === exerciseName && item.load) return {load:item.load, date:s.date, rpe:item.rpe || ""};
      }
    }
    return null;
  }

  function loadHistory(exerciseName){
    const rows=[];
    for(const s of sessions){
      for(const item of s.items || []){
        if(item.exercise === exerciseName && item.load) rows.push({date:s.date, workout:s.workoutLabel || s.workout, load:item.load, rpe:item.rpe || "", note:item.note || ""});
      }
    }
    return rows.slice(0,8);
  }

  async function saveSession(){
    const items = currentItems.map((e,i)=>({
      exercise:e.name,
      done:!!draft[`${today()}-${workout}-${i}-done`],
      load:draft[`${today()}-${workout}-${i}-load`]||"",
      rpe:draft[`${today()}-${workout}-${i}-rpe`]||"",
      note:draft[`${today()}-${workout}-${i}-note`]||"",
      type:getExerciseType(e),
      group:e.group || (e.tags || [])[0] || "Outro",
      objective:e.objective || ""
    }));
    const session = {id:makeId(), date:new Date().toLocaleString("pt-BR"), workout, workoutLabel:workoutLabels[workout], items};
    await dataService.saveWorkoutSession(session);
    const data = await dataService.getAppData();
    applyAppData(data);
    setDataMode(await dataService.getMode());
    notify("Treino salvo.");
  }

  async function deleteSession(id){
    if(!ensureMutationAllowed()) return;
    if(!confirm("Excluir esta sessão do histórico?")) return;
    return runPendingAction(`delete-session:${id}`, async()=>{
    try{
      await dataService.deleteWorkoutSession(id);
      setSessions(current=>current.filter(session=>session.id !== id));
      setWorkoutSessions(current=>current.filter(session=>session.id !== id));
      setOpenSession(null);
      notify("Sessão excluída.");
    } catch(error){
      console.error("Erro ao excluir sessão:", error);
      notify(error?.message || "Não foi possível excluir a sessão.", "error");
    }
    });
  }

  async function addBody(e){
    e.preventDefault();
    if(!ensureMutationAllowed()) return;
    const form = e.currentTarget;
    return runPendingAction("save-profile-body", async()=>{
    const f = new FormData(form);
    const record = buildBodyRecordFromForm(f, {fallbackAge: profile.age});
    const age = String(record.age || "").trim();
    const effectiveAge = age || String(profile.age || "").trim();
    record.age = effectiveAge;
    const b=[record, ...personalBody];
    const personalBodyIds = new Set(personalBody.map(item => item.id).filter(Boolean));
    const nextBody = [...b, ...body.filter(item => item.id && !personalBodyIds.has(item.id))];
    setBodyMessage("");
    try{
      if(age && age !== String(profile.age || "")){
        const p = {...profile, age};
        await dataService.saveSettings({profile: p});
        setProfile(p);
      }
      await dataService.saveValue("body", dataMode === "cloud" ? [record] : nextBody);
      setBody(nextBody);
      form?.reset?.();
      clearDirty("profile-body");
      removeEditorDraft(globalThis.localStorage, currentDraftKey("profile-body", "current"));
      setBodyMessage("Dados corporais salvos.");
      notify("Dados corporais salvos.");
    } catch(error){
      console.error("Erro ao salvar dados corporais:", error);
      setBodyMessage("Não foi possível salvar os dados corporais. Tente novamente.");
    }
    });
  }

  function buildBodyRecordFromForm(f, target={}){
    const method = String(f.get("bodyFatMethod") || "manual").trim();
    const manualBf = String(f.get("bodyFatManual") || f.get("bf") || "").trim();
    const draftRecord = {
      bodyFatMethod:method,
      sex:String(f.get("sex") || "").trim(),
      age:String(f.get("age") || target.fallbackAge || "").trim(),
      height:String(f.get("height") || "").trim(),
      cintura:String(f.get("cintura") || "").trim(),
      abdomen:String(f.get("abdomen") || "").trim(),
      hip:String(f.get("hip") || "").trim(),
      neck:String(f.get("neck") || "").trim(),
      skinfoldChest:String(f.get("skinfoldChest") || "").trim(),
      skinfoldAbdominal:String(f.get("skinfoldAbdominal") || "").trim(),
      skinfoldThigh:String(f.get("skinfoldThigh") || "").trim(),
      skinfoldTriceps:String(f.get("skinfoldTriceps") || "").trim(),
      skinfoldSubscapular:String(f.get("skinfoldSubscapular") || "").trim(),
      skinfoldSuprailiac:String(f.get("skinfoldSuprailiac") || "").trim(),
      skinfoldMidaxillary:String(f.get("skinfoldMidaxillary") || "").trim()
    };
    const bfResult = calculateBodyFat(draftRecord);
    const useMethodOnlyBodyFat = f.get("bodyFatOverrideMode") === "methodOnly";
    const useManual = method === "manual" || (!useMethodOnlyBodyFat && f.get("useManualBodyFat") === "on");
    const finalBf = useMethodOnlyBodyFat && method !== "manual"
      ? (bfResult.final || bfResult.calculated || "")
      : useManual && manualBf ? manualBf : (bfResult.final || bfResult.calculated || manualBf);
    return {
      id:makeId(),
      date:String(f.get("date") || today()).trim() || today(),
      sex:draftRecord.sex,
      age:draftRecord.age,
      peso:String(f.get("peso") || "").trim(),
      height:draftRecord.height,
      bf:finalBf,
      bodyFatMethod:method,
      bodyFatMethodLabel:bfMethodLabel(method),
      bodyFatCalculated:bfResult.calculated || "",
      bodyFatManual:manualBf,
      bodyFatFinal:finalBf,
      bodyDensity:bfResult.density || "",
      skinfoldSum:bfResult.skinfoldSum || "",
      bodyFatMessage:bfResult.message || "",
      cintura:String(f.get("cintura") || "").trim(),
      neck:draftRecord.neck,
      shoulder:String(f.get("shoulder") || "").trim(),
      hip:draftRecord.hip,
      chest:String(f.get("chest") || "").trim(),
      abdomen:draftRecord.abdomen,
      arm:String(f.get("arm") || "").trim(),
      forearm:String(f.get("forearm") || "").trim(),
      thigh:String(f.get("thigh") || "").trim(),
      calf:String(f.get("calf") || "").trim(),
      notes:String(f.get("notes") || "").trim(),
      skinfoldChest:draftRecord.skinfoldChest,
      skinfoldAbdominal:draftRecord.skinfoldAbdominal,
      skinfoldThigh:draftRecord.skinfoldThigh,
      skinfoldTriceps:draftRecord.skinfoldTriceps,
      skinfoldSubscapular:draftRecord.skinfoldSubscapular,
      skinfoldSuprailiac:draftRecord.skinfoldSuprailiac,
      skinfoldMidaxillary:draftRecord.skinfoldMidaxillary,
      skinfoldCalf:String(f.get("skinfoldCalf") || "").trim(),
      skinfoldNotes:String(f.get("skinfoldNotes") || "").trim(),
      recordedBy:currentUserId,
      recordedByName:currentUserName,
      recordedByEmail:currentUserEmail,
      ...(target.studentId ? {
        studentId:target.studentId,
        studentName:target.studentName || "",
        studentEmail:target.studentEmail || "",
        coachId:currentUserId,
        coachName:currentUserName,
        coachEmail:currentUserEmail,
      } : {})
    };
  }

  async function addStudentBody(e, student){
    e.preventDefault();
    if(!ensureMutationAllowed()) return;
    if(!student?.studentId) {
      setStudentMessage("O aluno precisa aceitar o convite antes de receber registros corporais.");
      return;
    }
    const form = e.currentTarget;
    return runPendingAction(`save-student-body:${student.studentId}`, async()=>{
    const record = buildBodyRecordFromForm(new FormData(form), student.isSelf ? {
      fallbackAge:student.age || profile.age || ""
    } : {
      studentId:student.studentId,
      studentName:student.studentName,
      studentEmail:student.studentEmail,
      fallbackAge:student.age || ""
    });
    const nextBody = [record, ...body];
    setStudentMessage("");
    try{
      await dataService.saveValue("body", dataMode === "cloud" ? [record] : nextBody);
      setBody(nextBody);
      form.reset();
      clearDirty("student-body");
      removeEditorDraft(globalThis.localStorage, currentDraftKey("student-body", student.id || "student"));
      setShowStudentBodyForm(false);
      setStudentDetailView("");
      setStudentMessage("Registro corporal salvo.");
      notify("Registro corporal salvo.");
    } catch(error){
      console.error("Erro ao salvar dados corporais do aluno:", error);
      setStudentMessage("Não foi possível salvar os dados corporais do aluno.");
    }
    });
  }

  async function deleteBodyRecord(record, index){
    if(!ensureMutationAllowed()) return false;
    if(!canManageBodyRecord(record)){
      const message = "Você pode excluir apenas registros corporais criados por você.";
      setBodyMessage(message);
      setStudentMessage(message);
      return false;
    }
    if(!confirm("Excluir este registro de dados corporais?")) return false;
    return runPendingAction(`delete-body:${record?.id || index}`, async()=>{
    const next = record?.id
      ? body.filter(item => item.id !== record.id)
      : body.filter((item, i) => i !== index);
    setBodyMessage("");
    try{
      if(record?.id) await dataService.deleteBodyData(record.id);
      else await dataService.saveValue("body", next);
      setBody(next);
      setBodyMessage("Registro corporal excluído.");
      return true;
    } catch(error){
      console.error("Erro ao excluir dados corporais:", error);
      setBodyMessage("Não foi possível excluir este registro. Tente novamente.");
      setStudentMessage("Não foi possível excluir este registro corporal.");
      return false;
    }
    });
  }

  function canManageBodyRecord(record){
    if(!record || !currentUserId) return false;
    const authorId = String(record.recordedBy || "");
    if(authorId) return authorId === currentUserId;
    const coachId = String(record.coachId || "");
    if(coachId && coachId !== currentUserId) return false;
    return true;
  }

  function bodyRecordDetailLines(record){
    if(!record) return [];
    return [
      ["Data", record.date],
      ["Sexo", record.sex === "male" ? "Masculino" : record.sex === "female" ? "Feminino" : record.sex],
      ["Idade", record.age],
      ["Peso", record.peso ? `${record.peso} kg` : ""],
      ["Altura", record.height ? `${record.height} cm` : ""],
      ["BF final", bodyFatValue(record) ? `${bodyFatValue(record)}%` : ""],
      ["Método BF", record.bodyFatMethodLabel || bfMethodLabel(record.bodyFatMethod)],
      ["BF calculado", record.bodyFatCalculated ? `${record.bodyFatCalculated}%` : ""],
      ["BF manual", record.bodyFatManual ? `${record.bodyFatManual}%` : ""],
      ["Densidade", record.bodyDensity],
      ["Soma de dobras", record.skinfoldSum ? `${record.skinfoldSum} mm` : ""],
      ["Pescoço", record.neck],
      ["Ombro", record.shoulder],
      ["Cintura", record.cintura],
      ["Quadril", record.hip],
      ["Peito/tórax", record.chest],
      ["Abdômen", record.abdomen],
      ["Braço", record.arm],
      ["Antebraço", record.forearm],
      ["Coxa", record.thigh],
      ["Panturrilha", record.calf],
      ["Peitoral", record.skinfoldChest],
      ["Abdominal", record.skinfoldAbdominal],
      ["Coxa dobra", record.skinfoldThigh],
      ["Tríceps", record.skinfoldTriceps],
      ["Subescapular", record.skinfoldSubscapular],
      ["Supra-ilíaca", record.skinfoldSuprailiac],
      ["Axilar média", record.skinfoldMidaxillary],
      ["Panturrilha dobra", record.skinfoldCalf],
      ["Observações", record.notes],
      ["Observações do adipômetro", record.skinfoldNotes],
    ].filter(([,value])=>String(value || "").trim());
  }

  async function createStudentInvite(studentEmail, extra={}){
    if(!ensureMutationAllowed()) return;
    if(!studentEmail) return setStudentMessage("Informe o e-mail do aluno.");
    return runPendingAction("create-invite", async()=>{
    const link = {
      id:makeId(),
      coachId:currentUserId,
      coachName:currentUserName,
      coachEmail:currentUserEmail,
      studentId:"",
      studentName:"",
      studentEmail,
      objective:String(extra.objective || "").trim(),
      notes:String(extra.notes || "").trim(),
      status:"pending",
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    };
    try{
      const savedLink = await dataService.inviteStudentByEmail(link);
      setCoachStudents(current => [savedLink, ...current.filter(item=>item.id !== savedLink.id)]);
      setGeneratedInvite(savedLink);
      setStudentMessage("Convite criado. Quando o aluno entrar com esse e-mail, ele poderá aceitar ou recusar.");
      return savedLink;
    } catch(error){
      console.error("Erro ao convidar aluno:", error);
      setStudentMessage("Não foi possível criar o convite.");
    }
    });
  }

  async function inviteStudent(e){
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const savedLink = await createStudentInvite(normalizeEmail(data.get("studentEmail")), {
      objective:data.get("objective"),
      notes:data.get("notes")
    });
    if(savedLink) form.reset();
  }

  async function generateInviteFromButton(){
    const email = normalizeEmail(prompt("E-mail do aluno"));
    if(!email) {
      setStudentMessage("Informe o e-mail do aluno para gerar o convite.");
      return;
    }
    await createStudentInvite(email);
  }

  function inviteShareText(link){
    const code = String(link?.id || "");
    return `Convite Treino Tonon: ${code}`;
  }

  async function copyInvite(link){
    const text = inviteShareText(link);
    await navigator.clipboard?.writeText(text);
    notify("Convite copiado.", "info");
  }

  function shareInvite(link){
    const text = inviteShareText(link);
    if(navigator.share) navigator.share({text}).catch(()=>{});
    else void copyInvite(link);
  }

  function openInviteResponder(link){
    if(!link?.id) return;
    setInviteModalLink(link);
  }

  function dismissInviteModal(link){
    if(link?.id) setDismissedInviteIds(current => current.includes(link.id) ? current : [...current, link.id]);
    setInviteModalLink(null);
  }

  async function answerCoachInvite(link, accepted){
    if(!ensureMutationAllowed()) return;
    if(!link?.id) {
      notify("Convite inválido. Recarregue o app e tente novamente.", "info");
      return;
    }
    if(normalizeEmail(link.studentEmail) !== currentUserEmail) {
      notify("Este convite pertence a outro e-mail.", "info");
      return;
    }
    const actionKey = `invite-response:${link.id}`;
    return runPendingAction(actionKey, async()=>{
    const invite = {
      ...link,
      id:link.id,
      studentId:currentUserId,
      studentName:currentUserName,
      studentEmail:normalizeEmail(link.studentEmail),
      status:link.status
    };
    const optimisticStatus = accepted ? "active" : "refused";
    setDismissedInviteIds(current => current.filter(id => id !== link.id));
    setCoachStudents(current => current.map(item => item.id === link.id ? {...item, ...invite, status:optimisticStatus} : item));
    try{
      const savedLink = accepted
        ? await dataService.acceptCoachInvite(invite)
        : await dataService.refuseCoachInvite(invite);
      setCoachStudents(current => current.map(item=>item.id === link.id ? savedLink : item));
      const data = await refreshAppData();
      setInviteModalLink(null);
      if(accepted) {
        setCoachStudents(data.coachStudents || []);
        setScreen("dashboard");
      } else {
        setCoachStudents(data.coachStudents || []);
      }
    } catch(error) {
      console.error("Erro ao responder convite:", error);
      await refreshAppData().catch(()=>{});
      notify(error?.message || (accepted ? "Não foi possível aceitar este convite." : "Não foi possível recusar este convite."), "error");
    }
    });
  }

  async function updateStudentStatus(link, status){
    if(!ensureMutationAllowed()) return;
    if(status === "active"){
      setStudentMessage("Somente o aluno pode ativar o vínculo aceitando o convite.");
      return;
    }
    const next = {
      ...link,
      status,
      inactiveAt:status === "inactive" ? new Date().toISOString() : link.inactiveAt,
      updatedAt:new Date().toISOString()
    };
    try{
      const savedLink = await dataService.deactivateCoachStudentLink(next);
      setCoachStudents(current => current.map(item=>item.id === link.id ? savedLink : item));
    } catch(error) {
      console.error("Erro ao atualizar vínculo:", error);
      setStudentMessage("Não foi possível inativar este vínculo.");
    }
  }

  async function removeStudentLink(link){
    if(!ensureMutationAllowed()) return;
    try{
      await dataService.deleteCoachStudent(link.id);
      setCoachStudents(current => current.filter(item=>item.id !== link.id));
      setEndingStudentLink(null);
      if(selectedStudentId === link.id) setSelectedStudentId("");
      notify("Vínculo encerrado.", "info");
    } catch(error) {
      console.error("Erro ao encerrar vínculo:", error);
      setStudentMessage("Não foi possível encerrar este vínculo.");
    }
  }

  async function saveStudentAdminInfo(event){
    event.preventDefault();
    if(!ensureMutationAllowed()) return;
    if(!editingStudentLink?.id) return;
    const form = event.currentTarget;
    return runPendingAction(`save-student:${editingStudentLink.id}`, async()=>{
    const data = new FormData(form);
    const next = {
      ...editingStudentLink,
      studentName:String(data.get("studentName") || "").trim(),
      objective:String(data.get("objective") || "").trim(),
      notes:String(data.get("notes") || "").trim(),
      adminEdit:true,
      updatedAt:new Date().toISOString()
    };
    try{
      await dataService.saveCoachStudent(next);
      setCoachStudents(current => current.map(item => item.id === next.id ? {...item, ...next} : item));
      clearDirty("student-admin");
      removeEditorDraft(globalThis.localStorage, currentDraftKey("student-admin", editingStudentLink.id));
      setEditingStudentLink(null);
      setStudentMessage("");
      notify("Aluno atualizado.", "info");
    } catch(error) {
      console.error("Erro ao salvar informações do aluno:", error);
      setStudentMessage("Não foi possível salvar as informações do aluno.");
    }
    });
  }

  async function saveProfile(e){
    e.preventDefault();
    if(!ensureMutationAllowed()) return;
    const f = new FormData(e.currentTarget);
    const p = {...profile, name:String(f.get("name") || "").trim(), age:String(f.get("age") ?? profile.age ?? "").trim()};
    if(!p.name){ notify("Informe seu nome.", "error"); return; }
    return runPendingAction("save-profile", async()=>{
    try{
    setProfile(p);
    await dataService.saveSettings({profile: p});
    try{
      if(currentUser || !isSupabaseConfigured){
        const user = await authService.updateCurrentUser({name: p.name || currentUser?.name || "Usuario Local"});
        setCurrentUser(user);
      }
    } catch {
      // Perfil local deve continuar salvando mesmo se a sessão Supabase não estiver ativa.
    }
    notify("Perfil salvo.");
    clearDirty("profile-name");
    removeEditorDraft(globalThis.localStorage, currentDraftKey("profile-name", "current"));
    setShowNameEditor(false);
    } catch(error){
      console.error("Erro ao salvar perfil:", error);
      notify(error?.message || "Não foi possível salvar o perfil.", "error");
    }
    });
  }

  async function saveExerciseToLibrary(ex){
    const {editingName, editingId, ...exerciseData} = ex || {};
    const normalized = catalogExercise({...exerciseData, id:exerciseData.id || editingId || makeId()});
    if(!normalized.name) return;
    const normalizedName = normalizeExerciseName(normalized.name);
    const exists = fullLibrary.some(item => String(item.id || "") === normalized.id || normalizeExerciseName(item.name) === normalizedName);
    const hidden = hiddenLibrary.filter(name => normalizeExerciseName(name) !== normalizedName);
    if(hidden.length !== hiddenLibrary.length){
      setHiddenLibrary(hidden);
      await dataService.saveSettings({hiddenLibrary: hidden});
    }
    if(!exists){
      const updated = [...userLibrary, normalized];
      setUserLibrary(updated);
      await dataService.saveExercise(normalized);
    }
  }

  function updateNewExerciseField(field, value){
    setNewExercise(current => {
      const next = {...current, [field]:value};
      if(field === "useRepTargetsBySet" && value && !normalizeRepTargets(next.targetRepsBySet).length){
        next.targetRepsBySet = expandRepTargetsForSets([], plannedSetCount(next.sets), next.reps).filter(Boolean);
      }
      if(field === "useRepTargetsBySet" && !value){
        next.targetRepsBySet = parseRepTargets(next.reps);
      }
      if((field === "reps" || field === "type") && !next.useRepTargetsBySet){
        next.targetRepsBySet = isSegmentedRepType(next.type) ? parseDropTargets(next.reps) : parseRepTargets(next.reps);
      }
      if(field === "sets" && next.useRepTargetsBySet){
        next.targetRepsBySet = repTargetFieldLabels(next);
      }
      return next;
    });
  }

  function updateExerciseFormField(field, value){
    setExerciseForm(current => {
      const next = {...current, [field]:value};
      if(field === "useRepTargetsBySet" && value && !normalizeRepTargets(next.targetRepsBySet).length){
        next.targetRepsBySet = expandRepTargetsForSets([], plannedSetCount(next.sets), next.reps).filter(Boolean);
      }
      if(field === "useRepTargetsBySet" && !value){
        next.targetRepsBySet = parseRepTargets(next.reps);
      }
      if((field === "reps" || field === "type") && !next.useRepTargetsBySet){
        next.targetRepsBySet = isSegmentedRepType(next.type) ? parseDropTargets(next.reps) : parseRepTargets(next.reps);
      }
      if(field === "sets" && next.useRepTargetsBySet){
        next.targetRepsBySet = repTargetFieldLabels(next);
      }
      return next;
    });
  }

  function updateNewExerciseRepTarget(index, value){
    setNewExercise(current => ({...current, targetRepsBySet:setRepTargetLabel(current, index, value), useRepTargetsBySet:true}));
  }

  function updateExerciseFormRepTarget(index, value){
    setExerciseForm(current => ({...current, targetRepsBySet:setRepTargetLabel(current, index, value), useRepTargetsBySet:true}));
  }

  function updatePreviewRepTarget(idx, setIdx, value){
    setNewWorkout(w=>({...w, items:w.items.map((it,i)=>i===idx ? {...it, targetRepsBySet:setRepTargetLabel(it, setIdx, value), useRepTargetsBySet:true} : it)}));
  }

  function updatePreviewLoadTarget(idx, setIdx, value){
    setNewWorkout(w=>({...w, items:w.items.map((it,i)=>i===idx ? {...it, targetLoadsBySet:setLoadTargetLabel(it, setIdx, value)} : it)}));
  }

  function updatePreviewDropTarget(idx, setIdx, segmentIdx, field, value){
    setNewWorkout(w=>({...w, items:w.items.map((it,i)=>{
      if(i !== idx) return it;
      const dropTargetsBySet = setDropTargetValue(it, setIdx, segmentIdx, field, value);
      const reps = dropTargetsBySet[0]?.map(cell=>cell.reps).join(" + ") || it.reps;
      return {...it, dropTargetsBySet, reps};
    })}));
  }

function resetExerciseForm(){
  setExerciseForm({...blankExercise, editingName:null});
}

function catalogExercise(ex={}){
  const {equipmentList, tags} = splitExerciseMetadata(ex);
  const group = String(ex.primaryGroup || ex.primary_group || ex.group || ex.muscleGroup || ex.muscle_group || "Outro").trim() || "Outro";
  const category = String(ex.category || group).trim() || group;
  const technicalNotes = String(ex.technicalNotes || ex.technical_notes || ex.notes || ex.instructions || "").trim();
  return {
    id:String(ex.id || makeId()),
    name:String(ex.name || "").trim(),
    category,
    group,
    primaryGroup:group,
    secondaryGroups:normalizeList(ex.secondaryGroups || ex.secondary_groups),
    equipmentList,
    tags,
    equipment:equipmentList.join(", "),
    notes:String(ex.notes || "").trim(),
    technicalNotes
  };
}

function exerciseCatalogToWorkoutItem(ex={}){
  const normalized = catalogExercise(ex);
  const workoutExerciseId = makeId();
  return {
    id:workoutExerciseId,
    workoutExerciseId,
    exerciseId:normalized.id,
    name:normalized.name,
    group:normalized.primaryGroup,
    notes:"",
    sets:"",
    reps:"",
    load:"",
    rest:"",
    type:"",
    objective:"",
    targetRepsBySet:[],
    useRepTargetsBySet:false
  };
}

  function focusExerciseLibrary(){
    requestAnimationFrame(()=>document.getElementById("exercise-library-list")?.scrollIntoView({block:"start", behavior:"smooth"}));
  }

  function closeExerciseEditor(){
    if(!bypassDirtyGuardRef.current && exerciseEditorDirty) {
      requestProtectedAction(closeExerciseEditor);
      return;
    }
    resetExerciseForm();
    setShowExerciseEditor(false);
    setLibrarySearch("");
    focusExerciseLibrary();
  }

  async function saveLibraryExercise(e){
    e.preventDefault();
    if(!ensureMutationAllowed()) return;
    const {editingName, editingId, ...exerciseData} = exerciseForm;
    const normalized = catalogExercise({...exerciseData, id:exerciseData.id || editingId || makeId()});
    if(!normalized.name) return alert("Informe o nome do exercício.");
    return runPendingAction("save-exercise", async()=>{
    const oldName = String(editingName || normalized.name);
    const oldKey = normalizeExerciseName(oldName);
    const normalizedKey = normalizeExerciseName(normalized.name);
    const editingKey = String(editingId || normalized.id || "").toLowerCase();
    const userLibraryHadEditedExercise = userLibrary.some(ex =>
      (editingKey && String(ex.id || "").toLowerCase() === editingKey)
      || normalizeExerciseName(ex.name) === oldKey
    );
    const updatedLibrary = userLibrary.filter(ex => {
      const itemId = String(ex.id || "").toLowerCase();
      const itemName = normalizeExerciseName(ex.name);
      if(editingKey && itemId === editingKey) return false;
      if(itemName === oldKey) return false;
      if(itemName === normalizedKey) return false;
      return true;
    });
    const finalLibrary = [...updatedLibrary, normalized].sort((a,b)=>a.name.localeCompare(b.name));
    let finalHidden = hiddenLibrary.filter(name => normalizeExerciseName(name) !== normalizedKey);
    if(editingName && !userLibraryHadEditedExercise && oldKey !== normalizedKey && !finalHidden.some(name => normalizeExerciseName(name) === oldKey)){
      finalHidden = [...finalHidden, oldName];
    }
    const updatedWorkouts = editingName && oldKey !== normalizedKey
      ? customWorkouts.map(w => ({...w, items:(w.items || []).map(it => normalizeExerciseName(it.name) === oldKey ? {...it, name:normalized.name, group:normalized.group} : it)}))
      : null;

    try{
      await dataService.saveExercise(normalized);
      await dataService.saveSettings({hiddenLibrary: finalHidden});
      if(updatedWorkouts){
        for(const workoutItem of updatedWorkouts) await dataService.saveWorkout(workoutItem);
      }
    } catch(error){
      console.error("Erro ao salvar exercício:", error);
      notify(error?.message || "Não foi possível salvar o exercício. Tente novamente.", "error");
      return;
    }

    setUserLibrary(finalLibrary);
    setHiddenLibrary(finalHidden);
    if(updatedWorkouts) setCustomWorkouts(updatedWorkouts);
    removeEditorDraft(globalThis.localStorage, currentDraftKey("exercise-editor"));
    exerciseEditorBaselineRef.current = {...blankExercise, editingName:null};
    bypassDirtyGuardRef.current = true;
    closeExerciseEditor();
    queueMicrotask(()=>{ bypassDirtyGuardRef.current = false; });
    notify("Exercício salvo na biblioteca.");
    });
  }

  function startNewExerciseEditor(){
    const initial = {...blankExercise, editingName:null};
    exerciseEditorBaselineRef.current = initial;
    setExerciseForm(restoreControlledDraft("exercise-editor", "new", initial));
    setShowExerciseEditor(true);
    requestAnimationFrame(()=>window.scrollTo({top:0, behavior:"smooth"}));
  }

  function editLibraryExercise(ex){
    const exerciseId = String(ex.id || "");
    const normalized = catalogExercise({...ex, id:exerciseId || ex.id});
    const initial = {...blankExercise, ...normalized, editingId:exerciseId, editingName:ex.name};
    exerciseEditorBaselineRef.current = initial;
    setExerciseForm(restoreControlledDraft("exercise-editor", exerciseDraftEntity(initial), initial));
    setShowExerciseEditor(true);
    setLibrarySearch(ex.name || "");
    requestAnimationFrame(()=>document.getElementById("exercise-editor")?.scrollIntoView({block:"start", behavior:"smooth"}));
  }

  async function deleteUserLibraryExercise(exercise){
    if(!ensureMutationAllowed()) return;
    const exerciseItem = typeof exercise === "object" && exercise ? exercise : {name:exercise};
    const normalizedName = String(exerciseItem.name || exercise || "").trim();
    if(!normalizedName) return;
    if(!confirm("Excluir este exercício da biblioteca? Treinos já criados e históricos salvos não serão apagados.")) return;
    const actionKey = `delete-exercise:${exerciseItem.id || normalizeExerciseName(normalizedName)}`;
    return runPendingAction(actionKey, async()=>{
    const key = normalizeExerciseName(normalizedName);
    const updated = userLibrary.filter(ex => normalizeExerciseName(ex.name) !== key);
    const hidden = hiddenLibrary.some(item => normalizeExerciseName(item) === key) ? hiddenLibrary : [...hiddenLibrary, normalizedName];
    try{
      await dataService.deleteExercise(exerciseItem.id || normalizedName);
      await dataService.saveSettings({hiddenLibrary: hidden});
      setUserLibrary(updated);
      setHiddenLibrary(hidden);
      if(normalizeExerciseName(exerciseForm.editingName) === key) closeExerciseEditor();
      if(selectedExerciseDetailId && normalizeExerciseName(selectedExerciseDetail?.name) === key) setSelectedExerciseDetailId("");
      notify("Exercício excluído.");
    } catch(error){
      console.error("Erro ao excluir exercício:", error);
      notify(error?.message || "Não foi possível excluir o exercício.", "error", {
        onRetry:()=>deleteUserLibraryExercise(exerciseItem),
      });
    }
    });
  }

  function startNewWorkout(){
    if(appMode !== "treinador") return;
    const initial = {...blankWorkout, type:"template", ownerId:currentUserId, coachId:currentUserId, coachName:currentUserName, coachEmail:currentUserEmail};
    workoutEditorBaselineRef.current = initial;
    setNewWorkout(restoreControlledDraft("workout-editor", "new", initial));
    setNewExercise(blankExercise);
    setShowWorkoutLibrary(false);
    setWorkoutLibraryFiltersOpen(false);
    clearWorkoutExerciseFilters();
    closeAssignment();
    setShowWorkoutEditor(true);
    requestAnimationFrame(()=>window.scrollTo({top:0, behavior:"smooth"}));
  }

  function addExercise(e){
    e.preventDefault();
    if(!newExercise.name.trim()) return alert("Informe o nome do exercício.");
    const workoutExerciseId = makeId();
    const item = exerciseWithRepTargets({...newExercise, id:workoutExerciseId, workoutExerciseId, name:newExercise.name.trim(), group:newExercise.group || "Outro"});
    setNewWorkout(w=>({...w, items:[...w.items, item]}));
    setNewExercise({...blankExercise, sets:"", reps:"", load:"", rest:"", type:"", objective:"", notes:"", targetRepsBySet:[], targetLoadsBySet:[], dropTargetsBySet:[], useRepTargetsBySet:false});
  }

  function updatePreviewItem(idx, patch){
    setNewWorkout(w=>({...w, items:w.items.map((it,i)=>{
      if(i !== idx) return it;
      const next = {...it, ...patch};
      if(("reps" in patch || "type" in patch) && !next.useRepTargetsBySet) next.targetRepsBySet = isSegmentedRepType(next.type) ? parseDropTargets(next.reps) : parseRepTargets(next.reps);
      if("sets" in patch && next.useRepTargetsBySet && !isSegmentedRepType(next.type)) {
        next.targetRepsBySet = repTargetFieldLabels(next);
        next.targetLoadsBySet = loadTargetFieldLabels(next);
      }
      if("sets" in patch && isDropSetType(next.type)) next.dropTargetsBySet = dropTargetMatrix(next);
      return next;
    })}));
  }

  function selectPreviewMethod(idx, type){
    setNewWorkout(current=>({...current, items:current.items.map((item,index)=>{
      if(index !== idx) return item;
      const nextType = normalizedExecutionMethod(type);
      if(nextType === "PROG") {
        const targets = expandRepTargetsForSets(item.targetRepsBySet, plannedSetCount(item.sets), item.reps).filter(Boolean);
        return {...item, type:nextType, useRepTargetsBySet:true, targetRepsBySet:targets.length ? targets : parseRepTargets(item.reps), targetLoadsBySet:loadTargetFieldLabels(item)};
      }
      if(isSegmentedRepType(nextType)) {
        const parts = segmentedRepValues(item);
        const base = {...item, type:nextType, reps:parts.join(" + "), useRepTargetsBySet:false, targetRepsBySet:parseDropTargets(parts.join(" + "))};
        return isDropSetType(nextType) ? {...base, dropTargetsBySet:dropTargetMatrix(base)} : base;
      }
      return {...item, type:nextType, useRepTargetsBySet:false, targetRepsBySet:parseRepTargets(item.reps)};
    })}));
  }

  function updatePreviewSegment(idx, segmentIndex, value){
    setNewWorkout(current=>({...current, items:current.items.map((item,index)=>{
      if(index !== idx) return item;
      const values = segmentedRepValues(item);
      values[segmentIndex] = value;
      const reps = values.join(" + ");
      return {...item, reps, targetRepsBySet:parseDropTargets(reps), useRepTargetsBySet:false};
    })}));
  }

  function addPreviewSegment(idx){
    setNewWorkout(current=>({...current, items:current.items.map((item,index)=>{
      if(index !== idx) return item;
      const values = [...segmentedRepValues(item), ""];
      const matrix = dropTargetMatrix(item).map(row=>[...row, {reps:"", load:String(item.load || "")}]);
      return {...item, reps:values.join(" + "), dropTargetsBySet:matrix};
    })}));
  }

  function removePreviewSegment(idx, segmentIndex){
    setNewWorkout(current=>({...current, items:current.items.map((item,index)=>{
      if(index !== idx) return item;
      const values = segmentedRepValues(item).filter((_,valueIndex)=>valueIndex !== segmentIndex);
      while(values.length < 2) values.push("");
      const matrix = dropTargetMatrix(item).map(row=>{
        const next = row.filter((_,valueIndex)=>valueIndex !== segmentIndex);
        while(next.length < 2) next.push({reps:"", load:String(item.load || "")});
        return next;
      });
      const reps = matrix[0]?.map(cell=>cell.reps).join(" + ") || values.join(" + ");
      return {...item, reps, targetRepsBySet:parseDropTargets(reps), dropTargetsBySet:matrix};
    })}));
  }

  function removePreviewItem(idx){
    setNewWorkout(w=>({...w, items:normalizeAllPreviewConjugates(w.items.filter((_,i)=>i!==idx))}));
  }

  function movePreviewItem(idx, dir){
    setNewWorkout(w=>{
      const groups = indexedWorkoutGroups(w.items);
      const groupIndex = groups.findIndex(group=>group.entries.some(entry=>entry.index === idx));
      const nextIndex = groupIndex + dir;
      if(groupIndex < 0 || nextIndex < 0 || nextIndex >= groups.length) return w;
      [groups[groupIndex], groups[nextIndex]] = [groups[nextIndex], groups[groupIndex]];
      return {...w, items:normalizeAllPreviewConjugates(groups.flatMap(group=>group.entries.map(entry=>entry.item)))};
    });
  }

  function normalizePreviewConjugateBlock(items, blockId){
    let position = 0;
    return items.map(item=>{
      if(item.conjugateBlockId !== blockId) return item;
      position += 1;
      return {...item, conjugatePosition:position};
    });
  }

  function startPreviewConjugateBlock(idx, conjugateKind="Bi-set"){
    setNewWorkout(current=>{
      const item = current.items[idx];
      if(!item) return current;
      const conjugateBlockId = makeId();
      return {...current, items:current.items.map((entry,index)=>index === idx ? {...entry, type:normalizedExecutionMethod(entry.type), conjugateBlockId, conjugatePosition:1, conjugateKind} : entry)};
    });
  }

  function linkPreviewToPreviousConjugate(idx){
    setNewWorkout(current=>{
      const previous = current.items[idx - 1];
      const item = current.items[idx];
      if(!previous || !item) return current;
      const conjugateBlockId = previous.conjugateBlockId || makeId();
      const conjugateKind = previous.conjugateKind || "Bi-set";
      const nextPosition = previous.conjugateBlockId ? current.items.filter(entry=>entry.conjugateBlockId === conjugateBlockId).length + 1 : 2;
      const items = current.items.map((entry, index)=>{
        if(index === idx - 1 && !previous.conjugateBlockId) return {...entry, type:normalizedExecutionMethod(entry.type), conjugateBlockId, conjugatePosition:1, conjugateKind};
        if(index === idx) return {...entry, type:normalizedExecutionMethod(entry.type), conjugateBlockId, conjugatePosition:nextPosition, conjugateKind};
        return entry;
      });
      return {...current, items};
    });
  }

  function removePreviewFromConjugate(idx){
    setNewWorkout(current=>{
      const item = current.items[idx];
      if(!item?.conjugateBlockId) return current;
      const items = current.items.map((entry,index)=>index === idx ? {...entry, type:normalizedExecutionMethod(entry.type), conjugateBlockId:"", conjugatePosition:null, conjugateKind:""} : entry);
      return {...current, items:normalizePreviewConjugateBlock(items, item.conjugateBlockId)};
    });
  }

  function updatePreviewConjugateKind(blockId, conjugateKind){
    setNewWorkout(current=>({...current, items:current.items.map(item=>item.conjugateBlockId === blockId ? {...item, conjugateKind} : item)}));
  }

  function dissolvePreviewConjugateBlock(blockId){
    setNewWorkout(current=>({...current, items:current.items.map(item=>item.conjugateBlockId === blockId ? {...item, type:normalizedExecutionMethod(item.type), conjugateBlockId:"", conjugatePosition:null, conjugateKind:""} : item)}));
  }

  function movePreviewConjugateBlock(blockId, direction){
    setNewWorkout(current=>{
      const groups = indexedWorkoutGroups(current.items);
      const index = groups.findIndex(group=>group.type === "conj" && group.blockId === blockId);
      const nextIndex = index + direction;
      if(index < 0 || nextIndex < 0 || nextIndex >= groups.length) return current;
      [groups[index], groups[nextIndex]] = [groups[nextIndex], groups[index]];
      return {...current, items:groups.flatMap(group=>group.entries.map(entry=>entry.item))};
    });
  }

  async function saveCustomWorkout(){
    if(appMode !== "treinador") return;
    if(!ensureMutationAllowed()) return;
    if(!newWorkout.name.trim()) return alert("Dê um nome para o treino.");
    if(newWorkout.items.length === 0) return alert("Adicione pelo menos um exercício.");
    const incompleteSegmentedExercise = newWorkout.items.find(item=>isRestPauseType(getExerciseType(item)) && segmentedRepValues(item).filter(Boolean).length < 2);
    if(incompleteSegmentedExercise) return alert(`Complete pelo menos duas etapas de repetições em ${incompleteSegmentedExercise.name}.`);
    const incompleteDropExercise = newWorkout.items.find(item=>isDropSetType(getExerciseType(item)) && dropTargetMatrix(item).some(row=>row.filter(cell=>String(cell.reps || "").trim()).length < 2));
    if(incompleteDropExercise) return alert(`Informe pelo menos dois drops em todas as séries de ${incompleteDropExercise.name}.`);
    const incompleteProgressiveExercise = newWorkout.items.find(item=>
      normalizedExecutionMethod(getExerciseType(item)) === "PROG"
      && repTargetFieldLabels(item).slice(0, plannedSetCount(item.sets)).some(value=>!String(value || "").trim())
    );
    if(incompleteProgressiveExercise) return alert(`Informe as repetições de todas as séries em ${incompleteProgressiveExercise.name}.`);
    return runPendingAction("save-workout", async()=>{
    try{
    const normalizedItems = normalizeAllPreviewConjugates(newWorkout.items).map(item=>withWorkoutExerciseIdentity(exerciseWithRepTargets(item)));
    for(const item of normalizedItems) await saveExerciseToLibrary(item);
    if(newWorkout.editingKey && baseWorkoutGroups[newWorkout.editingKey]){
      const previous = editedBaseWorkouts[newWorkout.editingKey] || {};
      const next = {...editedBaseWorkouts, [newWorkout.editingKey]:{
        ...previous,
        name:newWorkout.name,
        items:normalizedItems,
        objective:newWorkout.objective || "",
        frequency:newWorkout.frequency || "",
        weeklyFrequency:newWorkout.weeklyFrequency || newWorkout.frequency || "",
        notes:newWorkout.notes || "",
        description:newWorkout.description || newWorkout.notes || ""
      }};
      const hidden = hiddenBaseWorkouts.filter(k=>k !== newWorkout.editingKey);
      try {
        await dataService.saveSettings({editedBaseWorkouts: next, hiddenBaseWorkouts: hidden});
      } catch(error) {
        console.error("Erro ao salvar treino-base:", error);
        notify(error?.message || "Não foi possível salvar o treino-base.", "error");
        return;
      }
      setEditedBaseWorkouts(next);
      setHiddenBaseWorkouts(hidden);
      removeEditorDraft(globalThis.localStorage, currentDraftKey("workout-editor"));
      workoutEditorBaselineRef.current = blankWorkout;
      setNewWorkout(blankWorkout);
      setNewExercise(blankExercise);
      setShowWorkoutEditor(false);
      setWorkout(newWorkout.editingKey);
      notify("Alterações salvas.");
      return;
    }
    let list;
    let savedWorkout;
    const workoutType = newWorkout.type || (appMode === "treinador" ? "template" : "personal");
    if(newWorkout.editingId || Number.isInteger(newWorkout.editingIndex)){
      const currentIndex = Number.isInteger(newWorkout.editingIndex)
        ? newWorkout.editingIndex
        : customWorkouts.findIndex(w => w.id === newWorkout.editingId);
      const currentWorkout = customWorkouts[currentIndex];
      if(currentWorkout && workoutHasHistory(currentWorkout) && workoutPrescriptionSignature(currentWorkout.items) !== workoutPrescriptionSignature(normalizedItems)){
        alert("Este treino já possui histórico. Para preservar os registros, duplique o treino ou crie uma nova versão antes de alterar exercícios, séries ou cargas.");
        return;
      }
      const id = String(newWorkout.editingId || currentWorkout?.id || makeId());
      savedWorkout = {
        ...currentWorkout,
        id,
        name:newWorkout.name,
        items:normalizedItems,
        objective:newWorkout.objective || "",
        frequency:newWorkout.frequency || "",
        weeklyFrequency:newWorkout.frequency || currentWorkout?.weeklyFrequency || "",
        notes:newWorkout.notes || "",
        description:newWorkout.notes || newWorkout.description || "",
        type:workoutType || currentWorkout?.type || "personal",
        ownerId:workoutType === "student" ? (newWorkout.studentId || newWorkout.studentEmail) : currentUserId,
        coachId:workoutType === "student" || workoutType === "template" ? (newWorkout.coachId || currentUserId) : "",
        coachName:workoutType === "student" || workoutType === "template" ? (newWorkout.coachName || currentUserName) : "",
        coachEmail:workoutType === "student" || workoutType === "template" ? (newWorkout.coachEmail || currentUserEmail) : "",
        studentId:workoutType === "student" ? (newWorkout.studentId || currentWorkout?.studentId || "") : "",
        studentName:workoutType === "student" ? (newWorkout.studentName || currentWorkout?.studentName || "") : "",
        studentEmail:workoutType === "student" ? (newWorkout.studentEmail || currentWorkout?.studentEmail || "") : "",
        sourceWorkoutId:workoutSourceId(newWorkout) || workoutSourceId(currentWorkout),
        isActive:true,
      };
      list = customWorkouts.map((w, idx) => idx === currentIndex || w.id === id ? savedWorkout : w);
    } else {
      savedWorkout = {
        id:makeId(),
        name:newWorkout.name,
        items:normalizedItems,
        objective:newWorkout.objective || "",
        frequency:newWorkout.frequency || "",
        weeklyFrequency:newWorkout.frequency || "",
        notes:newWorkout.notes || "",
        description:newWorkout.notes || newWorkout.description || "",
        type:workoutType,
        ownerId:workoutType === "student" ? (newWorkout.studentId || newWorkout.studentEmail) : currentUserId,
        coachId:workoutType === "student" || workoutType === "template" ? currentUserId : "",
        coachName:workoutType === "student" || workoutType === "template" ? currentUserName : "",
        coachEmail:workoutType === "student" || workoutType === "template" ? currentUserEmail : "",
        studentId:workoutType === "student" ? (newWorkout.studentId || "") : "",
        studentName:workoutType === "student" ? (newWorkout.studentName || "") : "",
        studentEmail:workoutType === "student" ? (newWorkout.studentEmail || "") : "",
        sourceWorkoutId:workoutSourceId(newWorkout),
        isActive:true,
      };
      list = [...customWorkouts, savedWorkout];
    }
    try {
      await dataService.saveWorkout(savedWorkout);
    } catch(error) {
      console.error("Erro ao salvar treino:", error);
      notify(error?.message || "Não foi possível salvar o treino.", "error");
      return;
    }
    setCustomWorkouts(list);
    removeEditorDraft(globalThis.localStorage, currentDraftKey("workout-editor"));
    workoutEditorBaselineRef.current = blankWorkout;
    setNewWorkout(blankWorkout);
    setNewExercise(blankExercise);
    setShowWorkoutEditor(false);
    setWorkout(savedWorkout.id);
    if(appMode === "treinador"){
      notify(savedWorkout.type === "template" ? "Treino-base salvo." : savedWorkout.type === "student" ? "Treino enviado ao aluno." : "Treino pessoal salvo.");
      setScreen("criar");
    } else {
      setScreen("treino");
    }
    } catch(error){
      console.error("Erro ao salvar treino:", error);
      notify(error?.message || "Não foi possível salvar o treino.", "error");
    }
    });
  }

  function startEditWorkout(key){
    if(appMode !== "treinador") return;
    setSelectedWorkoutExerciseIndex(null);
    setEditingWorkoutExerciseIndex(null);
    setShowWorkoutLibrary(false);
    clearWorkoutExerciseFilters();
    if(baseWorkoutGroups[key]){
      const existing = editedBaseWorkouts[key] || {};
      const initial = {
        ...existing,
        name:allWorkoutLabels[key] || `Treino ${key}`,
        items:groupsToCustomItems(allWorkouts[key] || []),
        objective:existing.objective || "",
        frequency:existing.frequency || existing.weeklyFrequency || "",
        weeklyFrequency:existing.weeklyFrequency || existing.frequency || "",
        notes:existing.notes || existing.description || "",
        description:existing.description || existing.notes || "",
        editingId:null,
        editingKey:key,
        editingWorkoutKey:key,
        editingIndex:null
      };
      workoutEditorBaselineRef.current = initial;
      setNewWorkout(restoreControlledDraft("workout-editor", workoutDraftEntity(initial), initial));
      setNewExercise(blankExercise);
      setShowWorkoutEditor(true);
      setScreen("criar");
      return;
    }
    const idx = customWorkoutIndexForKey(key);
    const w = customWorkouts[idx];
    if(!w) return;
    const initial = {...w, name:w.name, items:(w.items || []).map(exerciseWithRepTargets), editingId:w.id || null, editingKey:null, editingWorkoutKey:key, editingIndex:idx};
    workoutEditorBaselineRef.current = initial;
    setNewWorkout(restoreControlledDraft("workout-editor", workoutDraftEntity(initial), initial));
    setNewExercise(blankExercise);
    setShowWorkoutEditor(true);
    setScreen("criar");
  }

  async function duplicateWorkout(key){
    if(appMode !== "treinador") return;
    if(!ensureMutationAllowed()) return;
    if(baseWorkoutGroups[key]){
      const label = `${allWorkoutLabels[key]} - cópia`;
      const items = groupsToCustomItems(allWorkouts[key] || []);
      const copiedWorkout = {id:makeId(), name:label, items, type:appMode === "treinador" ? "template" : "personal", ownerId:currentUserId, coachId:appMode === "treinador" ? currentUserId : "", coachName:appMode === "treinador" ? currentUserName : "", coachEmail:appMode === "treinador" ? currentUserEmail : ""};
      const list = [...customWorkouts, copiedWorkout];
      await dataService.saveWorkout(copiedWorkout);
      setCustomWorkouts(list);
      setWorkout(copiedWorkout.id);
      setScreen("criar");
      const initial = {name:label, items, editingId:copiedWorkout.id, editingKey:null, editingWorkoutKey:copiedWorkout.id, editingIndex:list.length-1};
      workoutEditorBaselineRef.current = initial;
      setNewWorkout(initial);
      setShowWorkoutEditor(true);
      return;
    }
    const idx = customWorkoutIndexForKey(key);
    const w = customWorkouts[idx];
    if(!w) return;
    const copiedWorkout = {
      ...w,
      id:makeId(),
      name:`${w.name} - cópia`,
      items:cloneWorkoutItemsForAssignment(w.items || []),
      sourceWorkoutId:workoutSourceId(w) || w.id,
      sourceTemplateId:workoutSourceId(w) || w.id
    };
    if(appMode === "treinador" && isTrainerWorkoutTemplate(w)){
      copiedWorkout.type = "template";
      copiedWorkout.ownerId = currentUserId;
      copiedWorkout.coachId = currentUserId;
      copiedWorkout.coachName = currentUserName;
      copiedWorkout.coachEmail = currentUserEmail;
      copiedWorkout.studentId = "";
      copiedWorkout.studentName = "";
      copiedWorkout.studentEmail = "";
    }
    const list = [...customWorkouts, copiedWorkout];
    await dataService.saveWorkout(copiedWorkout);
    setCustomWorkouts(list);
    setWorkout(copiedWorkout.id);
    setShowWorkoutEditor(false);
  }

  function startEditWorkoutExercise(key, index=null){
    if(appMode !== "treinador") return;
    startEditWorkout(key);
    requestAnimationFrame(()=>{
      const target = Number.isInteger(index) ? document.querySelectorAll(".editablePreview")[index] : null;
      target?.scrollIntoView?.({block:"center", behavior:"smooth"});
    });
  }

  async function updateWorkoutDetailItems(key, updater, successMessage){
    if(appMode !== "treinador") return;
    const workoutKey = String(key || "");
    const nextItemsFromGroups = baseWorkoutGroups[workoutKey]
      ? groupsToCustomItems(allWorkouts[workoutKey] || [])
      : null;
    const idx = customWorkoutIndexForKey(workoutKey);
    const currentWorkout = baseWorkoutGroups[workoutKey] ? null : customWorkouts[idx];
    const currentItems = baseWorkoutGroups[workoutKey] ? nextItemsFromGroups : (currentWorkout?.items || []);
    if(!currentItems) return;
    const nextItems = updater(currentItems.map(item => withWorkoutExerciseIdentity(exerciseWithRepTargets({...item})))).map(item=>withWorkoutExerciseIdentity(exerciseWithRepTargets(item)));

    if(currentWorkout && workoutHasHistory(currentWorkout) && workoutPrescriptionSignature(currentWorkout.items) !== workoutPrescriptionSignature(nextItems)){
      alert("Este treino já possui histórico. Para preservar os registros, duplique o treino ou crie uma nova versão antes de alterar exercícios, séries ou cargas.");
      return;
    }

    try{
      if(baseWorkoutGroups[workoutKey]){
        const previous = editedBaseWorkouts[workoutKey] || {};
        const next = {...editedBaseWorkouts, [workoutKey]:{
          ...previous,
          name:allWorkoutLabels[workoutKey] || `Treino ${workoutKey}`,
          items:nextItems
        }};
        await dataService.saveSettings({editedBaseWorkouts: next});
        setEditedBaseWorkouts(next);
      } else if(currentWorkout) {
        const savedWorkout = {...currentWorkout, items:nextItems};
        const list = customWorkouts.map((w,itemIdx)=>itemIdx === idx ? savedWorkout : w);
        await dataService.saveWorkout(savedWorkout);
        setCustomWorkouts(list);
      }
      notify(successMessage);
    } catch(error) {
      console.error("Erro ao atualizar exercícios do treino:", error);
      alert(error?.message || "Não foi possível atualizar os exercícios deste treino.");
    }
  }

  function duplicateWorkoutExercise(key, index){
    if(appMode !== "treinador") return;
    updateWorkoutDetailItems(key, items => {
      const original = items[index];
      if(!original) return items;
      const workoutExerciseId = makeId();
      const copy = {...original, id:workoutExerciseId, workoutExerciseId, name:`${original.name || "Exercício"} - cópia`};
      return [...items.slice(0,index + 1), copy, ...items.slice(index + 1)];
    }, "Exercício duplicado.");
  }

  function moveWorkoutExercise(key, index){
    if(appMode !== "treinador") return;
    updateWorkoutDetailItems(key, items => {
      if(items.length < 2) return items;
      const dir = index >= items.length - 1 ? -1 : 1;
      const next = [...items];
      const target = index + dir;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    }, "Exercício movido.");
  }

  function removeWorkoutExercise(key, index){
    if(appMode !== "treinador") return;
    if(!confirm("Excluir este exercício do treino?")) return;
    updateWorkoutDetailItems(key, items => items.filter((_,itemIdx)=>itemIdx !== index), "Exercício excluído.");
  }

  async function archiveWorkout(key){
    if(!ensureMutationAllowed()) return;
    if(appMode !== "treinador") return;
    if(baseWorkoutGroups[key]){
      const hidden = hiddenBaseWorkouts.includes(key) ? hiddenBaseWorkouts : [...hiddenBaseWorkouts, key];
      await dataService.saveSettings({hiddenBaseWorkouts: hidden});
      setHiddenBaseWorkouts(hidden);
    } else {
      const idx = customWorkoutIndexForKey(key);
      const target = customWorkouts[idx];
      if(!target) return;
      const archived = {...target, isActive:false};
      const list = customWorkouts.map((w, itemIdx) => itemIdx === idx ? archived : w);
      await dataService.saveWorkout(archived);
      setCustomWorkouts(list);
    }
    if(workout === key) setWorkout(Object.keys(workouts).filter(k=>k!==key)[0] || "");
  }

  async function reactivateWorkout(key){
    if(!ensureMutationAllowed()) return;
    if(appMode !== "treinador") return;
    if(baseWorkoutGroups[key]){
      const hidden = hiddenBaseWorkouts.filter(item => item !== key);
      await dataService.saveSettings({hiddenBaseWorkouts: hidden});
      setHiddenBaseWorkouts(hidden);
    } else {
      const idx = customWorkoutIndexForKey(key);
      const target = customWorkouts[idx];
      if(!target) return;
      const active = {...target, isActive:true};
      await dataService.saveWorkout(active);
      setCustomWorkouts(current => current.map((w, itemIdx) => itemIdx === idx ? active : w));
    }
    setWorkout(key);
  }

  async function archiveWorkoutByKey(key, options={}){
    if(!ensureMutationAllowed()) return;
    if(appMode !== "treinador") return;
    const workoutKey = String(key || "");
    if(!workoutKey) return;
    const isBaseWorkout = !!baseWorkoutGroups[workoutKey];
    const message = isBaseWorkout
      ? "Arquivar este treino da lista ativa? Treinos base podem ser reativados depois."
      : "Arquivar este treino? Histórico e exercícios serão preservados.";
    if(!confirm(message)) return;

    try{
      if(isBaseWorkout){
        const nextEdited = {...editedBaseWorkouts};
        delete nextEdited[workoutKey];
        const hidden = hiddenBaseWorkouts.includes(workoutKey) ? hiddenBaseWorkouts : [...hiddenBaseWorkouts, workoutKey];
        await dataService.saveSettings({editedBaseWorkouts: nextEdited, hiddenBaseWorkouts: hidden});
        setEditedBaseWorkouts(nextEdited);
        setHiddenBaseWorkouts(hidden);
        const nextWorkout = Object.keys(workouts).filter(k => k !== workoutKey)[0] || "A";
        setWorkout(nextWorkout);
      } else {
        const archivedIndex = customWorkoutIndexForKey(workoutKey);
        if(!Number.isFinite(archivedIndex) || archivedIndex < 0) return;
        const archivedWorkout = customWorkouts[archivedIndex];
        if(!archivedWorkout) return;
        const archived = {...archivedWorkout, isActive:false};
        const list = customWorkouts.map((w, idx) => idx === archivedIndex ? archived : w);
        await dataService.saveWorkout(archived);
        setCustomWorkouts(list);
        const nextWorkout = list.find(item=>item.id !== workoutKey && item?.isActive !== false && canShowWorkoutForMode(item))?.id || "";
        setWorkout(nextWorkout);
      }
      setNewWorkout(blankWorkout);
      setNewExercise(blankExercise);
      setShowWorkoutLibrary(false);
      if(options.closeEditor !== false) setShowWorkoutEditor(false);
      setScreen("criar");
      notify("Treino arquivado.");
    } catch(error){
      console.error("Erro ao arquivar treino:", error);
      alert("Não foi possível arquivar o treino. Tente novamente.");
    }
  }

  function workoutHasAssignedCopies(workoutItem){
    if(!workoutItem?.id) return false;
    return customWorkouts.some(item => workoutSourceId(item) === workoutItem.id);
  }

  async function deleteWorkoutSafely(key, options={}){
    if(!ensureMutationAllowed()) return;
    if(appMode !== "treinador") return;
    const workoutKey = String(key || "");
    const idx = customWorkoutIndexForKey(workoutKey);
    const target = customWorkouts[idx];
    if(!target?.id) return;
    return runPendingAction(`delete-workout:${target.id}`, async()=>{

    if(workoutHasHistory(target)) {
      if(confirm("Este treino já possui histórico e não pode ser excluído. Você pode arquivá-lo.")) {
        await archiveWorkout(workoutKey);
      }
      return;
    }

    if(workoutHasAssignedCopies(target)) {
      if(confirm("Este treino possui cópias atribuídas. Para preservar a origem das prescrições, arquive o treino em vez de excluir.")) {
        await archiveWorkout(workoutKey);
      }
      return;
    }

    if(!confirm(options.permanent ? "Excluir definitivamente este treino? Esta ação não poderá ser desfeita." : "Excluir este treino? Esta ação não poderá ser desfeita.")) return;

    try {
      await dataService.deleteWorkout(target.id);
      const list = customWorkouts.filter((_, itemIdx) => itemIdx !== idx);
      setCustomWorkouts(list);
      if(workout === workoutKey) {
        const nextWorkout = list.find(item=>item?.isActive !== false && canShowWorkoutForMode(item))?.id || "";
        setWorkout(nextWorkout);
      }
      setNewWorkout(blankWorkout);
      setNewExercise(blankExercise);
      setShowWorkoutLibrary(false);
      setShowWorkoutEditor(false);
      notify("Treino excluído.");
    } catch(error) {
      console.error("Erro ao excluir treino:", error);
      notify(error?.message || "Não foi possível excluir este treino. Se ele já tiver histórico, arquive para preservar os registros.", "error");
    }
    });
  }

  async function archiveEditingWorkout(){
    if(appMode !== "treinador") return;
    const editingIndex = Number.isInteger(newWorkout.editingIndex) ? newWorkout.editingIndex : null;
    const key = newWorkout.editingWorkoutKey || newWorkout.editingKey || (editingIndex !== null ? customWorkouts[editingIndex]?.id || "" : "");
    await archiveWorkoutByKey(key);
  }

  function clearNewWorkout(){
    if(!newWorkout.name && newWorkout.items.length === 0) return;
    if(!confirm("Limpar todo o treino em criação?")) return;
    setNewWorkout(blankWorkout);
    setNewExercise(blankExercise);
  }

  function cancelEditWorkout(){
    if(!bypassDirtyGuardRef.current && workoutEditorDirty) {
      requestProtectedAction(cancelEditWorkout);
      return;
    }
    const workoutKey = newWorkout.editingWorkoutKey || newWorkout.editingKey || "";
    suppressNextNavigationPush();
    setNavigationStack([]);
    setNewWorkout(blankWorkout);
    setNewExercise(blankExercise);
    setShowWorkoutLibrary(false);
    setEditingWorkoutExerciseIndex(null);
    setShowWorkoutEditor(false);
    if(workoutKey) setSelectedWorkoutDetailKey(workoutKey);
  }

  function closeWorkoutExerciseEditor(){
    suppressNextNavigationPush();
    popNavigationSnapshotIf(snapshot =>
      snapshot.showWorkoutEditor &&
      snapshot.editingWorkoutExerciseIndex === null
    );
    setEditingWorkoutExerciseIndex(null);
  }

  function cloudDataLooksEmpty(data){
    if(!data || typeof data !== "object") return true;
    return !(data.userLibrary || []).length
      && !(data.customWorkouts || []).length
      && !(data.sessions || []).length
      && !(data.workoutSessions || []).length
      && !(data.body || []).length;
  }

  function friendlyAuthError(err){
    const message = String(err?.message || "");
    const lower = message.toLowerCase();
    if(lower.includes("invalid") && lower.includes("email")) return "Email inválido. Confira o endereço informado.";
    if(lower.includes("password") && (lower.includes("short") || lower.includes("weak") || lower.includes("8"))) return "Senha fraca. Use pelo menos 8 caracteres.";
    if(lower.includes("already") || lower.includes("registered") || lower.includes("exists")) return "Este email já possui conta. Tente entrar.";
    if(lower.includes("invalid login") || lower.includes("invalid credentials")) return "Email ou senha incorretos.";
    if(lower.includes("email ainda não foi confirmado") || lower.includes("email not confirmed") || lower.includes("not confirmed")) return "Seu email ainda não foi confirmado. Verifique sua caixa de entrada ou desative a confirmação de email durante os testes.";
    if(lower.includes("confirm")) return "Confirme seu email antes de entrar.";
    if(lower.includes("expir") || lower.includes("invalid token") || lower.includes("recuperação não é mais válida")) return "Este link de recuperação é inválido, expirou ou já foi usado. Solicite um novo link.";
    return message || "Não foi possível concluir a operação de conta.";
  }

  function isValidEmail(email){
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
  }

  function changeAccountMode(mode){
    setAccountMode(mode);
    setPasswordResetMode(false);
    setPasswordResetSent(false);
    setAuthMessage("");
  }

  function clearAuthMessage(){
    if(passwordResetMode && authMessage === "Digite seu email para recuperar a senha.") return;
    if(authMessage) setAuthMessage("");
  }

  async function submitAccount(e){
    e.preventDefault();
    if(authBusy) return;
    const accountForm = e.currentTarget;
    const f = new FormData(accountForm);
    const email = String(f.get("email") || "").trim();
    if(passwordResetMode){
      await sendPasswordReset(email);
      return;
    }
    const password = String(f.get("password") || "");
    const name = String(f.get("name") || "").trim();
    setAuthBusy(true);
    setAuthMessage("");
    try{
      if(accountMode === "signUp"){
        if(!name){
          setAuthMessage("Informe seu nome.");
          return;
        }
        const selectedRole = signUpRole === "coach" ? "coach" : "athlete";
        const user = await authService.signUp({name, email, password, role:selectedRole});
        if(isSupabaseConfigured && !user){
          setCurrentUser(null);
          setAuthMessage("Conta criada. Verifique seu email antes de entrar.");
          notify("Conta criada. Verifique seu email.", "info");
          return;
        }
        accountForm?.reset?.();
        setCurrentUser(user);
        const nextMode = user?.role === "coach" ? "treinador" : "atleta";
        setAppMode(nextMode);
        setScreen(nextMode === "treinador" ? "dashboard" : "dashboard");
        const data = await refreshAppData();
        setAuthMessage(isSupabaseConfigured
          ? `${cloudDataLooksEmpty(data) ? "Sua conta ainda não possui dados salvos. " : ""}Conta criada e conectada.`
          : "Conta local criada. Dados preservados neste navegador.");
        notify("Conta criada.");
        return;
      }
      const user = await authService.signIn({email, password});
      accountForm?.reset?.();
      setCurrentUser(user);
      const nextMode = user?.role === "coach" ? "treinador" : "atleta";
      setAppMode(nextMode);
      setScreen(nextMode === "treinador" ? "dashboard" : "dashboard");
      const data = await refreshAppData();
      setAuthMessage(isSupabaseConfigured
        ? `${cloudDataLooksEmpty(data) ? "Sua conta ainda não possui dados salvos. " : ""}Login realizado com sucesso.`
        : "Usuário local atualizado.");
      notify("Login realizado.");
    } catch(err){
      console.error("Erro de autenticação:", err);
      setAuthMessage(friendlyAuthError(err));
    } finally {
      setAuthBusy(false);
    }
  }

  async function sendPasswordReset(email){
    if(authBusy) return;
    if(!email){
      setAuthMessage("Informe seu email para recuperar a senha.");
      return;
    }
    if(!isValidEmail(email)){
      setAuthMessage("Email inválido. Confira o endereço informado.");
      return;
    }
    setAuthBusy(true);
    setAuthMessage("");
    try{
      await authService.resetPassword(email, {redirectTo:buildPasswordRecoveryRedirect()});
      setPasswordResetSent(true);
      setAuthMessage("Se existir uma conta com este e-mail, enviaremos as instruções de recuperação.");
      notify("Instruções enviadas.", "info");
    } catch(err){
      console.error("Erro ao solicitar recuperação de senha:", err);
      setAuthMessage(friendlyAuthError(err));
    } finally {
      setAuthBusy(false);
    }
  }

  async function requestPasswordReset(){
    setPasswordResetMode(true);
    setPasswordResetSent(false);
    setAuthMessage("Digite seu email para recuperar a senha.");
  }

  function clearRecoveryLocation(){
    const cleanUrl = cleanPasswordRecoveryUrl();
    if(cleanUrl && globalThis.history?.replaceState) globalThis.history.replaceState({}, "", cleanUrl);
  }

  function requestNewRecoveryLink(){
    clearRecoveryLocation();
    setPasswordRecovery({phase:"idle", message:""});
    setCurrentUser(null);
    setAccountMode("signIn");
    setPasswordResetMode(true);
    setPasswordResetSent(false);
    setAuthMessage("Digite seu email para receber um novo link.");
  }

  function returnToLoginAfterRecovery(){
    clearRecoveryLocation();
    setPasswordRecovery({phase:"idle", message:""});
    setCurrentUser(null);
    setAccountMode("signIn");
    setPasswordResetMode(false);
    setPasswordResetSent(false);
    setAuthMessage("Senha atualizada. Entre com a nova senha.");
  }

  async function submitNewPassword(event){
    event.preventDefault();
    if(authBusy) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const password = String(fields.get("newPassword") || "");
    const confirmation = String(fields.get("confirmPassword") || "");
    const validationError = validateNewPassword(password, confirmation);
    if(validationError) {
      setPasswordRecovery(current=>({...current, phase:"ready", message:validationError}));
      return;
    }
    setAuthBusy(true);
    setPasswordRecovery({phase:"updating", message:""});
    try {
      await authService.updatePassword(password);
      await authService.signOut().catch(()=>{});
      form?.reset?.();
      setCurrentUser(null);
      clearRecoveryLocation();
      setPasswordRecovery({phase:"success", message:"Sua senha foi atualizada com segurança."});
      notify("Senha atualizada.");
    } catch(error) {
      const message = friendlyAuthError(error);
      const invalid = /link|expir|sessão de recuperação/i.test(message);
      setPasswordRecovery({phase:invalid ? "invalid" : "ready", message});
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOutAccount(){
    if(!bypassDirtyGuardRef.current && activeDirtyScope()) {
      requestProtectedAction(signOutAccount);
      return;
    }
    setAuthBusy(true);
    setAuthMessage("");
    try{
      localStorage.removeItem(activeSessionStorageKey(currentUserId));
      setActiveSession(null);
      setRestEndsAt(null);
      await authService.signOut();
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
      await refreshAppData();
      if(isSupabaseConfigured) setScreen("dashboard");
      setAuthMessage(isSupabaseConfigured ? "" : "Modo local mantido. Dados preservados.");
      notify("Sessão encerrada.", "info");
    } catch(err){
      setAuthMessage(err?.message || "Nao foi possivel sair.");
    } finally {
      setAuthBusy(false);
    }
  }

  function AccountAccess({entry=false}){
    const statusText = dataMode === "cloud" ? "Dados: nuvem" : "Dados: local";
    const authActionLabel = passwordResetMode
      ? (authBusy ? "Enviando..." : passwordResetSent ? "Reenviar instruções" : "Enviar instruções")
      : accountMode === "signUp"
        ? (authBusy ? "Criando conta..." : "Criar conta")
        : (authBusy ? "Entrando..." : "Entrar");
    if(!isSupabaseConfigured && !entry){
      return <section className="formCard accountCard settingsAccount">
        <h3>Conta</h3>
        <div className="recordLine"><b>Modo local</b><span className="statusBadge">{statusText}</span></div>
        <p className="muted">Seus dados estão salvos neste navegador.</p>
        <ProductFooter />
      </section>;
    }
    if(currentUser && !entry){
      return <section className="formCard accountCard settingsAccount">
        <h3>Conta</h3>
        <div className="recordLine"><b>Nome da conta</b><span>{currentUser.name || "Usuário"}</span></div>
        <div className="recordLine"><b>Email da conta</b><span>{currentUser.email || "email não informado"}</span></div>
        <div className="recordLine"><b>Tipo de conta</b><span>{currentUserRole === "coach" ? "Treinador e aluno" : "Aluno"}</span></div>
        <div className="recordLine"><b className="statusBadge">{statusText}</b><span>{dataMode === "cloud" ? "conta logada" : "neste navegador"}</span></div>
        <p className="muted">Ao sair, seus dados da nuvem não serão apagados.</p>
        <button type="button" className="danger" onClick={signOutAccount} disabled={authBusy}>Sair da conta</button>
        {authMessage && <p className="feedbackMessage">{authMessage}</p>}
        <ProductFooter />
      </section>;
    }
    return <section className={`formCard accountCard ${entry ? "authCard" : ""}`}>
      {entry && <>
        <img className="loginLogo" src={logoSrc} alt={APP_NAME} />
        <h2>{APP_NAME}</h2>
        <p className="muted">Acompanhe seus treinos, cargas e evolução.</p>
      </>}
      {!entry && <h3>Conta</h3>}
      {!entry && <div className="recordLine"><b className="statusBadge">{statusText}</b><span>{dataMode === "cloud" ? "conta conectada" : "neste navegador"}</span></div>}
      <div className={entry ? "authSegmentedControl" : "accountActions"}>
        <button type="button" className={accountMode === "signIn" ? "active" : "ghost"} onClick={()=>changeAccountMode("signIn")} disabled={authBusy}>Já tenho uma conta</button>
        <button type="button" className={accountMode === "signUp" ? "active" : "ghost"} onClick={()=>changeAccountMode("signUp")} disabled={authBusy}>Criar conta</button>
      </div>
      {entry && accountMode === "signUp" && !passwordResetMode && <div className="authRoleSegment" aria-label="Tipo de conta">
        <button type="button" className={signUpRole === "athlete" ? "active" : "ghost"} onClick={()=>{setSignUpRole("athlete"); clearAuthMessage();}} disabled={authBusy}>Aluno</button>
        <button type="button" className={signUpRole === "coach" ? "active" : "ghost"} onClick={()=>{setSignUpRole("coach"); clearAuthMessage();}} disabled={authBusy}>Treinador</button>
      </div>}
      <form className="accountForm" onSubmit={submitAccount} aria-busy={authBusy}>
        {accountMode === "signUp" && !entry && !passwordResetMode && <section className="accountTypeBox" aria-label="Tipo de conta">
          <b>Como você vai usar o Treino Tonon?</b>
          <div className="accountTypeActions">
            <button type="button" className={signUpRole === "athlete" ? "active" : "ghost"} onClick={()=>{setSignUpRole("athlete"); clearAuthMessage();}} disabled={authBusy}>Sou aluno</button>
            <button type="button" className={signUpRole === "coach" ? "active" : "ghost"} onClick={()=>{setSignUpRole("coach"); clearAuthMessage();}} disabled={authBusy}>Sou treinador</button>
          </div>
        </section>}
        {accountMode === "signUp" && !passwordResetMode && <input name="name" placeholder="Nome" required onChange={clearAuthMessage} />}
        <input name="email" type="email" placeholder="Email" defaultValue={currentUser?.email || ""} onChange={clearAuthMessage} required disabled={authBusy} />
        {!passwordResetMode && <div className="passwordField">
          <input name="password" type={showAuthPassword ? "text" : "password"} placeholder="Senha" autoComplete={accountMode === "signUp" ? "new-password" : "current-password"} onChange={clearAuthMessage} required disabled={authBusy} />
          <button type="button" className="ghost passwordToggle" onClick={()=>setShowAuthPassword(value=>!value)} aria-label={showAuthPassword ? "Ocultar senha" : "Mostrar senha"} disabled={authBusy}>
            {showAuthPassword ? <EyeOff size={17}/> : <Eye size={17}/>}
          </button>
        </div>}
        <div className="accountActions primaryAuthAction">
          <button disabled={authBusy} aria-busy={authBusy}>{authBusy && <LoaderCircle className="buttonSpinner" aria-hidden="true"/>}{authActionLabel}</button>
        </div>
        {accountMode === "signIn" && !passwordResetMode && <button className="passwordResetLink" type="button" onClick={requestPasswordReset} disabled={authBusy}>Esqueci minha senha</button>}
        {passwordResetMode && <button className="passwordResetLink" type="button" onClick={()=>changeAccountMode("signIn")} disabled={authBusy}>Voltar ao login</button>}
        {authMessage && <p className="feedbackMessage authMessage" role="status" aria-live="polite">{authMessage}</p>}
      </form>
    </section>;
  }

  function PasswordRecoveryAccess(){
    const phase = passwordRecovery.phase;
    if(phase === "checking") return <section className="formCard accountCard authCard recoveryCard" aria-busy="true">
      <img className="loginLogo" src={logoSrc} alt={APP_NAME} />
      <h2>Validando link</h2>
      <p className="muted"><LoaderCircle className="inlineSpinner" aria-hidden="true"/> Preparando a troca de senha...</p>
    </section>;
    if(phase === "invalid") return <section className="formCard accountCard authCard recoveryCard">
      <img className="loginLogo" src={logoSrc} alt={APP_NAME} />
      <h2>Link indisponível</h2>
      <p className="feedbackMessage error" role="alert">{passwordRecovery.message || "Este link é inválido, expirou ou já foi usado."}</p>
      <button type="button" onClick={requestNewRecoveryLink}>Solicitar novo link</button>
    </section>;
    if(phase === "success") return <section className="formCard accountCard authCard recoveryCard">
      <img className="loginLogo" src={logoSrc} alt={APP_NAME} />
      <h2>Senha atualizada</h2>
      <p className="feedbackMessage success" role="status">{passwordRecovery.message}</p>
      <button type="button" onClick={returnToLoginAfterRecovery}>Entrar com a nova senha</button>
    </section>;
    return <section className="formCard accountCard authCard recoveryCard">
      <img className="loginLogo" src={logoSrc} alt={APP_NAME} />
      <h2>Defina uma nova senha</h2>
      <p className="muted">Use pelo menos 8 caracteres e confirme a senha antes de salvar.</p>
      <form className="accountForm" onSubmit={submitNewPassword} aria-busy={authBusy || phase === "updating"}>
        <div className="passwordField">
          <input name="newPassword" type={showAuthPassword ? "text" : "password"} placeholder="Nova senha" autoComplete="new-password" required disabled={authBusy || phase === "updating"} />
          <button type="button" className="ghost passwordToggle" onClick={()=>setShowAuthPassword(value=>!value)} aria-label={showAuthPassword ? "Ocultar senha" : "Mostrar senha"} disabled={authBusy || phase === "updating"}>
            {showAuthPassword ? <EyeOff size={17}/> : <Eye size={17}/>}
          </button>
        </div>
        <input name="confirmPassword" type={showAuthPassword ? "text" : "password"} placeholder="Confirme a nova senha" autoComplete="new-password" required disabled={authBusy || phase === "updating"} />
        {passwordRecovery.message && <p className="feedbackMessage error" role="alert">{passwordRecovery.message}</p>}
        <button disabled={authBusy || phase === "updating"} aria-busy={authBusy || phase === "updating"}>
          {(authBusy || phase === "updating") && <LoaderCircle className="buttonSpinner" aria-hidden="true"/>}
          {authBusy || phase === "updating" ? "Atualizando..." : "Atualizar senha"}
        </button>
        <button className="passwordResetLink" type="button" onClick={requestNewRecoveryLink} disabled={authBusy || phase === "updating"}>Solicitar outro link</button>
      </form>
    </section>;
  }

  function currentTimerSeconds(){
    return activeSession && restExerciseIndex !== null ? exerciseRestSeconds(restExerciseIndex) : timerSetpoint;
  }

  function startTimer(){
    const seconds = currentTimerSeconds();
    setRestEndsAt(Date.now() + seconds * 1000);
    setTimer({seconds, running:true});
  }
  function toggleTimer(){
    if(!timer.running && timer.seconds <= 0){
      const index = restExerciseIndex ?? activeExerciseIndex;
      if(index !== null && index !== undefined) return startExerciseRest(index);
    }
    setTimer(t=>{
      const running = !t.running;
      setRestEndsAt(running ? Date.now() + t.seconds * 1000 : null);
      return {...t, running};
    });
  }
  function resetTimer(){ setRestEndsAt(null); setTimer({seconds:currentTimerSeconds(), running:false}); }
  const mmss = `${String(Math.floor(timer.seconds/60)).padStart(2,"0")}:${String(timer.seconds%60).padStart(2,"0")}`;
  const activeRestSeconds = activeSession && restExerciseIndex !== null ? timer.seconds : 0;
  const activeRestDisplay = formatDuration(activeRestSeconds);

  function buildPerformedSets(item, idx){
    const count = plannedSetCount(item.sets);
    const base = `${today()}-${workout}-${idx}`;
    const latest = latestExerciseExecution(item.name);
    const last = lastLoad(item.name);
    const suggestedLoad = draft[`${base}-load`] || item.load || latest?.sets?.[0]?.load || last?.load || "";
    const type = getExerciseType(item);
    const plan = buildRepPlan({type, reps:item.reps, targets:item.targetRepsBySet, setCount:count});
    const progressiveLoads = loadTargetFieldLabels(item);
    const dropMatrix = isDropSetType(type) ? dropTargetMatrix(item) : [];
    const fallback = plannedReps(item.reps);
    return Array.from({length:count},(_, setIdx)=>{
      const setPlan = plan[setIdx] || {};
      if(isSegmentedRepType(type) && setPlan.drops?.length){
        const configuredDrops = isDropSetType(type) ? (dropMatrix[setIdx] || []) : [];
        const drops = setPlan.drops.map((target, dropIdx)=>({
          dropIndex:dropIdx,
          load:"",
          reps:"",
          plannedLoad:String(configuredDrops[dropIdx]?.load ?? suggestedLoad),
          plannedRepTarget:configuredDrops[dropIdx]?.reps ? parseSingleRepTarget(configuredDrops[dropIdx].reps) : target,
          plannedReps:String(configuredDrops[dropIdx]?.reps || targetLabel(target) || fallback)
        }));
        return {
          load:"",
          reps:"",
          plannedLoad:drops[0]?.plannedLoad || suggestedLoad,
          plannedReps:drops.map(drop=>drop.plannedReps).filter(Boolean).join(" + "),
          drops,
          done:false
        };
      }
      const plannedRepTarget = setPlan.target;
      return {load:"", reps:"", plannedLoad:progressiveLoads[setIdx] || suggestedLoad, plannedRepTarget, plannedReps:targetLabel(plannedRepTarget) || fallback, done:false};
    });
  }

  function startActiveWorkout(workoutKey=workout, ignoreActiveSession=false){
    if(activeSession && !ignoreActiveSession){
      continueActiveWorkout();
      return false;
    }
    const resolvedWorkout = resolveWorkout(workoutKey);
    const {key:resolvedKey, groups:plannedGroups, items:plannedItems, metadata:workoutMeta, label:workoutLabel} = resolvedWorkout;
    let itemIndex = 0;
    const sessionBlocks = plannedGroups.map(group=>{
      const indexes = (group.items || []).map(()=>itemIndex++);
      return {type:group.type || "single", conjugateBlockId:group.conjugateBlockId || "", indexes};
    });
    if(plannedItems.length===0) {
      alert("Este treino não contém exercícios.");
      return false;
    }
    const startedAt = Date.now();
    const exercises = {};
    plannedItems.forEach((item, idx)=>{
      exercises[idx] = {sets:buildPerformedSets(item, idx), done:false, completedAt:null};
    });
    setWorkout(resolvedKey);
    setActiveSession({
      id:makeId(),
      userId:currentUserId,
      workout:resolvedKey,
      workoutKey:resolvedKey,
      workoutId:isUuid(workoutMeta.id) ? workoutMeta.id : resolvedKey,
      workoutLabel,
      workoutType:workoutMeta.type || "personal",
      coachId:workoutMeta.coachId || "",
      coachName:workoutMeta.coachName || "",
      coachEmail:workoutMeta.coachEmail || "",
      studentId:workoutMeta.studentId || currentUserId,
      studentName:workoutMeta.studentName || currentUserName,
      studentEmail:workoutMeta.studentEmail || currentUserEmail,
      startedAt,
      plannedItems:plannedItems.map(item=>({...item})),
      exerciseOrder:plannedItems.map((_, index)=>index),
      sessionBlocks,
      exercises
    });
    setSessionTick(startedAt);
    setTimer({seconds:0, running:false});
    setRestEndsAt(null);
    setActiveExerciseIndex(0);
    setSessionView("exercise");
    setRestExerciseIndex(null);
    setExerciseRestOverrides({});
    notify("Treino iniciado.", "info");
    return true;
  }

  function startWorkoutFromDetails(workoutKey){
    if(activeSession?.workout === workoutKey) return continueActiveWorkout();
    if(activeSession) return setPendingWorkoutStartKey(workoutKey);
    if(startActiveWorkout(workoutKey)) navigateScreen("treino");
  }

  async function finishAndStartPendingWorkout(){
    const workoutKey = pendingWorkoutStartKey;
    if(!workoutKey || !activeSession) return;
    const saved = await saveActiveSession(activeSession);
    if(!saved) return;
    setPendingWorkoutStartKey("");
    if(startActiveWorkout(workoutKey, true)) navigateScreen("treino");
  }

  function patchSessionExercise(idx, updater){
    setActiveSession(s=>{
      if(!s) return s;
      const current = s.exercises[idx] || {sets:[{load:"", reps:""}], done:false, completedAt:null};
      return {...s, exercises:{...s.exercises, [idx]:updater(current)}};
    });
  }

  function nextPendingExerciseIndex(currentIndex, session=activeSession, excludedIndex=null){
    if(!session) return null;
    const order = session.exerciseOrder || (session.plannedItems || []).map((_, index)=>index);
    const excluded = new Set(Array.isArray(excludedIndex) ? excludedIndex : [excludedIndex]);
    const pending = index => !excluded.has(index) && !session.exercises?.[index]?.done;
    const currentPosition = order.indexOf(currentIndex);
    const afterCurrent = order.slice(currentPosition + 1).find(pending);
    return afterCurrent ?? order.find(pending) ?? null;
  }

  function nextExerciseAfterCompletion(idx, conjugateBlock=null, session=activeSession){
    if(!session) return null;
    const pendingBlockExercise = conjugateBlock?.indexes?.find(index=>index !== idx && !session.exercises?.[index]?.done);
    if(pendingBlockExercise !== undefined) return pendingBlockExercise;
    return nextPendingExerciseIndex(idx, session, conjugateBlock?.indexes || idx);
  }

  function navigateAfterExerciseCompletion(nextIndex){
    if(nextIndex !== null && nextIndex !== undefined) {
      focusSessionExercise(nextIndex);
      return;
    }
    showSessionOverview();
    notify("Todos os exercícios foram concluídos. Revise e finalize o treino.", "info");
  }

  function scrollSessionToTop(){
    requestAnimationFrame(()=>globalThis.scrollTo?.({top:0, behavior:"smooth"}));
  }

  function focusSessionExercise(idx){
    if(idx === null || idx === undefined) return;
    setActiveExerciseIndex(idx);
    setSessionView("exercise");
    scrollSessionToTop();
  }

  function showSessionOverview(){
    setSessionView("list");
    scrollSessionToTop();
  }

  function deferSessionExercise(idx){
    const blockIndexes = activeSession?.sessionBlocks?.find(block=>block.indexes?.includes(idx))?.indexes || [idx];
    const nextIndex = nextPendingExerciseIndex(idx, activeSession, blockIndexes);
    setActiveSession(session=>{
      if(!session) return session;
      const order = session.exerciseOrder || (session.plannedItems || []).map((_, index)=>index);
      const deferred = order.filter(index=>blockIndexes.includes(index));
      return {...session, exerciseOrder:[...order.filter(index=>!blockIndexes.includes(index)), ...deferred]};
    });
    focusSessionExercise(nextIndex);
  }

  function requestDeferSessionExercise(idx){
    setPendingDeferredExercise(idx);
  }

  function updatePerformedSet(idx, setIdx, patch){
    patchSessionExercise(idx, ex => ({...ex, sets:ex.sets.map((set,i)=>i===setIdx ? {...set, ...patch} : set)}));
  }

  function updatePerformedDrop(idx, setIdx, dropIdx, patch){
    patchSessionExercise(idx, ex => ({
      ...ex,
      sets:ex.sets.map((set,i)=>i===setIdx ? {
        ...set,
        drops:(set.drops || []).map((drop,j)=>j===dropIdx ? {...drop, ...patch} : drop)
      } : set)
    }));
  }

  function togglePerformedDrop(idx, setIdx, dropIdx){
    const wasDone = !!activeSession?.exercises?.[idx]?.sets?.[setIdx]?.drops?.[dropIdx]?.done;
    const sets = activeSession?.exercises?.[idx]?.sets || [];
    const completesSet = !wasDone && (sets[setIdx]?.drops || []).every((drop, index)=>index === dropIdx || drop.done);
    const completesExercise = completesSet && sets.every((set, index)=>index === setIdx || set.done);
    const conjugateBlock = activeSession?.sessionBlocks?.find(block=>block.type === "conj" && block.indexes?.includes(idx));
    const conjugatePosition = conjugateBlock?.indexes?.indexOf(idx) ?? -1;
    const isLastInRound = !!conjugateBlock && conjugatePosition === conjugateBlock.indexes.length - 1;
    const shouldStartRest = conjugateBlock ? isLastInRound : shouldStartRestAfterExercise(idx);
    patchSessionExercise(idx, ex => ({
      ...ex,
      sets:ex.sets.map((set, index)=>{
        if(index !== setIdx) return set;
        const drops = (set.drops || []).map((drop, dropIndex)=>dropIndex === dropIdx ? {...drop, done:!wasDone} : drop);
        return {...set, drops, done:drops.length > 0 && drops.every(drop=>drop.done)};
      })
    }));
    if(!wasDone && completesSet && conjugateBlock){
      if(isLastInRound) {
        if(autoStartRestTimer) startExerciseRest(idx);
        const first = conjugateBlock.indexes[0];
        const hasNextRound = (activeSession?.exercises?.[first]?.sets || []).some((set,index)=>index > setIdx && !set.done);
        if(hasNextRound) focusSessionExercise(first);
      } else focusSessionExercise(conjugateBlock.indexes[conjugatePosition + 1]);
    }
    if(!wasDone && completesExercise){
      const nextIndex = nextExerciseAfterCompletion(idx, conjugateBlock);
      patchSessionExercise(idx, ex => ({...ex, done:true, completedAt:Date.now()}));
      if(autoStartRestTimer && shouldStartRest && !(conjugateBlock && completesSet)) startExerciseRest(idx);
      notify(autoStartRestTimer && shouldStartRest ? "Exercício concluído. Descanso iniciado." : "Exercício concluído.");
      navigateAfterExerciseCompletion(nextIndex);
    }
  }

  function addPerformedSet(idx){
    patchSessionExercise(idx, ex => {
      const previous = ex.sets[ex.sets.length-1] || {load:"", reps:""};
      const item = (activeSession?.plannedItems || currentItems)[idx] || {};
      const type = getExerciseType(item);
      if(isSegmentedRepType(type) && previous.drops?.length){
        return {...ex, sets:[...ex.sets, {...previous, reps:"", load:"", drops:previous.drops.map(drop=>({...drop, reps:"", load:""})), done:false}]};
      }
      const plan = buildRepPlan({type, reps:item.reps, targets:item.targetRepsBySet, setCount:ex.sets.length + 1});
      const plannedRepTarget = plan[ex.sets.length]?.target || plan[plan.length - 1]?.target || previous.plannedRepTarget || null;
      return {...ex, sets:[...ex.sets, {...previous, reps:"", done:false, plannedRepTarget, plannedReps:targetLabel(plannedRepTarget) || previous.plannedReps || plannedReps(item.reps)}]};
    });
  }

  function removePerformedSet(idx, setIdx){
    patchSessionExercise(idx, ex => ex.sets.length <= 1 ? ex : {...ex, sets:ex.sets.filter((_,i)=>i!==setIdx)});
  }

  function exerciseRestSeconds(idx){
    const override = exerciseRestOverrides[idx];
    if(override) return clampSeconds(override);
    return restToSeconds((activeSession?.plannedItems || currentItems)[idx]?.rest, timerSetpoint);
  }

  function startExerciseRest(idx){
    const seconds = exerciseRestSeconds(idx);
    setRestExerciseIndex(idx);
    setRestEndsAt(Date.now() + seconds * 1000);
    setTimer({seconds, running:true});
  }

  function shouldStartRestAfterExercise(idx, session=activeSession){
    const block = session?.sessionBlocks?.find(item=>item.indexes?.includes(idx));
    if(!block || block.type !== "conj") return true;
    return block.indexes.filter(index=>index !== idx).every(index=>session.exercises?.[index]?.done);
  }

  function togglePerformedSet(idx, setIdx){
    setActiveExerciseIndex(idx);
    const wasDone = !!activeSession?.exercises?.[idx]?.sets?.[setIdx]?.done;
    const finishesExercise = !wasDone && (activeSession?.exercises?.[idx]?.sets || []).every((set, index)=>index === setIdx || set.done);
    const conjugateBlock = activeSession?.sessionBlocks?.find(block=>block.type === "conj" && block.indexes?.includes(idx));
    const conjugatePosition = conjugateBlock?.indexes?.indexOf(idx) ?? -1;
    const isLastInRound = !!conjugateBlock && conjugatePosition === conjugateBlock.indexes.length - 1;
    const shouldStartRest = conjugateBlock ? isLastInRound : shouldStartRestAfterExercise(idx);
    patchSessionExercise(idx, ex => ({
      ...ex,
      sets:ex.sets.map((set,i)=>i===setIdx ? {...set, done:!wasDone, drops:(set.drops || []).map(drop=>({...drop, done:!wasDone}))} : set)
    }));
    if(!wasDone) {
      notify(autoStartRestTimer && shouldStartRest ? "Série concluída. Descanso iniciado." : "Série concluída.");
      if(autoStartRestTimer && shouldStartRest) startExerciseRest(idx);
      if(conjugateBlock && !isLastInRound) focusSessionExercise(conjugateBlock.indexes[conjugatePosition + 1]);
      if(conjugateBlock && isLastInRound) {
        const nextRoundExercise = conjugateBlock.indexes[0];
        const hasNextRound = (activeSession?.exercises?.[nextRoundExercise]?.sets || []).some((set, index)=>index > setIdx && !set.done);
        if(hasNextRound) focusSessionExercise(nextRoundExercise);
      }
      if(finishesExercise) {
        if(conjugateBlock) {
          const nextIndex = nextExerciseAfterCompletion(idx, conjugateBlock);
          patchSessionExercise(idx, ex=>({...ex, done:true, completedAt:Date.now()}));
          navigateAfterExerciseCompletion(nextIndex);
        } else completeSessionExercise(idx, false, false);
      }
    }
  }

  function completeSessionExercise(idx, markAll=false, startRest=true, allowPartial=false){
    if(activeSession?.exercises?.[idx]?.done) return;
    const conjugateBlock = activeSession?.sessionBlocks?.find(block=>block.type === "conj" && block.indexes?.includes(idx));
    const sets = activeSession?.exercises?.[idx]?.sets || [];
    const hasUnfilledSets = sets.some(set => !set.done && !(set.drops?.length
      ? set.drops.some(drop=>drop.load || drop.reps)
      : set.load || set.reps));
    if(hasUnfilledSets && !markAll && !allowPartial){
      setPendingExerciseCompletion(idx);
      return;
    }
    const nextIndex = nextExerciseAfterCompletion(idx, conjugateBlock);
    const shouldStartRest = shouldStartRestAfterExercise(idx);
    patchSessionExercise(idx, ex => ({
      ...ex,
      done:true,
      completedAt:Date.now(),
      sets:(ex.sets || []).map(set => {
        const hasData = set.drops?.length ? set.drops.some(drop=>drop.load || drop.reps) : set.load || set.reps;
        return markAll || hasData ? {...set, done:true, drops:(set.drops || []).map(drop=>({...drop, done:true}))} : set;
      })
    }));
    notify(autoStartRestTimer && startRest && shouldStartRest ? "Exercício concluído. Descanso iniciado." : "Exercício concluído.");
    if(autoStartRestTimer && startRest && shouldStartRest) startExerciseRest(idx);
    navigateAfterExerciseCompletion(nextIndex);
  }

  function reopenSessionExercise(idx){
    setActiveExerciseIndex(idx);
    patchSessionExercise(idx, ex => ({
      ...ex,
      done:false,
      completedAt:null,
      sets:(ex.sets || []).map(set => ({...set}))
    }));
  }

  function summarizeActiveSession(session, endedAt=Date.now()){
    const plannedItems = session.plannedItems || [];
    const rows = plannedItems.map((item, idx)=>{
      const state = session.exercises?.[idx] || {sets:[], done:false};
      const sets = state.sets || [];
      const reps = sets.reduce((sum,set)=>{
        if(set.drops?.length) return sum + set.drops.reduce((dropSum,drop)=>dropSum + Math.round(numericValue(drop.reps)),0);
        return sum + Math.round(numericValue(set.reps));
      },0);
      const volume = sets.reduce((sum,set)=>{
        if(set.drops?.length) return sum + set.drops.reduce((dropSum,drop)=>dropSum + numericValue(drop.load)*numericValue(drop.reps),0);
        return sum + numericValue(set.load)*numericValue(set.reps);
      },0);
      const type = getExerciseType(item);
      return {
        workoutExerciseId:item.id || "",
        exercise:item.name,
        done:!!state.done,
        completedAt:state.completedAt || null,
        planned:{sets:item.sets, reps:item.reps, targetRepsBySet:repTargetsForExercise(item), targetLoadsBySet:loadTargetFieldLabels(item), dropTargetsBySet:isDropSetType(type) ? dropTargetMatrix(item) : [], rest:item.rest, type, group:item.group || (item.tags || [])[0] || "Outro", objective:item.objective || ""},
        sets,
        load:sets[0]?.load || "",
        reps:String(reps || ""),
        rpe:state.rpe || "",
        note:item.notes || "",
        type,
        group:item.group || (item.tags || [])[0] || "Outro",
        objective:item.objective || "",
        volume
      };
    });
    const completed = rows.filter(r=>r.done);
    const totalSets = completed.reduce((sum,r)=>sum + r.sets.length,0);
    const totalReps = completed.reduce((sum,r)=>sum + numericValue(r.reps),0);
    const volume = completed.reduce((sum,r)=>sum + r.volume,0);
    const durationSeconds = Math.max(1, Math.round((endedAt - session.startedAt)/1000));
    const completionPct = plannedItems.length ? Math.round((completed.length/plannedItems.length)*100) : 0;
    const profileWeight = numericValue(profile.weight || profile.peso);
    const bodyWeight = body.length ? numericValue(body[0].peso) : 0;
    const weight = bodyWeight || profileWeight || 70;
    const met = completionPct >= 80 && totalSets >= 12 ? 6 : completionPct < 50 || totalSets < 6 ? 3.5 : 5;
    const calories = Math.round(met * weight * (durationSeconds/3600));
    return {
      id:session.id,
      date:new Date(session.startedAt).toLocaleString("pt-BR"),
      startedAt:session.startedAt,
      endedAt,
      workout:session.workout,
      workoutKey:session.workoutKey || session.workout,
      workoutId:session.workoutId || session.workout,
      workoutLabel:session.workoutLabel,
      workoutName:session.workoutLabel,
      workoutType:session.workoutType || "personal",
      coachId:session.coachId || "",
      coachName:session.coachName || "",
      coachEmail:session.coachEmail || "",
      studentId:session.studentId || currentUserId,
      studentName:session.studentName || currentUserName,
      studentEmail:session.studentEmail || currentUserEmail,
      durationSeconds,
      duration:formatDuration(durationSeconds),
      items:rows,
      completedExercises:completed.length,
      totalExercises:plannedItems.length,
      completionPct,
      totalSets,
      totalReps,
      volume,
      calories,
      weightUsed:weight,
      usedWeightFallback:!bodyWeight && !profileWeight,
      caloriesFallback:!bodyWeight && !profileWeight,
      intensity:met === 6 ? "intenso" : met === 3.5 ? "leve" : "moderado"
    };
  }

  async function saveActiveSession(session){
    if(!ensureMutationAllowed()) return;
    return runPendingAction(`save-session:${session?.id || "active"}`, async()=>{
    const summary = summarizeActiveSession(session);
    try {
      await dataService.saveWorkoutSession(summary);
      const stored = [summary, ...workoutSessions.filter(item => item.id !== summary.id)];
      setWorkoutSessions(stored);
      const legacy = [{
        id:summary.id,
        date:summary.date,
        workout:summary.workout,
        workoutKey:summary.workoutKey,
        workoutId:summary.workoutId,
        workoutLabel:summary.workoutLabel,
        workoutName:summary.workoutName,
        studentId:summary.studentId,
        studentName:summary.studentName,
        studentEmail:summary.studentEmail,
        coachId:summary.coachId,
        coachName:summary.coachName,
        coachEmail:summary.coachEmail,
        items:summary.items
      }, ...sessions.filter(item => item.id !== summary.id)];
      setSessions(legacy);
      const nextDraft = {...draft};
      summary.items.forEach((item, idx) => {
        const base = `${today()}-${summary.workout}-${idx}`;
        nextDraft[`${base}-done`] = !!item.done;
        nextDraft[`${base}-load`] = item.load || item.sets?.[0]?.load || "";
        nextDraft[`${base}-rpe`] = item.rpe || "";
        nextDraft[`${base}-note`] = item.note || "";
      });
      setDraft(nextDraft);
      save("draft", nextDraft);
      setSessionSummary(summary);
      setActiveSession(null);
      setTimer({seconds:timerSetpoint, running:false});
      setActiveExerciseIndex(null);
      setRestExerciseIndex(null);
      setExerciseRestOverrides({});
      setFinishConfirm(false);
      notify("Treino finalizado.");
      return true;
    } catch(error) {
      console.error("Erro ao salvar sessão de treino:", error);
      notify("Não foi possível salvar esta sessão. O treino continua aberto para você tentar novamente.", "error", {
        duration:0,
        onRetry:()=>saveActiveSession(session),
      });
      return false;
    }
    });
  }

  function finishActiveSession(){
    if(!activeSession) return;
    setFinishConfirm(true);
  }

  function discardActiveSession(){
    setActiveSession(null);
    setTimer({seconds:timerSetpoint, running:false});
    setActiveExerciseIndex(null);
    setRestExerciseIndex(null);
    setExerciseRestOverrides({});
    setFinishConfirm(false);
  }

  const personalBody = useMemo(()=>body.filter(record => {
    if(record.studentId) return record.studentId === currentUserId;
    if(record.userId) return record.userId === currentUserId;
    if(record.studentEmail || record.userEmail) return normalizeEmail(record.studentEmail || record.userEmail) === currentUserEmail;
    return true;
  }),[body, currentUserId, currentUserEmail]);

  const chartData = [...personalBody].reverse().map(x=>({
    date:x.date,
    peso:Number(String(x.peso).replace(",",".")),
    bf:Number(String(bodyFatValue(x)).replace(",","."))
  })).filter(x=>x.peso||x.bf);

  function numericLoad(v){
    const m = String(v || "").replace(",", ".").match(/\d+(\.\d+)?/);
    return m ? Number(m[0]) : 0;
  }

  function parseSessionDate(value){
    const m = String(value || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if(m) return new Date(Number(m[3]), Number(m[2])-1, Number(m[1]));
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? new Date(0) : d;
  }

  const personalSessions = useMemo(()=>sessions.filter(session => {
    if(session.studentId) return session.studentId === currentUserId;
    if(session.userId) return session.userId === currentUserId;
    if(session.studentEmail) return normalizeEmail(session.studentEmail) === currentUserEmail;
    return appMode !== "treinador";
  }),[sessions, currentUserId, currentUserEmail, appMode]);

  const dashboardSessions = useMemo(()=>dashboardFilter === "todos" ? personalSessions : personalSessions.filter(s => s.workout === dashboardFilter || s.workoutId === dashboardFilter), [personalSessions, dashboardFilter]);
  const trainedToday = personalSessions.some(session => sameCalendarDay(parseSessionDate(session.date), new Date()));
  const athleteCalendarDays = useMemo(()=>{
    const firstDay = new Date(athleteCalendarCursor.year, athleteCalendarCursor.month, 1);
    const daysInMonth = new Date(athleteCalendarCursor.year, athleteCalendarCursor.month + 1, 0).getDate();
    const startWeekday = firstDay.getDay();
    const sessionsByDay = new Map();
    dashboardSessions.forEach(session => {
      const date = parseSessionDate(session.date);
      if(date.getMonth() !== athleteCalendarCursor.month || date.getFullYear() !== athleteCalendarCursor.year) return;
      const day = date.getDate();
      const current = sessionsByDay.get(day);
      if(!current || parseSessionDate(current.date).getTime() < date.getTime()) sessionsByDay.set(day, session);
    });
    const days = [];
    for(let index = 0; index < startWeekday; index += 1) days.push({id:`blank-${index}`, empty:true});
    for(let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(athleteCalendarCursor.year, athleteCalendarCursor.month, day);
      days.push({
        id:`day-${day}`,
        day,
        date,
        isToday:sameCalendarDay(date, new Date()),
        trained:sessionsByDay.has(day),
        session:sessionsByDay.get(day) || null
      });
    }
    return days;
  },[dashboardSessions, athleteCalendarCursor]);

  const exerciseRecords = useMemo(()=>{
    const map = {};
    dashboardSessions.forEach(s => (s.items || []).forEach(i => {
      const load = numericLoad(i.load);
      if(load && (!map[i.exercise] || load > map[i.exercise].load)){
        map[i.exercise] = {exercise:i.exercise, load, rpe:i.rpe || "", date:s.date};
      }
    }));
    return Object.values(map).sort((a,b)=>b.load-a.load).slice(0,8);
  },[dashboardSessions]);

  const selectedHistory = useMemo(()=>{
    if(!selectedExercise) return [];
    const rows = [];
    dashboardSessions.forEach(s => (s.items || []).forEach(i => {
      if(i.exercise === selectedExercise && i.load) rows.push({date:s.date, load:numericLoad(i.load), raw:i.load, rpe:i.rpe || ""});
    }));
    return rows.reverse();
  },[dashboardSessions, selectedExercise]);

  const weeklyStats = useMemo(()=>{
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0,0,0,0);
    let count = 0, total = 0;
    dashboardSessions.forEach(s=>{
      const d = parseSessionDate(s.date);
      if(d >= start){
        count += 1;
        (s.items || []).forEach(i => { if(i.done) total += numericLoad(i.load); });
      }
    });
    return {count, total};
  },[dashboardSessions]);

  function applyLibraryExercise(ex){
    const normalized = exerciseCatalogToWorkoutItem(ex);
    setNewWorkout(w=>({...w, items:[...w.items, normalized]}));
    setShowWorkoutLibrary(false);
    setWorkoutLibraryFiltersOpen(false);
    clearWorkoutExerciseFilters();
    notify("Exercício adicionado.", "info");
  }

  const exerciseChipTags = exercise => [
    ...(normalizeList(exercise.tags).slice(0, 3)),
    ...(normalizeList(exercise.secondaryGroups).slice(0, 1))
  ].filter(Boolean).slice(0, 4);
  const libraryGroups = useMemo(()=>["Todos", ...Array.from(new Set(fullLibrary.map(e=>e.category || e.group || "Outro"))).sort()], [fullLibrary]);
  const libraryPrimaryGroups = useMemo(()=>["Todos", ...Array.from(new Set(fullLibrary.map(e=>e.primaryGroup || e.group || "Outro"))).sort()], [fullLibrary]);
  const libraryEquipments = useMemo(()=>["Todos", ...Array.from(new Set(fullLibrary.flatMap(e=>normalizeList(e.equipmentList || e.equipment)).filter(Boolean))).sort()], [fullLibrary]);
  const libraryTags = useMemo(()=>["Todos", ...Array.from(new Set(fullLibrary.flatMap(e=>normalizeList(e.tags)).filter(Boolean))).sort()], [fullLibrary]);
  const trainerFilteredLibrary = useMemo(()=>applyExerciseFilters(fullLibrary, {
    search:librarySearch,
    category:libraryGroup,
    primaryGroup:libraryPrimaryGroup,
    equipment:libraryEquipment,
    tag:libraryTag
  }),[fullLibrary, librarySearch, libraryGroup, libraryPrimaryGroup, libraryEquipment, libraryTag]);
  const filteredLibrary = useMemo(()=>applyExerciseFilters(fullLibrary, {
    search:workoutLibrarySearch,
    category:workoutLibraryCategory,
    primaryGroup:workoutLibraryPrimaryGroup,
    equipment:workoutLibraryEquipment,
    tag:workoutLibraryTag
  }),[fullLibrary, workoutLibrarySearch, workoutLibraryCategory, workoutLibraryPrimaryGroup, workoutLibraryEquipment, workoutLibraryTag]);
  const workoutLibraryActiveFilterCount = [workoutLibraryCategory, workoutLibraryPrimaryGroup, workoutLibraryEquipment, workoutLibraryTag].filter(value=>value !== "Todos").length;

  function clearExerciseFilters(){
    setLibrarySearch("");
    setLibraryGroup("Todos");
    setLibraryPrimaryGroup("Todos");
    setLibraryEquipment("Todos");
    setLibraryTag("Todos");
  }

  function clearWorkoutExerciseFilters(){
    setWorkoutLibrarySearch("");
    setWorkoutLibraryCategory("Todos");
    setWorkoutLibraryPrimaryGroup("Todos");
    setWorkoutLibraryEquipment("Todos");
    setWorkoutLibraryTag("Todos");
  }

  function normalizeHistorySession(s){
    const items = (s.items || []).map(item=>{
      const rawSets = Array.isArray(item.sets) && item.sets.length ? item.sets : (item.load || item.reps ? [{load:item.load || "", reps:item.reps || ""}] : []);
      const plannedTargets = expandRepTargetsForSets(item.planned?.targetRepsBySet, rawSets.length || plannedSetCount(item.planned?.sets), item.planned?.reps || item.reps);
      const sets = rawSets.map((set, setIdx) => {
        const plannedRepTarget = set.plannedRepTarget || plannedTargets[setIdx] || null;
        const drops = Array.isArray(set.drops) ? set.drops.map(drop => ({
          ...drop,
          plannedReps:drop.plannedReps || targetLabel(drop.plannedRepTarget) || ""
        })) : undefined;
        return {...set, plannedRepTarget, plannedReps:set.plannedReps || targetLabel(plannedRepTarget) || "", ...(drops ? {drops} : {})};
      });
      const reps = sets.reduce((sum,set)=>sum + (set.drops?.length ? set.drops.reduce((dropSum,drop)=>dropSum + numericValue(drop.reps),0) : numericValue(set.reps)),0);
      const volume = item.volume ?? sets.reduce((sum,set)=>sum + (set.drops?.length ? set.drops.reduce((dropSum,drop)=>dropSum + numericValue(drop.load)*numericValue(drop.reps),0) : numericValue(set.load)*numericValue(set.reps)),0);
      return {...item, sets, reps:String(reps || item.reps || ""), volume};
    });
    const completed = items.filter(i=>i.done);
    const totalSets = s.totalSets ?? completed.reduce((sum,i)=>sum + (i.sets?.length || 0),0);
    const totalReps = s.totalReps ?? completed.reduce((sum,i)=>sum + numericValue(i.reps),0);
    const volume = s.volume ?? completed.reduce((sum,i)=>sum + numericValue(i.volume),0);
    const totalExercises = s.totalExercises ?? items.length;
    const completedExercises = s.completedExercises ?? completed.length;
    const completionPct = s.completionPct ?? (totalExercises ? Math.round(completedExercises/totalExercises*100) : 0);
    return {...s, workoutId:s.workoutId || s.workout, workoutName:s.workoutName || s.workoutLabel || s.workout || "Treino", items, totalSets, totalReps, volume, totalExercises, completedExercises, completionPct, duration:s.duration || formatDuration(s.durationSeconds || 0)};
  }

  const allHistorySessions = useMemo(()=>{
    const modern = workoutSessions.map(normalizeHistorySession);
    const modernIds = new Set(modern.map(s=>s.id));
    const legacy = sessions.filter(s=>!modernIds.has(s.id)).map(normalizeHistorySession);
    return [...modern, ...legacy].sort((a,b)=>(b.startedAt || parseSessionDate(b.date).getTime()) - (a.startedAt || parseSessionDate(a.date).getTime()));
  },[workoutSessions, sessions]);

  function workoutPrescriptionSignature(items=[]){
    return JSON.stringify((items || []).map(item => ({
      name:String(item.name || "").trim().toLowerCase(),
      group:String(item.group || "").trim().toLowerCase(),
      type:getExerciseType(item),
      sets:String(item.sets || ""),
      reps:String(item.reps || ""),
      load:String(item.load || ""),
      rest:String(item.rest || ""),
      restAfterExercise:String(item.restAfterExercise || item.rest_after_exercise || ""),
      notes:String(item.notes || ""),
      generalNotes:String(item.generalNotes || item.general_notes || ""),
      conjugateBlockId:String(item.conjugateBlockId || item.conjugate_block_id || ""),
      conjugatePosition:Number(item.conjugatePosition || item.conjugate_position || 0) || null,
      conjugateKind:String(item.conjugateKind || item.conjugate_kind || ""),
      targets:repTargetsForExercise(item).map(targetLabel),
      targetLoads:loadTargetFieldLabels(item),
      dropTargets:isDropSetType(getExerciseType(item)) ? dropTargetMatrix(item) : [],
    })));
  }

  function workoutHasHistory(workoutItem){
    if(!workoutItem) return false;
    const ids = new Set([workoutItem.id, workoutSourceId(workoutItem)].filter(Boolean).map(String));
    const names = new Set([workoutItem.name].filter(Boolean).map(String));
    return allHistorySessions.some(session => {
      const sessionIds = [session.workoutId, session.workout].filter(Boolean).map(String);
      if(sessionIds.some(id => ids.has(id))) return true;
      // Nome é apenas compatibilidade para históricos realmente legados, sem
      // UUID. Dois treinos atuais com o mesmo nome não devem se bloquear.
      if(sessionIds.some(isUuid)) return false;
      return names.has(String(session.workoutName || session.workoutLabel || ""));
    });
  }

  const historySessions = useMemo(()=>{
    if(appMode === "treinador") return allHistorySessions;
    return allHistorySessions.filter(session => {
      if(session.studentId) return session.studentId === currentUserId;
      if(session.userId) return session.userId === currentUserId;
      if(session.studentEmail) return normalizeEmail(session.studentEmail) === currentUserEmail;
      return true;
    });
  },[allHistorySessions, appMode, currentUserId, currentUserEmail]);

  const evolutionStart = useMemo(()=>{
    if(evolutionPeriod === "all") return null;
    const date = new Date();
    date.setDate(date.getDate() - Number(evolutionPeriod));
    return date;
  },[evolutionPeriod]);
  const evolutionSessions = useMemo(()=>historySessions.filter(session=>!evolutionStart || parseSessionDate(session.date) >= evolutionStart),[historySessions, evolutionStart]);
  const evolutionBody = useMemo(()=>personalBody.filter(record=>!evolutionStart || parseSessionDate(record.date) >= evolutionStart),[personalBody, evolutionStart]);
  const evolutionBodyData = useMemo(()=>evolutionBody.slice().reverse().map(record=>({
    date:record.date,
    peso:numericValue(record.peso),
    bf:numericValue(bodyFatValue(record)),
    cintura:numericValue(record.cintura)
  })).filter(row=>row[evolutionMetric]),[evolutionBody, evolutionMetric]);
  const evolutionBodySummary = useMemo(()=>{
    const values = evolutionBodyData.map(row=>row[evolutionMetric]).filter(Boolean);
    if(!values.length) return null;
    const current = values[values.length - 1];
    const change = values.length > 1 ? current - values[0] : null;
    const unit = evolutionMetric === "peso" ? "kg" : evolutionMetric === "bf" ? "%" : "cm";
    return {current, change, unit};
  },[evolutionBodyData, evolutionMetric]);
  const evolutionVolumeTrend = useMemo(()=>{
    const map = new Map();
    evolutionSessions.forEach(session=>{
      const date = parseSessionDate(session.date);
      const key = `${date.getFullYear()}-${date.getMonth()}-${Math.floor(date.getDate()/7)}`;
      const current = map.get(key) || {semana:`${String(date.getDate()).padStart(2,"0")}/${String(date.getMonth()+1).padStart(2,"0")}`, volume:0};
      current.volume += numericValue(session.volume);
      map.set(key,current);
    });
    return Array.from(map.values());
  },[evolutionSessions]);
  const evolutionVolume = useMemo(()=>evolutionSessions.reduce((sum,session)=>sum + numericValue(session.volume),0),[evolutionSessions]);

  const filteredHistorySessions = useMemo(()=>evolutionSessions.filter(s=>historyFilter==="todos" || s.workout===historyFilter || s.workoutId===historyFilter || s.workoutName===workoutLabels[historyFilter]), [evolutionSessions, historyFilter, workoutLabels]);

  const trainerStudentRows = useMemo(()=>{
    return trainerLinks.map(link => {
      const studentEmail = normalizeEmail(link.studentEmail);
      const studentSessions = sessionsForSubject(allHistorySessions, link);
      const studentBody = body.filter(record =>
        record.studentId === link.studentId || record.userId === link.studentId || normalizeEmail(record.studentEmail || record.userEmail) === studentEmail
      );
      const studentWorkouts = customWorkouts.filter(w =>
        w.type === "student" && (w.studentId === link.studentId || normalizeEmail(w.studentEmail) === studentEmail)
      );
      return {
        ...link,
        sessions:studentSessions,
        body:studentBody,
        workouts:studentWorkouts,
        lastSession:studentSessions[0],
        lastBody:studentBody[0]
      };
    });
  },[trainerLinks, allHistorySessions, body, customWorkouts]);

  const trainerSelfRow = useMemo(()=>{
    const selfBody = body.filter(record => {
      if(record.studentId) return record.studentId === currentUserId;
      if(record.studentEmail) return normalizeEmail(record.studentEmail) === currentUserEmail;
      if(record.userId) return record.userId === currentUserId;
      if(record.recordedBy) return record.recordedBy === currentUserId;
      return normalizeEmail(record.userEmail) === currentUserEmail || !record.coachId;
    });
    const selfSessions = sessionsForSubject(allHistorySessions, {studentId:currentUserId, studentEmail:currentUserEmail, isSelf:true});
    const selfWorkouts = customWorkouts.filter(w => (w.type || "personal") === "personal" && isCurrentUserWorkoutOwner(w));
    return {
      id:"__self__",
      isSelf:true,
      status:"active",
      studentId:currentUserId,
      studentName:currentUserSelfLabel,
      studentEmail:currentUserEmail,
      coachId:currentUserId,
      coachName:currentUserName,
      coachEmail:currentUserEmail,
      body:selfBody,
      sessions:selfSessions,
      workouts:selfWorkouts,
      lastSession:selfSessions[0],
      lastBody:selfBody[0]
    };
  },[body, allHistorySessions, customWorkouts, currentUserId, currentUserEmail, currentUserName, currentUserSelfLabel]);

  const displayedTrainerStudentRows = useMemo(()=>{
    const search = studentSearch.trim().toLowerCase();
    const rows = trainerStudentRows.filter(row => {
      const haystack = `${row.studentName || ""} ${row.studentEmail || ""}`.toLowerCase();
      return !search || haystack.includes(search);
    }).sort((a,b)=>{
      if(studentSort === "last"){
        return parseSessionDate(b.lastSession?.date).getTime() - parseSessionDate(a.lastSession?.date).getTime();
      }
      if(studentSort === "recent"){
        return parseSessionDate(b.createdAt || b.updatedAt || b.date).getTime() - parseSessionDate(a.createdAt || a.updatedAt || a.date).getTime();
      }
      if(studentSort === "oldest"){
        return parseSessionDate(a.createdAt || a.updatedAt || a.date).getTime() - parseSessionDate(b.createdAt || b.updatedAt || b.date).getTime();
      }
      return String(a.studentName || a.studentEmail || "").localeCompare(String(b.studentName || b.studentEmail || ""), "pt-BR");
    });
    return [trainerSelfRow, ...rows];
  },[trainerStudentRows, trainerSelfRow, studentSearch, studentSort]);

  const selectedStudentProfile = useMemo(()=>{
    if(!selectedStudent) return null;
    if(selectedStudent.isSelf) return trainerSelfRow;
    return trainerStudentRows.find(row=>row.id === selectedStudent.id) || selectedStudent;
  },[trainerStudentRows, selectedStudent, trainerSelfRow]);

  const trainerInsightAllowed = !!selectedStudentProfile && (selectedStudentProfile.isSelf || (selectedStudentProfile.status === "active" && !!selectedStudentProfile.studentId));
  const trainerInsightSessions = useMemo(()=>trainerInsightAllowed
    ? sessionsForSubject(allHistorySessions, selectedStudentProfile)
    : [],[trainerInsightAllowed, allHistorySessions, selectedStudentProfile]);
  const trainerGroupLookup = useMemo(()=>Object.fromEntries(fullLibrary.map(exercise=>[
    String(exercise.name || "").toLowerCase(),
    exercise.group || exercise.primaryGroup || "Outro"
  ])),[fullLibrary]);
  const trainerInsightAnalytics = useMemo(()=>buildTrainerAnalytics(trainerInsightSessions, {groupLookup:trainerGroupLookup}),[trainerInsightSessions, trainerGroupLookup]);
  const allExerciseNames = useMemo(()=>[...new Set(trainerInsightSessions.flatMap(session=>(session.items || []).map(item=>item.exercise || item.name).filter(Boolean)))].sort(),[trainerInsightSessions]);
  const trainerSelectedHistory = useMemo(()=>buildExerciseEvolution(trainerInsightSessions, selectedExercise),[trainerInsightSessions, selectedExercise]);
  const selectedExerciseSummary = useMemo(()=>buildExerciseSummary(trainerSelectedHistory),[trainerSelectedHistory]);
  const weeklyVolumeTrend = trainerInsightAnalytics.weeklyVolumeTrend;
  const groupVolumeStats = trainerInsightAnalytics.groupVolumeStats;
  const workoutFrequencyStats = trainerInsightAnalytics.workoutFrequencyStats;
  const adherenceStats = {
    done:trainerInsightAnalytics.completion.done,
    total:trainerInsightAnalytics.completion.total,
    adherence:trainerInsightAnalytics.completion.percent,
    volume:trainerInsightAnalytics.completion.volume,
  };
  const trainerExerciseRecords = trainerInsightAnalytics.exerciseRecords;

  useEffect(()=>{
    if(selectedExercise && !allExerciseNames.includes(selectedExercise)) setSelectedExercise("");
  },[allExerciseNames, selectedExercise]);

  function navigateStudentInsight(nextScreen){
    if(!trainerInsightAllowed) {
      notify("Selecione um aluno ativo para abrir os insights.", "warning");
      return;
    }
    setStudentDetailView("");
    setSelectedBodyRecord(null);
    setOpenSession(null);
    setScreen(nextScreen === "analises" ? "analises" : "evolucao");
  }

  function returnToStudentAction(view){
    setScreen("alunos");
    setStudentDetailView(view || "");
  }

  const trainerDashboardStats = useMemo(()=>{
    const recentLimit = Date.now() - 7*24*60*60*1000;
    const activeRows = trainerStudentRows.filter(row=>row.status === "active");
    const recentlyTrained = activeRows.filter(row => {
      const date = row.lastSession ? parseSessionDate(row.lastSession.date).getTime() : 0;
      return date >= recentLimit;
    });
    const latestBody = body
      .filter(record => trainerLinks.some(link =>
        record.studentId === link.studentId || record.userId === link.studentId || normalizeEmail(record.studentEmail || record.userEmail) === normalizeEmail(link.studentEmail)
      ))
      .sort((a,b)=>parseSessionDate(b.date).getTime() - parseSessionDate(a.date).getTime())
      .slice(0,4);
    return {
      activeStudents:activeRows.length,
      pendingInvites:trainerLinks.filter(row=>row.status === "pending").length,
      totalWorkouts:customWorkouts.filter(isTrainerWorkoutTemplate).length,
      assignedWorkouts:customWorkouts.filter(w=>w.type === "student").length,
      studentsWithoutWorkout:activeRows.filter(row=>(row.workouts || []).length === 0).length,
      recentlyTrained:recentlyTrained.length,
      withoutRecentTraining:activeRows.length - recentlyTrained.length,
      latestExecutions:allHistorySessions
        .filter(session => trainerLinks.some(link =>
          session.studentId === link.studentId || normalizeEmail(session.studentEmail) === normalizeEmail(link.studentEmail)
        ))
        .slice(0,4),
      latestBody
    };
  },[trainerStudentRows, trainerLinks, customWorkouts, allHistorySessions, body, currentUserId, currentUserEmail]);

  const trainerDashboard = useMemo(()=>{
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0,0,0,0);
    const dayRows = Array.from({length:7},(_,idx)=>{
      const date = new Date(startOfToday);
      date.setDate(startOfToday.getDate() - (6 - idx));
      return {
        key:today(date),
        label:date.toLocaleDateString("pt-BR", {weekday:"short"}).replace(".",""),
        count:0
      };
    });
    const dayMap = new Map(dayRows.map(row=>[row.key,row]));
    const recentLimit = Date.now() - 7*24*60*60*1000;
    const trainerSessions = allHistorySessions.filter(session => trainerLinks.some(link =>
      session.studentId === link.studentId || normalizeEmail(session.studentEmail) === normalizeEmail(link.studentEmail)
    ));
    const recentSessions = trainerSessions.filter(session => parseSessionDate(session.date).getTime() >= recentLimit);
    recentSessions.forEach(session => {
      const key = today(parseSessionDate(session.date));
      const row = dayMap.get(key);
      if(row) row.count += 1;
    });
    const activeRows = trainerStudentRows.filter(row=>row.status === "active");
    const activeWorkouts = customWorkouts.filter(w => w.isActive !== false && isTrainerWorkoutTemplate(w));
    const attentionRows = activeRows.map(row => {
      const lastSessionTime = row.lastSession ? parseSessionDate(row.lastSession.date).getTime() : 0;
      const lastBodyTime = row.lastBody ? parseSessionDate(row.lastBody.date).getTime() : 0;
      const daysWithoutTraining = lastSessionTime ? Math.floor((Date.now() - lastSessionTime)/(24*60*60*1000)) : null;
      const daysWithoutBody = lastBodyTime ? Math.floor((Date.now() - lastBodyTime)/(24*60*60*1000)) : null;
      const reasons = [];
      if(!row.workouts?.length) reasons.push("sem treino ativo");
      if(daysWithoutTraining === null) reasons.push("sem treino registrado");
      else if(daysWithoutTraining >= 7) reasons.push(`${daysWithoutTraining} dias sem treinar`);
      if(daysWithoutBody === null) reasons.push("sem dados corporais");
      else if(daysWithoutBody >= 30) reasons.push(`${daysWithoutBody} dias sem atualizar corpo`);
      const priority = (!row.workouts?.length ? 1000 : 0) + (daysWithoutTraining ?? 999) + (daysWithoutBody === null ? 60 : Math.min(daysWithoutBody, 60));
      return {...row, reasons, priority};
    }).filter(row=>row.reasons.length).sort((a,b)=>b.priority - a.priority).slice(0,6);
    const inactiveAttention = trainerStudentRows.filter(row=>row.status !== "active").length + attentionRows.length;
    const latestBody = body
      .filter(record => trainerLinks.some(link =>
        record.studentId === link.studentId || record.userId === link.studentId || normalizeEmail(record.studentEmail || record.userEmail) === normalizeEmail(link.studentEmail)
      ))
      .sort((a,b)=>parseSessionDate(b.date).getTime() - parseSessionDate(a.date).getTime())
      .slice(0,4);
    const recentEvents = [
      ...trainerSessions.slice(0,5).map(session => ({
        id:`session-${session.id || session.date}-${session.studentEmail || ""}`,
        title:session.studentName || session.studentEmail || "Aluno",
        detail:`concluiu ${session.workoutName || session.workoutLabel || "treino"} · ${session.date}`
      })),
      ...latestBody.map((record,idx)=>({
        id:`body-${record.id || idx}`,
        title:record.studentName || record.studentEmail || record.userEmail || "Aluno",
        detail:`atualizou dados corporais · ${record.date}`
      })),
      ...trainerLinks.filter(link=>link.status === "pending").slice(0,3).map(link => ({
        id:`invite-${link.id}`,
        title:link.studentName || link.studentEmail || "Aluno",
        detail:"convite pendente"
      }))
    ].slice(0,8);
    const summary = [];
    if(activeRows.length) summary.push(`${activeRows.length} aluno${activeRows.length === 1 ? "" : "s"} ativo${activeRows.length === 1 ? "" : "s"} em acompanhamento.`);
    else summary.push("Nenhum aluno ativo no momento.");
    if(recentSessions.length) summary.push(`${recentSessions.length} treino${recentSessions.length === 1 ? "" : "s"} registrado${recentSessions.length === 1 ? "" : "s"} nos últimos 7 dias.`);
    else summary.push("Ainda não há treinos registrados nos últimos 7 dias.");
    if(attentionRows.length) summary.push(`${attentionRows.length} aluno${attentionRows.length === 1 ? "" : "s"} precisa${attentionRows.length === 1 ? "" : "m"} de atenção.`);
    else summary.push("Nenhum aluno ativo aparece como prioridade de atenção.");
    if(activeWorkouts.length) summary.push(`${activeWorkouts.length} modelo${activeWorkouts.length === 1 ? "" : "s"} ativo${activeWorkouts.length === 1 ? "" : "s"} disponível${activeWorkouts.length === 1 ? "" : "is"}.`);
    else summary.push("Nenhum modelo ativo disponível para alunos.");
    return {
      activeStudents:activeRows.length,
      activeWorkouts:activeWorkouts.length,
      recentTrainingCount:recentSessions.length,
      inactiveAttention,
      summary,
      recentEvents,
      attentionRows,
      dayRows
    };
  },[trainerStudentRows, trainerLinks, customWorkouts, allHistorySessions, body, currentUserId, currentUserEmail]);

  const activeAssignableStudents = useMemo(()=>activeTrainerLinks.filter(link => link.status === "active" && link.studentId),[activeTrainerLinks]);
  const assignmentSourceWorkout = useMemo(()=>customWorkouts.find(w => w.id === assignmentWorkoutId) || null,[customWorkouts, assignmentWorkoutId]);

  function workoutTypeLabel(workoutItem){
    const type = workoutItem?.type || "personal";
    if(type === "template") return "modelo";
    if(type === "student") return "aluno";
    return "para mim";
  }

  function workoutAssignmentSummary(workoutItem){
    const type = workoutItem?.type || "personal";
    if(type === "student") return `atribuído a ${workoutItem.studentName || workoutItem.studentEmail || "aluno"}`;
    if(type === "personal") return "atribuído a mim";
    const copies = customWorkouts.filter(w => workoutSourceId(w) === workoutItem.id);
    if(!copies.length) return "ainda não atribuído";
    const selfCount = copies.filter(w => (w.type || "personal") === "personal").length;
    const studentCount = copies.filter(w => w.type === "student").length;
    return `${selfCount ? currentUserSelfLabel : ""}${selfCount && studentCount ? " + " : ""}${studentCount ? `${studentCount} aluno${studentCount > 1 ? "s" : ""}` : ""}`;
  }

  function openAssignment(workoutItem){
    if(!workoutItem?.id) return;
    setAssignmentWorkoutId(workoutItem.id);
    setAssignmentSelection(restoreControlledDraft("workout-assignment", workoutItem.id, {self:false, students:{}}));
    setAssignmentRetryEntries([]);
    setAssignmentResult(null);
    assignmentCompletedCountRef.current = 0;
    setShowWorkoutEditor(false);
    requestAnimationFrame(()=>document.getElementById("assign-workout")?.scrollIntoView({block:"start", behavior:"smooth"}));
  }

  async function assignWorkoutToStudent(workoutItem, student, preparedCopy=null){
    if(!ensureMutationAllowed()) return;
    if(!workoutItem?.id || !student?.studentId) {
      alert("O aluno precisa aceitar o convite antes de receber treinos.");
      return;
    }
    const isSelfAssignment = !!student.isSelf;
    const copy = preparedCopy || {
      ...workoutItem,
      id:makeId(),
      name:workoutItem.name,
      items:cloneWorkoutItemsForAssignment(workoutItem.items || []),
      type:isSelfAssignment ? "personal" : "student",
      ownerId:student.studentId,
      coachId:isSelfAssignment ? "" : currentUserId,
      coachName:isSelfAssignment ? "" : currentUserName,
      coachEmail:isSelfAssignment ? "" : currentUserEmail,
      studentId:isSelfAssignment ? "" : student.studentId,
      studentName:isSelfAssignment ? "" : student.studentName || "",
      studentEmail:isSelfAssignment ? "" : normalizeEmail(student.studentEmail),
      sourceWorkoutId:workoutItem.id,
      sourceTemplateId:workoutItem.id,
      isActive:true
    };
    const actionKey = `assign-workout:${workoutItem.id}:${student.studentId}`;
    return runPendingAction(actionKey, async()=>{
      const entry = {key:actionKey, label:student.studentName || student.studentEmail || currentUserSelfLabel, copy};
      const result = await executeAssignmentBatch([entry], item=>dataService.saveWorkout(item));
      if(result.succeeded.length){
        setCustomWorkouts(current=>mergeAssignmentsById(current, result.succeeded));
        notify(isSelfAssignment ? "Treino atribuído aos seus treinos." : "Treino atribuído ao aluno.");
        return;
      }
      const message = result.failed[0]?.error || "Não foi possível atribuir este treino.";
      console.error("Erro ao atribuir treino:", message);
      notify(message, "error", {
        duration:0,
        onRetry:()=>assignWorkoutToStudent(workoutItem, student, copy),
      });
    });
  }

  function toggleAssignmentStudent(linkId, checked){
    setAssignmentSelection(current => ({
      ...current,
      students:{...current.students, [linkId]:checked}
    }));
  }

  function toggleAssignmentSelf(checked){
    setAssignmentSelection(current => ({...current, self:!!checked}));
  }

  function closeAssignment(){
    setAssignmentWorkoutId("");
    setAssignmentSelection({self:false, students:{}});
    setAssignmentRetryEntries([]);
    setAssignmentResult(null);
    assignmentCompletedCountRef.current = 0;
  }

  async function runAssignmentEntries(entries){
    if(!ensureMutationAllowed()) return;
    if(!entries.length) return;
    return runPendingAction("assign-workout", async()=>{
      const result = await executeAssignmentBatch(entries, copy=>dataService.saveWorkout(copy));
      if(result.succeeded.length) setCustomWorkouts(current=>mergeAssignmentsById(current, result.succeeded));
      assignmentCompletedCountRef.current += result.succeeded.length;
      if(result.failed.length){
        const status = result.succeeded.length ? "partial" : "error";
        setAssignmentRetryEntries(result.failed);
        setAssignmentResult({status:assignmentCompletedCountRef.current ? "partial" : status, succeeded:assignmentCompletedCountRef.current, failed:result.failed});
        const message = result.succeeded.length
          ? `${result.succeeded.length} atribuição${result.succeeded.length > 1 ? "ões" : ""} concluída${result.succeeded.length > 1 ? "s" : ""}; ${result.failed.length} falhou.`
          : `Nenhuma atribuição foi concluída. ${result.failed.length} destino${result.failed.length > 1 ? "s falharam" : " falhou"}.`;
        notify(message, status === "partial" ? "warning" : "error", {
          duration:0,
          onRetry:()=>runAssignmentEntries(result.failed),
          retryLabel:`Tentar ${result.failed.length} novamente`,
        });
        return result;
      }
      removeEditorDraft(globalThis.localStorage, currentDraftKey("workout-assignment", assignmentWorkoutId));
      const completedCount = assignmentCompletedCountRef.current;
      closeAssignment();
      notify(`Treino atribuído para ${completedCount} destino${completedCount > 1 ? "s" : ""}.`);
      return result;
    });
  }

  async function assignWorkoutCopies(){
    if(!assignmentSourceWorkout) return;
    if(assignmentRetryEntries.length) return runAssignmentEntries(assignmentRetryEntries);
    const selectedLinks = activeAssignableStudents.filter(link => assignmentSelection.students?.[link.id]);
    if(!assignmentSelection.self && selectedLinks.length === 0) {
      alert("Escolha pelo menos um destino para atribuir o treino.");
      return;
    }
    const baseItems = cloneWorkoutItemsForAssignment(assignmentSourceWorkout.items || []);
    const entries = [];
    if(assignmentSelection.self) {
      entries.push({
        key:"self",
        label:currentUserSelfLabel,
        copy:{
          ...assignmentSourceWorkout,
          id:makeId(),
          name:assignmentSourceWorkout.name,
          items:cloneWorkoutItemsForAssignment(baseItems),
          type:"personal",
          ownerId:currentUserId,
          coachId:"",
          coachName:"",
          coachEmail:"",
          studentId:"",
          studentName:"",
          studentEmail:"",
          sourceWorkoutId:assignmentSourceWorkout.id,
          sourceTemplateId:assignmentSourceWorkout.id,
          isActive:true
        }
      });
    }
    selectedLinks.forEach(link => {
      entries.push({
        key:link.id,
        label:link.studentName || link.studentEmail || "Aluno",
        copy:{
          ...assignmentSourceWorkout,
          id:makeId(),
          name:assignmentSourceWorkout.name,
          items:cloneWorkoutItemsForAssignment(baseItems),
          type:"student",
          ownerId:link.studentId,
          coachId:currentUserId,
          coachName:currentUserName,
          coachEmail:currentUserEmail,
          studentId:link.studentId,
          studentName:link.studentName || "",
          studentEmail:normalizeEmail(link.studentEmail),
          sourceWorkoutId:assignmentSourceWorkout.id,
          sourceTemplateId:assignmentSourceWorkout.id,
          isActive:true
        }
      });
    });
    return runAssignmentEntries(entries);
  }

  function latestExerciseExecution(exerciseName){
    for(const session of historySessions){
      const item = (session.items || []).find(i => i.exercise === exerciseName && (i.done || (i.sets || []).length));
      if(item){
        const sets = Array.isArray(item.sets) && item.sets.length ? item.sets : (item.load || item.reps ? [{load:item.load || "", reps:item.reps || ""}] : []);
        const volume = item.volume ?? sets.reduce((sum,set)=>sum + numericValue(set.load)*numericValue(set.reps),0);
        return {date:session.date, workoutName:session.workoutName, sets, volume};
      }
    }
    return null;
  }

  function compactExecutionSummary(execution){
    if(!execution || !execution.sets?.length) return null;
    const visibleSets = execution.sets.slice(0, 5);
    const line = visibleSets.map((set,index)=>{
      if(set.drops?.length) {
        return `S${index + 1}: ${set.drops.map((drop,dropIdx)=>`D${dropIdx + 1} ${String(drop.load || "-").trim()}kg x ${String(drop.reps || "-").trim()}`).join(" + ")}`;
      }
      const load = String(set.load || "").trim() || "-";
      const reps = String(set.reps || "").trim() || "-";
      return `S${index + 1}: ${load}kg x ${reps}`;
    }).join(" | ");
    const extraSets = execution.sets.length - visibleSets.length;
    const loads = execution.sets.flatMap(set=>set.drops?.length ? set.drops.map(drop=>String(drop.load || "").trim()) : [String(set.load || "").trim()]).filter(Boolean);
    const reps = execution.sets.flatMap(set=>set.drops?.length ? set.drops.map(drop=>String(drop.reps || "").trim()) : [String(set.reps || "").trim()]).filter(Boolean);
    return {
      line:`${line}${extraSets > 0 ? ` | +${extraSets} séries` : ""}`,
      sets:execution.sets.length,
      loads:loads.length ? `${loads.join("/")} kg` : "carga não informada",
      reps:reps.length ? `${reps.join("/")} reps` : "reps não informadas",
      volume:execution.volume ? `${Math.round(execution.volume).toLocaleString("pt-BR")} kg` : ""
    };
  }

  const themeClass = theme === "light" ? "theme-light" : "theme-dark";
  const bodyChartTooltip = theme === "light"
    ? {
        contentStyle:{background:"#ffffff", border:"1px solid #c8d4e1", borderRadius:12, color:"#172331", boxShadow:"0 12px 28px rgba(21,34,50,.12)"},
        labelStyle:{color:"#172331", fontWeight:900},
        itemStyle:{color:"#263c52", fontWeight:800}
      }
    : {
        contentStyle:{background:"#071527", border:"1px solid rgba(75,220,255,.32)", borderRadius:12, color:"#eff6ff", boxShadow:"0 14px 34px rgba(0,0,0,.34)"},
        labelStyle:{color:"#d9fbff", fontWeight:900},
        itemStyle:{color:"#cfe3ff", fontWeight:800}
      };

  const TimerCard = ({sticky=false}) => <section className={`timerCard ${sticky ? "stickyTimer" : ""}`}>
    <button className="timerDisplay" onClick={editTimerSetpoint} title="Clique para alterar o tempo">
      <small>Descanso • setpoint {currentTimerSeconds()}s</small>
      <strong>{mmss}</strong>
      <em>toque para editar</em>
    </button>
    <button onClick={startTimer}><TimerReset size={18}/> Iniciar</button>
    <button onClick={toggleTimer}>{timer.running?<Pause size={18}/>:<Play size={18}/>}</button>
    <button className="ghost" onClick={resetTimer}>Reset</button>
  </section>;

  const workoutKeys = Object.keys(workouts);
  const allWorkoutKeys = Object.keys(allWorkouts);
  const displayedWorkoutKeys = workoutKeys.filter(key => {
    if(appMode !== "treinador") return true;
    const meta = workoutMetaForKey(key);
    if(!isTrainerWorkoutTemplate(meta)) return false;
    if(workoutArchiveView === "archived" ? meta.isActive !== false : meta.isActive === false) return false;
    const items = resolveWorkout(key).items;
    const search = workoutSearch.trim().toLowerCase();
    if(!search) return true;
    const objective = meta.objective || items.find(item=>item.objective)?.objective || "";
    const haystack = `${workoutLabels[key] || meta.name || ""} ${objective} ${items.map(item=>item.name).join(" ")}`.toLowerCase();
    return haystack.includes(search);
  }).sort((a,b)=>{
    if(appMode !== "treinador") return 0;
    const metaA = workoutMetaForKey(a);
    const metaB = workoutMetaForKey(b);
    const itemsA = resolveWorkout(a).items;
    const itemsB = resolveWorkout(b).items;
    const objectiveA = String(metaA.objective || itemsA.find(item=>item.objective)?.objective || "");
    const objectiveB = String(metaB.objective || itemsB.find(item=>item.objective)?.objective || "");
    if(workoutSort === "recent") return parseSessionDate(metaB.createdAt || metaB.updatedAt || metaB.date).getTime() - parseSessionDate(metaA.createdAt || metaA.updatedAt || metaA.date).getTime();
    if(workoutSort === "oldest") return parseSessionDate(metaA.createdAt || metaA.updatedAt || metaA.date).getTime() - parseSessionDate(metaB.createdAt || metaB.updatedAt || metaB.date).getTime();
    if(workoutSort === "objective") return objectiveA.localeCompare(objectiveB, "pt-BR") || String(workoutLabels[a] || "").localeCompare(String(workoutLabels[b] || ""), "pt-BR");
    return String(workoutLabels[a] || "").localeCompare(String(workoutLabels[b] || ""), "pt-BR");
  });
  const athleteWorkoutSchedule = useMemo(()=>{
    if(appMode === "treinador") return {today:new Set(), next:"", suggested:""};
    const todayDate = new Date();
    const todayKeys = workoutKeys.filter(key=>scheduledWeekdays(workoutMetaForKey(key)).includes(todayDate.getDay()));
    let next = "";
    for(let offset=1; offset<=7 && !next; offset+=1){
      const date = new Date(todayDate);
      date.setDate(todayDate.getDate() + offset);
      next = workoutKeys.find(key=>!todayKeys.includes(key) && scheduledWeekdays(workoutMetaForKey(key)).includes(date.getDay())) || "";
    }
    let suggested = "";
    if(!next && workoutKeys.length > 1){
      const lastCompleted = [...personalSessions]
        .sort((a,b)=>parseSessionDate(b.date).getTime() - parseSessionDate(a.date).getTime())
        .find(session=>workoutKeys.includes(session.workoutKey || session.workout));
      const lastKey = lastCompleted?.workoutKey || lastCompleted?.workout || "";
      const lastIndex = workoutKeys.indexOf(lastKey);
      if(lastIndex >= 0) {
        const candidate = workoutKeys[(lastIndex + 1) % workoutKeys.length];
        suggested = !todayKeys.includes(candidate) && candidate !== next ? candidate : "";
      }
    }
    if(!next && !suggested && workoutKeys.length) suggested = workoutKeys.find(key=>!todayKeys.includes(key)) || "";
    return {today:new Set(todayKeys), next, suggested};
  },[appMode, workoutKeys, customWorkouts, editedBaseWorkouts, personalSessions]);
  const nextWorkoutDate = useMemo(()=>{
    const key = athleteWorkoutSchedule.next;
    const weekdays = key ? scheduledWeekdays(workoutMetaForKey(key)) : [];
    const date = new Date();
    if(!weekdays.length) return date;
    for(let offset=1; offset<=7; offset+=1){
      const candidate = new Date(date);
      candidate.setDate(date.getDate() + offset);
      if(weekdays.includes(candidate.getDay())) return candidate;
    }
    return date;
  },[athleteWorkoutSchedule, customWorkouts, editedBaseWorkouts]);
  const trainerWorkoutArchiveCounts = useMemo(()=>({
    active:customWorkouts.filter(w=>isTrainerWorkoutTemplate(w) && w.isActive !== false).length,
    archived:customWorkouts.filter(w=>isTrainerWorkoutTemplate(w) && w.isActive === false).length
  }),[customWorkouts, currentUserId, currentUserEmail]);
  const workoutStats = useMemo(()=>{
    const active = allWorkoutKeys.filter(key => {
      const meta = workoutMetaForKey(key);
      return (appMode === "treinador" ? isTrainerWorkoutTemplate(meta) : true) && meta.isActive !== false;
    }).length;
    const total = appMode === "treinador"
      ? allWorkoutKeys.filter(key => isTrainerWorkoutTemplate(workoutMetaForKey(key))).length
      : allWorkoutKeys.length;
    return {
      total,
      active,
      custom:appMode === "treinador" ? customWorkouts.filter(isTrainerWorkoutTemplate).length : customWorkouts.length
    };
  },[allWorkoutKeys, customWorkouts, appMode, currentUserId, currentUserEmail]);
  const selectedWorkoutDetail = useMemo(()=>{
    if(!selectedWorkoutDetailKey) return null;
    const resolved = resolveWorkout(selectedWorkoutDetailKey);
    if(!resolved.key) return null;
    const {key, groups, items, metadata:meta, label} = resolved;
    return {
      key,
      label,
      groups,
      items,
      meta,
      coachName:appMode !== "treinador" ? resolveWorkoutCoachName(meta) : ""
    };
  },[selectedWorkoutDetailKey, workouts, allWorkouts, workoutLabels, allWorkoutLabels, customWorkouts, editedBaseWorkouts, appMode, activeStudentLinks]);
  const selectedExerciseDetail = useMemo(()=>{
    if(!selectedExerciseDetailId) return null;
    return fullLibrary.find(ex => String(ex.id || libraryKey(ex)) === selectedExerciseDetailId) || null;
  },[selectedExerciseDetailId, fullLibrary]);
  const isEditingExistingWorkout = Boolean(newWorkout.editingWorkoutKey || newWorkout.editingKey || newWorkout.editingId || Number.isInteger(newWorkout.editingIndex));

  function resetAthleteModeState(){
    setScreen("dashboard");
    setSelectedStudentId("");
    setStudentDetailView("");
    setSelectedWorkoutDetailKey("");
    setSelectedWorkoutExerciseIndex(null);
    setEditingWorkoutExerciseIndex(null);
    setSelectedExerciseDetailId("");
    setSelectedBodyRecord(null);
    setShowStudentBodyForm(false);
    setShowProfileBodyEditor(false);
    setShowInviteForm(false);
    setGeneratedInvite(null);
    setOpenSession(null);
    setAssignmentWorkoutId("");
    setAssignmentSelection({self:false, students:{}});
    setNewWorkout(blankWorkout);
    setNewExercise(blankExercise);
    setShowWorkoutEditor(false);
    setShowWorkoutLibrary(false);
    setShowExerciseEditor(false);
    resetExerciseForm();
    setEditingStudentLink(null);
    setEndingStudentLink(null);
    setStudentMessage("");
    setSessionSummary(null);
    setFinishConfirm(false);
    setNavigationStack([]);
    closeActionMenus();
  }

  function changeMode(mode){
    if(!bypassDirtyGuardRef.current && activeDirtyScope()) {
      requestProtectedAction(()=>changeMode(mode));
      return;
    }
    if(mode === "treinador" && !canUseCoachMode) return;
    const nextMode = mode === "treinador" ? "treinador" : "atleta";
    if(nextMode === "atleta") {
      resetAthleteModeState();
      setAppMode(nextMode);
      notify("Modo aluno ativo.", "info");
      void dataService.saveSettings({appMode: nextMode}).catch(error=>{ console.error("Erro ao salvar modo:", error); notify("Não foi possível salvar o modo selecionado.", "warning"); });
      return;
    }
    setAppMode(nextMode);
    notify("Modo treinador ativo.", "info");
    setSelectedStudentId("");
    setStudentDetailView("");
    setSelectedWorkoutDetailKey("");
    setSelectedWorkoutExerciseIndex(null);
    setEditingWorkoutExerciseIndex(null);
    setSelectedExerciseDetailId("");
    setSelectedBodyRecord(null);
    setShowStudentBodyForm(false);
    setShowProfileBodyEditor(false);
    setShowInviteForm(false);
    setGeneratedInvite(null);
    setOpenSession(null);
    setAssignmentWorkoutId("");
    setAssignmentSelection({self:false, students:{}});
    setNavigationStack([]);
    void dataService.saveSettings({appMode: nextMode}).catch(error=>{ console.error("Erro ao salvar modo:", error); notify("Não foi possível salvar o modo selecionado.", "warning"); });
    if(nextMode === "treinador" && !["dashboard","alunos","criar","exercicios","evolucao","analises","dados"].includes(screen)){
      setScreen("dashboard");
    }
  }

  function navigateScreen(nextScreen, options={}){
    if(!bypassDirtyGuardRef.current && activeDirtyScope()) {
      requestProtectedAction(()=>navigateScreen(nextScreen, options));
      return;
    }
    const fromNav = options.fromNav === true;
    setScreen(nextScreen);
    setSelectedStudentId("");
    setStudentDetailView("");
    setSelectedWorkoutDetailKey("");
    setSelectedWorkoutExerciseIndex(null);
    setEditingWorkoutExerciseIndex(null);
    setSelectedExerciseDetailId("");
    setSelectedBodyRecord(null);
    setShowStudentBodyForm(false);
    setShowProfileBodyEditor(false);
    setShowInviteForm(false);
    setGeneratedInvite(null);
    setOpenSession(null);
    if(fromNav){
      setNavigationStack([]);
      setAssignmentWorkoutId("");
      setAssignmentSelection({self:false, students:{}});
      setShowWorkoutEditor(false);
      setShowExerciseEditor(false);
      setSessionSummary(null);
      if(!activeSession) setFinishConfirm(false);
    }
  }

  function openHistorySession(session){
    if(!session) return;
    setScreen("historico");
    setSelectedStudentId("");
    setStudentDetailView("");
    setSelectedWorkoutDetailKey("");
    setSelectedWorkoutExerciseIndex(null);
    setEditingWorkoutExerciseIndex(null);
    setSelectedExerciseDetailId("");
    setSelectedBodyRecord(null);
    setShowStudentBodyForm(false);
    setShowProfileBodyEditor(false);
    setShowInviteForm(false);
    setGeneratedInvite(null);
    setOpenSession(session);
  }

  function canDeleteOpenSession(session){
    if(!session?.id) return false;
    if(appMode === "treinador") {
      if(session.studentId && session.studentId !== currentUserId) return false;
      if(session.studentEmail && normalizeEmail(session.studentEmail) !== currentUserEmail) return false;
    }
    return true;
  }

  function continueActiveWorkout(){
    if(activeSession?.workout) setWorkout(activeSession.workout);
    const currentIsPending = activeExerciseIndex !== null && !activeSession?.exercises?.[activeExerciseIndex]?.done;
    const pendingIndex = currentIsPending ? activeExerciseIndex : nextPendingExerciseIndex(activeExerciseIndex ?? -1, activeSession);
    if(pendingIndex !== null) setActiveExerciseIndex(pendingIndex);
    setSessionView("exercise");
    navigateScreen("treino");
    scrollSessionToTop();
    notify("Continuando treino em andamento.", "info");
  }

  function typeBadge(type){
    const t = type || "NORMAL";
    const label = t === "REST PAUSE" ? "REST" : t === "DROP SET" ? "DROP" : t;
    return <span className={"typeBadge type" + t.replaceAll(" ","").toLowerCase()}>{label}</span>;
  }

  function ActionMenu({id, label="Ações", className="", children}){
    const open = openActionMenuId === id;
    const triggerRef = useRef(null);
    const [panelStyle,setPanelStyle] = useState(null);
    useLayoutEffect(()=>{
      if(!open || !triggerRef.current) return;
      const updatePanelPosition = () => {
        const rect = triggerRef.current.getBoundingClientRect();
        const panelWidth = 180;
        const left = Math.max(8, Math.min(window.innerWidth - panelWidth - 8, rect.right - panelWidth));
        const top = rect.bottom + 6;
        setPanelStyle({top:`${top}px`, left:`${left}px`, minWidth:`${panelWidth}px`});
      };
      updatePanelPosition();
      window.addEventListener("resize", updatePanelPosition);
      window.addEventListener("scroll", updatePanelPosition, true);
      return () => {
        window.removeEventListener("resize", updatePanelPosition);
        window.removeEventListener("scroll", updatePanelPosition, true);
      };
    },[open]);
    return <div className={`studentActionMenu actionMenu ${className} ${open ? "open" : ""}`} data-action-menu onClick={event=>event.stopPropagation()}>
      <button ref={triggerRef} type="button" className="actionMenuTrigger" aria-label={label} aria-expanded={open} onClick={(event)=>{event.stopPropagation(); setOpenActionMenuId(current => current === id ? "" : id);}}>⋮</button>
      {open && panelStyle && createPortal(<div className="actionMenuPanel fixedActionMenuPanel" role="menu" style={panelStyle} data-action-menu onClick={(event)=>{
        event.stopPropagation();
        if(event.target?.closest?.("button")) closeActionMenus();
      }}>{children}</div>, document.body)}
    </div>;
  }

  if(configurationError){
    return <div className={`app authGate ${themeClass}`}>
      <section className="formCard accountCard configurationErrorCard">
        <h2>Configuração necessária</h2>
        <p>{configurationError}</p>
        <p className="muted">O modo local permanece disponível apenas em desenvolvimento quando VITE_ENABLE_LOCAL_MODE=true.</p>
      </section>
    </div>;
  }

  if(isSupabaseConfigured && passwordRecovery.phase !== "idle"){
    return <div className={`app authGate ${themeClass}`}>
      <PasswordRecoveryAccess />
    </div>;
  }

  if(!authReady || globalSyncState === "loading" || (globalSyncState === "retrying" && !hasSafeDataRef.current)){
    return <div className={`app authGate ${themeClass}`}><section className="formCard accountCard syncGate" aria-busy="true">
      <LoaderCircle className="inlineSpinner" aria-hidden="true"/>
      <h2>Carregando seus dados</h2>
      <p className="muted">Validando a sessão e preparando uma versão segura das informações.</p>
    </section></div>;
  }

  if(!hasSafeDataRef.current && (globalSyncState === "load-error" || globalSyncState === "offline")){
    return <div className={`app authGate ${themeClass}`}><section className="formCard accountCard syncGate" role="alert">
      {globalSyncState === "offline" ? <WifiOff aria-hidden="true"/> : <AlertTriangle aria-hidden="true"/>}
      <h2>{globalSyncState === "offline" ? "Sem conexão" : "Não foi possível carregar"}</h2>
      <p className="muted">{globalSyncState === "offline" ? "Conecte-se à internet para validar sua sessão e carregar os dados da nuvem." : loadError || "Tente novamente em instantes."}</p>
      <button type="button" onClick={retryApplicationLoad} disabled={!networkOnline || syncRetrying} aria-busy={syncRetrying}>
        {syncRetrying ? <LoaderCircle className="buttonSpinner" aria-hidden="true"/> : <RefreshCw aria-hidden="true"/>}
        {syncRetrying ? "Tentando novamente..." : "Tentar novamente"}
      </button>
    </section></div>;
  }

  if(isSupabaseConfigured && !currentUser){
    return <div className={`app authGate ${themeClass}`}>
      <AccountAccess entry />
    </div>;
  }

  const scheduledTodayWorkout = [...athleteWorkoutSchedule.today][0] || "";
  const recommendedWorkoutKey = activeSession?.workout || scheduledTodayWorkout || athleteWorkoutSchedule.next || athleteWorkoutSchedule.suggested || (workoutKeys.includes(workout) ? workout : workoutKeys[0] || "");
  const recommendedWorkout = activeSession ? null : resolveWorkout(recommendedWorkoutKey);
  const recommendedWorkoutLabel = activeSession?.workoutLabel || recommendedWorkout?.label || "Nenhum treino";
  const recommendedWorkoutItems = activeSession ? activeSessionItems : (recommendedWorkout?.items || []);
  const recommendedWorkoutTitle = activeSession ? "Treino em andamento" : scheduledTodayWorkout ? "Treino de hoje" : athleteWorkoutSchedule.next ? "Próximo treino" : "Treino sugerido";
  const latestBodyRecord = personalBody[0] || {};
  const currentProfileWeight = latestBodyRecord.peso || profile.weight || "—";
  const currentProfileHeight = latestBodyRecord.height || profile.height || "—";
  const currentProfileAge = latestBodyRecord.age || profile.age || "—";
  const currentProfileBf = bodyFatValue(latestBodyRecord) || "—";
  const lastSession = personalSessions[0] || null;
  const lastWorkoutName = personalSessions[0]?.workoutName || personalSessions[0]?.workoutLabel || workoutLabels[personalSessions[0]?.workout] || "Sem treino";
  const recommendedWorkoutDuration = estimateWorkoutDurationLabel(recommendedWorkoutItems, timerSetpoint);
  const nextWorkoutKey = activeSession ? "" : (athleteWorkoutSchedule.next || athleteWorkoutSchedule.suggested || "");
  const nextWorkoutLabel = nextWorkoutKey ? (workoutLabels[nextWorkoutKey] || "Próximo treino") : "Sem próximo treino";
  const athleteMainScreens = ["dashboard","criar","historico","dados"];
  const trainerMainScreens = ["dashboard","alunos","criar","exercicios","dados"];
  const mainScreens = appMode === "treinador" ? trainerMainScreens : athleteMainScreens;
  const athleteHasIncompatibleRenderState = appMode === "atleta" && Boolean(
    !athleteScreens.has(screen) ||
    selectedStudentId ||
    studentDetailView ||
    assignmentWorkoutId ||
    showWorkoutEditor ||
    showWorkoutLibrary ||
    showExerciseEditor ||
    selectedExerciseDetailId ||
    showStudentBodyForm ||
    showInviteForm ||
    editingWorkoutExerciseIndex !== null ||
    selectedBodyRecord?.scope === "student" ||
    editingStudentLink ||
    endingStudentLink
  );
  const renderScreen = athleteHasIncompatibleRenderState ? "dashboard" : screen;
  const hasInternalState = renderScreen !== "dashboard" && Boolean(
    openSession?.items ||
    selectedStudentProfile ||
    studentDetailView ||
    selectedWorkoutDetail ||
    assignmentWorkoutId ||
    showWorkoutEditor ||
    selectedExerciseDetail ||
    showExerciseEditor ||
    showProfileBodyEditor ||
    showInviteForm
  );
  const isInternalScreen = renderScreen === "treino" || hasInternalState || !mainScreens.includes(renderScreen);
  const showBottomNav = !isInternalScreen;
  const internalTitle =
    renderScreen === "treino" ? (activeSession ? (sessionView === "list" ? "Lista do treino" : "Executando treino") : displayWorkoutLabel || "Treino") :
    openSession?.items ? (openSession.workoutName || openSession.workoutLabel || "Histórico") :
    editingWorkoutExerciseIndex !== null ? "Editar exercício" :
    selectedWorkoutExerciseIndex !== null ? "Exercício" :
    showWorkoutEditor && showWorkoutLibrary ? "Selecionar exercício" :
    showWorkoutEditor ? (appMode === "treinador" ? (isEditingExistingWorkout ? "Editar treino" : "Criar treino") : "Treinos") :
    assignmentWorkoutId ? "Atribuir treino" :
    selectedWorkoutDetail ? selectedWorkoutDetail.label :
    selectedBodyRecord ? "Registro corporal" :
    showExerciseEditor ? (exerciseForm.editingName ? "Editar exercício" : "Novo exercício") :
    selectedExerciseDetail ? selectedExerciseDetail.name :
    showProfileBodyEditor ? "Dados corporais" :
    studentDetailView === "bodyHistory" ? "Histórico corporal" :
    studentDetailView === "workoutHistory" ? "Histórico de treinos" :
    studentDetailView === "workoutAssign" ? "Atribuir treino" :
    showStudentBodyForm || studentDetailView === "bodyForm" ? "Dados corporais" :
    showInviteForm ? "Convidar aluno" :
    selectedStudentProfile ? (selectedStudentProfile.studentName || selectedStudentProfile.studentEmail || "Aluno") :
    renderScreen === "evolucao" ? "Evolução" :
    renderScreen === "analises" ? "Análises" :
    renderScreen === "dados" ? "Perfil" :
    renderScreen === "historico" ? "Histórico" :
    renderScreen === "criar" ? "Treinos" :
    renderScreen === "exercicios" ? "Exercícios" :
    renderScreen === "alunos" ? "Alunos" :
    "Treino Tonon";

  function handleInternalBack(){
    if(!bypassDirtyGuardRef.current && activeDirtyScope()) {
      requestProtectedAction(handleInternalBack);
      return;
    }
    if(editingWorkoutExerciseIndex !== null) {
      closeWorkoutExerciseEditor();
      return;
    }
    if(showWorkoutEditor && showWorkoutLibrary) {
      setShowWorkoutLibrary(false);
      clearWorkoutExerciseFilters();
      return;
    }
    if(appMode === "treinador" && showWorkoutEditor) {
      const workoutKey = newWorkout.editingWorkoutKey || newWorkout.editingKey || "";
      if(workoutKey) {
        suppressNextNavigationPush();
        setNavigationStack([]);
        setShowWorkoutLibrary(false);
        setEditingWorkoutExerciseIndex(null);
        setShowWorkoutEditor(false);
        setNewWorkout(blankWorkout);
        setNewExercise(blankExercise);
        clearWorkoutExerciseFilters();
        setSelectedWorkoutDetailKey(workoutKey);
        return;
      }
      cancelEditWorkout();
      return;
    }
    if(selectedWorkoutExerciseIndex !== null) {
      closeSelectedWorkoutExercise();
      return;
    }
    if(selectedBodyRecord) {
      closeSelectedBodyRecord();
      return;
    }
    const previous = navigationStack[navigationStack.length - 1];
    if(previous){
      if(showWorkoutEditor){
        setNewWorkout(blankWorkout);
        setNewExercise(blankExercise);
        setShowWorkoutLibrary(false);
        clearWorkoutExerciseFilters();
      }
      if(showExerciseEditor){
        resetExerciseForm();
        setLibrarySearch("");
      }
      setNavigationStack(stack => stack.slice(0, -1));
      restoreViewSnapshot(previous);
      return;
    }
    if(screen === "evolucao" || screen === "analises") {
      suppressNextNavigationPush();
      setScreen("alunos");
      setStudentDetailView("");
      return;
    }
    if(showWorkoutEditor) {
      if(editingWorkoutExerciseIndex !== null || showWorkoutLibrary){
        setEditingWorkoutExerciseIndex(null);
        setShowWorkoutLibrary(false);
        clearWorkoutExerciseFilters();
        return;
      }
      cancelEditWorkout();
      return;
    }
    if(selectedWorkoutExerciseIndex !== null) {
      closeSelectedWorkoutExercise();
      return;
    }
    if(assignmentWorkoutId) {
      closeAssignment();
      return;
    }
    if(showExerciseEditor) {
      closeExerciseEditor();
      return;
    }
    if(openSession?.items) {
      suppressNextNavigationPush();
      setOpenSession(null);
      return;
    }
    if(selectedWorkoutDetail) {
      suppressNextNavigationPush();
      setSelectedWorkoutDetailKey("");
      return;
    }
    if(selectedExerciseDetail) {
      suppressNextNavigationPush();
      setSelectedExerciseDetailId("");
      return;
    }
    if(showStudentBodyForm) {
      suppressNextNavigationPush();
      setShowStudentBodyForm(false);
      setStudentDetailView("");
      return;
    }
    if(studentDetailView) {
      suppressNextNavigationPush();
      setStudentDetailView("");
      return;
    }
    if(selectedStudentProfile) {
      suppressNextNavigationPush();
      setSelectedStudentId("");
      setStudentDetailView("");
      setShowStudentBodyForm(false);
      return;
    }
    if(showInviteForm) {
      suppressNextNavigationPush();
      setShowInviteForm(false);
      setGeneratedInvite(null);
      return;
    }
    if(showProfileBodyEditor) {
      suppressNextNavigationPush();
      setShowProfileBodyEditor(false);
      return;
    }
    if(screen === "treino" && activeSession && sessionView === "exercise") {
      showSessionOverview();
      return;
    }
    if(screen === "treino") {
      navigateScreen("criar");
      return;
    }
    navigateScreen(appMode === "treinador" ? "alunos" : "dashboard");
  }

  function sessionExerciseStatus(index){
    const state = sessionExerciseState[index] || {sets:[], done:false};
    const completedSets = (state.sets || []).filter(set=>set.done).length;
    if(state.done) return "Concluído";
    if(completedSets) return "Em andamento";
    return "Pendente";
  }

  function sessionExerciseProgressLabel(index){
    const state = sessionExerciseState[index] || {sets:[]};
    const totalSets = (state.sets || []).length;
    const completedSets = (state.sets || []).filter(set=>set.done).length;
    return totalSets ? `${completedSets}/${totalSets} séries` : "Sem séries";
  }

  function renderOpenSessionDetail(session){
    return <section className="formCard internalDetail evolutionSessionDetail">
      <h2>{session.workoutName || session.workoutLabel || "Treino"}</h2>
      <p className="muted">{session.date}</p>
      <p className="evolutionSessionTotals">{session.duration || "—"} · {session.completionPct ?? 0}% concluído<br />{session.totalSets ?? 0} séries · {session.totalReps ?? 0} reps · {session.volume ? `${Math.round(session.volume).toLocaleString("pt-BR")} kg` : "—"}</p>
      {(session.items || []).filter(i=>i.done || (i.sets || []).length).map((i,idx)=><details className="performedDetail" key={idx} open>
        <summary>{i.exercise}</summary>
        {(i.sets || []).length ? i.sets.map((set,setIdx)=>{
          if(set.drops?.length) return <div className="historyDropGroup" key={setIdx}>
            <strong>Série {setIdx+1}</strong>
            {set.drops.map((drop,dropIdx)=><span key={dropIdx}>Drop {dropIdx+1}: meta {drop.plannedReps || targetLabel(drop.plannedRepTarget) || "—"} | feito {drop.reps || "—"} | carga {drop.load || "—"} kg</span>)}
          </div>
          const planned = set.plannedReps || targetLabel(set.plannedRepTarget) || i.planned?.reps || i.reps || "—";
          return <span key={setIdx}>Série {setIdx+1}: meta {planned} reps | feito {set.reps || "—"} reps | {set.load || "—"} kg</span>
        }) : <span>Sem séries detalhadas nesta sessão.</span>}
        <em>Volume do exercício: {i.volume ? `${Math.round(i.volume).toLocaleString("pt-BR")} kg` : "indisponível"}</em>
      </details>)}
      {canDeleteOpenSession(session) && <button type="button" className="danger" disabled={isActionPending(`delete-session:${session.id}`)} aria-busy={isActionPending(`delete-session:${session.id}`)} onClick={()=>deleteSession(session.id)}>
        {isActionPending(`delete-session:${session.id}`) && <LoaderCircle className="buttonSpinner" aria-hidden="true"/>}
        {isActionPending(`delete-session:${session.id}`) ? "Excluindo…" : "Excluir sessão"}
      </button>}
    </section>;
  }

  function renderSessionOverview(){
    const resumeIndex = currentExecutionExerciseIndex !== null && !sessionExerciseState[currentExecutionExerciseIndex]?.done
      ? currentExecutionExerciseIndex
      : firstPendingExerciseIndex >= 0 ? firstPendingExerciseIndex : currentExecutionExerciseIndex;
    return <section className="sessionOverview" aria-label="Lista do treino">
      <div className="sessionOverviewHeader">
        <div>
          <small>VISÃO GERAL</small>
          <h3>Exercícios do treino</h3>
          <span>{doneCount} de {displayItems.length} concluídos</span>
        </div>
        {resumeIndex !== null && resumeIndex !== undefined && <button type="button" onClick={()=>focusSessionExercise(resumeIndex)} disabled={doneCount === displayItems.length}>
          <Play size={16}/>{doneCount === displayItems.length ? "Concluído" : "Continuar"}
        </button>}
      </div>

      <div className="sessionExerciseList">
        {displayGroups.map((group, groupIndex)=>{
          const indexes = group.items.map(item=>displayItemIndexMap.get(item)).filter(index=>index !== undefined);
          if(group.type === "conj"){
            const completed = indexes.filter(index=>sessionExerciseState[index]?.done).length;
            const kind = group.items[0]?.conjugateKind || "Conjugado";
            return <section className="sessionListBlock conjugateListBlock" key={`list-group-${groupIndex}`}>
              <div className="sessionListBlockHeader">
                <div><small>{kind}</small><b>Bloco conjugado</b></div>
                <span>{completed}/{indexes.length}</span>
              </div>
              {group.items.map((item, position)=>{
                const index = displayItemIndexMap.get(item);
                const status = sessionExerciseStatus(index);
                return <button type="button" className={`sessionListRow ${sessionExerciseState[index]?.done ? "done" : ""} ${index === currentExecutionExerciseIndex ? "active" : ""}`} key={`${item.name}-${index}`} onClick={()=>focusSessionExercise(index)}>
                  <span className="sessionListLetter">{String.fromCharCode(65 + position)}</span>
                  <span className="sessionListText"><b>{item.name}</b><small>{sessionExerciseProgressLabel(index)}</small></span>
                  <em>{status}</em>
                </button>;
              })}
            </section>;
          }
          return group.items.map(item=>{
            const index = displayItemIndexMap.get(item);
            const status = sessionExerciseStatus(index);
            return <button type="button" className={`sessionListRow standalone ${sessionExerciseState[index]?.done ? "done" : ""} ${index === currentExecutionExerciseIndex ? "active" : ""}`} key={`${item.name}-${index}`} onClick={()=>focusSessionExercise(index)}>
              <span className="sessionListNumber">{sessionExerciseOrder.indexOf(index) + 1}</span>
              <span className="sessionListText"><b>{item.name}</b><small>{sessionExerciseProgressLabel(index)}</small></span>
              <em>{status}</em>
            </button>;
          });
        })}
      </div>

      <div className="sessionOverviewFooter">
        <button type="button" className="ghost" onClick={()=>resumeIndex !== null && resumeIndex !== undefined && focusSessionExercise(resumeIndex)} disabled={resumeIndex === null || resumeIndex === undefined || doneCount === displayItems.length}><Play size={17}/> Continuar execução</button>
        <button type="button" onClick={finishActiveSession}><Save size={18}/> Finalizar treino</button>
      </div>
    </section>;
  }

  function renderActiveExercise(){
    if(!activeExecutionItem || currentExecutionExerciseIndex === null) return renderSessionOverview();
    const isConjugate = activeExecutionBlock?.type === "conj";
    const conjugateLetter = isConjugate ? String.fromCharCode(65 + activeExecutionBlockPosition) : "";
    const done = !!activeExecutionState?.done;
    const restPauseExecution = isRestPauseType(getExerciseType(activeExecutionItem));
    const segmentName = restPauseExecution ? "Etapa" : "Drop";
    const sets = activeExecutionState?.sets || [];
    // O histórico só pode ser consultado neste ponto: historySessions já foi inicializado.
    // Calcular isso junto aos derivados do topo causava erro de TDZ ao iniciar o treino.
    const activeExecutionLastSummary = compactExecutionSummary(latestExerciseExecution(activeExecutionItem.name));
    const orderLabel = activeExecutionOrderPosition >= 0 ? activeExecutionOrderPosition + 1 : currentExecutionExerciseIndex + 1;
    const headerLabel = isConjugate
      ? `${activeExecutionItem.conjugateKind || "Conjugado"} · ${conjugateLetter} de ${activeExecutionBlock.indexes.length}`
      : `Exercício ${orderLabel} de ${sessionExerciseOrder.length}`;
    return <>
      <section className={`sessionExerciseScreen ${done ? "done" : ""}`} data-session-exercise={currentExecutionExerciseIndex}>
        <div className="executionExerciseHeader">
          <div>
            <small>{headerLabel}</small>
            <h2>{isConjugate ? `${conjugateLetter}. ` : ""}{activeExecutionItem.name}</h2>
          </div>
        </div>

        {isConjugate && <div className="executionConjugateContext" aria-label="Etapas do conjugado">
          {activeExecutionBlock.indexes.map((index, position)=>{
            const item = activeSessionItems[index];
            const itemDone = !!sessionExerciseState[index]?.done;
            return <button type="button" className={`${index === currentExecutionExerciseIndex ? "active" : ""} ${itemDone ? "done" : ""}`} key={index} onClick={()=>focusSessionExercise(index)}>
              <span>{String.fromCharCode(65 + position)}</span><b>{item?.name}</b>{itemDone && <CheckCircle2 size={15}/>} 
            </button>;
          })}
        </div>}

        <div className="executionExerciseMeta">
          <span>{sets.length || activeExecutionItem.sets} séries</span>
          <span>{activeExecutionTargetSummary || activeExecutionItem.reps} reps</span>
          <span>{activeExecutionItem.rest || `${timerSetpoint}s`} descanso</span>
          {getExerciseType(activeExecutionItem) !== "NORMAL" && <span>{getExerciseType(activeExecutionItem)}</span>}
          {activeExecutionEquipment && <span>{activeExecutionEquipment}</span>}
        </div>

        {activeExecutionItem.notes && <details className="executionNote"><summary>Observações do exercício</summary><p>{activeExecutionItem.notes}</p></details>}
        {activeExecutionLastSummary && <div className="executionLastSummary">
          <History size={16}/><div><b>Última execução</b><span>{activeExecutionLastSummary.line}{activeExecutionLastSummary.volume ? ` · ${activeExecutionLastSummary.volume}` : ""}</span></div>
        </div>}

        <div className="executionSets">
          <div className="executionSetsHeader"><b>Séries</b><span>{sets.filter(set=>set.done).length}/{sets.length}</span></div>
          {sets.map((set,setIdx)=><article className={`executionSetCard ${set.done ? "done" : ""} ${setIdx === activeExecutionCurrentSetIndex ? "current" : ""}`} key={setIdx}>
            <div className="executionSetHeader">
              <div><b>Série {setIdx + 1}</b><small>Meta: {set.plannedReps || activeExecutionItem.reps} reps{set.plannedLoad && !set.drops?.length ? ` · ${set.plannedLoad} kg` : ""}</small></div>
              <button className="danger iconBtn" type="button" aria-label={`Excluir série ${setIdx + 1}`} onClick={()=>removePerformedSet(currentExecutionExerciseIndex,setIdx)} disabled={done || sets.length <= 1}><Trash2 size={15}/></button>
            </div>

            {set.drops?.length ? <div className="executionDropList">
              {set.drops.map((drop,dropIdx)=><div className={`executionDropRow ${drop.done ? "done" : ""}`} key={dropIdx}>
                <div className="executionDropTitle"><b>{restPauseExecution ? (dropIdx === 0 ? "Série principal" : `Mini-série ${dropIdx}`) : `Drop ${dropIdx + 1}`}</b><small>Meta {drop.plannedReps || targetLabel(drop.plannedRepTarget) || "—"} reps</small></div>
                <label><span>Carga</span><div className="executionInputWithUnit"><input inputMode="decimal" aria-label={`Carga da etapa ${dropIdx + 1}`} placeholder="0" disabled={done} value={drop.load || ""} onChange={event=>updatePerformedDrop(currentExecutionExerciseIndex,setIdx,dropIdx,{load:event.target.value})}/><em>kg</em></div></label>
                <label><span>Reps</span><input inputMode="numeric" aria-label={`Repetições da etapa ${dropIdx + 1}`} placeholder="0" disabled={done} value={drop.reps || ""} onChange={event=>updatePerformedDrop(currentExecutionExerciseIndex,setIdx,dropIdx,{reps:event.target.value})}/></label>
                <button type="button" className={`executionCheckButton compact ${drop.done ? "done" : ""}`} disabled={done} onClick={()=>togglePerformedDrop(currentExecutionExerciseIndex,setIdx,dropIdx)} aria-label={drop.done ? `Reabrir ${segmentName.toLowerCase()}` : `Concluir ${segmentName.toLowerCase()}`}>{drop.done ? <CheckCircle2 size={20}/> : <Circle size={20}/>}</button>
              </div>)}
              <button type="button" className={`executionCheckButton full ${set.done ? "done" : ""}`} disabled={done} onClick={()=>togglePerformedSet(currentExecutionExerciseIndex,setIdx)}>{set.done ? <CheckCircle2 size={18}/> : <Circle size={18}/>} {set.done ? "Série concluída" : "Concluir série completa"}</button>
            </div> : <div className="executionSetInputs">
              <label><span>Carga</span><div className="executionInputWithUnit"><input inputMode="decimal" aria-label={`Carga da série ${setIdx + 1}`} placeholder="0" disabled={done} value={set.load || ""} onChange={event=>updatePerformedSet(currentExecutionExerciseIndex,setIdx,{load:event.target.value})}/><em>kg</em></div></label>
              <label><span>Repetições</span><input inputMode="numeric" aria-label={`Repetições da série ${setIdx + 1}`} placeholder="0" disabled={done} value={set.reps || ""} onChange={event=>updatePerformedSet(currentExecutionExerciseIndex,setIdx,{reps:event.target.value})}/></label>
              <button type="button" className={`executionCheckButton ${set.done ? "done" : ""}`} disabled={done} onClick={()=>togglePerformedSet(currentExecutionExerciseIndex,setIdx)}>{set.done ? <CheckCircle2 size={21}/> : <Circle size={21}/>}<span>{set.done ? "Concluída" : "Concluir"}</span></button>
            </div>}
          </article>)}
        </div>

        <label className="executionRpeField"><span>RPE do exercício</span><input inputMode="numeric" min="1" max="10" placeholder="1 a 10" disabled={done} value={activeExecutionState?.rpe || ""} onChange={event=>patchSessionExercise(currentExecutionExerciseIndex, exercise=>({...exercise, rpe:event.target.value}))}/></label>

        <div className="executionExerciseActions">
          {done ? <>
            <button type="button" className="ghost" onClick={()=>reopenSessionExercise(currentExecutionExerciseIndex)}>Reabrir exercício</button>
            <button type="button" disabled><CheckCircle2 size={17}/> Exercício concluído</button>
          </> : <>
            <div className="executionSecondaryActions">
              <button type="button" className="ghost" onClick={()=>addPerformedSet(currentExecutionExerciseIndex)}><PlusCircle size={16}/> Adicionar série</button>
              <button type="button" className="ghost" onClick={()=>requestDeferSessionExercise(currentExecutionExerciseIndex)}>Fazer depois</button>
            </div>
            <button type="button" className="executionCompleteButton" onClick={()=>completeSessionExercise(currentExecutionExerciseIndex)}><CheckCircle2 size={18}/> {isConjugate ? `Concluir ${conjugateLetter}` : "Concluir exercício"}</button>
          </>}
        </div>
      </section>

      <nav className="executionStepNavigation" aria-label="Navegação entre exercícios">
        <button type="button" className="ghost" disabled={previousExecutionExerciseIndex === null} onClick={()=>focusSessionExercise(previousExecutionExerciseIndex)}><ArrowLeft size={17}/><span>Anterior</span></button>
        <button type="button" className="ghost" onClick={showSessionOverview}><ClipboardList size={18}/><span>Lista</span></button>
        <button type="button" className="ghost" disabled={nextExecutionExerciseIndex === null} onClick={()=>focusSessionExercise(nextExecutionExerciseIndex)}><span>Próximo</span><ArrowRight size={17}/></button>
      </nav>
    </>;
  }

  function renderPlannedExerciseGroups(){
    return displayGroups.map((group, groupIndex)=><section className={`exerciseGroup ${group.type === "conj" ? "conjugado" : ""}`} key={groupIndex}>
      {group.type === "conj" && <div className="groupLabel">CONJUGADO · {group.items.length} exercícios</div>}
      {group.items.map((exercise, conjugateIndex)=>{
        const index = displayItemIndexMap.get(exercise) ?? displayItems.findIndex(item=>item === exercise);
        const enrichedExercise = appMode === "atleta" ? enrichWorkoutExercise(exercise) : exercise;
        const equipment = Array.isArray(enrichedExercise.equipmentList) && enrichedExercise.equipmentList.length ? enrichedExercise.equipmentList.join(" · ") : enrichedExercise.equipment || "";
        const lastSummary = compactExecutionSummary(latestExerciseExecution(exercise.name));
        const targetSummary = exerciseRepSummary(exercise);
        return <div className="exercise" key={`${exercise.name}-${index}`}>
          <div className="exContent">
            <h3>{group.type === "conj" ? `${String.fromCharCode(65 + conjugateIndex)}. ` : ""}{exercise.name}</h3>
            <div className="badges">
              <span>{exercise.sets} séries · {targetSummary || exercise.reps} reps · {exercise.rest || `${timerSetpoint}s`}</span>
              {getExerciseType(exercise) !== "NORMAL" && <span>{getExerciseType(exercise)}</span>}
              {equipment && <span>{equipment}</span>}
            </div>
            {exercise.notes && <p className="planHint">{exercise.notes}</p>}
            {lastSummary && <div className="lastExecution"><History size={15}/><div><b>Última execução</b><span>{lastSummary.line}{lastSummary.volume ? ` · volume: ${lastSummary.volume}` : ""}</span></div></div>}
            <p className="planHint">Planejado: {exercise.sets} séries × {exercise.reps} · descanso {exercise.rest || `${timerSetpoint}s`}</p>
          </div>
        </div>;
      })}
    </section>);
  }

  return <div className={`app ${themeClass} mode-${appMode} ${isInternalScreen ? "internalMode" : "primaryMode"} screen-${renderScreen}`}>
    <header className={`top ${canUseCoachMode ? "hasModeSwitch" : "hasRoleBadge"}`}>
      {isInternalScreen ? <>
      <button type="button" className="backButton topBackButton" onClick={handleInternalBack} aria-label="Voltar"><ArrowLeft size={19}/></button>
      <div className="brandBlock internalTitleBlock">
        <strong>{internalTitle}</strong>
        {renderScreen !== "treino" && <p>{APP_NAME}</p>}
      </div>
      {canUseCoachMode && renderScreen !== "treino" && <div className="modeSwitch compactModeSwitch internalModeSwitch" aria-label="Modo do treinador">
        <button type="button" className={appMode === "atleta" ? "active" : ""} onClick={()=>changeMode("atleta")}>Atleta</button>
        <button type="button" className={appMode === "treinador" ? "active" : ""} onClick={()=>changeMode("treinador")}>Treinador</button>
      </div>}
      </> : <>
      <div className="brandBlock">
        <img className="headerLogo" src={logoSrc} alt={APP_NAME} />
        <div className="brandText">
          <strong>{APP_NAME}</strong>
          <p>{currentUserDisplayName}</p>
        </div>
      </div>
      {canUseCoachMode ? <div className="modeSwitch compactModeSwitch" aria-label="Modo do treinador">
        <button type="button" className={appMode === "atleta" ? "active" : ""} onClick={()=>changeMode("atleta")}>Atleta</button>
        <button type="button" className={appMode === "treinador" ? "active" : ""} onClick={()=>changeMode("treinador")}>Treinador</button>
      </div> : <div className="roleBadge">Aluno</div>}
      </>}
    </header>

    {globalSyncState !== "loaded" && <section className={`syncBanner ${globalSyncState}`} role={globalSyncState === "load-error" ? "alert" : "status"} aria-live="polite">
      {globalSyncState === "offline" ? <WifiOff aria-hidden="true"/> : globalSyncState === "load-error" ? <AlertTriangle aria-hidden="true"/> : <LoaderCircle className="inlineSpinner" aria-hidden="true"/>}
      <div>
        <b>{globalSyncState === "offline" ? "Sem conexão com a nuvem" : globalSyncState === "load-error" ? "Falha ao atualizar os dados" : globalSyncState === "retrying" ? "Tentando novamente" : "Sincronizando alterações"}</b>
        <span>{globalSyncState === "offline"
          ? "Os dados já carregados e o treino em andamento continuam disponíveis. Alterações remotas estão pausadas."
          : globalSyncState === "load-error"
            ? "Mantivemos a última versão segura carregada. Tente atualizar novamente."
            : globalSyncState === "retrying"
              ? "Mantendo a última versão segura enquanto verificamos a nuvem."
              : `${pendingSyncCount} alteração${pendingSyncCount === 1 ? "" : "ões"} pendente${pendingSyncCount === 1 ? "" : "s"}.`}</span>
      </div>
      {(globalSyncState === "load-error" || globalSyncState === "offline") && <button type="button" className="ghost small" onClick={retryApplicationLoad} disabled={!networkOnline || syncRetrying}>
        <RefreshCw aria-hidden="true"/> Tentar novamente
      </button>}
    </section>}

    {renderScreen==="dashboard" && <main className={appMode === "treinador" ? "trainerDashboardScreen" : "athleteDashboardScreen"}>
      {appMode === "treinador" ? <>
        <div className="pageTitleRow">
          <h2 className="pageTitle">Dashboard</h2>
        </div>

        <section className="grid2">
          <Card title="Alunos ativos" value={`${trainerDashboard.activeStudents}`} sub="vínculos ativos" />
          <Card title="Treinos ativos" value={`${trainerDashboard.activeWorkouts}`} sub="modelos disponíveis" />
          <Card title="Treinos realizados" value={`${trainerDashboard.recentTrainingCount}`} sub="últimos 7 dias" />
          <Card title="Atenção" value={`${trainerDashboard.inactiveAttention}`} sub="inativos ou prioridade" />
        </section>

        <section className="chartCard">
          <h3>Resumo da semana</h3>
          {trainerDashboard.summary.map((line,idx)=><div className="detailLine compactLine" key={idx}>
            <span>{line}</span>
          </div>)}
        </section>

        <section className="chartCard">
          <h3>Treinos concluídos por dia</h3>
          {trainerDashboard.dayRows.every(row=>row.count === 0) && <p className="emptyHint">Nenhum treino concluído nos últimos 7 dias.</p>}
          <div className="verticalBars">
            {trainerDashboard.dayRows.map(row=>{
              const max = Math.max(...trainerDashboard.dayRows.map(item=>item.count), 1);
              return <div className="verticalBarItem" key={row.key}>
                <span>{row.count}</span>
                <div className="verticalBarTrack"><i style={{height:`${row.count ? Math.max(10, (row.count/max)*100) : 0}%`}} /></div>
                <b>{row.label}</b>
              </div>
            })}
          </div>
        </section>

        <section className="chartCard">
          <h3>Atividade recente</h3>
          {trainerDashboard.recentEvents.length===0 && <p className="emptyHint">As atividades aparecerão aqui quando houver treinos, registros corporais ou convites pendentes.</p>}
          {trainerDashboard.recentEvents.map(event=><div className="recordLine" key={event.id}>
            <b>{event.title}</b>
            <span>{event.detail}</span>
          </div>)}
        </section>

        <section className="chartCard">
          <h3>Alunos que precisam de atenção</h3>
          {trainerDashboard.attentionRows.length===0 && <p className="emptyHint">Nenhum aluno ativo precisa de atenção pelos dados disponíveis.</p>}
          <section className="studentGrid">
            {trainerDashboard.attentionRows.map(row=><div className="studentCard compactStudentCard" key={row.id}>
              <div className="studentCardTop">
                <b>{row.studentName || row.studentEmail}</b>
                <span className="statusBadge">{row.status}</span>
              </div>
              <span>{row.studentEmail}</span>
              <small>{row.reasons.join(" · ")}</small>
            </div>)}
          </section>
        </section>
      </> : <>
      <section className="pageTitleRow athleteDashboardTitleRow">
        <h2 className="pageTitle">Dashboard</h2>
      </section>

      {pendingCoachInvites.map(link=><section className="formCard inviteActionCard" key={link.id}>
        <div>
          <small>Convite de treinador</small>
          <b>{link.coachName || "Seu treinador"}</b>
        </div>
        <button type="button" className="ghost" onClick={()=>openInviteResponder(link)}>Responder</button>
      </section>)}

      <section className="athleteDashboardGrid">
        <section className="dashboardPrimaryCard">
          <div className="dashboardCardHeader">
            <small>{recommendedWorkoutTitle}</small>
          </div>
          <div className="dashboardPrimaryBody">
            <h3>{recommendedWorkoutLabel}</h3>
            <div className="dashboardMetaRow">
              {recommendedWorkoutItems.length > 0 && <span>{recommendedWorkoutItems.length} exercícios</span>}
              {recommendedWorkoutDuration && <span>{recommendedWorkoutDuration}</span>}
            </div>
          </div>
          {workoutKeys.length > 0 ? <button type="button" className="dashboardPrimaryAction" onClick={()=>{if(activeSession) continueActiveWorkout(); else {setWorkout(recommendedWorkoutKey); navigateScreen("treino");}}}>
            <Play size={18}/> {activeSession ? "Continuar treino" : "Iniciar treino"}
          </button> : <button type="button" className="ghost" onClick={()=>navigateScreen("criar")}>Ver treinos</button>}
        </section>

        <section className="chartCard dashboardCompactCard">
          <div className="dashboardCompactHeader">
            <small>Próximo treino</small>
          </div>
          <div className="dashboardCompactBody">
            <b>{nextWorkoutKey ? nextWorkoutLabel : "Sem próximo treino"}</b>
            <span>{nextWorkoutKey ? formatDayAndDate(nextWorkoutDate) : "Aguardando agenda"}</span>
          </div>
        </section>

        <button type="button" className="chartCard dashboardCompactCard dashboardCompactButton" onClick={()=>lastSession && openHistorySession(lastSession)} disabled={!lastSession}>
          <div className="dashboardCompactHeader">
            <small>Último treino</small>
          </div>
          <div className="dashboardCompactBody">
            <b>{lastWorkoutName}</b>
            <span>{lastSession ? `${formatRelativeOrShortDate(parseSessionDate(lastSession.date))} · ${formatCompactDurationLabel(lastSession.duration) || "Duração —"}` : "Sem sessão salva"}</span>
          </div>
        </button>

        <section className="chartCard athleteMonthlyCalendar">
          <div className="calendarHeaderRow">
            <button type="button" className="ghost iconBtn" aria-label="Mês anterior" onClick={()=>setAthleteCalendarCursor(current => shiftMonth(current, -1))}><ArrowLeft size={16}/></button>
            <h3>{formatMonthLabel(athleteCalendarCursor)}</h3>
            <button type="button" className="ghost iconBtn" aria-label="Próximo mês" onClick={()=>setAthleteCalendarCursor(current => shiftMonth(current, 1))}><ArrowRight size={16}/></button>
          </div>
          <div className="calendarWeekdays">
            {["D","S","T","Q","Q","S","S"].map((label,idx)=><span key={`${label}-${idx}`}>{label}</span>)}
          </div>
          <div className="calendarGrid athleteCalendarGrid">{athleteCalendarDays.map(day => day.empty
            ? <div key={day.id} className="day dayBlank" aria-hidden="true"></div>
            : <button
                type="button"
                key={day.id}
                className={`day ${day.trained ? "trained" : ""} ${day.isToday ? "today" : ""}`}
                onClick={()=>day.session && openHistorySession(day.session)}
                disabled={!day.session}
              >
                {day.day}
              </button>)}
          </div>
        </section>
      </section>

      </>}
    </main>}

    {renderScreen==="treino" && <main className={activeSession ? "focusWorkout" : ""}>
      {workoutKeys.length===0 && !activeSession && <section className="emptyState">
        <b>{appMode === "treinador" ? "Você ainda não criou treinos." : "Nenhum treino disponível."}</b>
        <span>{appMode === "treinador" ? `Crie um treino em Treinos e atribua para ${currentUserSelfLabel} antes de executar.` : "Peça um treino ao seu treinador ou aguarde uma atribuição ativa."}</span>
        {appMode === "treinador" && <button type="button" onClick={()=>setScreen("criar")}><PlusCircle size={18}/> Criar primeiro treino</button>}
      </section>}
      {(activeSession || workoutKeys.length>0) && <>
      <section className="activeWorkoutHero">
        <div className="workoutExecutionTitle">
          <h2>{displayWorkoutLabel}</h2>
          <span>{doneCount}/{displayItems.length}</span>
        </div>
      </section>
      <div className="progressPill"><i style={{width:`${pct}%`}} /></div>
      {activeSession && sessionView === "list" && (currentWorkoutMeta.notes || currentWorkoutMeta.description) && <section className={`sessionWorkoutNote ${showFullWorkoutNote ? "expanded" : ""}`}>
        <p>{currentWorkoutMeta.notes || currentWorkoutMeta.description}</p>
        <button type="button" className="ghost small" onClick={()=>setShowFullWorkoutNote(current=>!current)}>{showFullWorkoutNote ? "Ver menos" : "Ver mais"}</button>
      </section>}
      {!activeSession && <WorkoutSwitcher keysList={workoutKeys} labels={workoutLabels} workout={workout} setWorkout={setWorkout} disabled={!!activeSession}/>}
      {!activeSession && canStartCurrentWorkout() && <button className="startWorkoutShortcut" type="button" onClick={startActiveWorkout}><Play size={17}/> Começar treino</button>}
      {!activeSession && appMode === "treinador" && currentWorkoutMeta?.type !== "template" && canStartWorkoutItem(currentWorkoutMeta, "atleta") && <button className="startWorkoutShortcut" type="button" onClick={()=>changeMode("atleta")}><Play size={17}/> Ir para modo atleta para executar</button>}
      {activeSession && <section className="sessionControl activeSessionControl">
        <div className="sessionTimerGrid">
          <span>Sessão <b>{formatDuration(sessionElapsedSeconds)}</b></span>
          <span>Descanso <button type="button" onClick={editTimerSetpoint} title="Alterar descanso">{activeRestDisplay}</button></span>
          <div className="timerActions" aria-label="Controles do descanso">
            <button className="ghost iconBtn" type="button" onClick={toggleTimer} title={timer.running ? "Pausar descanso" : "Iniciar descanso"}>{timer.running?<Pause size={16}/>:<Play size={16}/>}</button>
            <button className="ghost iconBtn" type="button" onClick={resetTimer} title="Reiniciar descanso"><TimerReset size={16}/></button>
          </div>
        </div>
      </section>}

      {activeSession
        ? (sessionView === "list" ? renderSessionOverview() : renderActiveExercise())
        : renderPlannedExerciseGroups()}
      </>}
    </main>}

    {renderScreen==="historico" && <main>
      {openSession?.items ? <>
        {renderOpenSessionDetail(openSession)}
      </> : <>
      <div className="pageTitleRow"><h2 className="pageTitle">Evolução</h2></div>
      <div className="segmentedControl evolutionPeriodControl">{[["30","30 dias"],["90","3 meses"],["180","6 meses"],["all","Tudo"]].map(([value,label])=><button type="button" key={value} className={evolutionPeriod===value?"active":"ghost"} onClick={()=>setEvolutionPeriod(value)}>{label}</button>)}</div>
      <section className="evolutionSection"><h3>Resumo</h3><div className="evolutionSummary"><Card title="Treinos" value={`${evolutionSessions.length}`} sub="no período" /><Card title="Frequência" value={evolutionSessions.length ? `${(evolutionSessions.length / Math.max(1, evolutionPeriod === "all" ? 4 : Number(evolutionPeriod)/7)).toFixed(1)}x` : "—"} sub="por semana" /><Card title="Volume" value={evolutionVolume ? `${Math.round(evolutionVolume).toLocaleString("pt-BR")} kg` : "—"} sub="no período" /></div></section>
      <section className="chartCard">
        <div className="sectionHeaderRow">
          <div>
            <h3>Corpo</h3>
          </div>
          <button type="button" className="ghost small" onClick={()=>navigateScreen("dados")}>Registrar</button>
        </div>
        <div className="segmentedControl evolutionMetricControl">{[["peso","Peso"],["bf","BF"],["cintura","Cintura"]].filter(([key])=>evolutionBody.some(record=>numericValue(key === "bf" ? bodyFatValue(record) : record[key]))).map(([key,label])=><button type="button" key={key} className={evolutionMetric===key?"active":"ghost"} onClick={()=>setEvolutionMetric(key)}>{label}</button>)}</div>
        {evolutionBodyData.length>0 ? <><p className="evolutionMetricValue">{evolutionBodySummary?.current}{evolutionBodySummary?.unit}{evolutionBodySummary?.change !== null && <small> {evolutionBodySummary.change >= 0 ? "+" : ""}{evolutionBodySummary.change.toFixed(1)}{evolutionBodySummary.unit}</small>}</p><ResponsiveContainer width="100%" height={190}>
          <LineChart data={evolutionBodyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="date" stroke="var(--color-text-muted)" />
            <YAxis stroke="var(--color-text-muted)" />
            <Tooltip
              contentStyle={bodyChartTooltip.contentStyle}
              labelStyle={bodyChartTooltip.labelStyle}
              itemStyle={bodyChartTooltip.itemStyle}
            />
            <Line type="monotone" dataKey={evolutionMetric} stroke="var(--color-primary)" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer></> : <p className="emptyHint">Sem medidas no período.</p>}
      </section>
      <section className="chartCard evolutionSection"><h3>Desempenho</h3>{evolutionVolumeTrend.length ? <ResponsiveContainer width="100%" height={170}><BarChart data={evolutionVolumeTrend}><CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" /><XAxis dataKey="semana" stroke="var(--color-text-muted)" /><YAxis stroke="var(--color-text-muted)" /><Tooltip contentStyle={bodyChartTooltip.contentStyle} /><Bar dataKey="volume" fill="var(--color-primary)" radius={[6,6,0,0]} /></BarChart></ResponsiveContainer> : <p className="emptyHint">Sem desempenho no período.</p>}{exerciseRecords.slice(0,3).map(record=><div className="recordLine" key={record.exercise}><b>{record.exercise}</b><span>{record.load} kg</span></div>)}</section>
      <section className="evolutionSection"><div className="sectionHeaderRow"><h3>Histórico</h3><select value={historyFilter} onChange={event=>setHistoryFilter(event.target.value)}><option value="todos">Todos os treinos</option>{workoutKeys.map(k=><option key={k} value={k}>{workoutLabels[k]}</option>)}</select></div>
      {filteredHistorySessions.length===0 && <section className="emptyState">
        <b>Nenhum treino no período.</b>
      </section>}
      <div className="list">
        {filteredHistorySessions.map((s)=>
          <button type="button" className="sessionCard tappable evolutionHistoryCard" key={s.id} onClick={()=>setOpenSession(s)}>
            <div>
              <strong>{s.workoutName || s.workoutLabel || s.workout}</strong>
              <small>{s.date} · {s.duration || "—"}</small>
              <p className="historySummaryLine">
                {s.completedExercises ?? 0}/{s.totalExercises ?? (s.items || []).length} exercícios · {s.volume ? `${Math.round(s.volume).toLocaleString("pt-BR")} kg` : "—"}
              </p>
            </div>
          </button>
        )}
      </div>
      </section>
      </>}
    </main>}

    {renderScreen==="alunos" && appMode === "treinador" && <main className="studentsScreen">
      {selectedStudentProfile ? <>
        {openSession?.items ? renderOpenSessionDetail(openSession) : selectedBodyRecord ? <section className="studentProfile internalDetail compactStudentProfile">
          <section className="studentSection compactStudentSection">
            <h3>Registro corporal</h3>
            {bodyRecordDetailLines(selectedBodyRecord.record).map(([label,value])=><div className="recordLine" key={label}><b>{label}</b><span>{value}</span></div>)}
            {canManageBodyRecord(selectedBodyRecord.record) && <button type="button" className="danger" disabled={isActionPending(`delete-body:${selectedBodyRecord.record?.id || selectedBodyRecord.index}`)} aria-busy={isActionPending(`delete-body:${selectedBodyRecord.record?.id || selectedBodyRecord.index}`)} onClick={async ()=>{
              if(await deleteBodyRecord(selectedBodyRecord.record, selectedBodyRecord.index)) closeSelectedBodyRecord();
            }}>{isActionPending(`delete-body:${selectedBodyRecord.record?.id || selectedBodyRecord.index}`) ? "Excluindo…" : "Excluir registro"}</button>}
          </section>
        </section> : showStudentBodyForm || studentDetailView === "bodyForm" ? <section className="studentProfile internalDetail compactStudentProfile">
          <section className="studentSection compactStudentSection">
            <h3>Dados corporais</h3>
            <form id="student-body-form" className="accountForm bodyRecordForm" onSubmit={event=>addStudentBody(event, selectedStudentProfile)} onInputCapture={()=>markDirty("student-body")} onChangeCapture={()=>markDirty("student-body")} aria-busy={isActionPending(`save-student-body:${selectedStudentProfile.studentId}`)}>
              <input type="hidden" name="bodyFatOverrideMode" value="methodOnly" />
              <BodyRecordFields profileBodyEditor />
              <button disabled={isActionPending(`save-student-body:${selectedStudentProfile.studentId}`)}>
                {isActionPending(`save-student-body:${selectedStudentProfile.studentId}`) ? <LoaderCircle className="buttonSpinner" aria-hidden="true"/> : <Save size={18}/>}
                {isActionPending(`save-student-body:${selectedStudentProfile.studentId}`) ? "Salvando…" : "Salvar registro corporal"}
              </button>
            </form>
            {studentMessage && <p className="feedbackMessage">{studentMessage}</p>}
          </section>
        </section> : studentDetailView === "bodyHistory" ? <section className="studentProfile internalDetail compactStudentProfile">
          <section className="studentSection compactStudentSection">
            <h3>Histórico corporal</h3>
            {(selectedStudentProfile.body || []).length===0 && <p className="emptyHint">Nenhum registro corporal deste aluno.</p>}
            {(selectedStudentProfile.body || []).map((record,idx)=><button type="button" className="recordLine clickableRecord" key={record.id || `${record.date}-${idx}`} onClick={()=>setSelectedBodyRecord({record,index:idx, scope:"student"})}>
              <b>{record.date}</b>
              <span>{record.peso || "—"} kg · altura {record.height || "—"} cm · BF {bodyFatValue(record) || "—"}%</span>
            </button>)}
          </section>
        </section> : studentDetailView === "workoutAssign" ? <section className="studentProfile internalDetail compactStudentProfile">
          <section className="studentSection compactStudentSection">
            <h3>Atribuir treino</h3>
            {customWorkouts.filter(w=>w.isActive !== false && isTrainerWorkoutTemplate(w)).length===0 && <p className="emptyHint">Nenhum modelo disponível para atribuir.</p>}
            {customWorkouts.filter(w=>w.isActive !== false && isTrainerWorkoutTemplate(w)).map((w,idx)=><div className="recordLine" key={w.id || idx}>
              <b>{w.name || `Treino ${idx + 1}`}</b>
              <button type="button" className="ghost small" disabled={isActionPending(`assign-workout:${w.id}:${selectedStudentProfile.studentId}`)} aria-busy={isActionPending(`assign-workout:${w.id}:${selectedStudentProfile.studentId}`)} onClick={()=>assignWorkoutToStudent(w, selectedStudentProfile)}>
                {isActionPending(`assign-workout:${w.id}:${selectedStudentProfile.studentId}`) && <LoaderCircle className="buttonSpinner" aria-hidden="true"/>}
                {isActionPending(`assign-workout:${w.id}:${selectedStudentProfile.studentId}`) ? "Atribuindo…" : "Atribuir"}
              </button>
            </div>)}
          </section>
        </section> : studentDetailView === "workoutHistory" ? <section className="studentProfile internalDetail compactStudentProfile">
          <section className="studentSection compactStudentSection">
            <h3>Histórico de treinos</h3>
            {(selectedStudentProfile.sessions || []).length===0 && <p className="emptyHint">Sem registros.</p>}
            {(selectedStudentProfile.sessions || []).map(s=><button type="button" className="recordLine clickableRecord" key={s.id} onClick={()=>setOpenSession(s)}>
              <b>{s.workoutName || s.workoutLabel || "Treino"}</b>
              <span>{s.date || "—"}</span>
            </button>)}
          </section>
        </section> : <section className="studentProfile internalDetail compactStudentProfile">
          <div className="studentDetailHeader">
            <div>
              <h2>{selectedStudentProfile.studentName || "Aluno"}</h2>
              {(selectedStudentProfile.objective || selectedStudentProfile.notes) && <p className="studentAdminSummary">
                {selectedStudentProfile.objective || "Objetivo não informado"}{selectedStudentProfile.notes ? ` · ${selectedStudentProfile.notes}` : ""}
              </p>}
            </div>
            <ActionMenu id={`student-admin-${selectedStudentProfile.id || selectedStudentProfile.studentEmail}`} label="Ações administrativas" className="adminStudentMenu">
                {selectedStudentProfile.isSelf ? <button type="button" disabled>Perfil próprio</button> : <>
                  <button type="button" onClick={()=>openStudentAdminEditor(selectedStudentProfile)}>Editar aluno</button>
                  <button type="button" className="danger" onClick={()=>setEndingStudentLink(selectedStudentProfile)}>Encerrar vínculo</button>
                </>}
            </ActionMenu>
          </div>
          <section className="studentSection compactStudentSection">
            <h3>Dados</h3>
            {(()=>{
              const latest = (selectedStudentProfile.body || [])[0] || {};
              return <div className="studentMetricGrid">
                <div><b>Idade</b><span>{latest.age || "—"}</span></div>
                <div><b>Peso</b><span>{latest.peso ? `${latest.peso} kg` : "—"}</span></div>
                <div><b>Altura</b><span>{latest.height ? `${latest.height} cm` : "—"}</span></div>
                <div><b>BF</b><span>{bodyFatValue(latest) ? `${bodyFatValue(latest)}%` : "—"}</span></div>
              </div>;
            })()}
            <div className="dualActions">
              <button type="button" className="ghost small" onClick={()=>openStudentBodyEditor(selectedStudentProfile)}><Scale size={18}/> Registrar dados corporais</button>
              <button type="button" className="ghost small" onClick={()=>setStudentDetailView("bodyHistory")}><ClipboardList size={18}/> Histórico corporal</button>
            </div>
          </section>

          <section className="studentSection compactStudentSection studentInsightsEntry">
            <h3>Insights</h3>
            {trainerInsightAllowed ? <>
              <p className="emptyHint">Métricas isoladas de {selectedStudentProfile.studentName || selectedStudentProfile.studentEmail || "este aluno"}.</p>
              <div className="dualActions">
                <button type="button" className="ghost small" onClick={()=>navigateStudentInsight("evolucao")}><History size={18}/> Evolução</button>
                <button type="button" className="ghost small" onClick={()=>navigateStudentInsight("analises")}><BarChart3 size={18}/> Análises</button>
              </div>
            </> : <p className="emptyHint">Os insights ficam disponíveis depois que o aluno aceita o convite.</p>}
          </section>

          <section className="studentSection compactStudentSection">
            <h3>Treinos</h3>
            {(selectedStudentProfile.workouts || []).length===0 && <p className="emptyHint">Nenhum treino atribuído.</p>}
            {(selectedStudentProfile.workouts || []).map(w=>{
              const workoutKey = w.id || "";
              return <div className="recordLine compactWorkoutRow" key={w.id || w.name}>
                <b>{w.name}</b>
                <span>{w.frequency || w.weeklyFrequency || "—"}</span>
                <ActionMenu id={`student-workout-${w.id || w.name}`} label="Ações do treino">
                    <button type="button" disabled={!workoutKey} onClick={()=>workoutKey && startEditWorkout(workoutKey)}>Editar</button>
                    <button type="button" disabled={!workoutKey} onClick={()=>workoutKey && duplicateWorkout(workoutKey)}>Duplicar</button>
                    <button type="button" className="danger" disabled={!workoutKey || isActionPending(`delete-workout:${workoutKey}`)} aria-busy={isActionPending(`delete-workout:${workoutKey}`)} onClick={()=>workoutKey && deleteWorkoutSafely(workoutKey)}>{isActionPending(`delete-workout:${workoutKey}`) ? "Excluindo…" : "Excluir"}</button>
                </ActionMenu>
              </div>;
            })}
            <div className="dualActions">
              <button type="button" onClick={()=>setStudentDetailView("workoutAssign")}><UserPlus size={18}/> Atribuir treino</button>
              <button type="button" className="ghost" onClick={()=>setStudentDetailView("workoutHistory")}><ClipboardList size={18}/> Histórico de treinos</button>
            </div>
          </section>

        </section>}
      </> : showInviteForm ? <>
        <section className="formCard">
          <button type="button" onClick={generateInviteFromButton} disabled={isActionPending("create-invite")} aria-busy={isActionPending("create-invite")}>
            {isActionPending("create-invite") ? <LoaderCircle className="buttonSpinner" aria-hidden="true"/> : <UserPlus size={18}/>}
            {isActionPending("create-invite") ? "Gerando…" : "Gerar convite"}
          </button>
          {generatedInvite && <div className="inviteResult">
            <div className="recordLine"><b>Convite</b><span>{generatedInvite.id}</span></div>
            <div className="accountActions">
              <button type="button" className="ghost" onClick={()=>copyInvite(generatedInvite)}>Copiar</button>
              <button type="button" className="ghost" onClick={()=>shareInvite(generatedInvite)}>Compartilhar</button>
            </div>
          </div>}
          {studentMessage && <p className="feedbackMessage">{studentMessage}</p>}
        </section>
      </> : <>
        <div className="pageTitleRow">
          <h2 className="pageTitle">Alunos</h2>
          <button type="button" onClick={()=>{setGeneratedInvite(null); setStudentMessage(""); setShowInviteForm(true);}}><UserPlus size={18}/> Novo Aluno</button>
        </div>

        <section className="formCard">
          <input value={studentSearch} onChange={e=>setStudentSearch(e.target.value)} placeholder="Pesquisar por nome ou e-mail" />
        </section>

        <section className="studentSortRow">
          <label>
            <span>Ordenar</span>
            <select value={studentSort} onChange={event=>setStudentSort(event.currentTarget.value)}>
              <option value="name">Nome</option>
              <option value="last">Último acesso</option>
              <option value="recent">Mais recente</option>
              <option value="oldest">Mais antigo</option>
            </select>
          </label>
        </section>

        {displayedTrainerStudentRows.length===0 && <section className="emptyState slim">
          <b>Nenhum aluno encontrado.</b>
        </section>}

        <section className="studentGrid">
          {displayedTrainerStudentRows.map(row=>{
            const openStudent = ()=>{
              setShowStudentBodyForm(false);
              setStudentDetailView("");
              setSelectedBodyRecord(null);
              setSelectedStudentId(row.id);
            };
            return <section key={row.id} className="studentCard compactStudentCard" role="button" tabIndex={0} onClick={openStudent} onKeyDown={event=>{
              if(event.key === "Enter" || event.key === " ") openStudent();
            }}>
              <div className="studentCardTop">
                <b>{row.studentName || "Aluno"}</b>
                <span>{row.workouts.length} treinos</span>
              </div>
              <small>Último acesso: {row.lastSession?.date || row.updatedAt || row.createdAt || "—"}</small>
              <button type="button" className="ghost small" onClick={event=>{event.stopPropagation(); openStudent();}}>Abrir</button>
            </section>
          })}
        </section>
      </>}
    </main>}

    {renderScreen==="criar" && <main className={appMode === "treinador" ? "workoutsScreen" : "athleteWorkoutsScreen"}>
      {selectedWorkoutDetail && !showWorkoutEditor && !assignmentWorkoutId ? <>
        {selectedWorkoutExerciseIndex !== null ? <section className="workoutDetailScreen internalDetail">
          {(()=>{
            const prescribedItem = selectedWorkoutDetail.items[selectedWorkoutExerciseIndex] || {};
            const item = appMode === "atleta" ? enrichWorkoutExercise(prescribedItem) : prescribedItem;
            const method = item.type || "";
            const equipment = Array.isArray(item.equipmentList) && item.equipmentList.length ? item.equipmentList.join(" · ") : item.equipment || "";
            const secondaryGroups = Array.isArray(item.secondaryGroups) ? item.secondaryGroups.filter(Boolean).join(" · ") : "";
            return <>
              <div className="workoutDetailHeader">
                <h2 className="pageTitle">{item.name || "Exercício"}</h2>
              </div>
              <section className="workoutInfoCard">
                <div className="workoutInfoGrid">
                  {(appMode === "treinador" || item.category) && <div><b>Categoria</b><span>{item.category || "—"}</span></div>}
                  {(appMode === "treinador" || item.group || item.primaryGroup) && <div><b>Grupo</b><span>{item.group || item.primaryGroup || "—"}</span></div>}
                  {(appMode === "treinador" || equipment) && <div><b>Equipamento</b><span>{equipment || "—"}</span></div>}
                </div>
                <div className="workoutInfoGrid">
                  {(appMode === "treinador" || item.sets) && <div><b>Séries</b><span>{item.sets || "—"}</span></div>}
                  {(appMode === "treinador" || exerciseRepSummary(item) || item.reps) && <div><b>Repetições</b><span>{exerciseRepSummary(item) || item.reps || "—"}</span></div>}
                  {(appMode === "treinador" || item.load) && <div><b>Carga</b><span>{item.load || "—"}</span></div>}
                  {(appMode === "treinador" || method) && <div><b>Método</b><span>{method || "—"}</span></div>}
                  {(appMode === "treinador" || item.rest) && <div><b>Descanso</b><span>{item.rest || "—"}</span></div>}
                  {(appMode === "treinador" || secondaryGroups) && <div><b>Grupos secundários</b><span>{secondaryGroups || "—"}</span></div>}
                </div>
                {(item.notes || item.technicalNotes || item.instructions) && <p className="emptyHint">{item.notes || item.technicalNotes || item.instructions}</p>}
              </section>
            </>;
          })()}
        </section> : <section className="workoutDetailScreen internalDetail">
          <div className="workoutDetailHeader">
            <div>
              <h2 className="pageTitle">{selectedWorkoutDetail.label}</h2>
              {appMode !== "treinador" && selectedWorkoutDetail.coachName && <small className="workoutCoachLine">Por {selectedWorkoutDetail.coachName}</small>}
            </div>
            {appMode === "treinador" && <ActionMenu id={`workout-detail-${selectedWorkoutDetail.key}`} label="Ações do treino">
                <button type="button" onClick={()=>startEditWorkout(selectedWorkoutDetail.key)}>Editar treino</button>
                <button type="button" onClick={()=>duplicateWorkout(selectedWorkoutDetail.key)}>Duplicar treino</button>
                {selectedWorkoutDetail.meta.isActive !== false && <button type="button" onClick={()=>openAssignment(selectedWorkoutDetail.meta)}>Atribuir</button>}
                {selectedWorkoutDetail.meta.isActive === false
                  ? <button type="button" onClick={()=>reactivateWorkout(selectedWorkoutDetail.key)}>Restaurar</button>
                  : <button type="button" onClick={()=>archiveWorkout(selectedWorkoutDetail.key)}>Arquivar</button>}
                <button type="button" className="danger" disabled={isActionPending(`delete-workout:${selectedWorkoutDetail.meta.id || selectedWorkoutDetail.key}`)} aria-busy={isActionPending(`delete-workout:${selectedWorkoutDetail.meta.id || selectedWorkoutDetail.key}`)} onClick={()=>deleteWorkoutSafely(selectedWorkoutDetail.key)}>{isActionPending(`delete-workout:${selectedWorkoutDetail.meta.id || selectedWorkoutDetail.key}`) ? "Excluindo…" : "Excluir"}</button>
            </ActionMenu>}
          </div>

          <section className="workoutInfoCard">
            {(()=>{
              const objective = selectedWorkoutDetail.meta.objective || selectedWorkoutDetail.items.find(item=>item.objective)?.objective || "";
              const frequency = selectedWorkoutDetail.meta.frequency || selectedWorkoutDetail.meta.weeklyFrequency || "";
              return <div className="workoutInfoGrid">
                {(appMode === "treinador" || objective) && <div><b>Objetivo</b><span>{objective || "—"}</span></div>}
                {(appMode === "treinador" || frequency) && <div><b>Frequência</b><span>{frequency || "—"}</span></div>}
                <div><b>Exercícios</b><span>{selectedWorkoutDetail.items.length}</span></div>
              </div>;
            })()}
          </section>

          {appMode !== "treinador" && (selectedWorkoutDetail.meta.notes || selectedWorkoutDetail.meta.description) && <section className="workoutNotesCard"><b>Observação</b><p>{selectedWorkoutDetail.meta.notes || selectedWorkoutDetail.meta.description}</p></section>}

          {appMode !== "treinador" && <button type="button" className="workoutDetailPrimaryAction" onClick={()=>startWorkoutFromDetails(selectedWorkoutDetail.key)}>
            <Play size={18}/> {activeSession?.workout === selectedWorkoutDetail.key ? "Continuar treino" : "Iniciar treino"}
          </button>}

          <section className="workoutExercisesSection">
            <div className="sectionHeaderRow">
              <h3>Exercícios</h3>
            </div>
            {selectedWorkoutDetail.items.length===0 && <p className="emptyHint">Nenhum exercício cadastrado neste treino.</p>}
            <div className="workoutExerciseList">
              {selectedWorkoutDetail.items.map((item,idx)=>{
                const enrichedItem = appMode === "atleta" ? enrichWorkoutExercise(item) : item;
                const method = getExerciseType(enrichedItem);
                const categoryGroup = [enrichedItem.category, enrichedItem.group || enrichedItem.primaryGroup].filter((value,index,values)=>value && values.indexOf(value) === index).join(" · ");
                const equipment = Array.isArray(enrichedItem.equipmentList) && enrichedItem.equipmentList.length ? enrichedItem.equipmentList.join(" · ") : enrichedItem.equipment || "";
                const openExercise = ()=>setSelectedWorkoutExerciseIndex(idx);
                const isConjugate = !!item.conjugateBlockId || getExerciseType(item) === "CONJ";
                const isBlockStart = isConjugate && (idx === 0 || selectedWorkoutDetail.items[idx - 1]?.conjugateBlockId !== item.conjugateBlockId);
                const blockItems = isConjugate ? selectedWorkoutDetail.items.filter(candidate=>candidate.conjugateBlockId && candidate.conjugateBlockId === item.conjugateBlockId) : [];
                const exerciseProps = {role:"button", tabIndex:0, onClick:openExercise, onKeyDown:event=>{
                  if(event.key === "Enter" || event.key === " ") openExercise();
                }};
                return <React.Fragment key={item.workoutExerciseId || item.id || `${item.name}-${idx}`}>
                  {appMode !== "treinador" && isBlockStart && <div className="groupLabel workoutDetailConjugateLabel">Conjugado · {blockItems.length || 2} exercícios{item.sets ? ` · ${item.sets} séries` : ""}</div>}
                  <div className="workoutExerciseCard" {...exerciseProps}>
                  <div>
                    <b>{enrichedItem.name}</b>
                    {appMode !== "treinador" && (categoryGroup || equipment) && <small>{[categoryGroup, equipment].filter(Boolean).join(" · ")}</small>}
                    {appMode === "treinador" ? <span>{item.sets || "—"} × {exerciseRepSummary(item) || item.reps || "—"}</span> : (item.sets || exerciseRepSummary(item) || item.reps) && <span>{[item.sets && `${item.sets} séries`, (exerciseRepSummary(item) || item.reps) && `${exerciseRepSummary(item) || item.reps} repetições`].filter(Boolean).join(" · ")}</span>}
                    {method && method !== "NORMAL" && <small>{method}</small>}
                    {appMode !== "treinador" && item.rest && <small>Descanso: {item.rest}</small>}
                    {appMode !== "treinador" && item.notes && <small className="workoutExerciseNotes">{item.notes}</small>}
                  </div>
                  </div>
                </React.Fragment>;
              })}
            </div>
          </section>
        </section>}
      </> : <>
      {!showWorkoutEditor && <div className="pageTitleRow">
        <div className="pageIntro compactIntro">
          <h2 className="pageTitle">{appMode === "treinador" ? "Treinos" : "Treinos"}</h2>
        </div>
        <div className="titleActions">
          {!assignmentWorkoutId && appMode === "treinador" && <button type="button" onClick={startNewWorkout}><PlusCircle size={18}/> Novo treino</button>}
        </div>
      </div>}
      {showWorkoutEditor && appMode === "treinador" && isEditingExistingWorkout && editingWorkoutExerciseIndex === null && <div className="titleActions workoutEditorTopActions">
        <button type="button" className="ghost" onClick={archiveEditingWorkout}><EyeOff size={18}/> Arquivar treino</button>
        {newWorkout.editingWorkoutKey && <button type="button" className="danger" disabled={isActionPending(`delete-workout:${newWorkout.editingId || newWorkout.editingWorkoutKey}`)} aria-busy={isActionPending(`delete-workout:${newWorkout.editingId || newWorkout.editingWorkoutKey}`)} onClick={()=>deleteWorkoutSafely(newWorkout.editingWorkoutKey)}>{isActionPending(`delete-workout:${newWorkout.editingId || newWorkout.editingWorkoutKey}`) ? <LoaderCircle className="buttonSpinner" aria-hidden="true"/> : <Trash2 size={18}/>} {isActionPending(`delete-workout:${newWorkout.editingId || newWorkout.editingWorkoutKey}`) ? "Excluindo…" : "Excluir treino"}</button>}
      </div>}
      {!showWorkoutEditor && !assignmentWorkoutId && appMode === "treinador" && <section className="formCard compactWorkoutSearch">
        <input value={workoutSearch} onChange={e=>setWorkoutSearch(e.target.value)} placeholder="Pesquisar por nome, objetivo ou exercício" />
      </section>}
      {!showWorkoutEditor && !assignmentWorkoutId && appMode === "treinador" && <section className="studentSortRow">
        <label>
          <span>Ordenar</span>
          <select value={workoutSort} onChange={event=>setWorkoutSort(event.currentTarget.value)}>
            <option value="name">Nome</option>
            <option value="recent">Mais recente</option>
            <option value="oldest">Mais antigo</option>
            <option value="objective">Objetivo</option>
          </select>
        </label>
      </section>}
      {!showWorkoutEditor && !assignmentWorkoutId && appMode === "treinador" && <section className="filterRow archiveFilterRow">
        <button type="button" className={`ghost small ${workoutArchiveView === "active" ? "activeSmall" : ""}`} onClick={()=>setWorkoutArchiveView("active")}>Ativos</button>
        <button type="button" className={`ghost small ${workoutArchiveView === "archived" ? "activeSmall" : ""}`} onClick={()=>setWorkoutArchiveView("archived")}>Arquivados{trainerWorkoutArchiveCounts.archived ? ` (${trainerWorkoutArchiveCounts.archived})` : ""}</button>
      </section>}
      {assignmentWorkoutId && <section className="coachPanel">
        <div><small>{appMode === "treinador" ? "Treinos base" : "Meus treinos"}</small><b>{showWorkoutEditor ? "Monte o treino-base, revise a prévia e salve quando estiver pronto." : appMode === "treinador" ? "Modelos não são alterados por treinos individuais dos alunos." : "Treinos disponíveis para execução."}</b></div>
        <span>{appMode === "treinador" ? `${workoutStats.custom} modelos` : `${workoutStats.active} disponíveis`}</span>
      </section>}

      {!showWorkoutEditor && assignmentWorkoutId && assignmentSourceWorkout && <section className="formCard" id="assign-workout">
        <h3>Atribuir treino</h3>
        <p className="muted">{assignmentSourceWorkout.name} será copiado individualmente para cada destino selecionado.</p>
        {assignmentResult && <div className={`assignmentResult ${assignmentResult.status}`} role={assignmentResult.status === "error" ? "alert" : "status"}>
          <b>{assignmentResult.status === "partial" ? "Atribuição parcialmente concluída" : "Não foi possível concluir a atribuição"}</b>
          {assignmentResult.succeeded > 0 && <span>{assignmentResult.succeeded} destino{assignmentResult.succeeded > 1 ? "s" : ""} concluído{assignmentResult.succeeded > 1 ? "s" : ""}.</span>}
          <span>{assignmentResult.failed.length} destino{assignmentResult.failed.length > 1 ? "s precisam" : " precisa"} de nova tentativa:</span>
          <ul>{assignmentResult.failed.map(entry=><li key={entry.key}><b>{entry.label}</b><small>{entry.error}</small></li>)}</ul>
        </div>}
        <label className="toggleLine">
          <input type="checkbox" checked={!!assignmentSelection.self} disabled={isActionPending("assign-workout") || assignmentRetryEntries.length > 0} onChange={event=>toggleAssignmentSelf(event.target ? event.target.checked : false)} />
          <span>{currentUserSelfLabel}</span>
        </label>
        {activeAssignableStudents.length===0 && <p className="emptyHint">Nenhum aluno ativo disponível para atribuição.</p>}
        {activeAssignableStudents.map(link=><label className="toggleLine" key={link.id}>
          <input type="checkbox" checked={!!assignmentSelection.students?.[link.id]} disabled={isActionPending("assign-workout") || assignmentRetryEntries.length > 0} onChange={event=>toggleAssignmentStudent(link.id, event.target ? event.target.checked : false)} />
          <span>{link.studentName || link.studentEmail}</span>
        </label>)}
        <div className="createActions">
          <button type="button" className="ghost" disabled={isActionPending("assign-workout")} onClick={()=>closeDirtyScope("workout-assignment", closeAssignment)}>Cancelar</button>
          <button type="button" onClick={assignWorkoutCopies} disabled={isActionPending("assign-workout")} aria-busy={isActionPending("assign-workout")}>
            {isActionPending("assign-workout") ? <LoaderCircle className="buttonSpinner" aria-hidden="true"/> : <Save size={18}/>}
            {isActionPending("assign-workout") ? "Atribuindo…" : assignmentRetryEntries.length ? `Tentar ${assignmentRetryEntries.length} novamente` : "Atribuir treino"}
          </button>
        </div>
      </section>}

      {!showWorkoutEditor && !assignmentWorkoutId && appMode !== "treinador" && (athleteWorkoutSchedule.today.size || athleteWorkoutSchedule.next || athleteWorkoutSchedule.suggested) && <section className="athleteWorkoutRecommendations">
        {[...athleteWorkoutSchedule.today].slice(0,1).map(key=><button type="button" key={`today-${key}`} onClick={()=>setSelectedWorkoutDetailKey(key)}><small>Hoje</small><b>{resolveWorkout(key).label}</b></button>)}
        {athleteWorkoutSchedule.next && <button type="button" onClick={()=>setSelectedWorkoutDetailKey(athleteWorkoutSchedule.next)}><small>Próximo</small><b>{resolveWorkout(athleteWorkoutSchedule.next).label}</b></button>}
        {athleteWorkoutSchedule.suggested && <button type="button" onClick={()=>setSelectedWorkoutDetailKey(athleteWorkoutSchedule.suggested)}><small>Sugerido</small><b>{resolveWorkout(athleteWorkoutSchedule.suggested).label}</b></button>}
      </section>}

      {!showWorkoutEditor && !assignmentWorkoutId && <section className="exerciseGroup workoutModelsList">
        {appMode === "treinador" && trainerWorkoutArchiveCounts.active + trainerWorkoutArchiveCounts.archived === 0 && <section className="emptyState slim">
          <b>Você ainda não possui treinos.</b>
          <span>Crie seu primeiro modelo de treino para começar.</span>
          <button type="button" onClick={startNewWorkout}><PlusCircle size={18}/> Criar treino</button>
        </section>}
        {appMode !== "treinador" && workoutKeys.length===0 && <section className="emptyState slim">
          <b>Nenhum treino disponível.</b>
          {appMode === "treinador" && <button type="button" onClick={startNewWorkout}><PlusCircle size={18}/> Criar treino</button>}
        </section>}
        {(appMode !== "treinador" ? workoutKeys.length>0 : trainerWorkoutArchiveCounts.active + trainerWorkoutArchiveCounts.archived > 0) && displayedWorkoutKeys.length===0 && <p className="emptyHint">{workoutArchiveView === "archived" ? "Nenhum treino arquivado encontrado." : "Nenhum treino encontrado."}</p>}
        {displayedWorkoutKeys.map(k=>{
          const resolved = resolveWorkout(k);
          const meta = resolved.metadata;
          const workoutItems = resolved.items;
          const objective = meta.objective || workoutItems.find(item=>item.objective)?.objective || "";
          const frequency = meta.frequency || meta.weeklyFrequency || "";
          const openWorkout = ()=>setSelectedWorkoutDetailKey(resolved.key);
          const coachName = appMode !== "treinador" ? resolveWorkoutCoachName(meta) : "";
          const lastExecution = appMode !== "treinador" ? personalSessions
            .filter(session=>String(session.workoutId || "") === String(meta.id || "") || session.workoutKey === k || session.workout === k)
            .sort((a,b)=>parseSessionDate(b.date).getTime() - parseSessionDate(a.date).getTime())[0] : null;
          const isTodayWorkout = appMode !== "treinador" && athleteWorkoutSchedule.today.has(k);
          const isNextWorkout = appMode !== "treinador" && !isTodayWorkout && k === athleteWorkoutSchedule.next;
          const isSuggestedWorkout = appMode !== "treinador" && !isTodayWorkout && !isNextWorkout && k === athleteWorkoutSchedule.suggested;
          const isActionMenuOpen = openActionMenuId === `workout-list-${k}`;
          return <div className={`sessionCard workoutListCard tappable ${isTodayWorkout ? "isTodayWorkout" : ""} ${isNextWorkout ? "isNextWorkout" : ""} ${isActionMenuOpen ? "actionMenuOpen" : ""}`} key={k} role="button" tabIndex={0} onClick={()=>{setSelectedWorkoutExerciseIndex(null); openWorkout();}} onKeyDown={event=>{
            if(event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedWorkoutExerciseIndex(null); openWorkout(); }
          }}>
          <div className="workoutCardContent">
            <div className="workoutCardTitle"><strong>{resolved.label}</strong>{isTodayWorkout && <span>Hoje</span>}{isNextWorkout && <span>Próximo</span>}{isSuggestedWorkout && <span>Sugerido</span>}</div>
            <div className="workoutCardMeta">
              {frequency && <small>{frequency}</small>}
              <small>{workoutItems.length} exercícios</small>
              {coachName && <small>Por {coachName}</small>}
              {lastExecution && <small>Última execução: {formatRelativeOrShortDate(parseSessionDate(lastExecution.date))}</small>}
              {appMode === "treinador" && objective && <small>{objective}</small>}
            </div>
          </div>
          <div className="managerActions">
            {appMode !== "treinador" && <button type="button" className="ghost small" onClick={(event)=>{event.stopPropagation(); openWorkout();}}>Ver treino</button>}
            {appMode === "treinador" && <button type="button" onClick={(event)=>{event.stopPropagation(); openWorkout();}}>Abrir</button>}
            {appMode === "treinador" && <ActionMenu id={`workout-list-${k}`} label="Ações do treino">
                {workoutArchiveView === "archived" ? <>
                  <button type="button" onClick={()=>reactivateWorkout(k)}>Restaurar</button>
                  <button type="button" className="danger" disabled={isActionPending(`delete-workout:${k}`)} aria-busy={isActionPending(`delete-workout:${k}`)} onClick={()=>deleteWorkoutSafely(k, {permanent:true})}>{isActionPending(`delete-workout:${k}`) ? "Excluindo…" : "Excluir definitivamente"}</button>
                </> : <>
                  <button type="button" onClick={()=>startEditWorkout(k)}>Editar</button>
                  <button type="button" onClick={()=>duplicateWorkout(k)}>Duplicar</button>
                  <button type="button" onClick={()=>archiveWorkout(k)}>Arquivar</button>
                  <button type="button" className="danger" disabled={isActionPending(`delete-workout:${k}`)} aria-busy={isActionPending(`delete-workout:${k}`)} onClick={()=>deleteWorkoutSafely(k)}>{isActionPending(`delete-workout:${k}`) ? "Excluindo…" : "Excluir"}</button>
                </>}
            </ActionMenu>}
          </div>
        </div>})}
      </section>}

      {showWorkoutEditor && appMode === "treinador" && (showWorkoutLibrary ? <>
        <section className="formCard exerciseSelectorScreen">
          <div className="exerciseSelectorToolbar">
            <div className="exerciseSelectorSearch">
              <input autoFocus value={workoutLibrarySearch} onChange={e=>setWorkoutLibrarySearch(e.target.value)} placeholder="Buscar exercício" />
              {workoutLibrarySearch && <button type="button" className="ghost iconBtn" aria-label="Limpar busca" onClick={()=>setWorkoutLibrarySearch("")}><X size={16}/></button>}
            </div>
            <button type="button" className={`ghost exerciseFilterToggle ${workoutLibraryFiltersOpen ? "active" : ""}`} onClick={()=>setWorkoutLibraryFiltersOpen(open=>!open)}>
              <Settings2 size={17}/> Filtros{workoutLibraryActiveFilterCount ? ` (${workoutLibraryActiveFilterCount})` : ""}
            </button>
          </div>
          {workoutLibraryFiltersOpen && <section className="exerciseSelectorFilters">
            <div className="exerciseFilterGrid compactFilters">
              <label>
                <span>Categoria</span>
                <select value={workoutLibraryCategory} onChange={e=>setWorkoutLibraryCategory(e.currentTarget.value)}>
                  {libraryGroups.map(option=><option key={option} value={option}>{option === "Todos" ? "Todas" : option}</option>)}
                </select>
              </label>
              <label>
                <span>Grupo principal</span>
                <select value={workoutLibraryPrimaryGroup} onChange={e=>setWorkoutLibraryPrimaryGroup(e.currentTarget.value)}>
                  {libraryPrimaryGroups.map(option=><option key={option} value={option}>{option === "Todos" ? "Todos" : option}</option>)}
                </select>
              </label>
              <label>
                <span>Equipamento</span>
                <select value={workoutLibraryEquipment} onChange={e=>setWorkoutLibraryEquipment(e.currentTarget.value)}>
                  {libraryEquipments.map(option=><option key={option} value={option}>{option === "Todos" ? "Todos" : option}</option>)}
                </select>
              </label>
              <label>
                <span>Tipo/tag</span>
                <select value={workoutLibraryTag} onChange={e=>setWorkoutLibraryTag(e.currentTarget.value)}>
                  {libraryTags.map(option=><option key={option} value={option}>{option === "Todos" ? "Todos" : option}</option>)}
                </select>
              </label>
            </div>
            {workoutLibraryActiveFilterCount > 0 && <button type="button" className="ghost small" onClick={clearWorkoutExerciseFilters}>Limpar filtros</button>}
          </section>}
          <div className="exerciseSelectorResultsBar">
            <span>{filteredLibrary.length} resultado{filteredLibrary.length === 1 ? "" : "s"}</span>
            <small>Toque no exercício para adicionar</small>
          </div>
          <div className="libraryList workoutLibraryPicker">
            {filteredLibrary.length===0 && <p className="emptyHint">Nenhum exercício encontrado.</p>}
            {filteredLibrary.map(ex=><button type="button" className="libraryItem pickerItem" key={ex.id || libraryKey(ex)} onClick={()=>applyLibraryExercise(ex)}>
              <div>
                <b>{ex.name}</b>
                <span>{[ex.primaryGroup || ex.group || ex.category || "Outro", normalizeList(ex.equipmentList || ex.equipment)[0]].filter(Boolean).join(" · ")}</span>
              </div>
              <PlusCircle size={19}/>
            </button>)}
          </div>
        </section>
      </> : editingWorkoutExerciseIndex !== null ? <>
        {(()=>{
          const exercise = newWorkout.items[editingWorkoutExerciseIndex] || {};
          const method = normalizedExecutionMethod(getExerciseType(exercise));
          const previousExercise = newWorkout.items[editingWorkoutExerciseIndex - 1];
          return <section className="formCard workoutExerciseEditScreen">
            <div className="exerciseEditorIdentity">
              <small>Exercício {editingWorkoutExerciseIndex + 1}</small>
              <h3>{exercise.name || "Exercício"}</h3>
              {exercise.group && <span>{exercise.group}</span>}
            </div>

            <section className="exercisePrescriptionSection">
              <h4>Prescrição</h4>
              <div className="exercisePrescriptionGrid">
                <label><span>Séries</span><input inputMode="numeric" value={exercise.sets || ""} onChange={e=>updatePreviewItem(editingWorkoutExerciseIndex,{sets:e.target.value})} placeholder="3" /></label>
                <label><span>Carga sugerida</span><input inputMode="decimal" value={exercise.load || ""} onChange={e=>updatePreviewItem(editingWorkoutExerciseIndex,{load:e.target.value})} placeholder="Opcional" /></label>
                <label><span>Descanso</span><input value={exercise.rest || ""} onChange={e=>updatePreviewItem(editingWorkoutExerciseIndex,{rest:e.target.value})} placeholder="00:50" /></label>
              </div>
            </section>

            <section className="exerciseMethodSection">
              <div className="exerciseEditorSectionTitle"><div><h4>Método</h4><small>Escolha como o exercício será executado.</small></div></div>
              <div className="exerciseMethodGrid">
                {EXECUTION_METHODS.map(option=><button type="button" key={option.value} className={method === option.value ? "active" : ""} onClick={()=>selectPreviewMethod(editingWorkoutExerciseIndex, option.value)}>
                  <b>{option.label}</b><span>{option.description}</span>
                </button>)}
              </div>
              {methodRepHint(exercise) && <p className="repHint methodHint">{methodRepHint(exercise)}</p>}
              {method === "NORMAL" && <label className="standardRepsField"><span>Repetições</span><input value={exercise.reps || ""} onChange={e=>updatePreviewItem(editingWorkoutExerciseIndex,{reps:e.target.value})} placeholder="Ex.: 10 ou 8-12" /></label>}
              {method === "PROG" && <RepTargetsEditor
                exercise={{...exercise, useRepTargetsBySet:true}}
                forced
                onToggle={()=>{}}
                onChange={(setIdx,value)=>updatePreviewRepTarget(editingWorkoutExerciseIndex,setIdx,value)}
                onLoadChange={(setIdx,value)=>updatePreviewLoadTarget(editingWorkoutExerciseIndex,setIdx,value)}
              />}
              {method === "DROP SET" && <DropSetTargetsEditor
                exercise={exercise}
                onChange={(setIdx,segmentIndex,field,value)=>updatePreviewDropTarget(editingWorkoutExerciseIndex,setIdx,segmentIndex,field,value)}
                onAdd={()=>addPreviewSegment(editingWorkoutExerciseIndex)}
                onRemove={segmentIndex=>removePreviewSegment(editingWorkoutExerciseIndex,segmentIndex)}
              />}
              {isRestPauseType(method) && <SegmentedRepsEditor
                exercise={exercise}
                restPause
                onChange={(segmentIndex,value)=>updatePreviewSegment(editingWorkoutExerciseIndex,segmentIndex,value)}
                onAdd={()=>addPreviewSegment(editingWorkoutExerciseIndex)}
                onRemove={segmentIndex=>removePreviewSegment(editingWorkoutExerciseIndex,segmentIndex)}
              />}
            </section>

            <section className={`exerciseConjugateStatus ${exercise.conjugateBlockId ? "active" : ""}`}>
              <div>
                <b>{exercise.conjugateBlockId ? `${exercise.conjugateKind || "Conjugado"} · posição ${exercise.conjugatePosition || 1}` : "Combinar exercícios"}</b>
                <span>{exercise.conjugateBlockId ? "Este exercício faz parte de um bloco." : previousExercise ? `Executar junto com ${previousExercise.name}.` : "Adicione outro exercício e combine a partir dele."}</span>
              </div>
              {exercise.conjugateBlockId
                ? <button type="button" className="ghost small" onClick={()=>removePreviewFromConjugate(editingWorkoutExerciseIndex)}>Remover do bloco</button>
                : previousExercise && <button type="button" className="ghost small" onClick={()=>linkPreviewToPreviousConjugate(editingWorkoutExerciseIndex)}>Combinar com anterior</button>}
            </section>

            <label className="exerciseNotesField"><span>Observações</span><textarea value={exercise.notes || ""} onChange={e=>updatePreviewItem(editingWorkoutExerciseIndex,{notes:e.currentTarget.value})} placeholder="Orientações para a execução" /></label>
            <div className="createActions exerciseEditorActions">
              <button type="button" className="danger" onClick={()=>{removePreviewItem(editingWorkoutExerciseIndex); closeWorkoutExerciseEditor();}}>Excluir</button>
              <button type="button" onClick={closeWorkoutExerciseEditor}><Save size={18}/> Concluir</button>
            </div>
          </section>;
        })()}
      </> : <>
        <section className="formCard">
          <label>Nome do treino</label>
          <input value={newWorkout.name} onChange={e=>setNewWorkout({...newWorkout, name:e.target.value})} placeholder="Ex.: Treino D, Pernas leve, Mobilidade" />
          <div className="formGrid">
            <label>
              Objetivo
              <select value={newWorkout.objective || ""} onChange={e=>setNewWorkout({...newWorkout, objective:e.target.value})}>
                <option value="">Selecione</option>
                {OBJECTIVES.map(item=><option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              Frequência
              <input value={newWorkout.frequency || ""} onChange={e=>setNewWorkout({...newWorkout, frequency:e.target.value})} placeholder="Ex.: Seg • Qua • Sex" />
            </label>
          </div>
          <label>Observações</label>
          <textarea value={newWorkout.notes || ""} onChange={e=>setNewWorkout({...newWorkout, notes:e.target.value})} placeholder="Observações gerais do treino" />
          {appMode === "treinador" && <p className="emptyHint">Salve como treino-base. Depois use Atribuir treino para gerar cópias individuais para você ou alunos ativos.</p>}
        </section>

        <section className="exerciseGroup">
          <h3>Exercícios</h3>
          {newWorkout.items.length===0 && <p className="muted">Nenhum exercício adicionado.</p>}
          <div className="workoutExerciseList workoutEditorExerciseList">
            {indexedWorkoutGroups(newWorkout.items).map((group,groupIndex)=>{
              if(group.type === "conj") return <section className="workoutEditorConjugateBlock" key={group.blockId}>
                <div className="workoutEditorConjugateHeader">
                  <div><small>Bloco conjugado</small><b>{group.conjugateKind || "Bi-set"} · {group.entries.length} exercícios</b></div>
                  <div className="exerciseEditActions">
                    <button type="button" className="ghost iconBtn" title="Mover bloco para cima" disabled={groupIndex===0} onClick={()=>movePreviewConjugateBlock(group.blockId,-1)}><ArrowUp size={15}/></button>
                    <button type="button" className="ghost iconBtn" title="Mover bloco para baixo" disabled={groupIndex===indexedWorkoutGroups(newWorkout.items).length-1} onClick={()=>movePreviewConjugateBlock(group.blockId,1)}><ArrowDown size={15}/></button>
                  </div>
                </div>
                <div className="conjugateKindRow">
                  <select value={group.conjugateKind || "Bi-set"} onChange={event=>updatePreviewConjugateKind(group.blockId,event.currentTarget.value)}>
                    <option>Bi-set</option><option>Tri-set</option><option>Supersérie</option><option>Circuito</option>
                  </select>
                  <button type="button" className="ghost small" onClick={()=>dissolvePreviewConjugateBlock(group.blockId)}>Desfazer bloco</button>
                </div>
                {group.entries.map(({item,index},position)=><div className="workoutExerciseCard conjugateExerciseCard" key={item.workoutExerciseId || item.id || index}>
                  <span className="conjugateEditorLetter">{String.fromCharCode(65+position)}</span>
                  <div>
                    <b>{item.name}</b>
                    <span>{[item.sets && `${item.sets} séries`, exerciseRepSummary(item) && `${exerciseRepSummary(item)} reps`].filter(Boolean).join(" × ") || "Prescrição não definida"}</span>
                    <small>{methodSummary(item)}{item.group ? ` · ${item.group}` : ""}</small>
                  </div>
                  <div className="exerciseEditActions">
                    <button type="button" className="ghost iconBtn" title="Editar exercício" onClick={()=>setEditingWorkoutExerciseIndex(index)}><Edit3 size={15}/></button>
                    <button type="button" className="danger iconBtn" title="Excluir" onClick={()=>removePreviewItem(index)}><Trash2 size={15}/></button>
                  </div>
                </div>)}
              </section>;
              const {item,index} = group.entries[0];
              const canCombine = index > 0;
              return <div className="workoutEditorSingleExercise" key={item.workoutExerciseId || item.id || index}>
                <div className="workoutExerciseCard">
                  <div>
                    <b>{item.name}</b>
                    <span>{[item.sets && `${item.sets} séries`, exerciseRepSummary(item) && `${exerciseRepSummary(item)} reps`].filter(Boolean).join(" × ") || "Prescrição não definida"}</span>
                    <small>{methodSummary(item)}{item.group ? ` · ${item.group}` : ""}</small>
                  </div>
                  <div className="exerciseEditActions">
                    <button type="button" className="ghost iconBtn" title="Mover para cima" disabled={index===0} onClick={()=>movePreviewItem(index,-1)}><ArrowUp size={15}/></button>
                    <button type="button" className="ghost iconBtn" title="Mover para baixo" disabled={index===newWorkout.items.length-1} onClick={()=>movePreviewItem(index,1)}><ArrowDown size={15}/></button>
                    <button type="button" className="ghost iconBtn" title="Editar exercício" onClick={()=>setEditingWorkoutExerciseIndex(index)}><Edit3 size={15}/></button>
                    <button type="button" className="danger iconBtn" title="Excluir" onClick={()=>removePreviewItem(index)}><Trash2 size={15}/></button>
                  </div>
                </div>
                {canCombine && <button type="button" className="ghost combinePreviousButton" onClick={()=>linkPreviewToPreviousConjugate(index)}><PlusCircle size={15}/> Combinar com o exercício anterior</button>}
              </div>;
            })}
          </div>
          <section className="collapsedLibrary editorSubsection">
            <button type="button" onClick={()=>{setWorkoutLibraryFiltersOpen(false); setShowWorkoutLibrary(true);}}><PlusCircle size={18}/> Adicionar exercício</button>
          </section>
        </section>
        <div className="createActions workoutEditorFinalActions">
          <button type="button" className="ghost" disabled={isActionPending("save-workout")} onClick={cancelEditWorkout}>Cancelar</button>
          <button onClick={saveCustomWorkout} disabled={isActionPending("save-workout")} aria-busy={isActionPending("save-workout")}>
            {isActionPending("save-workout") ? <LoaderCircle className="buttonSpinner" aria-hidden="true"/> : <Save size={18}/>}
            {isActionPending("save-workout") ? "Salvando…" : isEditingExistingWorkout ? "Salvar alterações" : "Salvar treino"}
          </button>
        </div>
      </>)}
      </>}
    </main>}

    
    {renderScreen==="exercicios" && appMode === "treinador" && <main>
      {selectedExerciseDetail && !showExerciseEditor ? <>
        <section className="formCard internalDetail exerciseLibraryDetail">
          <div className="grid2 compactGrid">
            <Card title="Categoria" value={selectedExerciseDetail.category || selectedExerciseDetail.group || "Outro"} sub="catálogo de exercícios" />
            <Card title="Grupo principal" value={selectedExerciseDetail.primaryGroup || selectedExerciseDetail.group || "Outro"} sub="catálogo" />
          </div>
          {!!normalizeList(selectedExerciseDetail.secondaryGroups).length && <section className="studentSection compactStudentSection">
            <h3>Grupos secundários</h3>
            <div className="chipRow">{normalizeList(selectedExerciseDetail.secondaryGroups).map(tag=><span className="libraryChip" key={tag}>{tag}</span>)}</div>
          </section>}
          {!!exerciseChipTags(selectedExerciseDetail).length && <section className="studentSection compactStudentSection">
            <h3>Tags</h3>
            <div className="chipRow">{exerciseChipTags(selectedExerciseDetail).map(tag=><span className="libraryChip" key={tag}>{tag}</span>)}</div>
          </section>}
          <section className="studentSection">
            <h3>Informações técnicas</h3>
            <p className="emptyHint">{selectedExerciseDetail.technicalNotes || selectedExerciseDetail.notes || "Nenhuma observação cadastrada."}</p>
          </section>
          <div className="createActions">
            <button type="button" className="ghost" onClick={()=>editLibraryExercise(selectedExerciseDetail)}><Edit3 size={18}/> Editar</button>
            <button type="button" className="danger" disabled={isActionPending(`delete-exercise:${selectedExerciseDetail.id || normalizeExerciseName(selectedExerciseDetail.name)}`)} aria-busy={isActionPending(`delete-exercise:${selectedExerciseDetail.id || normalizeExerciseName(selectedExerciseDetail.name)}`)} onClick={()=>deleteUserLibraryExercise(selectedExerciseDetail)}>
              {isActionPending(`delete-exercise:${selectedExerciseDetail.id || normalizeExerciseName(selectedExerciseDetail.name)}`) ? <LoaderCircle className="buttonSpinner" aria-hidden="true"/> : <Trash2 size={18}/>}
              {isActionPending(`delete-exercise:${selectedExerciseDetail.id || normalizeExerciseName(selectedExerciseDetail.name)}`) ? "Excluindo…" : "Excluir"}
            </button>
          </div>
        </section>
      </> : <>
      {!showExerciseEditor && <div className="pageTitleRow">
        <h2 className="pageTitle">Exercícios</h2>
        {!showExerciseEditor && <button type="button" onClick={startNewExerciseEditor}><PlusCircle size={18}/> Novo exercício</button>}
      </div>}

      {showExerciseEditor && <form className="formCard" id="exercise-editor" onSubmit={saveLibraryExercise}>
        <input value={exerciseForm.name} onChange={e=>updateExerciseFormField("name", e.currentTarget.value)} placeholder="Nome do exercício" />
        <div className="formGrid">
          <input value={exerciseForm.category || ""} onChange={e=>updateExerciseFormField("category", e.currentTarget.value)} placeholder="Categoria" />
          <input value={exerciseForm.primaryGroup || exerciseForm.group || ""} onChange={e=>{
            const value = e.currentTarget.value;
            setExerciseForm(current => ({...current, primaryGroup:value, group:value}));
          }} placeholder="Grupo muscular principal" />
        </div>
        <input value={normalizeList(exerciseForm.secondaryGroups).join(", ")} onChange={e=>updateExerciseFormField("secondaryGroups", e.currentTarget.value)} placeholder="Grupos secundários separados por vírgula" />
        <input value={normalizeList(exerciseForm.equipmentList || exerciseForm.equipment).join(", ")} onChange={e=>updateExerciseFormField("equipmentList", e.currentTarget.value)} placeholder="Equipamentos separados por vírgula" />
        <input value={normalizeList(exerciseForm.tags).join(", ")} onChange={e=>updateExerciseFormField("tags", e.currentTarget.value)} placeholder="Tags técnicas separadas por vírgula" />
        <textarea name="technicalNotes" value={exerciseForm.technicalNotes || exerciseForm.notes || ""} onChange={e=>updateExerciseFormField("technicalNotes", e.currentTarget.value)} placeholder="Informações técnicas do exercício" />
        <div className="createActions">
          <button type="button" className="ghost" disabled={isActionPending("save-exercise")} onClick={closeExerciseEditor}>Cancelar</button>
          <button disabled={isActionPending("save-exercise")} aria-busy={isActionPending("save-exercise")}>
            {isActionPending("save-exercise") ? <LoaderCircle className="buttonSpinner" aria-hidden="true"/> : <Save size={18}/>}
            {isActionPending("save-exercise") ? "Salvando…" : exerciseForm.editingName ? "Salvar alterações" : "Salvar exercício"}
          </button>
        </div>
      </form>}

      {!showExerciseEditor && <section className="formCard exerciseLibraryPanel" id="exercise-library-list">
        <input value={librarySearch} onChange={e=>setLibrarySearch(e.target.value)} placeholder="Pesquisar por nome, categoria, grupo ou tag" />
        <div className="exerciseFilterGrid">
          <label>
            <span>Categoria</span>
            <select value={libraryGroup} onChange={e=>setLibraryGroup(e.currentTarget.value)}>
              {libraryGroups.map(option=><option key={option} value={option}>{option === "Todos" ? "Todas as categorias" : option}</option>)}
            </select>
          </label>
          <label>
            <span>Grupo principal</span>
            <select value={libraryPrimaryGroup} onChange={e=>setLibraryPrimaryGroup(e.currentTarget.value)}>
              {libraryPrimaryGroups.map(option=><option key={option} value={option}>{option === "Todos" ? "Todos os grupos" : option}</option>)}
            </select>
          </label>
          <label>
            <span>Equipamento</span>
            <select value={libraryEquipment} onChange={e=>setLibraryEquipment(e.currentTarget.value)}>
              {libraryEquipments.map(option=><option key={option} value={option}>{option === "Todos" ? "Todos os equipamentos" : option}</option>)}
            </select>
          </label>
          <label>
            <span>Tipo/tag</span>
            <select value={libraryTag} onChange={e=>setLibraryTag(e.currentTarget.value)}>
              {libraryTags.map(option=><option key={option} value={option}>{option === "Todos" ? "Todas as tags" : option}</option>)}
            </select>
          </label>
        </div>
        <div className="sectionHeaderRow compactHeader">
          <span className="libraryHint">{trainerFilteredLibrary.length} exercício{trainerFilteredLibrary.length === 1 ? "" : "s"} encontrado{trainerFilteredLibrary.length === 1 ? "" : "s"}</span>
          <button type="button" className="ghost small" onClick={clearExerciseFilters}>Limpar filtros</button>
        </div>
        {trainerFilteredLibrary.length===0 && <p className="emptyHint">Nenhum exercício encontrado com esses filtros.</p>}
        <div className="libraryList expanded">
        {trainerFilteredLibrary.map(ex=>{
            const exerciseDetailId = String(ex.id || libraryKey(ex));
            return <div className="libraryCard rich tappable" key={exerciseDetailId} onClick={()=>setSelectedExerciseDetailId(exerciseDetailId)}>
              <div>
                <b>{ex.name}</b>
                <span>{ex.category || ex.group || "Outro"} · {ex.primaryGroup || ex.group || "Outro"}</span>
                {!!normalizeList(ex.equipmentList || ex.equipment).length && <div className="chipRow compactChips">{normalizeList(ex.equipmentList || ex.equipment).slice(0,4).map(tag=><small className="libraryChip" key={tag}>{tag}</small>)}</div>}
                {!!exerciseChipTags(ex).length && <div className="chipRow compactChips">{exerciseChipTags(ex).map(tag=><small className="libraryChip subtleChip" key={tag}>{tag}</small>)}</div>}
                {(ex.technicalNotes || ex.notes) && <em className="libraryNote">{ex.technicalNotes || ex.notes}</em>}
              </div>
              <div className="managerActions">
                <button className="ghost iconBtn" type="button" title="Editar exercício" onClick={(event)=>{event.stopPropagation(); editLibraryExercise(ex);}}><Edit3 size={16}/></button>
                <button className="danger iconBtn" type="button" title="Excluir exercício" disabled={isActionPending(`delete-exercise:${ex.id || normalizeExerciseName(ex.name)}`)} aria-busy={isActionPending(`delete-exercise:${ex.id || normalizeExerciseName(ex.name)}`)} onClick={(event)=>{event.stopPropagation(); deleteUserLibraryExercise(ex);}}>{isActionPending(`delete-exercise:${ex.id || normalizeExerciseName(ex.name)}`) ? <LoaderCircle className="buttonSpinner" aria-hidden="true"/> : <Trash2 size={16}/>}</button>
              </div>
            </div>
          })}
        </div>
      </section>}
      </>}
    </main>}

    {renderScreen==="evolucao" && appMode === "treinador" && <main>
      <h2 className="pageTitle">Evolução{trainerInsightAllowed ? ` · ${selectedStudentProfile.studentName || selectedStudentProfile.studentEmail || "Aluno"}` : ""}</h2>
      {!trainerInsightAllowed ? <section className="emptyState">
        <b>Selecione um aluno para ver a evolução.</b>
        <span>Os insights nunca combinam dados de pessoas diferentes.</span>
        <button type="button" onClick={()=>navigateScreen("alunos")}>Abrir alunos</button>
      </section> : <>
      <section className="coachPanel insightContextPanel">
        <div><small>Aluno selecionado</small><b>{selectedStudentProfile.studentName || selectedStudentProfile.studentEmail || "Aluno"}</b><span>{selectedStudentProfile.studentEmail || "Perfil próprio"}</span></div>
        <span>{allExerciseNames.length} exercícios</span>
      </section>
      <div className="segmentedControl insightTabs" aria-label="Insights do aluno">
        <button type="button" className="active" onClick={()=>navigateStudentInsight("evolucao")}>Evolução</button>
        <button type="button" className="ghost" onClick={()=>navigateStudentInsight("analises")}>Análises</button>
      </div>
      <section className="chartCard">
        <h3>Histórico por exercício</h3>
        <select value={selectedExercise} onChange={e=>setSelectedExercise(e.target.value)}>
          <option value="">Selecione um exercício</option>
          {allExerciseNames.map(e=><option key={e}>{e}</option>)}
        </select>
        {selectedExerciseSummary && <section className="grid2 compactGrid">
          <Card title="Última carga" value={`${selectedExerciseSummary.last.raw || selectedExerciseSummary.last.load} kg`} sub={selectedExerciseSummary.last.date} />
          <Card title="Melhor carga" value={`${selectedExerciseSummary.best} kg`} sub={`${selectedExerciseSummary.count} registros`} />
          <Card title="RPE médio" value={`${selectedExerciseSummary.avgRpe}`} sub="média registrada" />
          <Card title="Última execução" value={`${selectedExerciseSummary.last.raw || selectedExerciseSummary.last.load} kg`} sub={selectedExerciseSummary.last.rpe ? `RPE ${selectedExerciseSummary.last.rpe}` : "sem RPE"} />
        </section>}
        {trainerSelectedHistory.length>0 && <ResponsiveContainer width="100%" height={260}>
          <LineChart data={trainerSelectedHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e3452" />
            <XAxis dataKey="date" stroke="#91a4c0" hide />
            <YAxis stroke="#91a4c0" />
            <Tooltip />
            <Line type="monotone" dataKey="load" strokeWidth={3} dot />
          </LineChart>
        </ResponsiveContainer>}
        {trainerSelectedHistory.length===0 && <p className="muted">Escolha um exercício com cargas salvas para visualizar a evolução.</p>}
      </section>

      {trainerSelectedHistory.length>0 && <section className="chartCard">
        <h3>Registros recentes</h3>
        <div className="list">
          {[...trainerSelectedHistory].reverse().slice(0,8).map((h,idx)=><div className="detailLine compactLine" key={idx}>
            <b>{h.date}</b>
            <span>Carga: {h.raw || h.load} kg • RPE: {h.rpe || "—"}</span>
            {h.note && <em>{h.note}</em>}
          </div>)}
        </div>
      </section>}

      <section className="chartCard">
        <h3>Recordes do aluno</h3>
        {trainerExerciseRecords.length===0 && <p className="muted">Salve treinos com cargas para gerar recordes.</p>}
        {trainerExerciseRecords.map((r,idx)=><div className="recordLine ranking" key={r.exercise}><b><span className="rank">{idx + 1}</span> {r.exercise}</b><span>{r.load} kg {r.rpe ? `• RPE ${r.rpe}` : ""}</span></div>)}
      </section>
      {trainerInsightSessions.length===0 && <section className="emptyState slim"><b>Nenhuma sessão deste aluno.</b><span>Atribua um treino para começar a acompanhar a evolução.</span><button type="button" onClick={()=>returnToStudentAction("workoutAssign")}>Atribuir treino</button></section>}
      </>}
    </main>}

    {renderScreen==="analises" && appMode === "treinador" && <main>
      <h2 className="pageTitle">Análises{trainerInsightAllowed ? ` · ${selectedStudentProfile.studentName || selectedStudentProfile.studentEmail || "Aluno"}` : ""}</h2>
      {!trainerInsightAllowed ? <section className="emptyState">
        <b>Selecione um aluno para ver as análises.</b>
        <span>Nenhuma métrica agregada da carteira é exibida sem contexto explícito.</span>
        <button type="button" onClick={()=>navigateScreen("alunos")}>Abrir alunos</button>
      </section> : <>
      <section className="coachPanel insightContextPanel">
        <div><small>Aluno selecionado</small><b>{selectedStudentProfile.studentName || selectedStudentProfile.studentEmail || "Aluno"}</b><span>{selectedStudentProfile.studentEmail || "Perfil próprio"}</span></div>
        <span>{trainerInsightAnalytics.weeklyCount} treinos/semana</span>
      </section>
      <div className="segmentedControl insightTabs" aria-label="Insights do aluno">
        <button type="button" className="ghost" onClick={()=>navigateStudentInsight("evolucao")}>Evolução</button>
        <button type="button" className="active" onClick={()=>navigateStudentInsight("analises")}>Análises</button>
      </div>
      <section className="grid2">
        <Card title="Sessões salvas" value={`${trainerInsightAnalytics.sessionCount}`} sub="somente deste aluno" />
        <Card title="Conclusão" value={`${adherenceStats.adherence}%`} sub={`${adherenceStats.done}/${adherenceStats.total} exercícios concluídos`} />
        <Card title="Volume total" value={`${Math.round(adherenceStats.volume).toLocaleString("pt-BR")} kg`} sub="carga × repetições" />
        <Card title="Grupos ativos" value={`${groupVolumeStats.length}`} sub="com registros salvos" />
      </section>

      <section className="chartCard">
        <h3>Volume nas últimas 8 semanas</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={weeklyVolumeTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e3452" />
            <XAxis dataKey="semana" stroke="#91a4c0" />
            <YAxis stroke="#91a4c0" />
            <Tooltip />
            <Bar dataKey="volume" radius={[8,8,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section className="chartCard">
        <h3>Volume por grupo muscular</h3>
        {groupVolumeStats.length===0 && <p className="muted">Ainda não há volume suficiente para análise por grupo.</p>}
        {groupVolumeStats.map(g=>{
          const max = Math.max(...groupVolumeStats.map(x=>x.volume), 1);
          return <div className="barLine" key={g.group}>
            <div><b>{g.group}</b><span>{g.volume.toLocaleString("pt-BR")} kg • {g.count} registros</span></div>
            <div className="miniBar"><i style={{width:`${Math.max(6, (g.volume/max)*100)}%`}} /></div>
          </div>
        })}
      </section>

      <section className="chartCard">
        <h3>Frequência por treino</h3>
        {workoutFrequencyStats.length===0 && <p className="muted">Salve sessões para visualizar frequência por treino.</p>}
        {workoutFrequencyStats.map(w=><div className="recordLine" key={w.name}><b>{w.name}</b><span>{w.count}x</span></div>)}
      </section>

      <section className="chartCard">
        <h3>Leitura rápida</h3>
        <p className="muted">Use esta tela para verificar frequência, volume real, grupos mais treinados e conclusão dos exercícios deste aluno.</p>
      </section>
      {trainerInsightSessions.length===0 && <section className="emptyState slim"><b>Nenhuma sessão deste aluno.</b><span>Atribua um treino para começar a gerar análises.</span><button type="button" onClick={()=>returnToStudentAction("workoutAssign")}>Atribuir treino</button></section>}
      </>}
    </main>}

    {renderScreen==="dados" && <main>
      {selectedBodyRecord ? <>
        <section className="formCard">
          <h3>Registro corporal</h3>
          {bodyRecordDetailLines(selectedBodyRecord.record).map(([label,value])=><div className="recordLine" key={label}><b>{label}</b><span>{value}</span></div>)}
          {canManageBodyRecord(selectedBodyRecord.record) && <button type="button" className="danger" disabled={isActionPending(`delete-body:${selectedBodyRecord.record?.id || selectedBodyRecord.index}`)} aria-busy={isActionPending(`delete-body:${selectedBodyRecord.record?.id || selectedBodyRecord.index}`)} onClick={async ()=>{
            if(await deleteBodyRecord(selectedBodyRecord.record, selectedBodyRecord.index)) closeSelectedBodyRecord();
          }}>{isActionPending(`delete-body:${selectedBodyRecord.record?.id || selectedBodyRecord.index}`) ? "Excluindo…" : "Excluir registro"}</button>}
        </section>
      </> : showProfileBodyEditor ? <>
        <section className="formCard">
          <h3>Dados corporais</h3>
          <form id="profile-body-form" className="accountForm" onSubmit={addBody} onInputCapture={()=>markDirty("profile-body")} onChangeCapture={()=>markDirty("profile-body")} aria-busy={isActionPending("save-profile-body")}>
            <input type="hidden" name="bodyFatOverrideMode" value="methodOnly" />
            <BodyRecordFields includeDate={false} profileBodyEditor />
            <button disabled={isActionPending("save-profile-body")}>
              {isActionPending("save-profile-body") && <LoaderCircle className="buttonSpinner" aria-hidden="true"/>}
              {isActionPending("save-profile-body") ? "Salvando…" : "Salvar dados corporais"}
            </button>
          </form>
          {bodyMessage && <p className="feedbackMessage">{bodyMessage}</p>}
        </section>
        <h2 className="pageTitle">Dados salvos</h2>
        {personalBody.length===0 && <section className="emptyState slim"><b>Nenhum dado corporal salvo.</b><span>Registre peso, BF e cintura para acompanhar a evolução corporal no Dashboard.</span></section>}
        <div className="list">{personalBody.map((b,i)=><button type="button" key={b.id || `${b.date}-${i}`} className="sessionCard bodyRecord clickableRecord" onClick={()=>setSelectedBodyRecord({record:b,index:i,scope:"profile"})}>
          <div>
            <strong>{b.date}</strong>
            <small>{b.peso || "—"} kg • altura {b.height || "—"} cm • BF final {bodyFatValue(b) || "—"}% • método {b.bodyFatMethodLabel || bfMethodLabel(b.bodyFatMethod)} • cintura {b.cintura || "—"} • idade {b.age || "—"}</small>
            <small>{b.recordedBy && b.recordedBy !== currentUserId ? "Registrado pelo treinador" : "Registrado por você"}{b.bodyFatCalculated ? ` • BF calculado ${b.bodyFatCalculated}%` : ""}{b.bodyFatManual ? ` • manual ${b.bodyFatManual}%` : ""}</small>
          </div>
        </button>)}</div>
      </> : <>
        <div className="pageTitleRow">
          <h2 className="pageTitle">Perfil</h2>
        </div>

        {pendingCoachInvites.map(link=><section className="formCard inviteActionCard" key={`profile-${link.id}`}>
          <div>
            <small>Convite de treinador</small>
            <b>{link.coachName || "Seu treinador"}</b>
          </div>
          <button type="button" className="ghost" onClick={()=>openInviteResponder(link)}>Responder</button>
        </section>)}

        <section className="formCard accountCard settingsAccount">
          <h3>Conta</h3>
          <div className="recordLine"><b>Nome conectado</b><span>{currentUser?.name || currentUserDisplayName || "Usuário"}</span></div>
          <div className="recordLine"><b>E-mail conectado</b><span>{currentUser?.email || "Conta local"}</span></div>
          {showNameEditor ? <form id="profile-name-form" className="accountForm" onSubmit={saveProfile} onInputCapture={()=>markDirty("profile-name")} onChangeCapture={()=>markDirty("profile-name")}>
            <input name="name" defaultValue={currentUser?.name || profile.name || ""} required placeholder="Nome" />
            <div className="createActions"><button type="button" className="ghost" disabled={isActionPending("save-profile")} onClick={()=>closeDirtyScope("profile-name", ()=>setShowNameEditor(false))}>Cancelar</button><button disabled={isActionPending("save-profile")} aria-busy={isActionPending("save-profile")}>{isActionPending("save-profile") && <LoaderCircle className="buttonSpinner" aria-hidden="true"/>}{isActionPending("save-profile") ? "Salvando…" : "Salvar nome"}</button></div>
          </form> : <button type="button" className="ghost" onClick={openProfileNameEditor}>Editar nome</button>}
          <button type="button" className="danger" onClick={signOutAccount} disabled={authBusy || !currentUser}>Sair da conta</button>
          {authMessage && <p className="feedbackMessage">{authMessage}</p>}
        </section>

        <section className="formCard">
          <h3>Dados corporais</h3>
          <div className="profileMetricGrid">
            <div><b>Idade</b><span>{currentProfileAge === "—" ? "—" : `${currentProfileAge} anos`}</span></div>
            <div><b>Peso</b><span>{currentProfileWeight === "—" ? "—" : `${currentProfileWeight} kg`}</span></div>
            <div><b>Altura</b><span>{currentProfileHeight === "—" ? "—" : `${currentProfileHeight} cm`}</span></div>
            <div><b>BF</b><span>{currentProfileBf === "—" ? "—" : `${currentProfileBf}%`}</span></div>
          </div>
          <button type="button" className="ghost" onClick={openProfileBodyEditor}><Scale size={18}/> Atualizar dados</button>
        </section>

        <section className="formCard">
          <h3>Aparência</h3>
          <div className="segmentedControl">
            <button type="button" className={theme === "dark" ? "active" : "ghost"} onClick={()=>void changeTheme("dark")}>Escuro</button>
            <button type="button" className={theme === "light" ? "active" : "ghost"} onClick={()=>void changeTheme("light")}>Claro</button>
          </div>
        </section>

        <section className="formCard">
          <h3>Treino</h3>
          <label className="toggleLine">
            <input type="checkbox" checked={autoStartRestTimer} onChange={e=>void toggleAutoStartRestTimer(e.currentTarget.checked)} />
            <span>Iniciar descanso automaticamente ao concluir série</span>
          </label>
        </section>
      </>}
    </main>}

    {pendingNavigation && <div className="modal dirtyGuardModal" role="presentation">
      <div className="modalCard" role="dialog" aria-modal="true" aria-labelledby="dirty-guard-title" aria-describedby="dirty-guard-description">
        <h2 id="dirty-guard-title">Alterações não salvas</h2>
        <p id="dirty-guard-description" className="muted">Você alterou {dirtyScopeLabel(pendingNavigation.scope)}. Escolha o que fazer antes de sair.</p>
        <div className="draftGuardActions">
          <button type="button" onClick={()=>resolvePendingNavigation("save")}><Save size={18}/> Salvar rascunho</button>
          <button type="button" className="danger" onClick={()=>resolvePendingNavigation("discard")}><Trash2 size={18}/> Descartar</button>
          <button type="button" className="ghost" onClick={()=>resolvePendingNavigation("continue")}>Continuar editando</button>
        </div>
      </div>
    </div>}

    {appMode === "treinador" && editingStudentLink && <div className="modal">
      <form id="student-admin-form" className="modalCard studentEditModal" onSubmit={saveStudentAdminInfo} onInputCapture={()=>markDirty("student-admin")} onChangeCapture={()=>markDirty("student-admin")}>
        <h2>Editar aluno</h2>
        <section className="skinfoldBox">
          <h4>Dados básicos</h4>
          <input name="studentName" placeholder="Nome" defaultValue={editingStudentLink.studentName || ""} />
        </section>
        <section className="skinfoldBox">
          <h4>Objetivo</h4>
          <select name="objective" defaultValue={editingStudentLink.objective || ""}>
            <option value="">Selecionar objetivo</option>
            <option value="Hipertrofia">Hipertrofia</option>
            <option value="Emagrecimento">Emagrecimento</option>
            <option value="Força">Força</option>
            <option value="Condicionamento">Condicionamento</option>
            <option value="Saúde">Saúde</option>
            <option value="Reabilitação">Reabilitação</option>
            <option value="Outro">Outro</option>
          </select>
        </section>
        <section className="skinfoldBox">
          <h4>Observações</h4>
          <textarea name="notes" placeholder="Restrições, lesões, recomendações ou informações relevantes" defaultValue={editingStudentLink.notes || ""} />
        </section>
        <div className="finishActions">
          <button type="button" className="ghost" disabled={isActionPending(`save-student:${editingStudentLink.id}`)} onClick={()=>closeDirtyScope("student-admin", ()=>setEditingStudentLink(null))}>Cancelar</button>
          <button type="submit" disabled={isActionPending(`save-student:${editingStudentLink.id}`)} aria-busy={isActionPending(`save-student:${editingStudentLink.id}`)}>
            {isActionPending(`save-student:${editingStudentLink.id}`) ? <LoaderCircle className="buttonSpinner" aria-hidden="true"/> : <Save size={18}/>}
            {isActionPending(`save-student:${editingStudentLink.id}`) ? "Salvando…" : "Salvar"}
          </button>
        </div>
        {studentMessage && <p className="feedbackMessage">{studentMessage}</p>}
      </form>
    </div>}

    {appMode === "treinador" && endingStudentLink && <div className="modal">
      <div className="modalCard">
        <h2>Encerrar vínculo com este aluno?</h2>
        <p className="muted">O aluno perderá acesso aos treinos enviados por você, mas sua conta continuará ativa e poderá ser vinculada novamente no futuro.</p>
        <div className="finishActions">
          <button type="button" className="ghost" onClick={()=>setEndingStudentLink(null)}>Cancelar</button>
          <button type="button" className="danger" onClick={()=>removeStudentLink(endingStudentLink)}>Encerrar vínculo</button>
        </div>
      </div>
    </div>}

    {showRestPicker && <div className="modal">
      <div className="modalCard compactRestPicker">
        <h2>Descanso</h2>
        <div className="restQuickActions">
          {[30,45,60,90,120].map(seconds=><button type="button" className="ghost" key={seconds} onClick={()=>applyRestDuration(seconds)}>{seconds} s</button>)}
        </div>
        <label className="inlineField"><span>Personalizado (segundos)</span><input inputMode="numeric" value={restCustomSeconds} onChange={event=>setRestCustomSeconds(event.target.value)} placeholder="Ex.: 75" /></label>
        <div className="finishActions">
          <button type="button" onClick={()=>restCustomSeconds && applyRestDuration(restCustomSeconds)}>Aplicar</button>
          <button type="button" className="ghost" onClick={()=>setShowRestPicker(false)}>Cancelar</button>
        </div>
      </div>
    </div>}

    {pendingExerciseCompletion !== null && activeSession && <div className="modal">
      <div className="modalCard compactWorkoutSwitchModal">
        <h2>Há séries sem preenchimento</h2>
        <div className="finishActions">
          <button type="button" onClick={()=>{const index=pendingExerciseCompletion; setPendingExerciseCompletion(null); completeSessionExercise(index, false, true, true);}}>Concluir preenchidas</button>
          <button type="button" className="ghost" onClick={()=>{const index=pendingExerciseCompletion; setPendingExerciseCompletion(null); completeSessionExercise(index, true);}}>Marcar todas como concluídas</button>
          <button type="button" className="ghost" onClick={()=>setPendingExerciseCompletion(null)}>Cancelar</button>
        </div>
      </div>
    </div>}

    {pendingDeferredExercise !== null && <div className="modal">
      <div className="modalCard compactWorkoutSwitchModal">
        <h2>Fazer depois?</h2>
        <div className="finishActions">
          <button type="button" onClick={()=>{const index=pendingDeferredExercise; setPendingDeferredExercise(null); deferSessionExercise(index);}}>Fazer depois</button>
          <button type="button" className="ghost" onClick={()=>setPendingDeferredExercise(null)}>Cancelar</button>
        </div>
      </div>
    </div>}

    {pendingWorkoutStartKey && activeSession && <div className="modal">
      <div className="modalCard compactWorkoutSwitchModal">
        <h2>Outro treino em andamento</h2>
        <p className="muted">Finalize a sessão atual antes de iniciar este treino.</p>
        <div className="finishActions">
          <button type="button" className="ghost" onClick={()=>{setPendingWorkoutStartKey(""); continueActiveWorkout();}}>Continuar treino atual</button>
          <button type="button" onClick={finishAndStartPendingWorkout}><Save size={18}/> Encerrar e iniciar este treino</button>
          <button type="button" className="ghost" onClick={()=>setPendingWorkoutStartKey("")}>Cancelar</button>
        </div>
      </div>
    </div>}

    {finishConfirm && activeSession && <div className="modal">
      <div className="modalCard">
        <button className="close" disabled={isActionPending(`save-session:${activeSession.id || "active"}`)} onClick={()=>setFinishConfirm(false)}><X/></button>
        <h2>Finalizar treino</h2>
        <p className="muted">{Object.values(activeSession.exercises || {}).filter(ex=>ex.done).length} concluídos · {(activeSession.plannedItems || []).length - Object.values(activeSession.exercises || {}).filter(ex=>ex.done).length} pendentes</p>
        <div className="finishActions">
          <button onClick={()=>saveActiveSession(activeSession)} disabled={isActionPending(`save-session:${activeSession.id || "active"}`)} aria-busy={isActionPending(`save-session:${activeSession.id || "active"}`)}>
            {isActionPending(`save-session:${activeSession.id || "active"}`) ? <LoaderCircle className="buttonSpinner" aria-hidden="true"/> : <Save size={18}/>}
            {isActionPending(`save-session:${activeSession.id || "active"}`) ? "Finalizando…" : "Finalizar mesmo assim"}
          </button>
          <button className="ghost" disabled={isActionPending(`save-session:${activeSession.id || "active"}`)} onClick={()=>setFinishConfirm(false)}>Voltar ao treino</button>
        </div>
      </div>
    </div>}

    {sessionSummary && <div className="modal">
      <div className="modalCard sessionSummaryModal">
        <button className="close" onClick={()=>setSessionSummary(null)}><X/></button>
        <h2>Resumo da sessão</h2>
        <p className="muted">{sessionSummary.date} • {sessionSummary.workoutLabel}</p>
        <section className="summaryGrid">
          <Card title="Duração" value={sessionSummary.duration} sub="tempo total" />
          <Card title="Conclusão" value={`${sessionSummary.completionPct}%`} sub={`${sessionSummary.completedExercises}/${sessionSummary.totalExercises} exercícios`} />
          <Card title="Séries" value={`${sessionSummary.totalSets}`} sub={`${sessionSummary.totalReps} repetições`} />
          <Card title="Volume" value={`${Math.round(sessionSummary.volume).toLocaleString("pt-BR")} kg`} sub="volume total realizado" />
          <Card title="Calorias estimadas" value={`${sessionSummary.calories} kcal`} sub={`intensidade ${sessionSummary.intensity}`} />
        </section>
        {sessionSummary.caloriesFallback && <p className="emptyHint">Complete seus dados corporais para melhorar a estimativa de calorias.</p>}
      </div>
    </div>}

    {appMode === "atleta" && inviteModalLink && <div className="modal">
      <div className="modalCard inviteModalCard">
        <button className="close" type="button" disabled={isActionPending(`invite-response:${inviteModalLink.id}`)} onClick={()=>dismissInviteModal(inviteModalLink)}><X/></button>
        <small>Convite de treinador</small>
        <h2>{inviteModalLink.coachName || "Seu treinador"}</h2>
        <div className="finishActions">
          <button type="button" className="ghost" disabled={isActionPending(`invite-response:${inviteModalLink.id}`)} onClick={()=>answerCoachInvite(inviteModalLink, false)}>Recusar</button>
          <button type="button" disabled={isActionPending(`invite-response:${inviteModalLink.id}`)} aria-busy={isActionPending(`invite-response:${inviteModalLink.id}`)} onClick={()=>answerCoachInvite(inviteModalLink, true)}>
            {isActionPending(`invite-response:${inviteModalLink.id}`) && <LoaderCircle className="buttonSpinner" aria-hidden="true"/>}
            {isActionPending(`invite-response:${inviteModalLink.id}`) ? "Respondendo…" : "Aceitar"}
          </button>
        </div>
      </div>
    </div>}

    {toasts.length > 0 && <div className="toastRegion" aria-label="Notificações">
      {toasts.map(toast=>{
        const ToastIcon = toast.type === "success" ? CheckCircle2 : toast.type === "warning" ? AlertTriangle : toast.type === "error" ? AlertCircle : Info;
        return <div
          className={`toast ${toast.type}`}
          key={toast.id}
          role={toast.type === "error" ? "alert" : "status"}
          aria-live={toast.type === "error" ? "assertive" : "polite"}
          aria-atomic="true"
        >
          <ToastIcon className="toastIcon" size={20} aria-hidden="true"/>
          <span className="toastMessage">{toast.message}</span>
          {toast.count > 1 && <span className="toastCount" aria-label={`Repetido ${toast.count} vezes`}>×{toast.count}</span>}
          {typeof toast.onRetry === "function" && <button type="button" className="toastRetry" onClick={()=>{
            const retry = toast.onRetry;
            dismissToast(toast.id);
            Promise.resolve(retry()).catch(error=>notify(error?.message || "Não foi possível tentar novamente.", "error"));
          }}>{toast.retryLabel || "Tentar novamente"}</button>}
          <button type="button" className="toastClose" onClick={()=>dismissToast(toast.id)} aria-label="Fechar notificação"><X size={18}/></button>
        </div>;
      })}
    </div>}

    {showBottomNav && <nav className="nav">
      {appMode === "atleta" ? <>
        <button onClick={()=>navigateScreen("dashboard", {fromNav:true})} className={renderScreen==="dashboard"?"on":""}><BarChart3/>Dashboard</button>
        <button onClick={()=>navigateScreen("criar", {fromNav:true})} className={["criar","treino"].includes(renderScreen)?"on":""}><Dumbbell/>Treinos</button>
        <button onClick={()=>navigateScreen("historico", {fromNav:true})} className={renderScreen==="historico"?"on":""}><ClipboardList/>Evolução</button>
        <button onClick={()=>navigateScreen("dados", {fromNav:true})} className={renderScreen==="dados"?"on":""}><Scale/>Perfil</button>
      </> : <>
        <button onClick={()=>navigateScreen("dashboard", {fromNav:true})} className={renderScreen==="dashboard"?"on":""}><BarChart3/>Dashboard</button>
        <button onClick={()=>navigateScreen("alunos", {fromNav:true})} className={renderScreen==="alunos"?"on":""}><Users/>Alunos</button>
        <button onClick={()=>navigateScreen("criar", {fromNav:true})} className={renderScreen==="criar"?"on":""}><Settings2/>Treinos</button>
        <button onClick={()=>navigateScreen("exercicios", {fromNav:true})} className={renderScreen==="exercicios"?"on":""}><PlusCircle/>Exercícios</button>
        <button onClick={()=>navigateScreen("dados", {fromNav:true})} className={renderScreen==="dados"?"on":""}><Scale/>Perfil</button>
      </>}
    </nav>}
  </div>
}

function BodyRecordFields({includeDate=false, profileBodyEditor=false}){
  const [values,setValues] = useState({bodyFatMethod:"manual", sex:"male", useManualBodyFat:false});
  const patch = event => {
    const target = event.currentTarget;
    setValues(current => ({...current, [target.name]:target.type === "checkbox" ? target.checked : target.value}));
  };
  const bfResult = calculateBodyFat(values);
  const showManual = values.bodyFatMethod === "manual" || (!profileBodyEditor && values.useManualBodyFat);
  const Section = ({title, children}) => <section className="skinfoldBox">
    <h4>{title}</h4>
    {children}
  </section>;
  if(profileBodyEditor) return <>
    {includeDate && <input name="date" type="date" defaultValue={today()} />}
    <Section title="Dados básicos" defaultOpen>
      <div className="formGrid">
        <select name="sex" value={values.sex || ""} onChange={patch}>
          <option value="">Sexo</option>
          <option value="male">Masculino</option>
          <option value="female">Feminino</option>
        </select>
        <input name="age" placeholder="Idade" inputMode="numeric" onChange={patch} />
        <input name="peso" placeholder="Peso (kg)" inputMode="decimal" onChange={patch} />
        <input name="height" placeholder="Altura (cm)" inputMode="decimal" onChange={patch} />
      </div>
    </Section>
    <Section title="Medidas">
      <div className="formGrid">
        <input name="neck" placeholder="Pescoço (cm)" inputMode="decimal" onChange={patch} />
        <input name="shoulder" placeholder="Ombro (cm)" inputMode="decimal" onChange={patch} />
        <input name="cintura" placeholder="Cintura (cm)" inputMode="decimal" onChange={patch} />
        <input name="hip" placeholder="Quadril (cm)" inputMode="decimal" onChange={patch} />
        <input name="chest" placeholder="Peito/tórax (cm)" inputMode="decimal" onChange={patch} />
        <input name="abdomen" placeholder="Abdômen (cm)" inputMode="decimal" onChange={patch} />
        <input name="arm" placeholder="Braço (cm)" inputMode="decimal" onChange={patch} />
        <input name="forearm" placeholder="Antebraço (cm)" inputMode="decimal" onChange={patch} />
        <input name="thigh" placeholder="Coxa (cm)" inputMode="decimal" onChange={patch} />
        <input name="calf" placeholder="Panturrilha (cm)" inputMode="decimal" onChange={patch} />
      </div>
      <textarea name="notes" placeholder="Observações do registro" />
    </Section>
    <Section title="Dobras cutâneas / Adipômetro">
      <div className="formGrid">
        <input name="skinfoldChest" placeholder="Peitoral (mm)" inputMode="decimal" onChange={patch} />
        <input name="skinfoldAbdominal" placeholder="Abdominal (mm)" inputMode="decimal" onChange={patch} />
        <input name="skinfoldThigh" placeholder="Coxa (mm)" inputMode="decimal" onChange={patch} />
        <input name="skinfoldTriceps" placeholder="Tríceps (mm)" inputMode="decimal" onChange={patch} />
        <input name="skinfoldSubscapular" placeholder="Subescapular (mm)" inputMode="decimal" onChange={patch} />
        <input name="skinfoldSuprailiac" placeholder="Supra-ilíaca (mm)" inputMode="decimal" onChange={patch} />
        <input name="skinfoldMidaxillary" placeholder="Axilar média (mm)" inputMode="decimal" onChange={patch} />
        <input name="skinfoldCalf" placeholder="Panturrilha (mm)" inputMode="decimal" onChange={patch} />
      </div>
      <textarea name="skinfoldNotes" placeholder="Observações do teste de adipômetro" />
    </Section>
    <Section title="Percentual de gordura (BF)" defaultOpen>
      <select name="bodyFatMethod" value={values.bodyFatMethod || "manual"} onChange={patch}>
        <option value="manual">Manual</option>
        <option value="jp3">Jackson & Pollock 3 dobras</option>
        <option value="jp7">Jackson & Pollock 7 dobras</option>
        <option value="navy">Navy / Circunferências</option>
      </select>
      <label>
        <span>BF calculado</span>
        <input readOnly value={bfResult.calculated ? `${bfResult.calculated}%` : "—"} aria-label="BF calculado" />
      </label>
      {values.bodyFatMethod === "manual" && <label>
          <span>BF manual</span>
          <input name="bodyFatManual" placeholder="BF manual (%)" inputMode="decimal" onChange={patch} />
          <small>Informe o BF manual para salvar o valor final.</small>
        </label>}
      <p className="bfPreview">
        {values.bodyFatMethod === "manual"
          ? "Informe o BF manual para salvar o valor final."
          : bfResult.calculated
            ? `BF calculado: ${bfResult.calculated}%${bfResult.skinfoldSum ? ` · soma ${bfResult.skinfoldSum} mm` : ""}${bfResult.density ? ` · densidade ${bfResult.density}` : ""}`
            : bfResult.message || "Preencha as medidas necessárias para este método."}
      </p>
    </Section>
  </>;
  return <>
    {includeDate && <input name="date" type="date" defaultValue={today()} />}
    {!profileBodyEditor && <section className="skinfoldBox">
      <h4>Percentual de gordura</h4>
      <div className="formGrid">
        <select name="sex" value={values.sex || ""} onChange={patch}>
          <option value="">Sexo</option>
          <option value="male">Masculino</option>
          <option value="female">Feminino</option>
        </select>
        <select name="bodyFatMethod" value={values.bodyFatMethod || "manual"} onChange={patch}>
          <option value="manual">Manual</option>
          <option value="jp3">Jackson & Pollock 3 dobras</option>
          <option value="jp7">Jackson & Pollock 7 dobras</option>
          <option value="navy">Navy / Circunferências</option>
        </select>
        {!profileBodyEditor && <input name="bodyFatManual" placeholder="BF manual (%)" inputMode="decimal" onChange={patch} />}
        {!profileBodyEditor && <label className="toggleLine">
          <input type="checkbox" name="useManualBodyFat" checked={!!values.useManualBodyFat} onChange={patch} disabled={values.bodyFatMethod === "manual"} />
          <span>Usar BF manual</span>
        </label>}
      </div>
      <p className="bfPreview">
        {values.bodyFatMethod === "manual"
          ? "Informe o BF manual para salvar o valor final."
          : bfResult.calculated
            ? `BF calculado: ${bfResult.calculated}%${bfResult.skinfoldSum ? ` · soma ${bfResult.skinfoldSum} mm` : ""}${bfResult.density ? ` · densidade ${bfResult.density}` : ""}`
            : bfResult.message || "Preencha as medidas necessárias para este método."}
        {showManual && values.bodyFatManual ? ` · BF final manual: ${values.bodyFatManual}%` : ""}
      </p>
    </section>}
    <div className="formGrid">
      <input name="peso" placeholder="Peso (kg)" inputMode="decimal" onChange={patch} />
      <input name="height" placeholder="Altura (cm)" inputMode="decimal" onChange={patch} />
      <input name="age" placeholder="Idade" inputMode="numeric" onChange={patch} />
      <input name="neck" placeholder="Pescoço (cm)" inputMode="decimal" onChange={patch} />
      <input name="shoulder" placeholder="Ombro (cm)" inputMode="decimal" onChange={patch} />
      <input name="cintura" placeholder="Cintura (cm)" inputMode="decimal" onChange={patch} />
      <input name="hip" placeholder="Quadril (cm)" inputMode="decimal" onChange={patch} />
      <input name="chest" placeholder="Peito/tórax (cm)" inputMode="decimal" onChange={patch} />
      <input name="abdomen" placeholder="Abdômen (cm)" inputMode="decimal" onChange={patch} />
      <input name="arm" placeholder="Braço (cm)" inputMode="decimal" onChange={patch} />
      <input name="forearm" placeholder="Antebraço (cm)" inputMode="decimal" onChange={patch} />
      <input name="thigh" placeholder="Coxa (cm)" inputMode="decimal" onChange={patch} />
      <input name="calf" placeholder="Panturrilha (cm)" inputMode="decimal" onChange={patch} />
    </div>
    <textarea name="notes" placeholder="Observações do registro" />
    <section className="skinfoldBox">
      <h4>Dobras cutâneas / Adipômetro</h4>
      <div className="formGrid">
        <input name="skinfoldChest" placeholder="Peitoral (mm)" inputMode="decimal" onChange={patch} />
        <input name="skinfoldAbdominal" placeholder="Abdominal (mm)" inputMode="decimal" onChange={patch} />
        <input name="skinfoldThigh" placeholder="Coxa (mm)" inputMode="decimal" onChange={patch} />
        <input name="skinfoldTriceps" placeholder="Tríceps (mm)" inputMode="decimal" onChange={patch} />
        <input name="skinfoldSubscapular" placeholder="Subescapular (mm)" inputMode="decimal" onChange={patch} />
        <input name="skinfoldSuprailiac" placeholder="Supra-ilíaca (mm)" inputMode="decimal" onChange={patch} />
        <input name="skinfoldMidaxillary" placeholder="Axilar média (mm)" inputMode="decimal" onChange={patch} />
        <input name="skinfoldCalf" placeholder="Panturrilha (mm)" inputMode="decimal" onChange={patch} />
      </div>
      <textarea name="skinfoldNotes" placeholder="Observações do teste de adipômetro" />
    </section>
    {profileBodyEditor && <section className="skinfoldBox">
      <h4>BF</h4>
      <div className="formGrid">
        <select name="sex" value={values.sex || ""} onChange={patch}>
          <option value="">Sexo</option>
          <option value="male">Masculino</option>
          <option value="female">Feminino</option>
        </select>
        <select name="bodyFatMethod" value={values.bodyFatMethod || "manual"} onChange={patch}>
          <option value="manual">Manual</option>
          <option value="jp3">Jackson & Pollock 3 dobras</option>
          <option value="jp7">Jackson & Pollock 7 dobras</option>
          <option value="navy">Navy / Circunferências</option>
        </select>
      </div>
      <p className="bfPreview">
        {values.bodyFatMethod === "manual"
          ? "Informe o BF manual para salvar o valor final."
          : bfResult.calculated
            ? `BF calculado: ${bfResult.calculated}%${bfResult.skinfoldSum ? ` · soma ${bfResult.skinfoldSum} mm` : ""}${bfResult.density ? ` · densidade ${bfResult.density}` : ""}`
            : bfResult.message || "Preencha as medidas necessárias para este método."}
      </p>
      {values.bodyFatMethod === "manual" && <input name="bodyFatManual" placeholder="BF manual (%)" inputMode="decimal" onChange={patch} />}
    </section>}
  </>
}

function RepTargetsEditor({exercise, onToggle, onChange, onLoadChange=()=>{}, forced=false}){
  const count = plannedSetCount(exercise?.sets);
  const labels = repTargetFieldLabels(exercise);
  const loads = loadTargetFieldLabels(exercise);
  const warning = repTargetWarning(exercise);
  const suggest = shouldSuggestRepTargets(exercise);
  const open = forced || !!exercise?.useRepTargetsBySet;
  return <section className={`repTargetsPanel ${open ? "open" : ""}`}>
    {!forced && <label className="toggleLine repTargetsToggle">
      <input type="checkbox" checked={!!exercise?.useRepTargetsBySet} onChange={e=>onToggle(e.currentTarget.checked)} />
      <span>Repetições por série</span>
    </label>}
    {suggest && !open && <p className="repHint">Este método costuma usar metas diferentes por série.</p>}
    {open && <>
      <div className="repTargetsGrid prescriptionTargetsGrid">
        {Array.from({length:count},(_,idx)=><div className="prescriptionTargetRow" key={idx}>
          <b>Série {idx+1}</b>
          <label><span>Repetições</span><input value={labels[idx] || ""} onChange={e=>onChange(idx, e.currentTarget.value)} placeholder="12 ou 10-12" /></label>
          <label><span>Carga</span><div className="executionInputWithUnit"><input inputMode="decimal" value={loads[idx] || ""} onChange={e=>onLoadChange(idx, e.currentTarget.value)} placeholder="Opcional"/><em>kg</em></div></label>
        </div>)}
      </div>
      <p className="repHint">Defina as repetições e, quando necessário, uma carga diferente em cada série.</p>
      {warning && <p className="repWarning">{warning}</p>}
    </>}
  </section>
}

function DropSetTargetsEditor({exercise, onChange, onAdd, onRemove}){
  const matrix = dropTargetMatrix(exercise);
  const segmentCount = matrix[0]?.length || 2;
  const incomplete = matrix.some(row=>row.filter(cell=>String(cell.reps || "").trim()).length < 2);
  return <section className="segmentedRepsPanel dropSetTargetsPanel">
    {matrix.map((row,setIndex)=><div className="dropSetSeriesCard" key={setIndex}>
      <b>Série {setIndex + 1}</b>
      <div className="segmentedRepsGrid">
        {row.map((cell,segmentIndex)=><div className="dropTargetRow" key={segmentIndex}>
          <span>Drop {segmentIndex + 1}</span>
          <label><span>Repetições</span><input value={cell.reps || ""} onChange={event=>onChange(setIndex,segmentIndex,"reps",event.currentTarget.value)} placeholder={segmentIndex === 0 ? "Ex.: 12" : "Ex.: 8"}/></label>
          <label><span>Carga</span><div className="executionInputWithUnit"><input inputMode="decimal" value={cell.load || ""} onChange={event=>onChange(setIndex,segmentIndex,"load",event.currentTarget.value)} placeholder="Opcional"/><em>kg</em></div></label>
          {segmentCount > 2 && <button type="button" className="ghost iconBtn" aria-label="Remover drop" onClick={()=>onRemove(segmentIndex)}><X size={14}/></button>}
        </div>)}
      </div>
    </div>)}
    <button type="button" className="ghost small addSegmentButton" onClick={onAdd}><PlusCircle size={15}/> Adicionar drop</button>
    <p className="repHint">Cada série pode ter repetições e cargas próprias em cada queda.</p>
    {incomplete && <p className="repWarning">Preencha pelo menos dois drops em todas as séries.</p>}
  </section>
}

function SegmentedRepsEditor({exercise, restPause=false, onChange, onAdd, onRemove}){
  const values = segmentedRepValues(exercise);
  const incomplete = values.filter(Boolean).length < 2;
  return <section className="segmentedRepsPanel">
    <div className="segmentedRepsGrid">
      {values.map((value,index)=><label key={index}>
        <span>{restPause ? (index === 0 ? "Série principal" : `Mini-série ${index}`) : `Drop ${index + 1}`}</span>
        <div><input value={value} onChange={event=>onChange(index,event.currentTarget.value)} placeholder={index === 0 ? "Ex.: 12" : "Ex.: 6"} />{values.length > 2 && <button type="button" className="ghost iconBtn" aria-label="Remover etapa" onClick={()=>onRemove(index)}><X size={14}/></button>}</div>
      </label>)}
    </div>
    <button type="button" className="ghost small addSegmentButton" onClick={onAdd}><PlusCircle size={15}/> {restPause ? "Adicionar mini-série" : "Adicionar drop"}</button>
    <p className="repHint">{restPause ? "Na execução, cada mini-série aparece separadamente após a pausa curta." : "Na execução, cada queda de carga aparece separadamente."}</p>
    {incomplete && <p className="repWarning">Preencha pelo menos duas etapas.</p>}
  </section>
}

class ErrorBoundary extends React.Component {
  constructor(props){
    super(props);
    this.state = {error:null};
    this.handleWindowError = event => this.setState({error:event?.error?.message || event?.message || "Erro desconhecido"});
    this.handleUnhandledRejection = event => this.setState({error:event?.reason?.message || String(event?.reason || "Erro desconhecido")});
  }

  static getDerivedStateFromError(error){
    return {error:error?.message || String(error || "Erro desconhecido")};
  }

  componentDidCatch(error, info){
    console.error("Erro de renderização no aplicativo:", error, info);
  }

  componentDidMount(){
    window.addEventListener("error", this.handleWindowError);
    window.addEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  componentWillUnmount(){
    window.removeEventListener("error", this.handleWindowError);
    window.removeEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  async reloadSafely(){
    await dataService.clearDraft();
    location.reload();
  }

  render(){
    if(this.state.error) return <div className="app"><section className="formCard"><h2>Erro no aplicativo</h2><p className="muted">{String(this.state.error)}</p><button onClick={()=>this.reloadSafely()}>Recarregar limpando rascunho</button></section></div>;
    return this.props.children;
  }
}
createRoot(document.getElementById("root")).render(<ErrorBoundary><App /></ErrorBoundary>);


