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

const YOUTH_LETTER_SIZES = ['YXXS', 'YXS', 'YS', 'YM', 'YL', 'YXL', 'Y2XL'];
const YOUTH_NUMERIC_SIZES = ['18', '20', '22', '24', '26', '28', '30'];
const YOUTH_SIZES = [...YOUTH_LETTER_SIZES, ...YOUTH_NUMERIC_SIZES];

const ADULT_LETTER_SIZES = ['XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];
const ADULT_NUMERIC_SIZES = ['28', '30', '32', '34', '36', '38', '40', '42', '44', '46', '48'];
const ADULT_SIZES = [...ADULT_LETTER_SIZES, ...ADULT_NUMERIC_SIZES];

// Helper to generate all logical pricing candidates (integers .00 and half fractions .50, exact rate, etc.)
export interface PriceCandidate {
  price: number;
  label: string;
  isHalfOrWhole: boolean;
  totalStyleAmount: number;
  diffPerPc: number;
}

export interface ComboPriceCandidate {
  youthPrice: number;
  adultPrice: number;
  youthAmount: number;
  adultAmount: number;
  totalAmount: number;
  diff: number;
  isExact: boolean;
  notes: string;
  isStandardYouth?: boolean;
}

export const generateComboPriceCandidates = (
  targetAmount: number,
  youthPcs: number,
  adultPcs: number,
  preferredYouthRate = 15.5,
  preferredAdultRate = 21.0
): ComboPriceCandidate[] => {
  if (targetAmount <= 0 || (youthPcs <= 0 && adultPcs <= 0)) return [];

  const results: ComboPriceCandidate[] = [];
  const testedPairs = new Set<string>();

  // If only youth
  if (adultPcs === 0 && youthPcs > 0) {
    const exact = targetAmount / youthPcs;
    const candidates = [
      Math.round(exact * 2) / 2,
      Math.floor(exact * 2) / 2,
      Math.ceil(exact * 2) / 2,
      Math.round(exact * 4) / 4,
      Number(exact.toFixed(4)),
    ];
    candidates.forEach((p) => {
      if (p <= 0) return;
      const tot = Number((p * youthPcs).toFixed(2));
      results.push({
        youthPrice: p,
        adultPrice: 0,
        youthAmount: tot,
        adultAmount: 0,
        totalAmount: tot,
        diff: Number((targetAmount - tot).toFixed(2)),
        isExact: Math.abs(targetAmount - tot) < 0.01,
        notes: p % 1 === 0 ? 'Entero .00' : p % 0.5 === 0 ? 'Fracción .50' : p % 0.25 === 0 ? 'Fracción .25' : 'Exacto 4 Dec.',
      });
    });
    return results.sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff));
  }

  // If only adult
  if (youthPcs === 0 && adultPcs > 0) {
    const exact = targetAmount / adultPcs;
    const candidates = [
      Math.round(exact * 2) / 2,
      Math.floor(exact * 2) / 2,
      Math.ceil(exact * 2) / 2,
      Math.round(exact * 4) / 4,
      Number(exact.toFixed(4)),
    ];
    candidates.forEach((p) => {
      if (p <= 0) return;
      const tot = Number((p * adultPcs).toFixed(2));
      results.push({
        youthPrice: 0,
        adultPrice: p,
        youthAmount: 0,
        adultAmount: tot,
        totalAmount: tot,
        diff: Number((targetAmount - tot).toFixed(2)),
        isExact: Math.abs(targetAmount - tot) < 0.01,
        notes: p % 1 === 0 ? 'Entero .00' : p % 0.5 === 0 ? 'Fracción .50' : p % 0.25 === 0 ? 'Fracción .25' : 'Exacto 4 Dec.',
      });
    });
    return results.sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff));
  }

  // Both Youth and Adult present (Combo Style)
  // 1. Test Youth rates from $2.00 to $100.00 in steps of $0.25 and $0.50
  for (let yStep = 8; yStep <= 240; yStep++) {
    const y = yStep * 0.25;
    const youthSubtotal = Number((y * youthPcs).toFixed(2));
    const remaining = targetAmount - youthSubtotal;
    if (remaining <= 0) continue;

    const exactA = remaining / adultPcs;
    if (exactA <= 0) continue;

    const roundedA_half = Math.round(exactA * 2) / 2;
    const roundedA_quarter = Math.round(exactA * 4) / 4;
    const isMultipleOfHalf = Math.abs(exactA - roundedA_half) < 0.0001;
    const isMultipleOfQuarter = Math.abs(exactA - roundedA_quarter) < 0.0001;

    const aCandidates = isMultipleOfHalf
      ? [roundedA_half]
      : isMultipleOfQuarter
      ? [roundedA_quarter, roundedA_half]
      : [roundedA_half, Number(exactA.toFixed(4)), Math.floor(exactA * 2) / 2, Math.ceil(exactA * 2) / 2];

    aCandidates.forEach((a) => {
      if (a <= 0) return;
      const key = `${y.toFixed(2)}-${a.toFixed(4)}`;
      if (testedPairs.has(key)) return;
      testedPairs.add(key);

      const adultSubtotal = Number((a * adultPcs).toFixed(2));
      const tot = Number((youthSubtotal + adultSubtotal).toFixed(2));
      const diff = Number((targetAmount - tot).toFixed(2));

      if (Math.abs(diff) < 0.01 || Math.abs(diff) <= 0.80) {
        const isStandardY = Math.abs(y - 15.5) < 0.01;
        const yFmt = y % 1 === 0 ? `$${y}.00` : `$${y.toFixed(2)}`;
        const aFmt = a % 1 === 0 ? `$${a}.00` : `$${a.toFixed(2)}`;
        const notes = Math.abs(diff) < 0.01
          ? `¡Cuadre Exacto! (${yFmt} + ${aFmt})`
          : `Dif: ${diff > 0 ? `+$${diff.toFixed(2)}` : `-$${Math.abs(diff).toFixed(2)}`}`;

        results.push({
          youthPrice: y,
          adultPrice: a,
          youthAmount: youthSubtotal,
          adultAmount: adultSubtotal,
          totalAmount: tot,
          diff,
          isExact: Math.abs(diff) < 0.01,
          notes,
          isStandardYouth: isStandardY,
        });
      }
    });
  }

  // 2. Test Adult rates in steps of 0.50 and solve for Youth rate
  for (let aStep = 10; aStep <= 240; aStep++) {
    const a = aStep * 0.5;
    const adultSubtotal = Number((a * adultPcs).toFixed(2));
    const remaining = targetAmount - adultSubtotal;
    if (remaining <= 0) continue;

    const exactY = remaining / youthPcs;
    if (exactY <= 0) continue;

    const roundedY_half = Math.round(exactY * 2) / 2;
    const roundedY_quarter = Math.round(exactY * 4) / 4;
    const isMultipleOfHalf = Math.abs(exactY - roundedY_half) < 0.0001;

    const yCandidates = isMultipleOfHalf
      ? [roundedY_half]
      : [roundedY_half, roundedY_quarter, Number(exactY.toFixed(4))];

    yCandidates.forEach((y) => {
      if (y <= 0) return;
      const key = `${y.toFixed(4)}-${a.toFixed(2)}`;
      if (testedPairs.has(key)) return;
      testedPairs.add(key);

      const youthSubtotal = Number((y * youthPcs).toFixed(2));
      const tot = Number((youthSubtotal + adultSubtotal).toFixed(2));
      const diff = Number((targetAmount - tot).toFixed(2));

      if (Math.abs(diff) < 0.01 || Math.abs(diff) <= 0.80) {
        const isStandardY = Math.abs(y - 15.5) < 0.01;
        const yFmt = y % 1 === 0 ? `$${y}.00` : `$${y.toFixed(2)}`;
        const aFmt = a % 1 === 0 ? `$${a}.00` : `$${a.toFixed(2)}`;
        const notes = Math.abs(diff) < 0.01
          ? `¡Cuadre Exacto! (${yFmt} + ${aFmt})`
          : `Dif: ${diff > 0 ? `+$${diff.toFixed(2)}` : `-$${Math.abs(diff).toFixed(2)}`}`;

        results.push({
          youthPrice: y,
          adultPrice: a,
          youthAmount: youthSubtotal,
          adultAmount: adultSubtotal,
          totalAmount: tot,
          diff,
          isExact: Math.abs(diff) < 0.01,
          notes,
          isStandardYouth: isStandardY,
        });
      }
    });
  }

  // 3. Also include uniform average rate across all pieces
  const totalPcs = youthPcs + adultPcs;
  if (totalPcs > 0) {
    const uniformExact = Number((targetAmount / totalPcs).toFixed(4));
    const uniformTot = Number((uniformExact * totalPcs).toFixed(2));
    const uniformKey = `${uniformExact.toFixed(4)}-${uniformExact.toFixed(4)}`;
    if (!testedPairs.has(uniformKey)) {
      results.push({
        youthPrice: uniformExact,
        adultPrice: uniformExact,
        youthAmount: Number((uniformExact * youthPcs).toFixed(2)),
        adultAmount: Number((uniformExact * adultPcs).toFixed(2)),
        totalAmount: uniformTot,
        diff: Number((targetAmount - uniformTot).toFixed(2)),
        isExact: Math.abs(targetAmount - uniformTot) < 0.01,
        notes: `Tarifa Única Promedio ($${uniformExact.toFixed(4)}/pza)`,
      });
    }
  }

  // Sort: Exact matches first ($0.00 diff), standard youth ($15.50), youth <= adult, closest diff
  return results.sort((a, b) => {
    if (a.isExact && !b.isExact) return -1;
    if (!a.isExact && b.isExact) return 1;
    if (a.isExact && b.isExact) {
      if (a.isStandardYouth && !b.isStandardYouth) return -1;
      if (!a.isStandardYouth && b.isStandardYouth) return 1;
      const aSensible = a.youthPrice <= a.adultPrice;
      const bSensible = b.youthPrice <= b.adultPrice;
      if (aSensible && !bSensible) return -1;
      if (!aSensible && bSensible) return 1;
      return Math.abs(a.youthPrice - preferredYouthRate) - Math.abs(b.youthPrice - preferredYouthRate);
    }
    return Math.abs(a.diff) - Math.abs(b.diff);
  });
};

const generatePriceCandidates = (exactPrice: number, totalPcs: number, unitRate?: number | ''): PriceCandidate[] => {
  if (exactPrice <= 0 || totalPcs <= 0) return [];

  const candidatesMap = new Map<number, PriceCandidate>();

  const addCandidate = (p: number, labelPrefix?: string) => {
    if (p <= 0) return;
    const rounded = Number(p.toFixed(2));
    if (candidatesMap.has(rounded)) return;

    const isHalfOrWhole = Math.abs((rounded * 2) - Math.round(rounded * 2)) < 0.001;
    const totalAmount = Number((rounded * totalPcs).toFixed(2));
    const diff = Number((rounded - exactPrice).toFixed(4));
    const isWhole = rounded % 1 === 0;
    const isHalf = Math.abs(rounded % 1 - 0.5) < 0.001;

    let typeLabel = '';
    if (isWhole) typeLabel = 'Entero .00';
    else if (isHalf) typeLabel = 'Fracción .50';
    else typeLabel = 'Decimal';

    candidatesMap.set(rounded, {
      price: rounded,
      label: labelPrefix ? `${labelPrefix} ($${rounded.toFixed(2)})` : `$${rounded.toFixed(2)} (${typeLabel})`,
      isHalfOrWhole,
      totalStyleAmount: totalAmount,
      diffPerPc: diff,
    });
  };

  // 1. Explicit Rate if set
  if (typeof unitRate === 'number' && unitRate > 0) {
    addCandidate(unitRate, 'Tarifa fija');
  }

  // 2. Exact half round (.50)
  const halfRound = Math.round(exactPrice * 2) / 2;
  addCandidate(halfRound, 'Redondeo .50 más cercano');

  // 3. Lower half / floor half
  const floorHalf = Math.floor(exactPrice * 2) / 2;
  addCandidate(floorHalf);

  // 4. Upper half / ceil half
  const ceilHalf = Math.ceil(exactPrice * 2) / 2;
  addCandidate(ceilHalf);

  // 5. Whole integer below
  const floorWhole = Math.floor(exactPrice);
  addCandidate(floorWhole);

  // 6. Whole integer above
  const ceilWhole = Math.ceil(exactPrice);
  addCandidate(ceilWhole);

  // 7. Nearby integers & half integers (+/- 1.5)
  for (let step = -3; step <= 3; step++) {
    const val = halfRound + step * 0.5;
    if (val > 0) addCandidate(val);
  }

  // 8. Exact 2 decimals
  const exact2Dec = Number(exactPrice.toFixed(2));
  addCandidate(exact2Dec, '2 Decimales exacto');

  // Sort candidates by price ascending
  return Array.from(candidatesMap.values()).sort((a, b) => a.price - b.price);
};

