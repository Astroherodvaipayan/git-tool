"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Progress } from "@/app/components/ui/progress";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Label } from "@/app/components/ui/label";
import { Info, Copy, FileText, Download, AlertCircle, FileJson, RefreshCw, CheckCircle } from "lucide-react";
import { jsPDF } from "jspdf";
// Import from the new GitHub client instead
import { 
  getRepoDetails, 
  getRepoContents, 
  getFileContent, 
  buildFileTree 
} from "@/app/lib/github-client";
import { RepoDetails } from "@/app/lib/github";

export function LLMExportPanel({ owner, repo }: { owner: string; repo: string }) {
  const [repoDetails, setRepoDetails] = useState<RepoDetails | null>(null);
  const [repoContent, setRepoContent] = useState<string>("");
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [exportTab, setExportTab] = useState<string>("text");
  const [maxExportFiles, setMaxExportFiles] = useState<number>(1000); // Increased to a very high number
  const [showDotFiles, setShowDotFiles] = useState<boolean>(true); // Default to true
  const [maxDirectoryDepth, setMaxDirectoryDepth] = useState<number>(100); // Very high depth by default
  const [includeAllFiles, setIncludeAllFiles] = useState<boolean>(true); // Include all files by default
  const [includeFileTypes, setIncludeFileTypes] = useState<{[key: string]: boolean}>({
    'js': true, 'jsx': true, 'ts': true, 'tsx': true, 
    'py': true, 'java': true, 'go': true, 'rb': true, 'php': true,
    'html': true, 'css': true, 'scss': true, 'json': true, 'md': true,
    'c': true, 'cpp': true, 'cs': true, 'rs': true, 'swift': true,
    'sh': true, 'yaml': true, 'yml': true, 'toml': true, 'xml': true,
    'sql': true, 'graphql': true, 'proto': true, 'kt': true, 'gradle': true,
    'dart': true, 'lua': true, 'r': true, 'pl': true, 'ex': true, 'exs': true
  });
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const [exportStats, setExportStats] = useState<{
    filesFound: number;
    filesIncluded: number;
    totalBytes: number;
  }>({ filesFound: 0, filesIncluded: 0, totalBytes: 0 });
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  
  // Prepare content for export
  const prepareContent = async () => {
    try {
      setIsGenerating(true);
      setExportProgress(0);
      setError(null);
      setRepoContent("");
      
      // Get repo details
      const details = await getRepoDetails(owner, repo);
      setRepoDetails(details);
      
      let content = `# Repository: ${details.fullName}\n\n`;
      content += `${details.description ? details.description + '\n\n' : ''}`;
      content += `Primary Language: ${details.primaryLanguage || 'Not specified'}\n`;
      content += `License: ${details.license || 'Not specified'}\n\n`;
      
      // Get repo structure with increased depth
      const fileTree = await buildFileTree(owner, repo);
      content += `## Repository Structure\n\n`;
      content += generateStructureString(fileTree, "", 0, maxDirectoryDepth);
      content += `\n\n`;
      
      // Get all files recursively with improved depth handling
      const allFiles = await getFilesRecursively(owner, repo);
      setExportProgress(10);
      setExportStats(prev => ({ ...prev, filesFound: allFiles.length }));
      
      // Filter files by extension and settings
      const filteredFiles = allFiles.filter(file => {
        if (file.type !== "file") return false;
        
        // Skip license files
        if (isLicenseFile(file.name, file.path)) return false;
        
        // Skip binary files and very large files (unless includeAllFiles is true)
        if (!includeAllFiles && (isBinaryFile(file.name) || file.size > 5000000)) return false;
        
        // Apply dot files filter if needed
        if (!showDotFiles && file.name.startsWith(".")) return false;
        
        // If includeAllFiles is true, include all files except binaries
        if (includeAllFiles && !isBinaryFile(file.name)) return true;
        
        // Check file extension
        const extension = file.name.split('.').pop()?.toLowerCase() || "";
        return includeFileTypes[extension] || isCodeFile(file.name, file.path);
      }).slice(0, maxExportFiles); // This will effectively include all files since maxExportFiles is very high
      
      setExportStats(prev => ({ ...prev, filesIncluded: filteredFiles.length }));
      
      // Add file contents - process in batches to avoid memory issues
      content += `## File Contents\n\n`;
      
      const batchSize = 10;
      let totalBytes = 0;
      
      for (let i = 0; i < filteredFiles.length; i += batchSize) {
        const batch = filteredFiles.slice(i, i + batchSize);
        
        try {
          const batchResults = await Promise.all(
            batch.map(async file => {
              try {
                const fileContent = await getFileContent(owner, repo, file.path);
                totalBytes += fileContent.length;
                return {
                  path: file.path,
                  content: fileContent
                };
              } catch (error) {
                console.error(`Error fetching content for ${file.path}:`, error);
                return {
                  path: file.path,
                  content: "// Error fetching file content"
                };
              }
            })
          );
          
          for (const result of batchResults) {
            content += `### File: ${result.path}\n\n\`\`\`\n${result.content}\n\`\`\`\n\n`;
          }
          
          // Update progress
          const progress = Math.min(10 + Math.round(90 * (i + batch.length) / filteredFiles.length), 100);
          setExportProgress(progress);
          
        } catch (error) {
          console.error("Error processing batch:", error);
          // Continue with next batch
        }
      }
      
      setExportStats(prev => ({ ...prev, totalBytes }));
      setRepoContent(content);
      
    } catch (error) {
      console.error("Error generating export:", error);
      setError(error instanceof Error ? error.message : "Unknown error preparing content");
    } finally {
      setIsGenerating(false);
      setExportProgress(100);
    }
  };
  
  // Function to recursively get all files from a repository
  const getFilesRecursively = async (owner: string, repo: string, path: string = "", depth: number = 0): Promise<any[]> => {
    if (depth > maxDirectoryDepth) {
      return [];
    }
    
    try {
      const contents = await getRepoContents(owner, repo, path);
      let allFiles = [...contents];
      
      // Process directories recursively
      for (const item of contents) {
        if (item.type === "dir") {
          const childFiles = await getFilesRecursively(owner, repo, item.path, depth + 1);
          allFiles = [...allFiles, ...childFiles];
        }
      }
      
      return allFiles;
    } catch (error) {
      console.error(`Error fetching contents for path ${path}:`, error);
      return [];
    }
  };
  
  // Helper function to check if a file is a license file
  const isLicenseFile = (filename: string, path: string): boolean => {
    const licensePatterns = [
      'license', 'licence', 'copying', 'copyright',
      'mit-license', 'apache-license', 'bsd-license', 'gpl', 'lgpl', 'agpl'
    ];
    
    const lowerFilename = filename.toLowerCase();
    const lowerPath = path.toLowerCase();
    
    // Check if filename contains any license patterns
    return licensePatterns.some(pattern => 
      lowerFilename === pattern || 
      lowerFilename === `${pattern}.txt` || 
      lowerFilename === `${pattern}.md` ||
      lowerFilename.startsWith(`${pattern}.`) ||
      lowerPath.includes('/licenses/')
    );
  };
  
  // Helper function to check if a file is likely a binary file
  const isBinaryFile = (filename: string): boolean => {
    const binaryExtensions = [
      'jpg', 'jpeg', 'png', 'gif', 'bmp', 'ico', 'webp', 'tiff',
      'mp3', 'mp4', 'wav', 'ogg', 'webm', 'avi', 'mov',
      'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
      'zip', 'tar', 'gz', 'rar', '7z', 'jar', 'war',
      'exe', 'dll', 'so', 'dylib', 'bin', 'dat',
      'ttf', 'otf', 'woff', 'woff2', 'eot'
    ];
    
    const extension = filename.split('.').pop()?.toLowerCase() || "";
    return binaryExtensions.includes(extension);
  };
  
  // Helper function to check if a file is likely a code file even without recognized extension
  const isCodeFile = (filename: string, path: string): boolean => {
    // Files without extensions in these directories are likely code
    const codeDirectories = [
      'src', 'lib', 'app', 'scripts', 'utils', 'helpers', 'bin',
      'includes', 'components', 'modules', 'core', 'services'
    ];
    
    // No extension but probably code files
    const codeFilenames = [
      'dockerfile', 'makefile', 'gemfile', 'rakefile', 'procfile',
      'jenkinsfile', '.env', '.gitignore', 'readme', 'vagrantfile', 
      'brewfile', 'pipfile'
    ];
    
    const lowerFilename = filename.toLowerCase();
    const lowerPath = path.toLowerCase();
    
    // Check if file is in a code directory
    if (codeDirectories.some(dir => lowerPath.includes(`/${dir}/`))) {
      return true;
    }
    
    // Check if filename matches common code files without extensions
    return codeFilenames.some(name => lowerFilename === name);
  };
  
  // Generate a string representation of the file structure
  const generateStructureString = (node: any, prefix: string, depth: number, maxDepth = 100): string => {
    if (depth > maxDepth) return prefix + "...\n";
    
    let result = "";
    
    if (node.type === "folder" && node.contents) {
      const keys = Object.keys(node.contents || {});
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const child = node.contents[key];
        if (!child) continue; // Skip if child is undefined
        
        const isLast = i === keys.length - 1;
        
        const branchChar = isLast ? "└── " : "├── ";
        const newPrefix = prefix + (isLast ? "    " : "│   ");
        
        result += prefix + branchChar + key + "\n";
        
        if (child.type === "folder" && child.contents) {
          result += generateStructureString(child, newPrefix, depth + 1, maxDepth);
        }
      }
    }
    
    return result;
  };
  
  // Format size in bytes to human-readable form
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Copy content to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(repoContent)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
  };
  
  // Export as plain text file
  const exportAsText = () => {
    const blob = new Blob([repoContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${owner}-${repo}-export.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Export as PDF
  const exportAsPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text(`Repository: ${owner}/${repo}`, 20, 20);
    
    // Add date
    doc.setFontSize(10);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 20, 30);
    
    // Add content
    doc.setFontSize(10);
    
    // Process content without truncation
    const lines = repoContent.split('\n');
    
    let y = 40;
    for (const line of lines) {
      // Check if we need a new page
      if (y > 280) { // Close to page bottom
        doc.addPage();
        y = 20;
      }
      
      // Only add lines that fit
      if (line.length < 150) {
        doc.text(line, 20, y);
        y += 5;
      } else {
        // Split long lines
        const chunks = [];
        for (let i = 0; i < line.length; i += 100) {
          chunks.push(line.substring(i, i + 100));
        }
        
        for (const chunk of chunks) {
          doc.text(chunk, 20, y);
          y += 5;
          
          // Check if we need a new page
          if (y > 280) {
            doc.addPage();
            y = 20;
          }
        }
      }
    }
    
    doc.save(`${owner}-${repo}-export.pdf`);
  };
  
  // Handle retry
  const handleRetry = () => {
    setIsRetrying(true);
    prepareContent().finally(() => {
      setIsRetrying(false);
    });
  };
  
  // Handle checkbox change for file type
  const handleFileTypeChange = (extension: string, checked: boolean | "indeterminate") => {
    setIncludeFileTypes(prev => ({
      ...prev,
      [extension]: checked === true
    }));
  };
  
  // Handle include all files toggle
  const handleIncludeAllFilesChange = (checked: boolean | "indeterminate") => {
    setIncludeAllFiles(checked === true);
  };
  
  useEffect(() => {
    // Don't auto-generate on mount, let user initiate
  }, [owner, repo]);
  
  // If we're still loading
  if (isGenerating) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>LLM Export</CardTitle>
          <CardDescription>
            Preparing repository content for LLM analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Generating export</span>
                <span className="text-sm text-muted-foreground">{exportProgress}%</span>
              </div>
              <Progress value={exportProgress} className="h-2" />
              
              {exportProgress > 10 && (
                <div className="mt-4 text-sm text-muted-foreground">
                  <p>Found {exportStats.filesFound} files, including {exportStats.filesIncluded} in export</p>
                  {exportStats.totalBytes > 0 && <p>Processed {formatBytes(exportStats.totalBytes)} so far</p>}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // If we have an error
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>LLM Export</CardTitle>
          <CardDescription>
            Error generating repository content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
          
          <Button 
            onClick={handleRetry} 
            variant="default" 
            disabled={isRetrying}
            className="w-full"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  // If we need to initiate the generation
  if (!repoContent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>LLM Export</CardTitle>
          <CardDescription>
            Prepare repository content for use in AI assistants like ChatGPT, Claude, etc.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start">
              <Info className="mr-2 h-5 w-5 text-blue-500 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p>This tool generates a text export of your repository structure and contents, 
                formatted for easy pasting into LLM systems.</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowOptions(!showOptions)}
                  className="mb-4"
                >
                  {showOptions ? "Hide Advanced Options" : "Show Advanced Options"}
                </Button>
                
                {showOptions && (
                  <div className="space-y-4 mb-4 p-4 border rounded-md">
                    <div className="flex items-center space-x-2 mb-4">
                      <Checkbox 
                        id="include-all-files" 
                        checked={includeAllFiles} 
                        onCheckedChange={handleIncludeAllFilesChange} 
                      />
                      <Label htmlFor="include-all-files" className="font-medium">Include all code files (recommended)</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="show-dot-files" 
                        checked={showDotFiles} 
                        onCheckedChange={(checked: boolean | "indeterminate") => setShowDotFiles(checked as boolean)} 
                      />
                      <Label htmlFor="show-dot-files">Include dot files (.gitignore, .env, etc.)</Label>
                    </div>
                    
                    {!includeAllFiles && (
                      <div>
                        <Label className="block mb-2">File types to include:</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {Object.keys(includeFileTypes).map(ext => (
                            <div key={ext} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`ext-${ext}`} 
                                checked={includeFileTypes[ext]} 
                                onCheckedChange={(checked) => handleFileTypeChange(ext, checked)} 
                              />
                              <Label htmlFor={`ext-${ext}`}>.{ext}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <Button 
                  onClick={prepareContent} 
                  className="w-full md:col-span-3"
                  disabled={isGenerating}
                >
                  Generate Repository Export
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Show the export results
  return (
    <Card>
      <CardHeader>
        <CardTitle>Repository Export</CardTitle>
        <CardDescription>
          {repoDetails?.fullName || `${owner}/${repo}`} - {formatBytes(repoContent.length)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Button 
              onClick={copyToClipboard} 
              variant="default" 
              className="w-full"
            >
              {copySuccess ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy to Clipboard
                </>
              )}
            </Button>
            <Button 
              onClick={exportAsText} 
              variant="outline" 
              className="w-full"
            >
              <FileText className="mr-2 h-4 w-4" />
              Export as .txt
            </Button>
            <Button 
              onClick={exportAsPDF} 
              variant="outline" 
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              Export as .pdf
            </Button>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Included {exportStats.filesIncluded} of {exportStats.filesFound} files
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={handleRetry}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </Button>
            </div>
          </div>
          
          <Tabs value={exportTab} onValueChange={setExportTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="text">Preview</TabsTrigger>
              <TabsTrigger value="help">Help</TabsTrigger>
            </TabsList>
            
            <TabsContent value="text" className="space-y-4">
              <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                <pre className="text-sm whitespace-pre-wrap">{repoContent}</pre>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="help">
              <div className="space-y-4">
                <Alert>
                  <div className="mb-4">
                    <h3 className="font-medium">Using This Export with LLMs</h3>
                  </div>
                  <AlertDescription className="space-y-4">
                    <p>This export is formatted to be easily used with large language models like ChatGPT, Claude, Bard, etc.</p>
                    
                    <div>
                      <h4 className="font-medium">Suggested Prompts:</h4>
                      <ul className="list-disc pl-5 mt-2 space-y-2">
                        <li>"Review this codebase and suggest architectural improvements"</li>
                        <li>"Identify potential security issues in this code"</li>
                        <li>"Help me understand the overall structure and organization of this project"</li>
                        <li>"What design patterns are used in this codebase?"</li>
                        <li>"Suggest test cases for this code"</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-medium">Tips:</h4>
                      <ul className="list-disc pl-5 mt-2 space-y-2">
                        <li>If the export is large, you may need to split it into multiple messages</li>
                        <li>Consider focusing on specific aspects rather than the entire codebase</li>
                        <li>Ask for high-level feedback first, then drill down into specific areas</li>
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
                
                <Button variant="outline" className="w-full">
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Example Prompt (Coming Soon)
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
} 