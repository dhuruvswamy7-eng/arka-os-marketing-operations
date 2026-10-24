import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL || "postgresql://arka_db_wa06_user:uKycXALvtAZopPBYXcj7AvY9wxPkyiaV@dpg-datomclg1s2s73a6s8sg-a.ohio-postgres.render.com/arka_db_wa06?sslmode=require"
});

const OFFICIAL_USERS = [
  // 1. Founders (Super Admins)
  { id: 'usr_founder', name: 'Monika S', email: 'monika@arkadigitalmedia.com', password: 'admin1234', role: 'Founder', title: 'Founder / CEO', managerId: null },
  { id: 'usr_founder_eshwar', name: 'Eshwar SP', email: 'eshwar@arkadigitalmedia.com', password: 'admin1234', role: 'Founder', title: 'Co-Founder & COO', managerId: null },
  // 2. HR Manager
  { id: 'person-1789737883615', name: 'Sanjana CK', email: 'sanjana.jetty1469@gmail.com', password: '123456', role: 'HR Manager', title: 'Head of People & HR Operations', managerId: null },
  // 3. Managers
  { id: 'person-1789544813478', name: 'Batul', email: 'batulwork0710@gmail.com', password: '123456', role: 'Manager', title: 'Social Media Manager', managerId: null },
  { id: 'person-1789738156900', name: 'Swathi C', email: 'swathi.lautner@gmail.com', password: '123456', role: 'Manager', title: 'Social Media Manager', managerId: null },
  // 4. Team Members
  { id: 'person-1789544851698', name: 'Dhuruv Swamy', email: 'dhuruvswamy7@gmail.com', password: '123456', role: 'Team member', title: 'Business Development', managerId: 'usr_founder' },
  { id: 'person-1791175695081', name: 'Akhil Kumar', email: 'akhilkumar123bk@gmail.com', password: '123456', role: 'Team member', title: 'Graphic Designer', managerId: 'person-1789544813478' },
  { id: 'person-1789549176116', name: 'Meena M', email: 'meenakshiammu369@gmail.com', password: '123456', role: 'Team member', title: 'Graphic Designer', managerId: 'person-1789544813478' },
  { id: 'person-1789737923403', name: 'Supreeth BK', email: 'iamsupreethbk@gmail.com', password: '123456', role: 'Team member', title: 'Graphic Designer', managerId: 'person-1789544813478' },
  { id: 'person-1789544916637', name: 'Midhlaj M T P', email: 'midhlajmtp@gmail.com', password: '123456', role: 'Team member', title: 'Video Editor', managerId: 'person-1789544813478' },
  { id: 'person-1789738443448', name: 'Tejas Govi', email: 'tejasgovi123@gmail.com', password: '123456', role: 'Team member', title: 'Video Editor', managerId: 'person-1789544813478' },
  { id: 'person-1790246663190', name: 'Naveen', email: 'naveensh1242001@gmail.com', password: '123456', role: 'Team member', title: 'Videographer', managerId: 'person-1789544813478' },
  { id: 'person-1789555841194', name: 'Nilesh Rawat', email: 'nileshrawat1325@gmail.com', password: '123456', role: 'Team member', title: 'Sales Head', managerId: 'usr_founder' },
];

async function main() {
  await client.connect();
  console.log("Connected to Render PostgreSQL. Syncing all 13 official users...");

  for (const u of OFFICIAL_USERS) {
    const existing = await client.query(
      "SELECT id FROM people WHERE id = $1 OR LOWER(TRIM(email)) = $2",
      [u.id, u.email.toLowerCase()]
    );

    if (existing.rows.length > 0) {
      await client.query(
        `UPDATE people
         SET name = $1,
             email = $2,
             password = $3,
             role = $4,
             title = $5,
             manager_id = COALESCE(manager_id, $6)
         WHERE id = $7`,
        [u.name, u.email, u.password, u.role, u.title, u.managerId, existing.rows[0].id]
      );
    } else {
      await client.query(
        `INSERT INTO people (id, name, email, password, role, title, manager_id, presence, login_at, logout_at, last_active_at, session_minutes, task_minutes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'Offline', NULL, NULL, 'Never', 0, 0)`,
        [u.id, u.name, u.email, u.password, u.role, u.title, u.managerId]
      );
    }
  }

  const verify = await client.query("SELECT id, name, email, password, role, title, manager_id FROM people ORDER BY role, name");
  console.table(verify.rows);
  console.log("All 13 users synced successfully!");
  await client.end();
}

main().catch(console.error);
