/**
 * Demo seed: creates a "Demo Garage" workspace with a super-admin login,
 * sample inventory, photos, a garage map, and sales history.
 *
 *   npm run seed
 *   → login: demo@assetmanager.local / demo1234
 *
 * The first account created through the signup page ALSO becomes super admin
 * if the database is empty — this seed is optional, for trying the app out.
 */
process.env.DATABASE_URL ??= "file:./data/asset-manager.db";

import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { customAlphabet } from "nanoid";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - plain JS helper shared with scripts/
import { makePng, hex } from "../scripts/png.mjs";

const prisma = new PrismaClient();
const qrSlug = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 9);
const digits = customAlphabet("0123456789", 11);

const uploadsRoot = path.resolve(process.cwd(), process.env.UPLOADS_DIR || "./data/uploads");

function savePngUpload(tenantId: string, name: string, buf: Buffer): string {
  const key = `${tenantId}/${name}`;
  const full = path.join(uploadsRoot, key);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, buf);
  return key;
}

/** Two-tone placeholder "photo". */
function photoPng(colorA: string, colorB: string): Buffer {
  const A = hex(colorA);
  const B = hex(colorB);
  const W = 480;
  const H = 360;
  return makePng(W, H, (x: number, y: number) => {
    const diag = (x + y) % 96 < 48;
    const vignette = x < 8 || y < 8 || x > W - 9 || y > H - 9;
    if (vignette) return A.map((c: number) => Math.max(0, c - 40));
    return diag ? A : B;
  });
}

