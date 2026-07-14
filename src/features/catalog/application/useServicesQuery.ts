import { useQuery } from '@tanstack/react-query';
import { CatalogRepository } from '../infrastructure/CatalogRepository';

export const useCategoriesQuery = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => CatalogRepository.getCategories(),
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
};

export const useServicesQuery = () => {
  return useQuery({
    queryKey: ['services'],
    queryFn: () => CatalogRepository.getServices(),
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
};

export const useCatalogV2Query = () => {
  return useQuery({
    queryKey: ['catalog_v2'],
    queryFn: () => CatalogRepository.getFullCatalogV2(),
    staleTime: 0, // Force refetch on every mount during development
  });
};
