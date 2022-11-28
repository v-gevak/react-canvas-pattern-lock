import { Theme } from './typings';

export const JUSTIFY_NODES_OPTION = {
  SPACE_AVAILABLE: 'space-around',
  SPACE_BETWEEN: 'space-between',
};

export const DEFAULT_THEME_STATE = {
  SUCCESS: 'success',
  FAILURE: 'failure',
  INITIAL: 'initial',
};

const dimens = {
  nodeRadius: 37.5,
  lineWidth: 6,
  nodeCore: 12.5,
  nodeRing: 0,
};

const baseColors = {
  primary: '#c5c5c7',
  bg: '#fff',
  ringBg: 'rgba(11, 31, 53, 0.05)',
};

export const DEFAULT_LIGHT_THEME: Theme = {
  [DEFAULT_THEME_STATE.INITIAL]: {
    colors: {
      ...baseColors,
      accent: '#000',
      selectedRingBg: 'rgba(11, 31, 53, 0.1)',
    },
    dimens,
  },
  [DEFAULT_THEME_STATE.SUCCESS]: {
    colors: {
      ...baseColors,
      accent: '#2FC26E',
      selectedRingBg: '#eaf9f0',
    },
    dimens,
  },
  [DEFAULT_THEME_STATE.FAILURE]: {
    colors: {
      ...baseColors,
      accent: '#F15045',
      selectedRingBg: '#feedeb',
    },
    dimens,
  },
};
