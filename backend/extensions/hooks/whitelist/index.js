// extensions/hooks/whitelist/index.js
import { createError } from '@directus/errors';

const ForbiddenError = createError('FORBIDDEN', 'You are not allowed to sign in.', 403);

export default ({ filter }, { database }) => {
  // Runs before login completes for both local + SSO
  filter('auth.login', async (payload, meta) => {
    // meta.user has the resolving user record (for returning users),
    // meta.provider tells you which provider, and for public_registration
    // new users are created with email in payload / providerPayload.

    const emailFromProvider =
      meta?.user?.email ||
      payload?.email ||
      meta?.providerPayload?.email ||
      meta?.providerPayload?.profile?.email;

    if (!emailFromProvider) throw new ForbiddenError();

    const exists = await database('allowed_users')
      .whereRaw('LOWER(email) = LOWER(?)', [emailFromProvider])
      .first();

    if (!exists) throw new ForbiddenError();

    return payload; // allow login
  });
};
