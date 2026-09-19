import pg from "pg";

const client = new pg.Client({
  connectionString: "postgresql://neondb_owner:npg_sNMco24IpeSQ@ep-little-cell-b3z7tfcg-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
});

async function main() {
  await client.connect();

  console.log("Connected to Neon DB. Checking Sanjana's record...");
  const findRes = await client.query(
    "SELECT id, name, email, role, password, title, manager_id FROM people WHERE email = 'sanjana.jetty1469@gmail.com' OR name ILIKE '%Sanjana%'"
  );

  console.log("Current record:", findRes.rows);

  if (findRes.rows.length === 0) {
    console.log("Sanjana not found by email or name. Listing all users...");
    const allUsers = await client.query("SELECT id, name, email, role FROM people");
    console.log("All users:", allUsers.rows);
  } else {
    const updateRes = await client.query(
      "UPDATE people SET role = 'HR Manager', title = 'Head of People & HR Operations' WHERE email = 'sanjana.jetty1469@gmail.com' OR name ILIKE '%Sanjana%' RETURNING id, name, email, role, title, password"
    );
    console.log("Updated Sanjana to HR Manager:", updateRes.rows);
  }

  await client.end();
}

main().catch(console.error);
