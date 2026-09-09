# Règle — Sécurité

Portée : tout changement touchant `scripts/sql/`, `lib/permissions.ts`,
`services/supabase-backend.ts`, `services/demo-backend.ts`, ou l'upload
d'images.

1. Toute règle d'autorisation ajoutée côté client (`lib/permissions.ts`) doit
   avoir une policy RLS ou un trigger équivalent dans `scripts/sql/`. Une
   règle qui n'existe que côté client n'est pas une règle de sécurité.

2. Une modification de `scripts/sql/02_rls.sql` ou `01_schema.sql` (triggers)
   n'est pas terminée sans avoir rejoué la checklist de non-régression de
   `docs/SECURITY.md` — au minimum : visiteur en écriture, prestataire B sur
   une ressource de A, client en lecture des demandes d'un autre client,
   auto-promotion de rôle.

3. Ne jamais ajouter de policy `for all` là où une distinction
   select/insert/update/delete est nécessaire — c'est ainsi que
   `listings_provider_update` avait initialement bloqué la modification du
   prix d'une annonce déjà publiée (voir `docs/SECURITY.md`).

4. Toute nouvelle variable d'environnement contenant un secret (clé
   `service_role`, jeton d'API, secret de webhook) est interdite sous un nom
   `VITE_*` — ce préfixe est injecté dans le bundle client par Vite.

5. Un backend ajoute une méthode au contrat `MakoloBackend` → l'autre backend
   l'implémente avec la même règle métier avant la fin de la tâche, sinon les
   deux modes divergent silencieusement.
