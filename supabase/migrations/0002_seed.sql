-- =====================================================================
-- Raw Smith Ops — seed data
-- =====================================================================
-- Loads:
--   * 7 inventory categories
--   * ~70 inventory items (deduped, typos fixed, date-as-quantity bugs
--     coerced to NULL with notes)
--   * Opening + closing shift checklist templates (typos fixed in EN,
--     natural barista-Arabic translations)
--
-- NOT loaded here (depends on auth.users existing):
--   * Profile rows for the 5 staff — created by `npm run seed:users`
--   * Sample week of shifts — also created by `npm run seed:users`
--
-- Re-runnable via ON CONFLICT clauses.
-- =====================================================================

-- ---------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------

insert into inventory_categories (name, name_ar, icon, order_index) values
  ('Coffee Beans',           'حبوب القهوة',           '☕',  1),
  ('Cleaning Supplies',      'مواد التنظيف',           '🧼', 2),
  ('Paper Products',         'ورقيات',                 '🧻', 3),
  ('Trash Bags',             'أكياس قمامة',            '🗑️', 4),
  ('Consumables',            'مستهلكات',               '📦', 5),
  ('Beverages & Ingredients','مشروبات ومكونات',        '🥛', 6),
  ('Coffee Tools & Filters', 'أدوات وفلاتر القهوة',    '🧰', 7)
on conflict (name) do update set
  name_ar = excluded.name_ar,
  icon = excluded.icon,
  order_index = excluded.order_index;

-- ---------------------------------------------------------------------
-- inventory items
-- ---------------------------------------------------------------------
-- NULL quantity + notes 'verify-quantity-was-date' marks the seven items
-- the old Excel stored as JS Dates ("1/2/2025"). Owner must verify on
-- first login and enter real numbers.

