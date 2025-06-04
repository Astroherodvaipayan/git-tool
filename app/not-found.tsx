import Link from "next/link";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { AlertCircle, ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Repository Not Found</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="space-y-3">
            <p className="text-lg text-muted-foreground">
              The repository you're looking for doesn't exist or couldn't be accessed.
            </p>
            <p className="text-sm text-muted-foreground">
              This could happen for several reasons:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 max-w-md mx-auto text-left">
              <li>• The repository doesn't exist</li>
              <li>• The repository is private and you don't have access</li>
              <li>• There was a network error</li>
              <li>• GitHub's API is temporarily unavailable</li>
              <li>• You've hit the API rate limit</li>
            </ul>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="default">
              <Link href="/">
                <Search className="w-4 h-4 mr-2" />
                Search Another Repository
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </Button>
          </div>
          
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              If you believe this is an error, please check the repository URL and try again.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 