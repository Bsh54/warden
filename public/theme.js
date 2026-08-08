tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#051424',
        surface: '#051424',
        'surface-variant': '#273647',
        'surface-container-lowest': '#010f1f',
        'surface-container-low': '#0d1c2d',
        'surface-container': '#122131',
        'surface-container-high': '#1c2b3c',
        'on-surface': '#d4e4fa',
        'on-surface-variant': '#c7c6cd',
        'secondary-fixed-dim': '#00dbe9',
        'secondary-container': '#00eefc',
        error: '#ffb4ab',
        'error-container': '#93000a',
        'on-error-container': '#ffdad6',
      },
      borderRadius: { DEFAULT: '0.125rem', lg: '0.25rem', xl: '0.5rem', full: '0.75rem' },
      spacing: { gutter: '24px', margin: '32px' },
      fontFamily: {
        'headline-lg': ['Geist'],
        'headline-md': ['Geist'],
        'body-md': ['Inter'],
        'mono-label': ['JetBrains Mono'],
        'mono-hash': ['JetBrains Mono'],
      },
      fontSize: {
        'headline-lg': ['32px', { lineHeight: '40px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-md': ['24px', { lineHeight: '32px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'mono-label': ['13px', { lineHeight: '16px', letterSpacing: '0.02em', fontWeight: '500' }],
        'mono-hash': ['12px', { lineHeight: '16px', fontWeight: '400' }],
      },
    },
  },
};
