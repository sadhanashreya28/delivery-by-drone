const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Utility to fetch backend health state
 */
export async function fetchHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) throw new Error(`Health check failed with status ${res.status}`);
    return await res.json();
  } catch (err) {
    return { status: 'error', error: err.message, loaded_models: [] };
  }
}

/**
 * Utility to fetch 24-class metadata and safe/hazard presets
 */
export async function fetchClasses() {
  const res = await fetch(`${API_BASE_URL}/classes`);
  if (!res.ok) throw new Error('Failed to load class configuration');
  return await res.json();
}

/**
 * Utility to fetch model comparison metrics and benchmark data
 */
export async function fetchModels() {
  const res = await fetch(`${API_BASE_URL}/models`);
  if (!res.ok) throw new Error('Failed to load model metrics');
  return await res.json();
}

/**
 * Submit image and drop zone parameters to POST /assess
 */
export async function assessImage({ imageFile, model, box, alpha, safeClasses, hazardClasses }) {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('model', model);
  formData.append('box', box); // e.g. "0.35,0.35,0.65,0.65"
  formData.append('alpha', alpha);

  if (safeClasses && safeClasses.length > 0) {
    formData.append('safe_classes', safeClasses.join(','));
  }
  if (hazardClasses && hazardClasses.length > 0) {
    formData.append('hazard_classes', hazardClasses.join(','));
  }

  const res = await fetch(`${API_BASE_URL}/assess`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || `Server error (${res.status})`);
  }

  return data;
}

/**
 * Submit video file to POST /assess-video (Phase 2)
 */
export async function assessVideo({ videoFile, model, box, alpha, sampleFps = 2.0, safeClasses, hazardClasses }) {
  const formData = new FormData();
  formData.append('video', videoFile);
  formData.append('model', model);
  formData.append('box', box);
  formData.append('alpha', alpha);
  formData.append('sample_fps', sampleFps);

  if (safeClasses && safeClasses.length > 0) {
    formData.append('safe_classes', safeClasses.join(','));
  }
  if (hazardClasses && hazardClasses.length > 0) {
    formData.append('hazard_classes', hazardClasses.join(','));
  }

  const res = await fetch(`${API_BASE_URL}/assess-video`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || `Server error (${res.status})`);
  }

  return data;
}

export { API_BASE_URL };
