import { useDocumentTitle } from '@/hooks/use-document-title';
import { isDemoMode } from '@/services';

/**
 * Mentions légales.
 *
 * Le contenu est volontairement factuel : aucune raison sociale, aucun numéro
 * d'immatriculation ni coordonnée n'est inventé. Les champs à compléter avant
 * la mise en production sont explicitement signalés.
 */
export function LegalPage() {
  useDocumentTitle('Mentions légales', 'Mentions légales et informations sur le traitement des données de MAKOLO.');

  return (
    <div className="container max-w-3xl py-10 lg:py-16">
      <h1 className="makolo-h2">Mentions légales</h1>
      <p className="mt-2 text-doux">Dernière mise à jour : à compléter avant la mise en ligne.</p>

      {isDemoMode && (
        <p className="mt-6 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-nuit">
          Cette instance fonctionne en mode démonstration : les prestataires, annonces et coordonnées affichés sont
          fictifs.
        </p>
      )}

      <div className="prose mt-8 space-y-8 text-doux-600">
        <section aria-labelledby="editeur">
          <h2 id="editeur" className="makolo-h3">
            Éditeur du site
          </h2>
          <p className="mt-2 leading-relaxed">
            MAKOLO est une plateforme de mise en relation entre des particuliers ou entreprises souhaitant louer du
            matériel événementiel et des prestataires établis au Sénégal.
          </p>
          <p className="mt-2 leading-relaxed">
            Raison sociale, siège social, numéro d'immatriculation (NINEA / RCCM), directeur de la publication et
            coordonnées de contact : <span className="font-semibold text-nuit">à compléter par l'éditeur</span> avant la
            mise en production.
          </p>
        </section>

        <section aria-labelledby="role">
          <h2 id="role" className="makolo-h3">
            Rôle de la plateforme
          </h2>
          <p className="mt-2 leading-relaxed">
            MAKOLO met en relation clients et prestataires. La plateforme n'est ni propriétaire ni loueur du matériel
            présenté : le contrat de location est conclu directement entre le client et le prestataire, qui reste seul
            responsable de la conformité, de la disponibilité et de la livraison de son matériel.
          </p>
          <p className="mt-2 leading-relaxed">
            Aucun paiement n'est réalisé sur la plateforme : les modalités de règlement sont convenues directement entre
            les parties.
          </p>
        </section>

        <section aria-labelledby="donnees">
          <h2 id="donnees" className="makolo-h3">
            Données personnelles
          </h2>
          <p className="mt-2 leading-relaxed">
            Les données collectées (nom, adresse e-mail, téléphone, ville) servent exclusivement à créer votre compte,
            à traiter vos demandes de réservation et à vous notifier de leur suivi. Le numéro de téléphone d'un
            prestataire n'est visible que par les utilisateurs connectés, et les coordonnées d'un client ne sont
            transmises au prestataire qu'après acceptation d'une demande.
          </p>
          <p className="mt-2 leading-relaxed">
            Conformément à la loi n° 2008-12 sur la protection des données à caractère personnel, vous disposez d'un
            droit d'accès, de rectification et de suppression de vos données. La procédure de demande est à préciser par
            l'éditeur.
          </p>
        </section>

        <section aria-labelledby="contenus">
          <h2 id="contenus" className="makolo-h3">
            Contenus publiés et modération
          </h2>
          <p className="mt-2 leading-relaxed">
            Chaque annonce publiée par un prestataire est soumise à validation avant sa mise en ligne. MAKOLO peut
            refuser, archiver ou retirer une annonce non conforme, ainsi que désactiver un compte en cas d'usage abusif.
            Le prestataire est responsable de l'exactitude des informations qu'il publie.
          </p>
        </section>

        <section aria-labelledby="propriete">
          <h2 id="propriete" className="makolo-h3">
            Propriété intellectuelle
          </h2>
          <p className="mt-2 leading-relaxed">
            La marque MAKOLO, son logo et l'identité visuelle de la plateforme sont protégés. Les photographies des
            annonces restent la propriété des prestataires qui les publient et leur mise en ligne vaut autorisation
            d'affichage sur la plateforme.
          </p>
        </section>
      </div>
    </div>
  );
}
