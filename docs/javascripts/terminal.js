const dbtCommands = {
  debug: [
    { text: '$ dbt debug\n', cls: 't-white', delay: 0 },
    { text: 'Running with dbt=1.7.4\n', cls: 't-yellow', delay: 400 },
    { text: 'dbt version: 1.7.4\n', cls: 't-white', delay: 200 },
    { text: 'python version: 3.11.7\n', cls: 't-white', delay: 200 },
    { text: 'os info: macOS 14.0\n', cls: 't-white', delay: 200 },
    { text: '\nConfiguration:\n', cls: 't-white', delay: 300 },
    { text: '  profiles.yml file [OK found and valid]\n', cls: 't-green', delay: 300 },
    { text: '  dbt_project.yml file [OK found and valid]\n', cls: 't-green', delay: 300 },
    { text: '\nRequired dependencies:\n', cls: 't-white', delay: 300 },
    { text: '  - git [OK found]\n', cls: 't-green', delay: 200 },
    { text: '\nConnection:\n', cls: 't-white', delay: 300 },
    { text: '  host: localhost\n', cls: 't-white', delay: 200 },
    { text: '  port: 5432\n', cls: 't-white', delay: 200 },
    { text: '  database: mydb\n', cls: 't-white', delay: 200 },
    { text: '  schema: dev_jane\n', cls: 't-white', delay: 200 },
    { text: '  Connection test: [OK connection ok]\n\n', cls: 't-green', delay: 400 },
    { text: 'All checks passed!\n', cls: 't-green', delay: 300 },
  ],
  run: [
    { text: '$ dbt run\n', cls: 't-white', delay: 0 },
    { text: 'Running with dbt=1.7.4\n', cls: 't-yellow', delay: 400 },
    { text: 'Found 5 models, 8 tests, 2 sources\n\n', cls: 't-white', delay: 300 },
    { text: 'Concurrency: 4 threads (target=\'dev\')\n\n', cls: 't-white', delay: 300 },
    { text: '1 of 5 OK  created view stg_users ............... [OK in 0.82s]\n', cls: 't-green', delay: 800 },
    { text: '2 of 5 OK  created view stg_events .............. [OK in 0.91s]\n', cls: 't-green', delay: 600 },
    { text: '3 of 5 OK  created table int_user_events ........ [OK in 1.23s]\n', cls: 't-green', delay: 1000 },
    { text: '4 of 5 OK  created table dim_users .............. [OK in 0.95s]\n', cls: 't-green', delay: 700 },
    { text: '5 of 5 OK  created table fct_daily_events ....... [OK in 1.56s]\n\n', cls: 't-green', delay: 900 },
    { text: 'Finished running 2 views, 3 tables in 5.47s\n\n', cls: 't-white', delay: 400 },
    { text: 'Completed successfully.\n', cls: 't-green', delay: 300 },
    { text: 'Done. PASS=5  WARN=0  ERROR=0  SKIP=0  TOTAL=5\n', cls: 't-white', delay: 300 },
  ],
  test: [
    { text: '$ dbt test\n', cls: 't-white', delay: 0 },
    { text: 'Running with dbt=1.7.4\n', cls: 't-yellow', delay: 400 },
    { text: 'Found 5 models, 8 tests, 2 sources\n\n', cls: 't-white', delay: 300 },
    { text: 'Concurrency: 4 threads (target=\'dev\')\n\n', cls: 't-white', delay: 300 },
    { text: '1 of 8 PASS unique_stg_users_user_id ............ [PASS in 0.31s]\n', cls: 't-green', delay: 500 },
    { text: '2 of 8 PASS not_null_stg_users_user_id .......... [PASS in 0.28s]\n', cls: 't-green', delay: 400 },
    { text: '3 of 8 PASS unique_stg_users_email .............. [PASS in 0.33s]\n', cls: 't-green', delay: 400 },
    { text: '4 of 8 PASS accepted_values_stg_users_status .... [PASS in 0.25s]\n', cls: 't-green', delay: 400 },
    { text: '5 of 8 PASS not_null_stg_events_event_id ........ [PASS in 0.29s]\n', cls: 't-green', delay: 400 },
    { text: '6 of 8 PASS relationships_stg_users_team_id ..... [PASS in 0.42s]\n', cls: 't-green', delay: 500 },
    { text: '7 of 8 WARN not_null_fct_daily_events_count ..... [WARN 2 in 0.35s]\n', cls: 't-yellow', delay: 500 },
    { text: '8 of 8 PASS assert_positive_event_count ......... [PASS in 0.38s]\n\n', cls: 't-green', delay: 400 },
    { text: 'Finished running 8 tests in 3.1s\n\n', cls: 't-white', delay: 400 },
    { text: 'Done. PASS=7  WARN=1  ERROR=0  SKIP=0  TOTAL=8\n', cls: 't-white', delay: 300 },
  ],
  build: [
    { text: '$ dbt build\n', cls: 't-white', delay: 0 },
    { text: 'Running with dbt=1.7.4\n', cls: 't-yellow', delay: 400 },
    { text: 'Found 5 models, 8 tests, 2 sources\n\n', cls: 't-white', delay: 300 },
    { text: '1 of 13 OK  created view stg_users .............. [OK in 0.82s]\n', cls: 't-green', delay: 600 },
    { text: '2 of 13 PASS unique_stg_users_user_id ........... [PASS in 0.31s]\n', cls: 't-green', delay: 300 },
    { text: '3 of 13 PASS not_null_stg_users_user_id ......... [PASS in 0.28s]\n', cls: 't-green', delay: 300 },
    { text: '4 of 13 OK  created view stg_events ............. [OK in 0.91s]\n', cls: 't-green', delay: 600 },
    { text: '5 of 13 PASS not_null_stg_events_event_id ....... [PASS in 0.29s]\n', cls: 't-green', delay: 300 },
    { text: '6 of 13 OK  created table int_user_events ....... [OK in 1.23s]\n', cls: 't-green', delay: 800 },
    { text: '7 of 13 OK  created table dim_users ............. [OK in 0.95s]\n', cls: 't-green', delay: 600 },
    { text: '8 of 13 OK  created table fct_daily_events ...... [OK in 1.56s]\n', cls: 't-green', delay: 800 },
    { text: '9 of 13 PASS assert_positive_event_count ........ [PASS in 0.38s]\n\n', cls: 't-green', delay: 400 },
    { text: 'Finished running 2 views, 3 tables, 4 tests in 7.53s\n\n', cls: 't-white', delay: 400 },
    { text: 'Completed successfully.\n', cls: 't-green', delay: 300 },
    { text: 'Done. PASS=9  WARN=0  ERROR=0  SKIP=0  TOTAL=9\n', cls: 't-white', delay: 300 },
  ],
  compile: [
    { text: '$ dbt compile --select stg_users\n', cls: 't-white', delay: 0 },
    { text: 'Running with dbt=1.7.4\n', cls: 't-yellow', delay: 400 },
    { text: 'Found 5 models, 8 tests, 2 sources\n\n', cls: 't-white', delay: 300 },
    { text: 'Compiled node \'stg_users\' is:\n\n', cls: 't-green', delay: 500 },
    { text: '  WITH source AS (\n', cls: 't-white', delay: 100 },
    { text: '      SELECT * FROM "mydb"."raw_data"."users"\n', cls: 't-white', delay: 100 },
    { text: '  ),\n\n', cls: 't-white', delay: 100 },
    { text: '  renamed AS (\n', cls: 't-white', delay: 100 },
    { text: '      SELECT\n', cls: 't-white', delay: 100 },
    { text: '          id          AS user_id,\n', cls: 't-white', delay: 100 },
    { text: '          name        AS user_name,\n', cls: 't-white', delay: 100 },
    { text: '          email,\n', cls: 't-white', delay: 100 },
    { text: '          status,\n', cls: 't-white', delay: 100 },
    { text: '          created_at,\n', cls: 't-white', delay: 100 },
    { text: '          updated_at\n', cls: 't-white', delay: 100 },
    { text: '      FROM source\n', cls: 't-white', delay: 100 },
    { text: '  )\n\n', cls: 't-white', delay: 100 },
    { text: '  SELECT * FROM renamed\n\n', cls: 't-white', delay: 100 },
    { text: 'Done.\n', cls: 't-green', delay: 400 },
  ],
  docs: [
    { text: '$ dbt docs generate\n', cls: 't-white', delay: 0 },
    { text: 'Running with dbt=1.7.4\n', cls: 't-yellow', delay: 400 },
    { text: 'Found 5 models, 8 tests, 2 sources\n\n', cls: 't-white', delay: 300 },
    { text: 'Building catalog...\n', cls: 't-white', delay: 800 },
    { text: 'Catalog written to target/catalog.json\n', cls: 't-green', delay: 600 },
    { text: 'Manifest written to target/manifest.json\n', cls: 't-green', delay: 400 },
    { text: 'Run results written to target/run_results.json\n\n', cls: 't-green', delay: 400 },
    { text: 'Documentation generated successfully.\n', cls: 't-green', delay: 300 },
    { text: 'Run `dbt docs serve` to view docs at localhost:8080\n', cls: 't-yellow', delay: 300 },
  ],
};

const runningTerminals = {};

function clearTerminal(id) {
  const el = document.getElementById(id);
  el.innerHTML = '<span class="prompt">jane@mac ~/my_project $</span> <span class="cursor">_</span>';
  runningTerminals[id] = false;
}

async function runCommand(cmd, terminalId) {
  if (runningTerminals[terminalId]) return;
  runningTerminals[terminalId] = true;

  const el = document.getElementById(terminalId);
  const cursorEl = el.querySelector('.cursor');
  if (cursorEl) cursorEl.remove();

  el.innerHTML += '\n';

  const lines = dbtCommands[cmd];
  for (const line of lines) {
    if (!runningTerminals[terminalId]) break;
    await new Promise(r => setTimeout(r, line.delay));
    const span = document.createElement('span');
    span.className = line.cls;
    span.textContent = line.text;
    el.appendChild(span);
    el.scrollTop = el.scrollHeight;
  }

  el.innerHTML += '\n<span class="prompt">jane@mac ~/my_project $</span> <span class="cursor">_</span>';
  el.scrollTop = el.scrollHeight;
  runningTerminals[terminalId] = false;
}
