/**
 * ArXiv fetcher for retrieving academic papers from arXiv.org.
 * 
 * PYTHON EQUIVALENT: dapr_agents/document/fetcher/arxiv.py
 * 
 * Provides functionality to search arXiv papers and retrieve metadata and PDFs.
 */

import { z } from 'zod';
import { FetcherBase, FetcherBaseConfig, FetcherBaseConfigSchema } from './base.js';
import { Document } from '../../types/document.js';

/**
 * Configuration schema for ArXiv fetcher
 */
export const ArxivFetcherConfigSchema = z.object({
  maxResults: z.number().optional().default(10).describe('Maximum number of results to fetch'),
  timeout: z.number().optional().default(10000).describe('Timeout in milliseconds for fetch operations'),
  includeFullMetadata: z.boolean().optional().default(false).describe('Whether to include full metadata'),
  baseUrl: z.string().optional().default('http://export.arxiv.org/api/query').describe('ArXiv API base URL'),
}).transform(data => ({
  ...data,
  maxResults: data.maxResults ?? 10,
  timeout: data.timeout ?? 10000,
  includeFullMetadata: data.includeFullMetadata ?? false,
  baseUrl: data.baseUrl ?? 'http://export.arxiv.org/api/query',
}));

export type ArxivFetcherConfig = z.infer<typeof ArxivFetcherConfigSchema>;

/**
 * ArXiv paper metadata structure
 */
interface ArxivPaper {
  id: string;
  title: string;
  summary: string;
  authors: string[];
  published: string;
  updated: string;
  categories: string[];
  links: Array<{
    href: string;
    type: string;
    title?: string;
  }>;
  pdfUrl?: string;
  comment?: string;
  journalRef?: string;
  doi?: string;
}

/**
 * Search parameters for ArXiv queries
 */
export interface ArxivSearchParams {
  query: string;
  fromDate?: string | Date;
  toDate?: string | Date;
  sortBy?: 'relevance' | 'lastUpdatedDate' | 'submittedDate';
  sortOrder?: 'ascending' | 'descending';
  maxResults?: number;
  startIndex?: number;
  includeSummary?: boolean;
}

/**
 * ArXiv fetcher for retrieving academic papers from arXiv.org.
 * 
 * PYTHON EQUIVALENT: ArxivFetcher class in arxiv.py
 */
export class ArxivFetcher extends FetcherBase {
  protected declare config: ArxivFetcherConfig;

  constructor(config: Partial<ArxivFetcherConfig> = {}) {
    super(config);
    this.config = ArxivFetcherConfigSchema.parse(config);
  }

  /**
   * Fetch documents based on the given query.
   * 
   * PYTHON EQUIVALENT: search method in ArxivFetcher
   * 
   * @param query The search query
   * @param kwargs Additional parameters for fetching
   * @returns Promise resolving to array of documents
   */
  async fetch(query: string, kwargs?: Record<string, any>): Promise<Document[]> {
    const searchParams: ArxivSearchParams = {
      query,
      maxResults: this.config.maxResults,
      includeSummary: true,
      ...kwargs,
    };

    const papers = await this.searchArxiv(searchParams);
    return this.convertPapersToDocuments(papers, searchParams.includeSummary || false);
  }

