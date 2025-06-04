"use client";

import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Contributor } from "@/app/lib/github";

interface ContributorsPanelProps {
  contributors: Contributor[];
  showAll?: boolean;
}

export function ContributorsPanel({ contributors, showAll = false }: ContributorsPanelProps) {
  const displayedContributors = showAll ? contributors : contributors.slice(0, 5);
  const totalContributions = contributors.reduce((sum, contributor) => sum + contributor.contributions, 0);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span>Top Contributors</span>
          {!showAll && contributors.length > 5 && (
            <span className="text-sm font-normal text-muted-foreground">
              Showing top 5 of {contributors.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {contributors.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-center">
            <p className="mb-2">No contributor data available</p>
            <p className="text-sm">GitHub API may have rate limited this request or the repository has no contributors yet.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {displayedContributors.map((contributor) => (
              <ContributorRow 
                key={contributor.id} 
                contributor={contributor} 
                percentage={(contributor.contributions / totalContributions) * 100}
              />
            ))}

            {!showAll && contributors.length > 5 && (
              <div className="text-center mt-6">
                <p className="text-sm text-muted-foreground">
                  + {contributors.length - 5} more contributors
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ContributorRow({ contributor, percentage }: { contributor: Contributor; percentage: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-10 w-10 flex-shrink-0">
        <Image
          src={contributor.avatarUrl}
          alt={contributor.login}
          fill
          className="rounded-full object-cover border shadow-sm"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <p className="font-medium truncate">{contributor.login}</p>
            <Link 
              href={contributor.url} 
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink size={14} />
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            {contributor.contributions.toLocaleString()} commits
          </p>
        </div>
        <div className="w-full bg-secondary h-2 mt-2 rounded-full overflow-hidden">
          <div 
            className="bg-primary h-full rounded-full transition-all" 
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
} 