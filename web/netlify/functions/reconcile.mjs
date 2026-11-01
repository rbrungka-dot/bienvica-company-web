import {reconcilePending} from './api.mjs';
export default async function(){await reconcilePending();return new Response('OK');}
export const config={schedule:'*/15 * * * *'};
