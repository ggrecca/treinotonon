const numericValue = value => {
  const match = String(value || "").replace(",", ".").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
};

const decimalText = value => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? String(Math.round(numeric * 10) / 10).replace(".", ",") : "";
};

export const BODY_FAT_METHOD_REQUIREMENTS = {
  manual: {
    label: "Manual",
    required: ["BF manual"],
    lateralPolicy: "Não utiliza medidas laterais.",
  },
  jp3: {
    label: "Jackson & Pollock 3 dobras",
    required: {
      male: ["Idade", "Peitoral", "Abdominal", "Coxa (dobra cutânea)"],
      female: ["Idade", "Tríceps", "Supra-ilíaca", "Coxa (dobra cutânea)"],
    },
    lateralPolicy: "A dobra de coxa é um único ponto antropométrico do protocolo; não usa a circunferência lateral da coxa.",
  },
  jp7: {
    label: "Jackson & Pollock 7 dobras",
    required: ["Idade", "Peitoral", "Axilar média", "Tríceps", "Subescapular", "Abdominal", "Supra-ilíaca", "Coxa (dobra cutânea)"],
    lateralPolicy: "A dobra de coxa é um único ponto antropométrico do protocolo; não usa a circunferência lateral da coxa.",
  },
  navy: {
    label: "Navy / Circunferências",
    required: {
      male: ["Altura", "Pescoço", "Abdômen ou cintura"],
      female: ["Altura", "Pescoço", "Abdômen ou cintura", "Quadril"],
    },
    lateralPolicy: "Utiliza somente circunferências centrais. Não usa medidas laterais.",
  },
};

export function bodyFatMethodLabel(method){
  return BODY_FAT_METHOD_REQUIREMENTS[method]?.label || BODY_FAT_METHOD_REQUIREMENTS.manual.label;
}

const missingMessage = (method, fields) => `Preencha as medidas necessárias para ${bodyFatMethodLabel(method)}: ${fields.join(", ")}.`;

export function calculateBodyFat(data = {}){
  const method = data.bodyFatMethod || "manual";
  const sex = data.sex || "";
  const age = numericValue(data.age);
  const skinfold = key => numericValue(data[key]);
  const measure = key => numericValue(data[key]);
  const resultBase = {method, label:bodyFatMethodLabel(method)};

  if(method === "manual") return {...resultBase, message:""};
  if(!sex) return {...resultBase, message:"Informe o sexo para calcular o BF."};
  if((method === "jp3" || method === "jp7") && !age) return {...resultBase, message:"Informe a idade para calcular o BF."};

  let sum = 0;
  let density = 0;
  if(method === "jp3"){
    const fields = sex === "female"
      ? [["skinfoldTriceps", "Tríceps"], ["skinfoldSuprailiac", "Supra-ilíaca"], ["skinfoldThigh", "Coxa (dobra cutânea)"]]
      : [["skinfoldChest", "Peitoral"], ["skinfoldAbdominal", "Abdominal"], ["skinfoldThigh", "Coxa (dobra cutânea)"]];
    const values = fields.map(([key]) => skinfold(key));
    const missing = fields.filter(([, label], index) => !values[index]).map(([, label]) => label);
    if(missing.length) return {...resultBase, message:missingMessage(method, missing)};
    sum = values.reduce((total, value) => total + value, 0);
    density = sex === "female"
      ? 1.0994921 - 0.0009929 * sum + 0.0000023 * (sum ** 2) - 0.0001392 * age
      : 1.10938 - 0.0008267 * sum + 0.0000016 * (sum ** 2) - 0.0002574 * age;
  }

  if(method === "jp7"){
    const fields = [
      ["skinfoldChest", "Peitoral"], ["skinfoldMidaxillary", "Axilar média"], ["skinfoldTriceps", "Tríceps"],
      ["skinfoldSubscapular", "Subescapular"], ["skinfoldAbdominal", "Abdominal"], ["skinfoldSuprailiac", "Supra-ilíaca"],
      ["skinfoldThigh", "Coxa (dobra cutânea)"],
    ];
    const values = fields.map(([key]) => skinfold(key));
    const missing = fields.filter(([, label], index) => !values[index]).map(([, label]) => label);
    if(missing.length) return {...resultBase, message:missingMessage(method, missing)};
    sum = values.reduce((total, value) => total + value, 0);
    density = sex === "female"
      ? 1.097 - 0.00046971 * sum + 0.00000056 * (sum ** 2) - 0.00012828 * age
      : 1.112 - 0.00043499 * sum + 0.00000055 * (sum ** 2) - 0.00028826 * age;
  }

  if(method === "navy"){
    const height = measure("height") / 2.54;
    const neck = measure("neck") / 2.54;
    const waist = (measure("abdomen") || measure("cintura")) / 2.54;
    const hip = measure("hip") / 2.54;
    const missing = [
      !height && "Altura",
      !neck && "Pescoço",
      !waist && "Abdômen ou cintura",
      sex === "female" && !hip && "Quadril",
    ].filter(Boolean);
    const girth = sex === "female" ? waist + hip - neck : waist - neck;
    if(missing.length || girth <= 0) return {...resultBase, message:missing.length ? missingMessage(method, missing) : "As medidas informadas não formam uma circunferência válida para este método."};
    const bodyFat = sex === "female"
      ? 163.205 * Math.log10(girth) - 97.684 * Math.log10(height) - 78.387
      : 86.010 * Math.log10(girth) - 70.041 * Math.log10(height) + 36.76;
    return {...resultBase, calculated:decimalText(bodyFat), final:decimalText(bodyFat), message:""};
  }

  if(!density) return {...resultBase, message:"Preencha as medidas necessárias para este método."};
  const bodyFat = 495 / density - 450;
  return {...resultBase, calculated:decimalText(bodyFat), final:decimalText(bodyFat), density:decimalText(density), skinfoldSum:decimalText(sum), message:""};
}
