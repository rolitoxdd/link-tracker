import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CopyIcon, LinkIcon } from "lucide-react";

interface LinkData {
  slug: string;
  target_url: string;
  description?: string;
  created_at: string;
  clicks: number;
  unique_visitors: number;
}

interface ClickStat {
  country: string;
  city: string;
  clicks: number;
  timestamps: string[];
}

export function Dashboard() {
  const [state, setState] = useState({
    links: [] as LinkData[],
    targetUrl: "",
    customSlug: "",
    description: "",
    baseUrl: "",
    stats: [] as ClickStat[],
    selectedLinkStats: null as string | null,
    isStatsOpen: false,
  });

  const fetchStats = async (slug: string) => {
    setState((prev) => ({ ...prev, selectedLinkStats: slug }));
    const res = await fetch(`/api/links/${slug}/stats`);
    if (res.ok) {
      const data = (await res.json()) as ClickStat[];
      setState((prev) => ({ ...prev, stats: data, isStatsOpen: true }));
    }
  };

  useEffect(() => {
    setState((prev) => ({ ...prev, baseUrl: window.location.origin }));
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    const res = await fetch("/api/links");
    if (res.ok) {
      const data = (await res.json()) as LinkData[];
      setState((prev) => ({ ...prev, links: data }));
    }
  };

  const createLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.targetUrl) return;

    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_url: state.targetUrl, custom_slug: state.customSlug, description: state.description }),
    });

    if (res.ok) {
      setState((prev) => ({ ...prev, targetUrl: "", customSlug: "", description: "" }));
      fetchLinks();
    } else {
      alert("Failed to create link. Slug might already exist.");
    }
  };

  return (
    <TooltipProvider delay={200}>
      <div className="container mx-auto max-w-5xl py-10 px-4 space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-between pb-4 border-b">
          <div className="flex items-center space-x-3">
            <div className="bg-primary/10 p-2.5 rounded-xl border border-primary/20 shadow-sm">
              <LinkIcon className="text-primary" size={26} />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 text-transparent bg-clip-text">
              roli.to Links
            </h1>
          </div>
        </div>

        <Card className="border-muted shadow-sm hover:shadow-md transition-shadow dark:bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Create a New Tracked Link</CardTitle>
            <CardDescription>Enter your destination URL and an optional custom slug.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createLink} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="targetUrl">Target URL</Label>
                  <Input
                    id="targetUrl"
                    type="url"
                    className="bg-background shadow-sm"
                    placeholder="https://example.com/very/long/path"
                    value={state.targetUrl}
                    onChange={(e) => setState(prev => ({ ...prev, targetUrl: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customSlug">Custom Slug (Optional)</Label>
                  <div className="flex rounded-md shadow-sm">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted/50 text-muted-foreground sm:text-sm">
                      {state.baseUrl.replace(/^https?:\/\//, "")}/
                    </span>
                    <Input
                      id="customSlug"
                      className="rounded-l-none bg-background focus-visible:z-10"
                      placeholder="my-link"
                      value={state.customSlug}
                      onChange={(e) => setState(prev => ({ ...prev, customSlug: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  className="bg-background shadow-sm"
                  placeholder="What is this link for?"
                  value={state.description}
                  onChange={(e) => setState(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="pt-2">
                <Button type="submit" className="w-full md:w-auto shadow-sm">Tracked Link</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-muted shadow-sm border-t-4 border-t-primary dark:bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Your Links</CardTitle>
            <CardDescription>Manage and track your tracked URLs.</CardDescription>
          </CardHeader>
          <CardContent>
            {state.links.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
                <div className="bg-muted p-4 rounded-full mb-4 opacity-50">
                  <LinkIcon size={32} />
                </div>
                <p>No links created yet. Create your first link above!</p>
              </div>
            ) : (
              <div className="rounded-md border bg-card/50">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead>Tracked Link</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead className="text-right">Unique Visitors</TableHead>
                      <TableHead className="text-right">Total Clicks</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.links.map((link) => {
                      const fullLink = `${state.baseUrl}/${link.slug}`;
                      return (
                        <TableRow key={link.slug} className="group transition-colors">
                          <TableCell className="font-medium align-middle">
                            <div className="flex items-center space-x-2">
                              <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                                {link.slug.charAt(0).toUpperCase()}
                              </span>
                              <a href={fullLink} target="_blank" rel="noreferrer" className="text-primary hover:underline font-mono text-sm max-w-[150px] truncate block">
                                /{link.slug}
                              </a>
                              <button
                                onClick={() => navigator.clipboard.writeText(fullLink)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground shrink-0 focus:opacity-100"
                                title="Copy to clipboard"
                              >
                                <CopyIcon size={14} />
                              </button>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[150px] md:max-w-xs truncate align-middle" title={link.target_url}>
                            {link.description && (
                              <div className="font-medium text-foreground truncate" title={link.description}>
                                {link.description}
                              </div>
                            )}
                            <div className="text-muted-foreground text-xs truncate">
                              {link.target_url}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold align-middle">
                            <span className="inline-flex items-center justify-center bg-secondary/10 text-secondary-foreground px-2.5 py-0.5 rounded-full text-xs font-semibold">
                              {link.unique_visitors || 0}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-semibold align-middle">
                            <button
                              onClick={() => fetchStats(link.slug)}
                              className="inline-flex items-center justify-center bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-semibold hover:bg-primary/20 transition-colors cursor-pointer"
                              title="View click statistics"
                            >
                              {link.clicks}
                            </button>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground text-sm align-middle whitespace-nowrap">
                            {new Date(link.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={state.isStatsOpen} onOpenChange={(open) => setState(prev => ({ ...prev, isStatsOpen: open }))}>
          <DialogContent className="sm:max-w-md dark:bg-card/95 backdrop-blur-md">
            <DialogHeader>
              <DialogTitle>Click Statistics</DialogTitle>
              <DialogDescription>
                Locations of clicks for <span className="font-mono text-primary">/{state.selectedLinkStats}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto pr-2">
              {state.stats.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No location data available for these clicks.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Clicks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.stats.map((stat, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium align-middle">
                          <Tooltip>
                            <TooltipTrigger className="cursor-help underline decoration-dotted underline-offset-4">
                              {stat.city !== 'Unknown' || stat.country !== 'Unknown'
                                ? `${stat.city}, ${stat.country}`
                                : 'Unknown Location'}
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[250px] space-y-1">
                              <p className="font-semibold text-xs border-b pb-1 mb-1">Recent Clicks</p>
                              <ul className="text-xs space-y-1 max-h-[150px] overflow-y-auto">
                                {stat.timestamps?.slice(0, 5).map((ts: string, i: number) => (
                                  <li key={i}>{new Date(ts).toLocaleString()}</li>
                                ))}
                                {stat.timestamps?.length > 5 && (
                                  <li className="text-muted-foreground italic pt-1">...and {stat.timestamps.length - 5} more</li>
                                )}
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-right font-semibold align-middle">
                          <span className="inline-flex items-center justify-center bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-semibold">
                            {stat.clicks}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
