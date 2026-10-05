import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);
import mongoose from "mongoose";

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb+srv://metriumprojects_db_user:pf7yj0tuHK74CuIz@multiporject.pv481jt.mongodb.net/gigslide";

const TEACHER_AVATARS = [
  {
    name: "Alex Morgan",
    image: {
      url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
      public_id: "avatar_alex",
    },
    averageRating: 99,
  },
  {
    name: "David Chen",
    image: {
      url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
      public_id: "avatar_david",
    },
    averageRating: 98,
  },
  {
    name: "Sophia Martinez",
    image: {
      url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80",
      public_id: "avatar_sophia",
    },
    averageRating: 100,
  },
  {
    name: "Marcus Johnson",
    image: {
      url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
      public_id: "avatar_marcus",
    },
    averageRating: 97,
  },
  {
    name: "Elena Rostova",
    image: {
      url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80",
      public_id: "avatar_elena",
    },
    averageRating: 99,
  },
];

const SAMPLE_WEEKLY_HOURS = [
  {
    day: "Sunday",
    available: false,
    slots: [],
  },
  {
    day: "Monday",
    available: true,
    slots: [
      { start: "09:00", end: "10:00" },
      { start: "10:30", end: "11:30" },
      { start: "14:00", end: "15:00" },
      { start: "16:00", end: "17:00" },
    ],
  },
  {
    day: "Tuesday",
    available: true,
    slots: [
      { start: "09:00", end: "10:00" },
      { start: "11:00", end: "12:00" },
      { start: "15:00", end: "16:00" },
    ],
  },
  {
    day: "Wednesday",
    available: true,
    slots: [
      { start: "10:00", end: "11:00" },
      { start: "11:30", end: "12:30" },
      { start: "14:00", end: "15:00" },
      { start: "15:30", end: "16:30" },
    ],
  },
  {
    day: "Thursday",
    available: true,
    slots: [
      { start: "09:00", end: "10:00" },
      { start: "13:00", end: "14:00" },
      { start: "15:00", end: "16:00" },
    ],
  },
  {
    day: "Friday",
    available: true,
    slots: [
      { start: "10:00", end: "11:00" },
      { start: "11:30", end: "12:30" },
      { start: "14:00", end: "15:00" },
    ],
  },
  {
    day: "Saturday",
    available: true,
    slots: [
      { start: "11:00", end: "12:00" },
      { start: "13:00", end: "14:00" },
    ],
  },
];

