// js/utils.js

/**
 * Loads an image onto the canvas.
 * @param {HTMLCanvasElement} canvas - The canvas element.
 * @param {CanvasRenderingContext2D} ctx - The 2D rendering context of the canvas.
 * @param {HTMLImageElement} image - The image to load.
 */
export function loadImageToCanvas(canvas, ctx, image) {
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear previous content
    ctx.drawImage(image, 0, 0);
    // Return ImageData object for further manipulation
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Applies brightness, contrast, saturation, hue, and global blur adjustments to ImageData.
 * @param {ImageData} imageData - The ImageData object to manipulate.
 * @param {object} appState - The global application state containing adjustment values.
 * @returns {ImageData} - The new ImageData object with adjustments applied.
 */
export function applyAdjustments(imageData, appState) {
    const data = imageData.data;
    const { brightness, contrast, saturation, hue, globalBlur } = appState;

    // Apply global blur using a temporary canvas for better quality
    if (globalBlur > 0) {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = imageData.width;
        tempCanvas.height = imageData.height;
        tempCtx.putImageData(imageData, 0, 0);
        tempCtx.filter = `blur(${globalBlur}px)`;
        tempCtx.drawImage(tempCanvas, 0, 0); // Re-draw to apply filter
        imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    }

    // Apply color adjustments pixel by pixel
    const b = brightness / 100;
    const c = contrast / 100;
    const s = saturation / 100;
    const h = (hue * Math.PI) / 180; // Convert hue to radians

    // Pre-calculate luminance factors for saturation
    const R_L = 0.2126;
    const G_L = 0.7152;
    const B_L = 0.0722;

    for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b_val = data[i + 2];

        // Brightness
        r *= b;
        g *= b;
        b_val *= b;

        // Contrast
        r = (r - 128) * c + 128;
        g = (g - 128) * c + 128;
        b_val = (b_val - 128) * c + 128;

        // Saturation
        const gray = R_L * r + G_L * g + B_L * b_val;
        r = gray + (r - gray) * s;
        g = gray + (g - gray) * s;
        b_val = gray + (b_val - gray) * s;

        // Hue Rotation (simplified, accurate hue is complex)
        // This is a basic rotation in RGB space around the grayscale axis
        // For accurate hue, converting to HSL/HSV is needed.
        // This approximation will shift colors.
        const cosH = Math.cos(h);
        const sinH = Math.sin(h);
        
        const M = [
            [R_L + cosH * (1 - R_L) + sinH * (-R_L), G_L + cosH * (-G_L) + sinH * (-G_L), B_L + cosH * (-B_L) + sinH * (1 - B_L)],
            [R_L + cosH * (-R_L) + sinH * (0.143), G_L + cosH * (1 - G_L) + sinH * (0.14), B_L + cosH * (-B_L) + sinH * (-0.283)],
            [R_L + cosH * (-R_L) + sinH * (-(1 - R_L)), G_L + cosH * (-G_L) + sinH * (G_L), B_L + cosH * (1 - B_L) + sinH * (B_L)]
        ];
        
        const newR = r * M[0][0] + g * M[0][1] + b_val * M[0][2];
        const newG = r * M[1][0] + g * M[1][1] + b_val * M[1][2];
        const newB = r * M[2][0] + g * M[2][1] + b_val * M[2][2];

        data[i] = Math.min(255, Math.max(0, newR));
        data[i + 1] = Math.min(255, Math.max(0, newG));
        data[i + 2] = Math.min(255, Math.max(0, newB));
    }

    return imageData;
}


/**
 * Applies global filters (grayscale, invert, sepia, glow, opacity, color overlay) to ImageData.
 * @param {ImageData} imageData - The ImageData object to manipulate.
 * @param {object} appState - The global application state containing filter values.
 * @returns {ImageData} - The new ImageData object with filters applied.
 */
