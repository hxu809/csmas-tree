# 🎄 Interactive 3D Christmas Tree

A premium mobile-first web experience featuring a high-quality, draggable 3D Christmas tree with shake-to-celebrate functionality, procedural audio, and festive visual effects.

## ✨ Features

- **Drag Rotation**: Touch/mouse drag to rotate the tree with smooth inertia
- **Pinch Zoom**: Pinch gestures to zoom in/out (mobile)
- **Shake Detection**: Shake your phone to trigger a festive celebration
- **Original Audio**: Web Audio synthesis-generated holiday jingle (no external files)
- **Visual Effects**:
  - Twinkling light strands with wave animation
  - Particle systems (continuous snowfall + event-based sparkles)
  - Tree wobble and ornament jiggle on shake
  - Fake bloom glow effects
  - Camera micro-movements

## 🚀 How to Run

### Requirements
- Modern web browser (iOS Safari, Android Chrome, or desktop)
- Python 3 (for local server)

### Steps

1. **Navigate to the project directory:**
   ```bash
   cd /path/to/csmas-tree
   ```

2. **Start a local HTTP server:**
   ```bash
   python -m http.server 8000
   ```

   Or with Python 2:
   ```bash
   python -m SimpleHTTPServer 8000
   ```

3. **Open in browser:**
   - Desktop: Navigate to `http://localhost:8000`
   - Mobile: Find your computer's local IP address and navigate to `http://YOUR_IP:8000`
     - On macOS: `ifconfig | grep "inet "`
     - On Linux: `ip addr show`
     - On Windows: `ipconfig`

4. **On iOS devices:**
   - Must tap the "Start Experience" button to grant motion permission
   - Audio will only play after user interaction (tap Start)

5. **On desktop:**
   - Press 'S' key to simulate shake and trigger celebration

## 📱 Mobile Permissions

### iOS (Safari)
- **Motion Permission**: Required for shake detection. Requested automatically when you tap "Start Experience"
- **Audio**: Enabled on first user gesture (Start button)

### Android (Chrome)
- Motion events work without explicit permission
- Audio context may require user gesture to resume

## 🎮 Controls

| Action | Input |
|--------|-------|
| Rotate tree | Drag/swipe |
| Zoom | Pinch (mobile) |
| Celebrate | Shake device / Press 'S' (desktop) |
| Fallback jingle | Tap "Play Jingle" button (if shake unavailable) |

## 🎨 Technical Details

### Architecture
- **No bundler**: Pure ES modules via CDN
- **Three.js**: 3D rendering engine (r160)
- **Procedural geometry**: All tree components generated in code
- **Web Audio API**: Original melody synthesized in real-time

### Key Components

#### 1. Drag Rotation (main.js:593-671)
- Uses Pointer Events API for unified touch/mouse handling
- Implements inertia with velocity damping
- Smooth interpolation to target rotation
- Clamps X-axis tilt to prevent over-rotation

#### 2. Shake Detection (main.js:673-707)
- `devicemotion` event with `accelerationIncludingGravity`
- High-pass filter: measures delta between magnitude samples
- Configurable threshold (default: 14) - increase for less sensitivity
- Cooldown period (2000ms) prevents rapid re-triggers

#### 3. Audio Synthesis (main.js:723-831)
- **Original melody**: C major scale pattern, festive rhythm
- **Polyphonic**: Sine wave melody + square harmony + noise shimmer
- **ADSR envelope**: Attack, Decay, Sustain, Release for natural sound
- **No external files**: Fully procedural

#### 4. Particle Systems (main.js:388-488)
- **Snow**: 600 particles, continuous downward fall with respawn
- **Sparkles**: 300 particles, event-triggered burst with gravity
- Uses BufferGeometry for performance

#### 5. Visual Effects (main.js:833-917)
- **Tree wobble**: Sin wave rotation + scale pulse
- **Ornament jiggle**: Random offsets with decay
- **Light wave**: Bottom-to-top traveling flash (0.8s)
- **Glow pulse**: Additive blending sprites, opacity animation
- **Fake bloom**: Secondary larger meshes with additive blend

### Performance Optimizations

- InstancedMesh for repeated geometry (potential upgrade)
- Moderate particle counts (snow: 600, sparkles: 300)
- devicePixelRatio clamped to max 2x
- No postprocessing passes (lightweight fake bloom)
- Delta-time animation loop
- Shadow maps only where needed

### Tree Components (main.js:157-321)

1. **Trunk**: Cylinder, dark brown
2. **Foliage**: 4 stacked cones with organic vertex noise
3. **Star**: Extruded star shape with emissive glow
4. **Ornaments**: 11 metallic spheres (red/gold/blue)
5. **Garland**: Helix-wrapped tube geometry
6. **Light Bulbs**: 3 helix strands with twinkling effect

## 🔧 Tuning

### Shake Sensitivity
Edit `state.shakeThreshold` in main.js (line 42):
- **Lower value** (10-12): More sensitive, triggers easier
- **Higher value** (16-20): Less sensitive, requires harder shake
- **Default**: 14 (balanced for most devices)

### Particle Density
- **Snow**: Change `snowCount` on line 390
- **Sparkles**: Change `sparkleCount` on line 419

### Audio Melody
Modify the `melody` array in `playJingle()` (main.js:738-769):
- Add/remove notes
- Change durations
- Adjust frequencies in `noteFrequencies` object

## 🌟 Browser Compatibility

| Browser | Drag | Shake | Audio | Notes |
|---------|------|-------|-------|-------|
| iOS Safari 13+ | ✅ | ✅ | ✅ | Requires permission |
| Android Chrome | ✅ | ✅ | ✅ | Auto-enabled |
| Desktop Chrome | ✅ | ⌨️ | ✅ | 'S' key for shake |
| Desktop Firefox | ✅ | ⌨️ | ✅ | |
| Desktop Safari | ✅ | ⌨️ | ✅ | |

## 📦 File Structure

```
csmas-tree/
├── index.html      # HTML structure + overlay UI
├── style.css       # Mobile-first responsive styles
├── main.js         # Three.js scene + interactions + audio
└── README.md       # This file
```

## 🐛 Troubleshooting

### Motion not working on iOS
- Ensure you tapped "Start Experience" button
- Check that motion permission was granted (HUD shows status)
- Try closing and reopening Safari

### No audio
- Ensure you interacted with the page (tapped Start)
- Check device volume and mute switch
- Try tapping "Play Jingle" fallback button

### Performance issues
- Reduce particle counts in main.js
- Lower devicePixelRatio in renderer setup
- Disable shadows (comment out shadow-related code)

### Shake too sensitive/insensitive
- Adjust `state.shakeThreshold` value (main.js:42)
- Increase cooldown period (main.js:705)

## 📄 License

This project is provided as-is for educational and personal use. No external assets or copyrighted materials are used.

## 🎅 Credits

- **Three.js**: https://threejs.org
- **Procedural audio synthesis**: Web Audio API
- **All visuals**: 100% procedural geometry

---

**Merry Christmas!** 🎄✨