const DUMMY_LISTINGS = [
  // ==========================================
  // SCENARIO 1: HOURLY WITH CALENDAR (hourly_calendar)
  // CTA: "Book" | Price: "$XX per hour" | Calendar slot booking
  // ==========================================
  {
    title: "1-on-1 Acoustic & Classical Guitar Masterclass",
    category: "Music & Performance",
    description:
      "Interactive 1-on-1 guitar lessons tailored to your skill level. Book a live time slot directly on my calendar. We cover fingerstyle, chords, rhythm, and song repertoire.",
    price: 45,
    currency: "USD",
    pricingType: "hourly_calendar",
    duration: "1 hour",
    calender: true,
    weeklyHours: SAMPLE_WEEKLY_HOURS,
    timeZone: "America/New_York",
    isOnline: true,
    supportsInPerson: true,
    location: "New York, NY",
    coverImage: {
      url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80",
      public_id: "cover_music_1",
    },
    images: [
      {
        url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80",
      },
      {
        url: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=800&q=80",
      },
    ],
  },
  {
    title: "Live Personal Fitness Coaching & Form Correction",
    category: "Fitness",
    description:
      "Reserve live 60-minute training slots on my calendar. We will perform real-time workout sessions, posture adjustments, and progressive resistance coaching.",
    price: 50,
    currency: "USD",
    pricingType: "hourly_calendar",
    duration: "1 hour",
    calender: true,
    weeklyHours: SAMPLE_WEEKLY_HOURS,
    timeZone: "America/Los_Angeles",
    isOnline: true,
    supportsInPerson: true,
    location: "Los Angeles, CA",
    coverImage: {
      url: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80",
      public_id: "cover_fitness_1",
    },
    images: [
      {
        url: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80",
      },
      {
        url: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=800&q=80",
      },
    ],
  },
  {
    title: "Live Python Coding & Data Science Tutoring",
    category: "Technology",
    description:
      "Book an interactive pair-programming session. I will review your code, guide you through data algorithms, and debug complex Python/pandas challenges live.",
    price: 70,
    currency: "USD",
    pricingType: "hourly_calendar",
    duration: "1 hour",
    calender: true,
    weeklyHours: SAMPLE_WEEKLY_HOURS,
    timeZone: "America/Chicago",
    isOnline: true,
    supportsInPerson: false,
    coverImage: {
      url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80",
      public_id: "cover_python_1",
    },
    images: [
      {
        url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80",
      },
      {
        url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80",
      },
    ],
  },
  {
    title: "Guided Mindfulness & Breathwork Live Sessions",
    category: "Spiritual & Insight",
    description:
      "Schedule real-time 1-on-1 meditation sessions on my calendar. Learn somatic calming tools, pranayama breathing, and focus enhancement practices.",
    price: 40,
    currency: "USD",
    pricingType: "hourly_calendar",
    duration: "1 hour",
    calender: true,
    weeklyHours: SAMPLE_WEEKLY_HOURS,
    timeZone: "America/New_York",
    isOnline: true,
    supportsInPerson: false,
    coverImage: {
      url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80",
      public_id: "cover_mind_1",
    },
    images: [
      {
        url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80",
      },
      {
        url: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=800&q=80",
      },
    ],
  },

  // ==========================================
  // SCENARIO 2: HOURLY WITHOUT CALENDAR (hourly)
  // CTA: "Book" | Price: "$XX per hour"
  // ==========================================
  {
    title: "Full-Stack Web Development & Technical Consulting",
    category: "Technology",
    description:
      "Hourly web consulting and development services for React, Next.js, and Node.js. Flexible scheduling and transparent per-hour tracking.",
    price: 65,
    currency: "USD",
    pricingType: "hourly",
    duration: "1 hour",
    calender: false,
    isOnline: true,
    supportsInPerson: false,
    coverImage: {
      url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80",
      public_id: "cover_tech_1",
    },
    images: [
      {
        url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80",
      },
      {
        url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80",
      },
    ],
  },
  {
    title: "Personal Wardrobe Styling & Color Consulting",
    category: "Style & Fashion",
    description:
      "Per-hour personal shopping and styling assistance. Refresh your wardrobe, curate seasonal capsules, and discover the best fits for your body type.",
    price: 55,
    currency: "USD",
    pricingType: "hourly",
    duration: "1 hour",
    calender: false,
    isOnline: true,
    supportsInPerson: false,
    coverImage: {
      url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80",
      public_id: "cover_fashion_1",
    },
    images: [
      {
        url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80",
      },
    ],
  },
  {
    title: "Public Speaking & Confident Pitch Coaching",
    category: "Speaking & Social Skills",
    description:
      "Hourly speech coaching for founders, executives, and students. Improve voice projection, stage presence, and storytelling dynamics.",
    price: 60,
    currency: "USD",
    pricingType: "hourly",
    duration: "1 hour",
    calender: false,
    isOnline: true,
    supportsInPerson: false,
    coverImage: {
      url: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80",
      public_id: "cover_speaking_1",
    },
    images: [
      {
        url: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80",
      },
    ],
  },
  {
    title: "Puppy Obedience & Dog Behavior Training",
    category: "Pets & Family",
    description:
      "Hourly professional canine training covering leash walking, recall, crate training, and curbing unwanted barking habits.",
    price: 55,
    currency: "USD",
    pricingType: "hourly",
    duration: "1 hour",
    calender: false,
    isOnline: true,
    supportsInPerson: true,
    location: "Austin, TX",
    coverImage: {
      url: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=800&q=80",
      public_id: "cover_dog_1",
    },
    images: [
      {
        url: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=800&q=80",
      },
    ],
  },

  // ==========================================
  // SCENARIO 3: FIXED PRICE (fixed)
  // CTA: "Buy Now" | Price: "$XX" (one-time deliverable)
  // ==========================================
  {
    title: "Complete Brand Identity & Logo Design Package",
    category: "Photo & Design",
    description:
      "Flat-fee package deliverable: 3 primary logo concepts, full color palette, typography guidelines, vector source files, and brand style sheet.",
    price: 180,
    currency: "USD",
    pricingType: "fixed",
    duration: "3 days",
    calender: false,
    isOnline: true,
    supportsInPerson: false,
    coverImage: {
      url: "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=800&q=80",
      public_id: "cover_design_1",
    },
    images: [
      {
        url: "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=800&q=80",
      },
      {
        url: "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=800&q=80",
      },
    ],
  },
  {
    title: "Professional Studio Portrait & Headshot Photoshoot",
    category: "Photo & Design",
    description:
      "All-inclusive fixed photo session: 90-minute studio shoot, 10 retouched high-resolution images, and full commercial usage rights.",
    price: 120,
    currency: "USD",
    pricingType: "fixed",
    duration: "2 hours",
    calender: false,
    isOnline: true,
    supportsInPerson: true,
    location: "Chicago, IL",
    coverImage: {
      url: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80",
      public_id: "cover_photo_1",
    },
    images: [
      {
        url: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80",
      },
    ],
  },
  {
    title: "French Sourdough & Croissant Baking Workshop",
    category: "Food & Kitchen",
    description:
      "Fixed complete culinary masterclass. Receive starter culture, recipe dossier, laminated dough technique videos, and live cooking coaching.",
    price: 85,
    currency: "USD",
    pricingType: "fixed",
    duration: "3 hours",
    calender: false,
    isOnline: true,
    supportsInPerson: true,
    location: "San Francisco, CA",
    coverImage: {
      url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80",
      public_id: "cover_food_1",
    },
    images: [
      {
        url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80",
      },
    ],
  },
  {
    title: "Complete Urban Balcony Garden Design & Setup Plan",
    category: "Home & Garden",
    description:
      "Fixed turnkey garden roadmap: Custom CAD layout for your balcony, plant species selection based on sunlight, soil mix, and automated watering specs.",
    price: 95,
    currency: "USD",
    pricingType: "fixed",
    duration: "2 days",
    calender: false,
    isOnline: true,
    supportsInPerson: false,
    coverImage: {
      url: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=800&q=80",
      public_id: "cover_garden_1",
    },
    images: [
      {
        url: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=800&q=80",
      },
    ],
  },

  // ==========================================
  // SCENARIO 4: PRICE ON DEMAND (fixed_on_demand)
  // CTA: "Ask quote" | Price: "Price on demand" (opens quote modal)
  // ==========================================
  {
    title: "Enterprise Custom Software Architecture & Full Build",
    category: "Technology",
    description:
      "End-to-end custom application development for scaling companies. Scope, timeline, and pricing are tailored to your exact technical specifications. Request a personalized quote to get started.",
    price: 0,
    currency: "USD",
    pricingType: "fixed_on_demand",
    duration: "Custom",
    calender: false,
    isOnline: true,
    supportsInPerson: false,
    coverImage: {
      url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80",
      public_id: "cover_demand_tech",
    },
    images: [
      {
        url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80",
      },
      {
        url: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80",
      },
    ],
  },
  {
    title: "High-End Commercial Video Production & Post-Color",
    category: "Photo & Design",
    description:
      "Bespoke commercial brand films, 4K multi-camera shoots, and DaVinci Resolve color grading. Pricing depends on crew size, location, and turnaround time. Contact for custom quote.",
    price: 0,
    currency: "USD",
    pricingType: "fixed_on_demand",
    duration: "Custom",
    calender: false,
    isOnline: true,
    supportsInPerson: true,
    location: "Miami, FL",
    coverImage: {
      url: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80",
      public_id: "cover_demand_video",
    },
    images: [
      {
        url: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80",
      },
      {
        url: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80",
      },
    ],
  },
  {
    title: "Bespoke Event & Wedding Musical Performance",
    category: "Music & Performance",
    description:
      "Live ensemble, acoustic soloist, or full band performance for luxury weddings, galas, and corporate events. Custom setlists and technical rider quotes provided on demand.",
    price: 0,
    currency: "USD",
    pricingType: "fixed_on_demand",
    duration: "Custom",
    calender: false,
    isOnline: false,
    supportsInPerson: true,
    location: "Seattle, WA",
    coverImage: {
      url: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=800&q=80",
      public_id: "cover_demand_music",
    },
    images: [
      {
        url: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=800&q=80",
      },
    ],
  },
  {
    title: "Luxury Interior Spatial Design & Full Renovation Plan",
    category: "Home & Garden",
    description:
      "Comprehensive architectural interior remodeling, 3D photorealistic renderings, material sourcing, and contractor supervision. Inquire with project dimensions for a custom quote.",
    price: 0,
    currency: "USD",
    pricingType: "fixed_on_demand",
    duration: "Custom",
    calender: false,
    isOnline: true,
    supportsInPerson: true,
    location: "Dallas, TX",
    coverImage: {
      url: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80",
      public_id: "cover_demand_interior",
    },
    images: [
      {
        url: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80",
      },
    ],
  },
];

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");
}

