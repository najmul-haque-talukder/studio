
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { useFirestore } from "@/firebase";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ChevronLeft, Download, Camera, Loader2, Sparkles, ZoomIn, ArrowRight, MoveHorizontal, MoveVertical } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

const PhotoCardCanvas = dynamic(() => import("@/components/canvas/PhotoCardCanvas"), { ssr: false });

const DEFAULT_USER_PLACEHOLDER = "https://picsum.photos/seed/user-placeholder/600/600";

export default function GeneratePage() {
  const { id } = useParams();
  const router = useRouter();
  const db = useFirestore();
  const canvasRef = useRef<any>(null);
  
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [userPhotoUrl, setUserPhotoUrl] = useState<string>("");
  const [userPhotoScale, setUserPhotoScale] = useState(1);
  const [userPhotoOffset, setUserPhotoOffset] = useState({ x: 0, y: 0 });
  const [formData, setFormData] = useState({
    name: "",
    designation: "",
    session: ""
  });

  useEffect(() => {
    const fetchTemplate = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, "templates", id as string);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          setTemplate(snapshot.data());
        }
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTemplate();
  }, [id, db]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setUserPhotoUrl(url);
      setUserPhotoScale(1); 
      setUserPhotoOffset({ x: 0, y: 0 });
      toast({ title: "Photo attached!", description: "Adjust the position in preview." });
    }
  };

  const handleDownload = async () => {
    if (canvasRef.current && id) {
      const docRef = doc(db, "templates", id as string);
      updateDoc(docRef, { usageCount: increment(1) })
        .catch(async (err) => {
          const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: { usageCount: 1 }
          });
          errorEmitter.emit('permission-error', permissionError);
        });
      
      canvasRef.current.export4K(`photocard_${formData.name.toLowerCase().replace(/\s+/g, '_') || 'card'}_${Date.now()}.jpg`);
      toast({ title: "Card generated!", description: "Check your downloads folder." });
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!template) return (
    <div className="p-10 text-center flex flex-col items-center gap-4">
      <p className="text-muted-foreground">Template not found.</p>
      <Button onClick={() => router.push("/")}>Return Home</Button>
    </div>
  );

  const canvasConfig = {
    ...template,
    nameConfig: { ...template.nameConfig, text: formData.name || "Enter Your Name" },
    designationConfig: { ...template.designationConfig, text: formData.designation || "Enter Your Designation" },
    sessionConfig: { ...template.sessionConfig, text: formData.session || "Enter Your Session" }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 p-4 sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
              <ChevronLeft />
            </Button>
            <h1 className="font-bold text-lg">{template.title}</h1>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="w-3 h-3 text-primary" /> {template.usageCount || 0}
          </Badge>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-col md:flex-row gap-10 items-start justify-center">
          <div className={`w-full md:w-[400px] space-y-8 ${step === 2 ? "hidden md:block" : "block"}`}>
            <div className="space-y-6">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <span className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                Card Details
              </h2>
              
              <div className="space-y-3">
                <Label>Profile Image</Label>
                <div className="relative group aspect-square rounded-[2rem] border-4 border-dashed border-border bg-muted/20 hover:bg-muted/30 transition-all flex flex-col items-center justify-center overflow-hidden">
                  {userPhotoUrl ? (
                    <img src={userPhotoUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Camera className="w-12 h-12 text-muted-foreground mb-3" />
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Select Photo</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs uppercase tracking-widest font-bold opacity-70">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter Your Name"
                    className="rounded-2xl h-14 bg-card border-border/50 text-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="designation" className="text-xs uppercase tracking-widest font-bold opacity-70">Designation</Label>
                  <Input
                    id="designation"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    placeholder="Enter Your Designation"
                    className="rounded-2xl h-14 bg-card border-border/50 text-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session" className="text-xs uppercase tracking-widest font-bold opacity-70">Session</Label>
                  <Input
                    id="session"
                    value={formData.session}
                    onChange={(e) => setFormData({ ...formData, session: e.target.value })}
                    placeholder="Enter Your Session"
                    className="rounded-2xl h-14 bg-card border-border/50 text-lg"
                  />
                </div>
              </div>
            </div>

            <Button 
              className="w-full h-16 rounded-2xl text-xl font-bold gap-3 md:hidden shadow-xl shadow-primary/20" 
              onClick={() => setStep(2)}
              disabled={!userPhotoUrl}
            >
              Next Step <ArrowRight className="w-5 h-5" />
            </Button>
          </div>

          <div className={`flex-1 w-full max-w-[500px] space-y-8 ${step === 1 ? "hidden md:block" : "block"}`}>
            <h2 className="text-2xl font-bold hidden md:flex items-center gap-3">
              <span className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
              Live Preview
            </h2>
            
            <div className="w-full relative shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] rounded-[2.5rem] overflow-hidden bg-card border-8 border-card">
              <PhotoCardCanvas 
                config={canvasConfig} 
                userPhotoUrl={userPhotoUrl || DEFAULT_USER_PLACEHOLDER} 
                userPhotoScale={userPhotoScale}
                userPhotoOffset={userPhotoOffset}
                ref={canvasRef} 
              />
            </div>

            {userPhotoUrl && (
              <div className="p-8 bg-card/50 backdrop-blur-xl rounded-[2rem] border border-border/50 shadow-2xl space-y-8">
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/20 rounded-lg"><ZoomIn className="w-5 h-5 text-primary" /></div>
                      <span className="text-xs font-black uppercase tracking-widest">Zoom Factor</span>
                    </div>
                    <Badge variant="secondary" className="font-mono text-sm px-3 py-1 bg-primary/10 text-primary border-none">
                      {Math.round(userPhotoScale * 100)}%
                    </Badge>
                  </div>
                  <Slider 
                    value={[userPhotoScale]} 
                    min={0.5} 
                    max={3} 
                    step={0.01} 
                    onValueChange={([val]) => setUserPhotoScale(val)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-secondary/20 rounded-lg"><MoveHorizontal className="w-5 h-5 text-secondary" /></div>
                      <span className="text-xs font-black uppercase tracking-widest">X Position</span>
                    </div>
                    <Slider 
                      value={[userPhotoOffset.x]} 
                      min={-300} 
                      max={300} 
                      step={1} 
                      onValueChange={([val]) => setUserPhotoOffset(prev => ({ ...prev, x: val }))}
                    />
                  </div>
                  <div className="space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-secondary/20 rounded-lg"><MoveVertical className="w-5 h-5 text-secondary" /></div>
                      <span className="text-xs font-black uppercase tracking-widest">Y Position</span>
                    </div>
                    <Slider 
                      value={[userPhotoOffset.y]} 
                      min={-300} 
                      max={300} 
                      step={1} 
                      onValueChange={([val]) => setUserPhotoOffset(prev => ({ ...prev, y: val }))}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-5">
              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  className="flex-1 h-16 rounded-2xl md:hidden text-lg font-bold" 
                  onClick={() => setStep(1)}
                >
                  <ChevronLeft className="w-5 h-5 mr-2" /> Edit Info
                </Button>
                <Button 
                  className="flex-[2] h-16 rounded-2xl text-xl font-bold bg-secondary hover:bg-secondary/90 gap-3 shadow-2xl shadow-secondary/30"
                  onClick={handleDownload}
                  disabled={!userPhotoUrl}
                >
                  <Download className="w-6 h-6" /> Download 4K JPG
                </Button>
              </div>
              <p className="text-center text-xs text-muted-foreground font-medium italic opacity-60">
                {userPhotoUrl ? "Use the sliders to center your face perfectly." : "Please upload a photo to generate."}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

