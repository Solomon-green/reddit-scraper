-- Trigger the GitHub "Collect Reddit jobs" workflow at :07 and :37 every hour from Supabase,
-- because GitHub's own scheduler has been skipping this repo.
--
-- Run in Supabase -> salnex-job-centre -> SQL Editor, AFTER replacing <GITHUB_TOKEN> below.
-- Token: GitHub -> Settings -> Developer settings -> Fine-grained tokens -> Generate new token
--   Repository access: Only select repositories -> reddit-scraper
--   Permissions: Actions = Read and write (nothing else)
--
-- To stop it later:  select cron.unschedule('reddit-agent-dispatch');

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Store the token encrypted in Vault (run once; delete this line's token from the editor afterwards)
select vault.create_secret('<GITHUB_TOKEN>', 'github_dispatch_token', 'Starts the reddit-scraper GitHub workflow');

select cron.schedule(
  'reddit-agent-dispatch',
  '7,37 * * * *',
  $$
  select net.http_post(
    url := 'https://api.github.com/repos/Solomon-green/reddit-scraper/actions/workflows/collect.yml/dispatches',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || s.decrypted_secret,
      'Accept', 'application/vnd.github+json',
      'X-GitHub-Api-Version', '2022-11-28',
      'User-Agent', 'salnex-job-centre-cron'
    ),
    body := '{"ref":"main"}'::jsonb
  )
  from vault.decrypted_secrets s
  where s.name = 'github_dispatch_token';
  $$
);
