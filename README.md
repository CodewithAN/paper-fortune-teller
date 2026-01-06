# Paper Fortune Teller - React for WebView

A minimal React paper fortune teller game designed to be embedded in a React Native WebView.

## Features

- **No background, no titles, no buttons** - Just the pure game
- **React Native WebView callback** - Sends fortune data when revealed
- **Touch-friendly** - Works great on mobile devices

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build for Production

```bash
npm run build
```

The built files will be in the `dist/` folder.

## React Native Integration

### 1. Copy the dist folder to your React Native project

Copy the contents of `dist/` to your React Native project's assets (e.g., `assets/web/fortune-teller/`).

### 2. Use in React Native WebView

```jsx
import React from 'react';
import { WebView } from 'react-native-webview';
import { Platform } from 'react-native';

export default function FortuneTellerGame({ onFortuneRevealed }) {
  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'fortuneRevealed') {
        // Handle the fortune reveal
        console.log('Fortune:', data.fortune);
        console.log('Flap Number:', data.flapNumber);
        
        if (onFortuneRevealed) {
          onFortuneRevealed(data);
        }
      }
    } catch (e) {
      console.error('Error parsing WebView message:', e);
    }
  };

  // For local asset
  const source = Platform.select({
    ios: require('./assets/web/fortune-teller/index.html'),
    android: { uri: 'file:///android_asset/web/fortune-teller/index.html' },
  });

  // Or use a URL if hosted
  // const source = { uri: 'https://your-domain.com/fortune-teller/' };

  return (
    <WebView
      source={source}
      onMessage={handleMessage}
      style={{ flex: 1, backgroundColor: 'transparent' }}
      originWhitelist={['*']}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      allowFileAccess={true}
      scalesPageToFit={true}
    />
  );
}
```

### 3. Callback Data Structure (Guaranteed Win)

When a fortune is revealed, the WebView **always** sends a success callback:

```javascript
{
  type: 'fortuneRevealed',
  fortune: 'Your fortune text here',
  flapNumber: 1,  // 1-8, which flap was opened
  success: true   // Always true - guaranteed win
}
```

The callback is guaranteed to fire when the user completes the game. It's also dispatched as a custom DOM event `fortuneRevealed` for additional integration options.

### 4. Custom Fortunes

You can pass custom fortunes via URL parameters or by modifying the component:

```jsx
// In PaperFortune.jsx, the component accepts a `fortunes` prop
<PaperFortune fortunes={['Custom fortune 1', 'Custom fortune 2', ...]} />
```

## How to Play

1. **First Click**: Tap any colored section (Red, Blue, Green, Yellow)
   - The fortune teller animates based on the color name length
   
2. **Second Click**: Tap a number (1-8)
   - The fortune teller animates that many times

3. **Final Click**: Tap a number to reveal your fortune
   - The flap opens and your fortune is displayed
   - The callback is sent to React Native

## File Structure

```
react-fortune-teller/
├── dist/                  # Production build
├── src/
│   ├── main.jsx          # Entry point
│   ├── PaperFortune.jsx  # Main game component
│   └── styles.css        # Styles
├── index.html
├── package.json
└── vite.config.js
```

## Customization

### Change Background
The background is transparent by default for seamless WebView integration.

### Change Fortune Text
Modify the `DEFAULT_FORTUNES` array in `PaperFortune.jsx`.

### Styling
Edit `styles.css` to customize the appearance.

