import { ParsedQs } from 'qs';

export type ProjectionMode = 'include' | 'exclude' | 'invalid';

export interface ParsedQueryParams {
  page: number;
  limit: number;
  search: string;
  projection: Record<string, 1 | 0>;
}

export function parseQueryParams(query: ParsedQs): ParsedQueryParams {
  const page = parseInt(query.page as string, 10) || 1;
  const limit = parseInt(query.limit as string, 10) || 10;
  const search = (query.search as string)?.trim() || '';

  const projection: Record<string, 1 | 0> = {};
  if (typeof query.fields === 'string') {
    query.fields.split(',').forEach((entry) => {
      const [key, value] = entry.split(':').map((part) => part.trim());
      if (key) projection[key] = value === '0' ? 0 : 1;
    });
  }

  return { page, limit, search, projection };
}

export function parseStandardQueryParams(body: any): {
  page: number;
  limit: number;
  searchTerm: string;
  searchFields: string[];
  filter: Record<string, any>;
  projection: Record<string, 1 | 0>;
} {
  const pagination = body.pagination || {};
  const search = body.search || {};
  const filter = body.filter || {};
  const projection = body.projection || {};

  const page = parseInt(pagination.page) || 1;
  const limit = parseInt(pagination.limit) || 10;

  const searchTerm = typeof search.term === 'string' ? search.term.trim() : '';
  const searchFields = Array.isArray(search.fields) && search.fields.length > 0
    ? search.fields
    : ['userName', 'email'];

  return {
    page,
    limit,
    searchTerm,
    searchFields,
    filter,
    projection,
  };
}

export function buildSearchFilterQuery(fields: string[], term: string) {
  if (!term || !fields || fields.length === 0) return {};

  const terms = term
    .split(/[,\s]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const orConditions: any[] = [];

  for (const field of fields) {
    for (const keyword of terms) {
      orConditions.push({ [field]: { $regex: keyword, $options: 'i' } });
    }
  }

  return orConditions.length > 0 ? { $or: orConditions } : {};
}

export function filterPopulatedDocs<T extends Record<string, any>>(
  docs: T[],
  search: string,
  populatedPaths: string[]
): T[] {
  if (!search) return docs;

  const terms = search
    .split(/[,\s]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  return docs.filter((doc) =>
    populatedPaths.some((path) => {
      const value = path
        .split('.')
        .reduce<any>((obj, key) => (obj && typeof obj === 'object' ? obj[key] : undefined), doc);

      return (
        typeof value === 'string' &&
        terms.some((t) => value.toLowerCase().includes(t))
      );
    })
  );
}

export function getPagination(page: number, limit: number) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  return {
    skip: (safePage - 1) * safeLimit,
    limit: safeLimit,
  };
}

export function buildProjection(
  projectionObj: Record<string, 1 | 0>
): { projection: Record<string, 1 | 0>; mode: ProjectionMode } {
  const keys = Object.keys(projectionObj);
  if (keys.length === 0) return { projection: {}, mode: 'include' };

  const values = Object.values(projectionObj);
  const isAllInclude = values.every((v) => v === 1 || (v === 0 && '_id' in projectionObj));
  const isAllExclude = values.every((v) => v === 0);

  if (isAllInclude && !isAllExclude) {
    return { projection: { ...projectionObj }, mode: 'include' };
  }

  if (isAllExclude) {
    return { projection: { ...projectionObj }, mode: 'exclude' };
  }

  return { projection: {}, mode: 'invalid' };
}
