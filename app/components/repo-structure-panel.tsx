"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Button } from "@/app/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Badge } from "@/app/components/ui/badge";
import { FileIcon, FolderIcon, RefreshCw, FolderOpen, GitBranch, Radio, Pause, Play } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { AlertCircle } from "lucide-react";
import * as d3 from "d3";
import { getRepoContents } from "@/app/lib/github-client";
import { FileEntry, RepoTree } from "@/app/lib/github";

interface StreamingMetrics {
  lastUpdate: Date;
  updateCount: number;
  filesChanged: number;
  isLive: boolean;
}

export function RepoStructurePanel({ owner, repo }: { owner: string; repo: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<RepoTree | null>(null);
  const [selectedContent, setSelectedContent] = useState<{
    path: string;
    content: string;
    language: string | null;
    size: number;
  } | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [visData, setVisData] = useState<any>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>("main");
  const [branches, setBranches] = useState<string[]>(["main"]);
  const [streamingMetrics, setStreamingMetrics] = useState({
    lastUpdate: new Date(),
    updateCount: 0,
    filesChanged: 0,
    isLive: false
  });
  const [isStreaming, setIsStreaming] = useState(true);
  const [dataChanges, setDataChanges] = useState<Set<string>>(new Set());
  
  const svgRef = useRef<SVGSVGElement>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousTreeRef = useRef<string>("");
  
  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  // Fetch available branches
  const fetchBranches = useCallback(async () => {
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches`);
      if (response.ok) {
        const branchData = await response.json();
        const branchNames = branchData.map((branch: any) => branch.name);
        setBranches(branchNames);
        if (!branchNames.includes(selectedBranch)) {
          setSelectedBranch(branchNames[0] || "main");
        }
      }
    } catch (error) {
      console.warn("Could not fetch branches:", error);
    }
  }, [owner, repo, selectedBranch]);

  // Helper function to compare trees and detect changes
  const detectChanges = (newTree: RepoTree, oldTreeJson: string): Set<string> => {
    const changes = new Set<string>();
    const newTreeJson = JSON.stringify(newTree);
    
    if (oldTreeJson !== newTreeJson) {
      const extractPaths = (tree: any, currentPath = ""): string[] => {
        const paths: string[] = [];
        if (tree.contents) {
          Object.entries(tree.contents).forEach(([key, value]: [string, any]) => {
            const fullPath = currentPath ? `${currentPath}/${key}` : key;
            paths.push(fullPath);
            if (value.contents) {
              paths.push(...extractPaths(value, fullPath));
            }
          });
        }
        return paths;
      };

      const newPaths = extractPaths(newTree);
      newPaths.slice(0, 5).forEach(path => changes.add(path));
    }
    
    return changes;
  };

  // Helper function to recursively build complete file tree
  const buildCompleteFileTree = async (owner: string, repo: string, branch: string = "main", path: string = "", depth: number = 0): Promise<RepoTree> => {
    if (depth > 3) {
      return {
        type: "folder",
        path,
        contents: {}
      };
    }

    const files = await getRepoContents(owner, repo, path);
    
    const tree: RepoTree = {
      type: "folder",
      path,
      contents: {}
    };

    for (const file of files) {
      if (file.type === "dir") {
        const subdirectory = await buildCompleteFileTree(owner, repo, branch, file.path, depth + 1);
        tree.contents[file.name] = {
          type: "folder",
          path: file.path,
          contents: subdirectory.contents
        };
      } else {
        tree.contents[file.name] = {
          name: file.name,
          path: file.path,
          type: "file",
          size: file.size
        };
      }
    }

    return tree;
  };

  const fetchRepoStructure = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError(null);
    
    try {
      const tree = await buildCompleteFileTree(owner, repo, selectedBranch);
      const currentTreeJson = JSON.stringify(tree);
      
      const changes = detectChanges(tree, previousTreeRef.current);
      setDataChanges(changes);
      
      if (changes.size > 0) {
        setTimeout(() => setDataChanges(new Set()), 3000);
      }
      
      setFileTree(tree);
      previousTreeRef.current = currentTreeJson;
      
      setStreamingMetrics(prev => ({
        lastUpdate: new Date(),
        updateCount: prev.updateCount + 1,
        filesChanged: changes.size,
        isLive: isStreaming
      }));
      
      const rootNode = prepareVisualizationData(tree);
      setVisData(rootNode);
    } catch (error) {
      console.error("Error fetching repo structure:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch repository structure");
      setStreamingMetrics(prev => ({ ...prev, isLive: false }));
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [owner, repo, selectedBranch, isStreaming]);

  const toggleStreaming = () => {
    setIsStreaming(prev => !prev);
  };

  useEffect(() => {
    if (isStreaming) {
      fetchRepoStructure();
      updateIntervalRef.current = setInterval(() => {
        fetchRepoStructure(false);
      }, 15000);
    } else {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    }

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [isStreaming, fetchRepoStructure]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    if (selectedBranch) {
      fetchRepoStructure();
    }
  }, [selectedBranch, fetchRepoStructure]);

  const prepareVisualizationData = (tree: RepoTree) => {
    const rootNode = {
      name: repo,
      children: [],
      value: 0,
      path: "",
      type: "folder"
    };
    
    const buildVisTree = (node: any, treeData: any) => {
      if (node.contents) {
        Object.keys(node.contents).forEach(key => {
          const child = node.contents[key];
          const childNode = {
            name: key,
            children: [],
            value: child.type === "file" ? (child.size || 1) : 0,
            path: child.path,
            type: child.type
          };
          
          if (child.type === "folder" && child.contents) {
            buildVisTree(child, childNode);
          }
          
          treeData.children.push(childNode);
        });
      }
    };
    
    buildVisTree(tree, rootNode);
    return rootNode;
  };

  const renderVisualization = (data: any) => {
    if (!svgRef.current || !data) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    
    const width = svgRef.current.clientWidth;
    const height = 600;
    
    const color = d3.scaleOrdinal([
      "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", 
      "#06b6d4", "#f97316", "#84cc16", "#ec4899", "#6b7280"
    ]);
    
    const pack = d3.pack()
      .size([width - 4, height - 4])
      .padding(4);
    
    const root = d3.hierarchy(data)
      .sum(d => (d as any).value || 1)
      .sort((a, b) => (b.value || 0) - (a.value || 0));
    
    pack(root);
    
    const g = svg.append("g");
    
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    
    svg.call(zoom);
    
    const node = g.selectAll("g")
      .data(root.descendants())
      .enter().append("g")
      .attr("transform", (d: any) => `translate(${d.x},${d.y})`)
      .style("cursor", "pointer");
    
    node.append("circle")
      .attr("r", 0)
      .style("fill", (d: any) => {
        if (!d.children) {
          const path = (d.data as any).path || "";
          const ext = path.split('.').pop() || "default";
          return color(ext);
        }
        return "rgba(99, 102, 241, 0.1)";
      })
      .style("fill-opacity", (d: any) => d.children ? 0.3 : 0.8)
      .style("stroke", (d: any) => d.children ? "#6366f1" : "#374151")
      .style("stroke-width", (d: any) => d.children ? 2 : 1)
      .transition()
      .duration(1000)
      .attr("r", (d: any) => d.r)
      .on("end", function(d: any) {
        if (dataChanges.has((d.data as any).path)) {
          d3.select(this)
            .transition()
            .duration(500)
            .style("stroke", "#ff4444")
            .style("stroke-width", 3)
            .transition()
            .duration(500)
            .style("stroke", (d: any) => d.children ? "#6366f1" : "#374151")
            .style("stroke-width", (d: any) => d.children ? 2 : 1);
        }
      });
    
    node.on("click", (event, d: any) => {
      if (!(d as any).children && (d.data as any).type === "file") {
        handleNodeClick({
          path: (d.data as any).path,
          type: "file",
          size: (d.data as any).value || 0
        });
      }
    });
    
    node.filter((d: any) => d.r > 15)
      .append("text")
      .attr("dy", "0.3em")
      .style("text-anchor", "middle")
      .style("font-size", (d: any) => Math.min(2 * d.r / 3, 14) + "px")
      .style("font-weight", (d: any) => d.children ? "600" : "400")
      .style("fill", (d: any) => d.children ? "#1f2937" : "#ffffff")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .transition()
      .delay(500)
      .duration(500)
      .style("opacity", 1)
      .text((d: any) => {
        const name = (d.data as any).name;
        const maxLength = Math.floor(d.r / 4);
        return name.length > maxLength ? name.substring(0, maxLength) + "..." : name;
      });
  };

  useEffect(() => {
    if (visData && svgRef.current) {
      setTimeout(() => renderVisualization(visData), 100);
    }
  }, [visData, dataChanges]);
  
  const handleNodeClick = (node: any) => {
    if (node.type === "file") {
      setSelectedContent({
        path: node.path,
        content: "Loading content...",
        language: getLanguageFromPath(node.path),
        size: node.size || 0
      });
      if (node.size < 500000) {
        import("@/app/lib/github-client").then(({ getFileContent }) => {
          getFileContent(owner, repo, node.path)
            .then(content => {
              setSelectedContent(prev => ({
                ...prev!,
                content: content || "No content available"
              }));
            })
            .catch(error => {
              setSelectedContent(prev => ({
                ...prev!,
                content: `Error loading content: ${error instanceof Error ? error.message : "Unknown error"}`
              }));
            });
        });
      } else {
        setSelectedContent(prev => ({
          ...prev!,
          content: `File is too large to display (${formatBytes(node.size)})`
        }));
      }
    }
  };

  const getLanguageFromPath = (path: string) => {
    const extension = path.split('.').pop()?.toLowerCase();
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'rb': 'ruby',
      'java': 'java',
      'go': 'go',
      'rs': 'rust',
      'php': 'php',
      'cs': 'csharp',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'json': 'json',
      'md': 'markdown',
      'yml': 'yaml',
      'yaml': 'yaml',
      'xml': 'xml',
      'sh': 'shell',
      'bash': 'shell',
      'c': 'c',
      'cpp': 'cpp',
      'h': 'c',
      'hpp': 'cpp',
      'sql': 'sql'
    };
    
    return extension ? languageMap[extension] || null : null;
  };
  
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const renderNode = (node: any, key: string, path: string, depth = 0) => {
    const isFolder = node.type === "folder" || (node.contents !== undefined);
    const fullPath = path ? `${path}/${key}` : key;
    const expanded = expandedFolders.has(fullPath) || depth < 2;
    const hasChanges = dataChanges.has(fullPath);
    
    return (
      <div key={fullPath} className="select-none">
        <div
          style={{ 
            marginLeft: depth * 20,
            paddingLeft: 8,
            paddingRight: 8,
            paddingTop: 4,
            paddingBottom: 4
          }}
          className={`flex items-center cursor-pointer hover:bg-accent/60 rounded-md transition-all duration-300 ${
            isFolder ? "font-medium text-foreground" : "text-muted-foreground"
          } ${hasChanges ? "bg-blue-50 border-l-2 border-blue-500 animate-pulse" : ""}`}
          onClick={() => {
            if (isFolder) {
              toggleFolder(fullPath);
            } else {
              handleNodeClick({
                path: node.path || fullPath,
                type: "file",
                size: node.size || 0
              });
            }
          }}
        >
          <div className="flex items-center min-w-0 flex-1">
            {isFolder ? (
              expanded ? (
                <FolderOpen className="w-4 h-4 mr-2 text-blue-500 flex-shrink-0" />
              ) : (
                <FolderIcon className="w-4 h-4 mr-2 text-blue-600 flex-shrink-0" />
              )
            ) : (
              <FileIcon className="w-4 h-4 mr-2 text-gray-500 flex-shrink-0" />
            )}
            <span className="truncate">{key}</span>
            {hasChanges && (
              <Badge variant="secondary" className="ml-2 text-xs animate-bounce">
                Updated
              </Badge>
            )}
            {!isFolder && node.size && (
              <span className="ml-2 text-xs text-muted-foreground flex-shrink-0">
                ({formatBytes(node.size)})
              </span>
            )}
          </div>
        </div>
        {isFolder && expanded && node.contents && (
          <div className="ml-2 transition-all duration-300">
            {Object.entries(node.contents).map(([childKey, childNode]) =>
              renderNode(childNode, childKey, fullPath, depth + 1)
            )}
          </div>
        )}
      </div>
    );
  };
  
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Repository Structure</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[400px] w-full" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[400px] w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Repository Structure</h2>
          <Button onClick={() => fetchRepoStructure()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Real-time Repository Structure
              {streamingMetrics.isLive && (
                <Badge variant="default" className="flex items-center gap-1">
                  <Radio className="w-3 h-3 animate-pulse" />
                  LIVE
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Streaming visualization of <span className="font-semibold">{repo}</span> repository structure
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-32">
                <GitBranch className="w-4 h-4 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {branches.map(branch => (
                  <SelectItem key={branch} value={branch}>
                    {branch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              variant={isStreaming ? "default" : "outline"}
              size="sm"
              onClick={toggleStreaming}
            >
              {isStreaming ? (
                <>
                  <Pause className="w-4 h-4 mr-1" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-1" />
                  Resume
                </>
              )}
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Last update: {streamingMetrics.lastUpdate.toLocaleTimeString()}</span>
          <span>Updates: {streamingMetrics.updateCount}</span>
          <span>Changes: {streamingMetrics.filesChanged}</span>
        </div>
      </CardHeader>
      <CardContent>
        {fileTree ? (
          <Tabs defaultValue="tree" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="tree" className="text-sm font-medium">
                🌳 Live Tree View
              </TabsTrigger>
              <TabsTrigger value="visualization" className="text-sm font-medium">
                ⭕ Streaming Visualization
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="tree" className="mt-0">
              <div className="flex flex-col lg:flex-row gap-6 h-[700px]">
                <div className="w-full lg:w-1/2">
                  <Card className="h-full">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        Live File Tree
                        {isStreaming && (
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        )}
                      </CardTitle>
                      <CardDescription>Real-time repository structure updates</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ScrollArea className="h-[580px] border-t">
                        <div className="p-4">
                          {renderNode(
                            { ...fileTree, name: repo },
                            repo,
                            "",
                            0
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
                <div className="w-full lg:w-1/2">
                  {selectedContent ? (
                    <Card className="h-full">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg truncate">{selectedContent.path}</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          {selectedContent.language && (
                            <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs">
                              {selectedContent.language}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatBytes(selectedContent.size)}
                          </span>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <ScrollArea className="h-[580px] border-t">
                          <pre className="p-4 text-xs font-mono bg-muted/20 whitespace-pre-wrap overflow-x-auto">
                            {selectedContent.content}
                          </pre>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="h-full flex items-center justify-center">
                      <CardContent className="text-center">
                        <FileIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Select a file to view its contents</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="visualization" className="mt-0">
              <Card className="h-[700px]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    Streaming Circle Visualization
                    {isStreaming && (
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Real-time animated visualization showing file sizes and changes. Click files to view content.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="border-t bg-gradient-to-br from-muted/20 to-muted/40 h-[580px] relative overflow-hidden">
                    <svg ref={svgRef} width="100%" height="100%" className="absolute inset-0" />
                  </div>
                  {selectedContent && (
                    <div className="border-t p-4 bg-muted/30">
                      <div className="flex items-start gap-3">
                        <FileIcon className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium truncate">{selectedContent.path}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            {selectedContent.language && (
                              <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs">
                                {selectedContent.language}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatBytes(selectedContent.size)}
                            </span>
                          </div>
                          <ScrollArea className="mt-3 h-32">
                            <pre className="text-xs font-mono bg-background/80 p-2 rounded border whitespace-pre-wrap">
                              {selectedContent.content}
                            </pre>
                          </ScrollArea>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : null}
      </CardContent>
    </Card>
  );
} 