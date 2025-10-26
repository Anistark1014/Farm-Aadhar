/**
 * Farming Tips Service
 * Provides practical farming tips based on crop, season, and conditions
 */

import { supabase } from '@/integrations/supabase/client';

export interface FarmingTip {
  id: string;
  title: string;
  title_hi?: string;
  content: string;
  content_hi?: string;
  category: 'planting' | 'irrigation' | 'pest_control' | 'fertilization' | 'harvesting' | 'soil_care' | 'general';
  season?: string;
  related_crops?: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  priority: number;
  is_published: boolean;
  created_at: string;
}

// Comprehensive farming tips database - FOCUSED ON INDIAN/MAHARASHTRA AGRICULTURE
const farmingTipsDatabase: Omit<FarmingTip, 'id' | 'created_at'>[] = [
  // MAHARASHTRA-SPECIFIC TIPS
  {
    title: 'Sugarcane Intercropping for Maharashtra',
    title_hi: 'महाराष्ट्र में गन्ने की अंतर-फसल',
    content: `Maharashtra's black soil is ideal for sugarcane. Practice intercropping with soybean, onion, or pulses between sugarcane rows in first 4-5 months. This gives extra income and improves soil health. Use drip irrigation to save water - crucial in Marathwada and Vidarbha regions.`,
    content_hi: `महाराष्ट्र की काली मिट्टी गन्ने के लिए आदर्श है। पहले 4-5 महीनों में गन्ने की पंक्तियों के बीच सोयाबीन, प्याज या दालों के साथ अंतर-फसल करें। इससे अतिरिक्त आय मिलती है और मिट्टी का स्वास्थ्य बेहतर होता है। पानी बचाने के लिए ड्रिप सिंचाई का उपयोग करें - मराठवाड़ा और विदर्भ क्षेत्रों में महत्वपूर्ण।`,
    category: 'planting',
    season: 'all',
    related_crops: ['Sugarcane', 'Soybean', 'Onion'],
    difficulty: 'intermediate',
    priority: 10,
    is_published: true,
  },
  {
    title: 'Cotton Farming in Vidarbha Region',
    title_hi: 'विदर्भ क्षेत्र में कपास की खेती',
    content: `BT Cotton is popular in Vidarbha. Plant in June-July with onset of monsoon. Maintain 90cm row spacing and 60cm plant spacing. Use Integrated Pest Management (IPM) for pink bollworm. Install pheromone traps @ 8-10 per acre. Avoid excessive pesticide use - follow Maharashtra government's IPM guidelines.`,
    content_hi: `बीटी कपास विदर्भ में लोकप्रिय है। मानसून शुरू होने के साथ जून-जुलाई में रोपण करें। 90 सेमी की पंक्ति दूरी और 60 सेमी पौधे की दूरी बनाए रखें। गुलाबी बॉलवर्म के लिए एकीकृत कीट प्रबंधन (IPM) का उपयोग करें। फेरोमोन ट्रैप @ 8-10 प्रति एकड़ लगाएं।`,
    category: 'pest_control',
    season: 'kharif',
    related_crops: ['Cotton'],
    difficulty: 'intermediate',
    priority: 10,
    is_published: true,
  },
  {
    title: 'Onion Storage for Market Timing',
    title_hi: 'बाजार समय के लिए प्याज भंडारण',
    content: `Maharashtra grows 30% of India's onions. After Rabi harvest (Feb-March), store onions properly to sell during price peaks (June-August). Use well-ventilated storage with 2-3% weight loss monthly. Check moisture - below 13% is ideal. Nasik farmers get 40-60% higher prices with proper storage timing.`,
    content_hi: `महाराष्ट्र भारत के 30% प्याज उगाता है। रबी की कटाई (फरवरी-मार्च) के बाद, मूल्य चरम (जून-अगस्त) के दौरान बेचने के लिए प्याज को ठीक से स्टोर करें। प्रति माह 2-3% वजन घटाने के साथ अच्छी तरह से हवादार भंडारण का उपयोग करें। नासिक के किसानों को उचित भंडारण समय के साथ 40-60% अधिक कीमतें मिलती हैं।`,
    category: 'harvesting',
    season: 'rabi',
    related_crops: ['Onion'],
    difficulty: 'intermediate',
    priority: 10,
    is_published: true,
  },
  {
    title: 'Monsoon Management for Kharif Crops',
    title_hi: 'खरीफ फसलों के लिए मानसून प्रबंधन',
    content: `Maharashtra's Kharif season (June-October) depends on monsoon. For delayed monsoon, use short-duration varieties of soybean (75-80 days) instead of 95-day varieties. Create farm bunds to conserve rainwater. Install rain gauges to track rainfall - crucial for Marathwada's erratic monsoon patterns.`,
    content_hi: `महाराष्ट्र का खरीफ मौसम (जून-अक्टूबर) मानसून पर निर्भर करता है। देरी से मानसून के लिए, 95-दिन की किस्मों के बजाय सोयाबीन की कम अवधि की किस्में (75-80 दिन) का उपयोग करें। वर्षा जल संरक्षण के लिए खेत के मेड़ बनाएं। वर्षा को ट्रैक करने के लिए वर्षा गेज लगाएं।`,
    category: 'planting',
    season: 'kharif',
    related_crops: ['Soybean', 'Cotton', 'Jowar'],
    difficulty: 'intermediate',
    priority: 10,
    is_published: true,
  },
  {
    title: 'PM-KISAN and Maharashtra State Schemes',
    title_hi: 'पीएम-किसान और महाराष्ट्र राज्य योजनाएं',
    content: `Register for PM-KISAN (₹6000/year) and Maharashtra's Mahatma Jyotiba Phule Shetkari Karjamukti Yojana (loan waiver scheme). Use Aadhaar for e-KYC. Access subsidies for drip irrigation (up to 80%), solar pumps, and soil testing. Visit nearby APMC or Krishi Vigyan Kendra for assistance.`,
    content_hi: `पीएम-किसान (₹6000/वर्ष) और महाराष्ट्र की महात्मा ज्योतिबा फुले शेतकरी कर्जमुक्ती योजना (ऋण माफी योजना) के लिए पंजीकरण करें। ई-केवाईसी के लिए आधार का उपयोग करें। ड्रिप सिंचाई (80% तक), सौर पंप और मिट्टी परीक्षण के लिए सब्सिडी प्राप्त करें।`,
    category: 'general',
    difficulty: 'beginner',
    priority: 10,
    is_published: true,
  },

  // GENERAL PLANTING TIPS
  {
    title: 'Soil Testing Before Planting',
    title_hi: 'रोपण से पहले मिट्टी की जांच',
    content: `Always test your soil pH and nutrient levels before planting. Most crops prefer pH 6.0-7.0. Maharashtra has black soil (pH 7-8.5) in Vidarbha and red soil (pH 6-7) in Konkan. Get free testing at government soil testing labs or Krishi Vigyan Kendras.`,
    content_hi: `रोपण से पहले हमेशा अपनी मिट्टी के pH और पोषक तत्वों का परीक्षण करें। अधिकांश फसलें pH 6.0-7.0 पसंद करती हैं। महाराष्ट्र में विदर्भ में काली मिट्टी (pH 7-8.5) और कोंकण में लाल मिट्टी (pH 6-7) है।`,
    category: 'planting',
    season: 'all',
    difficulty: 'beginner',
    priority: 9,
    is_published: true,
  },
  {
    title: 'Seed Spacing for Better Yield',
    title_hi: 'बेहतर उपज के लिए बीज की दूरी',
    content: `Proper spacing prevents competition for nutrients, water, and sunlight. For tomatoes: 24-36 inches apart. Rice: 6-8 inches. Wheat: 6 inches between rows. Overcrowding leads to disease and poor growth.`,
    content_hi: `उचित दूरी पोषक तत्वों, पानी और सूर्य के प्रकाश के लिए प्रतिस्पर्धा को रोकती है। टमाटर: 24-36 इंच की दूरी। धान: 6-8 इंच। गेहूं: पंक्तियों के बीच 6 इंच।`,
    category: 'planting',
    difficulty: 'beginner',
    priority: 9,
    is_published: true,
  },
  {
    title: 'Companion Planting Benefits',
    title_hi: 'साथी रोपण के लाभ',
    content: `Plant compatible crops together. Tomatoes + Basil repel pests. Corn + Beans + Squash (Three Sisters) support each other. Marigolds protect vegetables from insects. Avoid planting tomatoes near potatoes.`,
    content_hi: `संगत फसलों को एक साथ लगाएं। टमाटर + तुलसी कीटों को दूर भगाते हैं। मक्का + बीन्स + स्क्वैश एक दूसरे का समर्थन करते हैं। गेंदा सब्जियों को कीड़ों से बचाता है।`,
    category: 'planting',
    related_crops: ['Tomato', 'Corn', 'Beans'],
    difficulty: 'intermediate',
    priority: 7,
    is_published: true,
  },

  // IRRIGATION TIPS
  {
    title: 'Drip Irrigation Saves 50% Water',
    title_hi: 'ड्रिप सिंचाई से 50% पानी की बचत',
    content: `Drip irrigation delivers water directly to plant roots, reducing evaporation. Maharashtra government provides 80% subsidy under Pradhan Mantri Krishi Sinchayee Yojana (PMKSY). Ideal for sugarcane, pomegranate, grapes in Marathwada. Saves 40-50% water and increases yield by 30%. Apply through District Agriculture Office.`,
    content_hi: `ड्रिप सिंचाई पानी को सीधे पौधों की जड़ों तक पहुंचाती है, वाष्पीकरण को कम करती है। महाराष्ट्र सरकार प्रधानमंत्री कृषि सिंचाई योजना (PMKSY) के तहत 80% सब्सिडी प्रदान करती है। मराठवाड़ा में गन्ना, अनार, अंगूर के लिए आदर्श। 40-50% पानी बचाता है और उपज 30% बढ़ाता है।`,
    category: 'irrigation',
    related_crops: ['Sugarcane', 'Pomegranate', 'Grapes'],
    difficulty: 'intermediate',
    priority: 10,
    is_published: true,
  },
  {
    title: 'Best Time to Water Plants',
    title_hi: 'पौधों को पानी देने का सबसे अच्छा समय',
    content: `Water early morning (5-9 AM) for best absorption. Evening watering can cause fungal diseases. Avoid midday watering (water evaporates fast). Deep watering once is better than shallow frequent watering.`,
    content_hi: `सुबह जल्दी (5-9 AM) पानी दें सबसे अच्छे अवशोषण के लिए। शाम को पानी देने से फंगल रोग हो सकते हैं। दोपहर में पानी देने से बचें।`,
    category: 'irrigation',
    season: 'summer',
    difficulty: 'beginner',
    priority: 9,
    is_published: true,
  },
  {
    title: 'Rainwater Harvesting for Farming',
    title_hi: 'खेती के लिए वर्षा जल संचयन',
    content: `Collect rainwater in tanks for irrigation. A 1000 sq ft roof can collect 600 gallons per inch of rain. Use filters to remove debris. Store in covered tanks to prevent mosquitoes. Free water for dry season!`,
    content_hi: `सिंचाई के लिए टैंकों में वर्षा जल एकत्र करें। 1000 वर्ग फुट की छत से प्रति इंच बारिश में 600 गैलन पानी एकत्र हो सकता है।`,
    category: 'irrigation',
    season: 'monsoon',
    difficulty: 'intermediate',
    priority: 8,
    is_published: true,
  },

  // PEST CONTROL TIPS
  {
    title: 'Neem Oil: Natural Pesticide',
    title_hi: 'नीम तेल: प्राकृतिक कीटनाशक',
    content: `Mix 2 tablespoons neem oil + 1 teaspoon dish soap in 1 gallon water. Spray on plants weekly. Controls aphids, whiteflies, spider mites. Safe for humans and beneficial insects. Apply in evening to avoid leaf burn.`,
    content_hi: `2 चम्मच नीम का तेल + 1 चम्मच डिश सोप को 1 गैलन पानी में मिलाएं। साप्ताहिक रूप से पौधों पर स्प्रे करें। एफिड्स, व्हाइटफ्लाइज़, स्पाइडर माइट्स को नियंत्रित करता है।`,
    category: 'pest_control',
    difficulty: 'beginner',
    priority: 10,
    is_published: true,
  },
  {
    title: 'Attract Beneficial Insects',
    title_hi: 'लाभकारी कीड़ों को आकर्षित करें',
    content: `Plant flowers like marigold, sunflower, cosmos to attract ladybugs, lacewings, and bees. These eat harmful pests. Avoid broad-spectrum pesticides that kill beneficial insects. Create insect hotels with bamboo tubes.`,
    content_hi: 'गेंदा, सूरजमुखी, कॉसमॉस जैसे फूल लगाएं ताकि लेडीबग, लेसविंग और मधुमक्खियां आकर्षित हों। ये हानिकारक कीटों को खाते हैं।',
    category: 'pest_control',
    difficulty: 'intermediate',
    priority: 8,
    is_published: true,
  },
  {
    title: 'Crop Rotation Prevents Disease',
    title_hi: 'फसल चक्र रोग को रोकता है',
    content: `Rotate crop families yearly to prevent soil depletion and pest buildup. Maharashtra system: Kharif (Cotton/Soybean) → Rabi (Wheat/Gram) → Summer (Vegetables). Avoid continuous cotton for 2-3 years - rotate with pulses. This improves soil nitrogen naturally and reduces fertilizer cost by 30%.`,
    content_hi: `मिट्टी की कमी और कीटों के निर्माण को रोकने के लिए फसल परिवारों को सालाना घुमाएं। महाराष्ट्र प्रणाली: खरीफ (कपास/सोयाबीन) → रबी (गेहूं/चना) → गर्मी (सब्जियां)। 2-3 साल तक लगातार कपास से बचें - दालों के साथ घुमाएं। यह मिट्टी में नाइट्रोजन को प्राकृतिक रूप से सुधारता है और उर्वरक लागत को 30% कम करता है।`,
    category: 'pest_control',
    related_crops: ['Cotton', 'Soybean', 'Wheat', 'Gram'],
    difficulty: 'intermediate',
    priority: 9,
    is_published: true,
  },

  // FERTILIZATION TIPS
  {
    title: 'Compost: Black Gold for Soil',
    title_hi: 'खाद: मिट्टी के लिए काला सोना',
    content: `Make compost from kitchen scraps, grass clippings, leaves. Layer green (nitrogen) and brown (carbon) materials. Keep moist. Turn weekly. Ready in 2-3 months. Adds nutrients and improves soil structure. Free fertilizer!`,
    content_hi: `रसोई के स्क्रैप, घास की कतरनों, पत्तियों से खाद बनाएं। हरी (नाइट्रोजन) और भूरी (कार्बन) सामग्री की परत लगाएं। नम रखें। 2-3 महीने में तैयार। मुफ्त उर्वरक!`,
    category: 'fertilization',
    difficulty: 'beginner',
    priority: 10,
    is_published: true,
  },
  {
    title: 'NPK: Understanding Fertilizer Numbers',
    title_hi: 'NPK: उर्वरक संख्या को समझना',
    content: `NPK shows Nitrogen-Phosphorus-Potassium ratios. 10-10-10 is balanced. High N (20-10-10) for leafy growth. High P (10-20-10) for flowering/fruiting. High K (10-10-20) for root strength. Match to crop needs.`,
    content_hi: `NPK नाइट्रोजन-फास्फोरस-पोटेशियम अनुपात दिखाता है। 10-10-10 संतुलित है। उच्च N (20-10-10) पत्तेदार वृद्धि के लिए। उच्च P फूल/फल के लिए।`,
    category: 'fertilization',
    difficulty: 'intermediate',
    priority: 8,
    is_published: true,
  },
  {
    title: 'Organic Fertilizers for Healthy Crops',
    title_hi: 'स्वस्थ फसलों के लिए जैविक उर्वरक',
    content: `Use cow dung, chicken manure, bone meal, fish emulsion. Organic fertilizers release nutrients slowly, improve soil biology. Apply 2-4 weeks before planting. Mix into top 6 inches of soil. Healthier crops, better taste!`,
    content_hi: `गाय के गोबर, मुर्गी की खाद, हड्डी का चूर्ण का उपयोग करें। जैविक उर्वरक धीरे-धीरे पोषक तत्व छोड़ते हैं। रोपण से 2-4 सप्ताह पहले लागू करें।`,
    category: 'fertilization',
    related_crops: ['Tomato', 'Chili', 'Rice', 'Wheat'],
    difficulty: 'beginner',
    priority: 9,
    is_published: true,
  },

  // HARVESTING TIPS
  {
    title: 'Perfect Harvest Timing',
    title_hi: 'सही फसल कटाई का समय',
    content: `Harvest tomatoes when fully colored but still firm. Leafy greens in morning when crisp. Root vegetables after first frost (sweeter). Check seed packet for days-to-harvest. Early morning harvest lasts longer in storage.`,
    content_hi: `टमाटर की कटाई तब करें जब पूरी तरह से रंगीन हो लेकिन अभी भी मजबूत हो। सुबह में पत्तेदार साग जब कुरकुरा हो। जड़ वाली सब्जियां पहली ठंढ के बाद।`,
    category: 'harvesting',
    related_crops: ['Tomato', 'Lettuce'],
    difficulty: 'beginner',
    priority: 8,
    is_published: true,
  },
  {
    title: 'Post-Harvest Handling',
    title_hi: 'कटाई के बाद की देखभाल',
    content: `Cool harvested crops quickly to preserve freshness. Don't wash until ready to use (bacteria grows on wet produce). Store in cool, dark place. Separate ethylene-producing fruits (apples, bananas) from vegetables. Handle gently to avoid bruising.`,
    content_hi: `ताजगी बनाए रखने के लिए कटी हुई फसलों को जल्दी ठंडा करें। उपयोग के लिए तैयार होने तक धोएं नहीं। ठंडी, अंधेरी जगह में स्टोर करें।`,
    category: 'harvesting',
    difficulty: 'intermediate',
    priority: 7,
    is_published: true,
  },

  // SOIL CARE TIPS
  {
    title: 'Mulching: Nature\'s Blanket',
    title_hi: 'मल्चिंग: प्रकृति का कंबल',
    content: `Apply 2-4 inch layer of organic mulch (straw, wood chips, leaves) around plants. Retains moisture, suppresses weeds, regulates soil temperature. Keep mulch 2 inches away from plant stems to prevent rot. Refreshes soil as it decomposes.`,
    content_hi: `पौधों के चारों ओर जैविक मल्च (भूसा, लकड़ी के चिप्स, पत्ते) की 2-4 इंच की परत लगाएं। नमी बनाए रखता है, खरपतवार दबाता है, मिट्टी के तापमान को नियंत्रित करता है।`,
    category: 'soil_care',
    difficulty: 'beginner',
    priority: 9,
    is_published: true,
  },
  {
    title: 'Green Manure Cover Crops',
    title_hi: 'हरी खाद की फसलें',
    content: `Plant legumes (clover, vetch, beans) in off-season. They fix nitrogen from air into soil. Plow under before flowering. Adds organic matter, prevents erosion, breaks pest cycles. Nature's fertilizer factory!`,
    content_hi: `ऑफ-सीजन में फलियां (तिपतिया घास, वेच, बीन्स) लगाएं। वे हवा से मिट्टी में नाइट्रोजन को ठीक करते हैं। फूल आने से पहले जुताई करें। कटाव को रोकता है।`,
    category: 'soil_care',
    season: 'winter',
    difficulty: 'intermediate',
    priority: 8,
    is_published: true,
  },
  {
    title: 'No-Till Farming Benefits',
    title_hi: 'बिना जुताई खेती के लाभ',
    content: `Avoid excessive tilling - it destroys soil structure and beneficial organisms. Use cover crops and mulch instead. No-till retains moisture, reduces erosion, saves fuel. Healthier soil = healthier crops = better yield.`,
    content_hi: `अत्यधिक जुताई से बचें - यह मिट्टी की संरचना और लाभकारी जीवों को नष्ट करती है। इसके बजाय कवर फसलों और मल्च का उपयोग करें। स्वस्थ मिट्टी = स्वस्थ फसलें = बेहतर उपज।`,
    category: 'soil_care',
    difficulty: 'advanced',
    priority: 7,
    is_published: true,
  },

  // GENERAL TIPS
  {
    title: 'Farm Records for Better Management',
    title_hi: 'बेहतर प्रबंधन के लिए खेत के रिकॉर्ड',
    content: `Keep a farming journal with planting dates, expenses, yields. Use Farm Aadhar IoT dashboard for automated tracking! Register your farm with Maharashtra's Aaple Sarkar portal for easy access to schemes. Track APMC mandi prices daily to decide best selling time. Data-driven decisions increase profit by 20-30%.`,
    content_hi: `रोपण तिथियों, खर्चों, उपज के साथ एक खेती की डायरी रखें। स्वचालित ट्रैकिंग के लिए Farm Aadhar IoT डैशबोर्ड का उपयोग करें! योजनाओं तक आसान पहुंच के लिए अपने खेत को महाराष्ट्र के आपले सरकार पोर्टल के साथ पंजीकृत करें। डेटा-संचालित निर्णय लाभ को 20-30% तक बढ़ाते हैं।`,
    category: 'general',
    difficulty: 'beginner',
    priority: 10,
    is_published: true,
  },
  {
    title: 'APMC Mandi Price Tracking',
    title_hi: 'APMC मंडी मूल्य ट्रैकिंग',
    content: `Check Maharashtra APMC (Agricultural Produce Market Committee) prices daily on Agmarknet portal. Major mandis: Pune (vegetables), Nashik (onions), Solapur (cotton), Nagpur (oranges). Sell when prices are 15-20% above modal price. Avoid distress sales immediately after harvest - use cold storage if available.`,
    content_hi: `Agmarknet पोर्टल पर महाराष्ट्र APMC (कृषि उपज बाजार समिति) की कीमतें रोजाना चेक करें। प्रमुख मंडियां: पुणे (सब्जियां), नासिक (प्याज), सोलापुर (कपास), नागपुर (संतरे)। जब कीमतें मोडल मूल्य से 15-20% अधिक हों तब बेचें।`,
    category: 'general',
    related_crops: ['Onion', 'Cotton', 'Vegetables'],
    difficulty: 'intermediate',
    priority: 10,
    is_published: true,
  },
  {
    title: 'IoT Sensors Save Time and Money',
    title_hi: 'IoT सेंसर समय और पैसा बचाते हैं',
    content: `Install soil moisture sensors, temperature sensors, and weather stations. Get real-time alerts on your phone. Automate irrigation. Prevent crop damage. Farm Aadhar system monitors 24/7. Smart farming is future of agriculture!`,
    content_hi: `मिट्टी की नमी सेंसर, तापमान सेंसर और मौसम स्टेशन स्थापित करें। अपने फोन पर रियल-टाइम अलर्ट प्राप्त करें। सिंचाई को स्वचालित करें। Farm Aadhar सिस्टम 24/7 निगरानी करता है।`,
    category: 'general',
    difficulty: 'intermediate',
    priority: 9,
    is_published: true,
  },
];

