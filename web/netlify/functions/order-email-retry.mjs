import {retryOrderNotifications} from './api.mjs';
export default async function(){await retryOrderNotifications();return new Response('OK');}
export const config={schedule:'*/15 * * * *'};
