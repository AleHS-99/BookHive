import { Folder } from '../types';

export const mockBookshelf: Folder = {
  id: 'root',
  name: 'Root',
  type: 'folder',
  count: 0,
  children: [
    {
      id: 'fiction',
      name: 'Fiction',
      type: 'folder',
      count: 5,
      children: [
        {
          id: 'classics',
          name: 'Classics',
          type: 'folder',
          count: 3,
          children: [
            { id: '1984', title: '1984', author: 'George Orwell', imageUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=100&h=150' },
            { id: 'pp', title: 'Pride and Prejudice', author: 'Jane Austen', imageUrl: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=100&h=150' },
            { id: 'gatsby', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', imageUrl: 'https://images.unsplash.com/photo-1543002588-6e0922c4dc83?auto=format&fit=crop&q=80&w=100&h=150' }
          ]
        },
        {
          id: 'contemporary',
          name: 'Contemporary',
          type: 'folder',
          count: 2,
          children: []
        }
      ]
    },
    {
      id: 'non-fiction',
      name: 'Non-Fiction',
      type: 'folder',
      count: 4,
      children: []
    },
    {
      id: 'personal-dev',
      name: 'Personal Development',
      type: 'folder',
      count: 3,
      children: []
    },
    {
      id: 'science',
      name: 'Science',
      type: 'folder',
      count: 2,
      children: []
    }
  ]
};