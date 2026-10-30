export type ProductId = 'coins' | 'motocross' | 'bicycles' | 'clothing' | 'surplus_flip' | 'trading_cards' | 'antiques' | 'fossils' | 'beauty' | 'tech';

export interface ProductContext {
  id: ProductId;
  name: string;
  shortName: string;
  description: string;
  collectionLabel: string;
  captureLabel: string;
  accent: string;
  hostnames: string[];
}

export const PRODUCTS: ProductContext[] = [
  { id: 'coins', name: 'Coin Flipper', shortName: 'Coin Flipper', description: 'Identify, value and sell coins and collectibles.', collectionLabel: 'My Coins', captureLabel: 'Scan Coin', accent: '#F5C842', hostnames: ['coinflipper.com', 'www.coinflipper.com', 'coins.swishflip.co.uk'] },
  { id: 'motocross', name: 'MX Flipper', shortName: 'MX Flipper', description: 'Identify, value and sell motocross bikes and parts.', collectionLabel: 'My Bikes & Parts', captureLabel: 'Identify Bike or Part', accent: '#EF4444', hostnames: ['mxflipper.com', 'www.mxflipper.com', 'mx.swishflip.co.uk'] },
  { id: 'bicycles', name: 'Bike Flipper', shortName: 'Bike Flipper', description: 'Identify, value and sell bicycles and components.', collectionLabel: 'My Bikes', captureLabel: 'Identify Bike', accent: '#22C55E', hostnames: ['bikeflipper.com', 'www.bikeflipper.com', 'bikesflipper.com', 'www.bikesflipper.com', 'bikes.swishflip.co.uk'] },
  { id: 'clothing', name: 'Clothes Flipper', shortName: 'Clothes Flipper', description: 'Identify clothing, estimate prices and create listings.', collectionLabel: 'My Clothing', captureLabel: 'Add Clothing', accent: '#E91E8C', hostnames: ['clothesflipper.com', 'www.clothesflipper.com', 'clothes.swishflip.co.uk', 'threads.swishflip.co.uk'] },
  { id: 'surplus_flip', name: 'Surplus Flip', shortName: 'Surplus Flip', description: 'Match job lots and supplier manifests to resale opportunities.', collectionLabel: 'My Stock', captureLabel: 'Import Stock', accent: '#14B8A6', hostnames: ['surplusflip.com', 'www.surplusflip.com', 'surplus.swishflip.co.uk'] },
  { id: 'trading_cards', name: 'Card Flipper', shortName: 'Card Flipper', description: 'Identify, assess and sell trading cards and TCG collectibles.', collectionLabel: 'My Cards', captureLabel: 'Scan Card', accent: '#8B5CF6', hostnames: ['cards.swishflip.co.uk'] },
  { id: 'antiques', name: 'Antique Flipper', shortName: 'Antique Flipper', description: 'Research, identify and value antiques and vintage collectibles.', collectionLabel: 'My Antiques', captureLabel: 'Identify Antique', accent: '#D97706', hostnames: ['antiques.swishflip.co.uk'] },
  { id: 'fossils', name: 'Fossil Flipper', shortName: 'Fossil Flipper', description: 'Identify fossils, minerals and specimens for resale.', collectionLabel: 'My Specimens', captureLabel: 'Identify Specimen', accent: '#06B6D4', hostnames: ['fossils.swishflip.co.uk'] },
  { id: 'beauty', name: 'Beauty Flipper', shortName: 'Beauty Flipper', description: 'Identify and value beauty, fragrance and skincare products.', collectionLabel: 'My Beauty Stock', captureLabel: 'Identify Product', accent: '#F43F5E', hostnames: ['beauty.swishflip.co.uk'] },
  { id: 'tech', name: 'Tech Flipper', shortName: 'Tech Flipper', description: 'Identify, assess and value phones, consoles and gadgets.', collectionLabel: 'My Tech Stock', captureLabel: 'Identify Tech', accent: '#3B82F6', hostnames: ['tech.swishflip.co.uk'] },
];

const PATH_PRODUCT: Record<string, ProductId> = {
  '/coins': 'coins',
  '/mx': 'motocross',
  '/bikes': 'bicycles',
  '/clothes': 'clothing',
  '/threads': 'clothing',
  '/surplus': 'surplus_flip',
  '/cards': 'trading_cards',
  '/games': 'trading_cards',
  '/antiques': 'antiques',
  '/home': 'antiques',
  '/fossils': 'fossils',
  '/beauty': 'beauty',
  '/electronics': 'tech',
  '/tech': 'tech',
};

/** Production hostname is the product selector. Local development retains the existing route-based selector. */
export function getHostProduct(hostname: string = window.location.hostname): ProductContext | null {
  const host = hostname.toLowerCase().split(':')[0];
  return PRODUCTS.find(product => product.hostnames.includes(host)) || null;
}

export function getRouteProduct(pathname: string = window.location.pathname): ProductContext | null {
  const id = PATH_PRODUCT[pathname];
  return PRODUCTS.find(product => product.id === id) || null;
}

export function getProductForEntry(hostname?: string, pathname?: string): ProductContext {
  return getHostProduct(hostname) || getRouteProduct(pathname) || PRODUCTS[0];
}

export function isValidProductId(value: unknown): value is ProductId {
  return typeof value === 'string' && PRODUCTS.some(product => product.id === value);
}