export function applyFilters(imageData, appState) {
    const data = imageData.data;
    const { filter, opacity, colorOverlay } = appState;

    // Create a temporary canvas to apply CSS filters
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    tempCtx.putImageData(imageData, 0, 0); // Put current image data onto temp canvas

    let cssFilters = '';
    if (filter === 'grayscale') cssFilters += 'grayscale(100%) ';
    if (filter === 'invert') cssFilters += 'invert(100%) ';
    if (filter === 'sepia') cssFilters += 'sepia(100%) ';
    // Glow effect can be simulated with blur and brightness/contrast if not a direct CSS filter
    // For simplicity, a basic blur might be used here or a more complex canvas operation
    if (filter === 'glow') {
        cssFilters += 'brightness(150%) contrast(120%) drop-shadow(0 0 8px rgba(255,255,255,0.7)) ';
    }
    
    // Apply opacity globally
    cssFilters += `opacity(${opacity / 100}) `;

    tempCtx.filter = cssFilters.trim();
    tempCtx.drawImage(tempCanvas, 0, 0); // Re-draw to apply CSS filters

    // Get the filtered image data back
    let filteredImageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const filteredData = filteredImageData.data;

    // Apply color overlay if enabled
    if (colorOverlay.enabled && colorOverlay.intensity > 0) {
        const overlayColor = hexToRgb(colorOverlay.color);
        const intensity = colorOverlay.intensity;

        for (let i = 0; i < filteredData.length; i += 4) {
            const r = filteredData[i];
            const g = filteredData[i + 1];
            const b = filteredData[i + 2];

            filteredData[i] = r * (1 - intensity) + overlayColor.r * intensity;
            filteredData[i + 1] = g * (1 - intensity) + overlayColor.g * intensity;
            filteredData[i + 2] = b * (1 - intensity) + overlayColor.b * intensity;
        }
    }

    return filteredImageData;
}


/**
 * Helper function to convert hex color to RGB.
 * @param {string} hex - Hex color string (e.g., "#RRGGBB").
 * @returns {object} - Object with r, g, b properties.
 */
function hexToRgb(hex) {
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);
    return { r, g, b };
}

/**
 * Applies segmentation effects to ImageData based on appState.
 * This function handles both MediaPipe masks and background removal by color.
 * @param {ImageData} imageData - The ImageData object to manipulate.
 * @param {object} segmentationState - The segmentation state from appState.
 * @returns {ImageData} - The new ImageData object with segmentation effects applied.
 */
