---
description: Vérifie une modification de scripts/sql/02_rls.sql par des tests réels sur PostgreSQL
---

Une modification de RLS ou de trigger n'est pas terminée sans preuve
d'exécution. Ne te contente pas de relire le SQL.

1. Monte une base PostgreSQL locale jetable (ou réutilise-en une si déjà
   disponible dans l'environnement).
2. Reproduis en SQL les objets Supabase indispensables aux policies
   (`auth.users`, `auth.uid()`, `storage.objects`, `storage.foldername()`) —
   un stub minimal suffit, inutile de simuler tout Supabase.
3. Exécute `01_schema.sql` → `02_rls.sql` → `03_storage.sql` dans cet ordre,
   `ON_ERROR_STOP=1`.
4. Crée un compte par rôle (client, prestataire A, prestataire B, admin) et
   rejoue, dans une transaction annulée (`begin; set local role ...;
   select set_config('request.jwt.claim.sub', '<uid>', true); ...; rollback;`)
   pour ne rien laisser en base entre deux tests, la checklist de
   `docs/SECURITY.md` :
   - visiteur → écriture sur `listings`/`categories` → refusé ;
   - prestataire B → écriture sur une ressource de A → refusé ;
   - prestataire → auto-publication (`status = 'published'`) → refusé ;
   - prestataire → modification du prix d'une annonce **déjà publiée** lui
     appartenant → **autorisé** (ne pas régresser sur ce point précis) ;
   - client → lecture des demandes d'un autre client → 0 ligne ;
   - client → `role = 'admin'` sur son propre profil → refusé.
5. Rapporte chaque cas avec son résultat réel (pas une relecture du SQL sans
   exécution). Si un cas casse, corrige la policy ou le trigger — jamais
   l'inverse en affaiblissant le test.
6. Nettoie la base de test à la fin.
