import { Sequelize } from "sequelize";
                        //kiểm tra tên DB    Điền mật khẩu
const db = new Sequelize("CrawlerV2", "root", "", {
  host: "localhost",
  dialect: "mysql", 
  logging: false,
});

export default db;
