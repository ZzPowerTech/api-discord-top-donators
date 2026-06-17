export interface TextStyle {
  color: string;
  outline?: boolean;
  shadow?: boolean;
}

export interface Position {
  x: number;
  y: number;
}

export interface PlayerPosition extends Position {
  size: number;
  rank: number;
}

export const CANVAS_CONFIG = {
  width: 1920,
  height: 1080,
} as const;

export const GRADIENT_COLORS = {
  start: '#FF69B4',
  middle: '#DA70D6',
  end: '#9370DB',
} as const;

export const POSITIONS: PlayerPosition[] = [
  { x: 360, y: 470, size: 390, rank: 2 }, // 2º lugar (esquerda)
  { x: 960, y: 450, size: 430, rank: 1 }, // 1º lugar (centro, maior)
  { x: 1560, y: 490, size: 400, rank: 3 }, // 3º lugar (direita)
];

export const FOOTER_CONFIG = {
  height: 140,
  backgroundColor: 'rgba(58, 58, 58, 1)',
  logoWidth: 500,
} as const;

export const TITLE_CONFIG = {
  text: 'TOP 3 DOADORES',
  position: { x: 960, y: 110 },
  size: 120,
  color: '#FFFFFF',
} as const;

export const SUBTITLE_CONFIG = {
  position: { x: 960, y: 200 },
  size: 60,
  color: '#ffffffff',
} as const;

export const SHADOW_CONFIG = {
  color: 'rgba(0, 0, 0, 0.86)',
  blur: 29,
  offsetX: 0,
  offsetY: 5,
} as const;

export const RANK_COLORS = {
  gold: '#FFD700',
  white: '#FFFFFF',
  position1: '#F2E3A8',
  position2: '#CFDBE0',
  position3: '#FFBAAC',
} as const;

export const RANK_TEXT_CONFIG = {
  rankOffsetY: 40,
  nameOffsetY: 90,
  rankSizeFirst: 85,
  rankSizeOther: 70,
  nameSizeFirst: 65,
  nameSizeOther: 56,
  nameLetterSpacing: 2,
} as const;

export const LOGO_CONFIG = {
  yDivisor: 1.07,
  fallbackTextDivisor: 5,
  fallbackTextSize: 60,
} as const;

export const PLACEHOLDER_USERNAME = 'N/A';
