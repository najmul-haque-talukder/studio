
"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { collection, query, where } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight, Loader2, Star, ImageIcon, Trophy } from "lucide-react";
import Image from "next/image";

interface Template {
  id: string;
  title: string;
  subtitle: string;
  backgroundImageUrl: string;
  status: string;
  category?: string;
  featured?: boolean;
  displayRank?: number;
  updatedAt?: any;
}

const CATEGORIES = ["All", "Events", "Professional", "Academic", "Social"];

export default function HomePage() {
  const db = useFirestore();
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState("All");
  
  const templatesQuery = useMemoFirebase(() => {
    return query(collection(db, "templates"), where("status", "==", "published"));
  }, [db]);

  const { data: rawTemplates, loading } = useCollection<Template>(templatesQuery);

  const templates = useMemo(() => {
    if (!rawTemplates) return [];
    
    let filtered = [...rawTemplates];
    if (activeCategory !== "All") {
      filtered = filtered.filter(t => t.category === activeCategory.toLowerCase());
    }

    // Sort: Rank 1-10 first, then by date (newest first)
    return filtered.sort((a, b) => {
      const rankA = a.displayRank || 999;
      const rankB = b.displayRank || 999;
      
      if (rankA !== rankB) return rankA - rankB;
      
      const dateA = a.updatedAt?.seconds || 0;
      const dateB = b.updatedAt?.seconds || 0;
      return dateB - dateA;
    });
  }, [rawTemplates, activeCategory]);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <header className="relative py-12 md:py-20 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] md:w-[1200px] h-[300px] md:h-[600px] bg-primary/20 blur-[60px] md:blur-[120px] rounded-full -z-10" />
        
        <div className="container mx-auto px-4 text-center">
          <Badge variant="outline" className="mb-6 border-primary/50 text-primary py-1 px-4 gap-2 animate-pulse text-[10px] md:text-sm">
            <Sparkles className="w-3 h-3 md:w-4 md:h-4" /> Professional Photocards
          </Badge>
          <h1 className="text-4xl md:text-6xl lg:text-8xl font-bold mb-6 tracking-tight leading-tight px-2">
            Signature <span className="text-primary italic">Card</span> Studio
          </h1>
          <p className="text-sm md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 px-6">
            Create ultra-high quality 4K photocards in seconds. Optimized for CPI HTC professionals.
          </p>

          {/* Wrapped Categories for Mobile */}
          <div className="w-full flex justify-center px-4 mb-4">
            <div className="flex flex-wrap justify-center gap-2 max-w-4xl">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`rounded-full px-5 md:px-8 py-2 md:py-2.5 border transition-all text-xs md:text-sm font-bold
                    ${activeCategory === cat 
                      ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" 
                      : "bg-card text-muted-foreground border-border/50 hover:bg-muted/60"}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 md:px-6 mb-20">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight">
              {activeCategory === "All" ? "Premium Collection" : `${activeCategory} Templates`}
            </h2>
            {activeCategory === "All" && <Trophy className="w-6 h-6 text-yellow-500 hidden md:block" />}
          </div>
          <Link href="/admin/login" className="text-xs md:text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
            Admin Console Access <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="aspect-[4/3] bg-muted/50 animate-pulse rounded-3xl flex items-center justify-center border border-border/50">
                <Loader2 className="w-8 h-8 animate-spin text-primary/20" />
              </div>
            ))}
          </div>
        ) : templates && templates.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {templates.map(template => (
              <Link key={template.id} href={`/generate/${template.id}`}>
                <Card className="group relative overflow-hidden border-border/50 bg-card transition-all duration-300 hover:border-primary/40 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10 rounded-3xl">
                  <div className="aspect-[4/3] relative overflow-hidden bg-muted/20">
                    {template.backgroundImageUrl ? (
                      <Image
                        src={template.backgroundImageUrl}
                        alt={template.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                        priority={template.displayRank && template.displayRank <= 3 ? true : false}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-10 h-10 text-muted-foreground/20" />
                      </div>
                    )}
                    
                    <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 items-end">
                      {template.displayRank && template.displayRank > 0 && template.displayRank <= 10 && (
                        <Badge className="bg-yellow-500 text-black font-bold gap-1 shadow-2xl text-[10px] border-none ring-4 ring-black/20">
                          <Trophy className="w-2.5 h-2.5" /> Top {template.displayRank}
                        </Badge>
                      )}
                      {template.featured && (
                        <Badge className="bg-primary text-white font-bold gap-1 shadow-lg text-[10px] border-none">
                          <Star className="w-2.5 h-2.5 fill-current" /> Featured
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-1">
                      {/* Card title color stays white on hover as requested */}
                      <CardTitle className="text-base md:text-lg font-bold transition-colors truncate mb-1 text-white">
                        {template.title}
                      </CardTitle>
                      <p className="text-[10px] md:text-xs text-muted-foreground line-clamp-1">{template.subtitle}</p>
                    </div>
                    
                    <div className="pt-2">
                      {/* Button text explicitly white */}
                      <div className="w-full py-2.5 rounded-xl bg-primary/10 text-white text-[10px] md:text-xs font-bold text-center flex items-center justify-center gap-2 group-hover:bg-primary transition-all duration-300">
                        Customize Now <ArrowRight className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 md:py-32 bg-muted/5 rounded-[2.5rem] border-2 border-dashed border-border/50 px-6">
            <div className="w-16 h-16 bg-muted/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold mb-2">No templates found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">Try selecting a different category or check back later.</p>
          </div>
        )}
      </section>

      <footer className="py-8 border-t border-border/30 text-center text-[10px] md:text-xs text-muted-foreground px-4 space-y-1">
        <p>&copy; {currentYear ?? '...'} CardSnap Studio - by CPI HTC. All rights reserved.</p>
        <p>
          Product by <a href="https://www.facebook.com/najmul.9341/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline transition-colors font-bold">Najmul H. Talukder</a>
        </p>
      </footer>
    </div>
  );
}