async function runSeed() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB successfully!");

  const db = mongoose.connection.db;

  // 1. Get or update teacher users
  let teachers = await db.collection("users").find({ role: "teacher" }).toArray();
  for (let i = 0; i < teachers.length; i++) {
    const avatar = TEACHER_AVATARS[i % TEACHER_AVATARS.length];
    await db.collection("users").updateOne(
      { _id: teachers[i]._id },
      {
        $set: {
          name: teachers[i].name || avatar.name,
          image: avatar.image,
          averageRating: avatar.averageRating,
          rating: avatar.averageRating,
          role: "teacher",
        },
      }
    );
  }
  teachers = await db.collection("users").find({ role: "teacher" }).toArray();

  // 2. Remove old dummy listings and re-insert fresh ones with all 4 scenarios
  console.log("Cleaning old listings...");
  await db.collection("listings").deleteMany({});

  console.log("Seeding all 4 pricing scenarios (hourly_calendar, hourly, fixed, fixed_on_demand)...");
  const listingsToInsert = DUMMY_LISTINGS.map((item, index) => {
    const teacher = teachers[index % teachers.length];
    const slug = `${slugify(item.title)}-${Date.now().toString(36)}-${index}`;
    return {
      title: item.title,
      slug,
      description: item.description,
      category: item.category,
      duration: item.duration || "1 hour",
      price: item.price,
      currency: item.currency || "USD",
      pricingType: item.pricingType,
      allowMessageWithoutPayment: true,
      isOnline: item.isOnline,
      supportsInPerson: item.supportsInPerson,
      location: item.location || "",
      address: item.location || "",
      coverImage: item.coverImage,
      images: item.images,
      status: "Active",
      isGroupAvailable: false,
      usecapacity: 0,
      discount: 0,
      calender: Boolean(item.calender),
      weeklyHours: item.weeklyHours || null,
      timeZone: item.timeZone || "UTC",
      createdBy: teacher._id,
      createdAt: new Date(Date.now() - index * 3600000),
      updatedAt: new Date(),
    };
  });

  const listingResult = await db.collection("listings").insertMany(listingsToInsert);
  console.log(`Inserted ${listingResult.insertedCount} listings across all 4 scenarios!`);

  console.log("Seeding completed successfully!");
  process.exit(0);
}

runSeed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