export function applySegmentation(imageData, segmentationState) {
    const data = imageData.data;
    const { 
        removeBackground, 
        backgroundColorRemoval,
        mask, 
        grayscaleMode, 
        highlightSubject, 
        outlineSubject,
        dimBackground,
        blurBackground 
    } = segmentationState;

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    tempCtx.putImageData(imageData, 0, 0); // Draw original image to temp canvas

    // If blurBackground is enabled, apply blur to the *entire* image on a separate canvas first
    let blurredImageData = null;
    if (blurBackground.enabled && blurBackground.intensity > 0) {
        const blurCanvas = document.createElement('canvas');
        const blurCtx = blurCanvas.getContext('2d');
        blurCanvas.width = imageData.width;
        blurCanvas.height = imageData.height;
        blurCtx.filter = `blur(${blurBackground.intensity}px)`;
        blurCtx.drawImage(tempCanvas, 0, 0); // Draw the original content from tempCanvas
        blurredImageData = blurCtx.getImageData(0, 0, blurCanvas.width, blurCanvas.height);
    }

    // Create a new ImageData to store the result
    const newImageData = new ImageData(imageData.width, imageData.height);
    const newData = newImageData.data;

    // Get outline properties
    const outlineThickness = outlineSubject.enabled ? outlineSubject.thickness : 0;
    const outlineColor = outlineSubject.enabled ? hexToRgb(outlineSubject.color) : null;

    // Define subject pixels based on mask or color removal
    let subjectPixels = new Set(); // Stores indices of pixels identified as subject
    let isSubjectFunc = (r, g, b, a, index) => true; // Default: all pixels are subject

    if (removeBackground && mask) {
        // MediaPipe segmentation mask
        isSubjectFunc = (r, g, b, a, index) => mask.data[index / 4] === 1;
    } else if (backgroundColorRemoval.enabled) {
        // Background removal by color
        const targetColor = hexToRgb(backgroundColorRemoval.color);
        const tolerance = backgroundColorRemoval.tolerance;
        isSubjectFunc = (r, g, b, a, index) => {
            const diffR = Math.abs(r - targetColor.r);
            const diffG = Math.abs(g - targetColor.g);
            const diffB = Math.abs(b - targetColor.b);
            const dist = Math.sqrt(diffR * diffR + diffG * diffG + diffB * diffB);
            return dist > tolerance; // Pixels far from target color are subject
        };
    }

    // Populate subjectPixels set and apply effects
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        const pixelIndex = i / 4;

        let isSubject = isSubjectFunc(r, g, b, a, i);

        // Store subject pixels for outline calculation later
        if (isSubject) {
            subjectPixels.add(pixelIndex);
        }

        // Apply effects based on whether it's subject or background
        if (isSubject) {
            // Subject pixel
            if (grayscaleMode === 'subject_grayscale') {
                const avg = (r + g + b) / 3;
                newData[i] = avg;
                newData[i + 1] = avg;
                newData[i + 2] = avg;
            } else {
                newData[i] = r;
                newData[i + 1] = g;
                newData[i + 2] = b;
            }
            newData[i + 3] = a; // Keep original alpha for subject

            // Apply subject tint
            if (highlightSubject.enabled && highlightSubject.intensity > 0) {
                const tintColor = hexToRgb(highlightSubject.color);
                const intensity = highlightSubject.intensity;
                newData[i] = newData[i] * (1 - intensity) + tintColor.r * intensity;
                newData[i + 1] = newData[i + 1] * (1 - intensity) + tintColor.g * intensity;
                newData[i + 2] = newData[i + 2] * (1 - intensity) + tintColor.b * intensity;
            }

        } else {
            // Background pixel
            if (removeBackground || backgroundColorRemoval.enabled) {
                // If background removal is active, make background transparent
                newData[i + 3] = 0; // Alpha = 0 for transparent
            } else if (grayscaleMode === 'bg_grayscale') {
                const avg = (r + g + b) / 3;
                newData[i] = avg;
                newData[i + 1] = avg;
                newData[i + 2] = avg;
                newData[i + 3] = a; // Keep original alpha for grayscale background
            } else if (dimBackground.enabled && dimBackground.intensity > 0) {
                // Dim background
                const dimFactor = 1 - dimBackground.intensity;
                newData[i] = r * dimFactor;
                newData[i + 1] = g * dimFactor;
                newData[i + 2] = b * dimFactor;
                newData[i + 3] = a; // Keep original alpha for dimming
            } else if (blurBackground.enabled && blurredImageData) {
                // Apply blurred background
                const blurredData = blurredImageData.data;
                newData[i] = blurredData[i];
                newData[i + 1] = blurredData[i + 1];
                newData[i + 2] = blurredData[i + 2];
                newData[i + 3] = blurredData[i + 3];
            } else {
                // Default: keep original background colors if no specific effect
                newData[i] = r;
                newData[i + 1] = g;
                newData[i + 2] = b;
                newData[i + 3] = a;
            }
        }
    }

    // Apply outline if enabled and there are subject pixels
    if (outlineSubject.enabled && outlineThickness > 0 && subjectPixels.size > 0) {
        const width = imageData.width;
        const height = imageData.height;

        const isPixelSubject = (x, y) => {
            if (x < 0 || x >= width || y < 0 || y >= height) return false;
            return subjectPixels.has(y * width + x);
        };

        const outlineIndices = new Set();
        for (const pixelIndex of subjectPixels) {
            const x = pixelIndex % width;
            const y = Math.floor(pixelIndex / width);

            // Check neighbors for non-subject pixels
            let isBorder = false;
            for (let dy = -outlineThickness; dy <= outlineThickness; dy++) {
                for (let dx = -outlineThickness; dx <= outlineThickness; dx++) {
                    if (dx === 0 && dy === 0) continue; // Skip self
                    if (!isPixelSubject(x + dx, y + dy)) {
                        isBorder = true;
                        break;
                    }
                }
                if (isBorder) break;
            }

            if (isBorder) {
                outlineIndices.add(pixelIndex);
            }
        }

        // Draw outline pixels
        for (const pixelIndex of outlineIndices) {
            const i = pixelIndex * 4;
            newData[i] = outlineColor.r;
            newData[i + 1] = outlineColor.g;
            newData[i + 2] = outlineColor.b;
            newData[i + 3] = 255; // Fully opaque
        }
    }

    return newImageData;
}


