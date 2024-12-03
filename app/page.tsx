import { GroupedSearch, InfiniteResult, NormalResult, Search } from "./Search";

export default function Home() {
  return (
    <div className="sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h1 className="text-xl">useInstantSearch()</h1>

          <Search />
        </div>
        <div>
          <h1 className="text-xl">useInstantSearchIndices()</h1>

          <GroupedSearch />
        </div>

        <div>
          <h1 className="text-xl">useAlgolia()</h1>

          <NormalResult />
        </div>
        <div>
          <h1 className="text-xl">useAlgoliaInfinite()</h1>

          <InfiniteResult />
        </div>
      </div>
    </div>
  );
}
