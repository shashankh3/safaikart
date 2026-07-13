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