  /**
   * Search for papers on arXiv with detailed parameters.
   * 
   * @param params Search parameters
   * @returns Promise resolving to array of ArXiv papers
   */
  async searchArxiv(params: ArxivSearchParams): Promise<ArxivPaper[]> {
    const queryParams = this.buildQueryParams(params);
    const url = `${this.config.baseUrl}?${queryParams}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'dapr-agents-typescript/1.0',
        },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`ArXiv API error (${response.status}): ${response.statusText}`);
      }

      const xmlText = await response.text();
      return this.parseArxivResponse(xmlText);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch from ArXiv: ${error.message}`);
      }
      throw new Error('Failed to fetch from ArXiv: Unknown error');
    }
  }

  /**
   * Build query parameters for ArXiv API.
   * 
   * @param params Search parameters
   * @returns URL search params string
   */
  private buildQueryParams(params: ArxivSearchParams): string {
    const searchParams = new URLSearchParams();

    // Build the search query
    let searchQuery = params.query;
    
    // Add date range if specified
    if (params.fromDate || params.toDate) {
      const fromDate = this.formatDateForArxiv(params.fromDate);
      const toDate = this.formatDateForArxiv(params.toDate);
      
      if (fromDate && toDate) {
        searchQuery += ` AND submittedDate:[${fromDate} TO ${toDate}]`;
      } else if (fromDate) {
        searchQuery += ` AND submittedDate:[${fromDate} TO *]`;
      } else if (toDate) {
        searchQuery += ` AND submittedDate:[* TO ${toDate}]`;
      }
    }

    searchParams.set('search_query', searchQuery);
    searchParams.set('start', (params.startIndex || 0).toString());
    searchParams.set('max_results', (params.maxResults || this.config.maxResults).toString());

    // Set sort order
    if (params.sortBy) {
      const sortBy = params.sortBy === 'relevance' ? 'relevance' :
                     params.sortBy === 'lastUpdatedDate' ? 'lastUpdatedDate' :
                     'submittedDate';
      const sortOrder = params.sortOrder === 'ascending' ? 'ascending' : 'descending';
      searchParams.set('sortBy', sortBy);
      searchParams.set('sortOrder', sortOrder);
    }

    return searchParams.toString();
  }

  /**
   * Format date for ArXiv API (YYYYMMDD format).
   * 
   * @param date Date string or Date object
   * @returns Formatted date string or undefined
   */
  private formatDateForArxiv(date?: string | Date): string | undefined {
    if (!date) return undefined;

    let dateObj: Date;
    if (typeof date === 'string') {
      // Try to parse string date
      dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return undefined;
      }
    } else {
      dateObj = date;
    }

    // Format as YYYYMMDD
    const year = dateObj.getFullYear();
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const day = dateObj.getDate().toString().padStart(2, '0');
    
    return `${year}${month}${day}`;
  }

  /**
   * Parse ArXiv XML response into paper objects.
   * 
   * @param xmlText The XML response from ArXiv API
   * @returns Array of parsed papers
   */
  private parseArxivResponse(xmlText: string): ArxivPaper[] {
    // Simple XML parsing - in a real implementation, you'd want to use a proper XML parser
    const papers: ArxivPaper[] = [];
    
    // Extract entries using regex (not robust, but works for demo)
    const entryRegex = /<entry>(.*?)<\/entry>/gs;
    let match;
    
    while ((match = entryRegex.exec(xmlText)) !== null) {
      const entryXml = match[1]!;
      const paper = this.parseEntryXml(entryXml);
      if (paper) {
        papers.push(paper);
      }
    }
    
    return papers;
  }

  /**
   * Parse a single entry XML into a paper object.
   * 
   * @param entryXml XML content of a single entry
   * @returns Parsed paper object or null if parsing fails
   */
  private parseEntryXml(entryXml: string): ArxivPaper | null {
    try {
      const extractTag = (tag: string): string => {
        const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i');
        const match = entryXml.match(regex);
        return match ? match[1]!.trim() : '';
      };

      const extractAllTags = (tag: string): string[] => {
        const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'gi');
        const matches = [...entryXml.matchAll(regex)];
        return matches.map(match => match[1]!.trim());
      };

      const id = extractTag('id');
      const title = extractTag('title').replace(/\s+/g, ' ');
      const summary = extractTag('summary').replace(/\s+/g, ' ');
      const published = extractTag('published');
      const updated = extractTag('updated');

      // Extract authors
      const authors = extractAllTags('name');

      // Extract categories
      const categories = extractAllTags('category').map(cat => {
        const termMatch = cat.match(/term="([^"]+)"/);
        return termMatch ? termMatch[1]! : cat;
      });

      // Extract links
      const linkMatches = [...entryXml.matchAll(/<link[^>]*href="([^"]+)"[^>]*(?:type="([^"]+)")?[^>]*(?:title="([^"]+)")?[^>]*>/gi)];
      const links = linkMatches.map(match => ({
        href: match[1]!,
        type: match[2] || 'text/html',
        title: match[3],
      }));

      // Find PDF URL
      const pdfLink = links.find(link => link.type === 'application/pdf' || link.href.includes('.pdf'));

      return {
        id: id.replace('http://arxiv.org/abs/', ''),
        title,
        summary,
        authors,
        published,
        updated,
        categories,
        links,
        pdfUrl: pdfLink?.href,
        comment: extractTag('arxiv:comment'),
        journalRef: extractTag('arxiv:journal_ref'),
        doi: extractTag('arxiv:doi'),
      };
    } catch (error) {
      console.warn('Failed to parse ArXiv entry:', error);
      return null;
    }
  }

  /**
   * Convert ArXiv papers to Document objects.
   * 
   * @param papers Array of ArXiv papers
   * @param includeSummary Whether to include the summary in the document text
   * @returns Array of Document objects
   */
  private convertPapersToDocuments(papers: ArxivPaper[], includeSummary: boolean): Document[] {
    return papers.map(paper => {
      let text = paper.title;
      if (includeSummary && paper.summary) {
        text += '\n\n' + paper.summary;
      }

      const metadata: Record<string, any> = {
        source: 'arxiv',
        arxiv_id: paper.id,
        title: paper.title,
        authors: paper.authors,
        published: paper.published,
        updated: paper.updated,
        categories: paper.categories,
        pdf_url: paper.pdfUrl,
        arxiv_url: `https://arxiv.org/abs/${paper.id}`,
      };

      if (this.config.includeFullMetadata) {
        metadata.links = paper.links;
        metadata.comment = paper.comment;
        metadata.journal_ref = paper.journalRef;
        metadata.doi = paper.doi;
        metadata.summary = paper.summary;
      }

      return {
        text,
        metadata,
      };
    });
  }

  /**
   * Check if the fetcher can handle the given query.
   * 
   * @param query The query to check
   * @returns Promise resolving to boolean indicating if query can be handled
   */
  async canHandle(query: string): Promise<boolean> {
    // ArXiv fetcher can handle any text query
    return query.trim().length > 0;
  }

  /**
   * Get papers by ArXiv IDs.
   * 
   * @param arxivIds Array of ArXiv paper IDs
   * @returns Promise resolving to array of documents
   */
  async getPapersByIds(arxivIds: string[]): Promise<Document[]> {
    if (!arxivIds || arxivIds.length === 0) {
      return [];
    }

    // Build query to fetch specific papers by ID
    const idQuery = arxivIds.map(id => `id:${id}`).join(' OR ');
    
    return this.fetch(idQuery, {
      maxResults: arxivIds.length,
      includeSummary: true,
    });
  }

  /**
   * Get the base URL for the ArXiv API.
   */
  getBaseUrl(): string {
    return this.config.baseUrl;
  }

  /**
   * Check if full metadata should be included.
   */
  shouldIncludeFullMetadata(): boolean {
    return this.config.includeFullMetadata;
  }
}

/**
 * Factory function to create an ArXiv fetcher.
 * 
 * @param config Configuration for the fetcher
 * @returns A new ArXiv fetcher instance
 */
export function createArxivFetcher(
  config: Partial<ArxivFetcherConfig> = {}
): ArxivFetcher {
  return new ArxivFetcher(config);
}