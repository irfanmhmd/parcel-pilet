import React, { useState, useEffect, useRef } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Animated, Easing,
  Dimensions, StatusBar, Text, Alert,
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { X, Zap, ZapOff, AlertCircle } from 'lucide-react-native';
import { theme } from '../theme';
import { runOcr, OcrBlock } from '../services/ocrService';
import { ParsedParcel } from '../services/parcelParser';
import { useIsFocused } from '@react-navigation/native';

const { width: SW, height: SH } = Dimensions.get('window');
const FRAME = SW * 0.82;
const FRAME_TOP = (SH - FRAME) / 2 - 60;

// Field metadata — used for bounding box colours and labels
const FIELD_META = [
  { key: 'trackingId',   label: 'TRACKING ID', color: '#4FC3F7' },
  { key: 'customerName', label: 'CUSTOMER',    color: '#A5D6A7' },
  { key: 'mobileNumber', label: 'MOBILE',      color: '#FFD54F' },
  { key: 'address',      label: 'ADDRESS',     color: '#CE93D8' },
] as const;

interface DetectedBox {
  label: string;
  color: string;
  // normalised 0–1 relative to FRAME dimensions
  top: number; left: number; w: number; h: number;
}

export const ScannerScreen = ({ navigation }: any) => {
  const isFocused = useIsFocused();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [torch,        setTorch]          = useState(false);
  const [phase,        setPhase]          = useState<'idle' | 'processing' | 'detected' | 'error'>('idle');
  const [capturedUri,  setCapturedUri]    = useState<string | null>(null);
  const [extracted,    setExtracted]      = useState<ParsedParcel | null>(null);
  const [detectedBoxes, setDetectedBoxes] = useState<DetectedBox[]>([]);
  const [ocrError,     setOcrError]       = useState<string>('');
  const [statusMsg,    setStatusMsg]      = useState('Analysing label…');
  const [barcodeEnabled, setBarcodeEnabled] = useState(true);
  const isCameraReady = useRef(false);

  useEffect(() => {
    if (!isFocused) {
      isCameraReady.current = false;
    }
  }, [isFocused]);

  const cameraRef   = useRef<any>(null);
  const isProcessing = useRef(false);
  const scanLine    = useRef(new Animated.Value(0)).current;
  const spinAnim    = useRef(new Animated.Value(0)).current;
  const cornerPulse = useRef(new Animated.Value(1)).current;
  const boxAnims    = useRef(FIELD_META.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Camera.requestCameraPermissionsAsync().then(({ status }) =>
      setHasPermission(status === 'granted')
    );
  }, []);

  // Scan line loop
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLine, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(scanLine, { toValue: 0, duration: 2000, easing: Easing.linear, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Corner pulse loop
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(cornerPulse, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(cornerPulse, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Spinner — only when processing
  useEffect(() => {
    if (phase !== 'processing') { spinAnim.setValue(0); return; }
    const loop = Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [phase]);

  // ── Map OCR blocks → per-field bounding boxes ──────────────────────────
  const buildBoxes = (blocks: OcrBlock[], parsed: ParsedParcel): DetectedBox[] => {
    const boxes: DetectedBox[] = [];

    for (const meta of FIELD_META) {
      const value = parsed[meta.key];
      if (!value) continue;

      // Find the block whose text contains this value (case-insensitive, partial)
      const needle = value.toLowerCase().slice(0, 20);
      const block  = blocks.find(b => b.text.toLowerCase().includes(needle));

      if (block) {
        boxes.push({
          label: meta.label,
          color: meta.color,
          top:  block.boundingBox.y,
          left: block.boundingBox.x,
          w:    block.boundingBox.width,
          h:    block.boundingBox.height,
        });
      } else {
        // Field was parsed but no block matched — show a generic indicator
        boxes.push({
          label: meta.label,
          color: meta.color,
          top:  0.05 + boxes.length * 0.18,
          left: 0.03,
          w:    0.5,
          h:    0.10,
        });
      }
    }
    return boxes;
  };

  // ── Main OCR pipeline ─────────────────────────────────────────────────
  const startProcessing = async () => {
    if (isProcessing.current) return;
    isProcessing.current = true;
    setBarcodeEnabled(false);
    setPhase('processing');
    setOcrError('');
    boxAnims.forEach(a => a.setValue(0));

    // 1. Wait for React to apply barcodeEnabled=false and let the native thread release the lock
    await new Promise(resolve => setTimeout(resolve, 350));

    // Wait for camera to report itself ready
    let retries = 0;
    while (!isCameraReady.current && retries < 10) {
      await new Promise(resolve => setTimeout(resolve, 150));
      retries++;
    }

    // 1. Capture photo
    // We must wait a short moment for React to re-render and disable onBarcodeScanned,
    // otherwise the hardware camera is locked by the scanner and takePictureAsync crashes!
    await new Promise(resolve => setTimeout(resolve, 500));

    // 2. Capture photo
    let uri: string | null = null;
    try {
      if (cameraRef.current) {
        setStatusMsg('Capturing image…');
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
        uri = photo.uri;
        setCapturedUri(uri);
      }
    } catch (err: any) {
      console.error('takePictureAsync error:', err);
      isProcessing.current = false;
      setBarcodeEnabled(true);
      setPhase('error');
      setOcrError(`Failed to capture image. Please try again.\nError: ${err?.message || err}`);
      return;
    }

    if (!uri) {
      isProcessing.current = false;
      setBarcodeEnabled(true);
      setPhase('error');
      setOcrError('No image captured.');
      return;
    }

    // 3. Run OCR
    setStatusMsg('Reading label text…');
    const ocrResult = await runOcr(uri);

    if (ocrResult.error) {
      isProcessing.current = false;
      setBarcodeEnabled(true);
      if (ocrResult.error === 'GROQ_KEY_MISSING') {
        setPhase('error');
        setOcrError('Groq API Key not configured.\nOpen src/services/ocrService.ts and replace YOUR_GROQ_API_KEY with your Groq API Key.');
        return;
      }
      if (ocrResult.error === 'OCR_KEY_MISSING') {
        // API key not set — show a clear actionable message
        setPhase('error');
        setOcrError('Google Gemini API key not configured.\nOpen src/services/ocrService.ts and replace GEMINI_API_KEY with your key.');
        return;
      }
      if (ocrResult.error === 'NO_TEXT') {
        setPhase('error');
        setOcrError('No text detected on the label.\nEnsure the label is well-lit and in focus, then retry.');
        return;
      }
      setPhase('error');
      setOcrError(ocrResult.error);
      return;
    }

    // 4. Fields come directly from Gemini structured JSON
    setStatusMsg('Identifying fields…');
    const parsed = {
      trackingId:   (ocrResult as any).trackingId   ?? '',
      customerName: (ocrResult as any).customerName ?? '',
      mobileNumber: (ocrResult as any).mobileNumber ?? '',
      address:      (ocrResult as any).address      ?? '',
    };

    const hasAnyField =
      parsed.trackingId || parsed.customerName ||
      parsed.mobileNumber || parsed.address;

    if (!hasAnyField) {
      isProcessing.current = false;
      setBarcodeEnabled(true);
      setPhase('error');
      setOcrError('Could not identify any parcel fields.\nThe label may be unclear — you can enter details manually.');
      setCapturedUri(uri); // keep photo for manual entry
      return;
    }

    // 5. Build visual bounding boxes
    const boxes = buildBoxes(ocrResult.blocks, parsed);
    setDetectedBoxes(boxes);
    setExtracted(parsed);
    setPhase('detected');

    // Animate boxes in
    Animated.stagger(
      140,
      boxAnims.map(a =>
        Animated.timing(a, { toValue: 1, duration: 320, useNativeDriver: false })
      )
    ).start();
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (phase !== 'idle') return;
    // Barcode detected — treat the barcode value as a tracking ID candidate
    // and still run full OCR for the other fields
    startProcessing();
  };

  const handleConfirm = () => {
    navigation?.navigate('ScanReview', {
      photoUri: capturedUri,
      extracted: extracted ?? { trackingId: '', customerName: '', mobileNumber: '', address: '' },
    });
  };

  const handleManualEntry = () => {
    navigation?.navigate('ScanReview', {
      photoUri: capturedUri,
      extracted: extracted ?? { trackingId: '', customerName: '', mobileNumber: '', address: '' },
    });
  };

  const reset = () => {
    isProcessing.current = false;
    setBarcodeEnabled(true);
    setPhase('idle');
    setCapturedUri(null);
    setExtracted(null);
    setDetectedBoxes([]);
    setOcrError('');
    boxAnims.forEach(a => a.setValue(0));
  };

  // ── Derived animation values ──────────────────────────────────────────
  const spinDeg = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const scanLineY = scanLine.interpolate({ inputRange: [0, 1], outputRange: [0, FRAME - 4] });

  if (hasPermission === null) return <View style={styles.bg} />;
  if (hasPermission === false) return (
    <View style={[styles.bg, styles.center]}>
      <Text style={styles.permText}>Camera permission required</Text>
    </View>
  );

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {isFocused && (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          enableTorch={torch}
          onCameraReady={() => { isCameraReady.current = true; }}
          onBarcodeScanned={barcodeEnabled ? handleBarcodeScanned : undefined}
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'pdf417', 'datamatrix'],
          }}
        />
      )}

      {/* Vignette with transparent hole */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.vignetteTop} />
        <View style={styles.vignetteRow}>
          <View style={styles.vignetteSide} />
          <View style={{ width: FRAME, height: FRAME }} />
          <View style={styles.vignetteSide} />
        </View>
        <View style={styles.vignetteBottom} />
      </View>

      {/* Scan frame */}
      <View style={[styles.frameOverlay, { width: FRAME, height: FRAME }]} pointerEvents="none">
        {/* Animated corner guides */}
        <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ scale: cornerPulse }] }]}>
          {([
            { top: 0, left: 0 },
            { top: 0, right: 0, transform: [{ rotate: '90deg' }] },
            { bottom: 0, right: 0, transform: [{ rotate: '180deg' }] },
            { bottom: 0, left: 0, transform: [{ rotate: '270deg' }] },
          ] as any[]).map((pos, i) => (
            <View key={i} style={[styles.corner, pos]}>
              <View style={[styles.cornerH, { backgroundColor: theme.colors.primary }]} />
              <View style={[styles.cornerV, { backgroundColor: theme.colors.primary }]} />
            </View>
          ))}
        </Animated.View>

        {/* Scan line (idle only) */}
        {phase === 'idle' && (
          <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanLineY }] }]} />
        )}

        {/* Processing spinner */}
        {phase === 'processing' && (
          <View style={styles.center}>
            <Animated.View style={[styles.spinner, { transform: [{ rotate: spinDeg }] }]} />
            <Text style={styles.processingText}>{statusMsg}</Text>
          </View>
        )}

        {/* Real OCR bounding boxes */}
        {phase === 'detected' && detectedBoxes.map((box, i) => (
          <Animated.View
            key={box.label}
            style={[
              styles.bbox,
              {
                top:    box.top  * FRAME,
                left:   box.left * FRAME,
                width:  box.w   * FRAME,
                height: box.h   * FRAME,
                borderColor: box.color,
                opacity: boxAnims[i] ?? 1,
              },
            ]}
          >
            <View style={[styles.bboxTag, { backgroundColor: box.color }]}>
              <Text style={styles.bboxTagText}>{box.label}</Text>
            </View>
          </Animated.View>
        ))}

        {/* Error state inside frame */}
        {phase === 'error' && (
          <View style={styles.center}>
            <AlertCircle color={theme.colors.error} size={36} />
            <Text style={styles.errorText}>{ocrError}</Text>
          </View>
        )}
      </View>

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation?.goBack()}>
          <X color="#fff" size={22} />
        </TouchableOpacity>
        <Text style={styles.title}>Scan Parcel</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setTorch(t => !t)}>
          {torch
            ? <Zap    color={theme.colors.primary} size={22} />
            : <ZapOff color="#fff"                 size={22} />}
        </TouchableOpacity>
      </View>

      {/* Hint */}
      {phase === 'idle' && (
        <Text style={styles.hint}>Point at the parcel label or barcode</Text>
      )}

      {/* Bottom controls */}
      <View style={styles.bottomBar}>
        {phase === 'detected' && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.retryBtn} onPress={reset}>
              <Text style={styles.retryText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmText}>Review & Save</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === 'error' && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.retryBtn} onPress={reset}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleManualEntry}>
              <Text style={styles.confirmText}>Enter Manually</Text>
            </TouchableOpacity>
          </View>
        )}

        {(phase === 'idle' || phase === 'processing') && (
          <TouchableOpacity
            style={[styles.captureBtn, phase === 'processing' && styles.captureBtnDisabled]}
            onPress={startProcessing}
            disabled={phase === 'processing'}
          >
            <View style={[styles.captureInner, phase === 'processing' && styles.captureInnerDisabled]} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const VIGNETTE    = 'rgba(0,0,0,0.72)';
const CORNER_SIZE = 26;
const CORNER_THICK = 3;

const styles = StyleSheet.create({
  bg:     { flex: 1, backgroundColor: '#000' },
  center: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', padding: 16 },
  permText: { color: '#fff', fontSize: 16 },

  vignetteTop:    { height: FRAME_TOP, backgroundColor: VIGNETTE },
  vignetteRow:    { flexDirection: 'row', height: FRAME },
  vignetteSide:   { flex: 1, backgroundColor: VIGNETTE },
  vignetteBottom: { flex: 1, backgroundColor: VIGNETTE },

  frameOverlay: {
    position: 'absolute',
    alignSelf: 'center',
    top: FRAME_TOP,
  },

  corner:  { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE },
  cornerH: { position: 'absolute', top: 0, left: 0, width: CORNER_SIZE, height: CORNER_THICK, borderRadius: 2 },
  cornerV: { position: 'absolute', top: 0, left: 0, width: CORNER_THICK, height: CORNER_SIZE, borderRadius: 2 },

  scanLine: {
    position: 'absolute', left: 8, right: 8, height: 2,
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary, shadowOpacity: 0.9, shadowRadius: 6, elevation: 4,
  },

  spinner: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 3, borderColor: theme.colors.primary,
    borderTopColor: 'transparent', marginBottom: 12,
  },
  processingText: { color: '#fff', fontSize: 14, fontWeight: '500', textAlign: 'center' },

  bbox: {
    position: 'absolute', borderWidth: 2, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  bboxTag: {
    position: 'absolute', top: -18, left: 0,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  bboxTagText: { color: '#000', fontSize: 10, fontWeight: '700' },

  errorText: {
    color: '#fff', fontSize: 13, textAlign: 'center',
    marginTop: 12, lineHeight: 20,
  },

  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingHorizontal: 20, paddingBottom: 16,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center',
  },
  title: { color: '#fff', fontSize: 18, fontWeight: '600' },

  hint: {
    position: 'absolute',
    top: FRAME_TOP + FRAME + 16,
    alignSelf: 'center',
    color: 'rgba(255,255,255,0.7)', fontSize: 13,
  },

  bottomBar: {
    position: 'absolute', bottom: 48, left: 0, right: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  captureBtn: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 4, borderColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
  },
  captureBtnDisabled: { borderColor: 'rgba(255,255,255,0.3)' },
  captureInner:         { width: 54, height: 54, borderRadius: 27, backgroundColor: '#fff' },
  captureInnerDisabled: { backgroundColor: 'rgba(255,255,255,0.3)' },

  actionRow:  { flexDirection: 'row', gap: 16, alignItems: 'center' },
  retryBtn: {
    paddingHorizontal: 28, paddingVertical: 14, borderRadius: 28,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)',
  },
  retryText:   { color: '#fff', fontSize: 15, fontWeight: '600' },
  confirmBtn: {
    paddingHorizontal: 32, paddingVertical: 14, borderRadius: 28,
    backgroundColor: theme.colors.primary,
  },
  confirmText: { color: theme.colors.onPrimary, fontSize: 15, fontWeight: '700' },
});
