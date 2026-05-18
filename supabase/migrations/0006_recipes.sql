-- =====================================================================
-- Recipe book
-- =====================================================================
-- Single source of truth for drink builds. Read by any authenticated
-- user; only managers can edit. The bilingual (`name_ar`) column is
-- here for future Arabic translations — left null on seed.
-- =====================================================================

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  category text not null check (category in ('black', 'white')),
  is_iced boolean not null default false,
  name text not null,
  name_ar text,
  glassware text,
  ratio text,
  grind text,
  time_target text,
  steps jsonb not null default '[]'::jsonb,
  notes text,
  order_index int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recipes_category_idx on recipes(category, order_index);

alter table recipes enable row level security;

drop policy if exists "recipes_read_auth" on recipes;
create policy "recipes_read_auth" on recipes
  for select using (auth.role() = 'authenticated');

drop policy if exists "recipes_write_manager" on recipes;
create policy "recipes_write_manager" on recipes
  for all
  using (is_manager(auth.uid()))
  with check (is_manager(auth.uid()));

drop trigger if exists trg_recipes_updated_at on recipes;
create trigger trg_recipes_updated_at
  before update on recipes
  for each row execute procedure set_updated_at();

-- =====================================================================
-- Seed: Raw Smith Recipe Book 2025
-- Typos cleaned, duplicates removed, units normalized.
-- =====================================================================

insert into recipes (code, category, is_iced, name, glassware, ratio, grind, time_target, steps, notes, order_index) values
('espresso','black',false,'Espresso','MHW espresso cup + small spoon','1:2.5',null,'39-43s',
 '["Pull a golden shot: fully sweet, balanced acidity, no bitterness.","Target extraction time 39-43s."]'::jsonb,
 null,10),
('espresso_shaken','black',true,'Espresso Shaken','Old fashioned glass','1:2.5 (lungo)',null,'39-43s',
 '["Pull a lungo shot.","In a shaker, add the shot, 8 drops sodium solution, and rock ice.","If the coffee is floral, add 5 drops malic.","Shake well.","Pour over rock ice in an old fashioned glass.","Finish with a sun-dried orange slice on top."]'::jsonb,
 null,20),
('short_black','black',false,'Short Black','Muvna flat white cup',null,null,null,
 '["90 ml kettle water at 69 C.","Lungo shot on top."]'::jsonb,
 null,30),
('long_black','black',false,'Long Black','Muvna latte cup',null,null,null,
 '["140 ml kettle water at 69 C.","Espresso shot on top."]'::jsonb,
 null,40),
('americano','black',false,'Americano','Muvna latte cup',null,null,null,
 '["Pull an espresso shot.","Add 140 ml kettle water at 69 C on top.","Mix with an Aeropress stirrer."]'::jsonb,
 null,50),
('iced_long_black','black',true,'Iced Long Black','MHW long iced latte glass',null,null,null,
 '["130 ml Altra bottled water.","Espresso shot on top."]'::jsonb,
 null,60),
('cold_brew','black',true,'Cold Brew','Old fashioned glass',null,null,null,
 '["Rock ice in an old fashioned glass.","150 ml cold brew."]'::jsonb,
 null,70),
('cascara','black',true,'Cascara','Old fashioned glass',null,null,null,
 '["Rock ice in an old fashioned glass.","150 ml cascara yield."]'::jsonb,
 null,80),
('tea','black',false,'Tea','MHW cappuccino cup',null,null,null,
 '["Tea bag in cup.","Fill the cup with hot water.","If sweet, add honey in a yield dosing cup with a plate and spoon on the side."]'::jsonb,
 null,90),
('aeropress','black',false,'Aeropress','Wine glass','1:10.9 (bypass 1:4)','6.5','press 1:40, finish before 2:20',
 '["Use the mesh stainless filter plus double paper filters.","First agitation / bloom — 80g water.","Stir 6 times.","Rinse the stirrer.","Continue agitation — pour to 180g total water.","Close the Aeropress at 1:00.","Wait, then press gently at 1:40.","Finish before 2:20.","Bypass water at the same coffee temperature.","Mix well."]'::jsonb,
 null,100),
('iced_aeropress','black',true,'Iced Aeropress','Wine glass (chilled)','1:12.6 (no bypass)','6.5','press 1:40, finish before 2:20',
 '["Add chilling rocks to the server. Chill the wine glass in the freezer.","Use the mesh stainless filter plus double paper filters.","First agitation / bloom — 80g water.","Stir 6 times.","Rinse the stirrer.","Continue agitation — pour to 205g total water.","Close the Aeropress at 1:00.","Wait, then press gently at 1:40.","Finish before 2:20.","Pour over diamond ice in the wine glass.","Mix well."]'::jsonb,
 null,110),
('pour_over','black',false,'Pour Over (Kalita / Origami / V60)','Wine glass','1:15.4 — 250g total','10.2 natural / fermented · 10.0 washed / honey · 10.7 for two orders · half-degree coarser for V60','finish before 3:00',
 '["Rinse the filter and add chilling rocks.","First agitation / bloom — 0:00s, 40-45g water.","Stir with an espresso spoon.","Second agitation — 0:40s, 50-55g.","Third agitation — remaining water to 200g, pour in the middle.","Finish before 3:00.","Mix well."]'::jsonb,
 null,120),
