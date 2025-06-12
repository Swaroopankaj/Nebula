// Import utility functions
import { 
    loadImageToCanvas, 
    applyAdjustments, 
    applyFilters, 
    applySegmentation, 
    applyTransformations, 
    resizeCanvasAndImage,
    downloadImage,
    resetImage
} from './utils.js';

// Get DOM elements
const imageUpload = document.getElementById('imageUpload');
const imageCanvas = document.getElementById('imageCanvas');
const ctx = imageCanvas.getContext('2d');
const placeholderText = document.getElementById('placeholderText');
const loadingIndicator = document.getElementById('loading');
const loadingMessage = document.getElementById('loadingMessage');
const loadingDetail = document.getElementById('loadingDetail');

// Adjustment Sliders and their value displays
const brightnessSlider = document.getElementById('brightness');
const brightnessValueDisplay = document.getElementById('brightnessValue');
const contrastSlider = document.getElementById('contrast');
const contrastValueDisplay = document.getElementById('contrastValue');
const saturationSlider = document.getElementById('saturation');
const saturationValueDisplay = document.getElementById('saturationValue');
const hueSlider = document.getElementById('hue');
const hueValueDisplay = document.getElementById('hueValue');
const globalBlurSlider = document.getElementById('globalBlur');
const globalBlurValueDisplay = document.getElementById('globalBlurValue');
const opacitySlider = document.getElementById('opacity');
const opacityValueDisplay = document.getElementById('opacityValue');

// Global Filter Buttons
const grayscaleButton = document.getElementById('grayscaleButton');
const invertButton = document.getElementById('invertButton');
const sepiaButton = document.getElementById('sepiaButton');
const glowButton = document.getElementById('glowButton');

// Color Overlay Controls
const enableColorOverlayCheckbox = document.getElementById('enableColorOverlay');
const colorOverlayControls = document.getElementById('colorOverlayControls');
const overlayColorInput = document.getElementById('overlayColor');
const overlayIntensitySlider = document.getElementById('overlayIntensity');
const overlayIntensityValueDisplay = document.getElementById('overlayIntensityValue');

// Segmentation Effect Controls
const removeBackgroundColorCheckbox = document.getElementById('removeBackgroundColorCheckbox');
const backgroundColorControls = document.getElementById('backgroundColorControls');
const bgColorInput = document.getElementById('bgColor');
const colorToleranceSlider = document.getElementById('colorTolerance');
const colorToleranceValueDisplay = document.getElementById('colorToleranceValue');
const removeBackgroundCheckbox = document.getElementById('removeBackgroundCheckbox');
const grayscaleModeRadios = document.querySelectorAll('input[name="grayscaleMode"]');
const highlightSubjectTintCheckbox = document.getElementById('highlightSubjectTint');
const tintControls = document.getElementById('tintControls');
const highlightIntensitySlider = document.getElementById('highlightIntensity');
const highlightValueDisplay = document.getElementById('highlightValue');
const highlightColorInput = document.getElementById('highlightColor');
const outlineSubjectCheckbox = document.getElementById('outlineSubject');
const outlineControls = document.getElementById('outlineControls');
const outlineThicknessSlider = document.getElementById('outlineThickness');
const outlineThicknessValueDisplay = document.getElementById('outlineThicknessValue');
const outlineColorInput = document.getElementById('outlineColor');
const dimBackgroundCheckbox = document.getElementById('dimBackground');
const dimIntensityControl = document.getElementById('dimIntensityControl');
const dimIntensitySlider = document.getElementById('dimIntensity');
const dimValueDisplay = document.getElementById('dimValue');
const blurBackgroundCheckbox = document.getElementById('blurBackgroundCheckbox');
const blurBackgroundIntensityControl = document.getElementById('blurBackgroundIntensityControl');
const blurBackgroundIntensitySlider = document.getElementById('blurBackgroundIntensity');
const blurBackgroundValueDisplay = document.getElementById('blurBackgroundValue');

