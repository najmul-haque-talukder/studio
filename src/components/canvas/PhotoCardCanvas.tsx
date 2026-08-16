"use client";

import React, { useRef, useImperativeHandle, forwardRef, useEffect, useState } from "react";
import { Stage, Layer, Image as KonvaImage, Text, Group, Circle, Rect } from "react-konva";
import useImage from "use-image";

interface LayerConfig {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontStyle: string;
  color: string;
  align: "left" | "center" | "right";
}

interface TemplateConfig {
  backgroundImageUrl?: string;
  photoConfig: {
    shape: "circle" | "square";
    diameter?: number;
    width?: number;
    height?: number;
    borderRadius?: number;
    borderWidth?: number;
    borderColor?: string;
    x: number;
    y: number;
  };
  nameConfig: LayerConfig;
  designationConfig: LayerConfig;
  sessionConfig: LayerConfig;
}

interface PhotoCardCanvasProps {
  config: TemplateConfig;
  userPhotoUrl?: string;
  userPhotoScale?: number;
  userPhotoOffset?: { x: number; y: number };
  width?: number;
  height?: number;
  onUserPhotoTransform?: (x: number, y: number) => void;
  onLayerTransform?: (layer: string, x: number, y: number) => void;
}

export const PhotoCardCanvas = forwardRef(({ 
  config, 
  userPhotoUrl, 
  userPhotoScale = 1,
  userPhotoOffset = { x: 0, y: 0 },
  width = 500, 
  height = 500,
  onUserPhotoTransform,
  onLayerTransform
}: PhotoCardCanvasProps, ref) => {
  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  
  const [bgImage] = useImage(config.backgroundImageUrl || null, "anonymous");
  const [userPhoto] = useImage(userPhotoUrl || null, "anonymous");

  // Handle Responsiveness
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        if (containerWidth > 0) {
          setScale(containerWidth / width);
        }
      }
    };
    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
    };
  }, [width]);

  useImperativeHandle(ref, () => ({
    export4K: (filename: string) => {
      if (!stageRef.current) return;
      const stage = stageRef.current;
      
      // Safety check
      if (stage.width() <= 0 || stage.height() <= 0) {
        console.error("Cannot export: Stage has zero dimensions.");
        return;
      }

      try {
        const dataUrl = stage.toDataURL({ 
          pixelRatio: 4, 
          mimeType: 'image/jpeg',
          quality: 1.0
        });
        const link = document.createElement("a");
        link.download = filename;
        link.href = dataUrl;
        link.click();
      } catch (e) {
        console.error("Export failed:", e);
      }
    }
  }));

  const clipFunc = (ctx: any) => {
    const pc = config.photoConfig;
    ctx.beginPath();
    if (pc.shape === "circle") {
      const radius = (pc.diameter || 150) / 2;
      ctx.arc(pc.x + radius, pc.y + radius, radius, 0, Math.PI * 2, false);
    } else {
      const w = pc.width || 150;
      const h = pc.height || 150;
      const r = pc.borderRadius || 0;
      ctx.roundRect(pc.x, pc.y, w, h, r);
    }
    ctx.closePath();
  };

  const frameWidth = config.photoConfig.shape === "circle" ? (config.photoConfig.diameter || 150) : (config.photoConfig.width || 150);
  const frameHeight = config.photoConfig.shape === "circle" ? (config.photoConfig.diameter || 150) : (config.photoConfig.height || 150);

  const renderTextLayer = (layerName: string, layerConfig: LayerConfig) => {
    if (!layerConfig) return null;
    return (
      <Text
        text={layerConfig.text || ""}
        x={layerConfig.x || 0}
        y={layerConfig.y || 0}
        fontSize={layerConfig.fontSize || 20}
        fontStyle={layerConfig.fontStyle || "normal"}
        fill={layerConfig.color || "#000000"}
        align={layerConfig.align || "center"}
        width={width}
        fontFamily='"Bricolage Grotesque", "Hind Siliguri", sans-serif'
        draggable={!!onLayerTransform}
        onDragEnd={(e) => {
          if (onLayerTransform) {
            onLayerTransform(layerName, e.target.x(), e.target.y());
          }
        }}
      />
    );
  };

  const renderBorder = () => {
    const pc = config.photoConfig;
    const bw = pc.borderWidth || 0;
    if (bw <= 0) return null;

    if (pc.shape === "circle") {
      const radius = (pc.diameter || 150) / 2;
      return (
        <Circle
          x={pc.x + radius}
          y={pc.y + radius}
          radius={radius}
          stroke={pc.borderColor || "#ffffff"}
          strokeWidth={bw}
          listening={false}
        />
      );
    } else {
      return (
        <Rect
          x={pc.x}
          y={pc.y}
          width={pc.width || 150}
          height={pc.height || 150}
          cornerRadius={pc.borderRadius || 0}
          stroke={pc.borderColor || "#ffffff"}
          strokeWidth={bw}
          listening={false}
        />
      );
    }
  };

  return (
    <div ref={containerRef} className="relative aspect-square w-full max-w-[500px] mx-auto overflow-hidden bg-[#1a1a1a] rounded-xl shadow-inner border border-border/50">
      <Stage 
        width={Math.max(1, width * scale)} 
        height={Math.max(1, height * scale)} 
        scaleX={scale} 
        scaleY={scale} 
        ref={stageRef}
      >
        <Layer>
          {bgImage ? (
            <KonvaImage 
              image={bgImage} 
              width={width} 
              height={height} 
              key={`bg-${config.backgroundImageUrl}`} 
            />
          ) : (
             <Rect width={width} height={height} fill="#1a1a1a" />
          )}
          
          <Group clipFunc={clipFunc}>
            {userPhoto && (
              <KonvaImage 
                image={userPhoto} 
                x={config.photoConfig.x + (frameWidth / 2) + userPhotoOffset.x} 
                y={config.photoConfig.y + (frameHeight / 2) + userPhotoOffset.y}
                width={userPhoto.width}
                height={userPhoto.height}
                scaleX={(frameWidth / userPhoto.width) * userPhotoScale}
                scaleY={(frameWidth / userPhoto.width) * userPhotoScale}
                offsetX={userPhoto.width / 2}
                offsetY={userPhoto.height / 2}
                draggable={!onUserPhotoTransform}
                key={`photo-${userPhotoUrl}`}
              />
            )}
          </Group>

          {renderBorder()}

          {renderTextLayer("nameConfig", config.nameConfig)}
          {renderTextLayer("designationConfig", config.designationConfig)}
          {renderTextLayer("sessionConfig", config.sessionConfig)}
        </Layer>
      </Stage>
    </div>
  );
});

PhotoCardCanvas.displayName = "PhotoCardCanvas";

export default PhotoCardCanvas;
