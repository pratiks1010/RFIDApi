import axios from 'axios';
import * as faceapi from 'face-api.js';
import { getFaceAuthApiBaseUrl } from './authApiConfig';

const FACE_API_BASE_URL = getFaceAuthApiBaseUrl();
const FACE_MODELS_PATH = (process.env.REACT_APP_FACE_MODELS_PATH || `${process.env.PUBLIC_URL || ''}/models/face-api`).replace(/\/$/, '');
const FACE_MODELS_FALLBACK_PATH = (
  process.env.REACT_APP_FACE_MODELS_FALLBACK_URL ||
  'https://justadudewhohacks.github.io/face-api.js/models'
).replace(/\/$/, '');
const FACE_LOCAL_MATCH_THRESHOLD = Number(process.env.REACT_APP_FACE_LOCAL_MATCH_THRESHOLD || 0.45);
const isLocalDevHost = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname || '');

let modelsLoadedPromise = null;
const LOCAL_FACE_GUARD_KEY = 'faceAuthLocalGuard';

const toBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read captured image.'));
    reader.readAsDataURL(blob);
  });

export const ensureFaceModelsLoaded = async () => {
  if (!modelsLoadedPromise) {
    modelsLoadedPromise = (async () => {
      const candidatePaths = isLocalDevHost
        ? [FACE_MODELS_FALLBACK_PATH, FACE_MODELS_PATH]
        : [FACE_MODELS_PATH, FACE_MODELS_FALLBACK_PATH];
      let lastError = null;

      for (const path of candidatePaths) {
        try {
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(path),
            faceapi.nets.faceLandmark68Net.loadFromUri(path),
            faceapi.nets.faceRecognitionNet.loadFromUri(path),
          ]);
          return;
        } catch (err) {
          lastError = err;
        }
      }

      throw lastError || new Error('Unable to load face detection models.');
    })();
  }
  await modelsLoadedPromise;
};

export const extractFaceDescriptorFromVideo = async (videoElement) => {
  await ensureFaceModelsLoaded();
  const attempts = [
    { inputSize: 416, scoreThreshold: 0.3 },
    { inputSize: 320, scoreThreshold: 0.25 },
    { inputSize: 224, scoreThreshold: 0.2 },
  ];

  const detectWithOptions = async (source, options) => {
    const all = await faceapi
      .detectAllFaces(source, new faceapi.TinyFaceDetectorOptions(options))
      .withFaceLandmarks()
      .withFaceDescriptors();
    if (!all?.length) return { detection: null, count: 0 };
    if (all.length > 1) return { detection: null, count: all.length };
    return { detection: all[0], count: 1 };
  };

  for (const options of attempts) {
    const { detection, count } = await detectWithOptions(videoElement, options);
    if (count > 1) {
      throw new Error('Multiple faces detected. Keep only one face in camera and retry.');
    }
    if (detection?.descriptor) {
      return Array.from(detection.descriptor);
    }
  }

  // Fallback: run detection on a captured frame when video stream is unstable/backlit.
  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth || 640;
  canvas.height = videoElement.videoHeight || 480;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    for (const options of attempts) {
      const { detection, count } = await detectWithOptions(canvas, options);
      if (count > 1) {
        throw new Error('Multiple faces detected. Keep only one face in camera and retry.');
      }
      if (detection?.descriptor) {
        return Array.from(detection.descriptor);
      }
    }
  }

  throw new Error('No face detected. Improve front lighting, keep face straight, and try again.');
};

const averageDescriptors = (descriptors) => {
  if (!descriptors.length) return [];
  const length = descriptors[0].length;
  const avg = new Array(length).fill(0);
  descriptors.forEach((desc) => {
    for (let i = 0; i < length; i += 1) {
      avg[i] += Number(desc[i] || 0);
    }
  });
  for (let i = 0; i < length; i += 1) {
    avg[i] /= descriptors.length;
  }
  return avg;
};

export const faceDistance = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || !a.length) {
    return Number.POSITIVE_INFINITY;
  }
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const d = Number(a[i] || 0) - Number(b[i] || 0);
    sum += d * d;
  }
  return Math.sqrt(sum);
};

export const matchFaceWithReference = (
  probeDescriptor,
  referenceDescriptor,
  { threshold = FACE_LOCAL_MATCH_THRESHOLD } = {}
) => {
  if (
    !Array.isArray(probeDescriptor) ||
    !Array.isArray(referenceDescriptor) ||
    probeDescriptor.length !== 128 ||
    referenceDescriptor.length !== 128
  ) {
    return { matched: false, distance: Number.POSITIVE_INFINITY, threshold };
  }

  const labeledRef = new faceapi.LabeledFaceDescriptors(
    'registered-user',
    [new Float32Array(referenceDescriptor)]
  );
  const matcher = new faceapi.FaceMatcher(labeledRef, threshold);
  const best = matcher.findBestMatch(new Float32Array(probeDescriptor));
  const directDistance = faceapi.euclideanDistance(
    new Float32Array(probeDescriptor),
    new Float32Array(referenceDescriptor)
  );

  return {
    matched: best.label === 'registered-user' && best.distance <= threshold,
    distance: Number.isFinite(best.distance) ? best.distance : directDistance,
    threshold,
  };
};

