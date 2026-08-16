
"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useFirestore, useUser, useStorage } from "@/firebase";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, Save, Upload, Loader2, Sparkles, Image as ImageIcon, Type, Target, MousePointer2, Palette, Settings, Trophy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { SliderInput } from "@/components/ui/slider-input";
import { ColorPickerInput } from "@/components/ui/color-picker-input";

const PhotoCardCanvas = dynamic(() => import("@/components/canvas/PhotoCardCanvas"), { ssr: false });

const DEFAULT_CONFIG = {
  title: "New Template",
  subtitle: "Event 2024",
  status: "draft",
  category: "events",
  featured: false,
  displayRank: 0,
  backgroundImageUrl: "",
  photoConfig: {
    shape: "circle",
    diameter: 180,
    width: 180,
    height: 180,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#ffffff",
    x: 160,
    y: 80
  },
  nameConfig: {
    x: 0,
    y: 320,
    fontSize: 32,
    fontStyle: "bold",
    color: "#ffffff",
    align: "center"
  },
  designationConfig: {
    x: 0,
    y: 365,
    fontSize: 18,
    fontStyle: "normal",
    color: "#cccccc",
    align: "center"
  },
  sessionConfig: {
    x: 0,
    y: 400,
    fontSize: 14,
    fontStyle: "italic",
    color: "#aaaaaa",
    align: "center"
  }
};

