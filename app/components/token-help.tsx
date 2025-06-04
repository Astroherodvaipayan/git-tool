"use client";

import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/app/components/ui/accordion";
import { AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";
import Link from "next/link";

export function TokenHelp() {
  return (
    <Card className="w-full shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          GitHub Token Setup Guide
        </CardTitle>
        <CardDescription>
          Set up a GitHub token to increase your API rate limit from 60 to 5,000 requests per hour
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="why">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="why">Why Needed</TabsTrigger>
            <TabsTrigger value="create">How to Create</TabsTrigger>
            <TabsTrigger value="apply">How to Apply</TabsTrigger>
          </TabsList>
          
          <TabsContent value="why" className="mt-4 space-y-4">
            <div className="text-sm">
              <p className="mb-2">GitHub limits API requests to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Without token</strong>: 60 requests per hour (based on IP address)</li>
                <li><strong>With token</strong>: 5,000 requests per hour</li>
              </ul>
              
              <p className="mt-4">
                When analyzing repositories, especially larger ones, the application can quickly exceed 
                the 60 requests limit, resulting in errors.
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="create" className="mt-4 space-y-4">
            <ol className="list-decimal pl-5 space-y-3 text-sm">
              <li>
                <strong>Go to GitHub Token Settings</strong>
                <p className="text-muted-foreground mt-1">
                  Visit <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center">
                    github.com/settings/tokens 
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </p>
              </li>
              
              <li>
                <strong>Generate a New Token</strong>
                <p className="text-muted-foreground mt-1">
                  Click "Generate new token" → "Generate new token (classic)"
                </p>
              </li>
              
              <li>
                <strong>Set Permissions</strong>
                <p className="text-muted-foreground mt-1">
                  For public repositories, you only need the "public_repo" scope
                </p>
              </li>
              
              <li>
                <strong>Create and Copy the Token</strong>
                <p className="text-muted-foreground mt-1">
                  Click "Generate token" and <strong>copy it immediately</strong> (GitHub only shows it once)
                </p>
              </li>
            </ol>
          </TabsContent>
          
          <TabsContent value="apply" className="mt-4 space-y-4">
            <div className="text-sm">
              <p className="mb-3">You have two options to apply your token:</p>
              
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="option1">
                  <AccordionTrigger className="text-sm font-medium">
                    Option 1: Using the Token Input Field (Recommended)
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="mb-2">
                      Paste your token in the input field above and click "Apply Token". 
                      This stores the token in your browser's session storage.
                    </p>
                    <p className="text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 inline mr-1 text-green-500" />
                      Token will be active until you close your browser.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="option2">
                  <AccordionTrigger className="text-sm font-medium">
                    Option 2: Using the .env.local File (Permanent)
                  </AccordionTrigger>
                  <AccordionContent>
                    <ol className="list-decimal pl-5 space-y-2">
                      <li>Open the <code className="bg-muted px-1 py-0.5 rounded">.env.local</code> file in the project root</li>
                      <li>Replace the token value with your actual token</li>
                      <li>Restart the application to apply the changes</li>
                    </ol>
                    <p className="text-muted-foreground mt-2">
                      <CheckCircle2 className="h-4 w-4 inline mr-1 text-green-500" />
                      Token will be automatically applied each time you start the application.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-center border-t pt-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token" target="_blank" rel="noopener noreferrer">
            GitHub Documentation
            <ExternalLink className="h-3 w-3 ml-2" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
} 