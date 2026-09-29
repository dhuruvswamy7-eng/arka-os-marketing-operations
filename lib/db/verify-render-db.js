import pg from "pg";

const client = new pg.Client({
  connectionString: "postgresql://arka_db_wa06_user:uKycXALvtAZopPBYXcj7AvY9wxPkyiaV@dpg-datomclg1s2s73a6s8sg-a.ohio-postgres.render.com/arka_db_wa06?sslmode=require"
});

async function main() {
  await client.connect();
  const people = await client.query("SELECT name, email, role, title FROM people ORDER BY role, name;");
  console.log("\n================ ALL 11 PEOPLE IN RENDER DB ================");
  for (const p of people.rows) {
    console.log(`${p.role.padEnd(14)} | ${p.name.padEnd(20)} | ${p.email}`);
  }

  const counts = await client.query(`
    SELECT 
      (SELECT count(*) FROM people) as people,
      (SELECT count(*) FROM work) as work,
      (SELECT count(*) FROM tasks) as tasks,
      (SELECT count(*) FROM activities) as activities,
      (SELECT count(*) FROM messages) as messages,
      (SELECT count(*) FROM leaves) as leaves,
      (SELECT count(*) FROM sessions) as sessions;
  `);
  console.log("\n================ TOTAL RECORDS VERIFIED IN RENDER DB ================");
  console.log(counts.rows[0]);
  console.log("====================================================================\n");

  await client.end();
}

main().catch(console.error);
