
"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { collection, query, where } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    let q = query(collection(db, "templates"), where("status", "==", "published"));
    if (activeCategory !== "All") {
      q = query(q, where("category", "==", activeCategory.toLowerCase()));
    }
    return q;
  }, [db, activeCategory]);

  const { data: rawTemplates, loading } = useCollection<Template>(templatesQuery);

  // Sorting logic for Top 10 + Latest
  const templates = useMemo(() => {
    if (!rawTemplates) return [];
    return [...rawTemplates].sort((a, b) => {
      const rankA = a.displayRank || 999;
      const rankB = b.displayRank || 999;
      
      if (rankA !== rankB) return rankA - rankB;
      
      // Secondary sort by date if rank is same
      const dateA = a.updatedAt?.seconds || 0;
      const dateB = b.updatedAt?.seconds || 0;
      return dateB - dateA;
    });
  }, [rawTemplates]);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <header className="relative py-12 md:py-24 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] md:w-[1200px] h-[300px] md:h-[600px] bg-primary/20 blur-[60px] md:blur-[120px] rounded-full -z-10" />
        <div className="container mx-auto px-4 text-center">
          <Badge variant="outline" className="mb-6 border-primary/50 text-primary py-1 px-4 gap-2 animate-pulse text-[10px] md:text-sm">
            <Sparkles className="w-3 h-3 md:w-4 md:h-4" /> Professional Photocards
          </Badge>
          <h1 className="text-3xl md:text-5xl lg:text-7xl font-bold mb-6 tracking-tight leading-tight px-2">
            Design Your <span className="text-primary italic">Signature</span> Card
          </h1>
          <p className="text-xs md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 px-6">
            Create high-quality 4K photocards in seconds. Optimized for speed and quality.
          </p>

          <div className="w-full flex justify-center px-4">
            <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`rounded-full px-4 md:px-8 py-2 md:py-2.5 border transition-all text-[10px] md:text-sm font-medium
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

      <section className="container mx-auto px-4 md:px-6 mb-16">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xl md:text-3xl font-bold tracking-tight">
              {activeCategory === "All" ? "Premium Collection" : `${activeCategory} Templates`}
            </h2>
            {activeCategory === "All" && <Trophy className="w-5 h-5 text-yellow-500 hidden md:block" />}
          </div>
          <Link href="/admin/login" className="text-[10px] md:text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
            Admin Console Access <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="aspect-[4/3] bg-muted/50 animate-pulse rounded-2xl flex items-center justify-center border border-border/50">
                <Loader2 className="w-8 h-8 animate-spin text-primary/20" />
              </div>
            ))}
          </div>
        ) : templates && templates.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {templates.map(template => (
              <Link key={template.id} href={`/generate/${template.id}`}>
                <Card className="group relative overflow-hidden border-border/50 bg-card transition-all duration-300 hover:border-primary/40 hover:scale-[1.03] hover:shadow-2xl hover:shadow-primary/20 rounded-2xl">
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
                    <div className="absolute top-3 right-3 z-10 flex flex-col gap-2 items-end">
                      {template.displayRank && template.displayRank > 0 && template.displayRank <= 10 && (
                        <Badge className="bg-yellow-500 text-black font-bold gap-1 shadow-xl text-[10px] border-none ring-2 ring-black/5">
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
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-start justify-between mb-1 gap-2">
                      <CardTitle className="text-base md:text-xl font-bold group-hover:text-primary transition-colors truncate">
                        {template.title}
                      </CardTitle>
                      {template.category && (
                        <Badge variant="secondary" className="capitalize text-[8px] md:text-[10px] py-0 px-2 shrink-0 border-border/50">
                          {template.category}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] md:text-sm text-muted-foreground line-clamp-1">{template.subtitle}</p>
                    <div className="mt-3 md:mt-4 flex items-center gap-2 text-primary font-bold text-[10px] md:text-sm">
                      Customize template <ArrowRight className="w-3 h-3 md:w-4 md:h-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 md:py-24 bg-muted/10 rounded-2xl md:rounded-[2rem] border-2 border-dashed border-border/50 px-6">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-muted/20 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground/30" />
            </div>
            <h3 className="text-lg md:text-xl font-bold mb-2">No templates available</h3>
            <p className="text-xs md:text-sm text-muted-foreground max-w-sm mx-auto">We couldn't find any published templates in the {activeCategory} category.</p>
          </div>
        )}
      </section>

      <footer className="py-8 border-t border-border/30 text-center text-[10px] md:text-sm text-muted-foreground px-4 space-y-1">
        <p>&copy; {currentYear ?? '...'} CardSnap Studio. Engineered for high-quality professional photocards.</p>
        <p>
          Product by <a href="https://www.facebook.com/najmul.9341/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline transition-colors font-medium">Najmul H. Talukder</a>
        </p>
      </footer>
    </div>
  );
}
