import db from "../config/Database.js";

async function initDB() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected!");

    await sequelize.sync({ alter: true }); 
    console.log("✅ CrawlQueue synced!");
  } catch (err) {
    console.error("❌ DB error:", err);
  }
}

initDB();
