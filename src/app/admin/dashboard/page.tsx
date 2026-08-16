"use client";

import React, { useMemo, useState } from "react";
import { collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { useFirestore, useAuth, useCollection, useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Plus, Edit2, Trash2, Eye, EyeOff, LayoutDashboard, LogOut, Loader2, AlertTriangle, ImageIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

interface Template {
  id: string;
  title: string;
  status: "draft" | "published";
  backgroundImageUrl: string;
}

export default function AdminDashboard() {
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { user, loading: userLoading } = useUser();

  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const templatesQuery = useMemo(() => collection(db, "templates"), [db]);
  const { data: templates, loading: templatesLoading } = useCollection<Template>(templatesQuery);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/admin/login");
    }
  }, [user, userLoading, router]);

  const initiateDelete = (id: string) => {
    setDeleteTemplateId(id);
    setConfirmText("");
  };

  const handleConfirmDelete = () => {
    if (confirmText === "DELETE" && deleteTemplateId) {
      const docRef = doc(db, "templates", deleteTemplateId);
      deleteDoc(docRef)
        .catch(async (err) => {
          const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete'
          });
          errorEmitter.emit('permission-error', permissionError);
        });
      
      toast({ title: "Template deleted" });
      setDeleteTemplateId(null);
      setConfirmText("");
    }
  };

  const togglePublish = (template: Template) => {
    const newStatus = template.status === "published" ? "draft" : "published";
    const docRef = doc(db, "templates", template.id);
    
    updateDoc(docRef, { status: newStatus })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: { status: newStatus }
        });
        errorEmitter.emit('permission-error', permissionError);
      });
      
    toast({ title: `Status: ${newStatus}` });
  };

  const handleLogout = () => {
    auth.signOut().then(() => {
      router.push("/admin/login");
    });
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
              <LayoutDashboard className="text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
              <p className="text-muted-foreground">Manage photocard templates</p>
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <Button onClick={() => router.push("/admin/editor")} className="flex-1 md:flex-none h-12 rounded-xl gap-2 font-bold px-6">
              <Plus className="w-5 h-5" /> Create Template
            </Button>
            <Button variant="outline" onClick={handleLogout} className="h-12 rounded-xl gap-2 text-destructive hover:text-destructive hover:bg-destructive/10">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {templatesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-64 bg-muted/30 animate-pulse rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {templates?.map(template => (
              <Card key={template.id} className="overflow-hidden border-border/50 bg-card rounded-2xl group hover:shadow-xl hover:border-primary/20 transition-all">
                <div className="aspect-video relative bg-muted overflow-hidden">
                  {template.backgroundImageUrl ? (
                    <Image
                      src={template.backgroundImageUrl}
                      alt={template.title}
                      fill
                      className="object-cover"
                      unoptimized={template.backgroundImageUrl.includes('firebasestorage.googleapis.com')}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <Badge variant={template.status === "published" ? "default" : "secondary"} className="shadow-lg backdrop-blur-sm bg-opacity-80">
                      {template.status === "published" ? "Published" : "Draft"}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-5">
                  <h3 className="font-bold text-lg mb-4 truncate">{template.title}</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="h-10 w-10 rounded-lg" onClick={() => router.push(`/admin/editor/${template.id}`)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-10 w-10 rounded-lg" onClick={() => togglePublish(template)}>
                      {template.status === "published" ? <EyeOff className="w-4 h-4 text-orange-500" /> : <Eye className="w-4 h-4 text-green-500" />}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-10 w-10 rounded-lg text-destructive hover:bg-destructive/10" 
                      onClick={() => initiateDelete(template.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <AlertDialog open={!!deleteTemplateId} onOpenChange={(open) => !open && setDeleteTemplateId(null)}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-2">
                <AlertTriangle className="text-destructive w-6 h-6" />
              </div>
              <AlertDialogTitle className="text-2xl font-bold">Delete Template?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. All associated data will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4 space-y-3">
              <p className="text-sm font-medium">Type <span className="text-destructive font-bold">DELETE</span> to confirm:</p>
              <Input 
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type 'DELETE' here"
                className="h-12 rounded-xl border-destructive/30"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl h-11">Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleConfirmDelete}
                disabled={confirmText !== "DELETE"}
                className="rounded-xl h-11 bg-destructive hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