/**
 * Get farming tips with optional filters
 */
export async function getFarmingTips(filters?: {
  category?: string;
  difficulty?: string;
  language?: 'en' | 'hi';
  crop?: string;
  limit?: number;
}) {
  let tips = [...farmingTipsDatabase];

  // Filter by category
  if (filters?.category && filters.category !== 'all') {
    tips = tips.filter(tip => tip.category === filters.category);
  }

  // Filter by difficulty
  if (filters?.difficulty && filters.difficulty !== 'all') {
    tips = tips.filter(tip => tip.difficulty === filters.difficulty);
  }

  // Filter by related crop
  if (filters?.crop) {
    tips = tips.filter(tip => 
      tip.related_crops?.some(crop => 
        crop.toLowerCase().includes(filters.crop!.toLowerCase())
      )
    );
  }

  // Sort by priority
  tips.sort((a, b) => b.priority - a.priority);

  // Limit results
  if (filters?.limit) {
    tips = tips.slice(0, filters.limit);
  }

  // Add IDs and timestamps
  return tips.map((tip, index) => ({
    ...tip,
    id: `tip-${index}`,
    created_at: new Date().toISOString(),
  }));
}

/**
 * Get tips count by category
 */
export function getTipsCountByCategory() {
  const counts: Record<string, number> = {};
  
  farmingTipsDatabase.forEach(tip => {
    counts[tip.category] = (counts[tip.category] || 0) + 1;
  });
  
  return counts;
}

/**
 * Get random tip of the day
 */
export function getTipOfTheDay(language: 'en' | 'hi' = 'en') {
  const publishedTips = farmingTipsDatabase.filter(tip => tip.is_published);
  const randomTip = publishedTips[Math.floor(Math.random() * publishedTips.length)];
  
  return {
    ...randomTip,
    id: 'tip-of-day',
    created_at: new Date().toISOString(),
  };
}