with cats as (
  select id, name from inventory_categories
)
insert into inventory_items (category_id, name, name_ar, unit, quantity, min_level, par_level, notes) values
  -- COFFEE BEANS (gram)  --  min 200 / par 1000
  ((select id from cats where name='Coffee Beans'), 'Esparenza',                       'إسبيرانزا',                    'gram',  290,  200, 1000, null),
  ((select id from cats where name='Coffee Beans'), 'Guava Banana',                    'جوافة وموز',                   'gram', 1220,  200, 1000, null),
  ((select id from cats where name='Coffee Beans'), 'Halo Beriti',                     'هالو بيريتي',                  'gram',  880,  200, 1000, null),
  ((select id from cats where name='Coffee Beans'), 'Raw',                             'راو',                          'gram',  850,  200, 1000, null),
  ((select id from cats where name='Coffee Beans'), 'KII Peaberry',                    'كي آي آي بيبري',               'gram', 1000,  200, 1000, null),
  ((select id from cats where name='Coffee Beans'), 'Pradera',                         'براديرا',                       'gram',  330,  200, 1000, null),
  ((select id from cats where name='Coffee Beans'), 'Volcan 89+',                      'فولكان 89+',                   'gram',  115,  200, 1000, null),
  ((select id from cats where name='Coffee Beans'), 'Bener Kelipah',                   'بينر كيليبه',                  'gram',  230,  200, 1000, null),
  ((select id from cats where name='Coffee Beans'), 'El-Coco',                         'الكوكو',                       'gram', 4000,  200, 1000, null),
  ((select id from cats where name='Coffee Beans'), 'Volcan 88+',                      'فولكان 88+',                   'gram',  300,  200, 1000, null),
  ((select id from cats where name='Coffee Beans'), 'El-Chorro',                       'الشورو',                       'gram',  400,  200, 1000, null),
  ((select id from cats where name='Coffee Beans'), 'Vara Blanca',                     'فارا بلانكا',                   'gram',  210,  200, 1000, null),
  ((select id from cats where name='Coffee Beans'), 'Mi Finquita',                     'مي فينكيتا',                   'gram',  100,  200, 1000, null),
  ((select id from cats where name='Coffee Beans'), 'Boshan',                          'بوشان',                        'gram',   60,  200, 1000, null),
  ((select id from cats where name='Coffee Beans'), 'Pearl Mountain',                  'بيرل ماونتن',                  'gram',  240,  200, 1000, null),
  ((select id from cats where name='Coffee Beans'), 'Yellow Papayo',                   'يلو بابايو',                   'gram',  310,  200, 1000, null),
  ((select id from cats where name='Coffee Beans'), 'Sol Naciente',                    'سول ناسينتي',                  'gram',  460,  200, 1000, null),
  ((select id from cats where name='Coffee Beans'), 'Karimikui AA',                    'كاريميكوي AA',                 'gram',  250,  200, 1000, null),
  ((select id from cats where name='Coffee Beans'), 'Low Caf',                         'لو كاف',                       'gram',  280,  200, 1000, null),
  ((select id from cats where name='Coffee Beans'), 'Muzo',                            'موزو',                         'gram',  400,  200, 1000, null),
  ((select id from cats where name='Coffee Beans'), 'Red Bourbon',                     'ريد بوربون',                   'gram',  200,  200, 1000, null),
  ((select id from cats where name='Coffee Beans'), 'Pink Bourbon',                    'بينك بوربون',                  'gram',  410,  200, 1000, 'Merged from two duplicate rows in old sheet.'),
  ((select id from cats where name='Coffee Beans'), 'Cascara',                         'كاسكارا',                      'gram',  420,  200, 1000, 'Merged from two duplicate rows in old sheet.'),
  ((select id from cats where name='Coffee Beans'), 'El Salvador Finca Majahual',      'إلسلفادور فينكا ماهاوال',      'gram', 1000,  200, 1000, null),
  ((select id from cats where name='Coffee Beans'), 'Alo Coffee Ethiopia',             'آلو كوفي إثيوبيا',             'gram', 1000,  200, 1000, null),
  ((select id from cats where name='Coffee Beans'), 'H17 Hybrid Volcan Azul',          'H17 هايبرد فولكان أزول',       'gram', 1000,  200, 1000, null),

  -- CLEANING SUPPLIES  --  min 2 / par 6
  ((select id from cats where name='Cleaning Supplies'), 'Hand Soap',                  'صابون يدين',                   'pack',  2,    2,    6, null),
  ((select id from cats where name='Cleaning Supplies'), 'Dishwashing Liquid',         'سائل جلي',                     'pack',  2,    2,    6, null),
  ((select id from cats where name='Cleaning Supplies'), 'Flash',                      'فلاش',                          'pack',  2,    2,    6, null),
  ((select id from cats where name='Cleaning Supplies'), 'Easy',                       'إيزي',                          'pack',  2,    2,    6, null),
  ((select id from cats where name='Cleaning Supplies'), 'Ajax',                       'أجاكس',                        'pack',  1,    1,    4, null),
  ((select id from cats where name='Cleaning Supplies'), 'Dishwashing Sponges',        'إسفنجات جلي',                  'pcs',  11,    4,   20, null),

  -- PAPER PRODUCTS  --  min 2 / par 6 (rolls bigger)
  ((select id from cats where name='Paper Products'), 'Fine Short Roll',               'فاين رول قصير',                'roll', 16,    4,   20, null),
  ((select id from cats where name='Paper Products'), 'Fine Long Roll',                'فاين رول طويل',                'roll', 12,    4,   20, null),
  ((select id from cats where name='Paper Products'), 'Fine Napkins',                  'محارم فاين',                   'pack',  7,    2,    8, null),

  -- TRASH BAGS  --  min 1 / par 4
  ((select id from cats where name='Trash Bags'), 'Bar Trash Bags',                    'أكياس قمامة البار',            'pack',  1,    1,    4, null),
  ((select id from cats where name='Trash Bags'), 'Bathroom Trash Bags',               'أكياس قمامة الحمّام',           'roll',  1,    1,    4, null),

  -- CONSUMABLES
  ((select id from cats where name='Consumables'), 'Knock Box',                        'صندوق التفل',                  'pcs',  null,  1,    2, 'Excel imported as date — verify quantity'),
  ((select id from cats where name='Consumables'), 'Large Carton Cups',                'أكواب كرتون كبيرة',            'pcs',  18,    8,   40, null),
  ((select id from cats where name='Consumables'), 'Small Carton Cups',                'أكواب كرتون صغيرة',            'pcs',   2,    8,   40, null),
  ((select id from cats where name='Consumables'), 'Visa Roll',                        'رول الفيزا',                   'roll', 14,    4,   20, null),
  ((select id from cats where name='Consumables'), 'Cash Roll',                        'رول الكاش',                    'roll',  8,    4,   20, null),
  ((select id from cats where name='Consumables'), 'Straws',                           'قصبات شرب',                    'pack',  2,    2,    6, null),
  ((select id from cats where name='Consumables'), 'Shopping Bags',                    'أكياس تسوّق',                  'pack',  0,    2,    6, null),
  ((select id from cats where name='Consumables'), 'Pastry Bags',                      'أكياس معجنات',                 'pack',  0,    2,    6, null),

  -- BEVERAGES & INGREDIENTS
  ((select id from cats where name='Beverages & Ingredients'), 'Ultra Water',          'مياه ألترا',                   'shrink', 43,   6,   30, null),
  ((select id from cats where name='Beverages & Ingredients'), 'Sparkling Water',      'مياه سباركلينج',               'shrink',  5,   2,   12, null),
  ((select id from cats where name='Beverages & Ingredients'), 'Oat Milk',             'حليب شوفان',                   'pack',  12,    4,   16, null),
  ((select id from cats where name='Beverages & Ingredients'), 'Almond Milk',          'حليب لوز',                     'pack',  14,    4,   16, null),
  ((select id from cats where name='Beverages & Ingredients'), 'Lactose-Free Milk',    'حليب خالي اللاكتوز',           'pack',   1,    4,   16, null),
  ((select id from cats where name='Beverages & Ingredients'), 'Whipping Cream',       'كريمة خفق',                    'pack',   1,    2,    6, null),
  ((select id from cats where name='Beverages & Ingredients'), 'Peach Syrup',          'شراب الخوخ',                   'bottle', null, 1,    3, 'Excel imported as date — verify quantity'),
  ((select id from cats where name='Beverages & Ingredients'), 'Vanilla Syrup',        'شراب الفانيلا',                'bottle', null, 1,    3, 'Excel imported as date — verify quantity'),
  ((select id from cats where name='Beverages & Ingredients'), 'Pink Syrup',           'شراب وردي',                    'bottle', null, 1,    3, 'Excel imported as date — verify quantity'),
  ((select id from cats where name='Beverages & Ingredients'), 'Lemonade Syrup',       'شراب الليمونادة',              'bottle',  1,   1,    3, null),
  ((select id from cats where name='Beverages & Ingredients'), 'Medalist Tea',         'شاي ميداليست',                 'pcs',    98, 20,  120, null),
  ((select id from cats where name='Beverages & Ingredients'), 'Iced Tea',             'آيس تي',                       'gram',  200, 100,  500, null),
  ((select id from cats where name='Beverages & Ingredients'), 'Tahini',               'طحينة',                        'jar',   null, 1,    3, 'Excel imported as date — verify quantity'),
  ((select id from cats where name='Beverages & Ingredients'), 'Honey',                'عسل',                          'jar',   null, 1,    3, 'Excel imported as date — verify quantity'),
  ((select id from cats where name='Beverages & Ingredients'), 'CM',                   'CM',                           'can',     1, 1,    3, null),
  ((select id from cats where name='Beverages & Ingredients'), 'Maple Syrup',          'شراب القيقب',                  'jar',   0.75, 1,    3, null),
  ((select id from cats where name='Beverages & Ingredients'), 'Ice Cream',            'آيس كريم',                     'gram',  100, 100,  500, null),

  -- COFFEE TOOLS & FILTERS
  ((select id from cats where name='Coffee Tools & Filters'), 'V60 Filters',           'فلاتر V60',                    'pack',   2,    1,    4, null),
  ((select id from cats where name='Coffee Tools & Filters'), 'Aeropress Filters',     'فلاتر إيروبرس',                'pack',  null,  1,    4, 'Excel imported as date — verify quantity'),
  ((select id from cats where name='Coffee Tools & Filters'), 'Kalita Filters',        'فلاتر كاليتا',                 'pack',   0,    1,    4, null),
  ((select id from cats where name='Coffee Tools & Filters'), 'Nitrogen Cartridge',    'كبسولة نيتروجين',              'shots', 14,    5,   20, null)
