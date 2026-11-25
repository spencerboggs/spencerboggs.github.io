// Theme bootstrap for /apps and /pc-check. Shares the portfolio's storage key and palettes.
(function () {
  var STORAGE_KEY = 'portfolio-theme-v3';

  var PALETTES = {
    light: {
      atelier: {
        bg: '#f4efe4', bgElevated: '#ebe3d4', surface: '#e0d5c2',
        text: '#241f1a', muted: '#6f6458', accent: '#b85c38',
        accentDim: '#8f4529', line: '#d2c4ae', wash: 'rgba(184, 92, 56, 0.14)'
      },
      lagoon: {
        bg: '#e7f2ef', bgElevated: '#d7e8e3', surface: '#c5ddd6',
        text: '#17322d', muted: '#4f726a', accent: '#1f7a6c',
        accentDim: '#165a50', line: '#b4d0c8', wash: 'rgba(31, 122, 108, 0.14)'
      },
      lilac: {
        bg: '#f1ebf5', bgElevated: '#e6dde9', surface: '#d9cde0',
        text: '#261f2c', muted: '#6f6178', accent: '#8a5aa8',
        accentDim: '#6a4383', line: '#cec2d6', wash: 'rgba(138, 90, 168, 0.14)'
      }
    },
    dark: {
      azure: {
        bg: '#0f141c', bgElevated: '#161d28', surface: '#1f2836',
        text: '#e6edf5', muted: '#8fa0b5', accent: '#5b8fd4',
        accentDim: '#3f6eaa', line: '#2a3444', wash: 'rgba(91, 143, 212, 0.14)'
      },
      nocturne: {
        bg: '#12141a', bgElevated: '#1a1d26', surface: '#242834',
        text: '#ece7dc', muted: '#9aa0b0', accent: '#e0a45a',
        accentDim: '#b8823f', line: '#323846', wash: 'rgba(224, 164, 90, 0.14)'
      },
      violetum: {
        bg: '#17121c', bgElevated: '#211828', surface: '#2c2136',
        text: '#efe6f4', muted: '#a994b5', accent: '#c48ad6',
        accentDim: '#9a67ad', line: '#3a2e46', wash: 'rgba(196, 138, 214, 0.14)'
      }
    }
  };

  var root = document.documentElement;
  var state = { mode: 'dark', palette: 'azure' };

  try {
    var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && (saved.mode === 'light' || saved.mode === 'dark')) {
      state.mode = saved.mode;
      var list = PALETTES[state.mode];
      if (list[saved.paletteId]) state.palette = saved.paletteId;
      else state.palette = state.mode === 'dark' ? 'azure' : 'atelier';
    }
  } catch (e) {}

  function apply(persist) {
    var colors = PALETTES[state.mode][state.palette] || PALETTES[state.mode][state.mode === 'dark' ? 'azure' : 'atelier'];
    root.setAttribute('data-theme-mode', state.mode);
    root.setAttribute('data-theme-palette', state.palette);
    root.style.colorScheme = state.mode;
    var map = {
      '--color-bg': colors.bg,
      '--color-bg-elevated': colors.bgElevated,
      '--color-surface': colors.surface,
      '--color-text': colors.text,
      '--color-muted': colors.muted,
      '--color-accent': colors.accent,
      '--color-accent-dim': colors.accentDim,
      '--color-line': colors.line,
      '--color-wash': colors.wash
    };
    for (var key in map) {
      if (Object.prototype.hasOwnProperty.call(map, key)) root.style.setProperty(key, map[key]);
    }
    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: state.mode, paletteId: state.palette }));
      } catch (e) {}
    }
  }

  apply(false);

  function label(button) {
    var next = state.mode === 'dark' ? 'light' : 'dark';
    button.setAttribute('aria-label', 'Switch to ' + next + ' theme');
    button.setAttribute('title', 'Switch to ' + next + ' theme');
  }

  document.addEventListener('DOMContentLoaded', function () {
    var buttons = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < buttons.length; i++) {
      label(buttons[i]);
      buttons[i].addEventListener('click', function () {
        state.mode = state.mode === 'dark' ? 'light' : 'dark';
        state.palette = state.mode === 'dark' ? 'azure' : 'atelier';
        apply(true);
        for (var j = 0; j < buttons.length; j++) label(buttons[j]);
      });
    }
  });
})();
