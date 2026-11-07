import { router } from 'expo-router';

/** Navigation interne à l'onglet Discussions : tout s'empile dans sa pile (retour natif). */

export function openTeamThread(id: string) {
  router.push({ pathname: '/hub/discussions/equipe/[id]', params: { id } });
}

export function openTeamMembers(id: string) {
  router.push({ pathname: '/hub/discussions/equipe/[id]/membres', params: { id } });
}

/** Feuille de création d'une discussion ou d'un message direct. */
export function openNewDiscussion() {
  router.push('/hub/discussions/equipe/nouvelle');
}

export function openInvitations() {
  router.push('/hub/discussions/invitations');
}

export function openClientThread(id: string) {
  router.push({ pathname: '/hub/discussions/clients/[id]', params: { id } });
}

/** Feuille d'actions SAV d'un fil client. */
export function openClientAction(id: string) {
  router.push({ pathname: '/hub/discussions/clients/[id]/action', params: { id } });
}
