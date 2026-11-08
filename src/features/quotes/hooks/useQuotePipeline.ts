import { useMemo } from 'react';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';

import {
  checkQuoteRequestCustomers,
  listQuoteRequests,
  listQuotes,
  resolvePrestaShopCustomersBatch,
} from '@/api/hubCustomerQuotes';
import type {
  CustomerCheckResult,
  PrestaCustomerHit,
  QuoteRequestSummary,
  QuoteSummary,
} from '@/types/hubCustomerQuotes';

import {
  buildDemandeItem,
  buildDevisItem,
  isDemandeVisible,
  isQuoteStatusSegment,
  type PipelineItem,
  type SegmentId,
} from '../pipeline';
import { QUOTES_COUNTS_KEY, quotesPipelineKey } from '../queryKeys';

const PAGE_SIZE = 25;
/** Archives : fusion de quatre listes, plafonnée comme sur le web (une seule page de 100). */
const ARCHIVE_LIMIT = 100;

type PipelinePage = { items: PipelineItem[]; page: number; totalPages: number };

async function resolvePsCustomers(
  quotes: QuoteSummary[],
): Promise<Record<string, PrestaCustomerHit>> {
  // Seuls les devis sans libellé ont besoin de la résolution du client PrestaShop.
  const ids = quotes
    .filter((q) => q.customerPrestashopId != null && !q.customerLabel)
    .map((q) => q.customerPrestashopId as string | number);
  if (ids.length === 0) return {};
  try {
    return await resolvePrestaShopCustomersBatch(ids);
  } catch {
    return {};
  }
}

async function checkCustomers(
  rows: QuoteRequestSummary[],
): Promise<Record<string, CustomerCheckResult>> {
  const emails = [...new Set(rows.map((r) => r.email).filter(Boolean))];
  if (emails.length === 0) return {};
  try {
    return await checkQuoteRequestCustomers(emails);
  } catch {
    return {};
  }
}

const byCreatedDesc = (a: PipelineItem, b: PipelineItem) =>
  (b.createdAt || '').localeCompare(a.createdAt || '');

async function fetchPage(segment: SegmentId, page: number, search: string): Promise<PipelinePage> {
  const q = search || undefined;

  if (segment === 'DEMANDES') {
    const res = await listQuoteRequests({ page, limit: PAGE_SIZE, search: q });
    const customers = await checkCustomers(res.data);
    const totalPages = Number(res.meta?.totalPages ?? 1) || 1;
    return {
      items: res.data.filter(isDemandeVisible).map((row) => buildDemandeItem(row, customers)),
      page,
      totalPages,
    };
  }

  if (isQuoteStatusSegment(segment)) {
    const res = await listQuotes({ page, limit: PAGE_SIZE, status: segment, search: q });
    const ps = await resolvePsCustomers(res.data);
    return {
      items: res.data.map((row) => buildDevisItem(row, ps)),
      page,
      totalPages: res.meta?.totalPages ?? 1,
    };
  }

  // ARCHIVES : devis refusés / expirés + demandes archivées / refusées, triés par date.
  const [refused, expired, archived, rejected] = await Promise.all([
    listQuotes({ page: 1, limit: ARCHIVE_LIMIT, status: 'REFUSE', search: q }),
    listQuotes({ page: 1, limit: ARCHIVE_LIMIT, status: 'EXPIRE', search: q }),
    listQuoteRequests({ page: 1, limit: ARCHIVE_LIMIT, status: 'ARCHIVEE', search: q }),
    listQuoteRequests({ page: 1, limit: ARCHIVE_LIMIT, status: 'REFUSEE', search: q }),
  ]);
  const requests = [...archived.data, ...rejected.data];
  const [ps, customers] = await Promise.all([
    resolvePsCustomers([...refused.data, ...expired.data]),
    checkCustomers(requests),
  ]);
  const items = [
    ...refused.data.map((row) => buildDevisItem(row, ps)),
    ...expired.data.map((row) => buildDevisItem(row, ps)),
    ...requests.map((row) => buildDemandeItem(row, customers)),
  ].sort(byCreatedDesc);
  return { items, page: 1, totalPages: 1 };
}

/** Liste d'un segment du pipeline, paginée (défilement infini) et filtrée par la recherche. */
export function useQuotePipeline(segment: SegmentId, search: string) {
  const query = useInfiniteQuery<PipelinePage>({
    queryKey: quotesPipelineKey(segment, search),
    queryFn: ({ pageParam }) => fetchPage(segment, pageParam as number, search),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });

  const items = useMemo<PipelineItem[]>(() => {
    const seen = new Set<string>();
    const out: PipelineItem[] = [];
    for (const page of query.data?.pages ?? []) {
      for (const item of page.items) {
        const key = `${item.kind}:${item.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(item);
      }
    }
    return out;
  }, [query.data]);

  return {
    items,
    loading: query.isPending,
    error: query.error,
    refetch: query.refetch,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isRefetching: query.isFetching && !query.isFetchingNextPage && !query.isPending,
  };
}

type Counts = Record<SegmentId, number | undefined>;

function total(r: { meta?: { total?: unknown } }): number {
  const v = r.meta?.total;
  return typeof v === 'number' ? v : 0;
}

async function fetchCounts(): Promise<Counts> {
  const one = (status: string) => listQuotes({ page: 1, limit: 1, status });
  const [br, en, ac, co, re, ex, an, requests, archived, rejected] = await Promise.all([
    one('BROUILLON'),
    one('ENVOYE'),
    one('ACCEPTE'),
    one('CONVERTED'),
    one('REFUSE'),
    one('EXPIRE'),
    one('ANNULE'),
    listQuoteRequests({ page: 1, limit: 200 }),
    listQuoteRequests({ page: 1, limit: 1, status: 'ARCHIVEE' }),
    listQuoteRequests({ page: 1, limit: 1, status: 'REFUSEE' }),
  ]);
  return {
    DEMANDES: requests.data.filter(isDemandeVisible).length,
    BROUILLON: total(br),
    ENVOYE: total(en),
    ACCEPTE: total(ac),
    CONVERTED: total(co),
    ANNULE: total(an),
    ARCHIVES: total(re) + total(ex) + total(archived) + total(rejected),
  };
}

/** Compteurs de la barre de segments, rechargés à chaque invalidation de `hub-customer-quotes`. */
export function useSegmentCounts() {
  return useQuery({
    queryKey: QUOTES_COUNTS_KEY,
    queryFn: fetchCounts,
    staleTime: 30_000,
  });
}
