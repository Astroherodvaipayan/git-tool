"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";
import Image from "next/image";
import { RepoInputForm } from "./components/repo-input-form";
import { RateLimitInfoHome } from "./components/rate-limit-info-home";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-background py-6 shadow-sm">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold">GitHub Repo Analyzer</h1>
          <p className="mt-2 text-muted-foreground">
            Deep analysis and insights for any public GitHub repository
          </p>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto px-4 py-8 relative overflow-hidden">
        {/* Background decoration elements */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl opacity-50 animate-pulse" style={{ animationDuration: '15s' }}></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl opacity-50 animate-pulse" style={{ animationDuration: '25s' }}></div>
        
        <div className="max-w-5xl mx-auto relative">
          <div className="mb-10 text-center animate-fade-in">
            <h2 className="text-2xl font-semibold mb-4">
              Analyze any public GitHub repository
            </h2>
            <p className="text-muted-foreground">
              Enter a GitHub repository URL to get detailed insights, visualizations, and analysis.
              Generate LLM-ingestable files for AI-powered workflows.
            </p>
          </div>

          <RepoInputForm />
          
          {/* Show rate limit information */}
          <div className="mt-6">
            <RateLimitInfoHome />
          </div>

          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard 
              title="Repository Analysis" 
              description="Get detailed metadata, contributor insights, and commit statistics."
              icon="📊"
              color="blue"
            />
            <FeatureCard 
              title="Visual Structure" 
              description="Visualize the repository architecture and codebase structure."
              icon="🔍"
              color="purple"
            />
            <FeatureCard 
              title="System Diagram" 
              description="Interactive mind map showing connections between code modules."
              icon="🧩"
              color="green"
            />
            <FeatureCard 
              title="LLM Preparation" 
              description="Generate LLM-ready files containing repository content for AI analysis."
              icon="🤖"
              color="amber"
            />
          </div>
        </div>
      </main>

      <footer className="border-t py-6 bg-muted/20">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>GitHub Repo Analyzer &copy; {new Date().getFullYear()}</p>
          <p className="mt-1">
            Built with Next.js and shadcn/ui. Uses the GitHub API to analyze public repositories.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ 
  title, 
  description, 
  icon, 
  color 
}: { 
  title: string; 
  description: string; 
  icon: string;
  color: "blue" | "purple" | "green" | "amber";
}) {
  const getGradient = () => {
    switch (color) {
      case "blue":
        return "from-blue-500/10 to-transparent";
      case "purple":
        return "from-purple-500/10 to-transparent";
      case "green":
        return "from-green-500/10 to-transparent";
      case "amber":
        return "from-amber-500/10 to-transparent";
      default:
        return "from-primary/5 to-transparent";
    }
  };
  
  const getHoverBorder = () => {
    switch (color) {
      case "blue":
        return "group-hover:border-blue-500/40";
      case "purple":
        return "group-hover:border-purple-500/40";
      case "green":
        return "group-hover:border-green-500/40";
      case "amber":
        return "group-hover:border-amber-500/40";
      default:
        return "group-hover:border-primary/40";
    }
  };
  
  const getHoverText = () => {
    switch (color) {
      case "blue":
        return "group-hover:text-blue-500";
      case "purple":
        return "group-hover:text-purple-500";
      case "green":
        return "group-hover:text-green-500";
      case "amber":
        return "group-hover:text-amber-500";
      default:
        return "group-hover:text-primary";
    }
  };
  
  const getAccentColor = () => {
    switch (color) {
      case "blue":
        return "bg-blue-500/10";
      case "purple":
        return "bg-purple-500/10";
      case "green":
        return "bg-green-500/10";
      case "amber":
        return "bg-amber-500/10";
      default:
        return "bg-primary/10";
    }
  };

  return (
    <div className={`relative bg-card border rounded-lg p-6 text-center shadow-sm group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${getHoverBorder()} overflow-hidden cursor-pointer`}>
      {/* Subtle gradient background effect */}
      <div className={`absolute inset-0 bg-gradient-to-br ${getGradient()} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      
      {/* Subtle corner accent */}
      <div className={`absolute top-0 right-0 w-16 h-16 -mt-8 -mr-8 rounded-full ${getAccentColor()} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      
      {/* Subtle animated dots in background */}
      <div className="absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-30 transition-opacity duration-500">
        <div className="absolute w-2 h-2 rounded-full bg-current top-1/4 left-1/4 group-hover:animate-pulse" />
        <div className="absolute w-1 h-1 rounded-full bg-current top-3/4 left-1/3 group-hover:animate-ping" style={{ animationDuration: '3s' }} />
        <div className="absolute w-1.5 h-1.5 rounded-full bg-current bottom-1/4 right-1/4 group-hover:animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>
      
      {/* Card content */}
      <div className="relative">
        <div className="text-4xl mb-4 transform group-hover:scale-110 transition-transform duration-300">{icon}</div>
        <h3 className={`text-lg font-medium mb-3 ${getHoverText()} transition-colors duration-300`}>{title}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
        
        {/* Subtle "Learn more" text that appears on hover */}
        <div className="mt-4 overflow-hidden h-6">
          <p className={`${getHoverText()} text-xs font-medium transition-transform duration-300 transform translate-y-6 group-hover:translate-y-0 opacity-0 group-hover:opacity-100`}>
            Learn more →
          </p>
        </div>
      </div>
    </div>
  );
}