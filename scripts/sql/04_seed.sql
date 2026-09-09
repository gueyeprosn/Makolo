-- ===========================================================================
-- MAKOLO — 04_seed.sql
-- Données initiales : catégories du catalogue + jeu de démonstration.
--
-- À exécuter APRÈS 03_storage.sql.
--
-- IMPORTANT — Comptes de test
-- Les utilisateurs ne peuvent pas être créés en SQL : Supabase Auth gère les
-- mots de passe. Créez d'abord les trois comptes dans le Dashboard
-- (Authentication → Users → Add user, en cochant « Auto Confirm User ») :
--
--     client@makolo.sn        / Makolo2026
--     prestataire@makolo.sn   / Makolo2026
--     admin@makolo.sn         / Makolo2026
--
-- Le trigger `handle_new_user()` crée automatiquement leur profil avec le rôle
-- `client`. La PARTIE B ci-dessous ajuste ensuite les rôles et insère les
-- annonces de démonstration.
--
-- Toutes les données de démonstration sont FICTIVES : les entreprises, les
-- personnes et les numéros de téléphone (préfixe non attribué 77 000 xx xx)
-- n'existent pas.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- PARTIE A — Catégories (indispensables en production)
-- ---------------------------------------------------------------------------

insert into public.categories (name, slug, description, icon, active) values
  ('Chaises',     'chaises',     'Pour vos invités et cérémonies',                'Armchair',    true),
  ('Tables',      'tables',      'Tables rondes, rectangulaires et cocktail',     'Table2',      true),
  ('Tentes',      'tentes',      'Protégez vos invités du soleil et de la pluie', 'Tent',        true),
  ('Sono',        'sono',        'Sonorisation pour petits et grands événements', 'Speaker',     true),
  ('Éclairage',   'eclairage',   'Créez l''ambiance de votre événement',          'Lightbulb',   true),
  ('Décoration',  'decoration',  'Arches, nappage et décors de salle',            'Sparkles',    true),
  ('Accessoires', 'accessoires', 'Vaisselle, groupes électrogènes et petit matériel', 'PackageOpen', true)
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description,
      icon = excluded.icon;

-- ---------------------------------------------------------------------------
-- PARTIE B — Jeu de démonstration (à ne PAS exécuter en production)
--
-- Ce bloc ne fait rien tant que les trois comptes de test n'existent pas.
-- ---------------------------------------------------------------------------

do $$
declare
  v_admin    uuid;
  v_client   uuid;
  v_provider uuid;
  c_chaises  uuid;
  c_tables   uuid;
  c_tentes   uuid;
  c_sono     uuid;
  c_eclair   uuid;
  c_deco     uuid;
  c_access   uuid;
  l_chaise   uuid;
  l_table    uuid;
  l_sono     uuid;
  l_tente    uuid;
