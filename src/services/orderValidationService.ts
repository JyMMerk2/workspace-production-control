export interface ValidationResult {
  contrato: string;
  area: string;
  modulo: string;
  subprocesosDetectados: string[];
  estado: 'CORRECTO' | 'INCONGRUENTE';
  anomalias: string[];
}

export const DICCIONARIO_MODULOS: Record<string, { area: string; modulo: string }> = {
  // APPAREL
  "C1": { area: "APPAREL", modulo: "Celda 1" },
  "CELDA 1": { area: "APPAREL", modulo: "Celda 1" },
  "C2": { area: "APPAREL", modulo: "Celda 2" },
  "CELDA 2": { area: "APPAREL", modulo: "Celda 2" },
  "C3": { area: "APPAREL", modulo: "Celda 3" },
  "CELDA 3": { area: "APPAREL", modulo: "Celda 3" },
  "C4": { area: "APPAREL", modulo: "Celda 4" },
  "CELDA 4": { area: "APPAREL", modulo: "Celda 4" },
  "P1": { area: "APPAREL", modulo: "Pants 1" },
  "PANTS 1": { area: "APPAREL", modulo: "Pants 1" },
  "PANTALONES 1": { area: "APPAREL", modulo: "Pants 1" },
  "P2": { area: "APPAREL", modulo: "Pants 2" },
  "PANTS 2": { area: "APPAREL", modulo: "Pants 2" },
  "PANTALONES 2": { area: "APPAREL", modulo: "Pants 2" },
  "GORRAS": { area: "APPAREL", modulo: "Hats" },
  "HATS": { area: "APPAREL", modulo: "Hats" },

  // MOCHILAS
  "CUSTOMS": { area: "MOCHILAS", modulo: "CUSTOM BAGS" },
  "CUSTOM": { area: "MOCHILAS", modulo: "CUSTOM BAGS" },
  "SP1": { area: "MOCHILAS", modulo: "SPUT 1" },
  "SP 1": { area: "MOCHILAS", modulo: "SPUT 1" },
  "SPUT 1": { area: "MOCHILAS", modulo: "SPUT 1" },
  "SUPER PACK UTILITY 1": { area: "MOCHILAS", modulo: "SPUT 1" },
  "SP2": { area: "MOCHILAS", modulo: "SPUT 2" },
  "SPUT 2": { area: "MOCHILAS", modulo: "SPUT 2" },
  "SPUT2": { area: "MOCHILAS", modulo: "SPUT 2" },
  "SUPER PACK UTILITY 2": { area: "MOCHILAS", modulo: "SPUT 2" },
  "BB1": { area: "MOCHILAS", modulo: "BIG BAG UTILITY 1" },
  "BIG BAG UTILITY 1": { area: "MOCHILAS", modulo: "BIG BAG UTILITY 1" },
  "BB2": { area: "MOCHILAS", modulo: "BIG BAG UTILITY 2" },
  "BIG BAG UTILITY 2": { area: "MOCHILAS", modulo: "BIG BAG UTILITY 2" },
  "UBL3": { area: "MOCHILAS", modulo: "UTILITY BAG LINE 3" },
  "UTILITY BAG LINE 3": { area: "MOCHILAS", modulo: "UTILITY BAG LINE 3" },

  // OTROS / GRUPOS ESPECIALES
  "TS": { area: "TEAM SPIRIT", modulo: "TEAM SPIRIT" },
  "SZ": { area: "SIZING PACK", modulo: "SIZING PACK" }
};

export function evaluarFlujoOrden(textoCompletoSlack: string, subprocesosOCR: string[]): ValidationResult {
  const textoLimpio = textoCompletoSlack.toUpperCase();
  const subprocesosUpper = subprocesosOCR.map(s => s.toUpperCase());
  
  // 1. Extraer Contrato (6 dígitos)
  const regexContrato = /\b\d{6}[A-Za-z0-9,]*/;
  const matchContrato = textoCompletoSlack.match(regexContrato);
  const contrato = matchContrato ? matchContrato[0] : "SIN_CONTRATO";

  // 2. Identificar Área y Módulo por texto
  let area = "POR CLASIFICAR";
  let modulo = "GENERAL";

  for (const [clave, datos] of Object.entries(DICCIONARIO_MODULOS)) {
    const regex = new RegExp(`\\b${clave}\\b`, "i");
    if (regex.test(textoLimpio)) {
      area = datos.area;
      modulo = datos.modulo;
      break;
    }
  }

  // Fallback por OCR si el texto es vago
  if (area === "POR CLASIFICAR") {
    const tieneSorteoOCR = subprocesosUpper.some(s => s.includes("SORTEO"));
    area = tieneSorteoOCR ? "APPAREL" : "MOCHILAS";
  }

  // 3. Evaluar Inconsistencias
  const tieneEntrada = subprocesosUpper.some(s => s.includes("ENTRADA ALMACEN") || s.includes("ENTRADA ALMACÉN"));
  const tieneSalida = subprocesosUpper.some(s => s.includes("SALIDA ALMACEN") || s.includes("SALIDA ALMACÉN"));
  const tieneSorteo = subprocesosUpper.some(s => s.includes("SORTEO"));

  const anomalias: string[] = [];

  // Reglas de Almacén
  if (!tieneEntrada && !tieneSalida) {
    anomalias.push("FALTA ENTRADA Y SALIDA ALMACÉN");
  } else if (!tieneEntrada) {
    anomalias.push("FALTA ENTRADA ALMACÉN");
  } else if (!tieneSalida) {
    anomalias.push("FALTA SALIDA ALMACÉN");
  }

  // Reglas por Tipo de Producto
  if (area === "MOCHILAS" && tieneSorteo) {
    anomalias.push("ERROR_RUTA: Mochila lleva Sorteo innecesario");
  }
  if (area === "APPAREL" && !tieneSorteo) {
    anomalias.push("ERROR_RUTA: Apparel le falta Sorteo obligatorio");
  }

  return {
    contrato,
    area,
    modulo,
    subprocesosDetectados: subprocesosOCR,
    estado: anomalias.length === 0 ? "CORRECTO" : "INCONGRUENTE",
    anomalias
  };
}

// Integración multimodal con OpenAI GPT-4o-mini (Frontend / Fetch)
export async function procesarConOpenAI(imageUrl: string, textoSlack: string, apiKey: string): Promise<ValidationResult> {
  const payload = {
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          { 
            type: "text", 
            text: "Extrae los textos de la columna Subproceso de las tablas visibles y devuélvelos en formato JSON con la clave 'subprocesos' como un arreglo de strings." 
          },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      }
    ],
    response_format: { type: "json_object" }
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  const json = await response.json();
  const parsedContent = JSON.parse(json.choices[0].message.content);
  const subprocesos: string[] = parsedContent.subprocesos || [];

  return evaluarFlujoOrden(textoSlack, subprocesos);
}
