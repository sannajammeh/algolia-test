"use client";

import { Input } from "@/components/ui/input";
import { searchClient } from "@/lib/algolia";
import { useInstantSearch } from "@/lib/useAlgolia";
import React from "react";

export const Search = () => {
  const { refCallback, results } = useInstantSearch({
    searchClient,
    indexName: "ecommerce",
  });

  console.log(results);
  return (
    <div>
      <Input ref={refCallback} placeholder="search products" />
    </div>
  );
};
