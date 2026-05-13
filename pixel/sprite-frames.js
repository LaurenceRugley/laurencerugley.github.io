// pixel/sprite-frames.js
// Palette + per-state frame definitions. Frames are 16w × 24h pixel arrays.
// Each row is a 16-character string. Each character maps to a palette index
// (or '.' for transparent). Edit these arrays to refine the visual.

(function () {
  // Palette: index → CSS color string.
  // 0 reserved for transparent (use '.' in frame strings).
  // Snake-inspired Black character on a warm neutral palette that ties to the brand.
  const PALETTE = {
    '.': null,           // transparent
    'I': '#2A2218',      // ink (outline)
    'S': '#7A4E2E',      // skin (medium-dark brown)
    'H': '#1A140A',      // hair (near-black)
    'B': '#B89968',      // bandana / gold (brand accent)
    'V': '#3A3326',      // tactical vest (dark olive-brown)
    'P': '#2D2920',      // pants
    'O': '#5A4F3E',      // boots / shadow accent
    'W': '#FAF7F2',      // limestone / eye whites
    'R': '#A45235',      // box (warm cardboard)
    'L': '#6B3A22'       // box shadow
  };

  // Frame storage: state name → array of 16x24 frame strings.
  // 24 rows of 16 characters each.
  const FRAMES = {
    'idle-0': [
      '................',
      '................',
      '.....IIIII......',
      '....IBBBBBI.....',
      '....IBBBBBI.....',
      '....ISSHSSI.....',
      '....ISWHWSI.....',
      '....ISSSSSI.....',
      '.....ISSSI......',
      '....IVVVVVI.....',
      '...IVBBBBBVI....',
      '...IVVVVVVVI....',
      '...IVVVVVVVI....',
      '....IVVVVVI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IP.IPI......',
      '....IP..IPI.....',
      '....IP..IPI.....',
      '...IOOI.IOOI....',
      '...IOOI.IOOI....',
      '................',
      '................'
    ],
    'idle-1': [
      '................',
      '................',
      '................',
      '.....IIIII......',
      '....IBBBBBI.....',
      '....IBBBBBI.....',
      '....ISSHSSI.....',
      '....ISWHWSI.....',
      '....ISSSSSI.....',
      '.....ISSSI......',
      '....IVVVVVI.....',
      '...IVBBBBBVI....',
      '...IVVVVVVVI....',
      '...IVVVVVVVI....',
      '....IVVVVVI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IP.IPI......',
      '....IP..IPI.....',
      '....IP..IPI.....',
      '...IOOI.IOOI....',
      '...IOOI.IOOI....',
      '................'
    ]
  };

  window.PixelFrames = { PALETTE, FRAMES };
})();
