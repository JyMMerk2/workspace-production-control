import { SheetConfig } from '../types';

export const SHEETS_CONFIG: Record<string, SheetConfig> = {
  'wip': {
    id: 'wip',
    title: 'Control WIP Incompletos',
    sheetId: '19LSYonLfdDZbfVpNe_ztKcmFYYxHqOhsH_IJ_7mE4_E',
    defaultGid: '2070562325',
    subTabs: [
      { id: 'inc', nombre: 'INCOMPLETAS', gid: '2070562325' },
      { id: 'db', nombre: 'DATABASE DE CONTRATOS', gid: '1408785243' },
    ],
  },
  'cuadre-fd': {
    id: 'cuadre-fd',
    title: 'Cuadre Full Dye',
    sheetId: '1pmkNCpBGeLZEgM2gq6XwLqQHrr0nb5QpA2gnFoArCAg',
    defaultGid: '731864723',
    subTabs: [
      { id: 'fd-main', nombre: 'CUADRE FULL DYE', gid: '731864723' },
    ],
  },
  'cuadre-mochilas': {
    id: 'cuadre-mochilas',
    title: 'Cuadre Mochilas (Backpacks)',
    sheetId: '1R1-Cc4moIA6TSBDKP_vjONmO6fA51pNN5eQUSWgsNfo',
    defaultGid: '562095804',
    subTabs: [
      { id: 'moch-main', nombre: 'CUADRE MOCHILAS', gid: '562095804' },
    ],
  },
  'wip-stocks': {
    id: 'wip-stocks',
    title: 'WIP Stocks & ordenes Vendidas',
    sheetId: '1w8FY2PMwmNhEi0K9BwUoSoMV-w9EMLHm4njpS3eoi1o',
    defaultGid: '0',
    subTabs: [
      { id: 'stk-main', nombre: 'WIP STOCKS & VENDIDAS', gid: '0' },
    ],
  },
  'wip-ts': {
    id: 'wip-ts',
    title: 'WIP TS (TeamSpirit)',
    sheetId: '1Y_GJdLwWUTupF1XrD6yUkmyiCCoJLGgFE25sEbvfzng',
    defaultGid: '0',
    subTabs: [
      { id: 'ts-main', nombre: 'WIP TS', gid: '0' },
    ],
  },
  'helmets-wip': {
    id: 'helmets-wip',
    title: 'Helmets WIP',
    sheetId: '1zm9AbrJ8JrJue8dwBbLv7C11avY0xxnV1eSAYQqPCRk',
    defaultGid: '294357948',
    subTabs: [
      { id: 'hel-main', nombre: 'HELMETS WIP', gid: '294357948' },
    ],
  },
  'newsoft-orders': {
    id: 'newsoft-orders',
    title: 'Newsoft Orders',
    sheetId: '1LgbEThcjNra9HxK20yO0wix25pHUNkE5OTsY_7JTq-0',
    defaultGid: '675908853',
    subTabs: [
      { id: 'ns-main', nombre: 'NEWSOFT ORDERS', gid: '675908853' },
    ],
  },
  'ups-shipping': {
    id: 'ups-shipping',
    title: 'Shipping Contenedor & Nave 6',
    sheetId: '12OzPpI9tgfmWZ84ruWLGvSI1Lr7NvsTk7AA8rAzZ5cM',
    defaultGid: '1384137861',
    subTabs: [
      { id: 'ups-main', nombre: 'UPS SHIPPING', gid: '1384137861' },
    ],
  },
  'reemplazos': {
    id: 'reemplazos',
    title: 'Historial Reemplazos',
    sheetId: '1Er34LuDCujtnMPatu9o4AIkVQwnIQZEdB9sdx_zS8KY',
    defaultGid: '1489606763',
    subTabs: [
      { id: 'reemp-main', nombre: 'HISTORIAL REEMPLAZOS', gid: '1489606763' },
    ],
  },
};