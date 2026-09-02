export type TabType =
  | 'dashboard-live'
  | 'planos'
  | 'sizing-calculator'
  | 'wip'
  | 'cuadre-fd'
  | 'cuadre-mochilas'
  | 'wip-stocks'
  | 'wip-ts'
  | 'helmets-wip'
  | 'newsoft-orders'
  | 'ups-shipping'
  | 'reemplazos'
  | 'manual'
  | 'configuracion';

export interface ModuleStat {
  nombre: string;
  ordenes: number;
  balance: number;
  captura: number;
  meta: number;
  reportado?: number;
}

export interface ContainerStatus {
  textoOrdenes: string;
  pctShipping: number;
  pctEnCurso: number;
  pctAcumulado: number;
}

export interface DashboardData {
  status: string;
  kpiMochilas: {
    ordenes: number;
    balance: number;
    captura: number;
    meta: number;
  };
  mochilas: ModuleStat[];
  kpiApparel: {
    ordenes: number;
    balance: number;
    captura: number;
    meta: number;
  };
  apparel: ModuleStat[];
  contenedor: ContainerStatus;
  lastUpdated?: string;
}

export type StyleCategory = 'YOUTH' | 'WOMENS' | 'ADULT';

export interface StyleBlockData {
  id: number;
  code: string;
  category: StyleCategory;
  amount: number | '';
  qtyYouth: Record<string, number>;
  qtyAdult: Record<string, number>;
  totalPcs: number;
  exactPrice: number;
  roundedPrice: number;
  roundNotes?: string;
}

export interface BlueprintItem {
  id: string;
  code: string;
  title: string;
  category: 'Mochilas BM' | 'Mochilas PS' | 'Full Dye FD' | 'Pantalones PS' | 'Forros y Accesorios';
  modelFamily: string;
  description: string;
  specs: string[];
  colorways: string[];
  imageUrl?: string;
  isCustom?: boolean;
}

export interface SubmenuItem {
  id: string;
  nombre: string;
  gid: string;
}

export interface SheetConfig {
  id: TabType;
  title: string;
  sheetId: string;
  defaultGid: string;
  subTabs: SubmenuItem[];
}