on conflict do nothing;

-- ---------------------------------------------------------------------
-- checklist templates: OPENING shift
-- ---------------------------------------------------------------------
-- Typos fixed in EN: "chelf"→shelf, "sdie"→side, "tern"→turn, "egle"→eagle.
-- AR is hand-written natural barista-Arabic (Jordanian colloquial),
-- not formal MSA — e.g. "افتح الشيفت" not "ابدأ بالوردية".

insert into checklist_templates (shift, section, code, title, title_ar, instructions, instructions_ar, order_index, frequency) values
  -- OUTSIDE
  ('opening', 'outside', 'A',
   'Open shift — lights, lamp, system, music, window',
   'افتح الشيفت — إنارة، إبجورة، نظام، موسيقى، شبّاك',
   'Turn on lights (lower switch), table lamp, system, music. Open the window.',
   'شغّل الإنارة (السويتش التحتاني)، الإبجورة، النظام، الموسيقى. افتح الشبّاك.',
   10, 'every_shift'),
  ('opening', 'outside', 'B',
   'Sweep outside, set tables, wipe surfaces',
   'كنس الخارج، ترتيب الطاولات، مسح الأسطح',
   'Sweep outside floor up & down. Set table positions. Wipe tables, table bases, chairs, bench chairs, and the outside wall.',
   'اكنس الأرض برّا فوق وتحت. ضبّط الطاولات. امسح الطاولات وقواعدها والكراسي والبنش والحيط الخارجي.',
   20, 'every_shift'),
  ('opening', 'outside', 'C',
   'Open umbrellas (~8am)',
   'افتح المظلات (حوالي الساعة 8)',
   'Around 8am: open both umbrellas.',
   'حوالي الساعة 8 صباحاً: افتح المظلتين.',
   30, 'every_shift'),

  -- INSIDE
  ('opening', 'inside', 'A',
   'Tables, chairs, shelf and coffee table — clean and set',
   'الطاولات والكراسي والرف وطاولة القهوة — نظيفة ومرتبة',
   'Set tables and chairs to correct positions. Clean tables and chairs. Clean shelf. Clean coffee table.',
   'رتّب الطاولات والكراسي بمكانها الصح. نظّف الطاولات والكراسي. نظّف الرف. نظّف طاولة القهوة.',
   10, 'every_shift'),
  ('opening', 'inside', 'B',
   'Bathroom prep — tissue, soap, trash, candles, mirrors',
   'تجهيز الحمّام — محارم، صابون، قمامة، شموع، مرايا',
   'Check and restock tissue, soap, trash bags. Make sure candles are lit and mirrors are clean.',
   'افحص وعبّي المحارم والصابون وأكياس القمامة. تأكد إنه الشموع شغّالة والمرايا نظيفة.',
   20, 'every_shift'),
  ('opening', 'inside', 'C',
   'Customer window / bar — clean, no smoke, no dust',
   'شبّاك الزبون / البار — نظيف، بدون دخان، بدون غبار',
   'Customer window and bar area: clean, no smoke, no dust.',
   'شبّاك الزبون ومنطقة البار: نظيف، بدون دخان، بدون غبار.',
   30, 'every_shift'),

  -- OPERATION
  ('opening', 'operation', 'A',
   'Calibration — E80 GBW, YOU machine, daily espresso shots',
   'المعايرة — E80 GBW، ماكينة YOU، شوتات الإسبريسو اليومية',
   'Reset the E80 GBW grinder (turn off, then on while holding both switches on the right side). Check Volumetric and temperature on the YOU espresso machine. Run the daily espresso calibration and pull test shots until quality is consistent.',
   'اعمل ريسيت لمطحنة E80 GBW (طفّيها وشغّلها وأنت ضاغط الزرّين اللي ع اليمين). افحص الـ Volumetric والحرارة على ماكينة YOU. شغّل معايرة الإسبريسو اليومية واسحب شوتات تجريبية لحد ما الجودة تثبت.',
   10, 'every_shift'),
  ('opening', 'operation', 'B',
   'Set tools — towels, eagle-eye scan, coffee stand beans',
   'تجهيز الأدوات — مناشف، فحص شامل، حبوب ستاند القهوة',
   'Prepare bar and steam towels. Eagle-eye scan from EK-43 to puck prep tools to E80 GBW to YOU espresso machine body and cup warmer. Stock the coffee stand beans.',
   'جهّز مناشف البار والستيم. اعمل سحبة عين النسر من الـ EK-43 لأدوات الـ Puck Prep للـ E80 GBW لجسم ماكينة YOU وسخّان الكاسات. عبّي حبوب ستاند القهوة.',
   20, 'every_shift'),
  ('opening', 'operation', 'C',
   'Check coffee water — kettle, machine, bottle',
   'افحص مياه القهوة — الإبريق والماكينة والقنينة',
   'Kettle clean and refilled. Espresso machine water. Refill the water bottle.',
   'الإبريق نظيف ومعبّى. مياه ماكينة الإسبريسو جاهزة. عبّي قنينة المياه.',
   30, 'every_shift'),
  ('opening', 'operation', 'D',
   'Refill fridge — milk, cold foam, iced tea, water',
   'عبّي الثلاجة — حليب، فوم بارد، آيس تي، مياه',
   'Refill: milk, Mont Blanc cold foam, iced tea, water and sparkling water.',
   'عبّي: حليب، فوم بارد مونت بلانك، آيس تي، مياه وسباركلينج.',
   40, 'every_shift'),
  ('opening', 'operation', 'E',
   'Set pastry cabinet — croissants, carrot, banana cake',
   'جهّز خزانة المعجنات — كرواسون، كيك جزر، كيك موز',
   'Arrange croissants, carrot cake, and banana cake neatly. Check freshness and presentation.',
   'رتّب الكرواسون وكيك الجزر وكيك الموز بشكل منيح. تأكد من الطزاجة والمنظر.',
   50, 'every_shift'),
  ('opening', 'operation', 'F',
   'Refill ice cube containers — coffee and water cubes',
   'عبّي حاويات مكعبات الثلج — مكعبات قهوة ومياه',
   'Refill the coffee cubes container and the water cubes container.',
   'عبّي حاوية مكعبات القهوة وحاوية مكعبات المياه.',
   60, 'every_shift'),
  ('opening', 'operation', 'G',
   'Refill cold brew tower — 1L raw cold brew',
   'عبّي تاور الكولد برو — لتر كولد برو',
   'Refill 1L of raw cold brew using 88 or 89 coffee. Ask on the WhatsApp group which one to use today.',
   'عبّي لتر كولد برو خام بقهوة 88 أو 89. اسأل على جروب الواتس أي وحدة اليوم.',
   70, 'every_shift'),

  -- END SHIFT (opening team handover, around 1:30pm)
  ('opening', 'end_shift', 'A',
   'Prepare towels and eagle-eye scan',
   'جهّز المناشف واعمل فحص شامل',
   'Prepare towels and do an eagle-eye scan across the bar (same routine as operation B).',
   'جهّز المناشف واعمل سحبة عين النسر على البار (نفس روتين Operation B).',
   10, 'every_shift'),
  ('opening', 'end_shift', 'B',
   'Change trash bags — bathroom and bar',
   'غيّر أكياس القمامة — الحمّام والبار',
   'Change trash bags in the bathroom and at the bar.',
   'غيّر أكياس القمامة بالحمّام والبار.',
   20, 'every_shift'),
  ('opening', 'end_shift', 'C',
   'Refill shelf — milk, water, coffee, doses',
   'عبّي الرف — حليب، مياه، قهوة، جرعات',
   'Refill checklist for the shelf: milk, water, coffee, coffee doses.',
   'عبّي تشيك ليست الرف: حليب، مياه، قهوة، جرعات القهوة.',
   30, 'every_shift'),
  ('opening', 'end_shift', 'D',
   'Final scan — outside and inside clean',
   'فحص نهائي — برّا وجوّا نظيف',
   'Walk through outside and inside. Everything clean and organized before handover.',
   'مرّ على الخارج والداخل. كل شي نظيف ومرتب قبل تسليم الشيفت.',
   40, 'every_shift');