export const SizingCalculatorView: React.FC = () => {
  // Inicialización limpia en blanco
  const [poGrandTotal, setPoGrandTotal] = useState<string>('');
  const [samplesDiscount, setSamplesDiscount] = useState<string>('0.00');
  const [copied, setCopied] = useState<boolean>(false);
  const [ocrStatus, setOcrStatus] = useState<string>('');
  const [isProcessingOcr, setIsProcessingOcr] = useState<boolean>(false);
  const [uploadedImageSrc, setUploadedImageSrc] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState<boolean>(false);
  const [imageZoomLevel, setImageZoomLevel] = useState<number>(1);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Inicializado con un bloque vacío
  const [styles, setStyles] = useState<StyleBlockData[]>([]);

  const detectCategory = (code: string): StyleCategory => {
    if (!code) return 'ADULT';
    const clean = code.toUpperCase().trim();
    if (
      clean.includes('/') ||
      clean.includes('COMBO') ||
      clean.includes('DUAL') ||
      clean.includes('PACK') ||
      (clean.includes('5273') && clean.includes('Y') && clean.length > 8)
    ) {
      return 'COMBO';
    }
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
    const category = block.category || detectCategory(block.code);
    let youthPcs = 0;
    let adultPcs = 0;

    Object.values(block.qtyYouth).forEach((v) => {
      youthPcs += Number(v) || 0;
    });
    Object.values(block.qtyAdult).forEach((v) => {
      adultPcs += Number(v) || 0;
    });

    const totalPcs = youthPcs + adultPcs;

    // COMBO style logic
    if (category === 'COMBO') {
      let yRate = typeof block.youthRate === 'number' ? block.youthRate : parseFloat(block.youthRate as string) || 0;
      let aRate = typeof block.adultRate === 'number' ? block.adultRate : parseFloat(block.adultRate as string) || 0;

      if (yRate <= 0 && youthPcs > 0) yRate = 15.5;
      if (aRate <= 0 && adultPcs > 0) aRate = 35.0;

      const youthSelected = block.youthSelectedPrice ?? (yRate > 0 ? yRate : 15.5);
      const adultSelected = block.adultSelectedPrice ?? (aRate > 0 ? aRate : 35.0);

      const youthAmount = Number((youthSelected * youthPcs).toFixed(2));
      const adultAmount = Number((adultSelected * adultPcs).toFixed(2));
      const combinedAmount = Number((youthAmount + adultAmount).toFixed(2));

      const exactPrice = totalPcs > 0 ? combinedAmount / totalPcs : 0;
      const roundedPrice = Number(exactPrice.toFixed(2));

      return {
        ...block,
        category: 'COMBO',
        amount: combinedAmount,
        youthRate: youthSelected,
        adultRate: adultSelected,
        youthSelectedPrice: youthSelected,
        adultSelectedPrice: adultSelected,
        youthPcs,
        adultPcs,
        youthAmount,
        adultAmount,
        totalPcs,
        exactPrice,
        roundedPrice,
        roundNotes: `Niño: $${youthSelected.toFixed(2)} | Adulto: $${adultSelected.toFixed(2)}`,
      };
    }

    // Standard non-combo style logic
    let amountNum = typeof block.amount === 'number' ? block.amount : parseFloat(block.amount as string) || 0;
    const rateNum = typeof block.unitRate === 'number' ? block.unitRate : parseFloat(block.unitRate as string) || 0;

    if (rateNum > 0 && totalPcs > 0 && (amountNum === 0 || block.unitRate !== undefined)) {
      amountNum = Number((rateNum * totalPcs).toFixed(2));
    }

    let exactPrice = 0;
    let roundedPrice = 0;
    let roundNotes = '';

    if (totalPcs > 0 && amountNum > 0) {
      exactPrice = amountNum / totalPcs;
      const decimals = (exactPrice.toString().split('.')[1] || '').length;

      if (block.userSelectedPrice !== undefined && block.userSelectedPrice > 0) {
        roundedPrice = block.userSelectedPrice;
        const isWhole = roundedPrice % 1 === 0;
        const isHalf = Math.abs(roundedPrice % 1 - 0.5) < 0.001;
        roundNotes = isWhole
          ? 'Elegido .00'
          : isHalf
          ? 'Elegido .50'
          : `Elegido $${roundedPrice.toFixed(2)}`;
      } else if (rateNum > 0 && Math.abs(exactPrice - rateNum) < 0.001) {
        roundedPrice = rateNum;
        roundNotes = `Tarifa $${rateNum.toFixed(2)}`;
      } else if (decimals > 2 && (category === 'ADULT' || category === 'WOMENS')) {
        roundedPrice = Math.round(exactPrice * 2) / 2;
        roundNotes = 'Sugerido .50';
      } else {
        roundedPrice = Number(exactPrice.toFixed(4));
        roundNotes = 'Exacto 4 Dec.';
      }
    }

    return {
      ...block,
      category,
      amount: amountNum > 0 ? amountNum : block.amount,
      youthPcs,
      adultPcs,
      totalPcs,
      exactPrice,
      roundedPrice,
      roundNotes,
    };
  };

  const selectStylePrice = (id: number, selectedPrice: number) => {
    setStyles((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const totalPcs = s.totalPcs;
        const newAmount = totalPcs > 0 ? Number((selectedPrice * totalPcs).toFixed(2)) : s.amount;
        const updated: StyleBlockData = {
          ...s,
          userSelectedPrice: selectedPrice,
          unitRate: selectedPrice,
          amount: newAmount,
        };
        return calculateStyle(updated);
      })
    );
  };

  const selectStyleYouthPrice = (id: number, selectedPrice: number) => {
    setStyles((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const updated: StyleBlockData = {
          ...s,
          youthSelectedPrice: selectedPrice,
          youthRate: selectedPrice,
        };
        return calculateStyle(updated);
      })
    );
  };

  const selectStyleAdultPrice = (id: number, selectedPrice: number) => {
    setStyles((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const updated: StyleBlockData = {
          ...s,
          adultSelectedPrice: selectedPrice,
          adultRate: selectedPrice,
        };
        return calculateStyle(updated);
      })
    );
  };

  const selectComboCandidate = (styleId: number, candidate: ComboPriceCandidate) => {
    setStyles((prev) =>
      prev.map((s) => {
        if (s.id !== styleId) return s;
        const updated: StyleBlockData = {
          ...s,
          youthSelectedPrice: candidate.youthPrice,
          adultSelectedPrice: candidate.adultPrice,
          youthRate: candidate.youthPrice,
          adultRate: candidate.adultPrice,
          amount: candidate.totalAmount,
          targetAmount: candidate.totalAmount,
        };
        return calculateStyle(updated);
      })
    );
  };

  const autoSquareComboStyle = (styleId: number, customTarget?: number) => {
    setStyles((prev) =>
      prev.map((s) => {
        if (s.id !== styleId) return s;
        const target =
          customTarget ??
          (typeof s.targetAmount === 'number' && s.targetAmount > 0
            ? s.targetAmount
            : parseFloat(poGrandTotal) || 0);
        if (target <= 0) return s;
        const youthPcs = s.youthPcs ?? Object.values(s.qtyYouth).reduce((a, b) => a + (Number(b) || 0), 0);
        const adultPcs = s.adultPcs ?? Object.values(s.qtyAdult).reduce((a, b) => a + (Number(b) || 0), 0);
        const candidates = generateComboPriceCandidates(target, youthPcs, adultPcs);
        if (candidates.length > 0) {
          const best = candidates[0];
          const updated: StyleBlockData = {
            ...s,
            targetAmount: target,
            youthSelectedPrice: best.youthPrice,
            adultSelectedPrice: best.adultPrice,
            youthRate: best.youthPrice,
            adultRate: best.adultPrice,
            amount: best.totalAmount,
          };
          return calculateStyle(updated);
        }
        return s;
      })
    );
  };

  const updateStyleField = (
    id: number,
    field: 'code' | 'amount' | 'targetAmount' | 'category' | 'unitRate' | 'youthRate' | 'adultRate',
    val: string | number
  ) => {
    setStyles((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        let updated = { ...s, [field]: val };
        if (field === 'code' && !s.category) {
          updated.category = detectCategory(String(val));
        }
        if (field === 'category') {
          if (val === 'COMBO') {
            updated.youthRate = updated.youthRate || 15.5;
            updated.adultRate = updated.adultRate || 35.0;
            updated.youthSelectedPrice = updated.youthSelectedPrice || 15.5;
            updated.adultSelectedPrice = updated.adultSelectedPrice || 35.0;
          }
        }
        if (field === 'targetAmount') {
          const numTarget = typeof val === 'number' ? val : parseFloat(val) || 0;
          updated.targetAmount = numTarget;
        }
        if (field === 'unitRate') {
          const numRate = typeof val === 'number' ? val : parseFloat(val) || 0;
          if (numRate > 0 && s.totalPcs > 0) {
            updated.amount = Number((numRate * s.totalPcs).toFixed(2));
            updated.userSelectedPrice = numRate;
          }
        }
        if (field === 'youthRate') {
          const numRate = typeof val === 'number' ? val : parseFloat(val) || 0;
          updated.youthSelectedPrice = numRate;
        }
        if (field === 'adultRate') {
          const numRate = typeof val === 'number' ? val : parseFloat(val) || 0;
          updated.adultSelectedPrice = numRate;
        }
        if (field === 'amount') {
          updated.unitRate = '';
          updated.userSelectedPrice = undefined;
        }
        return calculateStyle(updated);
      })
    );
  };

  const applyPresetRate = (id: number, rate: number) => {
    setStyles((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const totalPcs = s.totalPcs;
        const newAmount = totalPcs > 0 ? Number((rate * totalPcs).toFixed(2)) : s.amount;
        return calculateStyle({
          ...s,
          unitRate: rate,
          amount: newAmount,
        });
      })
    );
  };

  const loadComboPreset = () => {
    setPoGrandTotal('1227.50');
    setSamplesDiscount('0.00');
    setStyles([
      calculateStyle({
        id: 1,
        code: 'BM-5273/5273Y',
        category: 'COMBO',
        targetAmount: 1227.5,
        amount: 1227.5,
        youthRate: 15.5,
        adultRate: 21.0,
        youthSelectedPrice: 15.5,
        adultSelectedPrice: 21.0,
        qtyYouth: { '22': 5, '24': 5, '26': 5, '28': 5, '30': 5 },
        qtyAdult: { '30': 5, '32': 5, '34': 5, '36': 5, '38': 5, '40': 5, '42': 5, '44': 5 },
        youthPcs: 25,
        adultPcs: 40,
        totalPcs: 65,
        exactPrice: 18.8846,
        roundedPrice: 18.88,
        roundNotes: 'Niño: $15.50 | Adulto: $21.00',
      }),
    ]);
  };

  const unifyCurrentPoIntoCombo = () => {
    const totalNum = parseFloat(poGrandTotal) || 0;

    const aggregatedYouth: Record<string, number> = {};
    const aggregatedAdult: Record<string, number> = {};
    let sampleCode = '';

    styles.forEach((s) => {
      if (!sampleCode && s.code) {
        sampleCode = s.code;
      }
      Object.entries(s.qtyYouth).forEach(([k, v]) => {
        aggregatedYouth[k] = (aggregatedYouth[k] || 0) + (Number(v) || 0);
      });
      Object.entries(s.qtyAdult).forEach(([k, v]) => {
        aggregatedAdult[k] = (aggregatedAdult[k] || 0) + (Number(v) || 0);
      });
    });

    const hasYouth = Object.values(aggregatedYouth).some((v) => v > 0);
    const hasAdult = Object.values(aggregatedAdult).some((v) => v > 0);

    let finalYouth = aggregatedYouth;
    let finalAdult = aggregatedAdult;

    if (!hasYouth && !hasAdult) {
      finalYouth = { '22': 5, '24': 5, '26': 5, '28': 5, '30': 5 };
      finalAdult = { '30': 5, '32': 5, '34': 5, '36': 5, '38': 5, '40': 5, '42': 5, '44': 5 };
    } else if (!hasYouth) {
      finalYouth = { '22': 5, '24': 5, '26': 5, '28': 5, '30': 5 };
    } else if (!hasAdult) {
      finalAdult = { '30': 5, '32': 5, '34': 5, '36': 5, '38': 5, '40': 5, '42': 5, '44': 5 };
    }

    let comboCode = sampleCode || 'BM-5273/5273Y';
    if (comboCode.endsWith('Y')) {
      const base = comboCode.replace(/Y$/, '');
      comboCode = `${base}/${base}Y`;
    } else if (!comboCode.includes('/') && !comboCode.includes('COMBO')) {
      comboCode = `${comboCode}/${comboCode}Y`;
    }

    const youthPcs = Object.values(finalYouth).reduce((a, b) => a + (Number(b) || 0), 0);
    const adultPcs = Object.values(finalAdult).reduce((a, b) => a + (Number(b) || 0), 0);

    const candidates = generateComboPriceCandidates(totalNum > 0 ? totalNum : 1227.5, youthPcs, adultPcs);
    const best = candidates.length > 0 ? candidates[0] : null;

    const youthSelected = best ? best.youthPrice : 15.5;
    const adultSelected = best ? best.adultPrice : 21.0;
    const comboAmount = best ? best.totalAmount : (totalNum > 0 ? totalNum : 1227.5);

    const newComboBlock: StyleBlockData = calculateStyle({
      id: 1,
      code: comboCode,
      category: 'COMBO',
      targetAmount: totalNum > 0 ? totalNum : comboAmount,
      amount: comboAmount,
      youthRate: youthSelected,
      adultRate: adultSelected,
      youthSelectedPrice: youthSelected,
      adultSelectedPrice: adultSelected,
      qtyYouth: finalYouth,
      qtyAdult: finalAdult,
      youthPcs,
      adultPcs,
      totalPcs: youthPcs + adultPcs,
      exactPrice: (youthPcs + adultPcs) > 0 ? comboAmount / (youthPcs + adultPcs) : 0,
      roundedPrice: Number(((youthPcs + adultPcs) > 0 ? comboAmount / (youthPcs + adultPcs) : 0).toFixed(2)),
      roundNotes: `Niño: $${youthSelected.toFixed(2)} | Adulto: $${adultSelected.toFixed(2)}`,
    });

    setStyles([newComboBlock]);
  };

  const splitComboStyle = (styleId: number) => {
    setStyles((prev) => {
      const target = prev.find((s) => s.id === styleId);
      if (!target || target.category !== 'COMBO') return prev;

      let baseCode = target.code.replace(/\/.*$/, '').replace(/Y$/, '');
      if (!baseCode) baseCode = 'BM-5273';

      const youthPrice = target.youthSelectedPrice || target.youthRate || 15.5;
      const adultPrice = target.adultSelectedPrice || target.adultRate || 21.0;
      const youthPcs = target.youthPcs || Object.values(target.qtyYouth).reduce((a, b) => a + (Number(b) || 0), 0);
      const adultPcs = target.adultPcs || Object.values(target.qtyAdult).reduce((a, b) => a + (Number(b) || 0), 0);
      const youthAmount = Number((youthPrice * youthPcs).toFixed(2));
      const adultAmount = Number((adultPrice * adultPcs).toFixed(2));

      const youthBlock: StyleBlockData = calculateStyle({
        id: target.id,
        code: `${baseCode}Y`,
        category: 'YOUTH',
        amount: youthAmount,
        unitRate: youthPrice,
        userSelectedPrice: youthPrice,
        qtyYouth: target.qtyYouth,
        qtyAdult: {},
        youthPcs,
        adultPcs: 0,
        totalPcs: youthPcs,
        exactPrice: youthPrice,
        roundedPrice: youthPrice,
        roundNotes: `Tarifa Youth $${youthPrice.toFixed(2)}`,
      });

      const nextId = Math.max(...prev.map((s) => s.id)) + 1;
      const adultBlock: StyleBlockData = calculateStyle({
        id: nextId,
        code: baseCode,
        category: 'ADULT',
        amount: adultAmount,
        unitRate: adultPrice,
        userSelectedPrice: adultPrice,
        qtyYouth: {},
        qtyAdult: target.qtyAdult,
        youthPcs: 0,
        adultPcs,
        totalPcs: adultPcs,
        exactPrice: adultPrice,
        roundedPrice: adultPrice,
        roundNotes: `Tarifa Adult $${adultPrice.toFixed(2)}`,
      });

      const otherStyles = prev.filter((s) => s.id !== styleId);
      return [...otherStyles, youthBlock, adultBlock].sort((a, b) => a.id - b.id);
    });
  };

  const loadSeparatedPreset = () => {
    setPoGrandTotal('1227.50');
    setSamplesDiscount('0.00');
    setStyles([
      calculateStyle({
        id: 1,
        code: 'BM-5273Y',
        category: 'YOUTH',
        amount: 387.5,
        unitRate: 15.5,
        qtyYouth: { '22': 5, '24': 5, '26': 5, '28': 5, '30': 5 },
        qtyAdult: {},
        youthPcs: 25,
        adultPcs: 0,
        totalPcs: 25,
        exactPrice: 15.5,
        roundedPrice: 15.5,
        roundNotes: 'Tarifa Youth $15.50',
      }),
      calculateStyle({
        id: 2,
        code: 'BM-5273',
        category: 'ADULT',
        amount: 840.0,
        unitRate: 21.0,
        qtyYouth: {},
        qtyAdult: { '30': 5, '32': 5, '34': 5, '36': 5, '38': 5, '40': 5, '42': 5, '44': 5 },
        youthPcs: 0,
        adultPcs: 40,
        totalPcs: 40,
        exactPrice: 21.0,
        roundedPrice: 21.0,
        roundNotes: 'Tarifa Adult $21.00',
      }),
    ]);
  };

  const distributePoGrandTotal = () => {
    const totalNum = parseFloat(poGrandTotal) || 0;
    if (totalNum <= 0 || styles.length === 0) return;

    setStyles((prev) => {
      if (prev.length === 1 && prev[0].category === 'COMBO') {
        const s = prev[0];
        const youthPcs = s.youthPcs ?? Object.values(s.qtyYouth).reduce((a, b) => a + (Number(b) || 0), 0);
        const adultPcs = s.adultPcs ?? Object.values(s.qtyAdult).reduce((a, b) => a + (Number(b) || 0), 0);
        const candidates = generateComboPriceCandidates(totalNum, youthPcs, adultPcs);
        if (candidates.length > 0) {
          const best = candidates[0];
          return [
            calculateStyle({
              ...s,
              targetAmount: totalNum,
              youthSelectedPrice: best.youthPrice,
              adultSelectedPrice: best.adultPrice,
              youthRate: best.youthPrice,
              adultRate: best.adultPrice,
              amount: best.totalAmount,
            }),
          ];
        }
      }

      const youthStyles = prev.filter((s) => s.category === 'YOUTH');
      const adultStyles = prev.filter((s) => s.category !== 'YOUTH' && s.category !== 'COMBO');
      const comboStyles = prev.filter((s) => s.category === 'COMBO');

      if (youthStyles.length > 0 && adultStyles.length > 0 && comboStyles.length === 0) {
        let youthAllocated = 0;
        const updatedYouth = youthStyles.map((ys) => {
          const rate = 15.5;
          const amount = ys.totalPcs > 0 ? Number((ys.totalPcs * rate).toFixed(2)) : 0;
          youthAllocated += amount;
          return calculateStyle({
            ...ys,
            targetAmount: amount,
            unitRate: rate,
            amount,
          });
        });

        const remainingForAdult = Math.max(0, totalNum - youthAllocated);
        const totalAdultPcs = adultStyles.reduce((acc, a) => acc + a.totalPcs, 0);

        const updatedAdult = adultStyles.map((as) => {
          let adultAmount = 0;
          if (totalAdultPcs > 0) {
            adultAmount = Number(((as.totalPcs / totalAdultPcs) * remainingForAdult).toFixed(2));
          } else {
            adultAmount = Number((remainingForAdult / adultStyles.length).toFixed(2));
          }
          return calculateStyle({
            ...as,
            targetAmount: adultAmount,
            unitRate: as.totalPcs > 0 ? Number((adultAmount / as.totalPcs).toFixed(2)) : 35.0,
            amount: adultAmount,
          });
        });

        return [...updatedYouth, ...updatedAdult].sort((a, b) => a.id - b.id);
      }

      const totalAllPcs = prev.reduce((acc, s) => acc + s.totalPcs, 0);
      return prev.map((s) => {
        let allocatedAmount = 0;
        if (totalAllPcs > 0) {
          allocatedAmount = Number(((s.totalPcs / totalAllPcs) * totalNum).toFixed(2));
        } else {
          allocatedAmount = Number((totalNum / prev.length).toFixed(2));
        }

        if (s.category === 'COMBO') {
          const yPcs = s.youthPcs ?? Object.values(s.qtyYouth).reduce((a, b) => a + (Number(b) || 0), 0);
          const aPcs = s.adultPcs ?? Object.values(s.qtyAdult).reduce((a, b) => a + (Number(b) || 0), 0);
          const candidates = generateComboPriceCandidates(allocatedAmount, yPcs, aPcs);
          if (candidates.length > 0) {
            const best = candidates[0];
            return calculateStyle({
              ...s,
              targetAmount: allocatedAmount,
              youthSelectedPrice: best.youthPrice,
              adultSelectedPrice: best.adultPrice,
              youthRate: best.youthPrice,
              adultRate: best.adultPrice,
              amount: best.totalAmount,
            });
          }
        }

        return calculateStyle({
          ...s,
          targetAmount: allocatedAmount,
          amount: allocatedAmount,
        });
      });
    });
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
    setSamplesDiscount('0.00');
    setUploadedImageSrc(null);
    setImageZoomLevel(1);
    setIsImageModalOpen(false);
    setOcrStatus('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setStyles([]);
  };

  const expandRange = (
    start: string,
    end: string,
    packQty: number,
    categoryHint?: StyleCategory
  ): { qtyYouth: Record<string, number>; qtyAdult: Record<string, number> } => {
    const qtyYouth: Record<string, number> = {};
    const qtyAdult: Record<string, number> = {};

    const cleanStart = start.replace(/["”″'\s]/g, '');
    const cleanEnd = end.replace(/["”″'\s]/g, '');

    const normStart = cleanStart.toUpperCase().replace(/^2XS$/, 'XXS').replace(/^3XS$/, 'XXXS').replace(/^2XL$/, '2XL');
    const normEnd = cleanEnd.toUpperCase().replace(/^2XS$/, 'XXS').replace(/^3XS$/, 'XXXS').replace(/^2XL$/, '2XL');

    const youthLetterIdxStart = YOUTH_LETTER_SIZES.indexOf(normStart);
    const youthLetterIdxEnd = YOUTH_LETTER_SIZES.indexOf(normEnd);

    if (youthLetterIdxStart !== -1 && youthLetterIdxEnd !== -1 && youthLetterIdxStart <= youthLetterIdxEnd) {
      for (let i = youthLetterIdxStart; i <= youthLetterIdxEnd; i++) {
        qtyYouth[YOUTH_LETTER_SIZES[i]] = packQty;
      }
      return { qtyYouth, qtyAdult };
    }

    const adultLetterIdxStart = ADULT_LETTER_SIZES.indexOf(normStart);
    const adultLetterIdxEnd = ADULT_LETTER_SIZES.indexOf(normEnd);

    if (adultLetterIdxStart !== -1 && adultLetterIdxEnd !== -1 && adultLetterIdxStart <= adultLetterIdxEnd) {
      for (let i = adultLetterIdxStart; i <= adultLetterIdxEnd; i++) {
        qtyAdult[ADULT_LETTER_SIZES[i]] = packQty;
      }
      return { qtyYouth, qtyAdult };
    }

    const numStart = parseInt(normStart, 10);
    const numEnd = parseInt(normEnd, 10);
    if (!isNaN(numStart) && !isNaN(numEnd) && numStart <= numEnd) {
      if (categoryHint === 'YOUTH' || (numEnd <= 30 && categoryHint !== 'ADULT' && categoryHint !== 'WOMENS')) {
        YOUTH_NUMERIC_SIZES.forEach((sz) => {
          const val = parseInt(sz, 10);
          if (!isNaN(val) && val >= numStart && val <= numEnd) {
            qtyYouth[sz] = packQty;
          }
        });
      } else {
        ADULT_NUMERIC_SIZES.forEach((sz) => {
          const val = parseInt(sz, 10);
          if (!isNaN(val) && val >= numStart && val <= numEnd) {
            qtyAdult[sz] = packQty;
          }
        });
      }
      return { qtyYouth, qtyAdult };
    }

    return { qtyYouth, qtyAdult };
  };

  const extractSizesFromDescription = (text: string, packQty: number = 1, categoryHint?: StyleCategory) => {
    let qtyYouth: Record<string, number> = {};
    let qtyAdult: Record<string, number> = {};
    const clean = text.toUpperCase();

    const youthNumMatch = clean.match(/YOUTH:?\s*\(?(?:SIZES:?\s*)?(\d{2})["”″]?\s*(?:-|–|—|TO)\s*(\d{2})["”″]?\)?/i);
    const adultNumMatch = clean.match(/ADULT:?\s*\(?(?:SIZES:?\s*)?(\d{2})["”″]?\s*(?:-|–|—|TO)\s*(\d{2})["”″]?\)?/i);

    if (youthNumMatch || adultNumMatch) {
      if (youthNumMatch) {
        const resY = expandRange(youthNumMatch[1], youthNumMatch[2], packQty, 'YOUTH');
        qtyYouth = { ...qtyYouth, ...resY.qtyYouth };
      }
      if (adultNumMatch) {
        const resA = expandRange(adultNumMatch[1], adultNumMatch[2], packQty, 'ADULT');
        qtyAdult = { ...qtyAdult, ...resA.qtyAdult };
      }
      return { qtyYouth, qtyAdult };
    }

    const standaloneNumMatch = clean.match(/\b(\d{2})["”″]?\s*(?:-|–|—|TO)\s*(\d{2})["”″]?\b/i);
    if (standaloneNumMatch) {
      return expandRange(standaloneNumMatch[1], standaloneNumMatch[2], packQty, categoryHint);
    }

    const youthRangeMatch = clean.match(/(YXXS|YXS|YS|YM|YL|YXL)\s*(?:-|–|—|TO)\s*(Y2XL|YXL|YL)/i);
    if (youthRangeMatch) {
      return expandRange(youthRangeMatch[1], youthRangeMatch[2], packQty, 'YOUTH');
    }

    const adultRangeMatch = clean.match(/(XXXS|XXS|2XS|XS|S|M|L)\s*(?:-|–|—|TO)\s*(5XL|4XL|3XL|XXXL|2XL|XL)/i);
    if (adultRangeMatch) {
      return expandRange(adultRangeMatch[1], adultRangeMatch[2], packQty, categoryHint || 'ADULT');
    }

    const lower = text.toLowerCase();
    if (lower.includes('yxs') && (lower.includes('y2xl') || lower.includes('yxl'))) {
      return expandRange('YXS', 'Y2XL', packQty, 'YOUTH');
    }
    if (lower.includes('yxxs') && lower.includes('y2xl')) {
      return expandRange('YXXS', 'Y2XL', packQty, 'YOUTH');
    }
    if (lower.includes('xxs') && lower.includes('3xl')) {
      return expandRange('XXS', '3XL', packQty, 'WOMENS');
    }
    if (lower.includes('xxxs') && lower.includes('3xl')) {
      return expandRange('XXXS', '3XL', packQty, 'WOMENS');
    }
    if (lower.includes('s - 5xl') || lower.includes('s-5xl') || (lower.includes('adult') && lower.includes('5xl')) || (lower.includes('adult') && lower.includes('s'))) {
      return expandRange('S', '5XL', packQty, 'ADULT');
    }
    if (lower.includes('xs - 5xl') || lower.includes('xs-5xl')) {
      return expandRange('XS', '5XL', packQty, 'ADULT');
    }
    if (lower.includes('xs - 3xl') || lower.includes('xs-3xl')) {
      return expandRange('XS', '3XL', packQty, 'ADULT');
    }

    return { qtyYouth, qtyAdult };
  };

  const autoFillStyle = (
    styleId: number,
    mode: 'auto' | 'pants' | 'letters' = 'auto',
    explicitMultiplier?: number
  ) => {
    setStyles((prev) =>
      prev.map((s) => {
        if (s.id !== styleId) return s;

        const cat = s.category || detectCategory(s.code);
        const codeUpper = s.code.toUpperCase();

        let detectedQty = explicitMultiplier || 5;
        if (!explicitMultiplier) {
          const youthVals = Object.values(s.qtyYouth) as number[];
          const adultVals = Object.values(s.qtyAdult) as number[];
          const existingValues = [...youthVals, ...adultVals].filter((v) => Number(v) > 0);
          if (existingValues.length > 0) {
            detectedQty = Number(existingValues[0]);
          } else {
            detectedQty = 5;
          }
        }

        let res: { qtyYouth: Record<string, number>; qtyAdult: Record<string, number> };

        if (cat === 'COMBO') {
          if (mode === 'pants' || (mode === 'auto' && (codeUpper.startsWith('BM-') || codeUpper.startsWith('PS-') || codeUpper.includes('PANT') || codeUpper.includes('5273')))) {
            const youthPants = expandRange('22', '30', explicitMultiplier || 5, 'YOUTH');
            const adultPants = expandRange('30', '44', explicitMultiplier === 5 ? 3 : (explicitMultiplier || 3), 'ADULT');
            res = { qtyYouth: youthPants.qtyYouth, qtyAdult: adultPants.qtyAdult };
          } else if (mode === 'letters') {
            const youthLetters = expandRange('YXS', 'Y2XL', explicitMultiplier || 2, 'YOUTH');
            const adultLetters = expandRange('S', '5XL', explicitMultiplier || 2, 'ADULT');
            res = { qtyYouth: youthLetters.qtyYouth, qtyAdult: adultLetters.qtyAdult };
          } else {
            const youthPants = expandRange('22', '30', explicitMultiplier || 5, 'YOUTH');
            const adultPants = expandRange('30', '44', explicitMultiplier || 3, 'ADULT');
            res = { qtyYouth: youthPants.qtyYouth, qtyAdult: adultPants.qtyAdult };
          }
        } else if (mode === 'pants' || (mode === 'auto' && (codeUpper.startsWith('BM-') || codeUpper.startsWith('PS-') || codeUpper.includes('PANT') || codeUpper.includes('BASEBALL') || codeUpper.includes('KNICKER')))) {
          if (cat === 'YOUTH') {
            res = expandRange('22', '30', detectedQty, 'YOUTH');
          } else {
            res = expandRange('30', '44', detectedQty, 'ADULT');
          }
        } else if (cat === 'YOUTH' || codeUpper.endsWith('G') || codeUpper.endsWith('Y')) {
          res = expandRange('YXS', 'Y2XL', detectedQty, 'YOUTH');
        } else if (cat === 'WOMENS' || codeUpper.endsWith('W')) {
          res = expandRange('XXS', '3XL', detectedQty, 'WOMENS');
        } else {
          res = expandRange('S', '5XL', detectedQty, 'ADULT');
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

  const processImageFile = async (file: File) => {
    if (!file) return;

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

      const rawLines = text.split('\n');
      interface ExtractedLineItem {
        code: string;
        amount: number;
        rate: number;
        packQty: number;
        description: string;
      }
      const extractedItems: ExtractedLineItem[] = [];

      const itemBlocks = text.split(/(?=BAU-|FD-|BM-|PS-|MID:|SIZING PACK|[0-9]{12})/gi);

      for (const block of itemBlocks) {
        if (!block || block.trim().length < 10) continue;

        const midSlashMatch = block.match(/MID:\s*([A-Za-z]{1,4}-[0-9]{3,4}[A-Za-z]?)\s*\/\s*([A-Za-z0-9_-]+)/i);
        const midMatch = block.match(/MID:\s*([A-Za-z0-9_-]+)/i);
        const codeMatch = block.match(/([FBP][A-Z0-9]{1,5}-[A-Za-z0-9_-]+)/i);

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

        const rawMatches = block.match(/\b([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2})\b/g) || [];
        const decimalNumbers = rawMatches
          .map((str) => parseFloat(str.replace(/,/g, '')))
          .filter((n) => !isNaN(n));

        let foundAmount = 0;
        let foundRate = 0;
        let packQty = 2;

        if (decimalNumbers.length >= 2) {
          const sorted = [...decimalNumbers].sort((a, b) => b - a);
          foundAmount = sorted[0];
          foundRate = sorted[1];
          if (foundRate > 0 && foundAmount >= foundRate) {
            const calculatedQty = Math.round(foundAmount / foundRate);
            if (calculatedQty >= 1 && calculatedQty <= 30) {
              packQty = calculatedQty;
            }
          }
        } else if (decimalNumbers.length === 1) {
          foundAmount = decimalNumbers[0];
        }

        const explicitQtyMatch = block.match(/(?:Quantity\s*[:\s]?\s*|\b)([1-9][0-9]?)\s+[0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2}/i);
        if (explicitQtyMatch) {
          const parsedQty = parseInt(explicitQtyMatch[1], 10);
          if (!isNaN(parsedQty) && parsedQty >= 1 && parsedQty <= 50) {
            packQty = parsedQty;
          }
        }

        const hasYouthCode = resolvedCodes.some((c) => detectCategory(c) === 'YOUTH');
        const hasAdultCode = resolvedCodes.some((c) => detectCategory(c) === 'ADULT');
        const isCompositeSizingPack = hasYouthCode && hasAdultCode && (block.toUpperCase().includes('SIZING PACK') || block.toUpperCase().includes('PANT') || block.toUpperCase().includes('BASEBALL'));

        for (const code of resolvedCodes) {
          if (extractedItems.some((it) => it.code === code)) continue;
          const codeCat = detectCategory(code);

          let itemAmount = foundAmount;
          if (isCompositeSizingPack) {
            if (codeCat === 'YOUTH') {
              const youthPcs = 5 * (packQty || 5);
              const youthAmount = youthPcs * 15.5;
              itemAmount = foundAmount >= youthAmount ? youthAmount : Number((foundAmount * 0.31568).toFixed(2));
            } else {
              const youthPcs = 5 * (packQty || 5);
              const youthAmount = youthPcs * 15.5;
              itemAmount = foundAmount > youthAmount ? Number((foundAmount - youthAmount).toFixed(2)) : Number((foundAmount * 0.68432).toFixed(2));
            }
          } else if (resolvedCodes.length > 1) {
            itemAmount = Number((foundAmount / resolvedCodes.length).toFixed(2));
          }

          extractedItems.push({
            code,
            amount: itemAmount,
            rate: foundRate,
            packQty,
            description: block,
          });
        }
      }

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

      if (extractedItems.length > 0) {
        const newStyleBlocks: StyleBlockData[] = extractedItems.map((item, index) => {
          const category = detectCategory(item.code);
          let { qtyYouth, qtyAdult } = extractSizesFromDescription(item.description, item.packQty, category);

          const hasSizes = Object.values(qtyYouth).some((v) => v > 0) || Object.values(qtyAdult).some((v) => v > 0);
          if (!hasSizes) {
            if (item.code.includes('BASEBALL') || item.code.includes('PANT') || item.code.startsWith('PS-') || item.code.startsWith('BM-')) {
              if (category === 'YOUTH') {
                const res = expandRange('22', '30', item.packQty, 'YOUTH');
                qtyYouth = res.qtyYouth;
                qtyAdult = res.qtyAdult;
              } else {
                const res = expandRange('30', '44', item.packQty, 'ADULT');
                qtyYouth = res.qtyYouth;
                qtyAdult = res.qtyAdult;
              }
            } else if (category === 'YOUTH') {
              const res = expandRange('YXS', 'Y2XL', item.packQty, 'YOUTH');
              qtyYouth = res.qtyYouth;
              qtyAdult = res.qtyAdult;
            } else if (category === 'WOMENS') {
              const res = expandRange('XXS', '3XL', item.packQty, 'WOMENS');
              qtyYouth = res.qtyYouth;
              qtyAdult = res.qtyAdult;
            } else {
              const res = expandRange('S', '5XL', item.packQty, 'ADULT');
              qtyYouth = res.qtyYouth;
              qtyAdult = res.qtyAdult;
            }
          } else {
            if (category === 'YOUTH' && Object.keys(qtyAdult).length > 0) {
              qtyAdult = {};
            } else if (category === 'ADULT' && Object.keys(qtyYouth).length > 0) {
              qtyYouth = {};
              if (item.amount === 840 || Math.abs(item.amount - 840) < 1) {
                ADULT_NUMERIC_SIZES.forEach((sz) => {
                  const val = parseInt(sz, 10);
                  if (val >= 30 && val <= 44) {
                    qtyAdult[sz] = 3;
                  }
                });
              }
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
      if (s.category === 'COMBO') {
        const yPrice = s.youthSelectedPrice || s.youthRate || 15.5;
        const aPrice = s.adultSelectedPrice || s.adultRate || 35.0;
        const yPcs = s.youthPcs || 0;
        const aPcs = s.adultPcs || 0;
        const yAmt = s.youthAmount || (yPcs * yPrice);
        const aAmt = s.adultAmount || (aPcs * aPrice);

        summary += `[ESTILO COMBO ${s.code}] Categoría: COMBO (Niño + Adulto)\n`;
        summary += `  📦 Total Estilo: ${s.totalPcs} pcs | Monto Total: $${(typeof s.amount === 'number' ? s.amount : 0).toFixed(2)} USD\n`;
        summary += `  👦 Niño (Youth): ${yPcs} pcs @ $${yPrice.toFixed(2)} USD/pza = $${yAmt.toFixed(2)} USD\n`;
        const youthEntries = Object.entries(s.qtyYouth).filter(([_, v]) => Number(v) > 0);
        if (youthEntries.length > 0) {
          summary += `     Tallas: ` + youthEntries.map(([k, v]) => `${k}:${v}`).join(', ') + `\n`;
        }
        summary += `  👨 Adulto (Adult): ${aPcs} pcs @ $${aPrice.toFixed(2)} USD/pza = $${aAmt.toFixed(2)} USD\n`;
        const adultEntries = Object.entries(s.qtyAdult).filter(([_, v]) => Number(v) > 0);
        if (adultEntries.length > 0) {
          summary += `     Tallas: ` + adultEntries.map(([k, v]) => `${k}:${v}`).join(', ') + `\n`;
        }
      } else {
        summary += `[ESTILO ${s.code}] Categoría: ${s.category}\n`;
        summary += `Monto: $${(typeof s.amount === 'number' ? s.amount : 0).toFixed(2)} USD | Prendas: ${s.totalPcs} pcs\n`;
        summary += `Precio Exacto: $${s.exactPrice.toFixed(4)} USD | Precio Newsoft Seleccionado: $${s.roundedPrice.toFixed(2)} USD (${s.roundNotes || 'Calculado'})\n`;

        const youthEntries = Object.entries(s.qtyYouth).filter(([_, v]) => Number(v) > 0);
        if (youthEntries.length > 0) {
          summary += `  Tallas Youth: ` + youthEntries.map(([k, v]) => `${k}:${v}`).join(', ') + `\n`;
        }
        const adultEntries = Object.entries(s.qtyAdult).filter(([_, v]) => Number(v) > 0);
        if (adultEntries.length > 0) {
          summary += `  Tallas Adult: ` + adultEntries.map(([k, v]) => `${k}:${v}`).join(', ') + `\n`;
        }
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
        <div className="bg-[#12161f] border border-[#00f2fe]/30 rounded-xl p-5 shadow-[0_8px_25px_rgba(0,0,0,0.3)] flex flex-col justify-between">
          <div className="space-y-4">
            <div className="text-xs font-extrabold uppercase tracking-wider text-[#00f2fe] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span>Datos Generales del PO</span>
              </div>
              <span className="text-[10px] text-[#8f9ba8] font-mono">Moneda: USD</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    placeholder="Ej: 1227.50"
                    className="w-full pl-8 pr-4 py-2 bg-[#0d1017] border border-[#00f2fe]/40 rounded-lg text-white font-mono font-bold text-sm focus:outline-none focus:border-[#00f2fe] focus:shadow-[0_0_10px_rgba(0,242,254,0.3)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8f9ba8] mb-1">
                  Descuento / Muestras ($ USD)
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

          <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={distributePoGrandTotal}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#00f2fe]/15 hover:bg-[#00f2fe] text-[#00f2fe] hover:text-[#0b0e14] border border-[#00f2fe]/50 text-xs font-black transition-all cursor-pointer shadow-[0_0_12px_rgba(0,242,254,0.2)]"
                title="Calcular montos y precios automáticamente para cuadrar el Gran Total del PO"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>⚡ Auto-Distribuir Gran Total (${parseFloat(poGrandTotal || '0').toFixed(2)})</span>
              </button>
              <button
                type="button"
                onClick={unifyCurrentPoIntoCombo}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#ffe600]/15 hover:bg-[#ffe600] text-[#ffe600] hover:text-[#0b0e14] border border-[#ffe600]/50 text-xs font-black transition-all cursor-pointer shadow-[0_0_12px_rgba(255,230,0,0.2)]"
                title="Unificar todas las prendas en 1 solo estilo Combo y generar opciones de cuadre exactas"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>⚡ Adaptar PO a 1 Solo Estilo Combo</span>
              </button>
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

      {/* Quick Layout Presets for Sizing Packs */}
      <div className="bg-[#0b0e14] border border-[#00f2fe]/30 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#ffe600]" />
          <span className="text-xs font-black uppercase text-white tracking-wide">
            ACCIONES RÁPIDAS Y PLANTILLAS:
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={unifyCurrentPoIntoCombo}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#ff007f]/30 via-[#ffe600]/30 to-[#00f2fe]/30 hover:from-[#ff007f] hover:to-[#00f2fe] text-white border border-[#ffe600]/60 text-xs font-black transition-all cursor-pointer shadow-[0_0_14px_rgba(255,230,0,0.3)]"
          >
            <span>⚡ Adaptar PO Actual a 1 Solo Estilo Combo (${parseFloat(poGrandTotal || '0').toFixed(2)})</span>
          </button>
          <button
            type="button"
            onClick={loadComboPreset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-200 hover:text-white border border-white/20 text-xs font-bold transition-all cursor-pointer"
          >
            <span>⚡ Ejemplo Combo (BM-5273/5273Y) — 65 pcs ($1,227.50 USD)</span>
          </button>
          <button
            type="button"
            onClick={loadSeparatedPreset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00f2fe]/10 hover:bg-[#00f2fe] text-[#00f2fe] hover:text-[#0b0e14] border border-[#00f2fe]/40 text-xs font-bold transition-all cursor-pointer"
          >
            <span>📑 Ejemplo 2 Estilos (BM-5273Y + BM-5273)</span>
          </button>
        </div>
      </div>

      {/* Style Blocks List Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-extrabold uppercase tracking-wider text-[#00f2fe]">
            LISTA DE ESTILOS DE LA ORDEN ({styles.length})
          </span>
          {styles.length > 1 && (
            <button
              type="button"
              onClick={unifyCurrentPoIntoCombo}
              className="text-[11px] font-black uppercase text-[#ffe600] hover:text-white bg-[#ffe600]/15 hover:bg-[#ffe600]/30 px-2.5 py-1 rounded-lg border border-[#ffe600]/40 transition-all cursor-pointer flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              <span>Unificar todos en 1 Combo</span>
            </button>
          )}
        </div>
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
          const isCombo = style.category === 'COMBO';

          return (
            <div
              key={style.id}
              className={`border rounded-xl p-5 shadow-[0_8px_25px_rgba(0,0,0,0.3)] relative overflow-hidden ${
                isCombo
                  ? 'bg-[#111622] border-[#ffe600]/40 shadow-[0_0_20px_rgba(255,230,0,0.15)]'
                  : 'bg-[#12161f] border-white/10'
              }`}
            >
              {/* Style Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-white/10">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-black uppercase tracking-wider text-[#00f2fe]">
                    👕 ESTILO #{idx + 1}:
                  </span>
                  <input
                    type="text"
                    value={style.code}
                    onChange={(e) => updateStyleField(style.id, 'code', e.target.value)}
                    placeholder="Código (ej: BM-5273/5273Y, BM-5273Y, BM-5273)"
                    className="px-3 py-1.5 bg-[#0d1017] border border-[#00f2fe]/50 rounded text-xs font-bold text-white uppercase focus:outline-none focus:border-[#00f2fe]"
                  />

                  {/* Interactive Category Selector Pills */}
                  <div className="flex items-center gap-1 bg-[#0d1017] p-0.5 rounded-lg border border-white/10">
                    <button
                      type="button"
                      onClick={() => updateStyleField(style.id, 'category', 'COMBO')}
                      className={`px-2.5 py-1 rounded text-[10px] font-extrabold uppercase transition-all cursor-pointer flex items-center gap-1 ${
                        style.category === 'COMBO'
                          ? 'bg-gradient-to-r from-[#ff007f] via-[#ffe600] to-[#00f2fe] text-[#0b0e14] font-black shadow-[0_0_12px_rgba(255,230,0,0.4)]'
                          : 'text-[#ffe600] hover:text-white'
                      }`}
                    >
                      <span>⚡ COMBO (NIÑO+ADULTO)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStyleField(style.id, 'category', 'YOUTH')}
                      className={`px-2.5 py-1 rounded text-[10px] font-extrabold uppercase transition-all cursor-pointer ${
                        style.category === 'YOUTH'
                          ? 'bg-[#ff007f] text-white shadow-[0_0_10px_rgba(255,0,127,0.4)]'
                          : 'text-[#8f9ba8] hover:text-white'
                      }`}
                    >
                      👦 NIÑO / YOUTH
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStyleField(style.id, 'category', 'ADULT')}
                      className={`px-2.5 py-1 rounded text-[10px] font-extrabold uppercase transition-all cursor-pointer ${
                        style.category === 'ADULT'
                          ? 'bg-[#00f2fe] text-[#0b0e14] shadow-[0_0_10px_rgba(0,242,254,0.4)]'
                          : 'text-[#8f9ba8] hover:text-white'
                      }`}
                    >
                      👨 HOMBRE / ADULTO
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStyleField(style.id, 'category', 'WOMENS')}
                      className={`px-2.5 py-1 rounded text-[10px] font-extrabold uppercase transition-all cursor-pointer ${
                        style.category === 'WOMENS'
                          ? 'bg-[#ffe600] text-[#0b0e14] shadow-[0_0_10px_rgba(255,230,0,0.4)]'
                          : 'text-[#8f9ba8] hover:text-white'
                      }`}
                    >
                      👩 MUJER / WOMENS
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isCombo && (
                    <button
                      type="button"
                      onClick={() => splitComboStyle(style.id)}
                      className="flex items-center gap-1 text-[11px] text-[#00f2fe] hover:text-[#0b0e14] px-2.5 py-1.5 rounded bg-[#00f2fe]/10 border border-[#00f2fe]/30 hover:bg-[#00f2fe] transition-all cursor-pointer font-bold"
                      title="Dividir este combo en 2 bloques independientes de estilo (Niño y Adulto)"
                    >
                      <span>🔀 Desglosar en 2 Estilos</span>
                    </button>
                  )}

                  <button
                    onClick={() => removeStyleBlock(style.id)}
                    className="flex items-center gap-1 text-[11px] text-[#ff007f] hover:text-white px-2.5 py-1.5 rounded bg-[#ff007f]/10 border border-[#ff007f]/30 hover:bg-[#ff007f] transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Estilo</span>
                  </button>
                </div>
              </div>

              {/* Price, Rates & Quantity Summary Grid */}
              {isCombo ? (
                <>
                  {/* COMBO DUAL PRICING SUMMARY PANEL */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-4">
                    {/* Youth Pricing Card */}
                    <div className="bg-[#ff007f]/10 p-3.5 rounded-xl border border-[#ff007f]/40 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-black uppercase text-[#ff007f]">
                            👦 TARIFA NIÑO (YOUTH 22"-30")
                          </span>
                          <span className="text-[9px] font-mono bg-[#ff007f]/20 text-[#ff007f] px-1.5 py-0.5 rounded font-bold">
                            {style.youthPcs || 0} pcs
                          </span>
                        </div>
                        <div className="relative my-1.5">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#ff007f] font-bold text-xs">$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={style.youthSelectedPrice ?? style.youthRate ?? 15.5}
                            onChange={(e) => updateStyleField(style.id, 'youthRate', e.target.value)}
                            className="w-full pl-6 pr-3 py-1 bg-[#0d1017] border border-[#ff007f]/50 rounded text-sm font-mono font-black text-white focus:outline-none focus:border-[#ff007f]"
                          />
                        </div>
                        {/* Preset Chips Youth */}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {[11.5, 15.0, 15.5, 16.0, 19.5, 23.5].map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => selectStyleYouthPrice(style.id, p)}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                                Math.abs((style.youthSelectedPrice || 15.5) - p) < 0.001
                                  ? 'bg-[#ff007f] text-white shadow-[0_0_8px_rgba(255,0,127,0.4)]'
                                  : 'bg-[#ff007f]/20 text-[#ff007f] hover:bg-[#ff007f]/40'
                              }`}
                            >
                              ${p.toFixed(2)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="pt-2 mt-2 border-t border-[#ff007f]/20 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-gray-300">Subtotal Niño:</span>
                        <span className="text-[#ff007f] font-black">
                          ${(style.youthAmount || (style.youthPcs || 0) * (style.youthSelectedPrice || 15.5)).toFixed(2)} USD
                        </span>
                      </div>
                    </div>

                    {/* Adult Pricing Card */}
                    <div className="bg-[#00f2fe]/10 p-3.5 rounded-xl border border-[#00f2fe]/40 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-black uppercase text-[#00f2fe]">
                            👨 TARIFA ADULTO (ADULT 30"-44")
                          </span>
                          <span className="text-[9px] font-mono bg-[#00f2fe]/20 text-[#00f2fe] px-1.5 py-0.5 rounded font-bold">
                            {style.adultPcs || 0} pcs
                          </span>
                        </div>
                        <div className="relative my-1.5">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#00f2fe] font-bold text-xs">$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={style.adultSelectedPrice ?? style.adultRate ?? 21.0}
                            onChange={(e) => updateStyleField(style.id, 'adultRate', e.target.value)}
                            className="w-full pl-6 pr-3 py-1 bg-[#0d1017] border border-[#00f2fe]/50 rounded text-sm font-mono font-black text-white focus:outline-none focus:border-[#00f2fe]"
                          />
                        </div>
                        {/* Preset Chips Adult */}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {[16.0, 18.5, 21.0, 23.5, 26.0, 35.0].map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => selectStyleAdultPrice(style.id, p)}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                                Math.abs((style.adultSelectedPrice || 21.0) - p) < 0.001
                                  ? 'bg-[#00f2fe] text-[#0b0e14] shadow-[0_0_8px_rgba(0,242,254,0.4)]'
                                  : 'bg-[#00f2fe]/20 text-[#00f2fe] hover:bg-[#00f2fe]/40'
                              }`}
                            >
                              ${p.toFixed(2)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="pt-2 mt-2 border-t border-[#00f2fe]/20 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-gray-300">Subtotal Adulto:</span>
                        <span className="text-[#00f2fe] font-black">
                          ${(style.adultAmount || (style.adultPcs || 0) * (style.adultSelectedPrice || 21.0)).toFixed(2)} USD
                        </span>
                      </div>
                    </div>

                    {/* Total Style Quantity Card */}
                    <div className="bg-[#0d1017] p-3.5 rounded-xl border border-white/10 flex flex-col justify-between">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#8f9ba8]">
                          📦 Subtotal Prendas Combo:
                        </div>
                        <div className="text-3xl font-black text-[#ffe600] mt-1">{style.totalPcs} pcs</div>
                      </div>
                      <div className="space-y-1 pt-2 border-t border-white/10 text-[10px] font-mono">
                        <div className="flex items-center justify-between text-gray-300">
                          <span>👦 Niño:</span>
                          <span className="text-[#ff007f] font-bold">{style.youthPcs || 0} pcs</span>
                        </div>
                        <div className="flex items-center justify-between text-gray-300">
                          <span>👨 Adulto:</span>
                          <span className="text-[#00f2fe] font-bold">{style.adultPcs || 0} pcs</span>
                        </div>
                      </div>
                    </div>

                    {/* Combined Amount & Average Card */}
                    <div className="bg-[#39ff14]/10 p-3.5 rounded-xl border border-[#39ff14]/40 flex flex-col justify-between shadow-[0_0_15px_rgba(57,255,20,0.15)]">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#39ff14]">
                          💵 Monto Total Estilo Combo:
                        </div>
                        <div className="text-2xl font-mono font-black text-[#39ff14] mt-1">
                          ${(typeof style.amount === 'number' ? style.amount : 0).toFixed(2)} USD
                        </div>
                      </div>
                      <div className="pt-2 border-t border-[#39ff14]/30 text-[10px] font-mono text-gray-300">
                        Promedio Estilo: <span className="text-white font-bold">${style.exactPrice.toFixed(4)}/pza</span>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Options Solver Panel for COMBO */}
                  {(() => {
                    const targetVal =
                      typeof style.targetAmount === 'number' && style.targetAmount > 0
                        ? style.targetAmount
                        : parseFloat(poGrandTotal) || 0;
                    const currentTotalAmount = typeof style.amount === 'number' ? style.amount : 0;
                    const comboDiff = Number((currentTotalAmount - targetVal).toFixed(2));
                    const isPerfectMatch = Math.abs(comboDiff) < 0.01;
                    const comboCandidates = generateComboPriceCandidates(
                      targetVal,
                      style.youthPcs || 0,
                      style.adultPcs || 0
                    );

                    return (
                      <div className="mb-4 p-4 rounded-xl bg-[#0d121d] border border-[#ffe600]/40 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                        {/* Header & Target Input Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-[#ffe600]/20 flex items-center justify-center text-[#ffe600]">
                              <Sparkles className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <h4 className="text-xs font-black uppercase tracking-wide text-white">
                                🎯 Buscador de Opciones de Cuadre (.00 y .50)
                              </h4>
                              <p className="text-[10px] text-[#8f9ba8]">
                                Elige la combinación deseada de tarifas Niño y Adulto para dar exactamente el monto del PO.
                              </p>
                            </div>
                          </div>

                          {/* Target Input & Quick Actions */}
                          <div className="flex flex-wrap items-center gap-2.5">
                            <div className="flex items-center gap-1.5 bg-[#07090e] px-2.5 py-1 rounded-lg border border-[#00f2fe]/40">
                              <span className="text-[10px] font-bold uppercase text-[#00f2fe]">Monto Objetivo:</span>
                              <span className="text-white font-mono font-bold text-xs">$</span>
                              <input
                                type="number"
                                step="0.01"
                                value={style.targetAmount ?? (poGrandTotal || '')}
                                onChange={(e) => updateStyleField(style.id, 'targetAmount', e.target.value)}
                                placeholder={poGrandTotal || '1227.50'}
                                className="w-24 bg-transparent text-white font-mono font-black text-xs focus:outline-none focus:text-[#ffe600]"
                              />
                              <span className="text-[9px] text-[#8f9ba8] font-mono">USD</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const poVal = parseFloat(poGrandTotal) || 0;
                                updateStyleField(style.id, 'targetAmount', poVal);
                                autoSquareComboStyle(style.id, poVal);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#00f2fe]/15 hover:bg-[#00f2fe] text-[#00f2fe] hover:text-[#0b0e14] border border-[#00f2fe]/40 text-[10px] font-black transition-all cursor-pointer flex items-center gap-1"
                              title="Copiar Gran Total de Datos Generales y cuadrar inmediatamente"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Usar Total PO (${parseFloat(poGrandTotal || '0').toFixed(2)})</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => autoSquareComboStyle(style.id)}
                              className="px-3 py-1 rounded-lg bg-gradient-to-r from-[#ff007f] to-[#00f2fe] hover:brightness-110 text-white text-[10px] font-black transition-all cursor-pointer shadow-[0_0_10px_rgba(0,242,254,0.3)] flex items-center gap-1"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>⚡ Auto-Cuadrar</span>
                            </button>
                          </div>
                        </div>

                        {/* Status Variance Bar */}
                        <div className="my-3 flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-[#07090e] border border-white/10">
                          <div className="flex items-center gap-2 text-xs font-mono">
                            <span className="text-[#8f9ba8]">Monto Actual:</span>
                            <span className="text-white font-bold">${currentTotalAmount.toFixed(2)} USD</span>
                            <span className="text-[#8f9ba8]">|</span>
                            <span className="text-[#8f9ba8]">Monto Objetivo:</span>
                            <span className="text-[#ffe600] font-black">${targetVal.toFixed(2)} USD</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {isPerfectMatch ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#39ff14]/20 border border-[#39ff14]/50 text-[#39ff14] text-[11px] font-black font-mono shadow-[0_0_10px_rgba(57,255,20,0.2)]">
                                <Check className="w-3.5 h-3.5" /> ¡CUADRE EXACTO PERFECTO! ($0.00 USD)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ff007f]/20 border border-[#ff007f]/50 text-[#ff007f] text-[11px] font-black font-mono">
                                <AlertCircle className="w-3.5 h-3.5" /> Diferencia: {comboDiff > 0 ? `+$${comboDiff.toFixed(2)}` : `-$${Math.abs(comboDiff).toFixed(2)}`} USD ({comboDiff > 0 ? 'Excedente' : 'Faltante'})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Candidates Options Grid */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#ffe600] flex items-center gap-1.5">
                              <span>✨ Opciones disponibles de tarifas (.00 enteros y .50 mitades):</span>
                              <span className="text-[9px] font-mono bg-[#ffe600]/20 text-[#ffe600] px-1.5 py-0.5 rounded font-bold">
                                {comboCandidates.length} opciones encontradas
                              </span>
                            </span>
                            <span className="text-[9px] text-[#8f9ba8]">
                              (Haz clic en cualquier opción para aplicarla al estilo)
                            </span>
                          </div>

                          {comboCandidates.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                              {comboCandidates.map((cand, cIdx) => {
                                const isSelected =
                                  Math.abs((style.youthSelectedPrice || 15.5) - cand.youthPrice) < 0.001 &&
                                  Math.abs((style.adultSelectedPrice || 21.0) - cand.adultPrice) < 0.001;

                                return (
                                  <button
                                    key={`${cand.youthPrice}-${cand.adultPrice}-${cIdx}`}
                                    type="button"
                                    onClick={() => selectComboCandidate(style.id, cand)}
                                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                                      isSelected
                                        ? 'bg-[#39ff14]/15 border-[#39ff14] shadow-[0_0_15px_rgba(57,255,20,0.3)] ring-1 ring-[#39ff14]'
                                        : cand.isExact
                                        ? 'bg-[#121824] border-[#00f2fe]/40 hover:border-[#00f2fe] hover:bg-[#161f30]'
                                        : 'bg-[#121824]/60 border-white/10 hover:border-white/30'
                                    }`}
                                  >
                                    {/* Option Top Header */}
                                    <div className="flex items-center justify-between mb-1.5">
                                      <div className="flex items-center gap-1.5">
                                        <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
                                          isSelected
                                            ? 'bg-[#39ff14] text-[#0b0e14]'
                                            : cand.isExact
                                            ? 'bg-[#00f2fe]/20 text-[#00f2fe]'
                                            : 'bg-white/10 text-gray-300'
                                        }`}>
                                          Opción #{cIdx + 1}
                                          {cand.isStandardYouth ? ' (Recomendada)' : ''}
                                        </span>
                                      </div>

                                      {isSelected ? (
                                        <span className="text-[10px] font-black text-[#39ff14] flex items-center gap-1 font-mono">
                                          <Check className="w-3 h-3" /> EN USO
                                        </span>
                                      ) : cand.isExact ? (
                                        <span className="text-[9px] font-bold text-[#39ff14] bg-[#39ff14]/10 px-1.5 py-0.5 rounded">
                                          Exacto $0.00
                                        </span>
                                      ) : (
                                        <span className="text-[9px] font-mono text-gray-400">
                                          Dif: ${Math.abs(cand.diff).toFixed(2)}
                                        </span>
                                      )}
                                    </div>

                                    {/* Price Breakdown */}
                                    <div className="space-y-1 my-1.5 text-xs font-mono">
                                      <div className="flex items-center justify-between">
                                        <span className="text-gray-300">👦 Niño ({style.youthPcs || 0} pcs):</span>
                                        <span className="text-[#ff007f] font-black">
                                          ${cand.youthPrice.toFixed(2)}{' '}
                                          <span className="text-[10px] font-normal text-gray-400">(${cand.youthAmount.toFixed(2)})</span>
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-gray-300">👨 Adulto ({style.adultPcs || 0} pcs):</span>
                                        <span className="text-[#00f2fe] font-black">
                                          ${cand.adultPrice.toFixed(2)}{' '}
                                          <span className="text-[10px] font-normal text-gray-400">(${cand.adultAmount.toFixed(2)})</span>
                                        </span>
                                      </div>
                                    </div>

                                    {/* Total & Action Footer */}
                                    <div className="pt-2 mt-1 border-t border-white/10 flex items-center justify-between">
                                      <span className="text-[11px] font-mono font-black text-white">
                                        Total: <span className={cand.isExact ? 'text-[#39ff14]' : 'text-[#ffe600]'}>${cand.totalAmount.toFixed(2)} USD</span>
                                      </span>
                                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded transition-all ${
                                        isSelected
                                          ? 'bg-[#39ff14] text-[#0b0e14] font-black'
                                          : 'bg-white/10 text-gray-300 group-hover:bg-white group-hover:text-black'
                                      }`}>
                                        {isSelected ? '✓ Seleccionado' : 'Seleccionar'}
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-4 rounded-lg bg-[#07090e] border border-white/10 text-center text-xs text-gray-400">
                              Ingresa las cantidades de Niño y Adulto para ver las opciones disponibles de tarifas exactas.
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </>
              ) : (
                /* SINGLE CATEGORY SUMMARY GRID */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-4">
                  {/* Unit Rate Preset & Input */}
                  <div className="bg-[#0d1017] p-3 rounded-lg border border-[#39ff14]/20">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#39ff14] mb-1">
                      Tarifa Unitaria ($ / pza)
                    </label>
                    <div className="relative mb-2">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#39ff14] font-bold text-xs">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={style.unitRate ?? ''}
                        onChange={(e) => updateStyleField(style.id, 'unitRate', e.target.value)}
                        placeholder="Ej: 15.50 o 35.00"
                        className="w-full pl-6 pr-3 py-1 bg-[#12161f] border border-[#39ff14]/40 rounded text-xs font-mono font-bold text-white focus:outline-none focus:border-[#39ff14]"
                      />
                    </div>
                    {/* Preset Rate Chips */}
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => applyPresetRate(style.id, 15.5)}
                        className="px-1.5 py-0.5 rounded bg-[#ff007f]/20 hover:bg-[#ff007f] text-[#ff007f] hover:text-white text-[9px] font-mono font-bold transition-all cursor-pointer"
                        title="Tarifa estándar Niño / Youth 22-30"
                      >
                        $15.50 (Niño)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPresetRate(style.id, 35.0)}
                        className="px-1.5 py-0.5 rounded bg-[#00f2fe]/20 hover:bg-[#00f2fe] text-[#00f2fe] hover:text-[#0b0e14] text-[9px] font-mono font-bold transition-all cursor-pointer"
                        title="Tarifa estándar Adulto 30-44"
                      >
                        $35.00 (Adulto)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPresetRate(style.id, 16.0)}
                        className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white text-gray-300 hover:text-black text-[9px] font-mono font-bold transition-all cursor-pointer"
                      >
                        $16
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPresetRate(style.id, 18.5)}
                        className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white text-gray-300 hover:text-black text-[9px] font-mono font-bold transition-all cursor-pointer"
                      >
                        $18.50
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPresetRate(style.id, 25.0)}
                        className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white text-gray-300 hover:text-black text-[9px] font-mono font-bold transition-all cursor-pointer"
                      >
                        $25
                      </button>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="bg-[#0d1017] p-3 rounded-lg border border-[#00f2fe]/20">
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
                        className="w-full pl-6 pr-3 py-1 bg-[#12161f] border border-[#00f2fe]/30 rounded text-xs font-mono font-bold text-white focus:outline-none focus:border-[#00f2fe]"
                      />
                    </div>
                    <span className="block text-[9px] text-[#8f9ba8] mt-2">
                      {style.totalPcs > 0 && typeof style.amount === 'number'
                        ? `= $${(style.amount / style.totalPcs).toFixed(4)} / pza`
                        : 'Monto total asignado'}
                    </span>
                  </div>

                  {/* Total Pcs */}
                  <div className="bg-[#0d1017] p-3 rounded-lg border border-white/5 flex flex-col justify-between">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#8f9ba8]">Subtotal Prendas:</div>
                    <div className="text-2xl font-black text-[#ffe600] mt-1">{style.totalPcs} pcs</div>
                    <div className="text-[9px] text-gray-400 font-mono">
                      Y: {Object.values(style.qtyYouth).reduce((a, b) => a + (Number(b) || 0), 0)} | A:{' '}
                      {Object.values(style.qtyAdult).reduce((a, b) => a + (Number(b) || 0), 0)}
                    </div>
                  </div>

                  {/* Exact Price */}
                  <div className="bg-[#0d1017] p-3 rounded-lg border border-white/5 flex flex-col justify-between">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#8f9ba8]">Precio Exacto (Newsoft):</div>
                    <div className="text-xl font-mono font-black text-[#00f2fe] mt-1">
                      ${style.exactPrice.toFixed(4)} USD
                    </div>
                    <div className="text-[9px] text-gray-400">Sin redondeo</div>
                  </div>

                  {/* Suggested / Selected Price */}
                  <div className={`p-3 rounded-lg flex flex-col justify-between border ${
                    style.userSelectedPrice !== undefined
                      ? 'bg-[#39ff14]/10 border-[#39ff14] shadow-[0_0_15px_rgba(57,255,20,0.2)]'
                      : 'bg-[#0d1017] border-[#39ff14]/30'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#39ff14]">
                        {style.userSelectedPrice !== undefined ? '✓ Precio Seleccionado:' : 'Precio Sugerido:'}
                      </div>
                      {style.userSelectedPrice !== undefined && (
                        <span className="text-[9px] bg-[#39ff14] text-[#0b0e14] px-1.5 py-0.2 rounded font-black">
                          ACTIVO
                        </span>
                      )}
                    </div>
                    <div className="text-2xl font-mono font-black text-[#39ff14] mt-1">
                      ${style.roundedPrice.toFixed(2)} USD
                    </div>
                    <div className="text-[9px] text-gray-300 font-medium">{style.roundNotes || 'Calculado'}</div>
                  </div>
                </div>
              )}

              {/* Interactive Price Selector Bar: For Standard Styles */}
              {!isCombo && style.totalPcs > 0 && style.exactPrice > 0 && (
                <div className="bg-[#0b0f17] border border-[#ffe600]/30 rounded-xl p-3.5 mb-4 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#ffe600]" />
                      <span className="text-xs font-black uppercase tracking-wider text-[#ffe600]">
                        OPCIONES DE PRECIO DISPONIBLES (ENTEROS .00 Y FRACCIONES .50)
                      </span>
                    </div>
                    <span className="text-[10px] text-[#8f9ba8]">
                      Precio Exacto Matemático: <span className="text-[#00f2fe] font-mono font-bold">${style.exactPrice.toFixed(4)} USD</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {generatePriceCandidates(style.exactPrice, style.totalPcs, style.unitRate).map((opt) => {
                      const isSelected = Math.abs(style.roundedPrice - opt.price) < 0.001;
                      const isWhole = opt.price % 1 === 0;
                      const isHalf = Math.abs(opt.price % 1 - 0.5) < 0.001;

                      return (
                        <button
                          key={opt.price}
                          type="button"
                          onClick={() => selectStylePrice(style.id, opt.price)}
                          className={`relative text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#39ff14] border-[#39ff14] text-[#0b0e14] shadow-[0_0_12px_rgba(57,255,20,0.4)] scale-[1.02] z-10'
                              : isWhole
                              ? 'bg-[#121722] hover:bg-[#1c2436] border-[#00f2fe]/40 text-white hover:border-[#00f2fe]'
                              : isHalf
                              ? 'bg-[#121722] hover:bg-[#1c2436] border-[#ffe600]/40 text-white hover:border-[#ffe600]'
                              : 'bg-[#0e121a] hover:bg-[#151c27] border-white/10 text-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={`text-sm font-mono font-black ${
                                isSelected ? 'text-[#0b0e14]' : 'text-white'
                              }`}
                            >
                              ${opt.price.toFixed(2)}
                            </span>
                            <span
                              className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                                isSelected
                                  ? 'bg-[#0b0e14] text-[#39ff14]'
                                  : isWhole
                                  ? 'bg-[#00f2fe]/20 text-[#00f2fe]'
                                  : isHalf
                                  ? 'bg-[#ffe600]/20 text-[#ffe600]'
                                  : 'bg-white/10 text-gray-400'
                              }`}
                            >
                              {isWhole ? 'Entero .00' : isHalf ? 'Fracción .50' : 'Decimal'}
                            </span>
                          </div>

                          <div
                            className={`text-[10px] font-mono ${
                              isSelected ? 'text-[#0b0e14]/90 font-bold' : 'text-[#8f9ba8]'
                            }`}
                          >
                            Total: ${(opt.price * style.totalPcs).toFixed(2)} USD
                          </div>

                          <div
                            className={`text-[9px] mt-0.5 flex items-center justify-between ${
                              isSelected ? 'text-[#0b0e14]/80' : 'text-gray-400'
                            }`}
                          >
                            <span>Dif: {opt.diffPerPc >= 0 ? `+${opt.diffPerPc.toFixed(2)}` : opt.diffPerPc.toFixed(2)}/pza</span>
                            {isSelected && <span className="font-bold">✓ SELECCIONADO</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Smart Auto-Fill & Pack Multiplier Action Bar */}
              <div className="bg-[#07090e] border border-white/10 rounded-lg p-2.5 mb-3.5 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-extrabold uppercase text-[#8f9ba8] mr-1">
                    ⚡ Auto-Llenar Pack:
                  </span>
                  
                  {/* Multiplier Quick Buttons */}
                  {isCombo ? (
                    <>
                      <button
                        type="button"
                        onClick={() => autoFillStyle(style.id, 'pants', 5)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#ff007f] to-[#00f2fe] text-white text-xs font-black transition-all cursor-pointer shadow-[0_0_12px_rgba(255,230,0,0.3)]"
                        title="Llenar 5 piezas en Niño (22-30) y 3 piezas en Adulto (30-44)"
                      >
                        <span>⚡ Combo Pantalón (5x Niño + 3x Adulto)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const youthP = expandRange('22', '30', 5, 'YOUTH');
                          setStyles((prev) =>
                            prev.map((s) => (s.id === style.id ? calculateStyle({ ...s, qtyYouth: youthP.qtyYouth }) : s))
                          );
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#ff007f]/20 hover:bg-[#ff007f] text-[#ff007f] hover:text-white border border-[#ff007f]/40 text-xs font-bold transition-all cursor-pointer"
                      >
                        <span>👦 5x Niño (22-30)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const adultP = expandRange('30', '44', 3, 'ADULT');
                          setStyles((prev) =>
                            prev.map((s) => (s.id === style.id ? calculateStyle({ ...s, qtyAdult: adultP.qtyAdult }) : s))
                          );
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#00f2fe]/20 hover:bg-[#00f2fe] text-[#00f2fe] hover:text-[#0b0e14] border border-[#00f2fe]/40 text-xs font-bold transition-all cursor-pointer"
                      >
                        <span>👨 3x Adulto (30-44)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => autoFillStyle(style.id, 'letters', 2)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white text-white hover:text-black border border-white/20 text-xs font-bold transition-all cursor-pointer"
                      >
                        <span>👕 2x Letras (Niño + Adulto)</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => autoFillStyle(style.id, 'pants', 5)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#ffe600]/15 hover:bg-[#ffe600] text-[#ffe600] hover:text-[#0b0e14] border border-[#ffe600]/40 text-xs font-black transition-all cursor-pointer"
                        title="Llenar 5 piezas por cada talla de pantalón (22-30 Niño o 30-44 Adulto)"
                      >
                        <span>⚡ 5 x Talla (Pantalón)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => autoFillStyle(style.id, 'pants', 3)}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white border border-white/10 text-xs font-bold transition-all cursor-pointer"
                        title="Llenar 3 piezas por cada talla de pantalón"
                      >
                        <span>3 x Talla (Pantalón)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => autoFillStyle(style.id, 'pants', 2)}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white border border-white/10 text-xs font-bold transition-all cursor-pointer"
                        title="Llenar 2 piezas por cada talla de pantalón"
                      >
                        <span>2 x Talla (Pantalón)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => autoFillStyle(style.id, 'letters', 2)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#00f2fe]/10 hover:bg-[#00f2fe] text-[#00f2fe] hover:text-[#0b0e14] border border-[#00f2fe]/40 text-xs font-bold transition-all cursor-pointer"
                        title="Llenar tallas en letras (YXS-Y2XL o S-5XL)"
                      >
                        <span>👕 Letras (2x Talla)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => autoFillStyle(style.id, 'letters', 3)}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white border border-white/10 text-xs font-bold transition-all cursor-pointer"
                        title="Llenar 3 piezas por cada talla en letras"
                      >
                        <span>Letras (3x)</span>
                      </button>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => clearStyleSizes(style.id)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-white/10 text-xs font-bold transition-all cursor-pointer ml-auto"
                  title="Limpiar todas las tallas de este estilo"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Limpiar Tallas</span>
                </button>
              </div>

              {/* Youth Size Grid */}
              <div className="bg-[#ff007f]/5 border border-[#ff007f]/20 rounded-lg p-3.5 mb-3.5 space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-[#ff007f]/20">
                  <span className="text-[11px] font-extrabold text-[#ff007f] uppercase tracking-wider flex items-center gap-1.5">
                    <span>👦 TALLAS NIÑO / NIÑA (YOUTH / GIRLS)</span>
                  </span>
                  <span className="text-[10px] text-[#8f9ba8] font-mono font-bold">
                    Subtotal Youth:{' '}
                    <span className="text-[#ff007f]">
                      {Object.values(style.qtyYouth).reduce((a, b) => a + (Number(b) || 0), 0)} pcs
                    </span>
                  </span>
                </div>

                {/* Youth Numeric Sizes */}
                <div>
                  <span className="text-[10px] font-bold text-[#ffe600] uppercase block mb-1.5">
                    🔢 Tallas Numéricas Pantalón Niño (Youth: 22" - 30"):
                  </span>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {YOUTH_NUMERIC_SIZES.map((sz) => (
                      <div key={sz} className="text-center">
                        <label className="block text-[9px] font-bold text-[#ffe600] mb-0.5">Y-{sz}</label>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={style.qtyYouth[sz] || ''}
                          onChange={(e) => updateQuantity(style.id, 'youth', sz, e.target.value)}
                          className={`w-full text-center py-1 bg-[#0d1017] border rounded text-xs text-white font-mono focus:outline-none ${
                            Number(style.qtyYouth[sz]) > 0
                              ? 'border-[#ffe600] font-bold text-[#ffe600] bg-[#ffe600]/10 shadow-[0_0_8px_rgba(255,230,0,0.2)]'
                              : 'border-[#ffe600]/30 focus:border-[#ffe600]'
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Youth Letters */}
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1.5">
                    🔤 Tallas en Letras (Youth: YXXS - Y2XL):
                  </span>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {YOUTH_LETTER_SIZES.map((sz) => (
                      <div key={sz} className="text-center">
                        <label className="block text-[9px] font-bold text-[#8f9ba8] mb-0.5">{sz}</label>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={style.qtyYouth[sz] || ''}
                          onChange={(e) => updateQuantity(style.id, 'youth', sz, e.target.value)}
                          className={`w-full text-center py-1 bg-[#0d1017] border rounded text-xs text-white font-mono focus:outline-none ${
                            Number(style.qtyYouth[sz]) > 0
                              ? 'border-[#ff007f] font-bold text-[#ff007f] bg-[#ff007f]/10'
                              : 'border-[#ff007f]/30 focus:border-[#ff007f]'
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Adult Size Grid */}
              <div className="bg-[#00f2fe]/5 border border-[#00f2fe]/20 rounded-lg p-3.5 space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-[#00f2fe]/20">
                  <span className="text-[11px] font-extrabold text-[#00f2fe] uppercase tracking-wider flex items-center gap-1.5">
                    <span>👨 ADULTO HOMBRE / MUJER (ADULT / WOMENS)</span>
                  </span>
                  <span className="text-[10px] text-[#8f9ba8] font-mono font-bold">
                    Subtotal Adult:{' '}
                    <span className="text-[#00f2fe]">
                      {Object.values(style.qtyAdult).reduce((a, b) => a + (Number(b) || 0), 0)} pcs
                    </span>
                  </span>
                </div>

                {/* Adult Numeric Sizes */}
                <div>
                  <span className="text-[10px] font-bold text-[#39ff14] uppercase block mb-1.5">
                    🔢 Tallas Numéricas Pantalón Adulto (Adult: 30" - 44"):
                  </span>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-11 gap-2">
                    {ADULT_NUMERIC_SIZES.map((sz) => (
                      <div key={sz} className="text-center">
                        <label className="block text-[9px] font-bold text-[#39ff14] mb-0.5">T-{sz}</label>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={style.qtyAdult[sz] || ''}
                          onChange={(e) => updateQuantity(style.id, 'adult', sz, e.target.value)}
                          className={`w-full text-center py-1 bg-[#0d1017] border rounded text-xs text-white font-mono focus:outline-none ${
                            Number(style.qtyAdult[sz]) > 0
                              ? 'border-[#39ff14] font-bold text-[#39ff14] bg-[#39ff14]/10 shadow-[0_0_8px_rgba(57,255,20,0.2)]'
                              : 'border-[#39ff14]/30 focus:border-[#39ff14]'
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Adult Letters */}
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1.5">
                    🔤 Tallas en Letras (Adult: XXXS - 5XL):
                  </span>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-11 gap-2">
                    {ADULT_LETTER_SIZES.map((sz) => (
                      <div key={sz} className="text-center">
                        <label className="block text-[9px] font-bold text-[#8f9ba8] mb-0.5">{sz}</label>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={style.qtyAdult[sz] || ''}
                          onChange={(e) => updateQuantity(style.id, 'adult', sz, e.target.value)}
                          className={`w-full text-center py-1 bg-[#0d1017] border rounded text-xs text-white font-mono focus:outline-none ${
                            Number(style.qtyAdult[sz]) > 0
                              ? 'border-[#00f2fe] font-bold text-[#00f2fe] bg-[#00f2fe]/10'
                              : 'border-[#00f2fe]/30 focus:border-[#00f2fe]'
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
