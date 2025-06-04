"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { RepoDetails } from "@/app/lib/github";

interface MetadataPanelProps {
  repoDetails: RepoDetails;
}

export function MetadataPanel({ repoDetails }: MetadataPanelProps) {
  // Use a fixed date format that will be consistent between server and client
  const createdDate = formatDate(new Date(repoDetails.createdAt));
  const updatedDate = formatDate(new Date(repoDetails.updatedAt));

  const repoAge = getRepoAge(repoDetails.createdAt);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Repository Metadata</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <InfoItem label="Repository Name" value={repoDetails.name} />
          <InfoItem label="Owner" value={repoDetails.owner} />
          <InfoItem label="Primary Language" value={repoDetails.primaryLanguage} />
          <InfoItem label="License" value={repoDetails.license} />
          <InfoItem label="Default Branch" value={repoDetails.defaultBranch} />
          <InfoItem label="Size" value={formatSize(repoDetails.size)} />
          <InfoItem label="Created On" value={createdDate} />
          <InfoItem label="Last Updated" value={updatedDate} />
          <InfoItem label="Repository Age" value={repoAge} />
          <InfoItem label="Open Issues" value={repoDetails.openIssuesCount.toString()} />
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

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function formatSize(sizeInKB: number): string {
  if (sizeInKB >= 1024) {
    return (sizeInKB / 1024).toFixed(1) + ' MB';
  }
  return sizeInKB + ' KB';
}

function getRepoAge(createdAt: string): string {
  const created = new Date(createdAt);
  const now = new Date();
  
  const diffTime = Math.abs(now.getTime() - created.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  const years = Math.floor(diffDays / 365);
  const months = Math.floor((diffDays % 365) / 30);
  
  if (years > 0) {
    return `${years} year${years > 1 ? 's' : ''}${months > 0 ? `, ${months} month${months > 1 ? 's' : ''}` : ''}`;
  }
  
  if (months > 0) {
    return `${months} month${months > 1 ? 's' : ''}`;
  }
  
  return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
} 