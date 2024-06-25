import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "12345",
  port: 5433,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

async function checkVisisted() {
  const result = await db.query("SELECT country_code FROM visited_countries JOIN users ON users.id = user_id WHERE user_id = $1;", [currentUserId]);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
};

async function getUsers() {
  let users = [];
  const request = await db.query("SELECT * FROM users");
  users = request.rows;
  return users;
};

async function getUserFromUsers(){
  const users = await getUsers();
  const user = users.find((user) => currentUserId === user.id );
  return user;
}

app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  const users = await getUsers();
  const user = await getUserFromUsers()
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: user.color,
  });
});

app.post("/add", async (req, res) => {
  const users = await getUsers();
  console.log(currentUserId);
  const input = req.body["country"];
  try {
    const result = await db.query("SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",[input.toLowerCase()]);

    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query("INSERT INTO visited_countries (country_code, user_id) VALUES ($1,$2)",[countryCode, currentUserId]);
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});

app.post("/user", async (req, res) => {
  if (req.body.add) {
    res.render("new.ejs");
  } else {
    currentUserId = parseInt(req.body.user); // Get a user id from our EJS file and use it to check for users with this id
    const users = await getUsers();
    const user = await getUserFromUsers(); // Find a user that's id equals to the one we got from EJS file
    const countries = await checkVisisted();
    res.render("index.ejs", {
      users: users,
      color: user.color,
      countries: countries,
      total: countries.length,
    });
  }
});

app.post("/new", async (req, res) => {
  const input = req.body;
  try {
    if (req.body.name !== "") {
      await db.query("INSERT INTO users(name, color) VALUES ($1,$2)", [
        input.name,
        input.color,
      ]);
      console.log(req.body);
      res.redirect("/");
    }else{
      res.render("new.ejs", { error: "Name cannot be empty!" })
    }
  } catch (error) {
    res.render("new.ejs", { error: "Name already exists!" });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
