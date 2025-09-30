import { z } from 'zod';
import { Document } from '../types/document.js';

/**
 * Abstract base interface for a vector store
 */
export abstract class VectorStoreBase {
  /**
   * The client to interact with the vector store
   */
  public abstract readonly client: any;

  /**
   * Embedding function to use to embed documents
   */
  public abstract readonly embeddingFunction?: any;

  /**
   * Add documents to the vector store
   * 
   * @param documents - Strings to add to the vector store
   * @param embeddings - The embeddings of the documents to add to vector store
   * @param metadatas - List of metadatas associated with the texts
   * @param kwargs - Vector store specific parameters
   * @returns List of ids from adding the texts into the vector store
   */
  public abstract add(
    documents: Iterable<string>,
    embeddings?: number[][] | null,
    metadatas?: Record<string, any>[] | null,
    ...kwargs: any[]
  ): Promise<number[]>;

  /**
   * Delete by vector ID or other criteria
   * 
   * @param ids - List of ids to delete
   * @returns True if deletion is successful, false otherwise, null if not implemented
   */
  public abstract delete(ids: number[]): Promise<boolean | null>;

  /**
   * Retrieve items from vector store by IDs
   * 
   * @param ids - The IDs of the items to retrieve. If undefined, retrieves all items
   * @returns A list of dictionaries containing the metadata and documents of the retrieved items
   */
  public abstract get(ids?: string[]): Promise<Record<string, any>[]>;

  /**
   * Reset the vector store
   */
  public abstract reset(): Promise<void>;

  /**
   * Search for similar documents and return metadata of documents most similar to query
   * 
   * @param queryTexts - Text to look up documents similar to
   * @param k - Number of documents to return. Defaults to 4
   * @param kwargs - Additional parameters
   * @returns List of metadata of documents most similar to the query
   */
  public abstract searchSimilar(
    queryTexts?: string | string[] | null,
    k?: number,
    ...kwargs: any[]
  ): Promise<Record<string, any>[]>;

  /**
   * Add Document objects to the vector store, extracting text and metadata
   * 
   * @param documents - List of Document objects to add
   * @returns List of IDs for the added documents
   */
  public async addDocuments(documents: Document[]): Promise<string[]> {
    const texts = documents.map(doc => doc.text);
    const metadatas = documents[0]?.metadata ? documents.map(doc => doc.metadata || {}) : undefined;
    const ids = documents.map(() => crypto.randomUUID());
    
    const result = await this.add(texts, undefined, metadatas, { ids });
    return result.map(String);
  }
}

/**
 * Abstract base interface for a graph store
 */
export abstract class GraphStoreBase {
  /**
   * The client to interact with the graph store
   */
  public abstract readonly client: any;

  /**
   * Add a node to the graph store
   * 
   * @param label - The label of the node
   * @param properties - The properties of the node
   */
  public abstract addNode(label: string, properties: Record<string, any>): Promise<void>;

  /**
   * Add a relationship to the graph store
   * 
   * @param startNodeProps - The properties of the start node
   * @param endNodeProps - The properties of the end node  
   * @param relationshipType - The type of the relationship
   * @param relationshipProps - The properties of the relationship
   */
  public abstract addRelationship(
    startNodeProps: Record<string, any>,
    endNodeProps: Record<string, any>,
    relationshipType: string,
    relationshipProps?: Record<string, any>
  ): Promise<void>;

  /**
   * Execute a query against the graph store
   * 
   * @param query - The query to execute
   * @param params - The parameters for the query
   * @returns The query results
   */
  public abstract query(query: string, params?: Record<string, any>): Promise<Record<string, any>[]>;

  /**
   * Reset the graph store
   */
  public abstract reset(): Promise<void>;
}