import { NextResponse } from 'next/server';
import { buildFileTree, getRepoDetails } from '@/app/lib/github';

// Sample function to simulate the filtering logic in the LLM export panel
function countExportableFiles(files: any[]): { total: number, filtered: number, filteredFiles: string[] } {
  const INCLUDE_EXTENSIONS = [
    "js", "jsx", "ts", "tsx", "html", "css", "scss", "json", "md", "txt", 
    "py", "rb", "java", "c", "cpp", "h", "hpp", "go", "rs", "php", "swift",
    "kt", "sh", "bash", "yml", "yaml", "toml", "xml", "sql", "gitignore",
    "dockerfile", "jenkinsfile", "makefile", "gemfile", "rakefile", "procfile",
    "env", "ini", "cfg", "conf", "config"
  ];

  const EXCLUDE_FILES = [
    "node_modules", "dist", "build", ".git", "package-lock.json", "yarn.lock",
    ".next", "venv", "__pycache__", "coverage", ".DS_Store", ".idea", ".vscode"
  ];

  // Flattening helper function
  function flattenFileStructure(items: any[]): any[] {
    let result: any[] = [];
    
    for (const item of items) {
      result.push(item);
      
      if (item.type === "dir" && item.children) {
        result = result.concat(flattenFileStructure(item.children));
      }
    }
    
    return result;
  }

  // Helper functions
  function hasIncludedExtension(filename: string): boolean {
    const extension = filename.split('.').pop()?.toLowerCase() || "";
    return INCLUDE_EXTENSIONS.includes(extension);
  }

  function isExcludedFile(path: string): boolean {
    return EXCLUDE_FILES.some(exclude => path.toLowerCase().includes(exclude.toLowerCase()));
  }

  function isLicenseFile(filename: string, path: string): boolean {
    const licensePatterns = [
      'license', 'licence', 'copying', 'copyright',
      'mit-license', 'apache-license', 'bsd-license', 'gpl', 'lgpl', 'agpl'
    ];
    
    const lowerFilename = filename.toLowerCase();
    
    // Check if filename contains any license patterns
    return licensePatterns.some(pattern => 
      lowerFilename === pattern || 
      lowerFilename === `${pattern}.txt` || 
      lowerFilename === `${pattern}.md` ||
      lowerFilename.startsWith(`${pattern}.`)
    );
  }

  function shouldIncludeAsCode(filename: string, path: string): boolean {
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
    
    // Check if file is in a code directory
    if (codeDirectories.some(dir => path.toLowerCase().includes(`/${dir}/`))) {
      return true;
    }
    
    // Check if filename matches common code files without extensions
    return codeFilenames.some(name => filename.toLowerCase() === name);
  }

  // Filter logic (simplified version of what's in the LLM export panel)
  const flatFiles = flattenFileStructure(files);
  
  // Files that would be included in export
  const filtered = flatFiles.filter(file => {
    if (file.type !== "file") return false;
    
    // Skip excluded patterns
    if (isExcludedFile(file.path)) return false;
    
    // Skip license files completely
    if (isLicenseFile(file.name, file.path)) return false;
    
    // Skip very large files
    if (file.size > 1024 * 1024) return false; // 1MB max
    
    // Include files with specific extensions or without extension if they're likely code
    return hasIncludedExtension(file.name) || shouldIncludeAsCode(file.name, file.path);
  });

  return {
    total: flatFiles.length,
    filtered: filtered.length,
    filteredFiles: filtered.map(f => f.path).slice(0, 20) // Sample of file paths
  };
}

export async function GET() {
  try {
    // Use a small sample repository
    const owner = 'vercel';
    const repo = 'next.js';
    const path = 'examples/api-routes-middleware'; // Just examine a single example folder
    
    // Use the improved buildFileTree function with limited depth
    const [files, details] = await Promise.all([
      buildFileTree(owner, repo, path, 3), // Reduced depth to avoid rate limits
      getRepoDetails(owner, repo)
    ]);
    
    // Count exportable files
    const counts = countExportableFiles(files);
    
    // Return the counts and a sample of the file structure
    return NextResponse.json({
      status: 'success',
      repository: `${owner}/${repo}/${path}`,
      fileCounts: counts,
      details: {
        name: details.name,
        stars: details.stars,
        language: details.primaryLanguage
      },
      sampleFileCount: files.length,
      sampleDirs: files
        .filter(f => f.type === 'dir')
        .map(f => f.path)
        .slice(0, 10)
    });
  } catch (error: any) {
    console.error('Error testing LLM export:', error);
    
    return NextResponse.json(
      { 
        status: 'error',
        message: error.message || 'An error occurred',
        error: error.stack
      }, 
      { status: 500 }
    );
  }
}