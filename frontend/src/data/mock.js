// Retro Farms mock data
export const PRODUCTS = [
  {
    slug: 'country-eggs',
    name: 'Country Eggs (Free Range)',
    category: 'eggs',
    image: 'https://images.unsplash.com/photo-1498654077810-12c21d4d6dc3?auto=format&fit=crop&w=1000&q=80',
    fromPrice: 180,
    description: 'Farm-fresh brown eggs from free-roaming country hens. Naturally rich yolks, no antibiotics, no cages.',
    variants: [
      { id: 'dozen', label: '1 Dozen (12 eggs)', price: 180, stock: 194 },
      { id: 'tray', label: '1 Tray (30 eggs)', price: 420, stock: 118 },
    ],
  },
  {
    slug: 'country-chicken',
    name: 'Country Chicken (Live Weight)',
    category: 'chicken',
    image: 'https://images.unsplash.com/photo-1535275226173-7ee8b465f0c1?auto=format&fit=crop&w=1000&q=80',
    fromPrice: 340,
    description: 'Free-range country chicken raised on grains and greens. Sold by live weight, cleaned & delivered same day.',
    variants: [
      { id: '1kg', label: '1 kg (approx.)', price: 340, stock: 22 },
      { id: '2kg', label: '2 kg (approx.)', price: 660, stock: 14 },
    ],
  },
  {
    slug: 'alphonso-mango',
    name: 'Alphonso Mango',
    category: 'fruits',
    image: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=1000&q=80',
    fromPrice: 220,
    description: 'Sun-ripened Alphonso mangoes from our orchard. Sweet, aromatic and naturally grown.',
    variants: [
      { id: '1kg', label: '1 kg', price: 220, stock: 46 },
      { id: '3kg', label: '3 kg box', price: 620, stock: 20 },
    ],
  },
  {
    slug: 'guava',
    name: 'Guava',
    category: 'fruits',
    image: 'https://images.unsplash.com/photo-1536511132770-e5058c7e8c46?auto=format&fit=crop&w=1000&q=80',
    fromPrice: 90,
    description: 'Crisp, farm-picked guavas. Pesticide-free and packed with vitamin C.',
    variants: [
      { id: '1kg', label: '1 kg', price: 90, stock: 60 },
      { id: '2kg', label: '2 kg', price: 170, stock: 30 },
    ],
  },
  {
    slug: 'lemon',
    name: 'Lemon',
    category: 'fruits',
    image: 'https://images.unsplash.com/photo-1590502593747-42a996133562?auto=format&fit=crop&w=1000&q=80',
    fromPrice: 60,
    description: 'Juicy country lemons — thin skin, plenty of juice, chemical-free.',
    variants: [
      { id: '500g', label: '500 g', price: 60, stock: 80 },
      { id: '1kg', label: '1 kg', price: 110, stock: 55 },
    ],
  },
  {
    slug: 'sapota',
    name: 'Sapota (Chiku)',
    category: 'fruits',
    image: 'https://images.unsplash.com/photo-1610970881699-44a5587cabec?auto=format&fit=crop&w=1000&q=80',
    fromPrice: 110,
    description: 'Naturally-ripened sapota — soft, sweet and grown on our farm.',
    variants: [
      { id: '1kg', label: '1 kg', price: 110, stock: 40 },
    ],
  },
  {
    slug: 'papaya',
    name: 'Papaya',
    category: 'fruits',
    image: 'https://images.unsplash.com/photo-1617112848923-cc2234396a8d?auto=format&fit=crop&w=1000&q=80',
    fromPrice: 80,
    description: 'Tree-ripened papayas, orange fleshed and full of flavor.',
    variants: [
      { id: 'each', label: '1 piece (approx 1kg)', price: 80, stock: 25 },
    ],
  },
  {
    slug: 'moringa',
    name: 'Moringa (Drumsticks)',
    category: 'vegetables',
    image: 'https://images.unsplash.com/photo-1666904854830-c5c0e7b6f6f1?auto=format&fit=crop&w=1000&q=80',
    fromPrice: 45,
    description: 'Fresh drumsticks from farm moringa trees. Ideal for sambar and curries.',
    variants: [
      { id: '250g', label: '250 g bunch', price: 45, stock: 70 },
    ],
  },
  {
    slug: 'bottle-gourd',
    name: 'Bottle Gourd',
    category: 'vegetables',
    image: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?auto=format&fit=crop&w=1000&q=80',
    fromPrice: 50,
    description: 'Tender bottle gourds, hand-picked and pesticide-free.',
    variants: [
      { id: 'each', label: '1 piece', price: 50, stock: 34 },
    ],
  },
  {
    slug: 'tomatoes',
    name: 'Tomatoes',
    category: 'vegetables',
    image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=1000&q=80',
    fromPrice: 55,
    description: 'Vine-ripened country tomatoes bursting with flavor.',
    variants: [
      { id: '1kg', label: '1 kg', price: 55, stock: 90 },
    ],
  },
  {
    slug: 'green-chilli',
    name: 'Green Chilli',
    category: 'vegetables',
    image: 'https://images.unsplash.com/photo-1526346093744-3d4b6ee7f2f5?auto=format&fit=crop&w=1000&q=80',
    fromPrice: 30,
    description: 'Farm-grown green chillies with a mild, aromatic heat.',
    variants: [
      { id: '250g', label: '250 g', price: 30, stock: 65 },
    ],
  },
];

