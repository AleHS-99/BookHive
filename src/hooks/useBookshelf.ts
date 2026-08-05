import { useState, useEffect } from 'react';
import { BookshelfService } from '../services/bookshelf.service';
import { Folder } from '../types';

export const useBookshelf = () => {
  const [data, setData] = useState<Folder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    BookshelfService.getBookshelf().then(folder => {
      setData(folder);
      setLoading(false);
    });
  }, []);

  return { data, loading };
};