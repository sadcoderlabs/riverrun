import { createThemes } from '@tamagui/theme-builder';
import * as Colors from '@tamagui/colors';

/**
 * Converts a hex color to HSLA format
 * @param hex - Hex color string (e.g. "#ff0000")
 * @param alpha - Optional alpha value (0-1), defaults to 1
 * @returns HSLA color string (e.g. "hsla(0, 100%, 50%, 1)")
 */
function hexToHSLA(hex: string, alpha: number = 1): string {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Parse hex values
  let r, g, b;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  }

  // Convert to 0-1 range
  r /= 255;
  g /= 255;
  b /= 255;

  // Find min and max values
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  // Calculate lightness
  const l = (max + min) / 2;

  // Calculate saturation
  let s = 0;
  if (max !== min) {
    s = l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
  }

  // Calculate hue
  let h = 0;
  if (max !== min) {
    if (max === r) {
      h = (g - b) / (max - min) + (g < b ? 6 : 0);
    } else if (max === g) {
      h = (b - r) / (max - min) + 2;
    } else {
      h = (r - g) / (max - min) + 4;
    }
    h /= 6;
  }

  // Convert to degrees and percentages
  const hDeg = Math.round(h * 360);
  const sPercent = Math.round(s * 100);
  const lPercent = Math.round(l * 100);

  // Return HSLA string
  return `hsla(${hDeg}, ${sPercent}%, ${lPercent}%, ${alpha})`;
}

const darkPalette = [
  hexToHSLA('#111113', 1),
  hexToHSLA('#19191b', 1),
  hexToHSLA('#222325', 1),
  hexToHSLA('#292a2e', 1),
  hexToHSLA('#303136', 1),
  hexToHSLA('#393a40', 1),
  hexToHSLA('#46484f', 1),
  hexToHSLA('#5f606a', 1),
  hexToHSLA('#6c6e79', 1),
  hexToHSLA('#797b86', 1),
  hexToHSLA('#b2b3bd', 1),
  hexToHSLA('#eeeef0', 1),
];
const lightPalette = [
  hexToHSLA('#fcfcfd', 1),
  hexToHSLA('#f9f9fb', 1),
  hexToHSLA('#eff0f3', 1),
  hexToHSLA('#e7e8ec', 1),
  hexToHSLA('#e0e1e6', 1),
  hexToHSLA('#d8d9e0', 1),
  hexToHSLA('#cdced7', 1),
  hexToHSLA('#b9bbc6', 1),
  hexToHSLA('#8b8d98', 1),
  hexToHSLA('#80828d', 1),
  hexToHSLA('#62636c', 1),
  hexToHSLA('#1e1f24', 1),
];

const lightShadows = {
  shadow1: 'rgba(0,0,0,0.04)',
  shadow2: 'rgba(0,0,0,0.08)',
  shadow3: 'rgba(0,0,0,0.16)',
  shadow4: 'rgba(0,0,0,0.24)',
  shadow5: 'rgba(0,0,0,0.32)',
  shadow6: 'rgba(0,0,0,0.4)',
};

const darkShadows = {
  shadow1: 'rgba(0,0,0,0.2)',
  shadow2: 'rgba(0,0,0,0.3)',
  shadow3: 'rgba(0,0,0,0.4)',
  shadow4: 'rgba(0,0,0,0.5)',
  shadow5: 'rgba(0,0,0,0.6)',
  shadow6: 'rgba(0,0,0,0.7)',
};

// we're adding some example sub-themes for you to show how they are done, "success" "warning", "error":

const builtThemes = createThemes({
  base: {
    palette: {
      dark: darkPalette,
      light: lightPalette,
    },

    extra: {
      light: {
        ...Colors.green,
        ...Colors.red,
        ...Colors.yellow,
        ...Colors.gray,
        gray3: '#f2f2f2',
        ...Colors.grayA,
        ...lightShadows,
        shadowColor: lightShadows.shadow1,
        listItemBackground: lightPalette[0],
        listItemBorderColor: lightPalette[3],
      },
      dark: {
        ...Colors.greenDark,
        ...Colors.redDark,
        ...Colors.yellowDark,
        ...Colors.grayDark,
        gray3: '#010101',
        ...Colors.grayDarkA,
        ...darkShadows,
        shadowColor: darkShadows.shadow1,
        listItemBackground: darkPalette[0],
        listItemBorderColor: darkPalette[3],
      },
    },
  },

  accent: {
    palette: {
      dark: [
        hexToHSLA('#0f120d', 1),
        hexToHSLA('#151a12', 1),
        hexToHSLA('#1f291a', 1),
        hexToHSLA('#283720', 1),
        hexToHSLA('#324527', 1),
        hexToHSLA('#3c532f', 1),
        hexToHSLA('#476337', 1),
        hexToHSLA('#547540', 1),
        hexToHSLA('#b9fe91', 1),
        hexToHSLA('#b0f488', 1),
        hexToHSLA('#a5e282', 1),
        hexToHSLA('#d6f7c5', 1),
      ],
      light: [
        hexToHSLA('#fbfef9', 1),
        hexToHSLA('#f4fcf1', 1),
        hexToHSLA('#ddfdce', 1),
        hexToHSLA('#c7faae', 1),
        hexToHSLA('#b3f392', 1),
        hexToHSLA('#9ee677', 1),
        hexToHSLA('#84d555', 1),
        hexToHSLA('#5ec200', 1),
        hexToHSLA('#66ca02', 1),
        hexToHSLA('#5bbe00', 1),
        hexToHSLA('#368500', 1),
        hexToHSLA('#23460b', 1),
      ],
    },
  },
  childrenThemes: {
    warning: {
      palette: {
        dark: Object.values(Colors.yellowDark),
        light: Object.values(Colors.yellow),
      },
    },

    error: {
      palette: {
        dark: Object.values(Colors.redDark),
        light: Object.values(Colors.red),
      },
    },

    success: {
      palette: {
        dark: Object.values(Colors.greenDark),
        light: Object.values(Colors.green),
      },
    },
  },

  // optionally add more, can pass palette or template

  // grandChildrenThemes: {
  //   alt1: {
  //     template: 'alt1',
  //   },
  //   alt2: {
  //     template: 'alt2',
  //   },
  //   surface1: {
  //     template: 'surface1',
  //   },
  //   surface2: {
  //     template: 'surface2',
  //   },
  //   surface3: {
  //     template: 'surface3',
  //   },
  // },
});

export type Themes = typeof builtThemes;

// the process.env conditional here is optional but saves web client-side bundle
// size by leaving out themes JS. tamagui automatically hydrates themes from CSS
// back into JS for you, and the bundler plugins set TAMAGUI_ENVIRONMENT. so
// long as you are using the Vite, Next, Webpack plugins this should just work,
// but if not you can just export builtThemes directly as themes:
export const themes: Themes =
  process.env.TAMAGUI_ENVIRONMENT === 'client' && process.env.NODE_ENV === 'production'
    ? ({} as unknown as Themes)
    : (builtThemes as unknown as Themes);