export const extractStableDescriptorFromVideo = async (
  videoElement,
  { sampleCount = 4, sampleGapMs = 180, maxSpread = 0.52 } = {}
) => {
  const descriptors = [];
  for (let i = 0; i < sampleCount; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const descriptor = await extractFaceDescriptorFromVideo(videoElement);
    descriptors.push(descriptor);
    if (i < sampleCount - 1) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, sampleGapMs));
    }
  }

  const anchor = averageDescriptors(descriptors);
  const maxDistance = descriptors.reduce((acc, desc) => Math.max(acc, faceDistance(anchor, desc)), 0);
  if (maxDistance > maxSpread) {
    throw new Error('Face capture unstable. Keep face steady and retry.');
  }
  return anchor;
};

export const analyzeFaceFrame = async (
  videoElement,
  { inputSize = 320, scoreThreshold = 0.25, minFaceAreaRatio = 0.06 } = {}
) => {
  await ensureFaceModelsLoaded();
  const detections = await faceapi.detectAllFaces(
    videoElement,
    new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold })
  );

  const faceCount = detections?.length || 0;
  const videoWidth = videoElement?.videoWidth || 640;
  const videoHeight = videoElement?.videoHeight || 480;
  const frameArea = videoWidth * videoHeight;

  if (!faceCount) {
    return { faceCount: 0, quality: 'no_face', message: 'No face detected' };
  }
  if (faceCount > 1) {
    return { faceCount, quality: 'multiple_faces', message: 'Multiple faces detected' };
  }

  const box = detections[0]?.box;
  const area = (box?.width || 0) * (box?.height || 0);
  const areaRatio = frameArea ? area / frameArea : 0;
  if (areaRatio < minFaceAreaRatio) {
    return { faceCount: 1, quality: 'too_far', message: 'Move closer to camera', box };
  }
  return { faceCount: 1, quality: 'good', message: 'Face tracking locked', box };
};

export const startFaceTracking = (
  videoElement,
  onUpdate,
  { intervalMs = 260 } = {}
) => {
  let stopped = false;
  let timeoutId = null;

  const loop = async () => {
    if (stopped) return;
    try {
      if (videoElement?.readyState >= 2) {
        const result = await analyzeFaceFrame(videoElement);
        onUpdate?.(result);
      }
    } catch {
      onUpdate?.({ faceCount: 0, quality: 'error', message: 'Face tracking unavailable' });
    } finally {
      if (!stopped) {
        timeoutId = setTimeout(loop, intervalMs);
      }
    }
  };

  loop();

  return () => {
    stopped = true;
    if (timeoutId) clearTimeout(timeoutId);
  };
};

export const saveLocalFaceGuard = ({ loginName, clientCode, descriptor }) => {
  if (!loginName || !clientCode || !Array.isArray(descriptor) || descriptor.length !== 128) return;
  const key = `${String(loginName).trim().toLowerCase()}::${String(clientCode).trim().toLowerCase()}`;
  const payload = {
    descriptor,
    updatedAt: new Date().toISOString(),
  };
  try {
    const raw = localStorage.getItem(LOCAL_FACE_GUARD_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const bucket = parsed && typeof parsed === 'object' ? parsed : {};
    bucket[key] = payload;
    localStorage.setItem(LOCAL_FACE_GUARD_KEY, JSON.stringify(bucket));
  } catch {
    // ignore local storage failures
  }
};

export const getLocalFaceGuard = ({ loginName, clientCode }) => {
  const key = `${String(loginName || '').trim().toLowerCase()}::${String(clientCode || '').trim().toLowerCase()}`;
  try {
    const raw = localStorage.getItem(LOCAL_FACE_GUARD_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    // Backward compatibility for older single-record format.
    if (parsed?.key && Array.isArray(parsed?.descriptor)) {
      return parsed.key === key ? parsed : null;
    }
    const record = parsed?.[key];
    if (!record || !Array.isArray(record.descriptor)) return null;
    return record;
  } catch {
    return null;
  }
};

const normalizeLoginName = (value) => String(value || '').trim();
const normalizeClientCode = (value) => String(value || '').trim().toUpperCase();

export const captureVideoFrame = async (videoElement) => {
  const width = videoElement.videoWidth || 640;
  const height = videoElement.videoHeight || 480;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to initialize camera frame context.');
  ctx.drawImage(videoElement, 0, 0, width, height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
  if (!blob) throw new Error('Unable to capture image frame.');
  return toBase64(blob);
};

export const loginWithFace = async ({ loginName, clientCode, descriptor, imageBase64 }) => {
  const response = await axios.post(`${FACE_API_BASE_URL}/api/auth/face/login`, {
    LoginName: normalizeLoginName(loginName),
    ClientCode: normalizeClientCode(clientCode),
    Descriptor: descriptor,
    ImageBase64: imageBase64,
  });
  return response.data;
};

export const getFaceStatus = async ({ loginName, clientCode }) => {
  const response = await axios.get(`${FACE_API_BASE_URL}/api/auth/face/status`, {
    params: {
      LoginName: normalizeLoginName(loginName),
      ClientCode: normalizeClientCode(clientCode),
    },
  });
  return response.data;
};

export const registerFace = async ({ loginName, clientCode, descriptor, imageBase64 }) => {
  const response = await axios.post(`${FACE_API_BASE_URL}/api/auth/face/register`, {
    LoginName: normalizeLoginName(loginName),
    ClientCode: normalizeClientCode(clientCode),
    Descriptor: descriptor,
    ImageBase64: imageBase64,
  });
  return response.data;
};

export const getFaceModelsPath = () => FACE_MODELS_PATH;
