import React, { useRef, useEffect, useState } from 'react';
import { Signature } from '../models/Signature';

interface SignatureCanvasProps {
  width?: number;
  height?: number;
  onSave?: (signature: Signature) => void;
  onClear?: () => void;
  className?: string;
}

export const SignatureCanvas: React.FC<SignatureCanvasProps> = ({
  width = 500,
  height = 200,
  onSave,
  onClear,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up canvas
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000000';
    
    setContext(ctx);
  }, []);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    setHasDrawn(true);
    const { offsetX, offsetY } = getCoordinates(e);
    context?.beginPath();
    context?.moveTo(offsetX, offsetY);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !context) return;
    e.preventDefault();
    
    const { offsetX, offsetY } = getCoordinates(e);
    context.lineTo(offsetX, offsetY);
    context.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    context?.closePath();
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { offsetX: 0, offsetY: 0 };

    if ('touches' in e) {
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      return {
        offsetX: touch.clientX - rect.left,
        offsetY: touch.clientY - rect.top,
      };
    } else {
      return {
        offsetX: e.nativeEvent.offsetX,
        offsetY: e.nativeEvent.offsetY,
      };
    }
  };

  const clearCanvas = () => {
    if (!context || !canvasRef.current) return;
    context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasDrawn(false);
    onClear?.();
  };

  const saveSignature = () => {
    if (!canvasRef.current) return;

    const signature: Signature = {
      id: crypto.randomUUID(),
      imageData: canvasRef.current.toDataURL('image/png'),
      width,
      height,
      createdAt: new Date(),
      userId: 'current-user-id', // This should be replaced with actual user ID
      metadata: {
        device: 'browser',
        platform: navigator.userAgent,
        pressureData: [], // Could be implemented with pointer events
      },
    };

    onSave?.(signature);
  };

  return (
    <div className={`signature-canvas-container ${className || ''}`}>
      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="signature-canvas"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasDrawn && (
          <div className="canvas-placeholder">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <path d="M36 6H12C8.68629 6 6 8.68629 6 12V36C6 39.3137 8.68629 42 12 42H36C39.3137 42 42 39.3137 42 36V12C42 8.68629 39.3137 6 36 6Z" stroke="currentColor" strokeWidth="2"/>
              <path d="M14 24L20 18L28 26L34 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p>Sign here with your mouse or touch</p>
          </div>
        )}
      </div>
      <div className="canvas-controls">
        <button className="btn btn-secondary" onClick={clearCanvas}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6.5 1H9.5C10.0523 1 10.5 1.44772 10.5 2V3H13C13.5523 3 14 3.44772 14 4C14 4.55228 13.5523 5 13 5H12V12C12 13.1046 11.1046 14 10 14H6C4.89543 14 4 13.1046 4 12V5H3C2.44772 5 2 4.55228 2 4C2 3.44772 2.44772 3 3 3H5.5V2C5.5 1.44772 5.94772 1 6.5 1Z" fill="currentColor"/>
          </svg>
          Clear
        </button>
        <button className="btn btn-primary" onClick={saveSignature}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" fill="currentColor"/>
          </svg>
          Save Signature
        </button>
      </div>

      <style jsx>{`
        .signature-canvas-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .canvas-wrapper {
          position: relative;
          border-radius: 0.75rem;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          background: white;
        }

        .signature-canvas {
          display: block;
          border: 2px solid #e5e7eb;
          border-radius: 0.75rem;
          touch-action: none;
          cursor: crosshair;
          transition: border-color 0.2s ease;
          background: white;
        }

        .signature-canvas:hover {
          border-color: #6366f1;
        }

        .signature-canvas:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .canvas-placeholder {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          color: #9ca3af;
          pointer-events: none;
          opacity: 1;
          transition: opacity 0.2s ease;
        }

        .canvas-placeholder p {
          margin: 0.5rem 0 0 0;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .canvas-controls {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 0.5rem;
          font-weight: 500;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
        }

        .btn-primary {
          background: #6366f1;
          color: white;
        }

        .btn-primary:hover {
          background: #5b21b6;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }

        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .btn-secondary:hover {
          background: #e5e7eb;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .btn:active {
          transform: translateY(0);
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .canvas-controls {
            flex-direction: column;
            width: 100%;
          }

          .btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default SignatureCanvas;