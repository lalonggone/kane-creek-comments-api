// Schema matches the production dump (kc-responses.dump), which is the source of
// truth for both data and schema. Column names/types below mirror it exactly.
// `id` is an added surrogate primary key (the dump has none) for stable API ids.
export async function up(knex) {
  await knex.schema.createTable('responses', function (table) {
    table.increments('id').primary();
    table.timestamp('submitted_at');
    table.text('grand_county_resident');
    table.text('name');
    table.text('email');
    table.text('phone');
    table.text('address');
    table.integer('concern_level');
    table.text('response');
    table.text('impacts_speculated');
    table.text('anonymous');
    table.text('development_discovery_reason');
    table.text('volunteer');
    table.text('email_updates');
  });
}

export async function down(knex) {
  await knex.schema.dropTable('responses');
}
