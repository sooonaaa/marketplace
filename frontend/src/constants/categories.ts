export interface Category {
  id: string;
  name: string;
  icon: string;
}

export const CATEGORIES: Category[] = [
  { id: 'all', name: 'Все категории', icon: '📦' },
  { id: 'food', name: 'Фермерские продукты', icon: '🧀' },
  { id: 'clothes', name: 'Одежда и текстиль', icon: '👕' },
  { id: 'crafts', name: 'Ремесло и сувениры', icon: '🏺' },
  { id: 'home', name: 'Товары для дома', icon: '🏡' },
];