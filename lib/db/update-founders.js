import pg from "pg";

const client = new pg.Client({
  connectionString: "postgresql://arka_db_wa06_user:uKycXALvtAZopPBYXcj7AvY9wxPkyiaV@dpg-datomclg1s2s73a6s8sg-a.ohio-postgres.render.com/arka_db_wa06?sslmode=require"
});

async function main() {
  await client.connect();

  // 1. Update usr_founder to Monika S (Founder / CEO)
  await client.query(`
    UPDATE people 
    SET name = 'Monika S', 
        title = 'Founder / CEO',
        email = 'monika@arkadigitalmedia.com',
        password = 'admin1234'
    WHERE id = 'usr_founder';
  `);

  // 2. Insert or update Eshwar SP (Co-Founder & COO) as Founder
  const check = await client.query("SELECT id FROM people WHERE id = 'usr_founder_eshwar' OR email = 'eshwar@arkadigitalmedia.com';");
  if (check.rows.length === 0) {
    await client.query(`
      INSERT INTO people (id, name, email, password, role, title, manager_id, presence, login_at, logout_at, last_active_at, session_minutes, task_minutes)
      VALUES ('usr_founder_eshwar', 'Eshwar SP', 'eshwar@arkadigitalmedia.com', 'admin1234', 'Founder', 'Co-Founder & COO', NULL, 'Offline', NULL, NULL, 'Never', 0, 0);
    `);
  } else {
    await client.query(`
      UPDATE people 
      SET name = 'Eshwar SP', 
          role = 'Founder', 
          title = 'Co-Founder & COO',
          password = 'admin1234'
      WHERE id = $1;
    `, [check.rows[0].id]);
  }

  const res = await client.query("SELECT id, name, email, role, title, password FROM people WHERE role = 'Founder';");
  console.log("Current Founders in PostgreSQL:");
  console.log(JSON.stringify(res.rows, null, 2));

  await client.end();
}

main().catch(console.error);
