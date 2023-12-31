const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "userData.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3002, () => {
      console.log("Server Running at http://localhost:3002/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const validatePassword = (password) => {
  return password.length > 4;
};

app.get("/", async (req, res) => {
  res.send("welcome to ccbp");
});

app.post("/register", async (req, res) => {
  const { username, name, password, gender, location } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  const selectUserQuery = `
  SELECT 
    * 
  FROM 
    user 
  WHERE 
    username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    const createUserQuery = `
  INSERT INTO
    user (username, name, password, gender, location)
  VALUES
    (
      '${username}',
      '${name}',
      '${hashedPassword}',
      '${gender}',
      '${location}'  
    );`;
    if (validatePassword(password)) {
      await db.run(createUserQuery);
      res.status(200);
      res.send("User created successfully");
    } else {
      res.status(400);
      res.send("Password is too short");
    }
  } else {
    res.status(400);
    res.send("User already exists");
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const selectUserQuery = `
  SELECT 
    * 
  FROM 
    user 
  WHERE 
    username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    res.status(400);
    res.json("Invalid User");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      res.status(200);
      res.send("Login  Success!");
    } else {
      res.status(400);
      res.send("Invalid password");
    }
  }
});

app.put("/change-password", async (req, res) => {
  const { username, oldPassword, newPassword } = req.body;
  const selectUserQuery = `
  SELECT
    *
  FROM
    user
  WHERE
    username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    res.status(400);

    res.json("Invalid User");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      oldPassword,
      dbUser.password
    );

    if (isPasswordMatched) {
      if (validatePassword(newPassword)) {
        const hashedPass = await bcrypt.hash(newPassword, 10);
        const updatePassword = `
                UPDATE
                   user
                SET
                   password= '${hashedPass}'
                WHERE
                   username= '${username}';`;

        await db.run(updatePassword);
        res.status(200);
        res.send("Password updated");
      } else {
        res.status(400);
        res.send(" Password is too short");
      }
    } else {
      res.status(400);
      res.send("Invalid current password");
    }
  }
});
