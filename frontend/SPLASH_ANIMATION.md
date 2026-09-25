# ARTIFACT Premium Splash Screen Animation

## ✅ Implementation Complete

A premium, cinematic app-launch animation has been implemented for ARTIFACT.

## 📁 Files Created

1. **`frontend/components/SplashScreen.tsx`** - Main splash animation component
2. **`frontend/components/AppInitializer.tsx`** - Wrapper that manages splash state
3. **`frontend/app/layout.tsx`** - Updated to integrate splash screen

## 🎬 Animation Sequence

### Phase 1: Shield Logo Reveal (0-800ms)
- Dark gradient background (black to dark gray)
- Logo starts blurred and subtle
- Smooth scale + opacity reveal
- Subtle metallic appearance

### Phase 2: Wordmark Visible (800-1300ms)
- Logo becomes fully sharp and visible
- Metallic light sweep effect across the logo
- Subtle orange glow ambient light

### Phase 3: Tagline Reveal (1300-1700ms)
- "PERSONALIZING TECHNOLOGY" fades in
- Subtle upward movement (8px)
- Elegant uppercase tracking

### Phase 4: Complete Hold (1700-2500ms)
- Full logo composition visible
- Clean, premium presentation
- ~800ms hold time

### Phase 5: Transition (2500-2900ms)
- Smooth fade-out (400ms)
- Transition to main app

## ⏱️ Total Duration: ~2.9 seconds

## 🎨 Visual Style

- **Background**: Dark gradient (black → charcoal)
- **Color Palette**: 
  - Primary: Original logo colors (preserved)
  - Accent: Subtle orange glow (#F97316 at 5% opacity)
  - Text: Stone gray (#a8a29e)
- **Effects**:
  - Subtle blur-to-sharp transition
  - Metallic sweep animation
  - Drop shadow with orange tint
  - Premium ambient glow
- **Typography**:
  - Tagline: Semibold uppercase
  - Letter spacing: 0.3em
  - Size: Small (text-sm)

## ♿ Accessibility

✅ **Reduced Motion Support**: 
- Detects `prefers-reduced-motion: reduce`
- Falls back to simple 1.5s fade when enabled
- No disorienting animations for sensitive users

## 📱 Behavior

### Session Management
- Splash shows **once per browser session**
- Uses `sessionStorage` to track display
- Subsequent page navigations skip splash
- Resets on new browser tab/session

### Performance
- Logo image uses Next.js `priority` loading
- Main app content loads in background
- Smooth 60 FPS animations via CSS transforms
- No blocking JavaScript

## 🎯 User Experience

1. **First Visit**: User sees full 2.9s animation
2. **Navigation**: No splash on internal route changes
3. **Refresh**: Splash appears again (new session)
4. **Background Loading**: App content loads during splash

## 🔧 Technical Details

### Animation Techniques
- CSS transforms (scale, translateY)
- Opacity transitions
- Filter effects (blur, drop-shadow)
- CSS keyframes for sweep effect
- Cubic bezier easing: `(0.34, 1.56, 0.64, 1)` for premium feel

### Component Architecture
```
RootLayout
 └─ AppInitializer (client component)
     ├─ SplashScreen (conditional render)
     └─ App Content (fades in after splash)
```

### State Management
- Local React state for animation phases
- SessionStorage for splash-shown tracking
- useEffect for animation timeline
- Cleanup on unmount

## 📊 Animation Timeline

```
0ms     ━━━━━━━━━ Shield appears (blurred)
800ms   ━━━━━━━━━ Shield sharpens + metallic sweep
1300ms  ━━━━━━━━━ Tagline fades in
1700ms  ━━━━━━━━━ Complete composition visible
2500ms  ━━━━━━━━━ Fade out begins
2900ms  ━━━━━━━━━ Splash complete → App visible
```

## 🎭 Logo Integrity

✅ **Original logo preserved**:
- No color modifications
- No typography changes
- No distortion or cropping
- Transparent background maintained
- Exact proportions kept
- Located at: `/public/src/logo-artifact.png`

## 🚀 Testing Checklist

- [x] First load shows splash
- [x] Subsequent navigations skip splash
- [x] Reduced motion fallback works
- [x] Logo displays correctly
- [x] Smooth 60 FPS animation
- [x] No content flash before splash
- [x] Clean transition to app
- [x] SessionStorage tracking works

## 🎨 Customization

### Adjust Timing
Edit `frontend/components/SplashScreen.tsx`:
```typescript
const timeline = [
  { delay: 0, action: () => setPhase('shield') },
  { delay: 800, action: () => setPhase('wordmark') },    // ← Adjust these
  { delay: 1300, action: () => setPhase('tagline') },    // ← values
  { delay: 1700, action: () => setPhase('complete') },   // ← to change
  { delay: 2500, action: () => { /* fade out */ } },     // ← timing
];
```

### Change Colors
```css
bg-gradient-to-br from-[#1a1a1a] via-[#0f0f0f] to-[#000000]  /* Background */
text-stone-400/90                                              /* Tagline */
rgba(249, 115, 22, 0.15)                                       /* Glow color */
```

### Disable Splash Entirely
Remove `<AppInitializer>` wrapper from `frontend/app/layout.tsx`

## 📝 Notes

- Splash only appears on fresh session/tab open
- Uses Next.js Image component for optimization
- Pure CSS animations (no heavy JS libraries)
- Mobile-friendly and responsive
- Works on all modern browsers
- No external dependencies added

---

**Status**: ✅ Production Ready  
**Date**: 2026-09-25  
**Framework**: Next.js 14 (React)  
**Logo Location**: `/public/src/logo-artifact.png`
