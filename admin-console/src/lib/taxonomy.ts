import {
  Shirt,
  Wind,
  WashingMachine,
  Footprints,
  Sofa,
  Sparkles,
  User,
  UserRound,
  Baby,
  Users,
  Home,
  type LucideIcon,
} from "lucide-react";

export type ServiceTypeKey =
  | "dry-cleaning"
  | "steam-press"
  | "laundry"
  | "shoe-care"
  | "household"
  | "premium";

export type GenderKey = "men" | "women" | "kids" | "unisex" | "home";

export type ServiceTypeDef = {
  key: ServiceTypeKey;
  name: string;
  tagline: string;
  icon: LucideIcon;
  accent: string;
  keywords: string[];
};

export type GenderDef = {
  key: GenderKey;
  name: string;
  description: string;
  icon: LucideIcon;
  keywords: string[];
};

const BRAND_ACCENT = "from-brand to-brand/80";

export const SERVICE_TYPES: ServiceTypeDef[] = [
  {
    key: "dry-cleaning",
    name: "Dry Cleaning",
    tagline: "Delicate care for suits, sarees & premium wear",
    icon: Shirt,
    accent: BRAND_ACCENT,
    keywords: ["dry clean", "dry-clean", "dryclean", "dc"],
  },
  {
    key: "steam-press",
    name: "Steam Press",
    tagline: "Crisp, wrinkle-free finish for every day",
    icon: Wind,
    accent: BRAND_ACCENT,
    keywords: ["press", "iron", "steam"],
  },
  {
    key: "laundry",
    name: "Wash & Fold",
    tagline: "Everyday laundry, washed and folded",
    icon: WashingMachine,
    accent: BRAND_ACCENT,
    keywords: ["wash", "laundry", "fold"],
  },
  {
    key: "shoe-care",
    name: "Shoe Care",
    tagline: "Cleaning & polish for shoes and bags",
    icon: Footprints,
    accent: BRAND_ACCENT,
    keywords: ["shoe", "shoes", "sneaker", "sneakers", "boot", "boots", "sandal", "sandals", "heel", "heels", "loafer", "loafers", "slipper", "slippers", "footwear", "handbag", "purse", "wallet", "belt"],
  },
  {
    key: "household",
    name: "Household",
    tagline: "Curtains, bedding, carpets & more",
    icon: Sofa,
    accent: BRAND_ACCENT,
    keywords: ["curtain", "bedsheet", "blanket", "carpet", "sofa", "pillow", "cushion", "quilt"],
  },
  {
    key: "premium",
    name: "Premium Care",
    tagline: "Speciality treatments and finishes",
    icon: Sparkles,
    accent: BRAND_ACCENT,
    keywords: ["premium", "special", "designer", "luxury"],
  },
];

export const GENDERS: GenderDef[] = [
  {
    key: "men",
    name: "Men",
    description: "Shirts, trousers, kurtas, suits",
    icon: User,
    keywords: ["men", "mens", "gents", "male", "boy", "boys"],
  },
  {
    key: "women",
    name: "Women",
    description: "Sarees, kurtis, dresses, suits",
    icon: UserRound,
    keywords: [
      "women", "womens", "ladies", "female", "girl", "girls",
      "saree", "sari", "kurti", "kurta set", "lehenga", "dupatta", "chunni",
      "gown", "frock", "dress", "skirt", "blouse", "choli", "petticoat",
      "salwar", "churidar", "anarkali", "sharara", "gharara", "palazzo",
      "jumpsuit", "one piece", "one-piece", "western one piece", "co-ord",
      "co ord", "coord", "nighty", "maxi", "leggings", "tunic", "top",
      "heel", "heels", "handbag", "purse", "clutch",
    ],
  },
  {
    key: "kids",
    name: "Kids",
    description: "Clothes for children",
    icon: Baby,
    keywords: ["kid", "kids", "child", "children", "infant", "baby"],
  },
  {
    key: "unisex",
    name: "Unisex",
    description: "Jackets, sweaters & everyday wear",
    icon: Users,
    keywords: ["unisex", "jacket", "sweater", "coat", "hoodie", "tshirt", "t-shirt", "jeans", "sweatshirt", "windcheater", "raincoat", "tracksuit"],
  },
  {
    key: "home",
    name: "Home",
    description: "Household fabrics & bedding",
    icon: Home,
    keywords: ["household", "curtain", "curtains", "bedsheet", "blanket", "carpet", "sofa", "pillow", "cushion", "quilt", "dohar", "mattress", "blinds", "rug", "home"],
  },
];