begin
  select id into v_admin    from public.profiles where email = 'admin@makolo.sn';
  select id into v_client   from public.profiles where email = 'client@makolo.sn';
  select id into v_provider from public.profiles where email = 'prestataire@makolo.sn';

  if v_admin is null or v_client is null or v_provider is null then
    raise notice 'Comptes de test absents : creez-les dans Authentication -> Users puis rejouez ce script.';
    return;
  end if;

  -- 1. Rôles et profils de démonstration -----------------------------------
  update public.profiles
     set role = 'admin', full_name = 'Awa Ndiaye', city = 'Dakar', phone = '77 000 10 10',
         bio = 'Équipe MAKOLO — modération et support des prestataires.'
   where id = v_admin;

  update public.profiles
     set role = 'client', full_name = 'Fatou Sarr', city = 'Dakar', phone = '77 000 20 20',
         bio = 'J''organise les événements familiaux et les cérémonies de mon quartier.'
   where id = v_client;

  update public.profiles
     set role = 'provider', full_name = 'Ibrahima Fall', city = 'Dakar', phone = '77 000 30 30',
         bio = 'Location de mobilier de réception à Dakar depuis 2016 : chaises, tables, nappage et tentes. Livraison et installation sur site.'
   where id = v_provider;

  -- 2. Identifiants de catégories ------------------------------------------
  select id into c_chaises from public.categories where slug = 'chaises';
  select id into c_tables  from public.categories where slug = 'tables';
  select id into c_tentes  from public.categories where slug = 'tentes';
  select id into c_sono    from public.categories where slug = 'sono';
  select id into c_eclair  from public.categories where slug = 'eclairage';
  select id into c_deco    from public.categories where slug = 'decoration';
  select id into c_access  from public.categories where slug = 'accessoires';

  -- 3. Annonces de démonstration -------------------------------------------
  insert into public.listings
    (provider_id, category_id, title, slug, description, price, price_unit, city, quantity, conditions, status)
  values
    (v_provider, c_chaises, 'Chaise Napoléon dorée', 'chaise-napoleon-doree-dakar',
     'Chaise Napoléon dorée avec galette blanche, idéale pour les mariages et les réceptions élégantes. Le stock est vérifié et nettoyé après chaque location. Livraison possible sur Dakar et sa banlieue, installation comprise à partir de 100 unités.',
     500, 'jour', 'Dakar', 400,
     'Caution de 20 000 FCFA. Location minimum 20 chaises. Livraison facturée selon la zone.', 'published'),

    (v_provider, c_chaises, 'Chaise plastique blanche empilable', 'chaise-plastique-blanche-dakar',
     'Chaise en plastique renforcé, robuste et facile à installer. Parfaite pour les baptêmes, réunions de famille et événements en plein air. Stock important disponible toute l''année.',
     300, 'jour', 'Dakar', 600, 'Location minimum 30 chaises.', 'published'),

    (v_provider, c_tables, 'Table ronde 10 personnes', 'table-ronde-10-personnes-dakar',
     'Table ronde de 180 cm accueillant confortablement 10 convives. Disponible avec ou sans nappage blanc. Idéale pour les dîners de mariage et les réceptions d''entreprise.',
     4000, 'jour', 'Dakar', 60, 'Nappage en supplément : 1 500 FCFA par table.', 'published'),

    (v_provider, c_tables, 'Table cocktail mange-debout', 'table-cocktail-mange-debout-dakar',
     'Table haute mange-debout avec housse blanche ou noire. Recommandée pour les cocktails, inaugurations et événements corporatifs. Montage rapide sur place.',
     3500, 'jour', 'Dakar', 40, null, 'published'),

    (v_provider, c_tentes, 'Tente de réception 10x20 m', 'tente-reception-10x20-thies',
     'Chapiteau de 200 m² pouvant abriter jusqu''à 250 personnes assises. Structure aluminium et bâche blanche imperméable. Montage et démontage assurés par notre équipe.',
     175000, 'evenement', 'Thiès', 4,
     'Montage la veille de l''événement. Prévoir un terrain plat et dégagé.', 'published'),

    (v_provider, c_tentes, 'Tente 5x10 m avec parois', 'tente-5x10-avec-parois-mbour',
     'Tente de 50 m² avec parois amovibles, adaptée aux baptêmes et petites réceptions. Résistante au vent de la côte, installation comprise sur Mbour et Saly.',
     75000, 'evenement', 'Mbour', 8, null, 'published'),

    (v_provider, c_sono, 'Pack sono mariage 2000 W', 'pack-sono-mariage-2000w-dakar',
     'Deux enceintes 1000 W, caisson de basses, table de mixage, deux micros sans fil et un technicien présent pendant toute la soirée. Adapté aux salles et aux réceptions en extérieur jusqu''à 300 personnes.',
     125000, 'evenement', 'Dakar', 3,
     'Prévoir une alimentation électrique stable. Groupe électrogène en option.', 'published'),

    (v_provider, c_sono, 'Sonorisation conférence et séminaire', 'sonorisation-conference-seminaire-dakar',
     'Ensemble complet pour séminaires : quatre micros de table, pupitre, enceintes de diffusion et régie. Installation discrète adaptée aux salles de réunion et hôtels.',
     85000, 'evenement', 'Dakar', 2, null, 'published'),

    (v_provider, c_eclair, 'Projecteurs LED de scène (lot de 6)', 'projecteurs-led-scene-lot-6-dakar',
     'Lot de six projecteurs LED RGBW avec pieds et télécommande DMX. Permet de colorer une salle ou de mettre en valeur une scène. Consommation réduite, aucune surchauffe.',
     60000, 'evenement', 'Dakar', 5, null, 'published'),

    (v_provider, c_eclair, 'Guirlande lumineuse guinguette 20 m', 'guirlande-lumineuse-guinguette-20m-touba',
     'Guirlande extérieure de 20 mètres avec ampoules à filament, pour créer une ambiance chaleureuse en terrasse ou sous une tente. Câblage et fixation fournis.',
     15000, 'jour', 'Touba', 25, null, 'published'),

    (v_provider, c_deco, 'Arche florale de cérémonie', 'arche-florale-ceremonie-touba',
     'Arche décorée de fleurs artificielles haut de gamme et de voilage, montée sur place. Point photo idéal pour les mariages et les cérémonies de fiançailles.',
     45000, 'evenement', 'Touba', 6, 'Montage la veille ou le matin même selon disponibilité.', 'published'),

    (v_provider, c_deco, 'Nappage et housses de chaise', 'nappage-housses-de-chaise-touba',
     'Nappes rondes et housses de chaise avec nœud coloré, disponibles en blanc, ivoire, bordeaux et bleu nuit. Linge lavé et repassé avant chaque location.',
     1000, 'unite', 'Touba', 500, null, 'published'),

    (v_provider, c_access, 'Groupe électrogène 15 kVA insonorisé', 'groupe-electrogene-15kva-thies',
     'Groupe électrogène silencieux de 15 kVA, carburant non inclus. Sécurise l''alimentation de la sonorisation et de l''éclairage pour les événements en extérieur.',
     90000, 'jour', 'Thiès', 3, 'Carburant à la charge du client. Livraison et raccordement inclus.', 'published'),

    (v_provider, c_access, 'Service de vaisselle complet (50 couverts)', 'service-vaisselle-50-couverts-dakar',
     'Assiettes plates et creuses, couverts inox, verres à eau et à jus pour 50 convives. Vaisselle livrée propre en caisses de transport.',
     25000, 'evenement', 'Dakar', 12,
     'La casse est facturée à l''unité selon le barème remis à la livraison.', 'published'),

    (v_provider, c_chaises, 'Chaise Tiffany transparente', 'chaise-tiffany-transparente-saint-louis',
     'Chaise Tiffany en polycarbonate transparent avec galette, très appréciée pour les mariages contemporains. Disponible à Saint-Louis et dans le nord du pays.',
     900, 'jour', 'Saint-Louis', 200, null, 'published'),

    (v_provider, c_tentes, 'Tente traditionnelle 8x12 m', 'tente-traditionnelle-8x12-kaolack',
     'Tente de 96 m² avec mâts centraux, adaptée aux baptêmes et aux cérémonies familiales. Installation la veille comprise dans le tarif.',
     95000, 'evenement', 'Kaolack', 5, null, 'published'),

    (v_provider, c_tables, 'Table rectangulaire 8 personnes', 'table-rectangulaire-8-personnes-diourbel',
     'Table pliante rectangulaire de 180 cm, facile à transporter et à installer. Convient aux buffets, aux réunions et aux repas de famille.',
     3000, 'jour', 'Diourbel', 30, null, 'published'),

    -- Une annonce en attente pour tester le circuit de modération.
    (v_provider, c_deco, 'Photobooth avec accessoires', 'photobooth-avec-accessoires-dakar',
     'Cabine photo avec fond personnalisable, éclairage et malle d''accessoires. Impression illimitée pendant toute la durée de l''événement.',
     110000, 'evenement', 'Dakar', 2, null, 'pending'),

    -- Un brouillon pour tester l'espace prestataire.
    (v_provider, c_access, 'Machine à fumée et bulles', 'machine-fumee-et-bulles-dakar',
     'Machine à fumée 1500 W et machine à bulles pour l''ouverture de bal. Liquide inclus pour une soirée complète.',
     35000, 'evenement', 'Dakar', 3, null, 'draft')
  on conflict (slug) do nothing;

  -- 4. Favoris et demandes de démonstration ---------------------------------
  select id into l_chaise from public.listings where slug = 'chaise-napoleon-doree-dakar';
  select id into l_table  from public.listings where slug = 'table-ronde-10-personnes-dakar';
  select id into l_sono   from public.listings where slug = 'pack-sono-mariage-2000w-dakar';
  select id into l_tente  from public.listings where slug = 'tente-reception-10x20-thies';

  insert into public.favorites (user_id, listing_id)
  values (v_client, l_tente), (v_client, l_sono)
  on conflict (user_id, listing_id) do nothing;

  -- Les triggers créent automatiquement les notifications correspondantes.
  insert into public.booking_requests (listing_id, client_id, provider_id, requested_date, quantity, message, status)
  values
    (l_chaise, v_client, v_provider, current_date + 14, 120,
     'Bonjour, je souhaite louer ce matériel pour le mariage de ma sœur à Ouakam.', 'pending'),
    (l_table,  v_client, v_provider, current_date + 30, 15,
     'Réception de fin d''année, 150 convives.', 'pending')
  on conflict do nothing;

  raise notice 'Jeu de demonstration MAKOLO installe avec succes.';
end $$;

-- ---------------------------------------------------------------------------
-- Promotion manuelle d'un administrateur (production)
--
-- Créez le compte via l'interface d'inscription, puis exécutez :
--
--     update public.profiles set role = 'admin' where email = 'votre@email.sn';
--
-- Le rôle `admin` ne peut jamais être obtenu par auto-inscription.
-- ---------------------------------------------------------------------------