// Transformation Buttons
const flipHorizontalButton = document.getElementById('flipHorizontalButton');
const flipVerticalButton = document.getElementById('flipVerticalButton');
const rotate90Button = document.getElementById('rotate90Button');
const cropSquareButton = document.getElementById('cropSquareButton');

// Resize Controls
const resizeWidthInput = document.getElementById('resizeWidth');
const resizeHeightInput = document.getElementById('resizeHeight');
const applyResizeButton = document.getElementById('applyResizeButton');

// Action Buttons
const resetButton = document.getElementById('resetButton');
const downloadButton = document.getElementById('downloadButton');
const downloadFormatSelect = document.getElementById('downloadFormat');

// Dark/Light Mode Toggle
const darkModeToggle = document.getElementById('darkModeToggle');
const sunIcon = document.getElementById('sunIcon');
const moonIcon = document.getElementById('moonIcon');

// Info Modal Elements
const infoButton = document.getElementById('infoButton');
const infoModal = document.getElementById('infoModal');
const modalBackdrop = document.getElementById('modal-backdrop');
const closeInfoModalButton = document.getElementById('closeInfoModal');


// Toggles for control sections
const toggleGlobalAdjustments = document.getElementById('toggleGlobalAdjustments');
const globalAdjustmentsControls = document.getElementById('globalAdjustmentsControls');
const toggleGlobalFilters = document.getElementById('toggleGlobalFilters');
const globalFiltersControls = document.getElementById('globalFiltersControls');
const toggleSegmentationEffects = document.getElementById('toggleSegmentationEffects');
const segmentationEffectsControls = document.getElementById('segmentationEffectsControls');
const toggleTransformations = document.getElementById('toggleTransformations');
const transformationsControls = document.getElementById('transformationsControls');
const toggleResize = document.getElementById('toggleResize');
const resizeControls = document.getElementById('resizeControls');


// Global state object
const appState = {
    originalImage: null,
    currentImage: null, // This holds the ImageData object after initial load
    brightness: 100,
    contrast: 100,
    saturation: 100,
    hue: 0,
    globalBlur: 0,
    opacity: 100,
    filter: 'none', // 'none', 'grayscale', 'invert', 'sepia', 'glow'
    colorOverlay: { enabled: false, color: '#000000', intensity: 0 },
    segmentation: {
        removeBackground: false,
        backgroundColorRemoval: { enabled: false, color: '#FFFFFF', tolerance: 50 },
        mask: null, // Stores the MediaPipe segmentation mask
        grayscaleMode: 'none', // 'none', 'bg_grayscale', 'subject_grayscale'
        highlightSubject: { enabled: false, intensity: 0.5, color: '#4F46E5' },
        outlineSubject: { enabled: false, thickness: 3, color: '#FFFFFF' },
        dimBackground: { enabled: false, intensity: 0.5 },
        blurBackground: { enabled: false, intensity: 5 }
    },
    transform: {
        flipH: false,
        flipV: false,
        rotate: 0, // 0, 90, 180, 270
    }
};

// Initialize MediaPipe Selfie Segmentation
let selfieSegmentation;
let mediaPipeReady = false;