-- ---------------------------------------------------------------------
-- checklist templates: CLOSING shift
-- ---------------------------------------------------------------------
-- Single canonical list (the old sheet duplicated inside/operation in
-- the closing tab — we removed those duplicates and only keep the
-- closing-specific work here).

insert into checklist_templates (shift, section, code, title, title_ar, instructions, instructions_ar, order_index, frequency) values
  -- HANDOVER
  ('closing', 'handover', 'A',
   'Receive shift from morning team',
   'استلام الشيفت من فريق الصباح',
   'Receive the shift from the morning team. Get updates on anything pending.',
   'استلم الشيفت من فريق الصباح. خد التحديثات على أي شي معلّق.',
   10, 'every_shift'),
  ('closing', 'handover', 'B',
   'Check stock orders, post to WhatsApp group',
   'افحص طلبات المخزون، انشرها بجروب الواتس',
   'Check stock orders left by morning shift. Write any stock orders on the WhatsApp group.',
   'افحص طلبات المخزون اللي تركها شيفت الصباح. اكتب طلبات المخزون على جروب الواتس.',
   20, 'every_shift'),

  -- OUTSIDE
  ('closing', 'outside', 'A',
   'Sweep outside, set tables, wipe surfaces',
   'كنس الخارج، ترتيب الطاولات، مسح الأسطح',
   'Sweep outside floor. Set table positions. Wipe tables, chairs, bench chairs, and the outside wall.',
   'اكنس الأرض برّا. رتّب الطاولات. امسح الطاولات والكراسي والبنش والحيط الخارجي.',
   10, 'every_shift'),
  ('closing', 'outside', 'C',
   'Close umbrellas (~1:30pm)',
   'سكّر المظلات (حوالي الساعة 1:30)',
   'Around 1:30pm: close both umbrellas.',
   'حوالي الساعة 1:30 ظهراً: سكّر المظلتين.',
   20, 'every_shift'),

  -- INSIDE
  ('closing', 'inside', 'A',
   'Tables, chairs, shelf, coffee table — re-clean',
   'الطاولات والكراسي والرف وطاولة القهوة — تنظيف ثاني',
   'Re-set tables and chairs. Re-clean tables, chairs, shelf, and coffee table.',
   'رتّب الطاولات والكراسي. نظّف الطاولات والكراسي والرف وطاولة القهوة من جديد.',
   10, 'every_shift'),
  ('closing', 'inside', 'B',
   'Customer window / bar — re-clean',
   'شبّاك الزبون / البار — تنظيف ثاني',
   'Customer window and bar area: clean, no smoke, no dust.',
   'شبّاك الزبون ومنطقة البار: نظيف، بدون دخان، بدون غبار.',
   20, 'every_shift'),

  -- OPERATION (afternoon refills + calibration check)
  ('closing', 'operation', 'A',
   'Afternoon calibration check',
   'فحص معايرة بعد الظهر',
   'Re-check espresso calibration on the YOU machine. Pull a test shot.',
   'افحص معايرة الإسبريسو على ماكينة YOU من جديد. اسحب شوت تجريبي.',
   10, 'every_shift'),
  ('closing', 'operation', 'B',
   'Refill fridge — milk, cold foam, iced tea, water',
   'عبّي الثلاجة — حليب، فوم بارد، آيس تي، مياه',
   'Refill: milk, Mont Blanc cold foam, iced tea, water and sparkling water.',
   'عبّي: حليب، فوم بارد مونت بلانك، آيس تي، مياه وسباركلينج.',
   20, 'every_shift'),
  ('closing', 'operation', 'C',
   'Refill ice cube containers',
   'عبّي حاويات مكعبات الثلج',
   'Refill coffee cubes and water cubes for the evening rush.',
   'عبّي مكعبات القهوة ومكعبات المياه قبل ضغط المساء.',
   30, 'every_shift'),
  ('closing', 'operation', 'D',
   'Top up cold brew tower if low',
   'عبّي تاور الكولد برو لو ناقص',
   'If the cold brew tower is low, refill with 1L of cold brew. Ask on WhatsApp group which beans to use.',
   'لو تاور الكولد برو ناقص، عبّيه بلتر كولد برو. اسأل على جروب الواتس أي حبوب نستخدم.',
   40, 'every_shift'),

  -- END SHIFT
  ('closing', 'end_shift', 'A',
   'Prepare towels and eagle-eye scan',
   'جهّز المناشف واعمل فحص شامل',
   'Prepare towels and do an eagle-eye scan across the bar.',
   'جهّز المناشف واعمل سحبة عين النسر على البار.',
   10, 'every_shift'),
  ('closing', 'end_shift', 'B',
   'Change trash bags',
   'غيّر أكياس القمامة',
   'Change trash bags in the bathroom and at the bar.',
   'غيّر أكياس القمامة بالحمّام والبار.',
   20, 'every_shift'),
  ('closing', 'end_shift', 'C',
   'Wash floor — Mon / Thu / Fri only',
   'اغسل الأرض — إثنين / خميس / جمعة فقط',
   'Move all furniture and wash the floor thoroughly. Order: coffee table area → inside bar → outside.',
   'حرّك كل العفش واغسل الأرض كويس. الترتيب: منطقة طاولة القهوة ← داخل البار ← الخارج.',
   30, 'mon_thu_fri'),
  ('closing', 'end_shift', 'D',
   'Bathroom — restock and clean floor',
   'الحمّام — تعبئة وغسل الأرض',
   'Bathroom: restock tissue, soap, trash. Candles lit. Mirrors clean. Floor washed.',
   'الحمّام: عبّي محارم وصابون وأكياس قمامة. الشموع شغّالة. المرايا نظيفة. الأرض مغسولة.',
   40, 'every_shift'),
  ('closing', 'end_shift', 'E',
   'Closing — windows, outside furniture, trash, curtain',
   'إغلاق — شبابيك، أثاث برّا، قمامة، ستارة',
   'Close the window. Bring outside chairs and tables in. Change outside trash bags. Close the curtain.',
   'سكّر الشبّاك. فوّت كراسي وطاولات الخارج. غيّر أكياس قمامة الخارج. سكّر الستارة.',
   50, 'every_shift'),
  ('closing', 'end_shift', 'F',
   'Charging — scale and Visa machine',
   'الشحن — الميزان وماكينة الفيزا',
   'Put the scale and the Visa machine on charge for the morning.',
   'حط الميزان وماكينة الفيزا على الشحن لصباح بكرا.',
   60, 'every_shift'),
  ('closing', 'end_shift', 'G',
   'Good night 03',
   'تصبح على خير 03',
   'Final sign-off. Lights off. Lock up.',
   'التسليم النهائي. طفّي الإنارة. سكّر المحل.',
   70, 'every_shift');