/** Placeholder garage floor plan: light background, grid, room rectangles. */
function floorPlanPng(): Buffer {
  const W = 800;
  const H = 600;
  const bg = hex("#f4f1ea");
  const grid = hex("#dcd7ca");
  const wall = hex("#4b5563");
  const rects = [
    [40, 40, 760, 560], // outer wall
    [40, 40, 300, 240], // workbench corner
    [560, 40, 760, 200], // shelves
    [40, 420, 220, 560], // cabinet zone
  ];
  return makePng(W, H, (x: number, y: number) => {
    for (const [x1, y1, x2, y2] of rects) {
      const onEdge =
        x >= x1 && x <= x2 && y >= y1 && y <= y2 &&
        (x - x1 < 6 || x2 - x < 6 || y - y1 < 6 || y2 - y < 6);
      if (onEdge) return wall;
    }
    if (x % 50 < 1 || y % 50 < 1) return grid;
    return bg;
  });
}

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: "demo@assetmanager.local" } });
  if (existing) {
    console.log("Demo account already exists — nothing to do.");
    return;
  }

  const tenant = await prisma.tenant.create({ data: { name: "Demo Garage" } });
  const t = tenant.id;

  await prisma.user.create({
    data: {
      tenantId: t,
      email: "demo@assetmanager.local",
      passwordHash: await bcrypt.hash("demo1234", 10),
      name: "Demo Admin",
      role: "OWNER",
      isSuperAdmin: (await prisma.user.count()) === 0,
      status: "ACTIVE",
    },
  });

  // Categories.
  const catNames = [
    ["Tools", ["Power Tools", "Hand Tools"]],
    ["Automotive", []],
    ["Garden & Outdoor", []],
    ["Sports & Recreation", []],
    ["Electronics", []],
    ["Household", []],
    ["Seasonal", []],
  ] as const;
  const cats = new Map<string, string>();
  let order = 0;
  for (const [name, children] of catNames) {
    const parent = await prisma.category.create({ data: { tenantId: t, name, sortOrder: order++ } });
    cats.set(name, parent.id);
    for (const child of children) {
      const c = await prisma.category.create({
        data: { tenantId: t, name: child, parentId: parent.id, sortOrder: order++ },
      });
      cats.set(child, c.id);
    }
  }

  // Locations.
  const mkLoc = (name: string, type: string, parentId?: string) =>
    prisma.location.create({ data: { tenantId: t, name, type, parentId: parentId ?? null, qrCode: "l" + qrSlug() } });
  const garage = await mkLoc("Garage", "AREA");
  const workbench = await mkLoc("Workbench", "WORKBENCH", garage.id);
  const shelfA = await mkLoc("Shelf A", "SHELF", garage.id);
  const shelfB = await mkLoc("Shelf B", "SHELF", garage.id);
  const cabinet = await mkLoc("Red Cabinet", "CABINET", garage.id);
  const shed = await mkLoc("Shed", "AREA");
  const bin1 = await mkLoc("Bin 1 — Camping", "BIN", shed.id);
  const attic = await mkLoc("Attic", "AREA");

  // Garage map with pins.
  const mapKey = savePngUpload(t, "floor-plan.png", floorPlanPng());
  const map = await prisma.garageMap.create({ data: { tenantId: t, name: "Garage floor plan", imagePath: mapKey } });
  const pin = (id: string, x: number, y: number) =>
    prisma.location.update({ where: { id }, data: { mapId: map.id, mapX: x, mapY: y } });
  await pin(workbench.id, 21, 23);
  await pin(shelfA.id, 82, 20);
  await pin(shelfB.id, 82, 45);
  await pin(cabinet.id, 16, 82);

  // Listing template.
  await prisma.listingTemplate.create({
    data: {
      tenantId: t,
      name: "Facebook quick listing",
      marketplace: "FACEBOOK",
      body: "{{name}} — {{condition}}\n\n{{description}}\n\nBrand: {{brand}} {{model}}\nAsking ${{price}} (firm at ${{minPrice}}). Cash, local pickup.",
    },
  });

  // Custom field.
  const voltage = await prisma.customFieldDef.create({
    data: { tenantId: t, name: "Voltage", type: "SELECT", options: "12V\n18V\n20V\n40V" },
  });

  // Tags.
  const tagNames = ["cordless", "vintage", "camping", "needs-repair", "heavy"];
  const tags = new Map<string, string>();
  for (const name of tagNames) {
    const tag = await prisma.tag.create({ data: { tenantId: t, name } });
    tags.set(name, tag.id);
  }

  const monthsAgo = (n: number, day = 15) => {
    const d = new Date();
    d.setMonth(d.getMonth() - n);
    d.setDate(day);
    return d;
  };

  type SeedItem = {
    name: string;
    description?: string;
    cat?: string;
    loc?: string;
    brand?: string;
    model?: string;
    serial?: string;
    qty?: number;
    condition?: string;
    decision?: string;
    status?: string;
    marketplace?: string;
    purchase?: number;
    value?: number;
    min?: number;
    sale?: number;
    soldMonthsAgo?: number;
    listedMonthsAgo?: number;
    favorite?: boolean;
    tags?: string[];
    photo?: [string, string];
    voltage?: string;
    notes?: string;
  };

  const items: SeedItem[] = [
    { name: "DeWalt 20V Drill/Driver", description: "Cordless drill with two batteries and charger. Light use.", cat: "Power Tools", loc: workbench.id, brand: "DeWalt", model: "DCD771C2", serial: "DW-99213", condition: "GOOD", decision: "KEEP", purchase: 129, value: 90, favorite: true, tags: ["cordless"], photo: ["#f2c94c", "#e2b93b"], voltage: "20V" },
    { name: "Craftsman Socket Set (230 pc)", description: "Complete set, metric + SAE, in original case.", cat: "Hand Tools", loc: cabinet.id, brand: "Craftsman", condition: "LIKE_NEW", decision: "KEEP", purchase: 180, value: 140, photo: ["#c0392b", "#a93226"] },
    { name: "Honda Lawn Mower", description: "Self-propelled, 21\" deck. Starts on first pull.", cat: "Garden & Outdoor", loc: shed.id, brand: "Honda", model: "HRX217", serial: "MAGA-1104220", condition: "GOOD", decision: "SELL", status: "LISTED", marketplace: "FACEBOOK", purchase: 599, value: 350, min: 300, listedMonthsAgo: 1, photo: ["#27ae60", "#1e8449"], notes: "Oil changed spring 2026." },
    { name: "Coleman 6-Person Tent", description: "Used twice. All poles and stakes included.", cat: "Sports & Recreation", loc: bin1.id, brand: "Coleman", condition: "LIKE_NEW", decision: "SELL", status: "READY_FOR_PHOTOS", purchase: 149, value: 80, min: 60, tags: ["camping"], photo: ["#2980b9", "#21618c"] },
    { name: "Shop-Vac 12 Gallon", cat: "Tools", loc: garage.id, brand: "Shop-Vac", condition: "FAIR", decision: "KEEP", purchase: 89, value: 40, photo: ["#7f8c8d", "#626f70"] },
    { name: "Vintage Coca-Cola Cooler", description: "1960s metal cooler, some rust, great patina.", cat: "Household", loc: attic.id, condition: "FAIR", decision: "SELL", status: "OFFER_RECEIVED", marketplace: "EBAY", value: 220, min: 150, listedMonthsAgo: 2, favorite: true, tags: ["vintage"], photo: ["#e74c3c", "#c0392b"] },
    { name: "Ryobi 18V Circular Saw", cat: "Power Tools", loc: shelfA.id, brand: "Ryobi", model: "P507", condition: "GOOD", decision: "SELL", status: "SOLD", marketplace: "OFFERUP", purchase: 79, sale: 45, soldMonthsAgo: 1, voltage: "18V", tags: ["cordless"], photo: ["#a8e063", "#7cb342"] },
    { name: "Kids' Mountain Bike 24\"", cat: "Sports & Recreation", loc: shed.id, condition: "GOOD", decision: "SELL", status: "SOLD", marketplace: "FACEBOOK", purchase: 220, sale: 90, soldMonthsAgo: 2, photo: ["#9b59b6", "#7d3c98"] },
    { name: "Christmas Lights (8 boxes)", cat: "Seasonal", loc: attic.id, qty: 8, condition: "GOOD", decision: "KEEP", value: 60, photo: ["#16a085", "#117a65"] },
    { name: "Old CRT Monitor", cat: "Electronics", loc: attic.id, condition: "PARTS_ONLY", decision: "TRASH", value: 0, notes: "E-waste dropoff." },
    { name: "Weber Charcoal Grill", cat: "Garden & Outdoor", loc: garage.id, brand: "Weber", condition: "GOOD", decision: "SELL", status: "SOLD", marketplace: "CRAIGSLIST", purchase: 165, sale: 75, soldMonthsAgo: 4, photo: ["#2c3e50", "#1a252f"] },
    { name: "Box of Paperbacks", cat: "Household", loc: shelfB.id, qty: 1, condition: "FAIR", decision: "DONATE", value: 10 },
    { name: "Makita Router", cat: "Power Tools", loc: shelfA.id, brand: "Makita", model: "RT0701C", condition: "LIKE_NEW", decision: "SELL", status: "SOLD", marketplace: "EBAY", purchase: 99, sale: 70, soldMonthsAgo: 6, photo: ["#00b8d4", "#0088a3"] },
    { name: "Snow Blower", cat: "Seasonal", loc: shed.id, brand: "Toro", condition: "GOOD", decision: "KEEP", purchase: 450, value: 280, tags: ["heavy"], photo: ["#e67e22", "#ca6f1e"] },
    { name: "Pressure Washer", cat: "Garden & Outdoor", loc: garage.id, brand: "Sun Joe", model: "SPX3000", condition: "GOOD", decision: "SELL", status: "PENDING_PICKUP", marketplace: "FACEBOOK", purchase: 150, value: 85, min: 70, sale: 80, listedMonthsAgo: 0, photo: ["#f39c12", "#d68910"] },
    { name: "Folding Camp Chairs (4)", cat: "Sports & Recreation", loc: bin1.id, qty: 4, condition: "GOOD", decision: "SELL", status: "NOT_LISTED", value: 40, min: 25, tags: ["camping"] },
  ];

  let itemNumber = 0;
  for (const s of items) {
    itemNumber += 1;
    const soldAt = s.soldMonthsAgo !== undefined ? monthsAgo(s.soldMonthsAgo) : null;
    const listedAt =
      s.listedMonthsAgo !== undefined ? monthsAgo(s.listedMonthsAgo, 3) : soldAt ? monthsAgo((s.soldMonthsAgo ?? 0) + 1, 20) : null;
    const item = await prisma.item.create({
      data: {
        tenantId: t,
        itemNumber,
        barcode: "2" + digits(),
        qrCode: "i" + qrSlug(),
        name: s.name,
        description: s.description ?? null,
        categoryId: s.cat ? cats.get(s.cat) ?? null : null,
        locationId: s.loc ?? null,
        brand: s.brand ?? null,
        model: s.model ?? null,
        serialNumber: s.serial ?? null,
        quantity: s.qty ?? 1,
        condition: s.condition ?? null,
        decision: s.decision ?? "UNDECIDED",
        sellingStatus: s.status ?? "NOT_LISTED",
        marketplace: s.marketplace ?? null,
        purchasePrice: s.purchase ?? null,
        estimatedValue: s.value ?? (s.sale ?? null),
        minPrice: s.min ?? null,
        salePrice: s.sale ?? null,
        soldAt,
        listedAt,
        favorite: s.favorite ?? false,
        notes: s.notes ?? null,
        createdAt: monthsAgo(Math.min(8, (s.soldMonthsAgo ?? 0) + 2), 5),
      },
    });

    if (s.tags) {
      for (const tag of s.tags) {
        await prisma.itemTag.create({ data: { itemId: item.id, tagId: tags.get(tag)! } });
      }
    }
    if (s.photo) {
      const key = savePngUpload(t, `item-${itemNumber}.png`, photoPng(s.photo[0], s.photo[1]));
      await prisma.photo.create({ data: { itemId: item.id, path: key, isPrimary: true, sortOrder: 0 } });
    }
    if (s.voltage) {
      await prisma.customFieldValue.create({ data: { itemId: item.id, fieldId: voltage.id, value: s.voltage } });
    }
    if (s.name.includes("Lawn Mower")) {
      await prisma.maintenanceLog.createMany({
        data: [
          { itemId: item.id, date: monthsAgo(3), type: "Oil change", cost: 12.5, notes: "10W-30" },
          { itemId: item.id, date: monthsAgo(9), type: "Blade sharpened", cost: 0, notes: "DIY with file" },
        ],
      });
    }
  }

  await prisma.tenant.update({ where: { id: t }, data: { lastItemNumber: itemNumber } });

  console.log("Seeded Demo Garage:");
  console.log("  login:    demo@assetmanager.local");
  console.log("  password: demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
