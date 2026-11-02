import { createApp } from './app.js';
import { env } from './config/env.js';
import { runRewardHousekeeping } from './services/reward.service.js';

const app = createApp();
app.listen(env.PORT, () => {
  console.log(`Shyam Timber API listening on ${env.PUBLIC_URL} (${env.NODE_ENV})`);
  runRewardHousekeeping().then((r) => console.log('[rewards] housekeeping', r)).catch((e) => console.error(e));
  setInterval(() => runRewardHousekeeping().catch(console.error), 24 * 60 * 60_000);
});
