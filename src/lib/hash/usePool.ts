import { useQuery } from "@tanstack/react-query";
import { getPoolReading } from "./pool.functions";

export function usePool() {
  return useQuery({ queryKey: ["pool"], queryFn: () => getPoolReading(), refetchInterval: 60_000, staleTime: 55_000 });
}
