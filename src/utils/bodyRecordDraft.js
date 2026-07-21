const BODY_RECORD_DEFAULT_VALUES = {
  bodyFatMethod: "manual",
  sex: "male",
  useManualBodyFat: false,
};

/**
 * Mantém os campos editáveis como texto enquanto o usuário digita.
 * A conversão numérica continua acontecendo apenas na serialização do registro.
 */
export function createBodyRecordDraft(initialValues = {}) {
  return Object.fromEntries(Object.entries({
    ...BODY_RECORD_DEFAULT_VALUES,
    ...initialValues,
  }).map(([name, value]) => [
    name,
    name === "useManualBodyFat" ? Boolean(value) : value == null ? "" : String(value),
  ]));
}

export function patchBodyRecordDraft(values, {name, type, value, checked}) {
  return {
    ...values,
    [name]: type === "checkbox" ? Boolean(checked) : String(value ?? ""),
  };
}
