import { useQuery } from '@tanstack/react-query';
import { CatalogRepository } from '../infrastructure/CatalogRepository';

export const useCatalogV2Query = () => {
  return useQuery({
    queryKey: ['catalog_v2'],
    queryFn: () => CatalogRepository.getFullCatalogV2(),
    staleTime: 0, // Force refetch on every mount during development
  });
};
