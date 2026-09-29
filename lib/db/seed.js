import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL || "postgresql://arka_db_wa06_user:uKycXALvtAZopPBYXcj7AvY9wxPkyiaV@dpg-datomclg1s2s73a6s8sg-a.ohio-postgres.render.com/arka_db_wa06?sslmode=require"
});

async function main() {
  await client.connect();

  const query = `
    INSERT INTO people (id, name, email, password, role, title, manager_id, presence, last_active_at) VALUES 
    ('usr_founder', 'Arka Founder', 'admin@arka.com', 'admin1234', 'Founder', 'Founder / CEO', NULL, 'Offline', 'Never')
    ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, role = EXCLUDED.role, manager_id = EXCLUDED.manager_id;
  `;

  await client.query(query);
  console.log("Seeded users successfully.");
  await client.end();
}

main().catch(console.error);
