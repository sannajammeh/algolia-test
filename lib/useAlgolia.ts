"use client";

import {
  useState,
  startTransition,
  useRef,
  useEffect,
  MutableRefObject,
} from "react";
import instantsearch from "instantsearch.js";
import { connectSearchBox } from "instantsearch.js/es/connectors";
import { connectHits } from "instantsearch.js/es/connectors";
import { SearchResponse, type Hit } from "algoliasearch/lite";
import { useShallowEffect } from "@mantine/hooks";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { SearchParams } from "algoliasearch/lite";
import { SearchClient } from "algoliasearch";

export type { SearchResponse, Hit, SearchClient };

interface UseInstantSearchProps {
  searchClient: SearchClient;
  index: string;
}

interface UseInstantSearchResult<T> {
  ref: MutableRefObject<HTMLInputElement>;
  results: Hit<T>[];
}

function bindAlgoliaIndex<T>({
  el,
  searchClient,
  index,
  onResult,
}: {
  el: HTMLInputElement;
  searchClient: SearchClient;
  index: Index<T>;
  onResult: (value: Hit<T>[]) => void;
}) {
  const search = instantsearch({
    indexName: index.name,
    searchClient,
    future: {
      preserveSharedStateOnUnmount: true,
    },
  });

  let unsubscribe: () => void = () => {};

  const seachbox = connectSearchBox(({ refine }, isFirstRender) => {
    if (isFirstRender) {
      const handler = (e: Event) => {
        if (!e.target) return;
        refine((e.target as HTMLInputElement).value);
      };
      el.addEventListener("input", handler);

      unsubscribe = () => {
        el.removeEventListener("input", handler);
      };
    }
  });

  const hits = connectHits((options, isFirstRender) => {
    if (isFirstRender) return;

    startTransition(() => {
      onResult(options.items as Hit<T>[]);
    });
  });

  search.addWidgets([seachbox({}), hits({})]);

  search.start();

  return () => {
    unsubscribe();
    search.dispose();
  };
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export const useInstantSearch = <T = {}>({
  searchClient,
  index: indexName,
}: UseInstantSearchProps): UseInstantSearchResult<T> => {
  const [results, setResults] = useState<Hit<T>[]>([]);
  const ref = useRef<HTMLInputElement>(null!);

  useEffect(() => {
    if (!ref.current) return;

    const unsubscribe = bindAlgoliaIndex({
      el: ref.current,
      searchClient,
      index: new Index(indexName),
      onResult: setResults,
    });

    return unsubscribe;
  }, [indexName, searchClient]);

  return { ref, results };
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-object-type
class Index<T = {}> {
  constructor(public name: string) {}
}

type FindIndexType<T extends Index> = T extends Index<infer U> ? U : never;

export const useInstantSearchIndices = <
  U extends Record<string, Index<unknown>>
>(
  searchClient: SearchClient,
  indices: U
) => {
  const ref = useRef<HTMLInputElement | null>(null!);
  type FindIndexType<Key extends keyof U> = U[Key] extends Index<infer T>
    ? T
    : never;

  type Results = {
    [key in keyof U]: FindIndexType<key>[];
  };
  const [result, setResults] = useState<Results>(() => {
    return Object.fromEntries(
      Object.entries(indices).map(([key]) => [key, []])
    ) as unknown as Results;
  });

  useShallowEffect(() => {
    if (!ref.current) return;
    const el = ref.current;

    const unsubscribes = Object.entries(indices).map(([key, index]) => {
      const unsubscribe = bindAlgoliaIndex({
        el,
        searchClient,
        index,
        onResult: (results) => {
          setResults((prev) => ({ ...prev, [key]: results } as Results));
        },
      });
      return unsubscribe;
    });

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [indices, searchClient]);

  return { ref, results: result };
};

export { Index };

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type BaseHit = Hit<{}>;

export type MappedResult<
  N extends Index[],
  Acc extends SearchResponse[] = []
> = N["length"] extends Acc["length"]
  ? Acc
  : MappedResult<N, [...Acc, SearchResponse<FindIndexType<N[Acc["length"]]>>]>;

export const useAlgolia = <const T extends Index[]>({
  client,
  indices,
  query,
  hitsPerPage,
  page,
  immediate: immediate = false,
}: {
  client: SearchClient;
  indices: T;
  query: string;
  hitsPerPage?: number;
  page?: number;
  immediate?: boolean;
}) => {
  return useQuery({
    queryKey: ["search", indices, query, hitsPerPage, page, immediate],
    queryFn: async () => {
      const data = await client.search(
        indices.map((i) => ({
          indexName: i.name,
          params: {
            query,
            hitsPerPage,
            page,
          },
        }))
      );

      // I want the type to be matching the type of indices so if the index type is [Index<Product>, Index<Page>] then the data type should be [SearchResponse<Product>, SearchResponse<Page>]

      return data.results as MappedResult<T>;
    },
    enabled: !immediate ? !!query.length : true,
  });
};

export const useAlgoliaInfinite = <const T extends Index>({
  query,
  index,
  client,
  hitsPerPage,
  immediate = false,
}: {
  client: SearchClient;
  index: T;
  query: string;
  searchParams: SearchParams;
  hitsPerPage?: number;
  immediate?: boolean;
}) => {
  return useInfiniteQuery({
    queryKey: ["search-infinite", index, query],
    queryFn: async ({ pageParam }) => {
      const data = await client.searchSingleIndex({
        indexName: index.name,
        searchParams: {
          query,
          page: pageParam,
          hitsPerPage,
        },
      });

      return data as SearchResponse<FindIndexType<T>>;
    },
    initialPageParam: 0,
    getNextPageParam: (data) => {
      const hasMorePages = (data.nbPages ?? 0) > (data.page ?? 0);

      if (!hasMorePages) {
        return null;
      }

      return (data.page ?? 0) + 1;
    },
    enabled: !immediate ? !!query.length : true,
  });
};
