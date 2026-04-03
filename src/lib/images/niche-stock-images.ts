import type { AdNicheId } from "@/lib/services/neural-script-architect";

const Q = "w=1920&h=1080&fit=crop&q=85";

/** Curated Unsplash stills (free to use per Unsplash license) — 16:9 crop, high quality. */
const NICHE_STOCK: Record<AdNicheId, string[]> = {
  general: [
    `https://images.unsplash.com/photo-1460925895917-afdab827c52f?${Q}`,
    `https://images.unsplash.com/photo-1556761175-5973dc0f32e7?${Q}`,
    `https://images.unsplash.com/photo-1522071820081-009f0129c71c?${Q}`,
    `https://images.unsplash.com/photo-1497215842964-222b430dc094?${Q}`,
    `https://images.unsplash.com/photo-1504384308090-c894fdcc538d?${Q}`,
    `https://images.unsplash.com/photo-1557804506-669a67965ba0?${Q}`,
    `https://images.unsplash.com/photo-1521737711867-e3b97375f902?${Q}`,
    `https://images.unsplash.com/photo-1531482615713-2afd69097998?${Q}`,
    `https://images.unsplash.com/photo-1553877522-43269d4ea984?${Q}`,
    `https://images.unsplash.com/photo-1542744173-8e7e5348bb09?${Q}`,
    `https://images.unsplash.com/photo-1552664730-d307ca884978?${Q}`,
    `https://images.unsplash.com/photo-1507679799987-c73779587ccf?${Q}`,
  ],
  automotive: [
    `https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?${Q}`,
    `https://images.unsplash.com/photo-1503376780353-7e6692767b70?${Q}`,
    `https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?${Q}`,
    `https://images.unsplash.com/photo-1489827910844-779f1bb1b769?${Q}`,
    `https://images.unsplash.com/photo-1583121274602-3e282013e6f8?${Q}`,
    `https://images.unsplash.com/photo-1494976388532-dfff2c949b8f?${Q}`,
    `https://images.unsplash.com/photo-1502877338535-766e1452684a?${Q}`,
    `https://images.unsplash.com/photo-1580273916550-e448d7b7e0b0?${Q}`,
    `https://images.unsplash.com/photo-1552519507-da3b142c6e3d?${Q}`,
    `https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?${Q}`,
    `https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?${Q}`,
    `https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?${Q}`,
  ],
  legal: [
    `https://images.unsplash.com/photo-1589829546656-cbc9d9297f9b?${Q}`,
    `https://images.unsplash.com/photo-1450101499163-c8848c66ca85?${Q}`,
    `https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?${Q}`,
    `https://images.unsplash.com/photo-1497366216548-37526070297c?${Q}`,
    `https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?${Q}`,
    `https://images.unsplash.com/photo-1521791055366-05d46f2b8b48?${Q}`,
    `https://images.unsplash.com/photo-1589829085413-56de8ae18c73?${Q}`,
    `https://images.unsplash.com/photo-1507679799987-c73779587ccf?${Q}`,
    `https://images.unsplash.com/photo-1560472354-b33ff0c44a43?${Q}`,
    `https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?${Q}`,
    `https://images.unsplash.com/photo-1497215842964-222b430dc094?${Q}`,
    `https://images.unsplash.com/photo-1504384308090-c894fdcc538d?${Q}`,
  ],
  real_estate: [
    `https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?${Q}`,
    `https://images.unsplash.com/photo-1600585154340-be6161a56a0c?${Q}`,
    `https://images.unsplash.com/photo-1613490493576-7fde63acd811?${Q}`,
    `https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?${Q}`,
    `https://images.unsplash.com/photo-1512917774080-9991f1c4c750?${Q}`,
    `https://images.unsplash.com/photo-1564013799919-ab600027ffc6?${Q}`,
    `https://images.unsplash.com/photo-1570129477492-45c003edd2be?${Q}`,
    `https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?${Q}`,
    `https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?${Q}`,
    `https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?${Q}`,
    `https://images.unsplash.com/photo-1583608205776-bfd35d0eda83?${Q}`,
    `https://images.unsplash.com/photo-1519751138087-5bf79df62d5b?${Q}`,
  ],
  saas_tech: [
    `https://images.unsplash.com/photo-1517694712202-14dd9538aa97?${Q}`,
    `https://images.unsplash.com/photo-1498050108023-c5249f4df085?${Q}`,
    `https://images.unsplash.com/photo-1531482615713-2afd69097998?${Q}`,
    `https://images.unsplash.com/photo-1551434678-e076c223a692?${Q}`,
    `https://images.unsplash.com/photo-1522071820081-009f0129c71c?${Q}`,
    `https://images.unsplash.com/photo-1544197150-b99a580bb7a8?${Q}`,
    `https://images.unsplash.com/photo-1504384308090-c894fdcc538d?${Q}`,
    `https://images.unsplash.com/photo-1460925895917-afdab827c52f?${Q}`,
    `https://images.unsplash.com/photo-1551288049-bebda4e38f71?${Q}`,
    `https://images.unsplash.com/photo-1555949963-aa79dcee981c?${Q}`,
    `https://images.unsplash.com/photo-1556761175-b4131ebbc5fb?${Q}`,
    `https://images.unsplash.com/photo-1516321318423-f06f85e504b3?${Q}`,
  ],
  ecommerce_product: [
    `https://images.unsplash.com/photo-1441986300917-64674bd600d8?${Q}`,
    `https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?${Q}`,
    `https://images.unsplash.com/photo-1555529908-ae8b6821c088?${Q}`,
    `https://images.unsplash.com/photo-1556217477-5605125586f0?${Q}`,
    `https://images.unsplash.com/photo-1523275335684-37898b6baf30?${Q}`,
    `https://images.unsplash.com/photo-1505740420928-5e560c06d30e?${Q}`,
    `https://images.unsplash.com/photo-1542291026-7eec264c27ff?${Q}`,
    `https://images.unsplash.com/photo-1572635196237-14b3f281503f?${Q}`,
    `https://images.unsplash.com/photo-1560393464-5c69a73c5770?${Q}`,
    `https://images.unsplash.com/photo-1543163521-1bf539c55dd2?${Q}`,
    `https://images.unsplash.com/photo-1590874103328-eac38a683ce7?${Q}`,
    `https://images.unsplash.com/photo-1611934780601-141c641e31ab?${Q}`,
  ],
  healthcare: [
    `https://images.unsplash.com/photo-1579684385127-1ef15d508118?${Q}`,
    `https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?${Q}`,
    `https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?${Q}`,
    `https://images.unsplash.com/photo-1551190822-a9333d879b1f?${Q}`,
    `https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?${Q}`,
    `https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?${Q}`,
    `https://images.unsplash.com/photo-1666214280494-a9cc9047a34c?${Q}`,
    `https://images.unsplash.com/photo-1538108149393-fbbd81895907?${Q}`,
    `https://images.unsplash.com/photo-1576091160550-2173dba999ef?${Q}`,
    `https://images.unsplash.com/photo-1587854692152-cbe660dbde88?${Q}`,
    `https://images.unsplash.com/photo-1505751172876-fa1923c5c528?${Q}`,
    `https://images.unsplash.com/photo-1516549655169-83f7ce0767b9?${Q}`,
  ],
  food_hospitality: [
    `https://images.unsplash.com/photo-1414235077428-338989a2e8c0?${Q}`,
    `https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?${Q}`,
    `https://images.unsplash.com/photo-1555396273-367ea4eb4db5?${Q}`,
    `https://images.unsplash.com/photo-1559339352-11d035aa65de?${Q}`,
    `https://images.unsplash.com/photo-1504674900247-0877df9cc836?${Q}`,
    `https://images.unsplash.com/photo-1544025162-d76694265947?${Q}`,
    `https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?${Q}`,
    `https://images.unsplash.com/photo-1552566626-52f8b828add9?${Q}`,
    `https://images.unsplash.com/photo-1424847657972-de334425d911?${Q}`,
    `https://images.unsplash.com/photo-1551218808-94e220e084d2?${Q}`,
    `https://images.unsplash.com/photo-1559334534-fcafef1cc6c3?${Q}`,
    `https://images.unsplash.com/photo-1514933651103-005eec06c04b?${Q}`,
  ],
  finance: [
    `https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?${Q}`,
    `https://images.unsplash.com/photo-1460925895917-afdab827c52f?${Q}`,
    `https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?${Q}`,
    `https://images.unsplash.com/photo-1554224155-6726b3ff858f?${Q}`,
    `https://images.unsplash.com/photo-1559526324-593bc073d938?${Q}`,
    `https://images.unsplash.com/photo-1563986768609-322da13575f3?${Q}`,
    `https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?${Q}`,
    `https://images.unsplash.com/photo-1507679799987-c73779587ccf?${Q}`,
    `https://images.unsplash.com/photo-1551288049-bebda4e38f71?${Q}`,
    `https://images.unsplash.com/photo-1553729459-efe14ef6055d?${Q}`,
    `https://images.unsplash.com/photo-1553729723-ecea1ddf0c5e?${Q}`,
    `https://images.unsplash.com/photo-1563013544-824ae1b704d3?${Q}`,
  ],
  home_services: [
    `https://images.unsplash.com/photo-1581578731548-c64695cc6952?${Q}`,
    `https://images.unsplash.com/photo-1621905251918-48416bd8575a?${Q}`,
    `https://images.unsplash.com/photo-1504148455328-c376907d081c?${Q}`,
    `https://images.unsplash.com/photo-1589939705384-5185137a7f0f?${Q}`,
    `https://images.unsplash.com/photo-1503387762-592deb58ef4e?${Q}`,
    `https://images.unsplash.com/photo-1513828583688-c52646db42da?${Q}`,
    `https://images.unsplash.com/photo-1600585154340-be6161a56a0c?${Q}`,
    `https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?${Q}`,
    `https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?${Q}`,
    `https://images.unsplash.com/photo-1600573472592-401b3a171190?${Q}`,
    `https://images.unsplash.com/photo-1560472354-b33ff0c44a43?${Q}`,
    `https://images.unsplash.com/photo-1563453392212-326f5e854473?${Q}`,
  ],
  fitness: [
    `https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?${Q}`,
    `https://images.unsplash.com/photo-1534438327276-14e5300c3a48?${Q}`,
    `https://images.unsplash.com/photo-1517836357463-d25dfeac3438?${Q}`,
    `https://images.unsplash.com/photo-1540497077202-7c8a3999166f?${Q}`,
    `https://images.unsplash.com/photo-1593079831268-3381b0db4a77?${Q}`,
    `https://images.unsplash.com/photo-1583454110551-21f2fa2968e7?${Q}`,
    `https://images.unsplash.com/photo-1518611012118-696072aa579a?${Q}`,
    `https://images.unsplash.com/photo-1574680096145-d05b474e2155?${Q}`,
    `https://images.unsplash.com/photo-1549060279-7e168fcee0c2?${Q}`,
    `https://images.unsplash.com/photo-1576678927483-cc907957088c?${Q}`,
    `https://images.unsplash.com/photo-1564859228264-6ca77ffb4682?${Q}`,
    `https://images.unsplash.com/photo-1594882645126-14020914d58d?${Q}`,
  ],
  education: [
    `https://images.unsplash.com/photo-1523050854058-8df90110c9fe?${Q}`,
    `https://images.unsplash.com/photo-1503676260728-1c00da094a0b?${Q}`,
    `https://images.unsplash.com/photo-1524178232363-1fb2b075b655?${Q}`,
    `https://images.unsplash.com/photo-1497633762265-9d179a990aa6?${Q}`,
    `https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?${Q}`,
    `https://images.unsplash.com/photo-1519452635265-7b1fbfd1e4e0?${Q}`,
    `https://images.unsplash.com/photo-1509062522246-3755977927d7?${Q}`,
    `https://images.unsplash.com/photo-1588072432836-e10032774350?${Q}`,
    `https://images.unsplash.com/photo-1523240795612-9a054b0db644?${Q}`,
    `https://images.unsplash.com/photo-1434030216411-0b793f4b4173?${Q}`,
    `https://images.unsplash.com/photo-1529390079861-591de354faf5?${Q}`,
    `https://images.unsplash.com/photo-1541339907198-08702efdaf12?${Q}`,
  ],
};

