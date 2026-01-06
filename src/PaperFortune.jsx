import React, { useState, useCallback, useRef, useEffect } from 'react';

// Default fortunes - ALL WINNING MESSAGES! 🎉
const DEFAULT_FORTUNES = [
  'You are a winner! 🏆',
  'Great fortune awaits you! ✨',
  'Success is in your future! 🌟',
  'Lucky you! Amazing things coming! 🍀',
  'Victory is yours! 🎯',
  'You will achieve greatness! 💫',
  'Fortune smiles upon you! 😊',
  'Your dreams will come true! 🌈',
];

// Tap indicator positions for each state (accurately positioned on clickable areas)
const TAP_POSITIONS = {
  closed: [
    { top: '30%', left: '30%', hint: 'Tap a color!' },  // red - top left
    { top: '30%', left: '70%' },  // blue - top right
    { top: '70%', left: '30%' },  // green - bottom left
    { top: '70%', left: '70%' },  // yellow - bottom right
  ],
  horizontalNums: [
    // Numbers 7, 1, 5, 3 - positioned at center of inner triangles
    { top: '41%', left: '37%', hint: 'Pick a number!' },  // 7 - top left
    { top: '41%', left: '63%' },  // 1 - top right
    { top: '59%', left: '37%' },  // 5 - bottom left
    { top: '59%', left: '63%' },  // 3 - bottom right
  ],
  verticalNums: [
    // Numbers 8, 2, 6, 4 - positioned at center of inner triangles
    { top: '40%', left: '34%', hint: 'Pick a number!' },  // 8 - top left
    { top: '40%', left: '58%' },  // 2 - top right
    { top: '68%', left: '34%' },  // 6 - bottom left
    { top: '68%', left: '58%' },  // 4 - bottom right
  ],
  // No thumb indicators for opened state - just show hint text
  opened: [
    { hint: 'Reveal your fortune!' },
  ],
};

// Color mappings
const COLOR_BY_CLICK_REGION = {
  '#EF476F': 'red',
  '#06D6A0': 'green',
  '#118AB2': 'blue',
  '#FFD166': 'yellow',
};

// Helper to darken color
const getDarkerShade = (color) => {
  const darkFactor = 0.8;
  const r = parseInt(color.substr(1, 2), 16);
  const g = parseInt(color.substr(3, 2), 16);
  const b = parseInt(color.substr(5, 2), 16);
  const darkR = Math.floor(r * darkFactor);
  const darkG = Math.floor(g * darkFactor);
  const darkB = Math.floor(b * darkFactor);
  return `#${darkR.toString(16).padStart(2, '0')}${darkG.toString(16).padStart(2, '0')}${darkB.toString(16).padStart(2, '0')}`.toUpperCase();
};

// SVG States
const SVG_STATES = {
  CLOSED: 'closed',
  HORIZONTAL_NUMS: 'horizontalNums',
  VERTICAL_NUMS: 'verticalNums',
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical',
  OPENED: 'opened',
  FLAP_1: 'flap1',
  FLAP_2: 'flap2',
  FLAP_3: 'flap3',
  FLAP_4: 'flap4',
  FLAP_5: 'flap5',
  FLAP_6: 'flap6',
  FLAP_7: 'flap7',
  FLAP_8: 'flap8',
};

// Send message to React Native
const sendToReactNative = (data) => {
  // Always try to send to React Native WebView
  if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
    window.ReactNativeWebView.postMessage(JSON.stringify(data));
  }
  // Also dispatch a custom event for other integrations
  window.dispatchEvent(new CustomEvent('fortuneRevealed', { detail: data }));
  console.log('Fortune revealed:', data);
};