export const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'eggs', label: 'Country Eggs' },
  { id: 'chicken', label: 'Country Chicken' },
  { id: 'fruits', label: 'Fruits' },
  { id: 'vegetables', label: 'Vegetables' },
];

export const FARMERS = [
  {
    initials: 'V',
    name: 'Dr. Venkat',
    creds: 'M.Sc, Ph.D in Chemistry',
    role: 'Founder & Farm Director',
  },
  {
    initials: 'AR',
    name: 'Mr. Avudoddi Ramakrishna',
    creds: 'MBA',
    role: 'Operations & Distribution',
  },
  {
    initials: 'AM',
    name: 'Mr. Avudoddi Mallikarjun',
    creds: 'M.Sc, Ph.D in Chemistry',
    role: 'Livestock & Nutrition Lead',
  },
];

export const MOCK_ORDERS = [
  {
    id: 'd14906d4',
    email: 'myselfteju4@gmail.com',
    items: 2,
    total: 580,
    payment: 'Cod',
    paymentStatus: 'Cod Pending',
    assignedTo: 'Unassigned',
    status: 'Placed',
    placed: '7/13/2026',
  },
  {
    id: '5dc5558c',
    email: 'cod2_1783582523@test.com',
    items: 1,
    total: 540,
    payment: 'Cod',
    paymentStatus: 'Cod Pending',
    assignedTo: 'Retro Farms Staff',
    status: 'Cancelled',
    placed: '7/9/2026',
  },
  {
    id: '0f852904',
    email: 'cod2_1783582523@test.com',
    items: 1,
    total: 280,
    payment: 'Cod',
    paymentStatus: 'Paid',
    assignedTo: 'Unassigned',
    status: 'Delivered',
    placed: '7/9/2026',
  },
  {
    id: '27bcd8b5',
    email: 'myselfteju4@gmail.com',
    items: 1,
    total: 380,
    payment: 'Razorpay',
    paymentStatus: 'Paid',
    assignedTo: 'Unassigned',
    status: 'Placed',
    placed: '7/8/2026',
  },
  {
    id: '23d368eb',
    email: 'myselfteju4@gmail.com',
    items: 1,
    total: 840,
    payment: 'Razorpay',
    paymentStatus: 'Paid',
    assignedTo: 'Unassigned',
    status: 'On The Way',
    placed: '7/7/2026',
  },
];

export const MOCK_CUSTOMERS = [
  { name: 'tej', phone: '1234567890', email: 'myselfteju4@gmail.com', orders: 3, totalSpent: 1800 },
  { name: 'COD Test', phone: '9999999999', email: 'cod2_1783582523@test.com', orders: 2, totalSpent: 820 },
];

export const MOCK_STAFF = [
  { name: 'Retro Farms Admin', email: 'admin@retrofarms.in', role: 'Admin', phone: '—' },
  { name: 'Retro Farms Staff', email: 'staff@retrofarms.in', role: 'Staff', phone: '—' },
  { name: 'Rahul Kumar', email: 'rahul@retrofarms.in', role: 'Staff', phone: '9999900000' },
];

export const ADMIN_STATS = {
  revenue: 2620,
  orders: 5,
  pending: 3,
  products: 11,
  customers: 2,
};

export const ADMIN_CREDENTIALS = {
  admin: { email: 'admin@retrofarms.in', password: 'admin123', name: 'Retro Farms Admin', role: 'admin' },
  staff: { email: 'staff@retrofarms.in', password: 'staff123', name: 'Retro Farms Staff', role: 'staff' },
};