/**
 * Applies transformations (flip horizontal, flip vertical, rotate) to an Image object.
 * Returns a new Image object with transformations applied.
 * @param {HTMLImageElement} originalImage - The original image element.
 * @param {object} transformState - The transform state from appState.
 * @returns {HTMLCanvasElement} - A canvas containing the transformed image.
 */
export function applyTransformations(originalImage, transformState) {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    let { flipH, flipV, rotate } = transformState;

    let width = originalImage.width;
    let height = originalImage.height;

    // Adjust canvas dimensions for rotation
    if (rotate === 90 || rotate === 270) {
        tempCanvas.width = height;
        tempCanvas.height = width;
    } else {
        tempCanvas.width = width;
        tempCanvas.height = height;
    }

    // Set origin to center for rotation and scaling
    tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);

    // Apply rotation
    tempCtx.rotate(rotate * Math.PI / 180);

    // Apply flipping (after rotation, so it flips along the rotated axes)
    const scaleX = flipH ? -1 : 1;
    const scaleY = flipV ? -1 : 1;
    tempCtx.scale(scaleX, scaleY);

    // Draw the image, accounting for the translation and rotation/scaling
    // Drawing at -width/2, -height/2 positions it correctly relative to the new origin
    tempCtx.drawImage(originalImage, -width / 2, -height / 2, width, height);

    // Reset transformations for subsequent draws (important if this context is reused)
    tempCtx.setTransform(1, 0, 0, 1, 0, 0);

    return tempCanvas; // Return the canvas with the transformed image
}


/**
 * Resizes the canvas and the image drawn on it.
 * @param {HTMLCanvasElement} canvas - The canvas element.
 * @param {CanvasRenderingContext2D} ctx - The 2D rendering context of the canvas.
 * @param {HTMLImageElement} originalImage - The original image element.
 * @param {number} newWidth - The new width for the canvas.
 * @param {number} newHeight - The new height for the canvas.
 * @returns {ImageData} - The new ImageData object after resizing.
 */
export function resizeCanvasAndImage(canvas, ctx, originalImage, newWidth, newHeight) {
    // Create a temporary canvas for resizing the image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = newWidth;
    tempCanvas.height = newHeight;
    const tempCtx = tempCanvas.getContext('2d');

    // Draw the original image onto the temporary canvas with new dimensions
    tempCtx.drawImage(originalImage, 0, 0, newWidth, newHeight);

    // Update the main canvas dimensions
    canvas.width = newWidth;
    canvas.height = newHeight;

    // Draw the resized image from the temporary canvas to the main canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear main canvas
    ctx.drawImage(tempCanvas, 0, 0);

    return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Downloads the content of the canvas as an image.
 * @param {HTMLCanvasElement} canvas - The canvas element to download.
 * @param {string} format - The desired image format (e.g., 'image/png', 'image/jpeg').
 */
export function downloadImage(canvas, format) {
    const dataURL = canvas.toDataURL(format);
    const link = document.createElement('a');
    link.download = `nebula_edited_image.${format.split('/')[1]}`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Resets the canvas and the image back to its original state.
 * @param {HTMLCanvasElement} canvas - The canvas element.
 * @param {CanvasRenderingContext2D} ctx - The 2D rendering context of the canvas.
 * @param {HTMLImageElement} originalImage - The original image element.
 */
export function resetImage(canvas, ctx, originalImage) {
    if (originalImage) {
        canvas.width = originalImage.width;
        canvas.height = originalImage.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(originalImage, 0, 0);
    } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = 0;
        canvas.height = 0;
    }
}
