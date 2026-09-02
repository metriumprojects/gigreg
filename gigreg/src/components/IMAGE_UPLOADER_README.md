# ImageUploader Component - Documentation

## Overview
The `ImageUploader` is a reusable React component that provides a complete image management solution with the following features:
- 📤 Drag-and-drop image upload
- 🎨 Image cropping with real-time preview
- 🔄 Reorder images via drag-and-drop
- 🔍 Zoom and rotation controls
- ✂️ Crop multiple images with different dimensions
- 📱 Fully responsive design

## Installation

The component requires `react-easy-crop` library:

```bash
npm install react-easy-crop
```

## Usage

### Basic Setup

```jsx
import ImageUploader from "@/components/ImageUploader";

const MyComponent = () => {
  const [images, setImages] = useState([]);

  return (
    <ImageUploader
      images={images}
      onImagesChange={setImages}
      maxImages={10}
      minImages={2}
      disabled={false}
      label="Upload Images (min 2, max 10)"
    />
  );
};
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `images` | Array | `[]` | Array of image objects currently uploaded |
| `onImagesChange` | Function | **Required** | Callback function when images are added, removed, or reordered |
| `maxImages` | Number | `10` | Maximum number of images allowed |
| `minImages` | Number | `2` | Minimum number of images required |
| `disabled` | Boolean | `false` | Disable image uploads when true |
| `showLabel` | Boolean | `true` | Show/hide the upload label |
| `label` | String | "Upload Images" | Custom label text for upload button |

## Image Object Format

Each image object in the `images` array has the following structure:

```javascript
{
  file: File | Blob,           // The actual file/blob
  preview: string,              // Data URL for preview display
  isCropped: boolean,           // Whether the image was cropped (optional)
  isExisting: boolean           // Whether it's an existing image (optional)
}
```

## Features in Detail

### 1. Image Upload
- Click the upload button to select images
- Select multiple images at once
- Images are added to the preview grid
- File input is automatically reset after selection

### 2. Image Cropping
When you upload an image, a crop modal appears with:
- **Live Preview**: See the crop area in real-time
- **Zoom Control**: 
  - Use slider or +/- buttons
  - Range: 1x to 3x zoom
- **Rotation Control**: 
  - Rotate images up to 360°
  - Fine-tune rotation with slider or degree input
- **Grid Display**: Visual grid overlay for alignment
- **Action Buttons**: Confirm Crop or Cancel

### 3. Drag and Drop Reordering
- Drag any image thumbnail to reorder
- Visual feedback shows:
  - Blue border on hover
  - 50% opacity and scale down while dragging
  - DRAG indicator appears on hover
- Order is preserved when submitted

### 4. Image Deletion
- Hover over any image to reveal the delete button (✕)
- Click to remove the image
- Memory is cleaned up automatically

### 5. Visual Indicators
- **Image Counter**: Shows current/max images
- **Minimum Images Alert**: Shows when below minimum
- **Cropped Badge**: Green badge shows which images were cropped
- **Drag Indicator**: "DRAG" text appears on hover

## Implementation Examples

### CreateLesson Component
```jsx
<ImageUploader
  images={images}
  onImagesChange={setImages}
  maxImages={10}
  minImages={2}
  disabled={loading}
  label="Upload Images (min 2, max 10)"
/>
```

### UpdateLesson Component
For updating lessons with mixed existing and new images:

```jsx
<ImageUploader
  images={[
    ...existingImages.map((img) => ({
      ...img,
      preview: img.url || img.preview,
      isExisting: true,
    })),
    ...newImages,
  ]}
  onImagesChange={(updatedImages) => {
    const newExisting = updatedImages.filter((img) => img.isExisting);
    const newNew = updatedImages.filter((img) => !img.isExisting);
    setExistingImages(newExisting.map((img) => {
      const { isExisting, ...rest } = img;
      return rest;
    }));
    setNewImages(newNew);
  }}
  maxImages={10}
  minImages={2}
  disabled={loading}
  label="Upload or Update Images"
/>
```

### Profile Update Component (Future)
```jsx
<ImageUploader
  images={profileImages}
  onImagesChange={setProfileImages}
  maxImages={5}
  minImages={1}
  disabled={loading}
  label="Upload Profile Picture"
/>
```

## Handling Cropped Images in Form Submission

When images are cropped, they become Blob objects. Handle them properly when submitting:

```javascript
images.forEach((imgObj) => {
  if (imgObj.file instanceof Blob) {
    // It's a cropped image - create a File from Blob
    const file = new File([imgObj.file], `image_${Date.now()}.jpg`, {
      type: "image/jpeg",
    });
    formData.append("images", file);
  } else {
    // It's the original uploaded file
    formData.append("images", imgObj.file);
  }
});
```

## Keyboard Shortcuts (Crop Modal)

- **Escape**: Close crop modal (equivalent to Cancel button)
- **Slider**: Adjust zoom and rotation with keyboard

## Styling Customization

The component uses Tailwind CSS classes. To customize:

1. **Colors**: Modify border and button colors in className attributes
2. **Sizes**: Adjust w-24 h-24 dimensions for preview size
3. **Spacing**: Modify gap and padding values
4. **Fonts**: Update text-sm, text-xs sizes and font-medium weights

## Performance Considerations

- Uses React.memo for the ImageUploader internally
- Automatically revokes object URLs to prevent memory leaks
- Efficient drag-and-drop with minimal re-renders
- Canvas-based cropping for smooth performance

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari 14+, Chrome Mobile)

## Common Issues and Solutions

### Issue: Cropped images don't upload
**Solution**: Check that cropped images are converted to File objects before sending to server (see "Handling Cropped Images" section)

### Issue: Memory leak warning
**Solution**: Ensure components using ImageUploader properly clean up by calling the URL revokeObjectURL when removing images (handled automatically by component)

### Issue: Images don't reorder
**Solution**: Make sure `onImagesChange` is properly updating the parent state with the new image order

### Issue: Crop modal not appearing
**Solution**: 
- Check that react-easy-crop is installed
- Verify no CSS z-index conflicts with fixed positioning
- Check browser console for errors

## File Size Recommendations

- **Recommended**: Images under 5MB for smooth cropping
- **Maximum**: 10MB (browser dependent)
- **Format**: JPEG, PNG, WebP (all supported)

## Future Enhancement Ideas

- Add image filters (brightness, contrast, saturation)
- Implement batch cropping
- Add image compression before upload
- Support for drag-and-drop from desktop
- Image metadata display (dimensions, file size)
- Undo/Redo functionality for crop operations

## License

Part of the Courses-Website project

## Support

For issues or questions, please refer to the main project documentation.