async function initializeMediaPipe() {
    loadingIndicator.classList.remove('hidden');
    loadingMessage.textContent = 'Loading Selfie Segmentation Model...';
    loadingDetail.textContent = 'This may take a moment. Ensure you have a stable internet connection.';

    try {
        selfieSegmentation = new SelfieSegmentation({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1632777977/${file}`;
            }
        });

        selfieSegmentation.setOptions({
            modelSelection: 1, // 0 for general, 1 for landscape (background blur/removal)
            selfieMode: true, // Treat as selfie, i.e., mirror the image
        });

        selfieSegmentation.onResults((results) => {
            appState.segmentation.mask = results.segmentationMask;
            renderImage(); // Re-render image with new mask
        });

        await selfieSegmentation.initialize();
        mediaPipeReady = true;
        loadingIndicator.classList.add('hidden');
        console.log('MediaPipe Selfie Segmentation initialized.');
    } catch (error) {
        loadingMessage.textContent = 'Failed to load MediaPipe model.';
        loadingDetail.textContent = `Error: ${error.message}. Segmentation features will be unavailable.`;
        console.error('Failed to load MediaPipe Selfie Segmentation:', error);
        // Disable segmentation checkboxes if model fails to load
        removeBackgroundCheckbox.disabled = true;
        highlightSubjectTintCheckbox.disabled = true;
        outlineSubjectCheckbox.disabled = true;
        dimBackgroundCheckbox.disabled = true;
        blurBackgroundCheckbox.disabled = true;
        // Hide specific options related to MediaPipe if it fails
        document.getElementById('removeBackgroundOption').classList.add('hidden');
        document.getElementById('grayscaleModeOptions').classList.add('hidden');
        document.getElementById('dimBackgroundOption').classList.add('hidden');
        document.getElementById('blurBackgroundOption').classList.add('hidden');
        // Hide the loading indicator after showing the error
        setTimeout(() => loadingIndicator.classList.add('hidden'), 5000); // Hide after 5 seconds
    }
}

// Function to update the canvas based on current appState
function renderImage() {
    if (!appState.originalImage) {
        placeholderText.classList.remove('hidden');
        imageCanvas.style.display = 'none';
        return;
    }

    placeholderText.classList.add('hidden');
    imageCanvas.style.display = 'block';

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    // Apply transformations first
    const transformedImage = applyTransformations(appState.originalImage, appState.transform);
    
    // Set tempCanvas size to transformed image size
    tempCanvas.width = transformedImage.width;
    tempCanvas.height = transformedImage.height;
    tempCtx.drawImage(transformedImage, 0, 0);

    // Get ImageData from the transformed image for further processing
    let imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

    // Apply segmentation effects if enabled
    if (appState.segmentation.removeBackground || appState.segmentation.backgroundColorRemoval.enabled ||
        appState.segmentation.grayscaleMode !== 'none' ||
        appState.segmentation.highlightSubject.enabled ||
        appState.segmentation.outlineSubject.enabled ||
        appState.segmentation.dimBackground.enabled ||
        appState.segmentation.blurBackground.enabled
    ) {
        if (appState.segmentation.removeBackground && appState.segmentation.mask && mediaPipeReady) {
            // Apply MediaPipe segmentation mask
            imageData = applySegmentation(imageData, appState.segmentation);
        } else if (appState.segmentation.backgroundColorRemoval.enabled) {
            // Apply background removal by color
            imageData = applySegmentation(imageData, appState.segmentation);
        } else if (appState.segmentation.mask && mediaPipeReady) {
            // Apply other segmentation effects if MediaPipe mask exists
            imageData = applySegmentation(imageData, appState.segmentation);
        }
    }
    
    // Apply global adjustments and filters
    imageData = applyAdjustments(imageData, appState);
    imageData = applyFilters(imageData, appState);

    // Update currentImage with the processed ImageData
    appState.currentImage = imageData;

    // Finally, draw the processed image data to the visible canvas
    // Adjust canvas dimensions to match the processed image data dimensions
    imageCanvas.width = imageData.width;
    imageCanvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);

    // Center image on canvas
    const parent = imageCanvas.parentElement;
    if (parent) {
        const parentWidth = parent.clientWidth;
        const parentHeight = parent.clientHeight;

        // Calculate scaling factor to fit image within parent
        const scaleX = parentWidth / imageCanvas.width;
        const scaleY = parentHeight / imageCanvas.height;
        const scale = Math.min(scaleX, scaleY);

        imageCanvas.style.width = `${imageCanvas.width * scale}px`;
        imageCanvas.style.height = `${imageCanvas.height * scale}px`;
    }
}

// Event Listeners

// Image Upload
imageUpload.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) {
        const img = new Image();
        img.onload = () => {
            // Reset all effects when a new image is loaded
            resetState();
            appState.originalImage = img;
            // Set canvas size to image size
            imageCanvas.width = img.width;
            imageCanvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            appState.currentImage = ctx.getImageData(0, 0, imageCanvas.width, imageCanvas.height);
            renderImage();

            // If MediaPipe is not ready, try to segment the new image
            if (appState.segmentation.removeBackground && mediaPipeReady) {
                loadingIndicator.classList.remove('hidden');
                loadingMessage.textContent = 'Processing image for segmentation...';
                loadingDetail.textContent = 'This may take a moment depending on image size.';
                // Pass a temporary canvas or the original image directly for processing
                selfieSegmentation.send({ image: img });
            }
        };
        img.src = URL.createObjectURL(file);
    }
});

// Global Adjustments
brightnessSlider.addEventListener('input', () => {
    appState.brightness = parseInt(brightnessSlider.value);
    brightnessValueDisplay.textContent = `${appState.brightness}%`;
    renderImage();
});

contrastSlider.addEventListener('input', () => {
    appState.contrast = parseInt(contrastSlider.value);
    contrastValueDisplay.textContent = `${appState.contrast}%`;
    renderImage();
});

saturationSlider.addEventListener('input', () => {
    appState.saturation = parseInt(saturationSlider.value);
    saturationValueDisplay.textContent = `${appState.saturation}%`;
    renderImage();
});

hueSlider.addEventListener('input', () => {
    appState.hue = parseInt(hueSlider.value);
    hueValueDisplay.textContent = `${appState.hue}°`;
    renderImage();
});

globalBlurSlider.addEventListener('input', () => {
    appState.globalBlur = parseFloat(globalBlurSlider.value);
    globalBlurValueDisplay.textContent = `${appState.globalBlur}px`;
    renderImage();
});

// Global Filters
opacitySlider.addEventListener('input', () => {
    appState.opacity = parseInt(opacitySlider.value);
    opacityValueDisplay.textContent = `${appState.opacity}%`;
    renderImage();
});

// Filter buttons
grayscaleButton.addEventListener('click', () => {
    appState.filter = appState.filter === 'grayscale' ? 'none' : 'grayscale';
    renderImage();
});
invertButton.addEventListener('click', () => {
    appState.filter = appState.filter === 'invert' ? 'none' : 'invert';
    renderImage();
});
sepiaButton.addEventListener('click', () => {
    appState.filter = appState.filter === 'sepia' ? 'none' : 'sepia';
    renderImage();
});
glowButton.addEventListener('click', () => {
    appState.filter = appState.filter === 'glow' ? 'none' : 'glow';
    renderImage();
});

// Color Overlay Controls
enableColorOverlayCheckbox.addEventListener('change', () => {
    appState.colorOverlay.enabled = enableColorOverlayCheckbox.checked;
    colorOverlayControls.classList.toggle('hidden', !appState.colorOverlay.enabled);
    renderImage();
});

overlayColorInput.addEventListener('input', () => {
    appState.colorOverlay.color = overlayColorInput.value;
    if (appState.colorOverlay.enabled) renderImage();
});

overlayIntensitySlider.addEventListener('input', () => {
    appState.colorOverlay.intensity = parseFloat(overlayIntensitySlider.value);
    overlayIntensityValueDisplay.textContent = appState.colorOverlay.intensity.toFixed(2);
    if (appState.colorOverlay.enabled) renderImage();
});

// Segmentation Effects
removeBackgroundColorCheckbox.addEventListener('change', () => {
    appState.segmentation.backgroundColorRemoval.enabled = removeBackgroundColorCheckbox.checked;
    backgroundColorControls.classList.toggle('hidden', !appState.segmentation.backgroundColorRemoval.enabled);
    renderImage();
});

bgColorInput.addEventListener('input', () => {
    appState.segmentation.backgroundColorRemoval.color = bgColorInput.value;
    if (appState.segmentation.backgroundColorRemoval.enabled) renderImage();
});

colorToleranceSlider.addEventListener('input', () => {
    appState.segmentation.backgroundColorRemoval.tolerance = parseInt(colorToleranceSlider.value);
    colorToleranceValueDisplay.textContent = appState.segmentation.backgroundColorRemoval.tolerance;
    if (appState.segmentation.backgroundColorRemoval.enabled) renderImage();
});

removeBackgroundCheckbox.addEventListener('change', async () => {
    appState.segmentation.removeBackground = removeBackgroundCheckbox.checked;
    if (appState.originalImage && appState.segmentation.removeBackground) {
        loadingIndicator.classList.remove('hidden');
        loadingMessage.textContent = 'Processing image for segmentation...';
        loadingDetail.textContent = 'This may take a moment depending on image size.';
        await selfieSegmentation.send({ image: appState.originalImage });
    } else {
        appState.segmentation.mask = null; // Clear mask if checkbox is unchecked
        renderImage();
    }
});

grayscaleModeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
        appState.segmentation.grayscaleMode = radio.value;
        renderImage();
    });
});

highlightSubjectTintCheckbox.addEventListener('change', () => {
    appState.segmentation.highlightSubject.enabled = highlightSubjectTintCheckbox.checked;
    tintControls.classList.toggle('hidden', !appState.segmentation.highlightSubject.enabled);
    renderImage();
});

highlightIntensitySlider.addEventListener('input', () => {
    appState.segmentation.highlightSubject.intensity = parseFloat(highlightIntensitySlider.value);
    highlightValueDisplay.textContent = appState.segmentation.highlightSubject.intensity.toFixed(1);
    if (appState.segmentation.highlightSubject.enabled) renderImage();
});

highlightColorInput.addEventListener('input', () => {
    appState.segmentation.highlightSubject.color = highlightColorInput.value;
    if (appState.segmentation.highlightSubject.enabled) renderImage();
});

outlineSubjectCheckbox.addEventListener('change', () => {
    appState.segmentation.outlineSubject.enabled = outlineSubjectCheckbox.checked;
    outlineControls.classList.toggle('hidden', !appState.segmentation.outlineSubject.enabled);
    renderImage();
});

outlineThicknessSlider.addEventListener('input', () => {
    appState.segmentation.outlineSubject.thickness = parseInt(outlineThicknessSlider.value);
    outlineThicknessValueDisplay.textContent = `${appState.segmentation.outlineSubject.thickness}px`;
    if (appState.segmentation.outlineSubject.enabled) renderImage();
});

outlineColorInput.addEventListener('input', () => {
    appState.segmentation.outlineSubject.color = outlineColorInput.value;
    if (appState.segmentation.outlineSubject.enabled) renderImage();
});

dimBackgroundCheckbox.addEventListener('change', () => {
    appState.segmentation.dimBackground.enabled = dimBackgroundCheckbox.checked;
    dimIntensityControl.classList.toggle('hidden', !appState.segmentation.dimBackground.enabled);
    renderImage();
});

dimIntensitySlider.addEventListener('input', () => {
    appState.segmentation.dimBackground.intensity = parseFloat(dimIntensitySlider.value);
    dimValueDisplay.textContent = appState.segmentation.dimBackground.intensity.toFixed(1);
    if (appState.segmentation.dimBackground.enabled) renderImage();
});

blurBackgroundCheckbox.addEventListener('change', () => {
    appState.segmentation.blurBackground.enabled = blurBackgroundCheckbox.checked;
    blurBackgroundIntensityControl.classList.toggle('hidden', !appState.segmentation.blurBackground.enabled);
    renderImage();
});

blurBackgroundIntensitySlider.addEventListener('input', () => {
    appState.segmentation.blurBackground.intensity = parseInt(blurBackgroundIntensitySlider.value);
    blurBackgroundValueDisplay.textContent = `${appState.segmentation.blurBackground.intensity}px`;
    if (appState.segmentation.blurBackground.enabled) renderImage();
});

// Transformations
flipHorizontalButton.addEventListener('click', () => {
    appState.transform.flipH = !appState.transform.flipH;
    renderImage();
});

flipVerticalButton.addEventListener('click', () => {
    appState.transform.flipV = !appState.transform.flipV;
    renderImage();
});

rotate90Button.addEventListener('click', () => {
    appState.transform.rotate = (appState.transform.rotate + 90) % 360;
    renderImage();
});

cropSquareButton.addEventListener('click', () => {
    if (!appState.originalImage) return;

    const img = appState.originalImage;
    const size = Math.min(img.width, img.height);
    const x = (img.width - size) / 2;
    const y = (img.height - size) / 2;

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = size;
    tempCanvas.height = size;

    tempCtx.drawImage(img, x, y, size, size, 0, 0, size, size);

    // Update originalImage to the cropped version
    const newImg = new Image();
    newImg.onload = () => {
        appState.originalImage = newImg;
        renderImage(); // Re-render with the new cropped image
    };
    newImg.src = tempCanvas.toDataURL();
});

// Resize
applyResizeButton.addEventListener('click', () => {
    if (!appState.originalImage) return;

    let newWidth = parseInt(resizeWidthInput.value);
    let newHeight = parseInt(resizeHeightInput.value);

    // If both are empty or invalid, do nothing
    if ((isNaN(newWidth) || newWidth <= 0) && (isNaN(newHeight) || newHeight <= 0)) {
        console.warn("Invalid resize dimensions.");
        return;
    }

    // Calculate aspect ratio
    const aspectRatio = appState.originalImage.width / appState.originalImage.height;

    if (isNaN(newWidth) || newWidth <= 0) {
        newWidth = Math.round(newHeight * aspectRatio);
    } else if (isNaN(newHeight) || newHeight <= 0) {
        newHeight = Math.round(newWidth / aspectRatio);
    }

    // Create a temporary canvas for resizing the original image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = newWidth;
    tempCanvas.height = newHeight;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(appState.originalImage, 0, 0, newWidth, newHeight);

    // Update the originalImage with the resized version
    const resizedImg = new Image();
    resizedImg.onload = () => {
        appState.originalImage = resizedImg;
        renderImage(); // Re-render the canvas with the newly resized original image
    };
    resizedImg.src = tempCanvas.toDataURL();
});


// Reset Button
resetButton.addEventListener('click', () => {
    resetState();
    renderImage();
});

function resetState() {
    // Reset all state properties to their initial values
    appState.originalImage = null;
    appState.currentImage = null;
    appState.brightness = 100;
    appState.contrast = 100;
    appState.saturation = 100;
    appState.hue = 0;
    appState.globalBlur = 0;
    appState.opacity = 100;
    appState.filter = 'none';
    appState.colorOverlay = { enabled: false, color: '#000000', intensity: 0 };
    appState.segmentation = {
        removeBackground: false,
        backgroundColorRemoval: { enabled: false, color: '#FFFFFF', tolerance: 50 },
        mask: null,
        grayscaleMode: 'none',
        highlightSubject: { enabled: false, intensity: 0.5, color: '#4F46E5' },
        outlineSubject: { enabled: false, thickness: 3, color: '#FFFFFF' },
        dimBackground: { enabled: false, intensity: 0.5 },
        blurBackground: { enabled: false, intensity: 5 }
    };
    appState.transform = {
        flipH: false,
        flipV: false,
        rotate: 0,
    };

    // Reset UI elements to their default values
    imageUpload.value = '';
    brightnessSlider.value = 100;
    brightnessValueDisplay.textContent = '100%';
    contrastSlider.value = 100;
    contrastValueDisplay.textContent = '100%';
    saturationSlider.value = 100;
    saturationValueDisplay.textContent = '100%';
    hueSlider.value = 0;
    hueValueDisplay.textContent = '0°';
    globalBlurSlider.value = 0;
    globalBlurValueDisplay.textContent = '0px';
    opacitySlider.value = 100;
    opacityValueDisplay.textContent = '100%';

    // Reset filter buttons visual state (if they have active states)
    // For simplicity, we'll assume they just toggle the appState.filter
    // and rely on renderImage to apply. If you have active CSS classes, manage them here.

    enableColorOverlayCheckbox.checked = false;
    colorOverlayControls.classList.add('hidden');
    overlayColorInput.value = '#000000';
    overlayIntensitySlider.value = 0;
    overlayIntensityValueDisplay.textContent = '0.00';

    removeBackgroundColorCheckbox.checked = false;
    backgroundColorControls.classList.add('hidden');
    bgColorInput.value = '#FFFFFF';
    colorToleranceSlider.value = 50;
    colorToleranceValueDisplay.textContent = '50';

    removeBackgroundCheckbox.checked = false;
    document.querySelector('input[name="grayscaleMode"][value="none"]').checked = true;
    highlightSubjectTintCheckbox.checked = false;
    tintControls.classList.add('hidden');
    highlightIntensitySlider.value = 0.5;
    highlightValueDisplay.textContent = '0.5';
    highlightColorInput.value = '#4F46E5';
    outlineSubjectCheckbox.checked = false;
    outlineControls.classList.add('hidden');
    outlineThicknessSlider.value = 3;
    outlineThicknessValueDisplay.textContent = '3px';
    outlineColorInput.value = '#FFFFFF';
    dimBackgroundCheckbox.checked = false;
    dimIntensityControl.classList.add('hidden');
    dimIntensitySlider.value = 0.5;
    dimValueDisplay.textContent = '0.5';
    blurBackgroundCheckbox.checked = false;
    blurBackgroundIntensityControl.classList.add('hidden');
    blurBackgroundIntensitySlider.value = 5;
    blurBackgroundValueDisplay.textContent = '5px';

    resizeWidthInput.value = '';
    resizeHeightInput.value = '';

    // Hide control sections
    toggleGlobalAdjustments.checked = false;
    globalAdjustmentsControls.classList.add('hidden');
    toggleGlobalFilters.checked = false;
    globalFiltersControls.classList.add('hidden');
    toggleSegmentationEffects.checked = false;
    segmentationEffectsControls.classList.add('hidden');
    toggleTransformations.checked = false;
    transformationsControls.classList.add('hidden');
    toggleResize.checked = false;
    resizeControls.classList.add('hidden');
}


// Download Button
downloadButton.addEventListener('click', () => {
    if (appState.currentImage) {
        const format = downloadFormatSelect.value;
        downloadImage(imageCanvas, format);
    }
});


// Dark Mode Toggle
darkModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    // Toggle icon visibility
    sunIcon.classList.toggle('hidden');
    moonIcon.classList.toggle('hidden');

    // Persist preference (optional)
    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
    } else {
        localStorage.setItem('theme', 'light');
    }
});

// Apply saved theme preference on load
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
    }
});


// Info Modal Functionality
infoButton.addEventListener('click', () => {
    modalBackdrop.classList.remove('hidden');
    modalBackdrop.classList.add('flex'); // Ensure flex to center content
    infoModal.classList.remove('hidden');
});

closeInfoModalButton.addEventListener('click', () => {
    modalBackdrop.classList.add('hidden');
    modalBackdrop.classList.remove('flex');
    infoModal.classList.add('hidden');
});

modalBackdrop.addEventListener('click', (event) => {
    if (event.target === modalBackdrop) {
        modalBackdrop.classList.add('hidden');
        modalBackdrop.classList.remove('flex');
        infoModal.classList.add('hidden');
    }
});


// Toggle control sections visibility
toggleGlobalAdjustments.addEventListener('change', () => {
    globalAdjustmentsControls.classList.toggle('hidden', !toggleGlobalAdjustments.checked);
});

toggleGlobalFilters.addEventListener('change', () => {
    globalFiltersControls.classList.toggle('hidden', !toggleGlobalFilters.checked);
});

toggleSegmentationEffects.addEventListener('change', () => {
    segmentationEffectsControls.classList.toggle('hidden', !toggleSegmentationEffects.checked);
});

toggleTransformations.addEventListener('change', () => {
    transformationsControls.classList.toggle('hidden', !toggleTransformations.checked);
});

toggleResize.addEventListener('change', () => {
    resizeControls.classList.toggle('hidden', !toggleResize.checked);
});


// Initialize MediaPipe when the page loads
window.onload = initializeMediaPipe;

// Initial render to show placeholder text
renderImage();