export const SERVICE_TYPE_MAP = new Map(SERVICE_TYPES.map((s) => [s.key, s]));
export const GENDER_MAP = new Map(GENDERS.map((g) => [g.key, g]));

// Regex-based inference has been removed to ensure consistency with the mobile app,
// which strictly relies on Firestore fields (serviceType, gender, categoryId).



export function resolveServiceType(explicit: unknown, ..._contextText: string[]): ServiceTypeKey {
  if (typeof explicit === "string" && SERVICE_TYPE_MAP.has(explicit as ServiceTypeKey)) {
    return explicit as ServiceTypeKey;
  }
  return "steam-press"; // Default fallback if missing from DB
}

// Resolves to a single gender bucket; ambiguous items land in "unisex" as a
// last resort. Prefer `matchesGender` when filtering, so ambiguous items can
// appear under both Men and Women without polluting Unisex.
export function resolveGender(explicit: unknown, ..._contextText: string[]): GenderKey {
  if (typeof explicit === "string" && GENDER_MAP.has(explicit as GenderKey)) {
    return explicit as GenderKey;
  }
  return "unisex"; // Default fallback if missing from DB
}

// Filter-time gender match. Rules:
// - Explicit gender on the item is authoritative.
// - Otherwise infer from text. If inference is confident, match that bucket.
// - If inference is ambiguous (null), show under BOTH men and women, but never
//   under unisex/kids/home — those require a positive signal.
export function matchesGender(
  target: GenderKey,
  explicit: unknown,
  ..._contextText: string[]
): boolean {
  if (typeof explicit === "string" && GENDER_MAP.has(explicit as GenderKey)) {
    return (explicit as GenderKey) === target;
  }
  return target === "men" || target === "women";
}


// Service-aware gender blurbs so "Kids" under Shoe Care doesn't say "clothes".
const GENDER_BLURBS: Record<ServiceTypeKey, Partial<Record<GenderKey, string>>> = {
  "dry-cleaning": {
    men: "Suits, blazers, kurtas & formal wear",
    women: "Sarees, lehengas, gowns & delicates",
    kids: "Party wear & delicate outfits",
    unisex: "Jackets, coats & everyday premium wear",
    home: "Curtains, quilts & upholstery",
  },
  "steam-press": {
    men: "Shirts, trousers & kurtas — crisp finish",
    women: "Sarees, kurtis & dresses — wrinkle-free",
    kids: "School uniforms & everyday wear",
    unisex: "Jackets, jeans & everyday clothes",
    home: "Bedsheets, pillow covers & drapes",
  },
  "laundry": {
    men: "Everyday shirts, tees & trousers",
    women: "Kurtis, tops & daily wear",
    kids: "School uniforms & playwear",
    unisex: "T-shirts, jeans & daily basics",
    home: "Bedsheets, towels & linens",
  },
  "shoe-care": {
    men: "Formal shoes, sneakers & loafers",
    women: "Heels, flats, sneakers & handbags",
    kids: "School shoes & sneakers",
    unisex: "Sneakers, boots & sandals",
    home: "Bags, belts & leather accessories",
  },
  "household": {
    men: "Personal linens & throws",
    women: "Personal linens & throws",
    kids: "Kids' bedding & soft toys",
    unisex: "Blankets, throws & covers",
    home: "Curtains, carpets, sofas & bedding",
  },
  "premium": {
    men: "Designer suits & luxury wear",
    women: "Bridal, silks & designer wear",
    kids: "Special occasion outfits",
    unisex: "Luxury & designer garments",
    home: "Silk drapes & premium upholstery",
  },
};

export function genderBlurb(service: ServiceTypeKey, gender: GenderKey): string {
  return GENDER_BLURBS[service]?.[gender] || GENDER_MAP.get(gender)?.description || "";
}

