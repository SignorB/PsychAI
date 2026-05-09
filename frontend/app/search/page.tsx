"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useState } from "react";
import { ArrowRight, Database, Loader2, RefreshCw, Search, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { reindexSearchSources, semanticSearch } from "@/lib/api";

type SearchResult = {
  patient_id: number;
  patient_name: string;
  source_id?: string;
  chunk_id?: string;
  source_type?: string;
  record_type?: string;
  session_id?: string;
  score: number;
  text: string;
  href: string;
};

export default function AdvancedSearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [indexed, setIndexed] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [error, setError] = useState("");

  async function handleReindex() {
    setIsIndexing(true);
    setError("");
    try {
      const response = await reindexSearchSources();
      setIndexed(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to build search index");
    } finally {
      setIsIndexing(false);
    }
  }

  async function handleSearch(event?: FormEvent) {
    event?.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);
    setError("");
    try {
      const response = await semanticSearch({ query, top_k: 12 });
      setResults(response.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run semantic search");
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-clinical-ink">
            Advanced search
          </h1>
          <p className="text-sm text-[#848484] mt-1">
            Semantic search over the persistent local AI vector index.
          </p>
        </div>
        <Button variant="outline" onClick={handleReindex} disabled={isIndexing}>
          {isIndexing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {isIndexing ? "Indexing..." : "Build / refresh index"}
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#848484]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search concepts, symptoms, events, clinical notes..."
                className="w-full h-11 pl-10 pr-3 rounded-md bg-clinical-soft border border-transparent text-sm text-clinical-ink placeholder:text-[#848484] focus:outline-none focus:bg-white focus:border-clinical-border"
              />
            </div>
            <Button type="submit" disabled={isSearching || !query.trim()}>
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isSearching ? "Searching..." : "Semantic search"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <Database className="h-4 w-4 text-[#848484] mt-0.5" />
            <div>
              <p className="text-xs text-[#848484]">Index status</p>
              <p className="text-sm font-medium text-clinical-ink">
                {indexed ? `${indexed.indexed_chunks} chunks indexed` : "Ready"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-[#848484]">Patients</p>
            <p className="text-sm font-medium text-clinical-ink">
              {indexed?.patient_count ?? "-"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-[#848484]">Sessions</p>
            <p className="text-sm font-medium text-clinical-ink">
              {indexed?.session_count ?? "-"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
          <CardDescription>
            Results are ranked by cosine similarity against local embeddings.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {results.length === 0 ? (
            <div className="p-12 text-center text-sm text-[#848484]">
              Build the index, then run a semantic query.
            </div>
          ) : (
            <ul className="divide-y divide-clinical-border">
              {results.map((result) => (
                <li key={result.chunk_id || `${result.patient_id}-${result.source_id}`}>
                  <Link
                    href={result.href}
                    className="block p-4 hover:bg-clinical-soft/60 transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-clinical-ink">
                            {result.patient_name || `Patient ${result.patient_id}`}
                          </p>
                          <Badge variant="outline">
                            {result.record_type || result.source_type || "source"}
                          </Badge>
                          <span className="text-[11px] text-[#848484]">
                            score {result.score.toFixed(3)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-[#848484] line-clamp-3">
                          {result.text}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-[#848484] mt-1 shrink-0" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
