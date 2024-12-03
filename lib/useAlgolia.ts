import { useState, startTransition, useCallback } from "react";
import instantsearch, { SearchClient } from "instantsearch.js";
import { connectSearchBox } from "instantsearch.js/es/connectors";
import { connectHits } from "instantsearch.js/es/connectors";
import { type Hit } from "algoliasearch/lite";

interface UseInstantSearchProps {
  searchClient: SearchClient;
  indexName: string;
}

interface UseInstantSearchResult<T> {
  refCallback: (el: HTMLInputElement | null) => (() => void) | undefined;
  results: Hit<T>[];
}

export const useInstantSearch = <T>({
  searchClient,
  indexName,
}: UseInstantSearchProps): UseInstantSearchResult<T> => {
  const [results, setResults] = useState<Hit<T>[]>([]);

  const refCallback = useCallback(
    (el: HTMLInputElement | null) => {
      if (!el) {
        if (process.env.NODE_ENV === "development") {
          console.warn("useInstantSearch: ref is null");
        }
        return;
      }
      const search = instantsearch({
        indexName,
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

      const hits = connectHits((options) => {
        startTransition(() => {
          setResults(options.items as Hit<T>[]);
        });
      });

      search.addWidgets([seachbox({}), hits({})]);

      search.start();

      return () => {
        unsubscribe();
        search.dispose();
      };
    },
    [searchClient, indexName]
  );

  return { refCallback, results };
};
