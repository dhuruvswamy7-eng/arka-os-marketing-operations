import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { peopleTable } from "./src/schema/index.js";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL || "postgresql://arka_db_wa06_user:uKycXALvtAZopPBYXcj7AvY9wxPkyiaV@dpg-datomclg1s2s73a6s8sg-a.ohio-postgres.render.com/arka_db_wa06?sslmode=require"
});

async function main() {
  await client.connect();
  const db = drizzle(client);

  const users = [
    { id: 'usr_founder', name: 'Arka Founder', email: 'admin@arka.com', password: 'admin1234', role: 'Founder' as const, title: 'Founder / CEO', managerId: null, presence: 'Offline' as const, lastActiveAt: 'Never' }
  ];

  for (const user of users) {
    await db.insert(peopleTable).values(user).onConflictDoUpdate({
      target: peopleTable.email,
      set: { password: user.password, role: user.role, managerId: user.managerId }
    });
  }

  console.log("Seeded users successfully.");
  await client.end();
}

main().catch(console.error);