export default function TemplateEditorPage() {
  const { id } = useParams();
  const router = useRouter();
  const db = useFirestore();
  const storage = useStorage();
  const { user, loading: userLoading } = useUser();
  
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/admin/login");
      return;
    }

    const fetchData = async () => {
      try {
        if (id === "new") {
          setConfig({ ...DEFAULT_CONFIG });
        } else {
          const docRef = doc(db, "templates", id as string);
          const snapshot = await getDoc(docRef);
          if (snapshot.exists()) {
            const data = snapshot.data();
            setConfig({
              ...DEFAULT_CONFIG,
              ...data,
              photoConfig: { ...DEFAULT_CONFIG.photoConfig, ...(data.photoConfig || {}) },
              nameConfig: { ...DEFAULT_CONFIG.nameConfig, ...(data.nameConfig || {}) },
              designationConfig: { ...DEFAULT_CONFIG.designationConfig, ...(data.designationConfig || {}) },
              sessionConfig: { ...DEFAULT_CONFIG.sessionConfig, ...(data.sessionConfig || {}) }
            });
          } else {
            router.push("/admin/dashboard");
          }
        }
      } catch (err: any) {
        // Handled globally
      } finally {
        setLoading(false);
      }
    };
    if (!userLoading && user) fetchData();
  }, [id, user, userLoading, router, db]);

  const handleUpdate = (path: string, value: any) => {
    setConfig((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev));
      const parts = path.split(".");
      let current = next;
      for (let i = 0; i < parts.length - 1; i++) {
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
      return next;
    });
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileName = `backgrounds/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const storageRef = ref(storage, fileName);
    
    uploadBytes(storageRef, file, { contentType: file.type })
      .then((uploadResult) => {
        return getDownloadURL(uploadResult.ref);
      })
      .then((url) => {
        handleUpdate("backgroundImageUrl", url);
        toast({ title: "Background uploaded!" });
      })
      .catch((err: any) => {
        toast({ variant: "destructive", title: "Upload failed" });
      })
      .finally(() => {
        setUploading(false);
      });
  };

  const handleSave = (status: "draft" | "published") => {
    if (!user) return;
    setSaving(true);
    const templateId = id === "new" ? `tmp_${Date.now()}` : id as string;
    const docRef = doc(db, "templates", templateId);
    const data = { 
      ...config, 
      id: templateId, 
      status, 
      updatedAt: serverTimestamp(),
      usageCount: config.usageCount || 0,
      displayRank: Number(config.displayRank) || 0
    };

    setDoc(docRef, data, { merge: true })
      .then(() => {
        toast({ title: `Template saved as ${status}` });
        router.push("/admin/dashboard");
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'write',
          requestResourceData: data,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setSaving(false);
      });
  };

  if (loading || userLoading || !config) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <header className="h-16 border-b border-border/50 bg-card px-4 flex items-center justify-between z-50 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/admin/dashboard")}>
            <ChevronLeft />
          </Button>
          <div>
            <h1 className="font-bold text-xl leading-tight">{id === "new" ? "New Template" : config.title}</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Design Mode</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleSave("draft")} disabled={saving}>
            Draft
          </Button>
          <Button size="sm" onClick={() => handleSave("published")} disabled={saving} className="gap-2 font-bold px-4">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save & Publish
          </Button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        {/* Settings Sidebar */}
        <div className={`
          fixed md:relative inset-y-0 left-0 z-40 w-full md:w-[450px] bg-card border-r border-border/50 
          transition-transform duration-300 transform 
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          overflow-y-auto p-6 space-y-8 custom-scrollbar
        `}>
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">Base Properties</h2>
            </div>
            <div className="grid gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Admin Title</Label>
                <Input value={config.title} onChange={(e) => handleUpdate("title", e.target.value)} className="h-9 rounded-lg" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Public Subtitle</Label>
                <Input value={config.subtitle} onChange={(e) => handleUpdate("subtitle", e.target.value)} className="h-9 rounded-lg" />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Category</Label>
                  <select 
                    value={config.category} 
                    onChange={(e) => handleUpdate("category", e.target.value)}
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-xs focus:outline-none"
                  >
                    <option value="events">Events</option>
                    <option value="professional">Professional</option>
                    <option value="academic">Academic</option>
                    <option value="social">Social</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1"><Trophy className="w-3 h-3 text-yellow-500" /> Top 10 Rank</Label>
                  <select 
                    value={config.displayRank || 0} 
                    onChange={(e) => handleUpdate("displayRank", Number(e.target.value))}
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-xs focus:outline-none"
                  >
                    <option value={0}>None</option>
                    {[1,2,3,4,5,6,7,8,9,10].map(r => (
                      <option key={r} value={r}>Position {r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Featured Spotlight</Label>
                <div className="flex items-center justify-between h-9 px-3 border rounded-lg bg-muted/20">
                  <span className="text-[10px] font-medium italic">Highlight on home screen</span>
                  <Switch checked={config.featured} onCheckedChange={(val) => handleUpdate("featured", val)} className="scale-75" />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Background Layer</Label>
                <div className="relative h-32 rounded-lg border-2 border-dashed border-border/50 flex flex-col items-center justify-center bg-muted/20 overflow-hidden group">
                  {config.backgroundImageUrl ? (
                    <img src={config.backgroundImageUrl} alt="BG" className="absolute inset-0 w-full h-full object-cover opacity-40" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-primary/20" />
                  )}
                  <div className="flex flex-col items-center gap-1 z-10">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-[10px] font-medium">Click to Upload</span>
                  </div>
                  <input type="file" accept="image/*" onChange={handleBgUpload} className="absolute inset-0 opacity-0 cursor-pointer" disabled={uploading} />
                </div>
              </div>
            </div>
          </section>

          <Tabs defaultValue="photo" className="w-full">
            <TabsList className="grid grid-cols-4 w-full h-10 rounded-lg bg-muted/50 p-1">
              <TabsTrigger value="photo" className="rounded-md"><ImageIcon className="w-3 h-3" /></TabsTrigger>
              <TabsTrigger value="name" className="rounded-md"><Type className="w-3 h-3" /></TabsTrigger>
              <TabsTrigger value="designation" className="rounded-md text-[10px]">Job</TabsTrigger>
              <TabsTrigger value="session" className="rounded-md text-[10px]">Batch</TabsTrigger>
            </TabsList>

            <TabsContent value="photo" className="mt-6 space-y-6">
              <div className="grid gap-5">
                <div className="space-y-3">
                  <Label className="text-xs font-bold">Frame Shape</Label>
                  <RadioGroup value={config.photoConfig.shape} onValueChange={(val) => handleUpdate("photoConfig.shape", val)} className="flex gap-2">
                    {["circle", "square"].map(s => (
                      <div key={s} className="flex items-center space-x-2 bg-muted/30 p-2 rounded-lg flex-1 border border-border/50">
                        <RadioGroupItem value={s} id={s} className="scale-75" />
                        <Label htmlFor={s} className="text-xs capitalize">{s}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="grid gap-4">
                  {config.photoConfig.shape === "circle" ? (
                    <SliderInput label="Frame Diameter" value={config.photoConfig.diameter || 180} min={50} max={400} onChange={(val) => handleUpdate("photoConfig.diameter", val)} />
                  ) : (
                    <>
                      <SliderInput label="Frame Width" value={config.photoConfig.width || 180} min={50} max={450} onChange={(val) => handleUpdate("photoConfig.width", val)} />
                      <SliderInput label="Frame Height" value={config.photoConfig.height || 180} min={50} max={450} onChange={(val) => handleUpdate("photoConfig.height", val)} />
                      <SliderInput label="Corner Radius" value={config.photoConfig.borderRadius || 20} min={0} max={225} onChange={(val) => handleUpdate("photoConfig.borderRadius", val)} />
                    </>
                  )}
                  <SliderInput label="Horizontal (X)" value={config.photoConfig.x} min={0} max={500} onChange={(val) => handleUpdate("photoConfig.x", val)} />
                  <SliderInput label="Vertical (Y)" value={config.photoConfig.y} min={0} max={500} onChange={(val) => handleUpdate("photoConfig.y", val)} />
                  
                  <div className="pt-4 border-t border-border/50 space-y-4">
                    <h4 className="text-xs font-bold flex items-center gap-2"><Palette className="w-3 h-3" /> Border Controls</h4>
                    <SliderInput label="Border Width" value={config.photoConfig.borderWidth || 0} min={0} max={20} onChange={(val) => handleUpdate("photoConfig.borderWidth", val)} />
                    <ColorPickerInput label="Border Color" value={config.photoConfig.borderColor || "#ffffff"} onChange={(val) => handleUpdate("photoConfig.borderColor", val)} />
                  </div>
                </div>
              </div>
            </TabsContent>

            {["name", "designation", "session"].map((layer) => (
              <TabsContent key={layer} value={layer} className="mt-6 space-y-6">
                <div className="grid gap-4">
                  <SliderInput label="Horizontal (X)" value={config[`${layer}Config`].x} min={-250} max={500} onChange={(val) => handleUpdate(`${layer}Config.x`, val)} />
                  <SliderInput label="Vertical (Y)" value={config[`${layer}Config`].y} min={0} max={500} onChange={(val) => handleUpdate(`${layer}Config.y`, val)} />
                  <SliderInput label="Font Size" value={config[`${layer}Config`].fontSize} min={8} max={72} onChange={(val) => handleUpdate(`${layer}Config.fontSize`, val)} />
                  <div className="space-y-2">
                    <Label className="text-xs">Font Style</Label>
                    <select value={config[`${layer}Config`].fontStyle} onChange={(e) => handleUpdate(`${layer}Config.fontStyle`, e.target.value)} className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-xs">
                      <option value="normal">Normal</option>
                      <option value="bold">Bold</option>
                      <option value="italic">Italic</option>
                      <option value="bold italic">Bold Italic</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Alignment</Label>
                    <div className="flex bg-muted/30 p-1 rounded-lg">
                      {["left", "center", "right"].map(align => (
                        <Button key={align} variant={config[`${layer}Config`].align === align ? "default" : "ghost"} className="flex-1 h-7 rounded-md capitalize text-[10px]" onClick={() => handleUpdate(`${layer}Config.align`, align)}>{align}</Button>
                      ))}
                    </div>
                  </div>
                  <ColorPickerInput label="Text Color" value={config[`${layer}Config`].color} onChange={(val) => handleUpdate(`${layer}Config.color`, val)} />
                </div>
              </TabsContent>
            ))}
          </Tabs>
          <div className="h-12" />
        </div>

        {/* Preview Panel */}
        <div className="flex-1 bg-muted/5 flex flex-col items-center justify-center p-12 overflow-hidden relative">
          <Button 
            variant="secondary" 
            size="sm" 
            className="md:hidden absolute top-4 left-4 z-30 gap-2 rounded-full shadow-lg"
            onClick={() => setSidebarOpen(true)}
          >
            <Settings className="w-4 h-4" /> Edit Settings
          </Button>

          <div className="w-full max-w-[500px] space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Live Preview Canvas</h3>
              </div>
              <Badge variant="outline" className="border-primary text-primary bg-primary/5 text-[10px]">Interactive</Badge>
            </div>
            
            <div className="w-full shadow-2xl rounded-2xl overflow-hidden bg-muted/20 border-4 border-muted/50">
               <PhotoCardCanvas 
                config={{
                  ...config,
                  nameConfig: { ...config.nameConfig, text: "Enter Your Name" },
                  designationConfig: { ...config.designationConfig, text: "Department/Designation" },
                  sessionConfig: { ...config.sessionConfig, text: "Session 2021-22" }
                }} 
                userPhotoUrl="https://picsum.photos/seed/admin-placeholder/600/600"
                onLayerTransform={(layerName, x, y) => {
                  handleUpdate(`${layerName}.x`, x);
                  handleUpdate(`${layerName}.y`, y);
                }}
              />
            </div>
            <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground italic">
              <MousePointer2 className="w-3 h-3" />
              Tip: Drag elements directly in the preview to position them.
            </div>
          </div>
        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: hsl(var(--muted)); border-radius: 10px; }
      `}</style>
    </div>
  );
}