export default function PaperFortune({ fortunes = DEFAULT_FORTUNES, onFortuneRevealed }) {
  const [svgState, setSvgState] = useState(SVG_STATES.CLOSED);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [revealedFortune, setRevealedFortune] = useState(null);
  const [hoveredFlap, setHoveredFlap] = useState(null);
  const animationRef = useRef(null);
  const hasCalledCallback = useRef(false);

  // Function to reveal fortune and trigger callback (guaranteed win)
  const revealFortuneAndCallback = useCallback((flapNum) => {
    if (hasCalledCallback.current) return; // Prevent double callback
    hasCalledCallback.current = true;
    
    const randomFortune = fortunes[Math.floor(Math.random() * fortunes.length)];
    
    // Keep the opened state (don't distort view) - just show fortune in tooltip
    setRevealedFortune({ flap: flapNum, text: randomFortune });
    // Don't change SVG state - keep it as OPENED
    
    // Callback data - ALWAYS sent
    const callbackData = {
      type: 'fortuneRevealed',
      fortune: randomFortune,
      flapNumber: flapNum,
      success: true, // Always a win
    };
    
    // Send to React Native (guaranteed callback)
    sendToReactNative(callbackData);
    
    // Also call the prop callback if provided
    if (onFortuneRevealed) {
      onFortuneRevealed(callbackData);
    }
    
    // Reset to initial state after showing fortune (3 seconds)
    setTimeout(() => {
      setRevealedFortune(null);
      setSvgState(SVG_STATES.CLOSED);
      setCurrentTurn(0);
      hasCalledCallback.current = false; // Allow new game
    }, 3000);
  }, [fortunes, onFortuneRevealed]);

  const handleFlapClick = useCallback((flapId, fillColor) => {
    if (isAnimating) return;

    if (svgState === SVG_STATES.CLOSED) {
      // First click - animate based on color name length
      const colorName = COLOR_BY_CLICK_REGION[fillColor] || COLOR_BY_CLICK_REGION[fillColor.toUpperCase()];
      const numAnimations = colorName ? colorName.length : 4;
      setCurrentTurn(1);
      startAnimation(numAnimations, 1);
    } else if (svgState === SVG_STATES.HORIZONTAL_NUMS || svgState === SVG_STATES.VERTICAL_NUMS) {
      // Second click - animate based on number
      const num = parseInt(flapId.charAt(0));
      if (!isNaN(num)) {
        setCurrentTurn(2);
        startAnimation(num, 2);
      }
    } else if (svgState === SVG_STATES.OPENED) {
      // Final click - reveal fortune (GUARANTEED WIN)
      const flapNum = parseInt(flapId.charAt(0));
      const finalFlapNum = !isNaN(flapNum) ? flapNum : 1; // Default to flap 1 if parsing fails
      revealFortuneAndCallback(finalFlapNum);
    }
  }, [svgState, isAnimating, revealFortuneAndCallback]);

  const startAnimation = useCallback((numAnimations, turn) => {
    setIsAnimating(true);
    let count = 1;
    
    const animate = () => {
      if (count >= numAnimations) {
        // Animation complete - show state with numbers
        if (turn === 1) {
          // After first animation sequence
          setSvgState(count % 2 === 0 ? SVG_STATES.HORIZONTAL_NUMS : SVG_STATES.VERTICAL_NUMS);
        } else {
          // After second animation sequence - show fully opened
          setSvgState(SVG_STATES.OPENED);
        }
        setIsAnimating(false);
        return;
      }

      // Toggle between horizontal and vertical
      setSvgState(prev => {
        if (prev === SVG_STATES.CLOSED || prev === SVG_STATES.VERTICAL || prev === SVG_STATES.VERTICAL_NUMS) {
          return SVG_STATES.HORIZONTAL;
        }
        return SVG_STATES.VERTICAL;
      });

      count++;
      animationRef.current = setTimeout(animate, 400);
    };

    // Start first animation
    setSvgState(SVG_STATES.VERTICAL);
    animationRef.current = setTimeout(animate, 400);
  }, []);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, []);

  const handleMouseOver = useCallback((e, flapId, originalFill) => {
    setHoveredFlap({ id: flapId, originalFill });
  }, []);

  const handleMouseOut = useCallback(() => {
    setHoveredFlap(null);
  }, []);

  // Get position for fortune text based on flap number
  const getFortunePosition = (flapNum) => {
    const positions = {
      1: { top: '12%', left: '50%' },
      2: { top: '25%', left: '60%' },
      3: { top: '50%', left: '60%' },
      4: { top: '68%', left: '50%' },
      5: { top: '68%', left: '40%' },
      6: { top: '50%', left: '35%' },
      7: { top: '25%', left: '35%' },
      8: { top: '12%', left: '42%' },
    };
    return positions[flapNum] || { top: '50%', left: '50%' };
  };

  // Get tap indicator positions based on current state
  const getTapIndicators = () => {
    if (isAnimating || revealedFortune) return null;
    
    const stateKey = svgState === SVG_STATES.CLOSED ? 'closed' 
      : svgState === SVG_STATES.HORIZONTAL_NUMS ? 'horizontalNums'
      : svgState === SVG_STATES.VERTICAL_NUMS ? 'verticalNums'
      : svgState === SVG_STATES.OPENED ? 'opened'
      : null;
    
    if (!stateKey || !TAP_POSITIONS[stateKey]) return null;
    
    const positions = TAP_POSITIONS[stateKey];
    const hint = positions.find(p => p.hint)?.hint;
    const isNumberState = stateKey === 'horizontalNums' || stateKey === 'verticalNums';
    
    // Filter positions that have actual coordinates (top/left)
    const thumbPositions = positions.filter(pos => pos.top && pos.left);
    
    return (
      <>
        {thumbPositions.map((pos, index) => (
          <div 
            key={index}
            className={`tap-indicator ${isNumberState ? 'tap-indicator-small' : ''}`}
            style={{
              top: pos.top,
              left: pos.left,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="tap-indicator-circle">
              <span className="tap-indicator-icon">👆</span>
            </div>
          </div>
        ))}
        {hint && <div className="tap-hint">{hint}</div>}
      </>
    );
  };

  return (
    <div className="paper-fortune-container">
      <div className={`origami-wrapper ${isAnimating ? 'animating' : ''}`}>
        <OrigamiSVG 
          state={svgState} 
          onFlapClick={handleFlapClick}
          hoveredFlap={hoveredFlap}
          onMouseOver={handleMouseOver}
          onMouseOut={handleMouseOut}
        />
        {getTapIndicators()}
        {/* Fortune revealed - show in black tooltip */}
        {revealedFortune && (
          <div className="fortune-tooltip">
            <span className="fortune-emoji">🔮</span>
            <span className="fortune-text">{revealedFortune.text}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// SVG Component that renders based on state
function OrigamiSVG({ state, onFlapClick, hoveredFlap, onMouseOver, onMouseOut }) {
  const createClickHandler = (flapId, fill) => (e) => {
    e.stopPropagation();
    onFlapClick(flapId, fill);
  };

  const getHoverFill = (flapId, originalFill) => {
    if (hoveredFlap && hoveredFlap.id === flapId) {
      return getDarkerShade(originalFill);
    }
    return originalFill;
  };

  switch (state) {
    case SVG_STATES.CLOSED:
      return <ClosedSVG onFlapClick={createClickHandler} getHoverFill={getHoverFill} onMouseOver={onMouseOver} onMouseOut={onMouseOut} />;
    case SVG_STATES.HORIZONTAL:
      return <HorizontalSVG />;
    case SVG_STATES.VERTICAL:
      return <VerticalSVG />;
    case SVG_STATES.HORIZONTAL_NUMS:
      return <HorizontalNumsSVG onFlapClick={createClickHandler} getHoverFill={getHoverFill} onMouseOver={onMouseOver} onMouseOut={onMouseOut} />;
    case SVG_STATES.VERTICAL_NUMS:
      return <VerticalNumsSVG onFlapClick={createClickHandler} getHoverFill={getHoverFill} onMouseOver={onMouseOver} onMouseOut={onMouseOut} />;
    case SVG_STATES.OPENED:
      return <OpenedSVG onFlapClick={createClickHandler} getHoverFill={getHoverFill} onMouseOver={onMouseOver} onMouseOut={onMouseOut} />;
    case 'flap1':
      return <Flap1OpenedSVG />;
    case 'flap2':
      return <Flap2OpenedSVG />;
    case 'flap3':
      return <Flap3OpenedSVG />;
    case 'flap4':
      return <Flap4OpenedSVG />;
    case 'flap5':
      return <Flap5OpenedSVG />;
    case 'flap6':
      return <Flap6OpenedSVG />;
    case 'flap7':
      return <Flap7OpenedSVG />;
    case 'flap8':
      return <Flap8OpenedSVG />;
    default:
      return <ClosedSVG onFlapClick={createClickHandler} getHoverFill={getHoverFill} onMouseOver={onMouseOver} onMouseOut={onMouseOut} />;
  }
}

// Closed SVG
function ClosedSVG({ onFlapClick, getHoverFill, onMouseOver, onMouseOut }) {
  return (
    <svg width="456" height="437" viewBox="0 0 456 437" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g id="upper-left-flap-d">
        <path id="upper-left-flap" d="M2.0 1.9C14.5 -8.6 223.5 28.4 223.5 28.4V213.0H38.5C38.5 213.0 -10.5 12.3 2.0 1.9Z" fill="#EF476F"/>
        <path 
          id="upper-left-click" 
          d="M2.0 1.9C14.5 -8.6 223.5 28.4 223.5 28.4V213.0H38.5C38.5 213.0 -10.5 12.3 2.0 1.9Z" 
          fill={getHoverFill('upper-left-click', '#EF476F')}
          onClick={onFlapClick('upper-left-click', '#EF476F')}
          onMouseOver={(e) => onMouseOver(e, 'upper-left-click', '#EF476F')}
          onMouseOut={onMouseOut}
          style={{ cursor: 'pointer' }}
        />
        <line x1="3.7" y1="1.8" x2="222.7" y2="211.8" stroke="#962B44" strokeWidth="2"/>
      </g>
      <g id="lower-left-flap-d">
        <path id="lower-left-flap" d="M12.4 433.9C2.0 421.4 38.9 212.4 38.9 212.4H223.6V397.4C223.6 397.4 22.8 446.4 12.4 433.9Z" fill="#06D6A0"/>
        <path 
          id="lower-left-click" 
          d="M12.4 433.9C2.0 421.4 38.9 212.4 38.9 212.4H223.6V397.4C223.6 397.4 22.8 446.4 12.4 433.9Z" 
          fill={getHoverFill('lower-left-click', '#06D6A0')}
          onClick={onFlapClick('lower-left-click', '#06D6A0')}
          onMouseOver={(e) => onMouseOver(e, 'lower-left-click', '#06D6A0')}
          onMouseOut={onMouseOut}
          style={{ cursor: 'pointer' }}
        />
        <line x1="222.7" y1="213.2" x2="13.3" y2="433.7" stroke="#00664C" strokeWidth="2.0"/>
      </g>
      <g id="upper-right-flap-d">
        <path id="upper-right-flap" d="M445.1 2.2C432.6 -8.2 223.6 28.7 223.6 28.7V213.4H408.6C408.6 213.4 457.6 12.6 445.1 2.2Z" fill="#118AB2"/>
        <path 
          id="upper-right-click" 
          d="M445.1 2.2C432.6 -8.2 223.6 28.7 223.6 28.7V213.4H408.6C408.6 213.4 457.6 12.6 445.1 2.2Z" 
          fill={getHoverFill('upper-right-click', '#118AB2')}
          onClick={onFlapClick('upper-right-click', '#118AB2')}
          onMouseOver={(e) => onMouseOver(e, 'upper-right-click', '#118AB2')}
          onMouseOut={onMouseOut}
          style={{ cursor: 'pointer' }}
        />
        <path d="M445.0 2.4L222.5 213.1" stroke="#094559" strokeWidth="2.0"/>
      </g>
      <g id="lower-right-flap-d">
        <path id="lower-right-flap" d="M434.7 434.2C445.1 421.7 408.2 212.704 408.212 212.7H223.5V397.7C223.5 397.7 424.2 446.7 434.7 434.2Z" fill="#FFD166"/>
        <path 
          id="lower-right-click" 
          d="M434.7 434.205C445.1 421.7 408.2 212.7 408.2 212.7H223.5V397.7C223.5 397.7 424.2 446.7 434.7 434.2Z" 
          fill={getHoverFill('lower-right-click', '#FFD166')}
          onClick={onFlapClick('lower-right-click', '#FFD166')}
          onMouseOver={(e) => onMouseOver(e, 'lower-right-click', '#FFD166')}
          onMouseOut={onMouseOut}
          style={{ cursor: 'pointer' }}
        />
        <line x1="222.7" y1="211.8" x2="437.7" y2="434" stroke="#917535" strokeWidth="2"/>
      </g>
    </svg>
  );
}

// Horizontal SVG (animation frame)
function HorizontalSVG() {
  return (
    <svg width="456" height="461" viewBox="0 0 456 461" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g id="Top-Right-Flap">
        <path d="M2.04 2.20C14.54 -8.21 223.54 28.70 223.54 28.70V213.37H38.54C38.54 213.37 -10.45 12.62 2.04 2.20Z" fill="#EF476F"/>
        <path d="M3.69 2.13L222.69 212.13" stroke="#962B44" strokeWidth="2"/>
        <path d="M137 141.35L224.31 78.35L224.31 213.19L40.20 214.78L137 141.35Z" fill="#962B44"/>
      </g>
      <g id="Top-Left-Flap">
        <path d="M446.06 2.56C433.56 -7.86 224.56 29.05 224.56 29.05V213.73H409.56C409.56 213.73 458.56 12.97 446.06 2.56Z" fill="#118AB2"/>
        <path d="M224 28.35L224 210.35" stroke="#962B44" strokeWidth="2"/>
        <path d="M445.00 2.77L222.45 213.5" stroke="#094559" strokeWidth="2.00"/>
        <path d="M309.46 140.69L224.91 77.55L225.02 212.23L408.97 213.56L309.46 140.69Z" fill="#073E51"/>
      </g>
      <g id="Bottom-Right-Flap">
        <path d="M12.85 433.85C2.43 421.35 39.35 212.35 39.35 212.35H224.02V397.35C224.02 397.35 23.26 446.35 12.85 433.85Z" fill="#06D6A0"/>
        <line x1="223.19" y1="214.19" x2="13.71" y2="434.74" stroke="#00664C" strokeWidth="2.00"/>
        <path d="M140.04 281.41L224.52 341.35L224.52 210.92L39.77 210.50L140.04 281.41Z" fill="#00664C"/>
        <line x1="222.00" y1="211.34" x2="224.00" y2="399.34" stroke="#00664C" strokeWidth="2.00"/>
      </g>
      <g id="Bottom-Left-Flap">
        <path d="M435.2 435.2C445.6 422.7 408.7 213.7 408.7 213.7H224V398.7C224 398.7 424.8 447.7 435.2 435.2Z" fill="#FFD166"/>
        <line x1="223.2" y1="212.8" x2="438.2" y2="435.8" stroke="#917535" strokeWidth="2"/>
        <path d="M308.0 282.4L222.2 342.5L224.6 211.0L409.0 213.0L308.0 282.4Z" fill="#917535"/>
      </g>
    </svg>
  );
}

// Vertical SVG (animation frame)
function VerticalSVG() {
  return (
    <svg width="461" height="456" viewBox="0 0 461 456" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g id="Group 1">
        <path d="M1.9 453.3C-8.6 440.8 28.4 231.8 28.4 231.8L213.0 231.8L213.0 416.8C213.0 416.8 12.3 465.8 1.9 453.3Z" fill="#06D6A0"/>
        <path d="M1.8 451.7L211.8 232.7" stroke="#00664C" strokeWidth="2"/>
        <path d="M127.4 320.4L54.0 233.1L213.0 233.1L213.0 417.1L127.4 320.4Z" fill="#00664C"/>
      </g>
      <g id="Group 2">
        <path d="M2.2 9.3C-8.2 21.8 28.7 230.8 28.7 230.8L213.4 230.8L213.4 45.8C213.4 45.8 12.6 -3.2 2.2 9.3Z" fill="#EF476F"/>
        <path d="M28.0 231.4L210.0 231.4" stroke="#EF476F" strokeWidth="2"/>
      </g>
      <path d="M2.4 10.3L213.1 232.9" stroke="#962B44" strokeWidth="2.0"/>
      <path d="M433.5 442.5C421.0 452.9 212.0 416.0 212.0 416.0L212.0 231.3L397.0 231.3C397.0 231.3 446.0 432.1 433.5 442.5Z" fill="#FFD166"/>
      <path d="M434.9 20.2C422.4 9.8 213.4 46.7 213.4 46.7L213.4 231.4L398.4 231.4C398.4 231.4 447.4 30.6 434.9 20.2Z" fill="#118AB2"/>
      <line x1="212.5" y1="232.2" x2="435.5" y2="17.2" stroke="#094559" strokeWidth="2"/>
      <line x1="213.8" y1="232.2" x2="434.4" y2="441.6" stroke="#987B38" strokeWidth="2.0"/>
      <line x1="211.0" y1="232.4" x2="399.0" y2="232.4" stroke="#00664C" strokeWidth="2.0"/>
      <path d="M127.4 144.8L54 233L213 233L213 47L127.4 144.8Z" fill="#962B44"/>
      <path d="M298.6 147.9L371 233H213V47L298.6 147.9Z" fill="#094559"/>
      <path d="M298.7 317.1L371.1 233H213V416.9L298.7 317.1Z" fill="#917535"/>
    </svg>
  );
}

// Horizontal with numbers SVG
function HorizontalNumsSVG({ onFlapClick, getHoverFill, onMouseOver, onMouseOut }) {
  return (
    <svg width="456" height="461" viewBox="0 0 456 461" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g id="Group 1">
        <path d="M2.04 1.85C14.54 -8.56 223.54 28.35 223.54 28.35V213.02H38.54C38.54 213.02 -10.46 12.26 2.04 1.85Z" fill="#EF476F"/>
      </g>
      <g id="Group 2">
        <path d="M446.06 2.20C433.56 -8.21 224.56 28.70 224.56 28.70V213.37H409.56C409.56 213.37 458.56 12.62 446.06 2.20Z" fill="#118AB2"/>
        <path d="M224 28L224 210" stroke="#962B44" strokeWidth="2"/>
      </g>
      <path d="M445.00 2.42L222.45 213.14" stroke="#094559" strokeWidth="2.00"/>
      <path d="M3.69 1.78L222.69 211.78" stroke="#962B44" strokeWidth="2"/>
      <path 
        id="1-click" 
        d="M309.46 140.34L224.91 77.20L225.02 211.88L408.97 213.20L309.46 140.34Z" 
        fill={getHoverFill('1-click', '#073E51')}
        onClick={onFlapClick('1-click', '#073E51')}
        onMouseOver={(e) => onMouseOver(e, '1-click', '#073E51')}
        onMouseOut={onMouseOut}
        style={{ cursor: 'pointer' }}
      />
      <path d="M137 141L224.31 78L224.31 212.83L40.20 214.43L137 141Z" fill="#962B44"/>
      <path 
        id="7-click" 
        d="M137 141L224.31 78L224.31 212.83L40.20 214.43L137 141Z" 
        fill={getHoverFill('7-click', '#962B44')}
        onClick={onFlapClick('7-click', '#962B44')}
        onMouseOver={(e) => onMouseOver(e, '7-click', '#962B44')}
        onMouseOut={onMouseOut}
        style={{ cursor: 'pointer' }}
      />
      <path d="M12.85 433.50C2.43 421 39.35 212 39.35 212H224.02V397C224.02 397 23.27 446 12.85 433.50Z" fill="#06D6A0"/>
      <path d="M435.17 434.85C445.58 422.35 408.67 213.35 408.67 213.35H224V398.35C224 398.35 424.75 447.35 435.17 434.85Z" fill="#FFD166"/>
      <line x1="223.17" y1="212.45" x2="438.17" y2="435.45" stroke="#917535" strokeWidth="2"/>
      <line x1="223.18" y1="213.83" x2="13.71" y2="434.39" stroke="#00664C" strokeWidth="2.00"/>
      <path d="M140 281.1L224.5 341L224.5 210.6L39.8 210.2L140 281.1Z" fill="#00664C"/>
      <path 
        id="5-click" 
        d="M140 281.1L224.5 341L224.5 210.6L39.8 210.2L140 281.1Z" 
        fill={getHoverFill('5-click', '#00664C')}
        onClick={onFlapClick('5-click', '#00664C')}
        onMouseOver={(e) => onMouseOver(e, '5-click', '#00664C')}
        onMouseOut={onMouseOut}
        style={{ cursor: 'pointer' }}
      />
      <path d="M308 282L222.2 342.2L224.6 210.7L409 212.7L308 282Z" fill="#917535"/>
      <path 
        id="3-click" 
        d="M308 282L222.2 342.2L224.6 210.7L409 212.7L308 282Z" 
        fill={getHoverFill('3-click', '#917535')}
        onClick={onFlapClick('3-click', '#917535')}
        onMouseOver={(e) => onMouseOver(e, '3-click', '#917535')}
        onMouseOut={onMouseOut}
        style={{ cursor: 'pointer' }}
      />
      <line x1="222" y1="211" x2="224" y2="399" stroke="#00664C" strokeWidth="2"/>
      <text fill="white" style={{whiteSpace: 'pre', pointerEvents: 'none'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="262.5" y="188.4">1</tspan></text>
      <text fill="white" style={{whiteSpace: 'pre', pointerEvents: 'none'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="158.5" y="275.4">5</tspan></text>
      <text fill="white" style={{whiteSpace: 'pre', pointerEvents: 'none'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="258.1" y="275.4">3</tspan></text>
      <text fill="white" style={{whiteSpace: 'pre', pointerEvents: 'none'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="159.7" y="188.4">7</tspan></text>
    </svg>
  );
}

// Vertical with numbers SVG
function VerticalNumsSVG({ onFlapClick, getHoverFill, onMouseOver, onMouseOut }) {
  return (
    <svg width="461" height="456" viewBox="0 0 461 456" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g id="Group 1">
        <path d="M1.85 453.31C-8.56 440.81 28.35 231.81 28.35 231.81L213.02 231.81L213.02 416.81C213.02 416.81 12.26 465.81 1.85 453.31Z" fill="#06D6A0"/>
      </g>
      <g id="Group 2">
        <path d="M2.20 9.29C-8.21 21.79 28.70 230.79 28.70 230.79L213.37 230.79L213.37 45.79C213.37 45.79 12.62 -3.20 2.20 9.29Z" fill="#EF476F"/>
        <path d="M28 231.36L210 231.36" stroke="#EF476F" strokeWidth="2"/>
      </g>
      <path d="M2.42 10.35L213.14 232.90" stroke="#962B44" strokeWidth="2.01"/>
      <path d="M1.78 451.66L211.78 232.66" stroke="#00664C" strokeWidth="2"/>
      <path d="M433.50 442.50C421.00 452.92 212.00 416.00 212.00 416.00L212.00 231.33L397.00 231.33C397.00 231.33 446.00 432.08 433.50 442.50Z" fill="#FFD166"/>
      <path d="M434.85 20.18C422.35 9.77 213.35 46.68 213.35 46.68L213.35 231.36L398.35 231.36C398.35 231.36 447.35 30.60 434.85 20.18Z" fill="#118AB2"/>
      <line x1="212.45" y1="232.17" x2="435.45" y2="17.18" stroke="#094559" strokeWidth="2"/>
      <line x1="213.84" y1="232.16" x2="434.39" y2="441.64" stroke="#987B38" strokeWidth="2.01"/>
      <line x1="210.99" y1="232.35" x2="399.00" y2="232.35" stroke="#00664C" strokeWidth="2.01"/>
      <path d="M127.4 144.8L54 233L213 233L213 47L127.4 144.8Z" fill="#962B44"/>
      <path 
        id="8-click" 
        d="M127.4 144.8L54 233L213 233L213 47L127.4 144.8Z" 
        fill={getHoverFill('8-click', '#962B44')}
        onClick={onFlapClick('8-click', '#962B44')}
        onMouseOver={(e) => onMouseOver(e, '8-click', '#962B44')}
        onMouseOut={onMouseOut}
        style={{ cursor: 'pointer' }}
      />
      <path d="M298.6 147.9L371 233H213V47L298.6 147.9Z" fill="#094559"/>
      <path 
        id="2-click" 
        d="M298.6 147.9L371 233H213V47L298.6 147.9Z" 
        fill={getHoverFill('2-click', '#094559')}
        onClick={onFlapClick('2-click', '#094559')}
        onMouseOver={(e) => onMouseOver(e, '2-click', '#094559')}
        onMouseOut={onMouseOut}
        style={{ cursor: 'pointer' }}
      />
      <text fill="white" style={{whiteSpace: 'pre', pointerEvents: 'none'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="250.9" y="190.4">2</tspan></text>
      <path d="M127.4 320.4L54 233.1L213 233.1L213 417.1L127.4 320.4Z" fill="#00664C"/>
      <path 
        id="6-click" 
        d="M127.4 320.4L54 233.1L213 233.1L213 417.1L127.4 320.4Z" 
        fill={getHoverFill('6-click', '#00664C')}
        onClick={onFlapClick('6-click', '#00664C')}
        onMouseOver={(e) => onMouseOver(e, '6-click', '#00664C')}
        onMouseOut={onMouseOut}
        style={{ cursor: 'pointer' }}
      />
      <text fill="white" style={{whiteSpace: 'pre', pointerEvents: 'none'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="150.1" y="316.4">6</tspan></text>
      <path d="M298.7 317.1L371.1 233H213V416.9L298.7 317.1Z" fill="#917535"/>
      <path 
        id="4-click" 
        d="M298.7 317.1L371.1 233H213V416.9L298.7 317.1Z" 
        fill={getHoverFill('4-click', '#917535')}
        onClick={onFlapClick('4-click', '#917535')}
        onMouseOver={(e) => onMouseOver(e, '4-click', '#917535')}
        onMouseOut={onMouseOut}
        style={{ cursor: 'pointer' }}
      />
      <text fill="white" style={{whiteSpace: 'pre', pointerEvents: 'none'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="249.7" y="316.4">4</tspan></text>
      <text fill="white" style={{whiteSpace: 'pre', pointerEvents: 'none'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="150.2" y="190.4">8</tspan></text>
    </svg>
  );
}

// Fully opened SVG
function OpenedSVG({ onFlapClick, getHoverFill, onMouseOver, onMouseOut }) {
  return (
    <svg width="433" height="441" viewBox="0 0 433 441" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g id="Bottom-Right-4">
        <path 
          id="4-click" 
          d="M217 219.5L430 438H217V219.5Z" 
          fill={getHoverFill('4-click', '#FFD166')} 
          stroke="#917535" 
          strokeWidth="2"
          onClick={onFlapClick('4-click', '#FFD166')}
          onMouseOver={(e) => onMouseOver(e, '4-click', '#FFD166')}
          onMouseOut={onMouseOut}
          style={{ cursor: 'pointer' }}
        />
        <text fill="white" style={{whiteSpace: 'pre', pointerEvents: 'none'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="263.68" y="389.91">4</tspan></text>
      </g>
      <g id="Bottom-Right-3">
        <path 
          id="3-click" 
          d="M429.5 438.5L216.5 220H429.5V438.5Z" 
          fill={getHoverFill('3-click', '#FFD166')} 
          stroke="#917535" 
          strokeWidth="2"
          onClick={onFlapClick('3-click', '#FFD166')}
          onMouseOver={(e) => onMouseOver(e, '3-click', '#FFD166')}
          onMouseOut={onMouseOut}
          style={{ cursor: 'pointer' }}
        />
        <text fill="white" style={{whiteSpace: 'pre', pointerEvents: 'none'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="336.06" y="299.91">3</tspan></text>
      </g>
      <g id="Top-Right-2">
        <path 
          id="2-click" 
          d="M430.5 2.9996L217 219H430L430.5 2.9996Z" 
          fill={getHoverFill('2-click', '#118AB2')} 
          stroke="#073E51" 
          strokeWidth="2"
          onClick={onFlapClick('2-click', '#118AB2')}
          onMouseOver={(e) => onMouseOver(e, '2-click', '#118AB2')}
          onMouseOut={onMouseOut}
          style={{ cursor: 'pointer' }}
        />
        <text fill="white" style={{whiteSpace: 'pre', pointerEvents: 'none'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="332.85" y="178.91">2</tspan></text>
      </g>
      <g id="Top-Right-1">
        <path 
          id="1-click" 
          d="M217 221L430 2.5H217V221Z" 
          fill={getHoverFill('1-click', '#118AB2')} 
          stroke="#073E51" 
          strokeWidth="2"
          onClick={onFlapClick('1-click', '#118AB2')}
          onMouseOver={(e) => onMouseOver(e, '1-click', '#118AB2')}
          onMouseOut={onMouseOut}
          style={{ cursor: 'pointer' }}
        />
        <text fill="white" style={{whiteSpace: 'pre', pointerEvents: 'none'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="266.51" y="96.91">1</tspan></text>
      </g>
      <g id="Bottom-Left-5">
        <path 
          id="5-click" 
          d="M217 219.5L4 438H217V219.5Z" 
          fill={getHoverFill('5-click', '#06D6A0')} 
          stroke="#00664C" 
          strokeWidth="2"
          onClick={onFlapClick('5-click', '#06D6A0')}
          onMouseOver={(e) => onMouseOver(e, '5-click', '#06D6A0')}
          onMouseOut={onMouseOut}
          style={{ cursor: 'pointer' }}
        />
        <text fill="white" style={{whiteSpace: 'pre', pointerEvents: 'none'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="119.55" y="389.91">5</tspan></text>
      </g>
      <g id="Bottom-Left-6">
        <path 
          id="6-click" 
          d="M3.5 438L216.5 219.5H3.5V438Z" 
          fill={getHoverFill('6-click', '#06D6A0')} 
          stroke="#00664C" 
          strokeWidth="2"
          onClick={onFlapClick('6-click', '#06D6A0')}
          onMouseOver={(e) => onMouseOver(e, '6-click', '#06D6A0')}
          onMouseOut={onMouseOut}
          style={{ cursor: 'pointer' }}
        />
        <text fill="white" style={{whiteSpace: 'pre', pointerEvents: 'none'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="57.1" y="299.9">6</tspan></text>
      </g>
      <g id="Top-Left-7">
        <path 
          id="7-click" 
          d="M3.5 2.5L216.5 221H3.5V2.5Z" 
          fill={getHoverFill('7-click', '#EF476F')} 
          stroke="#C2395A" 
          strokeWidth="2"
          onClick={onFlapClick('7-click', '#EF476F')}
          onMouseOver={(e) => onMouseOver(e, '7-click', '#EF476F')}
          onMouseOut={onMouseOut}
          style={{ cursor: 'pointer' }}
        />
        <text fill="white" style={{whiteSpace: 'pre', pointerEvents: 'none'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="58.7" y="163.9">7</tspan></text>
      </g>
      <g id="Top-Left-8">
        <path 
          id="8-click" 
          d="M216 220.5L3 2H216V220.5Z" 
          fill={getHoverFill('8-click', '#EF476F')} 
          stroke="#962B44" 
          strokeWidth="2"
          onClick={onFlapClick('8-click', '#EF476F')}
          onMouseOver={(e) => onMouseOver(e, '8-click', '#EF476F')}
          onMouseOut={onMouseOut}
          style={{ cursor: 'pointer' }}
        />
        <text fill="white" style={{whiteSpace: 'pre', pointerEvents: 'none'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="129.2" y="96.9">8</tspan></text>
      </g>
    </svg>
  );
}

// Flap opened SVGs (1-8)
function Flap1OpenedSVG() {
  return (
    <svg width="434" height="662" viewBox="0 0 434 662" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g id="Bottom-Right-4">
        <path d="M217.0 440.5L430.0 659.0H217.0V440.5Z" fill="#FFD166" stroke="#917535" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="263.684" y="610.909">4</tspan></text>
      </g>
      <g id="Bottom-Right-3">
        <path d="M429.5 659.5L216.5 441.0H429.5V659.5Z" fill="#FFD166" stroke="#917535" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="336.064" y="520.909">3</tspan></text>
      </g>
      <g id="Top-Right-2">
        <path d="M430.5 224.0L217.0 440.0H430.0L430.5 224.0Z" fill="#118AB2" stroke="#073E51" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="332.852" y="399.909">2</tspan></text>
      </g>
      <g id="Top-Right-1">
        <path d="M217.0 442.0L430.0 223.5H217.0V442.0Z" fill="#118AB2" stroke="#073E51" strokeWidth="2"/>
      </g>
      <g id="Top-Right-1-Opened">
        <path d="M218.0 3.0L431.0 221.5H218.0V3.0Z" fill="#118AB2" stroke="#073E51" strokeWidth="2"/>
      </g>
      <g id="Bottom-Left-5">
        <path d="M217.0 440.5L4.0 659.0H217.0V440.5Z" fill="#06D6A0" stroke="#00664C" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="119.547" y="610.909">5</tspan></text>
      </g>
      <g id="Bottom-Left-6">
        <path d="M3.5 659.0L216.5 440.5H3.5V659.0Z" fill="#06D6A0" stroke="#00664C" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="57.1406" y="520.909">6</tspan></text>
      </g>
      <g id="Top-Left-7">
        <path d="M3.5 223.5L216.5 442.0H3.5V223.5Z" fill="#EF476F" stroke="#C2395A" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="58.7402" y="384.909">7</tspan></text>
      </g>
      <g id="Top-Left-8">
        <path d="M216.0 441.5L3.0 223.0H216.0V441.5Z" fill="#EF476F" stroke="#962B44" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="129.217" y="317.909">8</tspan></text>
      </g>
    </svg>
  );
}

function Flap2OpenedSVG() {
  return (
    <svg width="660" height="441" viewBox="0 0 660 441" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g id="Bottom-Right-4">
        <path d="M439 219.5L652 438H439V219.5Z" fill="#FFD166" stroke="#917535" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="485" y="389">4</tspan></text>
      </g>
      <g id="Bottom-Right-3">
        <path d="M651.5 438.5L438.5 220H651.5V438.5Z" fill="#FFD166" stroke="#917535" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="558" y="300">3</tspan></text>
      </g>
      <g id="Top-Right-2">
        <path d="M652.5 3L439 219H652L652.5 3Z" fill="#118AB2" stroke="#073E51" strokeWidth="2"/>
      </g>
      <g id="Top-Right-2-Opened">
        <path d="M439 3L652 221.5V3H439Z" fill="#118AB2" stroke="#073E51" strokeWidth="2"/>
      </g>
      <g id="Top-Right-1">
        <path d="M439 221L652 2.5H439V221Z" fill="#118AB2" stroke="#073E51" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="488" y="97">1</tspan></text>
      </g>
      <g id="Bottom-Left-5">
        <path d="M220 219.5L7 438H220V219.5Z" fill="#06D6A0" stroke="#00664C" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="122" y="390">5</tspan></text>
      </g>
      <g id="Bottom-Left-6">
        <path d="M6.5 438L219.5 219.5H6.5V438Z" fill="#06D6A0" stroke="#00664C" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="60" y="300">6</tspan></text>
      </g>
      <g id="Top-Left-7">
        <path d="M6.5 2.5L219.5 221H6.5V2.5Z" fill="#EF476F" stroke="#C2395A" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="61" y="164">7</tspan></text>
      </g>
      <g id="Top-Left-8">
        <path d="M219 220.5L6 2H219V220.5Z" fill="#EF476F" stroke="#962B44" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="132" y="97">8</tspan></text>
      </g>
    </svg>
  );
}

function Flap3OpenedSVG() {
  return (
    <svg width="660" height="441" viewBox="0 0 660 441" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g id="Bottom-Right-4">
        <path d="M439 219.5L652 438H439V219.5Z" fill="#FFD166" stroke="#917535" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="485" y="389">4</tspan></text>
      </g>
      <g id="Bottom-Right-3">
        <path d="M651.5 438.5L438.5 220H651.5V438.5Z" fill="#FFD166" stroke="#917535" strokeWidth="2"/>
      </g>
      <g id="Bottom-Right-3-Opened">
        <path d="M651.5 220L438.5 438.5V220H651.5Z" fill="#FFD166" stroke="#917535" strokeWidth="2"/>
      </g>
      <g id="Top-Right-2">
        <path d="M652.5 3L439 219H652L652.5 3Z" fill="#118AB2" stroke="#073E51" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="555" y="179">2</tspan></text>
      </g>
      <g id="Top-Right-1">
        <path d="M439 221L652 2.5H439V221Z" fill="#118AB2" stroke="#073E51" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="488" y="97">1</tspan></text>
      </g>
      <g id="Bottom-Left-5">
        <path d="M220 219.5L7 438H220V219.5Z" fill="#06D6A0" stroke="#00664C" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="122" y="390">5</tspan></text>
      </g>
      <g id="Bottom-Left-6">
        <path d="M6.5 438L219.5 219.5H6.5V438Z" fill="#06D6A0" stroke="#00664C" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="60" y="300">6</tspan></text>
      </g>
      <g id="Top-Left-7">
        <path d="M6.5 2.5L219.5 221H6.5V2.5Z" fill="#EF476F" stroke="#C2395A" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="61" y="164">7</tspan></text>
      </g>
      <g id="Top-Left-8">
        <path d="M219 220.5L6 2H219V220.5Z" fill="#EF476F" stroke="#962B44" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="132" y="97">8</tspan></text>
      </g>
    </svg>
  );
}

function Flap4OpenedSVG() {
  return (
    <svg width="434" height="662" viewBox="0 0 434 662" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g id="Bottom-Right-4">
        <path d="M217.0 440.5L430.0 659.0H217.0V440.5Z" fill="#FFD166" stroke="#917535" strokeWidth="2"/>
      </g>
      <g id="Bottom-Right-4-Opened">
        <path d="M217.0 659.0L430.0 440.5V659.0H217.0Z" fill="#FFD166" stroke="#917535" strokeWidth="2"/>
      </g>
      <g id="Bottom-Right-3">
        <path d="M429.5 659.5L216.5 441.0H429.5V659.5Z" fill="#FFD166" stroke="#917535" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="336.064" y="520.909">3</tspan></text>
      </g>
      <g id="Top-Right-2">
        <path d="M430.5 224.0L217.0 440.0H430.0L430.5 224.0Z" fill="#118AB2" stroke="#073E51" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="332.852" y="399.909">2</tspan></text>
      </g>
      <g id="Top-Right-1">
        <path d="M217.0 442.0L430.0 223.5H217.0V442.0Z" fill="#118AB2" stroke="#073E51" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="266.51" y="317.909">1</tspan></text>
      </g>
      <g id="Bottom-Left-5">
        <path d="M217.0 440.5L4.0 659.0H217.0V440.5Z" fill="#06D6A0" stroke="#00664C" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="119.547" y="610.909">5</tspan></text>
      </g>
      <g id="Bottom-Left-6">
        <path d="M3.5 659.0L216.5 440.5H3.5V659.0Z" fill="#06D6A0" stroke="#00664C" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="57.1406" y="520.909">6</tspan></text>
      </g>
      <g id="Top-Left-7">
        <path d="M3.5 223.5L216.5 442.0H3.5V223.5Z" fill="#EF476F" stroke="#C2395A" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="58.7402" y="384.909">7</tspan></text>
      </g>
      <g id="Top-Left-8">
        <path d="M216.0 441.5L3.0 223.0H216.0V441.5Z" fill="#EF476F" stroke="#962B44" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="129.217" y="317.909">8</tspan></text>
      </g>
    </svg>
  );
}

function Flap5OpenedSVG() {
  return (
    <svg width="434" height="662" viewBox="0 0 434 662" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g id="Bottom-Right-4">
        <path d="M217.0 440.5L430.0 659.0H217.0V440.5Z" fill="#FFD166" stroke="#917535" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="263.684" y="610.909">4</tspan></text>
      </g>
      <g id="Bottom-Right-3">
        <path d="M429.5 659.5L216.5 441.0H429.5V659.5Z" fill="#FFD166" stroke="#917535" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="336.064" y="520.909">3</tspan></text>
      </g>
      <g id="Top-Right-2">
        <path d="M430.5 224.0L217.0 440.0H430.0L430.5 224.0Z" fill="#118AB2" stroke="#073E51" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="332.852" y="399.909">2</tspan></text>
      </g>
      <g id="Top-Right-1">
        <path d="M217.0 442.0L430.0 223.5H217.0V442.0Z" fill="#118AB2" stroke="#073E51" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="266.51" y="317.909">1</tspan></text>
      </g>
      <g id="Bottom-Left-5">
        <path d="M217.0 440.5L4.0 659.0H217.0V440.5Z" fill="#06D6A0" stroke="#00664C" strokeWidth="2"/>
      </g>
      <g id="Bottom-Left-5-Opened">
        <path d="M217.0 659.0L4.0 440.5V659.0H217.0Z" fill="#06D6A0" stroke="#00664C" strokeWidth="2"/>
      </g>
      <g id="Bottom-Left-6">
        <path d="M3.5 659.0L216.5 440.5H3.5V659.0Z" fill="#06D6A0" stroke="#00664C" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="57.1406" y="520.909">6</tspan></text>
      </g>
      <g id="Top-Left-7">
        <path d="M3.5 223.5L216.5 442.0H3.5V223.5Z" fill="#EF476F" stroke="#C2395A" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="58.7402" y="384.909">7</tspan></text>
      </g>
      <g id="Top-Left-8">
        <path d="M216.0 441.5L3.0 223.0H216.0V441.5Z" fill="#EF476F" stroke="#962B44" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="129.217" y="317.909">8</tspan></text>
      </g>
    </svg>
  );
}

function Flap6OpenedSVG() {
  return (
    <svg width="660" height="441" viewBox="0 0 660 441" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g id="Bottom-Right-4">
        <path d="M439 219.5L652 438H439V219.5Z" fill="#FFD166" stroke="#917535" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="485" y="389">4</tspan></text>
      </g>
      <g id="Bottom-Right-3">
        <path d="M651.5 438.5L438.5 220H651.5V438.5Z" fill="#FFD166" stroke="#917535" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="558" y="300">3</tspan></text>
      </g>
      <g id="Top-Right-2">
        <path d="M652.5 3L439 219H652L652.5 3Z" fill="#118AB2" stroke="#073E51" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="555" y="179">2</tspan></text>
      </g>
      <g id="Top-Right-1">
        <path d="M439 221L652 2.5H439V221Z" fill="#118AB2" stroke="#073E51" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="488" y="97">1</tspan></text>
      </g>
      <g id="Bottom-Left-5">
        <path d="M220 219.5L7 438H220V219.5Z" fill="#06D6A0" stroke="#00664C" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="122" y="390">5</tspan></text>
      </g>
      <g id="Bottom-Left-6">
        <path d="M6.5 438L219.5 219.5H6.5V438Z" fill="#06D6A0" stroke="#00664C" strokeWidth="2"/>
      </g>
      <g id="Bottom-Left-6-Opened">
        <path d="M6.5 219.5L219.5 438V219.5H6.5Z" fill="#06D6A0" stroke="#00664C" strokeWidth="2"/>
      </g>
      <g id="Top-Left-7">
        <path d="M6.5 2.5L219.5 221H6.5V2.5Z" fill="#EF476F" stroke="#C2395A" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="61" y="164">7</tspan></text>
      </g>
      <g id="Top-Left-8">
        <path d="M219 220.5L6 2H219V220.5Z" fill="#EF476F" stroke="#962B44" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="132" y="97">8</tspan></text>
      </g>
    </svg>
  );
}

function Flap7OpenedSVG() {
  return (
    <svg width="660" height="441" viewBox="0 0 660 441" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g id="Bottom-Right-4">
        <path d="M439 219.5L652 438H439V219.5Z" fill="#FFD166" stroke="#917535" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="485" y="389">4</tspan></text>
      </g>
      <g id="Bottom-Right-3">
        <path d="M651.5 438.5L438.5 220H651.5V438.5Z" fill="#FFD166" stroke="#917535" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="558" y="300">3</tspan></text>
      </g>
      <g id="Top-Right-2">
        <path d="M652.5 3L439 219H652L652.5 3Z" fill="#118AB2" stroke="#073E51" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="555" y="179">2</tspan></text>
      </g>
      <g id="Top-Right-1">
        <path d="M439 221L652 2.5H439V221Z" fill="#118AB2" stroke="#073E51" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="488" y="97">1</tspan></text>
      </g>
      <g id="Bottom-Left-5">
        <path d="M220 219.5L7 438H220V219.5Z" fill="#06D6A0" stroke="#00664C" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="122" y="390">5</tspan></text>
      </g>
      <g id="Bottom-Left-6">
        <path d="M6.5 438L219.5 219.5H6.5V438Z" fill="#06D6A0" stroke="#00664C" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="60" y="300">6</tspan></text>
      </g>
      <g id="Top-Left-7">
        <path d="M6.5 2.5L219.5 221H6.5V2.5Z" fill="#EF476F" stroke="#C2395A" strokeWidth="2"/>
      </g>
      <g id="Top-Left-7-Opened">
        <path d="M219.5 2.5L6.5 221V2.5H219.5Z" fill="#EF476F" stroke="#C2395A" strokeWidth="2"/>
      </g>
      <g id="Top-Left-8">
        <path d="M219 220.5L6 2H219V220.5Z" fill="#EF476F" stroke="#962B44" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="132" y="97">8</tspan></text>
      </g>
    </svg>
  );
}

function Flap8OpenedSVG() {
  return (
    <svg width="434" height="662" viewBox="0 0 434 662" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g id="Bottom-Right-4">
        <path d="M217.0 440.5L430.0 659.0H217.0V440.5Z" fill="#FFD166" stroke="#917535" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="263.684" y="610.909">4</tspan></text>
      </g>
      <g id="Bottom-Right-3">
        <path d="M429.5 659.5L216.5 441.0H429.5V659.5Z" fill="#FFD166" stroke="#917535" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="336.064" y="520.909">3</tspan></text>
      </g>
      <g id="Top-Right-2">
        <path d="M430.5 224.0L217.0 440.0H430.0L430.5 224.0Z" fill="#118AB2" stroke="#073E51" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="332.852" y="399.909">2</tspan></text>
      </g>
      <g id="Top-Right-1">
        <path d="M217.0 442.0L430.0 223.5H217.0V442.0Z" fill="#118AB2" stroke="#073E51" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="266.51" y="317.909">1</tspan></text>
      </g>
      <g id="Bottom-Left-5">
        <path d="M217.0 440.5L4.0 659.0H217.0V440.5Z" fill="#06D6A0" stroke="#00664C" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="119.547" y="610.909">5</tspan></text>
      </g>
      <g id="Bottom-Left-6">
        <path d="M3.5 659.0L216.5 440.5H3.5V659.0Z" fill="#06D6A0" stroke="#00664C" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="57.1406" y="520.909">6</tspan></text>
      </g>
      <g id="Top-Left-7">
        <path d="M3.5 223.5L216.5 442.0H3.5V223.5Z" fill="#EF476F" stroke="#C2395A" strokeWidth="2"/>
        <text fill="white" style={{whiteSpace: 'pre'}} fontFamily="Inter, sans-serif" fontSize="52" fontWeight="600"><tspan x="58.7402" y="384.909">7</tspan></text>
      </g>
      <g id="Top-Left-8">
        <path d="M216.0 441.5L3.0 223.0H216.0V441.5Z" fill="#EF476F" stroke="#962B44" strokeWidth="2"/>
      </g>
      <g id="Top-Left-8-Opened">
        <path d="M3.0 441.5L216.0 223.0V441.5H3.0Z" fill="#EF476F" stroke="#962B44" strokeWidth="2"/>
      </g>
    </svg>
  );
}

