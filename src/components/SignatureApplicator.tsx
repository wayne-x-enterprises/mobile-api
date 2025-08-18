import React, { useState, useEffect, useRef } from 'react';
import { Signature } from '../models/Signature';
import { SignatureService } from '../services/SignatureService';

interface SignatureApplicatorProps {
  userId: string;
  onSignatureApplied: (signature: Signature, position: { x: number; y: number }) => void;
  documentWidth: number;
  documentHeight: number;
}

export const SignatureApplicator: React.FC<SignatureApplicatorProps> = ({
  userId,
  onSignatureApplied,
  documentWidth,
  documentHeight,
}) => {
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [selectedSignature, setSelectedSignature] = useState<Signature | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signatureService = new SignatureService();

  // Load user's signatures
  useEffect(() => {
    const userSignatures = signatureService.getUserSignatures(userId);
    setSignatures(userSignatures);
  }, [userId]);

  // Handle new signature creation
  const handleCreateSignature = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    // Clear previous drawings
    context.clearRect(0, 0, canvas.width, canvas.height);
    setIsDrawing(true);
  };

  // Handle drawing on canvas
  const handleDraw = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    context.lineWidth = 2;
    context.lineCap = 'round';
    context.lineTo(x, y);
    context.stroke();
    context.beginPath();
    context.moveTo(x, y);
  };

  // Handle saving the signature
  const handleSaveSignature = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const imageData = canvas.toDataURL('image/png');
    
    if (signatureService.validateSignatureImage(imageData)) {
      const newSignature = signatureService.createSignature(
        imageData,
        canvas.width,
        canvas.height,
        userId,
        {
          device: 'web',
          platform: navigator.userAgent,
        }
      );

      setSignatures([...signatures, newSignature]);
      setIsDrawing(false);
      
      // Clear canvas
      const context = canvas.getContext('2d');
      if (context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  // Handle applying signature to document
  const handleApplySignature = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedSignature) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const position = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    onSignatureApplied(selectedSignature, position);
  };

  return (
    <div className="signature-applicator">
      <div className="signature-tools">
        <button onClick={handleCreateSignature}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2V14M2 8H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Create New Signature
        </button>
        
        <div className="signature-list">
          {signatures.map((signature) => (
            <div
              key={signature.id}
              className={`signature-item ${selectedSignature?.id === signature.id ? 'selected' : ''}`}
              onClick={() => setSelectedSignature(signature)}
            >
              <img
                src={signature.imageData}
                alt={signature.label || 'Signature'}
                style={{ width: '100px', height: 'auto' }}
              />
              <span>{signature.label || 'Untitled Signature'}</span>
            </div>
          ))}
        </div>
      </div>

      {isDrawing && (
        <div className="signature-canvas-container">
          <canvas
            ref={canvasRef}
            width={400}
            height={200}
            onMouseMove={handleDraw}
            onMouseDown={() => setIsDrawing(true)}
            onMouseUp={() => setIsDrawing(false)}
            onMouseLeave={() => setIsDrawing(false)}
            style={{ border: '1px solid #ccc' }}
          />
          <div className="canvas-controls">
            <button onClick={handleSaveSignature}>Save Signature</button>
            <button onClick={() => setIsDrawing(false)}>Cancel</button>
          </div>
        </div>
      )}

      {selectedSignature && (
        <div
          className="document-preview"
          style={{
            width: documentWidth,
            height: documentHeight,
            position: 'relative',
            border: '1px solid #ccc'
          }}
          onClick={handleApplySignature}
        >
          <div className="document-instructions">
            Click anywhere to place the selected signature
          </div>
        </div>
      )}

      <style jsx>{`
        .signature-applicator {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          padding: 0;
        }

        .signature-tools {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .signature-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
        }

        .signature-item {
          border: 2px solid #e5e7eb;
          border-radius: 0.75rem;
          padding: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
          background: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
        }

        .signature-item:hover {
          border-color: #6366f1;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
        }

        .signature-item.selected {
          border-color: #6366f1;
          background: #f0f9ff;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .signature-item img {
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
          background: white;
        }

        .signature-item span {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          text-align: center;
        }

        .signature-canvas-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          align-items: center;
          background: #f9fafb;
          padding: 2rem;
          border-radius: 0.75rem;
          border: 2px dashed #d1d5db;
        }

        .canvas-controls {
          display: flex;
          gap: 0.75rem;
        }

        .document-preview {
          background: white;
          border-radius: 0.75rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          overflow: hidden;
        }

        .document-instructions {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: #9ca3af;
          pointer-events: none;
          text-align: center;
          font-weight: 500;
          background: rgba(255, 255, 255, 0.9);
          padding: 1rem 2rem;
          border-radius: 0.5rem;
          border: 2px dashed #d1d5db;
        }

        button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: #6366f1;
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-weight: 500;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        button:hover {
          background: #5b21b6;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }

        button:active {
          transform: translateY(0);
        }

        /* Empty state */
        .signature-list:empty::after {
          content: "No signatures yet. Create your first signature above.";
          grid-column: 1 / -1;
          text-align: center;
          color: #9ca3af;
          font-style: italic;
          padding: 2rem;
          border: 2px dashed #d1d5db;
          border-radius: 0.75rem;
          background: #f9fafb;
        }

        /* Responsive design */
        @media (max-width: 768px) {
          .signature-list {
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          }

          .canvas-controls {
            flex-direction: column;
            width: 100%;
          }

          button {
            width: 100%;
            justify-content: center;
          }

          .signature-canvas-container {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
};