import React, { useState, useEffect, useRef } from 'react';
import { createWorker } from 'tesseract.js';
import {
  Calculator,
  Camera,
  Plus,
  Trash2,
  Copy,
  Check,
  FileSpreadsheet,
  HelpCircle,
  TrendingUp,
  DollarSign,
  Layers,
  Sparkles,
  AlertCircle,
  Eye,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Image as ImageIcon,
  RotateCcw,
  X,
  RefreshCw,
} from 'lucide-react';
import { StyleBlockData, StyleCategory } from '../types';

const YOUTH_SIZES = ['YXXS', 'YXS', 'YS', 'YM', 'YL', 'YXL', 'Y2XL'];
const ADULT_SIZES = [
  'XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL',
  '20', '22', '24', '26', '28', '30', '32', '34', '36', '38', '40', '42', '44',
];

export const SizingCalculatorView: React.FC = () => {
  const [poGrandTotal, setPoGrandTotal] = useState<string>('1929.00');
  const [samplesDiscount, setSamplesDiscount] = useState<string>('0.00');
  const [copied, setCopied] = useState<boolean>(false);
  const [ocrStatus, setOcrStatus] = useState<string>('');
  const [isProcessingOcr, setIsProcessingOcr] = useState<boolean>(false);
  const [uploadedImageSrc, setUploadedImageSrc] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState<boolean>(false);
  const [imageZoomLevel, setImageZoomLevel] = useState<number>(1);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize with flexible starting blocks
  const [styles, setStyles] = useState<StyleBlockData[]>([
    {
      id: 1,
      code: 'FD-6112W',
      category: 'WOMENS',
      amount: 297.0,
      qtyYouth: {},
      qtyAdult: { XXS: 2, XS: 2, S: 2, M: 2, L: 2, XL: 2, '2XL': 2, '3XL': 2 },
      totalPcs: 16,
      exactPrice: 18.5625,
      roundedPrice: 18.5,
      roundNotes: 'Ajustado .50',
    },
    {
      id: 2,
      code: 'FD-6112G',
      category: 'YOUTH',
      amount: 192.0,
      qtyYouth: { YXS: 2, YS: 2, YM: 2, YL: 2, YXL: 2, Y2XL: 2 },
      qtyAdult: {},
      totalPcs: 12,
      exactPrice: 16.0,
      roundedPrice: 16.0,
      roundNotes: 'Exacto 4 Dec.',
    },
    {
      id: 3,
      code: 'FD-6073',
      category: 'ADULT',
      amount: 600.0,
      qtyYouth: {},
      qtyAdult: { S: 3, M: 3, L: 3, XL: 3, '2XL': 3, '3XL': 3, '4XL': 3, '5XL': 3 },
      totalPcs: 24,
      exactPrice: 25.0,
      roundedPrice: 25.0,
      roundNotes: 'Ajustado .50',
    },
    {
      id: 4,
      code: 'FD-6073Y',
      category: 'YOUTH',
      amount: 324.0,
      qtyYouth: { YXS: 3, YS: 3, YM: 3, YL: 3, YXL: 3, Y2XL: 3 },
      qtyAdult: {},
      totalPcs: 18,
      exactPrice: 18.0,
      roundedPrice: 18.0,
      roundNotes: 'Exacto 4 Dec.',
    },
    {
      id: 5,
      code: 'FD-6073W',
      category: 'WOMENS',
      amount: 516.0,
      qtyYouth: {},
      qtyAdult: { XXS: 3, XS: 3, S: 3, M: 3, L: 3, XL: 3, '2XL': 3, '3XL': 3 },
      totalPcs: 24,
      exactPrice: 21.5,
      roundedPrice: 21.5,
      roundNotes: 'Ajustado .50',
    },
  ]);

  const detectCategory = (code: string): StyleCategory => {
    if (!code) return 'ADULT';
    const clean = code.toUpperCase().trim();
    if (
      clean.endsWith('Y') ||
      clean.endsWith('G') ||
      clean.includes('-Y') ||
      clean.includes('-G') ||
      clean.includes('YOUTH') ||
      clean.includes('GIRL')
    ) {
      return 'YOUTH';
    }
    if (clean.endsWith('W') || clean.includes('-W') || clean.includes('WOMEN') || clean.includes('LADY')) {
      return 'WOMENS';
    }
    return 'ADULT';
  };

  const calculateStyle = (block: StyleBlockData): StyleBlockData => {
    const category = detectCategory(block.code);
    let totalPcs = 0;

    Object.values(block.qtyYouth).forEach((v) => {
      totalPcs += Number(v) || 0;
    });
    Object.values(block.qtyAdult).forEach((v) => {
      totalPcs += Number(v) || 0;
    });

    const amountNum = typeof block.amount === 'number' ? block.amount : parseFloat(block.amount) || 0;

    let exactPrice = 0;
    let roundedPrice = 0;
    let roundNotes = '';

    if (totalPcs > 0 && amountNum > 0) {
      exactPrice = amountNum / totalPcs;
      const decimals = (exactPrice.toString().split('.')[1] || '').length;

      if (decimals > 2 && (category === 'ADULT' || category === 'WOMENS')) {
        roundedPrice = Math.round(exactPrice * 2) / 2;
        roundNotes = 'Ajustado .50';
      } else {
        roundedPrice = Number(exactPrice.toFixed(4));
        roundNotes = 'Exacto 4 Dec.';
      }
    }

    return {
      ...block,
      category,
      totalPcs,
      exactPrice,
      roundedPrice,
      roundNotes,
    };
  };

  const updateStyleField = (
    id: number,
    field: 'code' | 'amount',
    val: string | number
  ) => {
    setStyles((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, [field]: val };
        return calculateStyle(updated);
      })
    );
  };

  const updateQuantity = (
    id: number,
    type: 'youth' | 'adult',
    sizeKey: string,
    val: string
  ) => {
    const numericVal = val === '' ? 0 : parseInt(val, 10) || 0;

    setStyles((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        if (type === 'youth') {
          const newYouth = { ...s.qtyYouth, [sizeKey]: numericVal };
          if (numericVal === 0) delete newYouth[sizeKey];
          return calculateStyle({ ...s, qtyYouth: newYouth });
        } else {
          const newAdult = { ...s.qtyAdult, [sizeKey]: numericVal };
          if (numericVal === 0) delete newAdult[sizeKey];
          return calculateStyle({ ...s, qtyAdult: newAdult });
        }
      })
    );
  };

  const addStyleBlock = (defaultCode = '', defaultAmount: number | '' = '') => {
    const nextId = styles.length > 0 ? Math.max(...styles.map((s) => s.id)) + 1 : 1;
    const newBlock: StyleBlockData = calculateStyle({
      id: nextId,
      code: defaultCode || `FD-${160 + nextId}`,
      category: detectCategory(defaultCode),
      amount: defaultAmount,
      qtyYouth: {},
      qtyAdult: {},
      totalPcs: 0,
      exactPrice: 0,
      roundedPrice: 0,
    });
    setStyles((prev) => [...prev, newBlock]);
  };

  const removeStyleBlock = (id: number) => {
    setStyles((prev) => prev.filter((s) => s.id !== id));
  };

  const resetAllCalculator = () => {
    setPoGrandTotal('');
    setSamplesDiscount('');
    setUploadedImageSrc(null);
    setImageZoomLevel(1);
    setIsImageModalOpen(false);
    setOcrStatus('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setStyles([
      calculateStyle({
        id: 1,
        code: '',
        category: 'ADULT',
        amount: '',
        qtyYouth: {},
        qtyAdult: {},
        totalPcs: 0,
        exactPrice: 0,
        roundedPrice: 0,
        roundNotes: '',
      }),
    ]);
  };

  // Helper to extract sizes and quantities from text description or range
  const expandRange = (
    start: string,
    end: string,
    packQty: number
  ): { qtyYouth: Record<string, number>; qtyAdult: Record<string, number> } => {
    const qtyYouth: Record<string, number> = {};
    const qtyAdult: Record<string, number> = {};

    const cleanStart = start.replace(/["”″'\s]/g, '');
    const cleanEnd = end.replace(/["”″'\s]/g, '');

    const normStart = cleanStart.toUpperCase().replace(/^2XS$/, 'XXS').replace(/^3XS$/, 'XXXS').replace(/^2XL$/, '2XL');
    const normEnd = cleanEnd.toUpperCase().replace(/^2XS$/, 'XXS').replace(/^3XS$/, 'XXXS').replace(/^2XL$/, '2XL');

    const youthIdxStart = YOUTH_SIZES.indexOf(normStart);
    const youthIdxEnd = YOUTH_SIZES.indexOf(normEnd);

    if (youthIdxStart !== -1 && youthIdxEnd !== -1 && youthIdxStart <= youthIdxEnd) {
      for (let i = youthIdxStart; i <= youthIdxEnd; i++) {
        qtyYouth[YOUTH_SIZES[i]] = packQty;
      }
      return { qtyYouth, qtyAdult };
    }

    const adultIdxStart = ADULT_SIZES.indexOf(normStart);
    const adultIdxEnd = ADULT_SIZES.indexOf(normEnd);

    if (adultIdxStart !== -1 && adultIdxEnd !== -1 && adultIdxStart <= adultIdxEnd) {
      for (let i = adultIdxStart; i <= adultIdxEnd; i++) {
        qtyAdult[ADULT_SIZES[i]] = packQty;
      }
      return { qtyYouth, qtyAdult };
    }

    // Check numeric pants range (e.g. 20 to 44, 22 to 30, 30 to 44)
    const numStart = parseInt(normStart, 10);
    const numEnd = parseInt(normEnd, 10);
    if (!isNaN(numStart) && !isNaN(numEnd) && numStart <= numEnd) {
      ADULT_SIZES.forEach((sz) => {
        const val = parseInt(sz, 10);
        if (!isNaN(val) && val >= numStart && val <= numEnd) {
          qtyAdult[sz] = packQty;
        }
      });
      return { qtyYouth, qtyAdult };
    }

    return { qtyYouth, qtyAdult };
  };

  // Deep OCR size extractor supporting composite (Youth + Adult) and single ranges
  const extractSizesFromDescription = (text: string, packQty: number = 1) => {
    let qtyYouth: Record<string, number> = {};
    let qtyAdult: Record<string, number> = {};
    const clean = text.toUpperCase();

    // 1. Composite Numeric Range: e.g. "Youth: 22"-30" Adult: 30"-44"" or "Youth: 20-33 Adult: 30-44"
    const youthNumMatch = clean.match(/YOUTH:?\s*\(?(?:SIZES:?\s*)?(\d{2})["”″]?\s*(?:-|–|—|TO)\s*(\d{2})["”″]?\)?/i);
    const adultNumMatch = clean.match(/ADULT:?\s*\(?(?:SIZES:?\s*)?(\d{2})["”″]?\s*(?:-|–|—|TO)\s*(\d{2})["”″]?\)?/i);

    if (youthNumMatch || adultNumMatch) {
      if (youthNumMatch) {
        const resY = expandRange(youthNumMatch[1], youthNumMatch[2], packQty);
        qtyYouth = { ...qtyYouth, ...resY.qtyYouth };
        qtyAdult = { ...qtyAdult, ...resY.qtyAdult };
      }
      if (adultNumMatch) {
        const resA = expandRange(adultNumMatch[1], adultNumMatch[2], packQty);
        qtyYouth = { ...qtyYouth, ...resA.qtyYouth };
        qtyAdult = { ...qtyAdult, ...resA.qtyAdult };
      }
      return { qtyYouth, qtyAdult };
    }

    // 2. Standalone Numeric Range: e.g. "22"-30"", "20-44", "28"-42"", "30"-44""
    const standaloneNumMatch = clean.match(/\b(\d{2})["”″]?\s*(?:-|–|—|TO)\s*(\d{2})["”″]?\b/i);
    if (standaloneNumMatch) {
      const res = expandRange(standaloneNumMatch[1], standaloneNumMatch[2], packQty);
      if (Object.values(res.qtyAdult).some((v) => v > 0)) {
        return res;
      }
    }

    // 3. Explicit Letter Ranges
    // Youth range: YXS - Y2XL or YXXS - Y2XL
    const youthRangeMatch = clean.match(/(YXXS|YXS|YS|YM|YL|YXL)\s*(?:-|–|—|TO)\s*(Y2XL|YXL|YL)/i);
    if (youthRangeMatch) {
      return expandRange(youthRangeMatch[1], youthRangeMatch[2], packQty);
    }

    // Adult/Womens range: XXS - 3XL or XXXS - 3XL or S - 5XL or XS - 5XL
    const adultRangeMatch = clean.match(/(XXXS|XXS|2XS|XS|S|M|L)\s*(?:-|–|—|TO)\s*(5XL|4XL|3XL|XXXL|2XL|XL)/i);
    if (adultRangeMatch) {
      return expandRange(adultRangeMatch[1], adultRangeMatch[2], packQty);
    }

    // 4. Keyword Fallback Checks
    const lower = text.toLowerCase();
    if (lower.includes('yxs') && (lower.includes('y2xl') || lower.includes('yxl'))) {
      return expandRange('YXS', 'Y2XL', packQty);
    }
    if (lower.includes('yxxs') && lower.includes('y2xl')) {
      return expandRange('YXXS', 'Y2XL', packQty);
    }
    if (lower.includes('xxs') && lower.includes('3xl')) {
      return expandRange('XXS', '3XL', packQty);
    }
    if (lower.includes('xxxs') && lower.includes('3xl')) {
      return expandRange('XXXS', '3XL', packQty);
    }
    if (lower.includes('s - 5xl') || lower.includes('s-5xl') || (lower.includes('adult') && lower.includes('5xl')) || (lower.includes('adult') && lower.includes('s'))) {
      return expandRange('S', '5XL', packQty);
    }
    if (lower.includes('xs - 5xl') || lower.includes('xs-5xl')) {
      return expandRange('XS', '5XL', packQty);
    }
    if (lower.includes('xs - 3xl') || lower.includes('xs-3xl')) {
      return expandRange('XS', '3XL', packQty);
    }

    return { qtyYouth, qtyAdult };
  };

  // Helper to auto-fill the correct sizes for a specific style based on its category and code
  const autoFillStyle = (styleId: number) => {
    setStyles((prev) =>
      prev.map((s) => {
        if (s.id !== styleId) return s;

        const cat = s.category || detectCategory(s.code);
        const codeUpper = s.code.toUpperCase();

        // Check if there are already existing non-zero values to preserve quantity preference or default to 2
        const youthVals = Object.values(s.qtyYouth) as number[];
        const adultVals = Object.values(s.qtyAdult) as number[];
        const existingValues = [...youthVals, ...adultVals].filter((v) => Number(v) > 0);
        const detectedQty = existingValues.length > 0 ? Number(existingValues[0]) : 2;

        let res: { qtyYouth: Record<string, number>; qtyAdult: Record<string, number> };

        if (codeUpper.startsWith('PS-') || codeUpper.includes('PANT') || codeUpper.includes('BASEBALL') || codeUpper.includes('KNICKER')) {
          // General baseball/pants range 22 to 44
          res = expandRange('22', '44', detectedQty);
        } else if (cat === 'YOUTH' || codeUpper.endsWith('G') || codeUpper.endsWith('Y')) {
          res = expandRange('YXS', 'Y2XL', detectedQty);
        } else if (cat === 'WOMENS' || codeUpper.endsWith('W')) {
          res = expandRange('XXS', '3XL', detectedQty);
        } else {
          // Default Adult
          res = expandRange('S', '5XL', detectedQty);
        }

        return calculateStyle({
          ...s,
          qtyYouth: res.qtyYouth,
          qtyAdult: res.qtyAdult,
        });
      })
    );
  };

  const clearStyleSizes = (styleId: number) => {
    setStyles((prev) =>
      prev.map((s) => {
        if (s.id !== styleId) return s;
        return calculateStyle({
          ...s,
          qtyYouth: {},
          qtyAdult: {},
        });
      })
    );
  };

  // OCR Processing with Tesseract
  const processImageFile = async (file: File) => {
    if (!file) return;

    // Create persistent preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setUploadedImageSrc(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);

    setIsProcessingOcr(true);
    setOcrStatus('⌛ Analizando orden de compra con Tesseract OCR...');

    try {
      const worker = await createWorker('eng');
      const ret = await worker.recognize(file);
      await worker.terminate();

      const text = ret.data.text;
      setOcrStatus('✓ ¡Imagen analizada! Extrayendo todos los estilos y montos...');

      // 1. Find PO Grand Total (e.g. Total $1,929.00 or $1929.00 or Total 1,929.00)
      const totalMatch = text.match(/Total\s*\$?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2}))/i);
      if (totalMatch && totalMatch[1]) {
        setPoGrandTotal(totalMatch[1].replace(/,/g, ''));
      } else {
        const anyAmountMatches = text.match(/\$?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2}))/g);
        if (anyAmountMatches && anyAmountMatches.length > 0) {
          const numbers = anyAmountMatches
            .map((m) => parseFloat(m.replace(/[$,\s]/g, '')))
            .filter((n) => !isNaN(n));
          if (numbers.length > 0) {
            const maxVal = Math.max(...numbers);
            setPoGrandTotal(maxVal.toFixed(2));
          }
        }
      }

      // 2. Parse lines to extract ALL style items with full context
      const rawLines = text.split('\n');
      interface ExtractedLineItem {
        code: string;
        amount: number;
        rate: number;
        packQty: number;
        description: string;
      }
      const extractedItems: ExtractedLineItem[] = [];

      // Split the document into item chunks by item markers (BAU-, FD-, BM-, PS-, MID:, SIZING PACK)
      const itemBlocks = text.split(/(?=BAU-|FD-|BM-|PS-|MID:|SIZING PACK|[0-9]{12})/gi);

      for (const block of itemBlocks) {
        if (!block || block.trim().length < 10) continue;

        // Find Style Code from MID or Item:
        // Case 1: MID with slash (e.g. "MID: BM-5273/5273Y" or "MID: BM-5273 / BM-5273Y")
        const midSlashMatch = block.match(/MID:\s*([A-Za-z]{1,4}-[0-9]{3,4}[A-Za-z]?)\s*\/\s*([A-Za-z0-9_-]+)/i);
        
        // Case 2: Standard MID (e.g. "MID: BM-5273", "MID: FD-6112W", "MID: PS-401")
        const midMatch = block.match(/MID:\s*([A-Za-z0-9_-]+)/i);
        
        // Case 3: Code from item column (e.g. "BM-5273", "FD-6073Y")
        const codeMatch = block.match(/([FBP][A-Z0-9]{1,5}-[A-Za-z0-9_-]+)/i);

        // Determine style code(s)
        let resolvedCodes: string[] = [];
        if (midSlashMatch) {
          const prefix = midSlashMatch[1].split('-')[0] || 'BM';
          const firstCode = midSlashMatch[1].toUpperCase();
          let secondPart = midSlashMatch[2].toUpperCase();
          if (!secondPart.includes('-')) {
            secondPart = `${prefix}-${secondPart}`;
          }
          resolvedCodes = [firstCode, secondPart];
        } else if (midMatch) {
          const cleanMid = midMatch[1].toUpperCase();
          resolvedCodes = [cleanMid];
        } else if (codeMatch) {
          resolvedCodes = [codeMatch[1].toUpperCase()];
        }

        if (resolvedCodes.length === 0) continue;

        // Find decimal amounts & rates in this block (including comma formats like 1,227.50)
        const rawMatches = block.match(/\b([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2})\b/g) || [];
        const decimalNumbers = rawMatches
          .map((str) => parseFloat(str.replace(/,/g, '')))
          .filter((n) => !isNaN(n));

        let foundAmount = 0;
        let foundRate = 0;
        let packQty = 2; // sensible default for sizing packs

        if (decimalNumbers.length >= 2) {
          const sorted = [...decimalNumbers].sort((a, b) => b - a);
          foundAmount = sorted[0]; // highest is total amount (e.g. 1227.50)
          foundRate = sorted[1];   // second highest is rate (e.g. 245.50)
          if (foundRate > 0 && foundAmount >= foundRate) {
            const calculatedQty = Math.round(foundAmount / foundRate);
            if (calculatedQty >= 1 && calculatedQty <= 30) {
              packQty = calculatedQty;
            }
          }
        } else if (decimalNumbers.length === 1) {
          foundAmount = decimalNumbers[0];
        }

        // Look for explicit Quantity column (e.g. "Quantity: 5", " 5  245.50  1,227.50 ")
        const explicitQtyMatch = block.match(/(?:Quantity\s*[:\s]?\s*|\b)([1-9][0-9]?)\s+[0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2}/i);
        if (explicitQtyMatch) {
          const parsedQty = parseInt(explicitQtyMatch[1], 10);
          if (!isNaN(parsedQty) && parsedQty >= 1 && parsedQty <= 50) {
            packQty = parsedQty;
          }
        }

        for (const code of resolvedCodes) {
          if (extractedItems.some((it) => it.code === code)) continue;
          extractedItems.push({
            code,
            amount: resolvedCodes.length > 1 ? Number((foundAmount / resolvedCodes.length).toFixed(2)) : foundAmount,
            rate: foundRate,
            packQty,
            description: block,
          });
        }
      }

      // Fallback: If chunk split didn't find codes, use global regex
      if (extractedItems.length === 0) {
        const stylePattern = /(?:MID:\s*)?([FBP][A-Z0-9]{1,5}-[A-Za-z0-9_-]+)/gi;
        const allFoundCodes: string[] = [];
        let match;
        while ((match = stylePattern.exec(text)) !== null) {
          const code = match[1].toUpperCase();
          if (!allFoundCodes.includes(code)) allFoundCodes.push(code);
        }

        for (const code of allFoundCodes) {
          let foundAmount = 0;
          let foundPackQty = 2;
          let lineContext = '';

          for (const line of rawLines) {
            if (line.toUpperCase().includes(code)) {
              lineContext += ' ' + line;
              const rawLineMatches = line.match(/\b([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2})\b/g);
              if (rawLineMatches && rawLineMatches.length > 0) {
                const parsed = rawLineMatches
                  .map((m) => parseFloat(m.replace(/,/g, '')))
                  .filter((n) => n > 50);
                if (parsed.length > 0) foundAmount = Math.max(...parsed);
              }
              const qtyMatch = line.match(/(?:Quantity\s*[:\s]?\s*|\b)([1-9][0-9]?)\s+[0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2}/i);
              if (qtyMatch) {
                foundPackQty = parseInt(qtyMatch[1], 10);
              }
            }
          }

          extractedItems.push({
            code,
            amount: foundAmount,
            rate: 0,
            packQty: foundPackQty,
            description: lineContext,
          });
        }
      }

      // 3. Populate ALL extracted styles in state with exact sizes
      if (extractedItems.length > 0) {
        const newStyleBlocks: StyleBlockData[] = extractedItems.map((item, index) => {
          const category = detectCategory(item.code);
          let { qtyYouth, qtyAdult } = extractSizesFromDescription(item.description, item.packQty);

          // If sizes could not be extracted directly from text, apply category smart defaults
          const hasSizes = Object.values(qtyYouth).some((v) => v > 0) || Object.values(qtyAdult).some((v) => v > 0);
          if (!hasSizes) {
            if (item.code.includes('BASEBALL') || item.code.includes('PANT') || item.code.startsWith('PS-')) {
              const res = expandRange('22', '44', item.packQty);
              qtyYouth = res.qtyYouth;
              qtyAdult = res.qtyAdult;
            } else if (category === 'YOUTH') {
              const res = expandRange('YXS', 'Y2XL', item.packQty);
              qtyYouth = res.qtyYouth;
              qtyAdult = res.qtyAdult;
            } else if (category === 'WOMENS') {
              const res = expandRange('XXS', '3XL', item.packQty);
              qtyYouth = res.qtyYouth;
              qtyAdult = res.qtyAdult;
            } else {
              // Default Adult S - 5XL
              const res = expandRange('S', '5XL', item.packQty);
              qtyYouth = res.qtyYouth;
              qtyAdult = res.qtyAdult;
            }
          }

          const block: StyleBlockData = {
            id: index + 1,
            code: item.code,
            category,
            amount: item.amount > 0 ? item.amount : '',
            qtyYouth,
            qtyAdult,
            totalPcs: 0,
            exactPrice: 0,
            roundedPrice: 0,
          };
          return calculateStyle(block);
        });

        setStyles(newStyleBlocks);
        setOcrStatus(`✓ Se detectaron ${newStyleBlocks.length} estilos con todas sus tallas y montos`);
      } else {
        setOcrStatus('✓ PO procesado. Complete los campos requeridos');
      }

      setTimeout(() => setOcrStatus('✓ PO procesado correctamente'), 4000);
    } catch (err) {
      setOcrStatus('⚠️ No se pudo procesar automáticamente. Verifique la imagen o ingrese los datos manualmente.');
    } finally {
      setIsProcessingOcr(false);
    }
  };

  // Global Clipboard Paste Listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            processImageFile(blob);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Aggregate stats
  const totalCombinedPcs = styles.reduce((acc, s) => acc + s.totalPcs, 0);
  const totalStylesAmount = styles.reduce(
    (acc, s) => acc + (typeof s.amount === 'number' ? s.amount : parseFloat(s.amount) || 0),
    0
  );
  const grandTotalNum = parseFloat(poGrandTotal) || 0;
  const samplesDiscountNum = parseFloat(samplesDiscount) || 0;
  const netPoTotal = grandTotalNum - samplesDiscountNum;
  const amountVariance = netPoTotal - totalStylesAmount;

  const copyBreakdownSummary = () => {
    let summary = `=== RESUMEN SIZING PACKS PARA NEWSOFT ===\n`;
    summary += `PO Total: $${grandTotalNum.toFixed(2)} USD | Total Estilos: ${styles.length} | Prendas Totales: ${totalCombinedPcs} pcs\n\n`;

    styles.forEach((s) => {
      summary += `[ESTILO ${s.code}] Categoría: ${s.category}\n`;
      summary += `Monto: $${(typeof s.amount === 'number' ? s.amount : 0).toFixed(2)} USD | Prendas: ${s.totalPcs} pcs\n`;
      summary += `Precio Exacto: $${s.exactPrice.toFixed(4)} USD | Precio Newsoft Sugerido: $${s.roundedPrice.toFixed(2)} USD\n`;

      const youthEntries = Object.entries(s.qtyYouth).filter(([_, v]) => Number(v) > 0);
      if (youthEntries.length > 0) {
        summary += `  Tallas Youth: ` + youthEntries.map(([k, v]) => `${k}:${v}`).join(', ') + `\n`;
      }
      const adultEntries = Object.entries(s.qtyAdult).filter(([_, v]) => Number(v) > 0);
      if (adultEntries.length > 0) {
        summary += `  Tallas Adult: ` + adultEntries.map(([k, v]) => `${k}:${v}`).join(', ') + `\n`;
      }
      summary += `\n`;
    });

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Title Divider */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b-2 border-[#00f2fe]/30">
        <div className="flex items-center gap-2 text-sm md:text-base font-extrabold uppercase tracking-wider text-[#00f2fe]">
          <Calculator className="w-5 h-5" />
          <span>CALCULADORA MULTI-ESTILO CON LECTURA AUTOMÁTICA DE IMAGEN (OCR)</span>
        </div>
        <div className="flex items-center gap-2">
          {uploadedImageSrc && (
            <button
              onClick={() => setIsImageModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00f2fe]/10 border border-[#00f2fe]/40 text-[#00f2fe] text-xs font-bold hover:bg-[#00f2fe] hover:text-[#0b0e14] transition-all cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Ver Imagen del PO</span>
            </button>
          )}
          <button
            onClick={resetAllCalculator}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500 hover:text-white text-xs font-black transition-all cursor-pointer shadow-[0_0_10px_rgba(239,68,68,0.2)]"
            title="Borrar todos los datos y reiniciar la calculadora para un nuevo PO"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Limpiar Todo / Nuevo Cálculo</span>
          </button>
        </div>
      </div>

      {/* Persistent PO Image Display & Drop Zone */}
      {uploadedImageSrc ? (
        <div className="bg-[#12161f] border border-[#00f2fe]/40 rounded-xl p-4 shadow-[0_0_20px_rgba(0,242,254,0.15)] relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#39ff14] shadow-[0_0_8px_#39ff14]"></span>
              <span className="text-xs font-extrabold text-[#00f2fe] uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4" />
                <span>Documento / Imagen del PO Cargado</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsImageModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#00f2fe]/15 border border-[#00f2fe]/40 text-[#00f2fe] text-xs font-bold hover:bg-[#00f2fe] hover:text-[#0b0e14] transition-all cursor-pointer"
                title="Inspeccionar a pantalla completa"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Ampliar PO</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-gray-300 text-xs font-bold hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                title="Cambiar imagen"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Cambiar Foto</span>
              </button>

              <button
                onClick={() => {
                  setUploadedImageSrc(null);
                  setOcrStatus('');
                }}
                className="p-1 rounded-md text-gray-400 hover:text-[#ff007f] hover:bg-[#ff007f]/10 transition-all cursor-pointer"
                title="Quitar imagen"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* Image Preview Box */}
            <div
              onClick={() => setIsImageModalOpen(true)}
              className="md:col-span-2 relative group max-h-56 bg-[#090c10] border border-white/10 rounded-lg overflow-hidden flex items-center justify-center cursor-zoom-in"
            >
              <img
                src={uploadedImageSrc}
                alt="Purchase Order Boombah"
                className="w-full h-full object-contain max-h-56 transition-transform duration-300 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-bold text-xs">
                <ZoomIn className="w-4 h-4 text-[#00f2fe]" />
                <span>Clic para inspeccionar y hacer zoom</span>
              </div>
            </div>

            {/* Quick Actions & Status */}
            <div className="space-y-3 bg-[#0d1017] p-3.5 rounded-lg border border-white/5 text-xs">
              <div>
                <span className="text-[10px] font-bold text-[#8f9ba8] uppercase block">Estado de Lectura:</span>
                <span className="text-[#39ff14] font-bold">
                  {ocrStatus || '✓ Procesado y listo para verificación'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#8f9ba8] uppercase block">Estilos Detectados:</span>
                <span className="text-[#00f2fe] font-mono font-bold">{styles.length} estilos en orden</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Puedes consultar los códigos de item, cantidades y rates directamente en la vista ampliada mientras ajustas las tallas abajo.
              </p>
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && processImageFile(e.target.files[0])}
            accept="image/*"
            className="hidden"
          />
        </div>
      ) : (
        /* OCR Drag & Drop Zone */
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) processImageFile(file);
          }}
          className={`bg-[#12161f] border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
            isProcessingOcr
              ? 'border-[#ffe600] bg-[#ffe600]/5 shadow-[0_0_15px_rgba(255,230,0,0.2)]'
              : 'border-[#00f2fe]/50 hover:border-[#00f2fe] bg-[#00f2fe]/5 hover:bg-[#00f2fe]/10 shadow-[0_0_15px_rgba(0,242,254,0.1)]'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && processImageFile(e.target.files[0])}
            accept="image/*"
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center space-y-1.5">
            <Camera className="w-6 h-6 text-[#00f2fe] mb-1 animate-bounce" />
            <p className="font-extrabold text-[#00f2fe] text-xs md:text-sm uppercase tracking-wide">
              📸 ARRASTRA, PEGA (CTRL+V) O HAZ CLIC AQUÍ PARA SUBIR LA FOTO DEL PO
            </p>
            <span className="text-[11px] text-[#8f9ba8]">
              El motor OCR inteligente leerá automáticamente todos los estilos, cantidades y montos del documento.
            </span>
            {ocrStatus && (
              <div className="mt-2 text-xs font-bold text-[#ffe600] bg-[#ffe600]/10 px-3 py-1 rounded-full border border-[#ffe600]/30 animate-pulse">
                {ocrStatus}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Zoom Viewer for PO Image */}
      {isImageModalOpen && uploadedImageSrc && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-5xl bg-[#12161f] border border-[#00f2fe]/50 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-[#0d1017]">
              <div className="flex items-center gap-2 text-xs font-bold text-[#00f2fe] uppercase tracking-wider">
                <ImageIcon className="w-4 h-4" />
                <span>Inspección de Orden de Compra (PO)</span>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setImageZoomLevel((prev) => Math.max(0.6, prev - 0.2))}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
                  title="Alejar"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-bold text-[#00f2fe] px-1">
                  {Math.round(imageZoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setImageZoomLevel((prev) => Math.min(3, prev + 0.2))}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
                  title="Acercar"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setImageZoomLevel(1)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
                  title="Restablecer escala"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <div className="w-px h-5 bg-white/10 mx-1"></div>
                <button
                  onClick={() => setIsImageModalOpen(false)}
                  className="p-1.5 rounded-lg bg-[#ff007f]/10 text-[#ff007f] hover:bg-[#ff007f] hover:text-white transition-all cursor-pointer"
                  title="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Image Area */}
            <div className="flex-1 p-4 overflow-auto flex items-center justify-center bg-[#07090e]">
              <img
                src={uploadedImageSrc}
                alt="PO Inspect Full"
                style={{ transform: `scale(${imageZoomLevel})`, transformOrigin: 'center center' }}
                className="max-w-full max-h-[75vh] object-contain transition-transform duration-150 rounded"
              />
            </div>
          </div>
        </div>
      )}

      {/* General PO Data Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Left PO inputs */}
        <div className="bg-[#12161f] border border-[#00f2fe]/30 rounded-xl p-5 shadow-[0_8px_25px_rgba(0,0,0,0.3)]">
          <div className="text-xs font-extrabold uppercase tracking-wider text-[#00f2fe] mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            <span>Datos Generales del PO</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8f9ba8] mb-1">
                Monto Total del PO ($ USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#00f2fe] font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={poGrandTotal}
                  onChange={(e) => setPoGrandTotal(e.target.value)}
                  placeholder="Ej: 1929.00"
                  className="w-full pl-8 pr-4 py-2 bg-[#0d1017] border border-[#00f2fe]/40 rounded-lg text-white font-mono font-bold text-sm focus:outline-none focus:border-[#00f2fe] focus:shadow-[0_0_10px_rgba(0,242,254,0.3)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8f9ba8] mb-1">
                Descuento / Muestras ($ USD) — Opcional
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={samplesDiscount}
                  onChange={(e) => setSamplesDiscount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-2 bg-[#0d1017] border border-white/10 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-[#00f2fe]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Summary */}
        <div className="bg-[#12161f] border border-[#39ff14]/30 rounded-xl p-5 shadow-[0_8px_25px_rgba(0,0,0,0.3)] flex flex-col justify-between">
          <div>
            <div className="text-xs font-extrabold uppercase tracking-wider text-[#39ff14] mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span>Resumen Global de la Orden</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#8f9ba8]">Total Estilos:</div>
                <div className="text-xl font-black text-[#00f2fe] mt-1">{styles.length} Estilos</div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#8f9ba8]">Prendas Combinadas:</div>
                <div className="text-2xl font-black text-[#ffe600] mt-1">{totalCombinedPcs} pcs</div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#8f9ba8]">Monto Asignado:</div>
                <div className="text-base font-mono font-bold text-white mt-1">
                  ${totalStylesAmount.toFixed(2)} USD
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#8f9ba8]">Diferencia Cuadre:</div>
                <div
                  className={`text-base font-mono font-bold mt-1 ${
                    Math.abs(amountVariance) < 0.05 ? 'text-[#39ff14]' : 'text-[#ff007f]'
                  }`}
                >
                  ${amountVariance.toFixed(2)} USD
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={copyBreakdownSummary}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#39ff14]/15 border border-[#39ff14]/50 text-[#39ff14] text-xs font-bold hover:bg-[#39ff14] hover:text-[#0b0e14] transition-all cursor-pointer shadow-[0_0_10px_rgba(57,255,20,0.2)]"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '¡Copiado para Newsoft!' : 'Copiar Resumen para Newsoft'}</span>
            </button>

            <button
              type="button"
              onClick={resetAllCalculator}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/40 text-xs font-black transition-all cursor-pointer shadow-[0_0_10px_rgba(239,68,68,0.2)]"
              title="Borrar todos los campos, imagen y estilos para comenzar un nuevo cálculo"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>🧹 Limpiar Todo / Nuevo Cálculo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Style Blocks List Header */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-sm font-extrabold uppercase tracking-wider text-[#00f2fe]">
          LISTA DE ESTILOS DE LA ORDEN ({styles.length})
        </span>
        <button
          onClick={() => addStyleBlock()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#39ff14]/15 border border-[#39ff14] text-[#39ff14] text-xs font-bold hover:bg-[#39ff14] hover:text-[#0b0e14] transition-all shadow-[0_0_12px_rgba(57,255,20,0.3)] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>AGREGAR OTRO ESTILO</span>
        </button>
      </div>

      {/* Dynamic Style Blocks */}
      <div className="space-y-6">
        {styles.map((style, idx) => {
          return (
            <div
              key={style.id}
              className="bg-[#12161f] border border-white/10 rounded-xl p-5 shadow-[0_8px_25px_rgba(0,0,0,0.3)] relative overflow-hidden"
            >
              {/* Style Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black uppercase tracking-wider text-[#00f2fe]">
                    👕 ESTILO #{idx + 1}:
                  </span>
                  <input
                    type="text"
                    value={style.code}
                    onChange={(e) => updateStyleField(style.id, 'code', e.target.value)}
                    placeholder="Código (ej: FD-6112W, FD-6073Y, BM-9021)"
                    className="px-3 py-1 bg-[#0d1017] border border-[#00f2fe]/50 rounded text-xs font-bold text-white focus:outline-none focus:border-[#00f2fe]"
                  />
                  {/* Category Badge */}
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                      style.category === 'YOUTH'
                        ? 'bg-[#ff007f]/20 border-[#ff007f] text-[#ff007f]'
                        : style.category === 'WOMENS'
                        ? 'bg-[#ffe600]/20 border-[#ffe600] text-[#ffe600]'
                        : 'bg-[#00f2fe]/20 border-[#00f2fe] text-[#00f2fe]'
                    }`}
                  >
                    {style.category === 'YOUTH'
                      ? 'NIÑO / YOUTH'
                      : style.category === 'WOMENS'
                      ? 'MUJER / WOMENS'
                      : 'HOMBRE / ADULTO'}
                  </span>
                </div>

                <button
                  onClick={() => removeStyleBlock(style.id)}
                  className="flex items-center gap-1 text-[11px] text-[#ff007f] hover:text-white px-2 py-1 rounded bg-[#ff007f]/10 border border-[#ff007f]/30 hover:bg-[#ff007f] transition-all cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Eliminar Estilo</span>
                </button>
              </div>

              {/* Price & Quantity Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8f9ba8] mb-1">
                    Monto del Estilo ($ USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#00f2fe] font-bold text-xs">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={style.amount}
                      onChange={(e) => updateStyleField(style.id, 'amount', e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-6 pr-3 py-1.5 bg-[#0d1017] border border-[#00f2fe]/30 rounded text-xs font-mono font-bold text-white focus:outline-none focus:border-[#00f2fe]"
                    />
                  </div>
                </div>

                <div className="bg-[#0d1017] p-2.5 rounded-lg border border-white/5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#8f9ba8]">Subtotal Prendas:</div>
                  <div className="text-lg font-black text-[#ffe600] mt-0.5">{style.totalPcs} pcs</div>
                </div>

                <div className="bg-[#0d1017] p-2.5 rounded-lg border border-white/5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#8f9ba8]">Precio Exacto (Newsoft):</div>
                  <div className="text-lg font-mono font-black text-[#00f2fe] mt-0.5">
                    ${style.exactPrice.toFixed(4)} USD
                  </div>
                </div>

                <div className="bg-[#0d1017] p-2.5 rounded-lg border border-white/5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#8f9ba8]">
                    Precio Sugerido ({style.roundNotes || 'Calculado'}):
                  </div>
                  <div className="text-lg font-mono font-black text-[#39ff14] mt-0.5">
                    ${style.roundedPrice.toFixed(2)} USD
                  </div>
                </div>
              </div>

              {/* Single Smart Auto-Fill Button Bar */}
              <div className="bg-[#07090e] border border-white/10 rounded-lg p-2.5 mb-3.5 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => autoFillStyle(style.id)}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#00f2fe]/15 hover:bg-[#00f2fe] text-[#00f2fe] hover:text-[#0b0e14] border border-[#00f2fe]/50 text-xs font-black transition-all shadow-[0_0_12px_rgba(0,242,254,0.2)] cursor-pointer"
                  title="Auto-llenar automáticamente las tallas correspondientes a este estilo"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    ⚡ Auto-Llenar Tallas{' '}
                    <span className="text-[10px] font-normal opacity-80">
                      ({style.category === 'YOUTH' ? 'YXS - Y2XL' : style.category === 'WOMENS' ? 'XXS - 3XL' : 'S - 5XL'})
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => clearStyleSizes(style.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-white/10 text-xs font-bold transition-all cursor-pointer"
                  title="Limpiar todas las tallas de este estilo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpiar Tallas</span>
                </button>
              </div>

              {/* Youth Size Grid */}
              <div className="bg-[#ff007f]/5 border border-[#ff007f]/20 rounded-lg p-3 mb-3">
                <span className="text-[11px] font-extrabold text-[#ff007f] uppercase tracking-wider block mb-2">
                  👦 Tallas Niño / Niña (Youth: YXXS - Y2XL / Girls)
                </span>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {YOUTH_SIZES.map((sz) => (
                    <div key={sz} className="text-center">
                      <label className="block text-[9px] font-bold text-[#8f9ba8] mb-0.5">{sz}</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={style.qtyYouth[sz] || ''}
                        onChange={(e) => updateQuantity(style.id, 'youth', sz, e.target.value)}
                        className="w-full text-center py-1 bg-[#0d1017] border border-[#ff007f]/30 rounded text-xs text-white font-mono focus:outline-none focus:border-[#ff007f]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Adult Size Grid */}
              <div className="bg-[#00f2fe]/5 border border-[#00f2fe]/20 rounded-lg p-3">
                <span className="text-[11px] font-extrabold text-[#00f2fe] uppercase tracking-wider block mb-2">
                  👨 Adulto Hombre / Mujer & Numéricas (XXXS - 5XL / 20 - 44)
                </span>
                <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-11 gap-2">
                  {ADULT_SIZES.map((sz) => (
                    <div key={sz} className="text-center">
                      <label className="block text-[9px] font-bold text-[#8f9ba8] mb-0.5">
                        {sz.length <= 2 && !isNaN(Number(sz)) ? `T-${sz}` : sz}
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={style.qtyAdult[sz] || ''}
                        onChange={(e) => updateQuantity(style.id, 'adult', sz, e.target.value)}
                        className="w-full text-center py-1 bg-[#0d1017] border border-[#00f2fe]/30 rounded text-xs text-white font-mono focus:outline-none focus:border-[#00f2fe]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
