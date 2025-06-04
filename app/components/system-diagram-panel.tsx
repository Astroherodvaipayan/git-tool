"use client";

import { useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import { Download, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { FileContent, getRepoContents } from "@/app/lib/github";
import { TokenSetup } from "@/app/components/token-setup";
import { saveAs } from "file-saver";

interface SystemDiagramPanelProps {
  owner: string;
  repo: string;
}

// File types to categorize
const FILE_CATEGORIES: Record<string, { name: string, color: string }> = {
  component: { name: "UI Components", color: "#3b82f6" },
  page: { name: "Pages", color: "#8b5cf6" },
  util: { name: "Utilities", color: "#10b981" },
  api: { name: "API", color: "#f59e0b" },
  model: { name: "Models/Types", color: "#ec4899" },
  config: { name: "Config", color: "#6b7280" },
  test: { name: "Tests", color: "#ef4444" },
  doc: { name: "Documentation", color: "#14b8a6" },
  asset: { name: "Assets", color: "#f97316" },
};

export function SystemDiagramPanel({ owner, repo }: SystemDiagramPanelProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<FileContent[]>([]);
  const [isRetrying, setIsRetrying] = useState(false);
  const diagramRef = useRef<HTMLDivElement>(null);

  const fetchRepoStructure = async (showRetryState = false) => {
    try {
      if (showRetryState) {
        setIsRetrying(true);
      } else {
        setLoading(true);
      }
      
      const contents = await getRepoContents(owner, repo);
      setFiles(contents);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : "Failed to load repository structure. GitHub API may be unavailable or rate limited.";
      setError(errorMessage);
      console.error(err);
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  };

  useEffect(() => {
    fetchRepoStructure();
  }, [owner, repo]);

  useEffect(() => {
    if (diagramRef.current && files.length > 0 && !loading) {
      createSystemDiagram(diagramRef.current, files);
    }

    return () => {
      if (diagramRef.current) {
        d3.select(diagramRef.current).selectAll("*").remove();
      }
    };
  }, [files, loading]);

  const exportDiagram = () => {
    if (!diagramRef.current) return;
    
    const svg = diagramRef.current.querySelector("svg");
    if (!svg) return;
    
    // Convert SVG to string
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svg);
    
    // Add XML declaration
    source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
    
    // Convert SVG string to Blob
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    
    // Download using FileSaver.js
    saveAs(blob, `${owner}-${repo}-system-diagram.svg`);
  };

  const handleRetry = () => {
    fetchRepoStructure(true);
  };

  // Check if this is a rate limit error
  const isRateLimitError = error?.includes("rate limit") || error?.includes("rate limited");

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>System Architecture Diagram</CardTitle>
            <CardDescription>
              Visualize how different parts of the repository are connected
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportDiagram}
            disabled={files.length === 0 || loading || error !== null}
          >
            <Download size={16} className="mr-1" /> Export SVG
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && !isRetrying && (
          <div className="flex justify-center items-center h-96">
            <p>Generating system diagram...</p>
          </div>
        )}

        {isRetrying && (
          <div className="flex justify-center items-center h-96">
            <div className="flex flex-col items-center">
              <RefreshCw size={24} className="mb-2 animate-spin" />
              <p>Retrying...</p>
            </div>
          </div>
        )}

        {error && (
          <div>
            <div className="bg-destructive/10 p-6 rounded-md text-destructive mb-4">
              <h3 className="text-lg font-medium mb-2">Error Generating Diagram</h3>
              <p className="mb-4">{error}</p>
              <p className="text-sm text-muted-foreground">
                This could be due to GitHub API rate limits or the repository being too large to process.
              </p>
              
              <div className="mt-4 flex">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRetry} 
                  disabled={isRetrying}
                  className="mr-2"
                >
                  <RefreshCw size={16} className={`mr-1 ${isRetrying ? 'animate-spin' : ''}`} />
                  {isRetrying ? 'Retrying...' : 'Retry'}
                </Button>
              </div>
            </div>
            
            {isRateLimitError && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-2">Add a GitHub Token to Continue</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Adding a GitHub Personal Access Token will increase your rate limit from 60 to 5,000 requests per hour,
                  allowing you to view this diagram and other features.
                </p>
                <TokenSetup />
              </div>
            )}
          </div>
        )}

        {!loading && !error && files.length === 0 && (
          <div className="flex flex-col items-center justify-center h-96 text-muted-foreground text-center">
            <p className="mb-2">No repository structure data available</p>
            <p className="text-sm">GitHub API may have rate limited this request or the repository is empty.</p>
          </div>
        )}

        {!loading && !error && files.length > 0 && (
          <div className="border rounded-md p-4 h-[600px] overflow-auto">
            <div ref={diagramRef} className="w-full h-full" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper functions

// Categorize files based on path and name patterns
function categorizeFile(file: FileContent): string {
  const path = file.path.toLowerCase();
  const name = file.name.toLowerCase();
  
  if (file.type === "dir") {
    if (path.includes("component") || path.includes("ui")) return "component";
    if (path.includes("page") || path.includes("view") || path.includes("screen")) return "page";
    if (path.includes("util") || path.includes("helper") || path.includes("lib")) return "util";
    if (path.includes("api") || path.includes("service") || path.includes("client")) return "api";
    if (path.includes("model") || path.includes("type") || path.includes("interface") || path.includes("schema")) return "model";
    if (path.includes("config") || path.includes("setting")) return "config";
    if (path.includes("test") || path.includes("spec") || path.includes("__test__")) return "test";
    if (path.includes("doc") || path.includes("readme") || path.includes("wiki")) return "doc";
    if (path.includes("asset") || path.includes("image") || path.includes("static") || path.includes("public")) return "asset";
    return "util"; // Default for directories
  }
  
  // File categorization
  const extension = name.split('.').pop() || "";
  
  if (extension === "md" || extension === "txt" || extension === "pdf") return "doc";
  if (["jpg", "png", "svg", "gif", "ico", "webp"].includes(extension)) return "asset";
  if (["test.js", "test.ts", "spec.js", "spec.ts"].some(ext => name.includes(ext)) || path.includes("test")) return "test";
  if (extension === "json" && (name === "package.json" || name === "tsconfig.json")) return "config";
  if (["js", "ts", "jsx", "tsx"].includes(extension)) {
    if (path.includes("component") || name.includes("component")) return "component";
    if (path.includes("page") || path.includes("pages")) return "page";
    if (path.includes("api") || name.includes("api") || name.includes("service")) return "api";
    if (path.includes("util") || name.includes("util") || name.includes("helper")) return "util";
    if (path.includes("model") || name.includes("model") || name.includes("type")) return "model";
  }
  
  return "util"; // Default
}

// Build a graph structure from the files
function buildDependencyGraph(files: FileContent[]): {
  nodes: Array<{id: string, name: string, category: string, size: number}>,
  links: Array<{source: string, target: string, value: number}>
} {
  // Flatten the file structure
  const flatFiles = flattenFileStructure(files);
  
  // Create nodes for each category
  const categoryNodes = Object.keys(FILE_CATEGORIES).map(category => ({
    id: `category-${category}`,
    name: FILE_CATEGORIES[category].name,
    category,
    size: 40
  }));
  
  // Group files by category
  const filesByCategory: Record<string, FileContent[]> = {};
  flatFiles.forEach(file => {
    const category = categorizeFile(file);
    if (!filesByCategory[category]) {
      filesByCategory[category] = [];
    }
    filesByCategory[category].push(file);
  });
  
  // Create nodes for important files/directories
  const fileNodes = flatFiles
    .filter(file => {
      // Only include significant files/directories
      if (file.type === "dir") {
        return file.path.split("/").length <= 2; // Only top-level and immediate subdirectories
      }
      // Include key files like package.json, readme, etc.
      const name = file.name.toLowerCase();
      return name === "package.json" || 
             name === "readme.md" || 
             name.includes("config") ||
             name === "index.js" ||
             name === "index.ts";
    })
    .map(file => ({
      id: `file-${file.path}`,
      name: file.name,
      category: categorizeFile(file),
      size: file.type === "dir" ? 25 : 15
    }));
  
  // Create links between nodes
  const links: Array<{source: string, target: string, value: number}> = [];
  
  // Connect files to their categories
  fileNodes.forEach(file => {
    links.push({
      source: `category-${file.category}`,
      target: file.id,
      value: 2
    });
  });
  
  // Connect related categories
  const categoryRelations = [
    { source: "component", target: "page", value: 5 },
    { source: "api", target: "model", value: 4 },
    { source: "util", target: "component", value: 3 },
    { source: "util", target: "api", value: 3 },
    { source: "config", target: "api", value: 2 },
    { source: "page", target: "api", value: 4 },
    { source: "model", target: "component", value: 3 },
    { source: "test", target: "component", value: 2 },
    { source: "test", target: "api", value: 2 },
    { source: "doc", target: "config", value: 1 },
    { source: "asset", target: "component", value: 3 }
  ];
  
  categoryRelations.forEach(relation => {
    // Only add relation if both categories have files
    if (filesByCategory[relation.source] && filesByCategory[relation.source].length > 0 &&
        filesByCategory[relation.target] && filesByCategory[relation.target].length > 0) {
      links.push({
        source: `category-${relation.source}`,
        target: `category-${relation.target}`,
        value: relation.value
      });
    }
  });
  
  // Connect related files based on probable dependencies
  // This is a simple heuristic - in a real app, we'd analyze imports
  fileNodes
    .filter(file => file.category === "component")
    .forEach(component => {
      fileNodes
        .filter(file => file.category === "util" || file.category === "model")
        .forEach(util => {
          links.push({
            source: component.id,
            target: util.id,
            value: 1
          });
        });
    });
  
  return {
    nodes: [...categoryNodes, ...fileNodes],
    links
  };
}

function flattenFileStructure(files: FileContent[]): FileContent[] {
  let result: FileContent[] = [];
  
  for (const file of files) {
    result.push(file);
    
    if (file.type === "dir" && file.children && Array.isArray(file.children)) {
      result = result.concat(flattenFileStructure(file.children));
    }
  }
  
  return result;
}

function createSystemDiagram(element: HTMLElement, files: FileContent[]) {
  // Clear previous visualization
  d3.select(element).selectAll("*").remove();
  
  const width = element.clientWidth;
  const height = element.clientHeight;
  
  // Build the graph data
  const graph = buildDependencyGraph(files);
  
  // Create SVG
  const svg = d3.select(element)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .append("g")
    .attr("transform", `translate(${width / 2},${height / 2})`);
  
  // Create force simulation
  const simulation = d3.forceSimulation(graph.nodes as any)
    .force("link", d3.forceLink(graph.links as any)
      .id((d: any) => d.id)
      .distance((d: any) => 100 / (d.value || 1))
      .strength((d: any) => 0.1 * (d.value || 1))
    )
    .force("charge", d3.forceManyBody().strength(-500))
    .force("center", d3.forceCenter(0, 0))
    .force("collide", d3.forceCollide().radius((d: any) => d.size + 10).strength(0.5));
  
  // Create links
  const link = svg.append("g")
    .attr("stroke", "#999")
    .attr("stroke-opacity", 0.6)
    .selectAll("line")
    .data(graph.links)
    .join("line")
    .attr("stroke-width", (d: any) => Math.sqrt(d.value));
  
  // Create nodes
  const node = svg.append("g")
    .selectAll(".node")
    .data(graph.nodes)
    .join("g")
    .attr("class", "node")
    .call((d3 as any).drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended)
    );
  
  // Add circles to nodes
  node.append("circle")
    .attr("r", (d: any) => d.size)
    .attr("fill", (d: any) => {
      if (d.id.startsWith("category-")) {
        return FILE_CATEGORIES[d.category].color;
      }
      return FILE_CATEGORIES[d.category]?.color || "#999";
    })
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.5);
  
  // Add labels to nodes
  node.append("text")
    .attr("dy", (d: any) => d.id.startsWith("category-") ? -d.size - 5 : 4)
    .attr("text-anchor", "middle")
    .attr("font-size", (d: any) => d.id.startsWith("category-") ? "14px" : "10px")
    .attr("font-weight", (d: any) => d.id.startsWith("category-") ? "bold" : "normal")
    .text((d: any) => d.name)
    .attr("fill", "currentColor")
    .attr("pointer-events", "none");
  
  // Add tooltips for nodes
  node.append("title")
    .text((d: any) => d.id.startsWith("category-") 
      ? `${d.name}: ${countFilesByCategory(files, d.category)} files`
      : d.name
    );
  
  // Run simulation
  simulation.on("tick", () => {
    link
      .attr("x1", (d: any) => d.source.x)
      .attr("y1", (d: any) => d.source.y)
      .attr("x2", (d: any) => d.target.x)
      .attr("y2", (d: any) => d.target.y);
    
    node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
  });
  
  // Drag functions
  function dragstarted(event: any, d: any) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }
  
  function dragged(event: any, d: any) {
    d.fx = event.x;
    d.fy = event.y;
  }
  
  function dragended(event: any, d: any) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
}

function countFilesByCategory(files: FileContent[], category: string): number {
  const flatFiles = flattenFileStructure(files);
  return flatFiles.filter(file => categorizeFile(file) === category).length;
} 