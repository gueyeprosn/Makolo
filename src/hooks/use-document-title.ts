import * as React from 'react';
import { APP_DESCRIPTION, APP_NAME } from '@/constants';

/** Met à jour le title et la meta description (SEO côté client). */
export function useDocumentTitle(title?: string, description?: string) {
  React.useEffect(() => {
    document.title = title ? `${title} — ${APP_NAME}` : `${APP_NAME} — Location de matériel événementiel au Sénégal`;

    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', description ?? APP_DESCRIPTION);

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', title ? `${title} — ${APP_NAME}` : APP_NAME);

    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) ogDescription.setAttribute('content', description ?? APP_DESCRIPTION);
  }, [title, description]);
}
