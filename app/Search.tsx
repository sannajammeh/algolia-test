"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchClient } from "@/lib/algolia";
import {
  BaseHit,
  Index,
  SearchResponse,
  useAlgolia,
  useAlgoliaInfinite,
  useInstantSearch,
  useInstantSearchIndices,
} from "@/lib/useAlgolia";
import React, { useDeferredValue, useMemo, useState } from "react";

interface Product extends BaseHit {
  name: string;
}

interface Page extends BaseHit {
  title: string;
}

export const Search = () => {
  const { ref, results } = useInstantSearch<Product>({
    searchClient,
    index: "ecommerce",
  });

  const { ref: pageRef, results: pages } = useInstantSearch<Page>({
    index: "pages",
    searchClient,
  });

  return (
    <div>
      <Input
        className="sticky top-0 mb-4 z-10 bg-white"
        ref={(el) => {
          if (!el) return;

          ref.current = el;
          pageRef.current = el;
        }}
        placeholder="search products"
      />

      <div className="space-y-2">
        <ProductsResult products={results} />
        <PagesResult pages={pages} />
      </div>
    </div>
  );
};

const PagesResult = ({ pages }: { pages: Page[] }) => {
  return (
    <div className="max-h-[300px] overflow-auto">
      <p className="text-lg font-bold">Pages</p>
      <ul className="space-y-2 px-2">
        {pages.map((page) => (
          <li key={page.objectID}>{page.title}</li>
        ))}
      </ul>
    </div>
  );
};

const ProductsResult = ({ products }: { products: Product[] }) => {
  return (
    <div className="max-h-[300px] overflow-auto">
      <p className="text-lg font-bold">Products</p>
      <ul className="space-y-2 px-2">
        {products.map((product) => (
          <li key={product.objectID}>{product.name}</li>
        ))}
      </ul>
    </div>
  );
};

const pageIndex = new Index<Page>("pages");
const productIndex = new Index<Product>("ecommerce");

export const GroupedSearch = () => {
  const { ref, results } = useInstantSearchIndices(searchClient, {
    products: productIndex,
    pages: pageIndex,
  });

  return (
    <div>
      <Input
        className="sticky top-0 mb-4 z-10 bg-white"
        ref={ref}
        placeholder="search products"
      />
      <div className="space-y-2">
        <ProductsResult products={results.products} />
        <PagesResult pages={results.pages} />
      </div>
    </div>
  );
};

export const NormalResult = () => {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const { data, isFetching } = useAlgolia({
    client: searchClient,
    indices: [new Index<Product>("ecommerce"), new Index<Page>("pages")],
    query: deferredQuery,
  });

  return (
    <div>
      <Input
        placeholder="search products"
        onChange={(e) => setQuery(e.target.value)}
      />

      {!!data?.length && <RenderData data={data} />}
    </div>
  );
};

const RenderData = ({
  data,
}: {
  data: [SearchResponse<Product>, SearchResponse<Page>];
}) => {
  const [products, pages] = data;
  return (
    <div className="space-y-2">
      <ProductsResult products={products.hits} />
      <PagesResult pages={pages.hits} />
    </div>
  );
};

export const InfiniteResult = () => {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const { data, hasNextPage, fetchNextPage } = useAlgoliaInfinite({
    query: deferredQuery,
    index: new Index<Product>("ecommerce"),
    client: searchClient,
    searchParams: {},
    hitsPerPage: 5,
  });

  const flattenedPages = useMemo(() => {
    return data?.pages.flatMap((page) => page.hits);
  }, [data]);

  console.log(data);

  return (
    <div>
      <Input
        placeholder="search products"
        onChange={(e) => setQuery(e.target.value)}
      />

      {!!flattenedPages?.length && <ProductsResult products={flattenedPages} />}

      {hasNextPage && (
        <Button onClick={() => fetchNextPage()}>Load more</Button>
      )}
    </div>
  );
};