export function getNicheStockImagePool(niche: AdNicheId): string[] {
  return [...NICHE_STOCK[niche]];
}

/**
 * When the user leaves niche as `general`, infer retail / vertical from the page
 * so generic stock stills match the site category (e.g. ecommerce vs random landscape).
 */
export function resolveStockNicheId(
  explicit: AdNicheId,
  signals: {
    companyName?: string;
    pageTitle?: string;
    sourceUrl?: string | null;
  },
): AdNicheId {
  if (explicit !== "general") return explicit;
  return inferStockNicheFromSignals(signals);
}

function inferStockNicheFromSignals(signals: {
  companyName?: string;
  pageTitle?: string;
  sourceUrl?: string | null;
}): AdNicheId {
  const rawUrl = signals.sourceUrl?.trim() ?? "";
  let path = "";
  let search = "";
  try {
    if (rawUrl) {
      const u = new URL(rawUrl);
      path = u.pathname.toLowerCase();
      search = u.search.toLowerCase();
    }
  } catch {
    /* noop */
  }

  const text = `${signals.companyName ?? ""} ${signals.pageTitle ?? ""}`.toLowerCase();
  const automotiveBlob = `${text} ${path} ${(signals.sourceUrl ?? "").toLowerCase()}`;

  if (
    /\b(cadillac|chevrolet|chevy|ford|lincoln|toyota|lexus|honda|acura|bmw|mercedes|audi|porsche|volkswagen|\bvw\b|nissan|infiniti|hyundai|kia|subaru|mazda|jeep|\bram\b|dodge|chrysler|gmc|buick|dealership|car dealer|auto dealer|auto group|new vehicles|used cars|pre-?owned|cpo\b|certified pre|automotive|motor company|\bmotors\b|showroom|vehicle specials|inventory specials)\b/.test(
      automotiveBlob,
    ) ||
    /\/(inventory|vehicles|cars-trucks|new-vehicles|used-vehicles|pre-owned|showroom|dealership|financing|auto)\b/.test(
      path,
    ) ||
    /\b(sewell|autonation|carmax|carfax|cars\.com|dealer\.com)\b/.test(
      automotiveBlob,
    )
  ) {
    return "automotive";
  }

  if (
    /\/(shop|store|products?|collections?|cart|checkout|catalog|buy|sale|new-arrivals?)\b/.test(
      path,
    ) ||
    /[?&](product|products|variant|sku|item)=/.test(search)
  ) {
    return "ecommerce_product";
  }

  if (
    /\b(shopify|woocommerce|bigcommerce|magento|squarespace commerce|add to cart|buy now|free shipping|size guide|in stock|out of stock)\b/.test(
      text,
    )
  ) {
    return "ecommerce_product";
  }
  if (/law|attorney|legal|injury|litigation|lawyer\b/.test(text)) return "legal";
  if (/real estate|realtor|property|homes?\b|mls\b|listing\b/.test(text)) {
    return "real_estate";
  }
  if (/saas|software|\bapi\b|cloud platform|web app/.test(text)) {
    return "saas_tech";
  }
  if (/clinic|medical|dental|health|wellness|physician/.test(text)) {
    return "healthcare";
  }
  if (/restaurant|cafe|food service|kitchen|bakery|menu\b/.test(text)) {
    return "food_hospitality";
  }
  if (/jewel|jewelry|wristwatch|fine gold/.test(text)) {
    return "ecommerce_product";
  }
  if (/invest|wealth|mortgage|banking|financial\b/.test(text)) return "finance";
  if (/plumb|electric|hvac|roofing|contractor|renovation/.test(text)) {
    return "home_services";
  }
  if (/gym|fitness|workout|training studio|personal trainer/.test(text)) {
    return "fitness";
  }
  if (/course|university|academy|online learning|tutor\b/.test(text)) {
    return "education";
  }
  return "general";
}

/** Extra image search phrases for SerpApi when niche is known (in addition to page-derived terms). */
export function getNicheSerpBoostQueries(niche: AdNicheId): string[] {
  const map: Record<AdNicheId, string[]> = {
    general: ["premium brand lifestyle photography 4k"],
    automotive: [
      "luxury car dealership showroom photography",
      "new car dealer lot exterior professional",
    ],
    legal: ["law firm office professional photography", "attorney consultation room"],
    real_estate: ["luxury real estate interior photography", "modern home exterior golden hour"],
    saas_tech: ["technology startup office team", "software dashboard on laptop"],
    ecommerce_product: ["premium ecommerce product photography white background", "shopping lifestyle instagram ad"],
    healthcare: ["modern medical clinic interior", "healthcare professional patient care"],
    food_hospitality: ["restaurant food photography overhead", "chef kitchen professional"],
    finance: ["financial planning office professional", "investment banking sleek office"],
    home_services: ["plumber electrician professional service truck", "home renovation before after"],
    fitness: ["gym workout lifestyle photography", "personal trainer session"],
    education: ["university campus students", "online learning laptop education"],
  };
  return map[niche];
}
