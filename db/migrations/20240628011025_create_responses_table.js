export async function up(knex) {
    await knex.schema.createTable('responses', function(table) {
      table.increments('id').primary();
      table.timestamp('timestamp').notNullable();
      table.text('grand_county_resident');
      table.text('name');
      table.text('email');
      table.text('phone');
      table.text('address');
      table.integer('concern_level');
      table.text('comment');
      table.text('impacts_speculated');
      table.text('public_response');
      table.text('discovered_by');
      table.text('volunteer');
      table.text('email_updates');
    });
  }
  
  export async function down(knex) {
    await knex.schema.dropTable('responses');
  }