import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { X, ChevronLeft, RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import { FaPaperclip } from "react-icons/fa";
import { motion } from "framer-motion";
import { GrUpload } from "react-icons/gr";

const ImageUploader = ({
  images,
  onImagesChange,
  maxImages = 10,
  minImages = 2,
  disabled = false,
  showLabel = true,
  label = "Upload Images",
}) => {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [cropImage, setCropImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const fileInputRef = React.useRef(null);

  // Create preview URL
  const createPreviewUrl = (file) => {
    if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
      return URL.createObjectURL(file);
    }
    return "";
  };

  // Revoke preview URL
  const revokePreviewUrl = (url) => {
    if (
      url &&
      url.startsWith("blob:") &&
      typeof URL !== "undefined" &&
      typeof URL.revokeObjectURL === "function"
    ) {
      URL.revokeObjectURL(url);
    }
  };

  // Handle image upload
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > maxImages) {
      alert(`You can upload a maximum of ${maxImages} images.`);
      return;
    }

    const imagesToAdd = [];

    files.forEach((file) => {
      const preview = createPreviewUrl(file);
      // Add all images directly without cropping
      imagesToAdd.push({
        file,
        preview,
        isCropped: false,
        tempId: Date.now() + Math.random(),
      });
    });

    // Add all images
    if (imagesToAdd.length > 0) {
      onImagesChange([...images, ...imagesToAdd]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle crop complete
  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Create cropped image
  const getCroppedImg = async () => {
    if (!cropImage || !croppedAreaPixels) return null;

    const canvas = document.createElement("canvas");
    const image = new Image();
    image.src = cropImage.preview;

    return new Promise((resolve) => {
      image.onload = () => {
        const ctx = canvas.getContext("2d");

        // Set canvas size to cropped area
        canvas.width = croppedAreaPixels.width;
        canvas.height = croppedAreaPixels.height;

        // Draw rotated and cropped image
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);

        ctx.drawImage(
          image,
          croppedAreaPixels.x,
          croppedAreaPixels.y,
          croppedAreaPixels.width,
          croppedAreaPixels.height,
          0,
          0,
          croppedAreaPixels.width,
          croppedAreaPixels.height
        );

        ctx.restore();

        canvas.toBlob((blob) => {
          resolve({
            file: blob,
            preview: canvas.toDataURL(),
            isCropped: true,
          });
        }, "image/jpeg");
      };
    });
  };

  // Confirm crop
  const handleConfirmCrop = async () => {
    const croppedImg = await getCroppedImg();
    if (croppedImg) {
      const newImage = {
        file: croppedImg.file,
        preview: croppedImg.preview,
        isCropped: true,
        tempId: cropImage.tempId,
      };

      revokePreviewUrl(cropImage.preview);
      
      // If editing an existing image, replace it
      if (cropImage.indexToUpdate !== undefined) {
        const updatedImages = [...images];
        updatedImages[cropImage.indexToUpdate] = newImage;
        onImagesChange(updatedImages);
      } else {
        // If adding a new image, append it
        onImagesChange([...images, newImage]);
      }
      
      setCropImage(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
    }
  };

  // Cancel crop
  const handleCancelCrop = () => {
    if (cropImage?.preview) {
      revokePreviewUrl(cropImage.preview);
    }
    setCropImage(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  };

  // Remove image
  const removeImage = (index) => {
    const imageToRemove = images[index];
    if (imageToRemove?.preview) {
      revokePreviewUrl(imageToRemove.preview);
    }
    onImagesChange(images.filter((_, i) => i !== index));
  };

  // Drag handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    if (draggedIndex !== null && draggedIndex !== index) {
      const newImages = [...images];
      const [draggedItem] = newImages.splice(draggedIndex, 1);
      newImages.splice(index, 0, draggedItem);
      setDraggedIndex(index);
      onImagesChange(newImages);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Show crop modal
  if (cropImage) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
            <h3 className="text-lg font-semibold">
              {cropImage?.indexToUpdate === 0 ? "Edit Cover Image" : "Crop Image"}
            </h3>
            <div
              onClick={handleCancelCrop}
              className="text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
            >
              <X size={24} />
            </div>
          </div>

          {/* Crop Area */}
          <div className="flex-1 flex flex-col">
            <div className="relative flex-1 min-h-[300px] bg-gray-900">
              <Cropper
                image={cropImage.preview}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                showGrid={true}
              />
            </div>

            {/* Controls */}
            <div className="p-4 border-t space-y-4">
              {/* Zoom Control */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Zoom</label>
                <div className="flex items-center gap-3">
                  <div
                    onClick={() => setZoom(Math.max(1, zoom - 0.1))}
                    className="p-2 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                  >
                    <ZoomOut size={20} />
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.1"
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="flex-1 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                  />
                  <div
                    onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                    className="p-2 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                  >
                    <ZoomIn size={20} />
                  </div>
                </div>
              </div>

              {/* Rotation Control */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Rotation</label>
                <div className="flex items-center gap-3">
                  <div
                    onClick={() => setRotation((rotation - 90) % 360)}
                    className="p-2 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                  >
                    <RotateCw size={20} />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="1"
                    value={rotation}
                    onChange={(e) => setRotation(Number(e.target.value))}
                    className="flex-1 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-sm text-gray-600 w-12">{rotation}°</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 p-4 border-t bg-gray-50">
              <div
                onClick={handleCancelCrop}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer text-center"
              >
                Cancel
              </div>
              <div
                onClick={handleConfirmCrop}
                className="flex-1 px-4 py-2 bg-black text-white rounded-md font-medium hover:bg-black/90 transition-colors cursor-pointer text-center"
              >
                Confirm Crop
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // Main upload view
  return (
    <div className="space-y-4">
      <div className=" flex items-center justify-center">
      <label className="flex items-center gap-2 rounded-md px-4 py-2 text-base cursor-pointer w-fit disabled:opacity-50 transition-colors">
            <span className="flex items-center gap-1 text-black bg-[#DDDDDD] rounded-md p-2.5">
                            <GrUpload size={20} />
                            </span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
          disabled={disabled}
          className="hidden"
        />
      </label>
      </div>

 

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {images.map((imgObj, index) => (
            <div
              key={index}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`group relative w-24 h-24 border-2 rounded-md overflow-hidden cursor-move shadow-sm transition-all ${
                draggedIndex === index
                  ? "opacity-50 border-blue-500 scale-95"
                  : "border-gray-300 hover:border-blue-400"
              }`}
            >
              {/* Image */}
              <img
                src={imgObj.url || imgObj.preview}
                alt={`preview-${index}`}
                className="w-full h-full object-cover"
                draggable="false"
              />

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />

              {/* Delete Button - For all images */}
              <div
                onClick={() => removeImage(index)}
                className={`absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-colors z-10 opacity-0 group-hover:opacity-100 cursor-pointer ${
                  disabled ? "opacity-50 cursor-not-allowed" : ""
                }`}
                title="Delete image"
              >
                ✕
              </div>

              {/* Drag Indicator */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 pointer-events-none">
                <span className="text-white text-xs font-semibold">DRAG</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
