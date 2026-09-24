import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { LegalDocument } from '../types.ts';

let client: SupabaseClient | null = null;

function getCredentials() {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
  return { supabaseUrl, supabaseKey };
}

export function isSupabaseConfigured(): boolean {
  const { supabaseUrl, supabaseKey } = getCredentials();
  return Boolean(supabaseUrl && supabaseKey);
}

export function getSupabaseClient(): SupabaseClient | null {
  const { supabaseUrl, supabaseKey } = getCredentials();
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  if (!client) {
    client = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
  }
  return client;
}

export interface DocumentRow {
  id: string;
  title: string;
  filename: string;
  file_type: string;
  total_pages: number;
  raw_text?: string;
  clauses?: any;
  analysis?: any;
  has_original_file?: boolean;
  file_path?: string;
  created_at?: string;
  updated_at?: string;
}

function mapRowToDocument(row: DocumentRow): LegalDocument {
  return {
    id: row.id,
    title: row.title,
    filename: row.filename,
    fileType: row.file_type,
    uploadDate: row.created_at || new Date().toISOString(),
    totalPages: row.total_pages || 1,
    rawText: row.raw_text || '',
    clauses: Array.isArray(row.clauses) ? row.clauses : [],
    analysis: row.analysis || undefined,
    hasOriginalFile: row.has_original_file ?? Boolean(row.file_path),
    fileUrl: `/api/documents/${row.id}/file`,
    isLegalDocument: row.analysis?.classificationNature !== 'NON_CONTRACTUAL',
    stoppedAfterClassification: row.analysis?.classificationNature === 'NON_CONTRACTUAL',
    nonLegalCategory: row.analysis?.nonLegalCategory
  };
}

export async function saveDocumentToSupabase(
  doc: LegalDocument,
  fileBuffer?: Buffer,
  mimeType?: string
): Promise<boolean> {
  const sb = getSupabaseClient();
  if (!sb) return false;

  try {
    let filePath = doc.id;
    if (fileBuffer) {
      const sanitizedName = (doc.filename || 'document.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
      filePath = `documents/${doc.id}/${sanitizedName}`;

      const { error: uploadError } = await sb.storage
        .from('contracts')
        .upload(filePath, fileBuffer, {
          contentType: mimeType || doc.fileType || 'application/octet-stream',
          upsert: true
        });

      if (uploadError) {
        console.warn(`[Supabase Storage] Failed to upload ${filePath}:`, uploadError.message);
      } else {
        console.log(`[Supabase Storage] Successfully uploaded original binary to ${filePath}`);
      }
    }

    const rowData: DocumentRow = {
      id: doc.id,
      title: doc.title,
      filename: doc.filename,
      file_type: doc.fileType,
      total_pages: doc.totalPages || 1,
      raw_text: doc.rawText || '',
      clauses: doc.clauses || [],
      analysis: doc.analysis || null,
      has_original_file: Boolean(fileBuffer || doc.hasOriginalFile),
      file_path: filePath,
      updated_at: new Date().toISOString()
    };

    const { error: dbError } = await sb
      .from('documents')
      .upsert(rowData, { onConflict: 'id' });

    if (dbError) {
      console.error('[Supabase DB] Error upserting document:', dbError.message);
      return false;
    }

    console.log(`[Supabase DB] Persisted document metadata for "${doc.title}" (${doc.id}).`);
    return true;
  } catch (err) {
    console.error('[Supabase] Exception saving document:', err);
    return false;
  }
}

export async function getDocumentFromSupabase(docId: string): Promise<LegalDocument | null> {
  const sb = getSupabaseClient();
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from('documents')
      .select('*')
      .eq('id', docId)
      .maybeSingle();

    if (error) {
      console.warn(`[Supabase DB] Error fetching document ${docId}:`, error.message);
      return null;
    }
    if (!data) return null;

    return mapRowToDocument(data as DocumentRow);
  } catch (err) {
    console.error(`[Supabase DB] Exception fetching document ${docId}:`, err);
    return null;
  }
}

export async function listDocumentsFromSupabase(): Promise<LegalDocument[]> {
  const sb = getSupabaseClient();
  if (!sb) return [];

  try {
    const { data, error } = await sb
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase DB] Error listing documents:', error.message);
      return [];
    }

    return (data || []).map((row) => mapRowToDocument(row as DocumentRow));
  } catch (err) {
    console.error('[Supabase DB] Exception listing documents:', err);
    return [];
  }
}

export async function deleteDocumentFromSupabase(docId: string): Promise<boolean> {
  const sb = getSupabaseClient();
  if (!sb) return false;

  try {
    // 1. Fetch file_path if any
    const { data } = await sb
      .from('documents')
      .select('file_path')
      .eq('id', docId)
      .maybeSingle();

    if (data?.file_path) {
      await sb.storage.from('contracts').remove([data.file_path]);
    }

    // 2. Delete row from documents table (cascades to chat_messages)
    const { error } = await sb
      .from('documents')
      .delete()
      .eq('id', docId);

    if (error) {
      console.error(`[Supabase DB] Error deleting document ${docId}:`, error.message);
      return false;
    }

    console.log(`[Supabase DB] Successfully removed document ${docId}.`);
    return true;
  } catch (err) {
    console.error(`[Supabase DB] Exception deleting document ${docId}:`, err);
    return false;
  }
}

export async function getDocumentFileFromSupabase(
  docId: string
): Promise<{ buffer: Buffer; mimetype: string; filename: string } | null> {
  const sb = getSupabaseClient();
  if (!sb) return null;

  try {
    const { data: docData, error: docError } = await sb
      .from('documents')
      .select('filename, file_type, file_path')
      .eq('id', docId)
      .maybeSingle();

    if (docError || !docData?.file_path) {
      return null;
    }

    const { data: fileBlob, error: fileError } = await sb.storage
      .from('contracts')
      .download(docData.file_path);

    if (fileError || !fileBlob) {
      console.warn(`[Supabase Storage] Could not download file at ${docData.file_path}:`, fileError?.message);
      return null;
    }

    const arrayBuffer = await fileBlob.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      mimetype: docData.file_type || 'application/pdf',
      filename: docData.filename || 'document.pdf'
    };
  } catch (err) {
    console.error(`[Supabase Storage] Exception fetching file for ${docId}:`, err);
    return null;
  }
}

export async function saveChatMessageToSupabase(message: {
  id: string;
  documentId: string;
  role: string;
  content: string;
  citations?: any[];
}): Promise<boolean> {
  const sb = getSupabaseClient();
  if (!sb) return false;

  try {
    const { error } = await sb.from('chat_messages').insert({
      id: message.id,
      document_id: message.documentId,
      role: message.role,
      content: message.content,
      citations: message.citations || []
    });

    if (error) {
      console.warn('[Supabase DB] Error saving chat message:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase DB] Exception saving chat message:', err);
    return false;
  }
}

export async function getChatMessagesFromSupabase(documentId: string): Promise<any[]> {
  const sb = getSupabaseClient();
  if (!sb) return [];

  try {
    const { data, error } = await sb
      .from('chat_messages')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('[Supabase DB] Error fetching chat messages:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('[Supabase DB] Exception fetching chat messages:', err);
    return [];
  }
}
