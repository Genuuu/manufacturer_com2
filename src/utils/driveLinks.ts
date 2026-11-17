import { DriveResourceType } from '../types';

export interface ParsedDriveLink {
  isValidUrl: boolean;
  isGoogleDrive: boolean;
  resourceType: DriveResourceType;
  fileId?: string;
  normalizedUrl: string;
  previewEmbedUrl?: string;
  label: string;
}

export function normalizeUrlInput(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(drive|docs)\.google\.com/i.test(trimmed) || /^[a-z0-9.-]+\.[a-z]{2,}/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

export function parseGoogleDriveUrl(rawUrl: string): ParsedDriveLink {
  const normalizedUrl = normalizeUrlInput(rawUrl);
  if (!normalizedUrl) {
    return {
      isValidUrl: false,
      isGoogleDrive: false,
      resourceType: 'link',
      normalizedUrl: '',
      label: 'Invalid Link',
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(normalizedUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        isValidUrl: false,
        isGoogleDrive: false,
        resourceType: 'link',
        normalizedUrl,
        label: 'Unsupported Protocol',
      };
    }
  } catch {
    return {
      isValidUrl: false,
      isGoogleDrive: false,
      resourceType: 'link',
      normalizedUrl,
      label: 'Invalid URL',
    };
  }

  const host = parsed.hostname.toLowerCase();
  const fullPath = parsed.pathname;

  // Google Drive Folder: /drive/folders/{id} or /drive/u/0/folders/{id} or /folderview?id={id}
  if (host === 'drive.google.com') {
    const folderMatch = fullPath.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch) {
      const fileId = folderMatch[1];
      return {
        isValidUrl: true,
        isGoogleDrive: true,
        resourceType: 'folder',
        fileId,
        normalizedUrl,
        previewEmbedUrl: `https://drive.google.com/embeddedfolderview?id=${fileId}#list`,
        label: 'Google Drive Folder',
      };
    }

    const folderParamId = parsed.searchParams.get('id');
    if (fullPath.includes('folderview') && folderParamId) {
      return {
        isValidUrl: true,
        isGoogleDrive: true,
        resourceType: 'folder',
        fileId: folderParamId,
        normalizedUrl,
        previewEmbedUrl: `https://drive.google.com/embeddedfolderview?id=${folderParamId}#list`,
        label: 'Google Drive Folder',
      };
    }

    // Google Drive File: /file/d/{id}/... or /open?id={id} or /uc?id={id}
    const fileMatch = fullPath.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    const paramId = parsed.searchParams.get('id');
    const fileId = fileMatch ? fileMatch[1] : paramId || undefined;

    if (fileId) {
      return {
        isValidUrl: true,
        isGoogleDrive: true,
        resourceType: 'file',
        fileId,
        normalizedUrl,
        previewEmbedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        label: 'Google Drive File',
      };
    }

    return {
      isValidUrl: true,
      isGoogleDrive: true,
      resourceType: 'link',
      normalizedUrl,
      label: 'Google Drive Link',
    };
  }

  // Google Docs / Sheets / Slides
  if (host === 'docs.google.com') {
    const docMatch = fullPath.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
    if (docMatch) {
      const fileId = docMatch[1];
      return {
        isValidUrl: true,
        isGoogleDrive: true,
        resourceType: 'doc',
        fileId,
        normalizedUrl,
        previewEmbedUrl: `https://docs.google.com/document/d/${fileId}/preview`,
        label: 'Google Doc',
      };
    }

    const sheetMatch = fullPath.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (sheetMatch) {
      const fileId = sheetMatch[1];
      return {
        isValidUrl: true,
        isGoogleDrive: true,
        resourceType: 'sheet',
        fileId,
        normalizedUrl,
        previewEmbedUrl: `https://docs.google.com/spreadsheets/d/${fileId}/preview`,
        label: 'Google Sheet',
      };
    }

    const slideMatch = fullPath.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
    if (slideMatch) {
      const fileId = slideMatch[1];
      return {
        isValidUrl: true,
        isGoogleDrive: true,
        resourceType: 'slides',
        fileId,
        normalizedUrl,
        previewEmbedUrl: `https://docs.google.com/presentation/d/${fileId}/preview`,
        label: 'Google Slides',
      };
    }

    return {
      isValidUrl: true,
      isGoogleDrive: true,
      resourceType: 'doc',
      normalizedUrl,
      label: 'Google Docs Link',
    };
  }

  return {
    isValidUrl: true,
    isGoogleDrive: false,
    resourceType: 'link',
    normalizedUrl,
    label: 'External Link',
  };
}
