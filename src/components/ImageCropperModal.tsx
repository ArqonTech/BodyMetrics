import { useState, useCallback } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import { X, ZoomIn, RotateCw, Check } from 'lucide-react';
import './ImageCropperModal.css';

export interface CropSettings {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
  rotation: number;
}

interface ImageCropperModalProps {
  image: string;
  onClose: () => void;
  onCropComplete: (settings: CropSettings) => void;
  initialSettings?: CropSettings;
}

export function ImageCropperModal({ image, onClose, onCropComplete, initialSettings }: ImageCropperModalProps) {
  const [crop, setCrop] = useState({ x: initialSettings?.x || 0, y: initialSettings?.y || 0 });
  const [zoom, setZoom] = useState(initialSettings?.zoom || 1);
  const [rotation, setRotation] = useState(initialSettings?.rotation || 0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropChange = (crop: Point) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onRotationChange = (rotation: number) => {
    setRotation(rotation);
  };

  const onCropCompleteCallback = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = () => {
    if (croppedAreaPixels) {
      onCropComplete({
        ...croppedAreaPixels,
        zoom,
        rotation
      });
    }
    onClose();
  };

  return (
    <div className="crop-modal-overlay">
      <div className="crop-modal-container">
        <div className="crop-modal-header">
          <h3>Ajustar Foto</h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="crop-container">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            onCropChange={onCropChange}
            onCropComplete={onCropCompleteCallback}
            onZoomChange={onZoomChange}
            onRotationChange={onRotationChange}
          />
        </div>

        <div className="crop-controls">
          <div className="control-group">
            <ZoomIn size={18} />
            <span>ZOOM</span>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => onZoomChange(Number(e.target.value))}
              className="zoom-range"
            />
          </div>

          <div className="control-group">
            <RotateCw size={18} />
            <span>ROTAÇÃO</span>
            <input
              type="range"
              value={rotation}
              min={0}
              max={360}
              step={1}
              aria-labelledby="Rotation"
              onChange={(e) => onRotationChange(Number(e.target.value))}
              className="rotation-range"
            />
          </div>
        </div>

        <div className="crop-modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Check size={18} /> Confirmar Ajuste
          </button>
        </div>
      </div>
    </div>
  );
}
