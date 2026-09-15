import pg from "pg";

const client = new pg.Client({
  connectionString: "postgresql://neondb_owner:npg_sNMco24IpeSQ@ep-little-cell-b3z7tfcg-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
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