('iced_pour_over','black',true,'Iced Pour Over (Kalita / Origami / V60)','Wine glass','1:12.6 — 205g total','9.2 natural / fermented · 9.0 washed / honey · 9.7 for two orders','finish before 3:00',
 '["Rinse the filter and add chilling rocks.","First agitation / bloom — 0:00s, 40-45g water.","Stir with an espresso spoon.","Second agitation — 0:40s, 50-55g.","Third agitation — remaining water to 200g, pour in the middle.","Finish before 3:00.","Mix well."]'::jsonb,
 null,130),
('nitro_coldbrew','black',true,'Nitro Cold Brew','Wine glass (chilled)',null,null,null,
 '["Chill a wine glass in the fridge with diamond ice.","320g cold brew.","Charge with nitrogen on the valve — hold for 30 seconds.","Burn a solid piece of wood on a plate.","Place the wine glass on the wood and let it smoke for 30 seconds.","Finish with a sun-dried orange slice."]'::jsonb,
 null,140),
('espresso_macchiato','white',false,'Espresso Macchiato','MHW espresso cup + small spoon',null,null,null,
 '["Pull an espresso shot.","Top with 4g of creamy foam."]'::jsonb,
 null,200),
('cortado','white',false,'Cortado','Muvna cortado cup',null,null,null,
 '["Pull a ristretto shot.","Steam 100g of micro foam.","Add a small amount of milk to the coffee and mix well before rolling in the rest."]'::jsonb,
 null,210),
('flat_white','white',false,'Flat White','Muvna flat white cup',null,null,null,
 '["Pull a ristretto shot.","Steam 140g of micro foam.","Add a small amount of milk to the coffee and mix well before rolling in the rest."]'::jsonb,
 null,220),
('ice_flat_white','white',true,'Iced Flat White','MHW cold glass',null,null,null,
 '["Add ice rocks to the MHW glass.","Add 80g cold fresh milk.","Pull a ristretto shot on top."]'::jsonb,
 null,230),
('cappuccino','white',false,'Cappuccino','MHW cappuccino cup',null,null,null,
 '["Pull an espresso shot.","Steam 180g of dry, silky foam.","Add a small amount of milk to the coffee and mix well before rolling in the rest."]'::jsonb,
 null,240),
('latte','white',false,'Latte','Muvna latte cup',null,null,null,
 '["Pull an espresso shot.","Steam 230g of silky foam.","Add a small amount of milk to the coffee and mix well before rolling in the rest."]'::jsonb,
 null,250),
('ice_latte','white',true,'Iced Latte','MHW long cold glass',null,null,null,
 '["Diamond ice in the MHW long cold glass.","195g milk.","Pull an espresso shot on top."]'::jsonb,
 null,260),
('sesame_hot_latte','white',false,'Sesame Hot Latte','Muvna latte cup',null,null,null,
 '["In the cup, combine 8g tahini, 15g maple syrup, and 5g honey.","Pull an espresso shot onto the ingredients and steam together until well combined.","Add 4 drops of olive oil to the milk and steam together.","Add a small amount of milk to the coffee and mix well before rolling in the rest."]'::jsonb,
 null,270),
('dirty_earl_grey_iced_latte','white',true,'Dirty Earl Grey Iced Latte','MHW cold glass',null,null,null,
 '["In an MHW dosing cup, add a tea bag with 5g maple syrup and 25g C.M.","Pour an espresso shot over it. Wait a minute, then squeeze the tea bag well with tongs.","Add hints of nutmeg and cinnamon.","In the MHW cold glass, add ice rocks, 60g oat milk, and 60g fresh milk together.","Pour the coffee mixture on top.","Finish with cinnamon, nutmeg, and a star anise.","Torch the top."]'::jsonb,
 'C.M. = condensed milk (confirm with manager).',280),
('mont_blanc_iced_latte','white',true,'Mont Blanc Iced Latte','MHW cold glass',null,null,null,
 '["Add ice rocks to the MHW glass.","90g cold brew.","65g Mont Blanc cold foam.","Finish with nutmeg and orange zest."]'::jsonb,
 null,290),
('honey_coldbrew_chunk_iced_latte','white',true,'Honey Cold Brew Chunk Iced Latte','MHW cold glass',null,null,null,
 '["In the MHW cold glass with ice rocks, add 20g V Secret and 75g cold brew. Mix well.","Add 75g fresh milk.","Add 20g Mont Blanc cold foam.","Finish with hints of chocolate powder, brown sugar, and a sun-dried orange slice on top.","Torch the top."]'::jsonb,
 null,300),
('ice_coldbrew_latte','white',true,'Iced Cold Brew Latte','MHW cold glass',null,null,null,
 '["Cold brew chunks in the MHW cold glass.","95g cold brew first.","Top with milk to fill."]'::jsonb,
 null,310),
('crystal_berry_iced_tea','white',true,'Crystal Berry Iced Tea','MHW long cold glass',null,null,null,
 '["Diamond ice in the MHW long cold glass.","150g tea.","In a shaker, combine ice cubes, 2 pumps peach, and 1 pump pink syrup. Shake well.","Pour over the tea.","Finish with a sun-dried orange slice on top."]'::jsonb,
 null,320),
('affogato','white',true,'Affogato','MHW cold glass',null,null,null,
 '["Ice cube in the MHW cold glass.","Big scoop of vanilla ice cream on the ice cube.","20g Raw cold brew on the ice cream.","25g Mont Blanc cold foam.","Pull a ristretto shot on top.","Finish with chocolate powder, brown sugar, and a sun-dried orange slice on top.","Torch the top."]'::jsonb,
 null,330)
on conflict (code) do nothing;
