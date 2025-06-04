"use client";

import Link from "next/link";
import { ExternalLink, Star, GitFork, Eye } from "lucide-react";
import { Card, CardContent } from "@/app/components/ui/card";
import { RepoDetails } from "@/app/lib/github";

interface RepoHeaderProps {
  repoDetails: RepoDetails;
}

export function RepoHeader({ repoDetails }: RepoHeaderProps) {
  // Use a fixed date format that will be consistent between server and client
  const formattedDate = formatDate(new Date(repoDetails.updatedAt));

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              {repoDetails.fullName}
              <Link 
                href={repoDetails.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-muted-foreground hover:text-primary"
              >
                <ExternalLink size={18} />
              </Link>
            </h2>
            <p className="text-muted-foreground mt-1">
              {repoDetails.description || "No description provided"}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Last updated: {formattedDate}
            </p>
          </div>

          <div className="flex gap-4">
            <StatItem icon={<Star size={18} />} label="Stars" value={repoDetails.stars} />
            <StatItem icon={<GitFork size={18} />} label="Forks" value={repoDetails.forks} />
            <StatItem icon={<Eye size={18} />} label="Watchers" value={repoDetails.watchers} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <Badge>{repoDetails.primaryLanguage}</Badge>
          <Badge>{repoDetails.license}</Badge>
          <Badge>Size: {formatSize(repoDetails.size)}</Badge>
          <Badge>Open Issues: {repoDetails.openIssuesCount}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to format dates consistently
function formatDate(date: Date): string {
  // Use a fixed format that will be consistent on both server and client
  // Format: YYYY-MM-DD
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function StatItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-1 text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="font-semibold">{formatNumber(value)}</p>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-xs font-medium">
      {children}
    </span>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function formatSize(sizeInKB: number): string {
  if (sizeInKB >= 1024) {
    return (sizeInKB / 1024).toFixed(1) + ' MB';
  }
  return sizeInKB + ' KB';
} 